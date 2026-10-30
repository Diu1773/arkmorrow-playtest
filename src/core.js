import { META, PASSIVES, SHIPS, WAVES, WEAPONS } from './data.js';
import { emptyEquipment, parseEquipment } from './equipment.js';
import { awardRun, shardReward } from './economy.js';
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export const xpNeeded = (level) => level === 1 ? 54 : Math.round(level > 25 ? 2693 + (level - 25) * 35 : 68 + level * 10 + level * level * 3.8);
export const hpScale = (seconds) => 1 + Math.max(0, seconds) * .003;
export const waveAt = (seconds) => WAVES[clamp(Math.floor(seconds / 60), 0, 9)];
export function rng(seed) { let a = seed | 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const SAVE_KEY = 'cosmos-survivor.save.v2';
export function defaultSave() { return { version: 3, equipment: emptyEquipment(), shards: 0, meta: { output: 0, hull: 0, thrust: 0, magnet: 0, repair: 0, forecast: 0, learning: 0, guard: 0 }, settings: { lang: 'ko', volume: .6, music: .25, sfx: .65, shake: .5, reduced: false, numbers: true }, ship: 'aster', ships: ['aster'], unlocked: 0, runs: 0, wins: 0, kills: 0, evolutions: 0, best: 0, settled: [] }; }
const int = (v, max = 1e9) => typeof v === 'number' && Number.isFinite(v) ? clamp(Math.floor(v), 0, max) : 0;
const record = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {};
export function parseSave(raw) {
    const save = defaultSave();
    if (!raw)
        return { save, warning: false, future: false };
    try {
        if (raw.length > 100000)
            throw Error('size');
        const data = record(JSON.parse(raw));
        if (typeof data.version === 'number' && data.version > 3)
            return { save, warning: true, future: true };
        if (data.version !== 2 && data.version !== 3)
            throw Error('version');
        save.shards = int(data.shards);
        save.runs = int(data.runs);
        save.wins = Math.min(save.runs, int(data.wins));
        save.kills = int(data.kills);
        save.evolutions = int(data.evolutions);
        save.best = int(data.best, 660);
        save.unlocked = int(data.unlocked, 5);
        if (Array.isArray(data.ships))
            save.ships = SHIPS.filter(s => s.id === 'aster' || data.ships.includes(s.id)).map(s => s.id);
        if (save.ships.includes(data.ship))
            save.ship = data.ship;
        const meta = record(data.meta);
        for (const item of META)
            save.meta[item.id] = int(meta[item.id], 5);
        const settings = record(data.settings);
        for (const k of ['volume', 'music', 'sfx', 'shake']) {
            const v = settings[k];
            if (typeof v === 'number' && Number.isFinite(v))
                save.settings[k] = clamp(v, 0, 1);
        }
        for (const k of ['reduced', 'numbers'])
            if (typeof settings[k] === 'boolean')
                save.settings[k] = settings[k];
        if (settings.lang === 'en')
            save.settings.lang = 'en';
        if (Array.isArray(data.settled))
            save.settled = data.settled.filter((v) => typeof v === 'string' && v.length < 100).slice(-100);
        if (data.version === 3)
            save.equipment = parseEquipment(data.equipment);
        else
            save.equipment.cleared = Array.from({ length: save.unlocked }, (_, i) => i);
        return { save, warning: false, future: false };
    }
    catch {
        return { save, warning: true, future: false };
    }
}
export const metaCost = (id, level) => META.find(m => m.id === id).cost * (level + 1);
export function purchase(save, id) { if (!META.some(m => m.id === id))
    return save; const level = save.meta[id], cost = metaCost(id, level); if (level >= 5 || save.shards < cost)
    return save; return { ...save, shards: save.shards - cost, meta: { ...save.meta, [id]: level + 1 } }; }
export function unlockShip(save, id) { const def = SHIPS.find(s => s.id === id); if (!def || save.ships.includes(id) || save.shards < def.cost)
    return save; return { ...save, shards: save.shards - def.cost, ships: [...save.ships, id] }; }
export function refund(save) { let amount = 0; for (const m of META)
    amount += m.cost * save.meta[m.id] * (save.meta[m.id] + 1) / 2; return { ...save, shards: save.shards + amount, meta: defaultSave().meta }; }
export const reward = shardReward;
export function settle(save, result) { if (save.settled.includes(result.id))
    return save; const r = { ...result, time: int(result.time, 660), kills: int(result.kills), sector: int(result.sector, 5), bosses: int(result.bosses, 5) }; const totals = { runs: save.runs + 1, kills: save.kills + r.kills, evolutions: save.evolutions + int(r.evolutions) }; let seed = 0; for (const c of r.id)
    seed = Math.imul(seed, 31) + c.charCodeAt(0) | 0; return { ...save, ...totals, equipment: awardRun(save.equipment, r, rng(seed), totals), shards: save.shards + int(r.earned), wins: save.wins + Number(r.won), best: Math.max(save.best, r.time), unlocked: r.won ? Math.max(save.unlocked, Math.min(5, r.sector + 1)) : save.unlocked, settled: [...save.settled, r.id].slice(-100) }; }
export function stats(ship, passives, meta) {
    const s = SHIPS.find(s => s.id === ship), p = (key) => passives[key] ?? 0;
    return { maxHp: s.hp * (1 + p('hull') * .2) + meta.hull * 12, speed: s.speed * (1 + p('speed') * .08 + meta.thrust * .04), damage: 1 + p('power') * .12 + meta.output * .06, cooldown: (1 - p('haste') * .07) * (ship === 'vega' ? .85 : 1), area: 1 + p('area') * .12, magnet: 100 * (1 + p('magnet') * .3 + meta.magnet * .15), regen: .18 + p('regen') * .4 + meta.repair * .2, armor: p('armor') + meta.guard + (ship === 'atlas' ? 2 : 0), xp: 1 + meta.learning * .05 };
}
export function weaponStats(slot, s) { const def = WEAPONS.find(w => w.id === slot.id); return { damage: def.damage * (1 + .3 * (slot.level - 1)) * s.damage * (slot.evolved ? 2 : 1), cooldown: Math.max(.12, def.cooldown * s.cooldown / (1 + .08 * (slot.level - 1))), radius: def.radius * (slot.id === 'pulse' || slot.id === 'fan' || slot.id === 'laser' ? 1 : s.area) * (1 + .04 * (slot.level - 1)), count: 1 + Number(slot.level >= 3) + Number(slot.level >= 5) }; }
export function canEvolve(slot, passives, time) { return !slot.evolved && slot.level >= 5 && (passives[WEAPONS.find(w => w.id === slot.id).passive] ?? 0) >= 3 && time >= 300; }
export function choices(weapons, passives, time, chest, random, previous = [], banished = []) {
    const result = chest ? weapons.filter(w => canEvolve(w, passives, time)).map((w) => ({ kind: 'evolve', id: w.id })).slice(0, 3) : [];
    const pool = [];
    for (const w of WEAPONS) {
        const owned = weapons.find(s => s.id === w.id);
        if (owned ? owned.level < 5 : weapons.length < 6)
            pool.push({ kind: 'weapon', id: w.id });
    }
    for (const p of PASSIVES) {
        const owned = passives[p.id] ?? 0;
        if (owned ? owned < 5 : Object.keys(passives).length < 6)
            pool.push({ kind: 'passive', id: p.id });
    }
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    pool.sort((a, b) => Number(previous.some(p => p.kind === a.kind && p.id === a.id)) - Number(previous.some(p => p.kind === b.kind && p.id === b.id)));
    const allowed = pool.filter(item => !banished.some(b => b.kind === item.kind && b.id === item.id));
    if (!result.length) {
        const w = allowed.find(i => i.kind === 'weapon');
        if (w)
            result.push(w);
    }
    for (const item of allowed)
        if (result.length < 3 && !result.includes(item))
            result.push(item);
    for (const item of [{ kind: 'boost', id: 'damage' }, { kind: 'boost', id: 'hull' }, { kind: 'boost', id: 'reach' }])
        if (result.length < 3)
            result.push(item);
    return result;
}
export function moveVector(x, y) { const length = Math.hypot(x, y); return length > 1 ? { x: x / length, y: y / length } : { x, y }; }
export function deadzone(x, y) { const len = Math.hypot(x, y); if (len < .18)
    return { x: 0, y: 0 }; const scale = Math.min(1, (len - .18) / .82) / len; return { x: x * scale, y: y * scale }; }
export class Pool {
    active = [];
    free = [];
    limit;
    make;
    constructor(limit, make) { this.limit = limit; this.make = make; }
    acquire() {
        if (this.active.length >= this.limit)
            return null;
        const item = this.free.pop() ?? this.make();
        this.active.push(item);
        return item;
    }
    remove(index) {
        const item = this.active[index];
        if (!item)
            return;
        const last = this.active.pop();
        if (index < this.active.length)
            this.active[index] = last;
        this.free.push(item);
    }
}
export class SpatialHash {
    size;
    cells = new Map();
    buckets = [];
    constructor(size = 96) { this.size = size; }
    key(x, y) { return (Math.floor(x / this.size) + 4096) * 8192 + Math.floor(y / this.size) + 4096; }
    clear() { for (const bucket of this.cells.values()) {
        bucket.length = 0;
        this.buckets.push(bucket);
    } this.cells.clear(); }
    insert(item) {
        const key = this.key(item.x, item.y);
        let bucket = this.cells.get(key);
        if (!bucket) {
            bucket = this.buckets.pop() ?? [];
            this.cells.set(key, bucket);
        }
        bucket.push(item);
    }
    query(x, y, radius, visit) {
        const a = Math.floor((x - radius) / this.size), b = Math.floor((x + radius) / this.size), c = Math.floor((y - radius) / this.size), d = Math.floor((y + radius) / this.size);
        for (let i = a; i <= b; i++)
            for (let j = c; j <= d; j++) {
                const bucket = this.cells.get((i + 4096) * 8192 + j + 4096);
                if (bucket)
                    for (const item of bucket)
                        visit(item);
            }
    }
}

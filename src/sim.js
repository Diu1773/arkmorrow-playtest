import { BOSS_ENCOUNTERS, CAPTAINS, ENEMIES, MODES, SECTORS, SHIPS, SWARM_EVENTS, WEAPONS, WORLD } from './data.js';
import { Pool, SpatialHash, canEvolve, choices, clamp, hpScale, moveVector, reward, rng, stats, waveAt, weaponStats, xpNeeded } from './core.js';
export const XP_LIMIT = 360;
const TAU = Math.PI * 2, blank = { x: 0, y: 0, aimX: 0, aimY: 0, dash: false, manual: false };
export const inGap = (gaps, width, a) => gaps.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < width / 2);
export function segmentDistance(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
export class Simulation {
    ship;
    meta;
    sector;
    difficulty;
    random;
    id;
    lastDamageCause = 'unknown';
    time = 0;
    level = 1;
    xp = 0;
    kills = 0;
    bonus = 0;
    evolutions = 0;
    rerolls;
    banishes = 3;
    banished = [];
    pendingLevels = 0;
    pendingChests = 0;
    status = 'playing';
    invincible = false;
    stress = false;
    miniSpawned = false;
    bossSpawned = false;
    bossKilled = false;
    spawnBudget = 0;
    nextSupply = 120;
    nextBeacon = 35;
    nextElite = 90;
    nextId = 1;
    blackout = 0;
    orbitAngle = 0;
    hitStop = 0;
    slowMotion = 0;
    shake = 0;
    reflections = 0;
    firstLevelAt = null;
    encounterIndex = 0;
    swarmIndex = 0;
    swarmUntil = 0;
    bossRecords = [];
    levelTimes = [];
    boosts = { damage: 0, hull: 0, reach: 0 };
    player;
    world = WORLD;
    terrain = [];
    obstacles = [];
    beacon = null;
    hazards = [];
    drops = [];
    events = [];
    particles = [];
    floaters = [];
    weapons;
    passives = {};
    enemyPool = new Pool(1600, () => ({ id: 0, type: 'rusher', x: 0, y: 0, r: 0, angle: 0, hp: 0, maxHp: 0, speed: 0, damage: 0, xp: 0, age: 0, timer: 0, flash: 0, orbitHit: 0, warnTime: 0, pendingAttack: null, attackIndex: 0, phase: 0, hidden: false, shielded: false, mirror: 0, elite: false, role: '', bossArt: 0, stages: 1, stageGuard: 0, leader: 0, offX: 0, offY: 0, arm: 0, ti: 0, dir: 1, ttl: 0 }));
    shotPool = new Pool(1800, () => this.blankBullet());
    bulletPool = new Pool(900, () => this.blankBullet());
    gemPool = new Pool(1800 + XP_LIMIT, () => ({ x: 0, y: 0, value: 0, kind: 'xp', pull: false, age: 0 }));
    effectPool = new Pool(180, () => ({ x: 0, y: 0, x2: 0, y2: 0, radius: 0, ttl: 0, life: 0, color: '', kind: 'ring', damage: 0, done: false, repeat: false, weapon: 'pulse' }));
    hash = new SpatialHash(96);
    power = 1;
    speed = 1;
    xpBoost = 1;
    dashBoost = 1;
    spawnBoost = 1;
    constructor(ship, meta, seed = Date.now(), id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, sector = 0, difficulty = 'normal') {
        this.ship = ship;
        this.meta = { ...meta };
        this.sector = clamp(Math.floor(sector), 0, 5);
        this.difficulty = difficulty;
        this.random = rng(seed);
        this.id = id;
        this.rerolls = 3 + meta.forecast;
        const s = stats(ship, {}, meta);
        this.player = { x: 2400, y: 1600, vx: 0, vy: 0, r: 16, angle: -Math.PI / 2, ship, hp: s.maxHp, maxHp: s.maxHp, invul: 3, flash: 0, dashTime: 0, dashCD: 0, dashX: 0, dashY: -1, range: 500, orbitCount: 0, orbitRadius: 100, inDark: false };
        this.weapons = [{ id: SHIPS.find(s => s.id === ship).weapon, level: 1, evolved: false, timer: .15 }];
        this.buildTerrain();
        for (let i = 0; i < 22; i++) {
            const a = this.random() * TAU, d = 550 + this.random() * 1500;
            this.obstacles.push({ x: clamp(2400 + Math.cos(a) * d, 100, 4700), y: clamp(1600 + Math.sin(a) * d, 100, 3100), r: 24 + this.random() * 22, kind: i % 4 === 0 ? 'station' : 'debris', angle: a, solid: true });
        }
        this.spawn('rusher', 2600, 1600);
        this.spawn('rusher', 2340, 1400);
        this.spawn('rusher', 2240, 1720);
        this.spawn('rusher', 2540, 1800);
    }
    blankBullet() { return { x: 0, y: 0, vx: 0, vy: 0, r: 4, damage: 0, life: 0, age: 0, kind: 'pulse', color: '#a9d8df', pierce: 0, targetId: 0, weapon: 'pulse', hit: new Set(), split: false, reflected: false }; }
    get enemies() { return this.enemyPool.active; }
    get shots() { return this.shotPool.active; }
    get bullets() { return this.bulletPool.active; }
    get pickups() { return this.gemPool.active; }
    get effects() { return this.effectPool.active; }
    get attributes() { const s = stats(this.ship, this.passives, this.meta); s.damage += this.boosts.damage * .03; s.maxHp += this.boosts.hull * 5; s.magnet += this.boosts.reach * 5; return s; }
    get mode() { return MODES[this.difficulty]; }
    emit(kind, x = this.player.x, y = this.player.y, value = 0, color = '#ffd260', weapon, size) { const event = { kind, x, y, value, color, weapon, size }; if (this.events.length < 120)
        this.events.push(event);
    else if (['hurt', 'warning', 'level', 'boss', 'evolve', 'chest'].includes(kind)) {
        const i = this.events.findIndex(e => ['hit', 'shoot', 'kill', 'pickup'].includes(e.kind));
        if (i >= 0)
            this.events[i] = event;
    } }
    spawn(type, x, y, role = '', elite = false) {
        const e = this.enemyPool.acquire();
        if (!e)
            return null;
        const p = this.player, def = ENEMIES[type], a = this.random() * TAU, d = 640 + this.random() * 120;
        const hp = def.hp * (type === 'boss' ? (role === 'middle' ? .32 : 1) : hpScale(this.time)) * (1 + this.sector * .22) * this.mode.hp * (elite ? 6 : 1);
        Object.assign(e, { id: this.nextId++, type, x: clamp(x ?? p.x + Math.cos(a) * d, 35, 4765), y: clamp(y ?? p.y + Math.sin(a) * d, 35, 3165), r: def.r * (elite ? 1.5 : role === 'captain' ? .85 : type === 'boss' ? 1.15 : 1), angle: a, hp, maxHp: hp, speed: def.speed * (elite ? .8 : 1), damage: def.damage * this.mode.damage * (1 + this.sector * .08), xp: def.xp * (elite ? 5 : 1) * (type !== 'boss' && this.time >= 540 ? 2.5 : 1), age: 0, timer: 2 + this.random(), flash: 0, orbitHit: -10, warnTime: 0, pendingAttack: null, attackIndex: 0, phase: 0, hidden: false, shielded: type === 'shield', mirror: 0, elite, role, bossArt: this.sector, stages: type === 'boss' ? (role === 'captain' ? 2 : 3) : 1, stageGuard: 0, leader: 0, offX: 0, offY: 0, arm: this.nextId % 2, ti: 20, dir: 1, ttl: 12 });
        return e;
    }
    fire(x, y, a, speed, damage, enemy = false, kind = 'pulse', color = '#a9d8df', life = 2, pierce = 0, weapon = kind === 'missile' ? 'missile' : 'pulse') {
        const b = (enemy ? this.bulletPool : this.shotPool).acquire();
        if (!b)
            return null;
        Object.assign(b, { x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: enemy ? 6 : 4, damage, life, age: 0, kind, color, pierce, targetId: 0, weapon, split: false, reflected: false });
        b.hit.clear();
        return b;
    }
    effect(kind, x, y, radius, color, life = .5, damage = 0, x2 = 0, y2 = 0, repeat = false, weapon = 'pulse') { const e = this.effectPool.acquire(); if (!e)
        return null; Object.assign(e, { kind, x, y, radius, color, ttl: life, life, damage, x2, y2, done: false, repeat, weapon }); return e; }
    nearest(x, y, radius, excluded) { let target, best = radius * radius; this.hash.query(x, y, radius, e => { if (e.hp <= 0 || e.hidden || excluded?.has(e.id))
        return; const d = (e.x - x) ** 2 + (e.y - y) ** 2; if (d < best) {
        best = d;
        target = e;
    } }); return target; }
    hit(e, damage, weapon = 'pulse') {
        if (e.hp <= 0 || e.mirror > 0 || e.stageGuard > 0)
            return;
        const actual = damage * (e.shielded ? .6 : 1), before = e.hp;
        e.hp -= actual;
        e.flash = .09;
        if (e.type === 'boss' && e.phase < e.stages - 1) {
            const boundary = e.maxHp * (e.stages - e.phase - 1) / e.stages;
            if (e.hp <= boundary) {
                e.hp = boundary;
                e.phase++;
                e.stageGuard = .65;
                e.warnTime = 0;
                e.pendingAttack = null;
                e.timer = .7;
                this.bossRecords.find(r => r.id === e.id)?.phases.push(this.time);
                this.effect('evolve', e.x, e.y, e.r * 1.6, '#ffc4ee', .35);
                this.emit('warning', e.x, e.y, e.phase);
            }
        }
        if (actual > 45 && e.id % 5 === 0)
            this.hitStop = Math.max(this.hitStop, .025);
        if (this.random() < .28)
            this.damageNumber(e.x, e.y - e.r, Math.round(before - e.hp), '#eef2f8');
        this.emit('hit', e.x, e.y, Math.round(before - e.hp), '#ffd260', weapon, e.r);
    }
    areaDamage(x, y, r, damage, push = 0, weapon = 'pulse') { this.hash.query(x, y, r + 100, e => { const d = Math.hypot(e.x - x, e.y - y); if (e.hp > 0 && d < r + e.r) {
        this.hit(e, damage, weapon);
        if (push && e.type !== 'boss') {
            e.x += (e.x - x) / (d || 1) * push;
            e.y += (e.y - y) / (d || 1) * push;
        }
    } }); this.hitBeacon(x, y, r, damage); }
    hitBeacon(x, y, r, damage) { const b = this.beacon; if (!b || b.hp <= 0 || Math.hypot(x - b.x, y - b.y) > r + b.r)
        return; b.hp -= damage; b.flash = .1; if (b.hp <= 0) {
        this.drops.push({ x: b.x, y: b.y });
        this.bonus += 15;
        this.beacon = null;
        this.emit('chest', b.x, b.y);
        this.effect('ring', b.x, b.y, 100, '#ffd260');
    } }
    damageNumber(x, y, value, color) { const old = this.floaters.find(f => f.color === color && f.life > .45 && (f.x - x) ** 2 + (f.y - y) ** 2 < 52 ** 2); if (old) {
        old.text = String(Number(old.text) + value);
        return;
    } if (this.floaters.length < 24)
        this.floaters.push({ x, y, life: .65, text: String(value), color }); }
    hurt(raw, cause = 'unknown') { const p = this.player; if (p.invul > 0 || p.dashTime > 0 || this.invincible || this.status !== 'playing')
        return; this.lastDamageCause = cause; const damage = Math.max(1, raw - this.attributes.armor); p.hp = Math.max(0, p.hp - damage); p.invul = this.mode.iframes; p.flash = .18; this.shake = 6; this.hitStop = .045; this.emit('hurt', p.x, p.y, Math.ceil(damage), '#ff746e'); this.damageNumber(p.x, p.y - 30, -Math.ceil(damage), '#ffaca4'); if (p.hp <= 0)
        this.status = 'lost'; }
    gainXP(value) { this.xp += value * this.attributes.xp * this.xpBoost; while (this.xp >= xpNeeded(this.level)) {
        this.xp -= xpNeeded(this.level);
        this.level++;
        this.pendingLevels++;
        this.firstLevelAt ??= this.time;
        this.levelTimes.push(this.time);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
        this.emit('level');
        this.effect('level', this.player.x, this.player.y, 180, '#9affd5', .38);
        for (const e of this.enemies) {
            const dx = e.x - this.player.x, dy = e.y - this.player.y, d = Math.hypot(dx, dy);
            if (e.hp > 0 && e.type !== 'boss' && d < 190 + e.r) {
                e.x += dx / (d || 1) * 95;
                e.y += dy / (d || 1) * 95;
            }
        }
        this.shake = Math.max(this.shake, 3);
    } }
    offers(chest = false, previous = []) { return choices(this.weapons, this.passives, this.time, chest, this.random, previous, this.banished); }
    apply(choice, chest = false) {
        if (chest ? this.pendingChests <= 0 : this.pendingLevels <= 0)
            return false;
        const old = this.attributes.maxHp;
        if (choice.kind === 'weapon') {
            const def = WEAPONS.find(w => w.id === choice.id), slot = this.weapons.find(w => w.id === choice.id);
            if (!def || this.banished.some(b => b.kind === choice.kind && b.id === choice.id))
                return false;
            if (slot) {
                if (slot.level >= 5)
                    return false;
                slot.level++;
            }
            else if (this.weapons.length < 6)
                this.weapons.push({ id: def.id, level: 1, evolved: false, timer: 0 });
            else
                return false;
        }
        else if (choice.kind === 'passive') {
            const key = choice.id;
            if (!['power', 'haste', 'speed', 'hull', 'area', 'magnet', 'regen', 'armor'].includes(key) || this.banished.some(b => b.kind === choice.kind && b.id === choice.id))
                return false;
            const level = this.passives[key] ?? 0;
            if (level >= 5 || (!level && Object.keys(this.passives).length >= 6))
                return false;
            this.passives[key] = level + 1;
        }
        else if (choice.kind === 'evolve') {
            const slot = this.weapons.find(w => w.id === choice.id);
            if (!chest || !slot || !canEvolve(slot, this.passives, this.time))
                return false;
            slot.evolved = true;
            this.evolutions++;
            this.emit('evolve');
            this.effect('evolve', this.player.x, this.player.y, 280, '#d8b5ff', 1.5);
            this.shake = 7;
        }
        else if (choice.kind === 'boost') {
            if (!['damage', 'hull', 'reach'].includes(choice.id))
                return false;
            this.boosts[choice.id]++;
        }
        else if (choice.kind === 'heal')
            this.player.hp = Math.min(this.attributes.maxHp, this.player.hp + 30);
        else if (choice.kind === 'shards')
            this.bonus += 20;
        else
            return false;
        this.player.maxHp = this.attributes.maxHp;
        this.player.hp += Math.max(0, this.player.maxHp - old);
        if (chest)
            this.pendingChests--;
        else
            this.pendingLevels--;
        return true;
    }
    banish(choice) { if (this.banishes <= 0 || !['weapon', 'passive'].includes(choice.kind) || this.banished.some(b => b.kind === choice.kind && b.id === choice.id))
        return false; this.banishes--; this.banished.push({ ...choice }); return true; }
    buildTerrain() {
        const T = [], r = this.random, range = (a, b) => a + r() * (b - a);
        if (this.sector === 0) {
            for (let i = 0; i < 15; i++) {
                let x = 0, y = 0;
                for (let n = 0; n < 50; n++) {
                    x = range(350, 4450);
                    y = range(300, 2900);
                    if (Math.hypot(x - 2400, y - 1600) > 500 && !T.some(t => Math.hypot(t.x - x, t.y - y) < 380))
                        break;
                }
                T.push({ kind: ['emission', 'reflection', 'dark'][i % 3], x, y, r: i % 3 === 0 ? 260 : 220, angle: r() * TAU });
            }
            T[0] = { kind: 'emission', x: 2740, y: 1650, r: 220 };
            T[1] = { kind: 'reflection', x: 2140, y: 1400, r: 185 };
        }
        if (this.sector === 1)
            for (const [x, y] of [[900, 800], [2400, 750], [3900, 800], [900, 2450], [2400, 2500], [3900, 2450]])
                T.push({ kind: 'bluestars', x, y, r: 230, stars: Array.from({ length: 9 }, () => { const a = r() * TAU, d = range(20, 200); return [Math.cos(a) * d, Math.sin(a) * d, range(.6, 1.2)]; }) });
        if (this.sector === 2)
            T.push({ kind: 'core', x: 2400, y: 1600, r: 720 });
        if (this.sector === 3) {
            const R = 1350, bar = 330, arms = Array.from({ length: 2 }, (_, k) => Array.from({ length: 71 }, (_, i) => { const f = i / 70, a = k * Math.PI + f * 3.4, d = bar + f * (R - bar); return [2400 + Math.cos(a) * d, 1600 + Math.sin(a) * d]; }));
            const q = arms[0][30];
            T.push({ kind: 'galaxy', x: 2400, y: 1600, r: R, R, bar, arms, sun: { x: q[0], y: q[1], found: false } });
        }
        if (this.sector === 4)
            [[900, 800], [3900, 800], [2400, 2550], [850, 2500], [3950, 2450]].forEach(([x, y], i) => T.push({ kind: ['elliptical', 'spiral', 'irregular', 'spiral', 'elliptical'][i], x, y, r: 420, angle: r() * TAU, seed: i + 5 }));
        if (this.sector === 5)
            for (let i = 0; i < 40; i++) {
                const a = r() * TAU, d = range(150, 1400);
                T.push({ kind: 'mark', x: 2400 + Math.cos(a) * d, y: 1600 + Math.sin(a) * d, r: 10, age: 1, c: '#c9b8ff88' });
            }
        this.terrain = T;
    }
    inside(kind, x = this.player.x, y = this.player.y) { return this.terrain.find(t => t.kind === kind && (t.x - x) ** 2 + (t.y - y) ** 2 < t.r * t.r); }
    updateTerrain(dt) {
        const p = this.player;
        this.power = 1;
        this.speed = 1;
        this.xpBoost = 1;
        this.dashBoost = 1;
        this.spawnBoost = 1;
        this.blackout = Math.max(0, this.blackout - dt);
        p.inDark = !!this.inside('dark');
        if (this.inside('emission'))
            this.power = 1.2;
        if (this.inside('bluestars')) {
            this.speed = 1.1;
            this.dashBoost = 2;
        }
        if (this.inside('core')) {
            this.xpBoost = 1.5;
            this.spawnBoost = 1.4;
        }
        const g = this.terrain.find(t => t.kind === 'galaxy');
        if (g?.arms) {
            if (g.arms.some(arm => arm.some(q => (q[0] - p.x) ** 2 + (q[1] - p.y) ** 2 < 95 ** 2)))
                this.speed = 1.2;
            const s = g.sun;
            if (!s.found && Math.hypot(p.x - s.x, p.y - s.y) < 90) {
                s.found = true;
                this.gainXP(40);
            }
        }
        if (this.sector === 5)
            for (const d of this.drops) {
                d.x = clamp(d.x + (d.x - p.x) * .035 * dt, 30, 4770);
                d.y = clamp(d.y + (d.y - p.y) * .035 * dt, 30, 3170);
            }
        if (this.sector === 4 && !this.terrain.some(t => Math.hypot(p.x - t.x, p.y - t.y) < t.r))
            this.spawnBoost = .6;
        for (let i = this.terrain.length - 1; i >= 0; i--) {
            const t = this.terrain[i];
            if (t.ttl !== undefined && (t.ttl -= dt) <= 0)
                this.terrain.splice(i, 1);
            if (t.kind === 'mark') {
                t.age = (t.age ?? 0) + dt;
                t.x += (t.x - p.x) * .06 * dt;
                t.y += (t.y - p.y) * .06 * dt;
                if (Math.hypot(t.x - p.x, t.y - p.y) > 1700) {
                    const a = this.random() * TAU;
                    t.x = p.x + Math.cos(a) * 300;
                    t.y = p.y + Math.sin(a) * 300;
                    t.age = 0;
                }
            }
        }
    }
    formation(x, y) { const leader = this.spawn('wingLeader', x, y); if (!leader)
        return; for (let i = 0; i < 4; i++) {
        const w = this.spawn('wing', x + (i % 2 ? 1 : -1) * (40 + Math.floor(i / 2) * 35), y + 50 + Math.floor(i / 2) * 40);
        if (w) {
            w.leader = leader.id;
            w.offX = (i % 2 ? 1 : -1) * (40 + Math.floor(i / 2) * 35);
            w.offY = 50 + Math.floor(i / 2) * 40;
        }
    } }
    updateEnemy(e, dt) {
        const p = this.player;
        e.age += dt;
        e.flash = Math.max(0, e.flash - dt);
        e.mirror = Math.max(0, e.mirror - dt);
        e.stageGuard = Math.max(0, e.stageGuard - dt);
        e.timer -= dt;
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
        let angle = a, speed = e.speed * this.mode.speed;
        e.angle = a;
        e.hidden = e.type !== 'boss' && ((this.blackout > 0 && d > 240) || (p.inDark && d > 260) || (d > 220 && !!this.inside('dark', e.x, e.y)));
        if (e.type === 'boss') {
            if (d < 160)
                speed *= .05;
            else if (d > 260)
                speed = Math.max(speed, 180);
            if (e.stageGuard > 0)
                speed = 0;
            else if (e.warnTime > 0) {
                e.warnTime -= dt;
                if (e.warnTime <= 0 && e.pendingAttack) {
                    this.firePattern(e, e.pendingAttack);
                    e.pendingAttack = null;
                }
            }
            else if (e.timer <= 0) {
                const patterns = e.role === 'final' ? SECTORS[this.sector].patterns : CAPTAINS[Math.max(0, e.bossArt - 6) % 4];
                this.beginPattern(e, patterns[(e.attackIndex++ + e.phase) % patterns.length]);
                e.timer = 5.4 - e.phase * .55;
            }
        }
        else {
            if (e.type === 'wing' && e.leader) {
                const l = this.enemies.find(q => q.id === e.leader && q.hp > 0);
                if (l) {
                    const tx = l.x - Math.cos(l.angle) * e.offY - Math.sin(l.angle) * e.offX, ty = l.y - Math.sin(l.angle) * e.offY + Math.cos(l.angle) * e.offX;
                    angle = Math.atan2(ty - e.y, tx - e.x);
                    speed *= Math.min(1.6, Math.hypot(tx - e.x, ty - e.y) / 25);
                }
                else {
                    e.leader = 0;
                    speed *= 1.5;
                }
            }
            if (e.type === 'orbiter') {
                const orbit = 300 + e.id % 4 * 95, ang = e.age * e.speed / orbit + e.id, tx = 2400 + Math.cos(ang) * orbit, ty = 1600 + Math.sin(ang) * orbit;
                angle = Math.atan2(ty - e.y, tx - e.x);
            }
            if (e.type === 'patrol') {
                const g = this.terrain.find(t => t.kind === 'galaxy');
                if (g?.arms) {
                    const arm = g.arms[e.arm], q = arm[e.ti];
                    angle = Math.atan2(q[1] - e.y, q[0] - e.x);
                    if (Math.hypot(q[0] - e.x, q[1] - e.y) < 30) {
                        e.ti += e.dir;
                        if (e.ti <= 0 || e.ti >= 70)
                            e.dir *= -1;
                        e.ti = clamp(e.ti, 0, 70);
                    }
                }
            }
            if (e.type === 'spinner')
                angle += .8;
            if (e.type === 'erratic')
                angle += Math.sin(e.age * 5 + e.id);
            if (e.type === 'dustling')
                angle += Math.sin(e.age) * .35;
            const ranged = ['shooter', 'wingLeader', 'orbiter', 'patrol', 'ellip', 'galaxyDot', 'decoy'].includes(e.type);
            if (ranged) {
                if (d < 250 && e.type !== 'orbiter' && e.type !== 'patrol')
                    speed *= .15;
                if (e.warnTime > 0) {
                    e.warnTime -= dt;
                    if (e.warnTime <= 0) {
                        const n = e.type === 'ellip' || e.type === 'orbiter' ? 8 : e.type === 'wingLeader' ? 3 : 1;
                        for (let i = 0; i < n; i++)
                            this.fire(e.x, e.y, n === 8 ? i / n * TAU : a + (i - (n - 1) / 2) * .18, 160 * this.mode.speed, e.damage, true);
                        e.timer = 3.2;
                    }
                }
                else if (e.timer <= 0 && d < 800) {
                    e.warnTime = .75 * this.mode.tell;
                    e.pendingAttack = { pattern: 'prism', angle: a, phase: 0, x: e.x, y: e.y, gap: 0 };
                }
            }
            if (e.type === 'decoy' && (e.ttl -= dt) <= 0)
                e.hp = 0;
        }
        if (this.sector === 5 && e.type !== 'boss') {
            e.x += (e.x - p.x) * .035 * dt;
            e.y += (e.y - p.y) * .035 * dt;
        }
        e.x = clamp(e.x + Math.cos(angle) * speed * dt, 25, 4775);
        e.y = clamp(e.y + Math.sin(angle) * speed * dt, 25, 3175);
        if (d < e.r + p.r)
            this.hurt(e.damage, e.type === 'boss' ? 'boss:' + e.bossArt : e.type);
        if (d > 1500 && this.sector !== 4 && e.type !== 'boss' && !e.elite) {
            const ang = this.random() * TAU;
            e.x = clamp(p.x + Math.cos(ang) * 760, 35, 4765);
            e.y = clamp(p.y + Math.sin(ang) * 760, 35, 3165);
        }
    }
    hazard(type, x, y, extra = {}) { const h = { type, x, y, angle: 0, length: 1000, width: 26, r: 0, r0: 90, r1: 950, spin: .8, age: 0, warning: 1.3 * this.mode.tell, duration: 2.8, damage: 18 * this.mode.damage, gaps: [this.random() * TAU], gapW: .8, gap: 0, off: 80, ...extra }; this.hazards.push(h); return h; }
    beginPattern(e, pattern) {
        const p = this.player, a = Math.atan2(p.y - e.y, p.x - e.x), gap = this.random() * TAU;
        e.pendingAttack = { pattern, angle: a, phase: e.phase, x: p.x, y: p.y, gap };
        e.warnTime = 1.3 * this.mode.tell;
        this.emit('warning', e.x, e.y);
        if (pattern === 'closing')
            this.hazard('ringwarn', p.x, p.y, { r: 430, gaps: [gap], gapW: .85, duration: 0, damage: 0 });
        if (pattern === 'ring')
            this.hazard('ringwarn', e.x, e.y, { r: e.r + 65, gaps: [a + .7], gapW: .7, duration: 0, damage: 0 });
        if (pattern === 'wall') {
            e.pendingAttack.gap = (this.random() - .5) * 500;
            this.hazard('wallwarn', e.x, e.y, { angle: a, gap: e.pendingAttack.gap, duration: 0, damage: 0 });
        }
        if (pattern === 'barSweep')
            this.hazard('sweep', e.x, e.y, { angle: a, spin: (this.random() < .5 ? -1 : 1) * .75, length: 1100, duration: 2.6 });
        if (pattern === 'balloon')
            this.hazard('shell', e.x, e.y, { gaps: [gap, gap + Math.PI], gapW: .8, duration: 3.2 });
        if (pattern === 'laser')
            this.hazard('laser', e.x, e.y, { angle: a, length: 1100, duration: 1.2, width: 30 });
    }
    firePattern(e, pa) {
        const a = pa.angle, ph = pa.phase, sp = this.mode.speed, damage = e.damage;
        if (pa.pattern === 'prism' || pa.pattern === 'fan') {
            const n = pa.pattern === 'prism' ? 3 + ph : 7 + ph * 2;
            for (let i = 0; i < n; i++) {
                const b = this.fire(e.x, e.y, a + (i - (n - 1) / 2) * .25, 145 * sp, damage, true);
                if (b && pa.pattern === 'prism') {
                    b.split = true;
                    b.r = 8;
                }
            }
        }
        if (pa.pattern === 'blackout') {
            this.blackout = 3.6;
            for (let i = 0; i < 10; i++)
                this.fire(e.x, e.y, i / 10 * TAU, 120 * sp, damage, true);
        }
        if (pa.pattern === 'squad')
            for (const k of [-1, 1])
                this.formation(clamp(e.x + Math.cos(a + k * Math.PI / 2) * 170, 80, 4720), clamp(e.y + Math.sin(a + k * Math.PI / 2) * 170, 80, 3120));
        if (pa.pattern === 'wall')
            for (let k = -450; k <= 450; k += 30) {
                if (Math.abs(k - pa.gap) < 80)
                    continue;
                this.fire(e.x - Math.sin(a) * k + Math.cos(a) * 80, e.y + Math.cos(a) * k + Math.sin(a) * 80, a, 155 * sp, damage, true);
            }
        if (pa.pattern === 'closing')
            for (let i = 0; i < 48; i++) {
                const ang = i / 48 * TAU;
                if (inGap([pa.gap], .85, ang))
                    continue;
                this.fire(pa.x + Math.cos(ang) * 430, pa.y + Math.sin(ang) * 430, ang + Math.PI, 110 * sp, damage, true, 'pulse', '#ff746e', 4.1 / sp);
            }
        if (pa.pattern === 'ring') {
            const gap = a + .7;
            for (let i = 0; i < 28; i++) {
                const ang = i / 28 * TAU;
                if (!inGap([gap], .7, ang))
                    this.fire(e.x, e.y, ang, 140 * sp, damage, true);
            }
        }
        if (pa.pattern === 'mirror')
            e.mirror = 3.5;
        if (pa.pattern === 'clone')
            for (const k of [-1, 1])
                this.spawn('decoy', e.x + Math.cos(a + k * Math.PI / 2) * 170, e.y + Math.sin(a + k * Math.PI / 2) * 170);
    }
    updateHazards(dt) {
        const p = this.player;
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.age += dt;
            if (h.age > h.warning + h.duration) {
                this.hazards.splice(i, 1);
                continue;
            }
            if (h.age < h.warning || h.damage <= 0)
                continue;
            let hit = false;
            const a = h.angle + (h.type === 'sweep' ? h.spin * (h.age - h.warning) : 0), dx = p.x - h.x, dy = p.y - h.y, along = dx * Math.cos(a) + dy * Math.sin(a), across = -dx * Math.sin(a) + dy * Math.cos(a);
            if (h.type === 'laser')
                hit = along >= 0 && along < h.length && Math.abs(across) < h.width / 2 + p.r;
            if (h.type === 'sweep')
                hit = Math.abs(along) < h.length && Math.abs(across) < h.width / 2 + p.r;
            if (h.type === 'shell') {
                const rad = h.r0 + (h.r1 - h.r0) * clamp((h.age - h.warning) / h.duration, 0, 1);
                hit = Math.abs(Math.hypot(dx, dy) - rad) < h.width / 2 + p.r && !inGap(h.gaps, h.gapW, Math.atan2(dy, dx));
            }
            if (hit)
                this.hurt(h.damage, 'hazard');
        }
    }
    attack(slot, input) {
        const p = this.player, s = this.attributes, w = weaponStats(slot, s), def = WEAPONS.find(w => w.id === slot.id), damage = w.damage * this.power;
        const target = this.nearest(p.x, p.y, 800), b = this.beacon, bt = b && Math.hypot(b.x - p.x, b.y - p.y) < 500 ? b : null, t = bt ?? target;
        let a = t ? Math.atan2(t.y - p.y, t.x - p.x) : p.angle;
        if (input.manual && Math.hypot(input.aimX, input.aimY) > .1)
            a = Math.atan2(input.aimY, input.aimX);
        if (t || input.manual)
            p.angle = a;
        if (slot.id === 'orbit')
            return;
        if (slot.id === 'pulse' || slot.id === 'fan') {
            if (!t && !input.manual)
                return;
            const fan = slot.id === 'fan', n = fan ? (slot.evolved ? 9 : 5) : w.count + (slot.evolved ? 2 : 0);
            for (let j = 0; j < n; j++)
                this.fire(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, a + (j - (n - 1) / 2) * (fan ? .16 : .11), fan ? 460 : 670, damage, false, 'pulse', def.color, w.radius / (fan ? 460 : 670), slot.evolved ? 3 : this.ship === 'lynx' ? 1 : 0, slot.id);
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
        }
        else if (slot.id === 'missile' && t) {
            for (let j = 0; j < (slot.evolved ? 5 : Math.min(3, w.count)); j++) {
                const shot = this.fire(p.x, p.y, a + (j - (w.count - 1) / 2) * .35, 310, damage, false, 'missile', def.color, 3);
                if (shot)
                    shot.targetId = target?.id ?? 0;
            }
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
        }
        else if (slot.id === 'chain' && t) {
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
            if (bt) {
                this.hitBeacon(bt.x, bt.y, 30, damage);
                this.effect('line', p.x, p.y, 0, def.color, .2, 0, bt.x, bt.y, false, slot.id);
            }
            let last = { x: p.x, y: p.y }, next = target;
            const used = new Set();
            for (let j = 0; j < (slot.evolved ? 7 : 3) && next; j++) {
                used.add(next.id);
                this.hit(next, damage, slot.id);
                this.effect('line', last.x, last.y, 0, def.color, .2, 0, next.x, next.y, false, slot.id);
                last = next;
                next = this.nearest(last.x, last.y, w.radius, used);
            }
        }
        else if (slot.id === 'laser' && t) {
            for (let j = 0; j < (slot.evolved ? 3 : 1); j++) {
                const ang = a + (j - (slot.evolved ? 1 : 0)) * .2, x2 = p.x + Math.cos(ang) * w.radius, y2 = p.y + Math.sin(ang) * w.radius;
                this.hash.query(p.x, p.y, w.radius + 70, e => { if (e.hp > 0 && segmentDistance(e.x, e.y, p.x, p.y, x2, y2) < e.r + 8)
                    this.hit(e, damage, slot.id); });
                if (bt && segmentDistance(bt.x, bt.y, p.x, p.y, x2, y2) < bt.r + 8)
                    this.hitBeacon(bt.x, bt.y, 1, damage);
                this.effect('line', p.x, p.y, 0, def.color, .28, 0, x2, y2, false, slot.id);
            }
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
        }
        else if (slot.id === 'mine') {
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
            for (let j = 0; j < (slot.evolved ? 3 : 1); j++)
                this.effect('mine', p.x - Math.cos(a) * 40 + Math.cos(j * TAU / 3) * j * 40, p.y - Math.sin(a) * 40 + Math.sin(j * TAU / 3) * j * 40, w.radius, def.color, 1.2, damage, 0, 0, slot.evolved, slot.id);
        }
        else if (slot.id === 'nova') {
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
            const r = w.radius * (slot.evolved ? 1.5 : 1);
            this.areaDamage(p.x, p.y, r, damage, 45, slot.id);
            this.effect('ring', p.x, p.y, r, def.color, .6, 0, 0, 0, false, slot.id);
            if (slot.evolved)
                this.effect('mine', p.x, p.y, r, def.color, .45, damage * .7, 0, 0, false, slot.id);
        }
    }
    orbitAttack(slot) { const p = this.player, w = weaponStats(slot, this.attributes), n = slot.evolved ? 6 : 2 + Number(slot.level >= 3), r = w.radius * (slot.evolved ? 1.3 : 1); p.orbitCount = n; p.orbitRadius = r; for (let j = 0; j < n; j++) {
        const a = this.orbitAngle + j / n * TAU, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        this.hash.query(x, y, 110, e => { if (e.hp > 0 && this.time - e.orbitHit >= w.cooldown && (x - e.x) ** 2 + (y - e.y) ** 2 < (e.r + 15) ** 2) {
            e.orbitHit = this.time;
            this.hit(e, w.damage * this.power, slot.id);
        } });
        this.hitBeacon(x, y, 15, w.damage * .03);
    } }
    updateProjectiles(pool, dt, enemy) {
        for (let i = pool.active.length - 1; i >= 0; i--) {
            const b = pool.active[i];
            b.life -= dt;
            b.age += dt;
            const ox = b.x, oy = b.y;
            if (b.kind === 'missile') {
                const target = this.enemies.find(e => e.id === b.targetId && e.hp > 0) || this.nearest(b.x, b.y, 650);
                if (target) {
                    const a = Math.atan2(target.y - b.y, target.x - b.x);
                    b.vx += (Math.cos(a) * 350 - b.vx) * Math.min(1, dt * 7);
                    b.vy += (Math.sin(a) * 350 - b.vy) * Math.min(1, dt * 7);
                }
            }
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (enemy && !b.reflected)
                for (const t of this.terrain) {
                    if (t.kind !== 'reflection')
                        continue;
                    const d0 = Math.hypot(ox - t.x, oy - t.y), d1 = Math.hypot(b.x - t.x, b.y - t.y);
                    if (d0 >= t.r && d1 < t.r) {
                        const nx = (ox - t.x) / d0, ny = (oy - t.y) / d0, dot = b.vx * nx + b.vy * ny;
                        b.vx -= 2 * dot * nx;
                        b.vy -= 2 * dot * ny;
                        b.x = ox;
                        b.y = oy;
                        b.reflected = true;
                        this.reflections++;
                        break;
                    }
                }
            if (b.split && b.age >= .95) {
                b.life = 0;
                b.split = false;
                const a = Math.atan2(b.vy, b.vx);
                for (let k = -1; k <= 1; k++)
                    this.fire(b.x, b.y, a + k * .4, 175 * this.mode.speed, b.damage, true);
            }
            if (enemy) {
                if (!b.reflected && segmentDistance(this.player.x, this.player.y, ox, oy, b.x, b.y) < this.player.r + b.r) {
                    this.hurt(b.damage, 'bullet');
                    b.life = 0;
                }
            }
            else if (b.life > 0) {
                this.hash.query(b.x, b.y, 100, e => {
                    if (e.hp <= 0 || b.life <= 0 || b.hit.has(e.id) || segmentDistance(e.x, e.y, ox, oy, b.x, b.y) > e.r + b.r)
                        return;
                    if (e.mirror > 0) {
                        b.life = 0;
                        this.fire(b.x, b.y, Math.atan2(this.player.y - e.y, this.player.x - e.x), 220, e.damage, true);
                        return;
                    }
                    if (b.kind === 'missile') {
                        this.areaDamage(b.x, b.y, WEAPONS[2].radius * this.attributes.area * (this.weapons.find(w => w.id === 'missile')?.evolved ? 1.6 : 1), b.damage, 0, b.weapon);
                        this.effect('ring', b.x, b.y, 100, '#ffc18b', .5, 0, 0, 0, false, b.weapon);
                        b.life = 0;
                    }
                    else {
                        this.hit(e, b.damage, b.weapon);
                        b.hit.add(e.id);
                        if (b.pierce-- <= 0)
                            b.life = 0;
                    }
                });
                const bc = this.beacon;
                if (bc && segmentDistance(bc.x, bc.y, ox, oy, b.x, b.y) < bc.r + b.r && b.life > 0) {
                    this.hitBeacon(bc.x, bc.y, 0, b.damage);
                    b.life = 0;
                }
            }
            if (b.life <= 0)
                pool.remove(i);
        }
    }
    dropXP(x, y, value, kind = 'xp') {
        const capped = this.pickups.reduce((n, g) => n + Number(g.kind === kind), 0) >= (kind === 'xp' ? XP_LIMIT : 1800);
        const g = capped ? null : this.gemPool.acquire();
        if (g) {
            Object.assign(g, { x, y, value, kind, pull: false, age: 0, cluster: false });
            return;
        }
        const p = this.player;
        let closest, best = Infinity, large, largeDistance = 240 ** 2;
        for (const gem of this.pickups) {
            if (gem.kind !== kind)
                continue;
            const d = (gem.x - (kind === 'xp' ? p.x : x)) ** 2 + (gem.y - (kind === 'xp' ? p.y : y)) ** 2;
            if (d < best) {
                closest = gem;
                best = d;
            }
            if (kind === 'xp' && (gem.cluster || gem.value >= 12) && d < largeDistance) {
                large = gem;
                largeDistance = d;
            }
        }
        if (large) {
            closest = large;
            best = largeDistance;
        }
        if (closest) {
            if (kind === 'xp' && best > 240 ** 2) {
                const a = Math.atan2(closest.y - p.y, closest.x - p.x);
                closest.x = clamp(p.x + Math.cos(a) * 220, 30, 4770);
                closest.y = clamp(p.y + Math.sin(a) * 220, 30, 3170);
            }
            closest.value += value;
            if (kind === 'xp') {
                closest.pull = true;
                closest.cluster = true;
            }
        }
    }
    cleanup() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hp > 0)
                continue;
            this.kills++;
            this.shake = Math.max(this.shake, 1.8);
            this.dropXP(e.x, e.y, e.xp);
            this.emit('kill', e.x, e.y, e.type === 'boss' ? 2 : 0, '#ffd260', undefined, e.r);
            if (this.random() < .025)
                this.dropXP(e.x + 12, e.y, 10, 'heal');
            if (this.particles.length < 240)
                for (let j = 0; j < (e.type === 'boss' ? 30 : 5) && this.particles.length < 240; j++) {
                    const a = this.random() * TAU, sp = 30 + this.random() * 140;
                    this.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 1 + this.random() * 3, life: .5, maxLife: .5, color: e.type === 'boss' ? '#ffc66d' : '#ffaca4' });
                }
            if (e.type === 'splitter') {
                this.spawn('mini', e.x - 15, e.y);
                this.spawn('mini', e.x + 15, e.y);
            }
            if (e.type === 'dustling' && this.terrain.filter(t => t.ttl !== undefined).length < 6)
                this.terrain.push({ kind: 'dark', x: e.x, y: e.y, r: 100, ttl: 8 });
            if (e.type === 'boss' || e.elite) {
                this.drops.push({ x: e.x, y: e.y });
                this.bonus += e.elite ? 20 : e.role === 'middle' ? 35 : 80;
                this.shake = 8;
                this.hitStop = e.type === 'boss' ? .11 : .04;
                if (e.type === 'boss')
                    this.slowMotion = .4;
                const record = this.bossRecords.find(r => r.id === e.id);
                if (record)
                    record.killed = this.time;
                if (e.role === 'final') {
                    this.bossKilled = true;
                    this.blackout = 0;
                    this.hazards = [];
                    for (const b of this.bullets)
                        b.life = 0;
                }
            }
            this.enemyPool.remove(i);
        }
    }
    step(dt, input = blank) {
        if (this.status !== 'playing' || this.pendingLevels || this.pendingChests)
            return;
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, .1);
        this.time = Math.min(660, this.time + dt);
        const p = this.player, s = this.attributes, m = moveVector(input.x, input.y);
        this.updateTerrain(dt);
        p.maxHp = s.maxHp;
        p.invul = Math.max(0, p.invul - dt);
        p.flash = Math.max(0, p.flash - dt);
        p.hp = Math.min(p.maxHp, p.hp + s.regen * dt);
        p.dashCD = Math.max(0, p.dashCD - dt * this.dashBoost);
        p.dashTime = Math.max(0, p.dashTime - dt);
        this.shake = Math.max(0, this.shake - dt * 16);
        if (input.dash && p.dashCD <= 0) {
            p.dashTime = .22;
            p.dashCD = 4.5;
            const len = Math.hypot(m.x, m.y);
            p.dashX = len ? m.x / len : Math.cos(p.angle);
            p.dashY = len ? m.y / len : Math.sin(p.angle);
        }
        p.vx = p.dashTime > 0 ? p.dashX * 650 : m.x * s.speed * this.speed;
        p.vy = p.dashTime > 0 ? p.dashY * 650 : m.y * s.speed * this.speed;
        p.x = clamp(p.x + p.vx * dt, 30, 4770);
        p.y = clamp(p.y + p.vy * dt, 30, 3170);
        if (Math.hypot(m.x, m.y) > .1)
            p.angle = Math.atan2(m.y, m.x);
        for (const o of this.obstacles) {
            const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy), r = p.r + o.r;
            if (d < r) {
                p.x = o.x + dx / (d || 1) * (r + .5);
                p.y = o.y + dy / (d || 1) * (r + .5);
            }
        }
        if (!this.bossKilled || this.time < 600) {
            this.spawnBudget += waveAt(this.time) * this.mode.spawn * this.spawnBoost * (this.bossSpawned ? .85 : 1) * dt;
            while (this.spawnBudget >= 1) {
                const types = SECTORS[this.sector].types;
                const type = this.time < 35 ? 'rusher' : types[Math.floor(this.random() * Math.min(types.length, 1 + Math.floor(this.time / 65)))];
                if (this.sector === 4) {
                    const island = this.terrain.reduce((best, t) => Math.hypot(t.x - p.x, t.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? t : best, this.terrain[0]), a = this.random() * TAU;
                    const islandType = island.kind === 'elliptical' ? 'ellip' : island.kind === 'spiral' ? 'spinner' : 'erratic';
                    this.spawn(islandType, island.x + Math.cos(a) * island.r * .7, island.y + Math.sin(a) * island.r * .7);
                }
                else
                    this.spawn(type);
                this.spawnBudget--;
            }
            const encounter = BOSS_ENCOUNTERS[this.encounterIndex];
            if (encounter && this.time >= encounter.at) {
                const e = this.spawn('boss', p.x + 220, p.y - 120, encounter.role);
                if (e) {
                    e.bossArt = encounter.art < 0 ? this.sector : encounter.art;
                    e.stages = encounter.stages;
                    e.hp = e.maxHp = encounter.hp * this.mode.hp * (1 + this.sector * .12);
                    e.xp = encounter.role === 'final' ? 900 : encounter.role === 'middle' ? 400 : 180;
                    e.r = encounter.role === 'captain' ? 52 : encounter.role === 'middle' ? 66 : 78;
                    this.bossRecords.push({ id: e.id, art: e.bossArt, role: e.role, spawned: this.time, killed: null, phases: [], hp: e.maxHp });
                    this.encounterIndex++;
                    if (e.role === 'middle')
                        this.miniSpawned = true;
                    if (e.role === 'final')
                        this.bossSpawned = true;
                    this.emit('boss', e.x, e.y, e.bossArt);
                    p.invul = Math.max(p.invul, 2);
                }
            }
            const swarm = SWARM_EVENTS[this.swarmIndex];
            if (swarm && this.time >= swarm.at) {
                this.swarmUntil = this.time + swarm.duration;
                this.swarmIndex++;
                this.emit('swarm');
                for (let i = 0; i < swarm.count; i++) {
                    const a = i / swarm.count * TAU, d = 450 + i % 4 * 35;
                    this.spawn('swarm', clamp(p.x + Math.cos(a) * d, 35, 4765), clamp(p.y + Math.sin(a) * d, 35, 3165));
                }
            }
            if (this.sector === 1 && Math.floor(this.time / 25) > Math.floor((this.time - dt) / 25))
                this.formation(clamp(p.x + 550, 100, 4700), p.y);
            if (this.sector === 5 && Math.floor(this.time / 28) > Math.floor((this.time - dt) / 28))
                for (let i = 0; i < 7; i++)
                    this.spawn('galaxyDot', clamp(p.x + 450 + i * 24, 30, 4770), clamp(p.y - 140 + i * 18, 30, 3170));
        }
        if (this.time >= this.nextBeacon && this.time < 500) {
            if (!this.beacon)
                this.beacon = { x: clamp(p.x + 250, 100, 4700), y: clamp(p.y + 150, 100, 3100), r: 30, hp: 130 + this.sector * 30, maxHp: 130 + this.sector * 30, flash: 0 };
            this.nextBeacon += 100;
        }
        if (this.time >= this.nextSupply && this.nextSupply <= 480) {
            this.drops.push({ x: clamp(p.x + 80, 50, 4750), y: clamp(p.y + 40, 50, 3150) });
            this.nextSupply += 120;
        }
        this.hash.clear();
        for (const e of this.enemies) {
            if (e.hp > 0) {
                this.updateEnemy(e, dt);
                this.hash.insert(e);
            }
        }
        p.orbitCount = 0;
        this.orbitAngle = this.time * 2.6;
        for (const slot of this.weapons) {
            if (slot.id === 'orbit') {
                this.orbitAttack(slot);
                continue;
            }
            slot.timer -= dt;
            if (slot.timer <= 0) {
                this.attack(slot, input);
                slot.timer = weaponStats(slot, s).cooldown;
            }
        }
        this.updateProjectiles(this.shotPool, dt, false);
        this.updateProjectiles(this.bulletPool, dt, true);
        this.updateHazards(dt);
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];
            e.ttl -= dt;
            if (e.kind === 'mine' && !e.done && e.ttl <= .12) {
                e.done = true;
                this.areaDamage(e.x, e.y, e.radius, e.damage, 20, e.weapon);
                this.emit('kill', e.x, e.y);
                if (e.repeat)
                    this.effect('mine', e.x, e.y, e.radius * .85, e.color, .5, e.damage * .5, 0, 0, false, e.weapon);
            }
            if (e.ttl <= 0)
                this.effectPool.remove(i);
        }
        this.cleanup();
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const g = this.pickups[i], dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
            g.age += dt;
            if (d < s.magnet)
                g.pull = true;
            if (this.sector === 5 && !g.pull && g.age < 18) {
                g.x += (g.x - p.x) * .05 * dt;
                g.y += (g.y - p.y) * .05 * dt;
            }
            if (g.pull || g.kind === 'xp' && g.age >= 18) {
                const speed = g.pull ? 340 + Math.max(0, s.magnet - d) * 6 : Math.min(180, 35 + (g.age - 18) * 5), travel = Math.min(d, speed * dt);
                g.x += dx / (d || 1) * travel;
                g.y += dy / (d || 1) * travel;
            }
            if (d < 20) {
                if (g.kind === 'heal')
                    p.hp = Math.min(p.maxHp, p.hp + g.value);
                else
                    this.gainXP(g.value);
                this.emit('pickup', g.x, g.y, g.value);
                this.gemPool.remove(i);
            }
        }
        for (let i = this.drops.length - 1; i >= 0; i--)
            if (Math.hypot(this.drops[i].x - p.x, this.drops[i].y - p.y) < 38) {
                this.pendingChests++;
                this.emit('chest');
                this.drops.splice(i, 1);
            }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const f = this.particles[i];
            f.life -= dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            if (f.life <= 0)
                this.particles.splice(i, 1);
        }
        for (let i = this.floaters.length - 1; i >= 0; i--) {
            const f = this.floaters[i];
            f.life -= dt;
            f.y -= 25 * dt;
            if (f.life <= 0)
                this.floaters.splice(i, 1);
        }
        if (this.status === 'playing' && this.time >= 600 && this.bossKilled)
            this.status = 'won';
        if (this.status === 'playing' && this.time >= 660) {
            this.lastDamageCause = 'timeout';
            this.status = 'lost';
        }
    }
    end() { if (this.status === 'playing') {
        this.lastDamageCause = 'abandon';
        this.status = 'lost';
    } }
    result() { return { id: this.id, sector: this.sector, time: this.time, kills: this.kills, won: this.status === 'won', earned: this.stress ? 0 : reward(this.time, this.kills, this.bonus, this.status === 'won'), evolutions: this.evolutions }; }
    setLoadout(weapons, passives) { this.weapons = weapons.slice(0, 6).map(id => ({ id, level: 5, evolved: false, timer: 0 })); this.passives = { ...passives }; this.player.maxHp = this.attributes.maxHp; this.player.hp = this.player.maxHp; }
}

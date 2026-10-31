import { addStack } from './meta-equipment.js';
import { rankCopy } from './i18n.js';
import { ECONOMY } from './economy.js';
export const SLOTS = ['weapon', 'helmet', 'suit', 'gloves', 'boots', 'pack'];
export const RANKS = rankCopy.map((r, n) => ({ ...r, max: (n + 1) * 10 }));
export const GEAR = [
    { id: 'pulse-kit', slot: 'weapon', ko: 'PULSE 탐사총', en: 'PULSE Kit', family: 'pulse', attack: .16, hp: 0, armor: 0, traits: ['linkedShot', 'bossDamage', 'linkedPower'], variant: 0 },
    { id: 'orbit-kit', slot: 'weapon', ko: 'ORBITER 조종기', en: 'ORBITER Rig', family: 'orbit', attack: .16, hp: 0, armor: 0, traits: ['linkedShot', 'bossDamage', 'linkedPower'], variant: 1 },
    { id: 'meteor-kit', slot: 'weapon', ko: 'METEOR 발사기', en: 'METEOR Launcher', family: 'missile', attack: .16, hp: 0, armor: 0, traits: ['linkedShot', 'bossDamage', 'linkedPower'], variant: 2 },
    { id: 'wave-kit', slot: 'weapon', ko: 'RESONANCE 진동기', en: 'RESONANCE Rig', family: 'nova', attack: .16, hp: 0, armor: 0, traits: ['linkedShot', 'bossDamage', 'linkedPower'], variant: 3 },
    { id: 'survey-helmet', slot: 'helmet', ko: '관측 헬멧', en: 'Survey Helmet', attack: 0, hp: 12, armor: .3, traits: ['magnet', 'xp', 'lastShield'], variant: 0 },
    { id: 'rescue-helmet', slot: 'helmet', ko: '구조 헬멧', en: 'Rescue Helmet', attack: 0, hp: 12, armor: .3, traits: ['regen', 'bossDamage', 'rescue'], variant: 1 },
    { id: 'patch-suit', slot: 'suit', ko: '덧댄 우주복', en: 'Patch Suit', attack: 0, hp: 20, armor: .5, traits: ['armor', 'regen', 'rescue'], variant: 0 },
    { id: 'field-suit', slot: 'suit', ko: '야외 우주복', en: 'Field Suit', attack: 0, hp: 20, armor: .5, traits: ['lowSpeed', 'area', 'lastShield'], variant: 1 },
    { id: 'work-gloves', slot: 'gloves', ko: '작업 장갑', en: 'Work Gloves', attack: .025, hp: 8, armor: .2, traits: ['bossDamage', 'cooldown', 'killHeal'], variant: 0 },
    { id: 'sample-gloves', slot: 'gloves', ko: '표본 장갑', en: 'Sample Gloves', attack: .025, hp: 8, armor: .2, traits: ['xp', 'magnet', 'linkedPower'], variant: 1 },
    { id: 'moon-boots', slot: 'boots', ko: '달걸음 부츠', en: 'Moon Boots', attack: 0, hp: 10, armor: .2, traits: ['lowSpeed', 'dashHaste', 'lastShield'], variant: 0 },
    { id: 'anchor-boots', slot: 'boots', ko: '고정 부츠', en: 'Anchor Boots', attack: 0, hp: 10, armor: .2, traits: ['armor', 'regen', 'rescue'], variant: 1 },
    { id: 'supply-pack', slot: 'pack', ko: '보급 배낭', en: 'Supply Pack', attack: 0, hp: 14, armor: .3, traits: ['magnet', 'killHeal', 'rescue'], variant: 0 },
    { id: 'field-pack', slot: 'pack', ko: 'HARVEST 배낭', en: 'Harvest Pack', attack: 0, hp: 14, armor: .3, traits: ['area', 'cooldown', 'linkedPower'], variant: 2 },
    { id: 'signal-pack', slot: 'pack', ko: '신호 배낭', en: 'Signal Pack', attack: 0, hp: 14, armor: .3, traits: ['area', 'cooldown', 'linkedPower'], variant: 1 },
];
export const slotRecord = (value = 0) => Object.fromEntries(SLOTS.map(s => [s, value]));
export const gearDef = (item) => GEAR.find(d => d.id === item.def);
export const gearName = (item, lang) => gearDef(item)[lang];
export function emptyEquipment() {
    const items = SLOTS.map((slot, i) => ({ uid: i + 1, def: GEAR.find(d => d.slot === slot).id, rank: 0, level: 1 }));
    return { gold: 0, gems: 0, blueprints: slotRecord(), items, equipped: Object.fromEntries(SLOTS.map((s, i) => [s, i + 1])), nextId: 7, pityRare: 0, pityEpic: 0, pulls: 0, qualifiedRuns: 0, cleared: [], achievements: [], lastLoot: null };
}
const obj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v) ? v : {};
const integer = (v, max = 1e9) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
export function parseEquipment(raw, maxRank = 5) {
    const d = obj(raw), s = emptyEquipment();
    s.gold = integer(d.gold);
    s.gems = integer(d.gems);
    s.pityRare = integer(d.pityRare, ECONOMY.rarePity - 1);
    s.pityEpic = integer(d.pityEpic, ECONOMY.epicPity - 1);
    s.pulls = integer(d.pulls);
    s.qualifiedRuns = integer(d.qualifiedRuns);
    const bp = obj(d.blueprints);
    for (const slot of SLOTS)
        s.blueprints[slot] = integer(bp[slot]);
    const seen = new Set();
    s.items = [];
    if (Array.isArray(d.items))
        for (const rawItem of d.items.slice(0, 1000)) {
            const i = obj(rawItem), def = GEAR.find(x => x.id === i.def), uid = integer(i.uid), rank = integer(i.rank, maxRank);
            if (!def || !uid || seen.has(uid))
                continue;
            seen.add(uid);
            s.items.push({ uid, def: def.id, rank, level: Math.max(1, integer(i.level, RANKS[rank].max)), ...(typeof i.locked === 'boolean' ? { locked: i.locked } : {}), ...(typeof i.seen === 'boolean' ? { seen: i.seen } : {}) });
        }
    s.nextId = Math.max(integer(d.nextId), 1, ...s.items.map(i => i.uid + 1));
    s.equipped = {};
    const equipped = obj(d.equipped);
    for (const slot of SLOTS)
        if (s.items.some(i => i.uid === equipped[slot] && gearDef(i).slot === slot))
            s.equipped[slot] = equipped[slot];
    if (Array.isArray(d.cleared))
        s.cleared = [...new Set(d.cleared.filter((x) => Number.isInteger(x) && x >= 0 && x < 8))];
    if (Array.isArray(d.achievements))
        s.achievements = d.achievements.filter((x) => ['first-win', 'five-runs', 'thousand-kills', 'first-evolution'].includes(String(x)));
    return s;
}
export const levelCost = (item) => ({ gold: ECONOMY.levelGold * item.level * (item.rank + 1), blueprints: 2 + Math.floor(item.level / 5) });
export function invested(item) { let gold = 0, blueprints = 0; for (let level = 1; level < item.level; level++) {
    const c = levelCost({ ...item, level });
    gold += c.gold;
    blueprints += c.blueprints;
} return { gold, blueprints }; }
export function equip(s, uid) { const item = s.items.find(i => i.uid === uid); if (!item)
    return s; const slot = gearDef(item).slot, equipped = { ...s.equipped }; if (equipped[slot] === uid)
    delete equipped[slot];
else
    equipped[slot] = uid; return { ...s, equipped }; }
export function upgrade(s, uid) { const item = s.items.find(i => i.uid === uid); if (!item || item.level >= RANKS[item.rank].max)
    return s; const c = levelCost(item), slot = gearDef(item).slot; if (s.gold < c.gold || s.blueprints[slot] < c.blueprints)
    return s; return { ...s, gold: s.gold - c.gold, blueprints: { ...s.blueprints, [slot]: s.blueprints[slot] - c.blueprints }, items: s.items.map(i => i.uid === uid ? { ...i, level: i.level + 1 } : i) }; }
export function fusionGroup(s, uid) {
    const base = s.items.find(i => i.uid === uid);
    if (!base || base.rank === 5)
        return [];
    const available = s.items.filter(i => i.uid !== uid && i.rank === base.rank && !Object.values(s.equipped).includes(i.uid));
    const same = available.filter(i => i.def === base.def).sort((a, b) => a.level - b.level || a.uid - b.uid);
    const filler = base.rank === 3 ? available.filter(i => i.def !== base.def && gearDef(i).slot === gearDef(base).slot).sort((a, b) => a.level - b.level || a.uid - b.uid) : [];
    const materials = same.length >= 2 ? same.slice(0, 2) : same.length === 1 && filler.length ? [same[0], filler[0]] : [];
    return materials.length === 2 ? [base, ...materials] : [];
}
export function fuse(s, uid) {
    const group = fusionGroup(s, uid);
    if (!group.length)
        return s;
    const [base, ...materials] = group, slot = gearDef(base).slot;
    const costs = materials.map(invested), gold = costs.reduce((n, c) => n + c.gold, 0), bp = costs.reduce((n, c) => n + c.blueprints, 0);
    return { ...s, gold: s.gold + gold, blueprints: { ...s.blueprints, [slot]: s.blueprints[slot] + bp }, items: s.items.filter(i => !materials.some(m => m.uid === i.uid)).map(i => i.uid === uid ? { ...i, rank: (i.rank + 1) } : i) };
}
export function fuseAll(s) { let next = s; for (let step = 0; step < 1000; step++) {
    const base = next.items.find(i => fusionGroup(next, i.uid).length);
    if (!base)
        return next;
    next = fuse(next, base.uid);
} return next; }
export function dismantle(s, uid) { const item = s.items.find(i => i.uid === uid); if (!item || Object.values(s.equipped).includes(uid))
    return s; const slot = gearDef(item).slot, c = invested(item); return { ...s, gold: s.gold + Math.floor(c.gold * ECONOMY.salvageFraction) + ECONOMY.salvageGold * (item.rank + 1), blueprints: { ...s.blueprints, [slot]: s.blueprints[slot] + Math.floor(c.blueprints * ECONOMY.salvageFraction) + ECONOMY.salvageBlueprints * (item.rank + 1) }, items: s.items.filter(i => i.uid !== uid) }; }
export function addItem(s, def, rank) { if (s.slotLevels)
    return addStack(s, def, rank); if (s.items.length >= 1000 || !GEAR.some(d => d.id === def))
    return s; return { ...s, nextId: s.nextId + 1, items: [...s.items, { uid: s.nextId, def, rank, level: 1 }] }; }
export function gearBonus(s) {
    const b = { attack: 0, hp: 0, armor: 0, traits: {} };
    for (const slot of SLOTS) {
        const item = s.items.find(i => i.uid === s.equipped[slot]);
        if (!item)
            continue;
        const d = gearDef(item), scale = (1 + item.rank * .8) * (1 + (item.level - 1) * .12);
        b.attack += d.attack * scale;
        b.hp += d.hp * scale;
        b.armor += d.armor * scale;
        if (d.family)
            b.family = d.family;
        if (item.rank === 5) {
            const trait = CHAOS_TRAITS[slot];
            b.traits[trait] = (b.traits[trait] ?? 0) + 1;
        }
        for (let n = 0; n < 3; n++)
            if (item.rank >= n + 2) {
                const trait = d.traits[n];
                b.traits[trait] = (b.traits[trait] ?? 0) + 1;
            }
    }
    return b;
}
export const CHAOS_TRAITS = { weapon: 'chaosWeapon', helmet: 'chaosHelmet', suit: 'chaosSuit', gloves: 'chaosGloves', boots: 'chaosBoots', pack: 'chaosPack' };

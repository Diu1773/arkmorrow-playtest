import { GEAR, SLOTS, RANKS, gearDef, gearBonus, invested, slotRecord } from './equipment.js';
export const stackCount = (item) => item.count ?? 1;
export const availableCopies = (s, item) => item.locked ? 0 : Math.max(0, stackCount(item) - Number(s.equipped[gearDef(item).slot] === item.uid));
export function projectLevels(s) {
    if (!s.slotLevels)
        return s;
    return { ...s, items: s.items.map(i => ({ ...i, level: Math.min(RANKS[i.rank].max, s.slotLevels[gearDef(i).slot]) })) };
}
export function migrateEquipment(s) {
    if (s.slotLevels)
        return { equipment: projectLevels(s), dust: 0 };
    const slotLevels = slotRecord(1), equipped = {}, items = [];
    let dust = s.gold, parts = SLOTS.reduce((n, k) => n + s.blueprints[k], 0);
    for (const slot of SLOTS) {
        const i = s.items.find(i => i.uid === s.equipped[slot]);
        if (i)
            slotLevels[slot] = i.level;
    }
    for (const item of s.items) {
        const worn = s.equipped[gearDef(item).slot] === item.uid;
        if (!worn) {
            const cost = invested(item);
            dust += cost.gold;
            parts += cost.blueprints;
        }
        let stack = items.find(i => i.def === item.def && i.rank === item.rank);
        if (!stack) {
            stack = { ...item, count: 1, locked: item.locked ?? item.rank >= 4, seen: item.seen ?? true };
            items.push(stack);
        }
        else {
            stack.count = stackCount(stack) + 1;
            stack.locked = stack.locked || item.locked === true;
            stack.seen = stack.seen && item.seen !== false;
        }
        if (worn)
            equipped[gearDef(item).slot] = stack.uid;
    }
    return { equipment: projectLevels({ ...s, gold: 0, blueprints: slotRecord(), parts, slotLevels, items, equipped }), dust };
}
export function addStack(s, def, rank, count = 1) {
    if (!GEAR.some(d => d.id === def) || !Number.isInteger(count) || count <= 0 || !Number.isInteger(rank) || rank < 0 || rank > 5)
        return s;
    const existing = s.items.find(i => i.def === def && i.rank === rank);
    return projectLevels({ ...s, nextId: existing ? s.nextId : s.nextId + 1, items: existing ? s.items.map(i => i.uid === existing.uid ? { ...i, count: Math.min(1e9, stackCount(i) + count), seen: false } : i) : [...s.items, { uid: s.nextId, def, rank, level: 1, count, locked: rank >= 4, seen: false }] });
}
export function equipStack(s, uid) {
    const item = s.items.find(i => i.uid === uid);
    if (!item)
        return s;
    return projectLevels({ ...s, equipped: { ...s.equipped, [gearDef(item).slot]: uid }, items: s.items.map(i => i.uid === uid ? { ...i, seen: true } : i) });
}
export const slotCost = (level) => ({ dust: 35 * level, parts: level >= 10 ? 2 + Math.floor(level / 5) : 0 });
export function upgradeSlot(save, uid) {
    const s = save.equipment, item = s.items.find(i => i.uid === uid);
    if (!item || !s.slotLevels)
        return save;
    const slot = gearDef(item).slot, level = s.slotLevels[slot], worn = s.items.find(i => i.uid === s.equipped[slot]), cap = RANKS[worn?.rank ?? item.rank].max, c = slotCost(level);
    if (level >= cap || save.shards < c.dust || (s.parts ?? 0) < c.parts)
        return save;
    return { ...save, shards: save.shards - c.dust, equipment: projectLevels({ ...s, parts: (s.parts ?? 0) - c.parts, slotLevels: { ...s.slotLevels, [slot]: level + 1 } }) };
}
export function equipmentPower(equipment) { const b = gearBonus(equipment); return Math.round(700 * Math.sqrt((1 + b.attack) * (1 + b.hp / 100 + b.armor * .04)) * (1 + Object.values(b.traits).reduce((n, x) => n + (x ?? 0) * .05, 0))); }
export const powerDelta = (s, uid) => equipmentPower(equipStack(s, uid)) - equipmentPower(s);
export function equipBest(s) {
    let next = s;
    for (const slot of SLOTS) {
        const choices = s.items.filter(i => gearDef(i).slot === slot);
        const best = choices.reduce((best, i) => !best || equipmentPower(equipStack(next, i.uid)) > equipmentPower(equipStack(next, best.uid)) ? i : best, s.items.find(i => i.uid === s.equipped[slot]));
        if (best)
            next = equipStack(next, best.uid);
    }
    return next;
}
const fingerprint = (s) => JSON.stringify([s.items, s.equipped, s.slotLevels, s.nextId]);
function applyFusion(s, base, count, sub, includeWorn = false) {
    const consume = 3 * count - (sub ? 1 : 0), worn = includeWorn && s.equipped[gearDef(base).slot] === base.uid;
    const items = s.items.map(i => ({ ...i, count: stackCount(i) - (i.uid === base.uid ? consume : i.uid === sub?.uid ? 1 : 0) })).filter(i => stackCount(i) > 0);
    let next = addStack({ ...s, items }, base.def, (base.rank + 1), count);
    if (worn) {
        const output = next.items.find(i => i.def === base.def && i.rank === base.rank + 1);
        next = { ...next, equipped: { ...next.equipped, [gearDef(base).slot]: output.uid } };
    }
    return projectLevels(next);
}
export function planFusion(s, max = 3, single, substitute = false) {
    const steps = [];
    let next = s;
    const append = (item, count, sub, includeWorn = false) => { const before = { ...item }, materials = [{ def: item.def, rank: item.rank, count: 3 * count - (sub ? 1 : 0) }, ...(sub ? [{ def: sub.def, rank: sub.rank, count: 1 }] : [])]; next = applyFusion(next, item, count, sub, includeWorn); const after = next.items.find(i => i.def === item.def && i.rank === item.rank + 1); steps.push({ def: item.def, from: item.rank, to: after.rank, count, uid: after.uid, materials, before, after: { ...after } }); };
    if (single !== undefined) {
        const item = next.items.find(i => i.uid === single);
        if (item && !item.locked && item.rank < 5) {
            const own = stackCount(item);
            let sub;
            if (substitute && item.rank === 3 && own >= 2)
                sub = next.items.find(i => i.uid !== item.uid && i.rank === 3 && gearDef(i).slot === gearDef(item).slot && availableCopies(next, i) >= 1);
            if (own >= 3 || sub)
                append(item, 1, sub, true);
        }
    }
    else
        for (let rank = 0; rank < max; rank++)
            for (const item of [...next.items].filter(i => i.rank === rank)) {
                const count = Math.floor(availableCopies(next, item) / 3);
                if (count)
                    append(item, count);
            }
    return { fingerprint: fingerprint(s), steps, equipment: next, beforePower: equipmentPower(s), afterPower: equipmentPower(next), protected: s.items.reduce((n, i) => n + (i.locked ? stackCount(i) : Number(s.equipped[gearDef(i).slot] === i.uid)), 0), max, single, substitute };
}
export function commitFusion(s, plan) {
    if (plan.fingerprint !== fingerprint(s) || !plan.steps.length)
        return s;
    return planFusion(s, plan.max, plan.single, plan.substitute).equipment;
}
export function setStackFlag(s, uid, flag, value) { return { ...s, items: s.items.map(i => i.uid === uid ? { ...i, [flag]: value } : i) }; }
export const effectiveLevel = (s, slot, rank) => Math.min(s.slotLevels?.[slot] ?? 1, RANKS[rank].max);

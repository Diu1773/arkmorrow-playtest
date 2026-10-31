import { parseEquipment, slotRecord, SLOTS } from './equipment.js';
import { migrateEquipment, projectLevels } from './meta-equipment.js';
import { emptyRooms, ROOMS } from './base-rooms.js';
import { META } from './data.js';
const object = (v) => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const num = (v, max = 1e9) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0;
export function parseStackEquipment(raw) {
    const data = object(raw), s = parseEquipment(raw), levels = object(data.slotLevels);
    s.slotLevels = slotRecord(1);
    for (const slot of SLOTS)
        s.slotLevels[slot] = Math.max(1, num(levels[slot], 60));
    s.parts = num(data.parts);
    s.gold = 0;
    s.blueprints = slotRecord();
    const original = Array.isArray(data.items) ? data.items.map(object) : [];
    s.items = s.items.slice(0, 90).flatMap(i => { const source = original.find(x => x.uid === i.uid), count = num(source?.count); return count ? [{ ...i, count, locked: typeof source?.locked === 'boolean' ? source.locked : i.rank >= 4, seen: source?.seen !== false }] : []; });
    const folded = [], equipped = {};
    for (const item of s.items) {
        let stack = folded.find(i => i.def === item.def && i.rank === item.rank);
        if (stack) {
            stack.count = Math.min(1e9, stack.count + item.count);
            stack.locked = stack.locked || item.locked;
            stack.seen = stack.seen && item.seen;
        }
        else {
            stack = { ...item };
            folded.push(stack);
        }
        for (const slot of SLOTS)
            if (s.equipped[slot] === item.uid)
                equipped[slot] = stack.uid;
    }
    s.items = folded;
    s.equipped = equipped;
    return projectLevels(s);
}
export function completeMetaMigration(save, data) {
    let next = { ...save, rooms: emptyRooms(), records: { ...save.records }, milestones: [], lastMetaLoot: null };
    if (data.version === 6) {
        next.migrationRefund = num(data.migrationRefund);
        next.equipment = parseStackEquipment(data.equipment);
        const records = object(data.records);
        for (const key of [...Array.from({ length: 8 }, (_, n) => String(n)), 'village']) {
            if (!(key in records))
                continue;
            const r = object(records[key]), clears = object(r.clears);
            next.records[key] = { stars: num(r.stars, 7), clears: {} };
            for (const d of ['easy', 'normal', 'hard']) {
                const count = num(clears[d]);
                if (count)
                    next.records[key].clears[d] = count;
            }
        }
        const rooms = object(data.rooms);
        for (const r of ROOMS) {
            const value = object(rooms[r.id]);
            next.rooms[r.id] = { restored: value.restored === true, productionAt: num(value.productionAt, 8640000000000000) };
        }
        if (Array.isArray(data.milestones))
            next.milestones = data.milestones.filter((s) => typeof s === 'string' && /^chapter-(?:[0-7]|village)-gold$/.test(s));
    }
    else {
        const migrated = migrateEquipment(save.equipment), refund = META.reduce((n, m) => n + m.cost * save.meta[m.id] * (save.meta[m.id] + 1) / 2, 0);
        next.equipment = migrated.equipment;
        next.shards += migrated.dust + refund;
        next.migrationRefund = refund;
        for (const key of [...save.equipment.cleared.map(String), ...save.specialCleared])
            next.records[key] = { stars: 3, clears: { normal: 1 } };
    }
    next.meta = Object.fromEntries(META.map(m => [m.id, 0]));
    return next;
}
export function serializeSave(save) { const { lastMetaLoot: _, ...data } = save; const { gold: __, blueprints: ___, lastLoot: ____, ...equipment } = save.equipment; return JSON.stringify({ ...data, equipment }); }

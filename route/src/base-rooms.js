import { totalStars } from './meta-progression.js';
export const ROOMS = [
    { id: 'workshop', ko: '공방', en: 'Workshop', chapter: 0, stars: 1, cost: 120, feature: 'batchFusion' },
    { id: 'infirmary', ko: '의무실', en: 'Infirmary', chapter: 0, stars: 0, cost: 180, feature: 'rescue' },
    { id: 'observatory', ko: '관측실', en: 'Observatory', chapter: 1, stars: 0, cost: 240, feature: 'bossPreview' },
    { id: 'cargo', ko: '화물칸', en: 'Cargo Bay', chapter: 1, stars: 4, cost: 320, feature: 'startChest' },
    { id: 'greenhouse', ko: '온실', en: 'Greenhouse', chapter: 1, stars: 6, cost: 400, feature: 'partsProduction' },
    { id: 'communications', ko: '통신실', en: 'Communications', chapter: 0, stars: 0, cost: 100, feature: 'archive' },
];
export const emptyRooms = () => Object.fromEntries(ROOMS.map(r => [r.id, { restored: false, productionAt: 0 }]));
export function canRestoreRoom(save, id) { const room = ROOMS.find(r => r.id === id); return !!room && !save.rooms[room.id].restored && save.shards >= room.cost && save.equipment.cleared.includes(room.chapter) && totalStars(save) >= room.stars; }
export function restoreRoom(save, id, now = Date.now()) { const room = ROOMS.find(r => r.id === id); if (!room || !canRestoreRoom(save, id) || !Number.isFinite(now) || now < 0)
    return save; return { ...save, shards: save.shards - room.cost, rooms: { ...save.rooms, [id]: { restored: true, productionAt: Math.floor(now) } } }; }
export function roomFeatures(save) { return { batchFusion: save.rooms.workshop.restored, rescue: save.rooms.infirmary.restored ? .5 : 0, bossPreview: save.rooms.observatory.restored, startChest: save.rooms.cargo.restored, partsProduction: save.rooms.greenhouse.restored, archive: save.rooms.communications.restored }; }
export const producedParts = (save, now = Date.now()) => save.rooms.greenhouse.restored ? Math.floor(Math.min(8 * 3600000, Math.max(0, now - save.rooms.greenhouse.productionAt)) / 600000) : 0;
export function collectParts(save, now = Date.now()) { if (!Number.isFinite(now) || now < 0)
    return save; const count = producedParts(save, now); if (!count)
    return save; const state = save.rooms.greenhouse, elapsed = Math.max(0, now - state.productionAt), productionAt = elapsed >= 8 * 3600000 ? Math.floor(now) : state.productionAt + count * 600000; return { ...save, equipment: { ...save.equipment, parts: (save.equipment.parts ?? 0) + count }, rooms: { ...save.rooms, greenhouse: { ...state, productionAt } } }; }
const preparedRuns = new WeakSet();
export function applyRoomFeatures(sim, save) { const f = roomFeatures(save); if (preparedRuns.has(sim))
    return f; preparedRuns.add(sim); sim.roomRescue = f.rescue; if (f.startChest)
    sim.queueChest(0); return f; }

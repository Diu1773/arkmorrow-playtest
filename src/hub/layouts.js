import { ROOMS } from '../base-rooms.js';
export const hubVariant = (search) => { const value = new URLSearchParams(search).get('hub'); return value === '0' || value === 'b' || value === 'c' ? value : 'a'; };
export const hubNames = { a: { ko: '방주 단면도', en: 'Ark cross-section' }, b: { ko: '회전 고리 복도', en: 'Rotating ring' }, c: { ko: '작은 조종실', en: 'Little bridge' } };
const station = (id, x, y, kind, ko, en) => ({ id, x, y, kind, ko, en });
const facilities = (points) => [
    station('capsule', points[0].x, points[0].y, 'capsule', '귀환 캡슐', 'Return capsule'),
    station('launch', points[1].x, points[1].y, 'launch', '출격 해치', 'Launch hatch'),
    station('equipment', points[2].x, points[2].y, 'equipment', '장비 보관함', 'Equipment locker'),
    station('research', points[3].x, points[3].y, 'research', '방 복구 단말', 'Room restoration'),
    station('practice', points[4].x, points[4].y, 'practice', '훈련칸', 'Training'),
    station('records', points[5].x, points[5].y, 'records', '기록 벽', 'Record wall'),
    station('window', points[6].x, points[6].y, 'window', '창가', 'Window'),
];
export function makeLayout(variant, portrait = false) {
    let w = 640, h = 288, spawn, crew, rooms, places, walkable;
    if (variant === 'a') {
        w = 752;
        h = 376;
        spawn = { x: 368, y: 352 };
        crew = { pip: { x: 104, y: 128 }, bolt: { x: 88, y: 240 }, mori: { x: 360, y: 240 }, mew: { x: 648, y: 240 } };
        const bounds = [[36, 42, 180, 86], [268, 56, 204, 72], [532, 32, 184, 96], [36, 162, 180, 78], [268, 146, 204, 94], [532, 158, 184, 82]];
        rooms = ROOMS.map((r, i) => { const [x, y, w, h] = bounds[i]; return { id: r.id, x, y, w, h, entry: { x: x + w / 2, y: i < 3 ? 128 : 240 } }; });
        places = facilities([{ x: 336, y: 352 }, { x: 440, y: 352 }, { x: 176, y: 352 }, { x: 584, y: 352 }, { x: 80, y: 352 }, { x: 680, y: 352 }, { x: 680, y: 128 }]);
        walkable = (x, y) => x >= 32 && x <= 720 && y >= 120 && y <= 360 && ([128, 240, 352].some(f => Math.abs(y - f) <= 8) || [240, 504].some(l => Math.abs(x - l) <= 8));
    }
    else if (variant === 'b') {
        w = 416;
        h = 304;
        const point = (angle) => ({ x: 208 + Math.cos(angle) * 160, y: 152 + Math.sin(angle) * 100 });
        spawn = point(Math.PI / 2);
        crew = { pip: point(-Math.PI / 2), bolt: point(2.6), mori: point(-.5), mew: point(.3) };
        rooms = ROOMS.map((r, i) => { const p = point(-Math.PI / 2 + i * Math.PI / 3); return { id: r.id, x: p.x - 28, y: p.y - 27, w: 56, h: 34, entry: p }; });
        places = facilities([spawn, point(1.15), point(2.2), point(-.9), point(3.15), point(.65), point(-2.05)]);
        walkable = (x, y) => Math.abs(Math.hypot((x - 208) / 160, (y - 152) / 100) - 1) <= .14;
    }
    else {
        w = portrait ? 192 : 384;
        h = 288;
        const right = w - 48, center = w / 2;
        spawn = { x: center, y: 232 };
        crew = { pip: { x: center, y: 160 }, bolt: { x: 48, y: 264 }, mori: { x: right, y: 264 }, mew: { x: 48, y: 200 } };
        rooms = ROOMS.map((r, i) => ({ id: r.id, x: i % 2 === 0 ? 16 : w - 72, y: 80 + Math.floor(i / 2) * 64, w: 56, h: 32, entry: { x: i % 2 === 0 ? 48 : right, y: 128 + Math.floor(i / 2) * 64 } }));
        places = facilities([spawn, { x: center, y: 112 }, { x: 48, y: 128 }, { x: right, y: 128 }, { x: 48, y: 240 }, { x: right, y: 192 }, { x: center, y: 88 }]);
        walkable = (x, y) => x >= 24 && x <= w - 24 && y >= 80 && y <= 272 && !rooms.some(r => x > r.x - 2 && x < r.x + r.w + 2 && y > r.y - 4 && y < r.y + r.h + 4);
    }
    places.push(...rooms.map(r => { const def = ROOMS.find(d => d.id === r.id); return station('room-' + r.id, r.entry.x, r.entry.y, 'research', def.ko, def.en); }));
    return { variant, w, h, spawn, places, crew, rooms, walkable };
}

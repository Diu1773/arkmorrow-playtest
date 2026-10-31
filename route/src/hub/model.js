import { CREW } from '../crew.js';
import { crewUnlocked } from '../chapters.js';
export const DECK = { w: 640, h: 400 };
export const places = [
    { id: 'window', kind: 'window', x: 320, y: 87, ko: '창가', en: 'Observation window' },
    { id: 'capsule', kind: 'capsule', x: 352, y: 262, ko: '귀환 캡슐', en: 'Return capsule' },
    { id: 'launch', kind: 'launch', x: 480, y: 337, ko: '출격 해치', en: 'Launch hatch' },
    { id: 'equipment', kind: 'equipment', x: 96, y: 256, ko: '장비 보관함', en: 'Equipment locker' },
    { id: 'research', kind: 'research', x: 544, y: 168, ko: '연구 단말', en: 'Research terminal' },
    { id: 'practice', kind: 'practice', x: 130, y: 338, ko: '연습 허수아비', en: 'Training dummy' },
    { id: 'records', kind: 'records', x: 552, y: 266, ko: '기록 벽', en: 'Record wall' },
];
export const crewSpots = { pip: { x: 270, y: 104 }, bolt: { x: 142, y: 162 }, mori: { x: 484, y: 163 }, mew: { x: 298, y: 206 } };
export const furniture = [{ x: 52, y: 117, w: 64, h: 24 }, { x: 258, y: 148, w: 116, h: 33 }, { x: 518, y: 113, w: 62, h: 32 }, { x: 61, y: 205, w: 46, h: 30 }, { x: 331, y: 210, w: 42, h: 28 }, { x: 527, y: 211, w: 51, h: 26 }, { x: 105, y: 300, w: 45, h: 16 }];
export function walkable(x, y) { return x >= 40 && x <= 600 && y >= 84 && y <= 365 && !furniture.some(r => x > r.x - 9 && x < r.x + r.w + 9 && y > r.y - 9 && y < r.y + r.h + 9); }
export function pathTo(from, to) {
    const cell = 16, key = (x, y) => y * 40 + x, start = { x: Math.floor(from.x / cell), y: Math.floor(from.y / cell) }, queue = [start], parents = new Map();
    parents.set(key(start.x, start.y), -1);
    let best = start, bestDistance = Infinity;
    for (let i = 0; i < queue.length; i++) {
        const p = queue[i], d = Math.hypot(p.x * cell + 8 - to.x, p.y * cell + 8 - to.y);
        if (d < bestDistance) {
            best = p;
            bestDistance = d;
        }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const x = p.x + dx, y = p.y + dy, k = key(x, y);
            if (parents.has(k) || !walkable(x * cell + 8, y * cell + 8))
                continue;
            parents.set(k, key(p.x, p.y));
            queue.push({ x, y });
        }
    }
    const route = [];
    let k = key(best.x, best.y);
    while (parents.get(k) !== -1) {
        route.unshift({ x: k % 40 * cell + 8, y: Math.floor(k / 40) * cell + 8 });
        k = parents.get(k);
    }
    return route;
}
export class DeckState {
    x = 320;
    y = 106;
    vx = 0;
    vy = 0;
    direction = 0;
    walking = 0;
    route = [];
    arrive = '';
    crew;
    constructor(crew) { this.crew = crew; }
    returnToCapsule() { this.x = 352; this.y = 265; this.stop(); }
    stop() { this.vx = this.vy = 0; this.route = []; this.arrive = ''; }
    walkTo(point, id = '') { this.route = pathTo(this, point); this.arrive = id; }
    actors() { return CREW.filter(c => c.id !== this.crew).map(c => ({ ...crewSpots[c.id], id: c.id, kind: 'crew', ko: c.name, en: c.name })); }
    nearby() { return [...places, ...this.actors()].filter(p => Math.hypot(p.x - this.x, p.y - this.y) < 48).sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y))[0]; }
    switchCrew(id, cleared) { if (!crewUnlocked(id, cleared))
        return false; this.crew = id; return true; }
    step(dt, input, weighted) {
        let { x, y } = input;
        if (x || y) {
            this.route = [];
            this.arrive = '';
        }
        else if (this.route.length) {
            const p = this.route[0], d = Math.hypot(p.x - this.x, p.y - this.y);
            if (d < 4)
                this.route.shift();
            else {
                x = (p.x - this.x) / d;
                y = (p.y - this.y) / d;
            }
        }
        const length = Math.hypot(x, y);
        if (length > 1) {
            x /= length;
            y /= length;
        }
        const speed = CREW.find(c => c.id === this.crew).speed * .57, k = weighted ? 1 - Math.exp(-18 * dt) : 1;
        this.vx += (x * speed - this.vx) * k;
        this.vy += (y * speed - this.vy) * k;
        const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt;
        if (walkable(nx, this.y))
            this.x = nx;
        else
            this.vx = 0;
        if (walkable(this.x, ny))
            this.y = ny;
        else
            this.vy = 0;
        if (Math.hypot(this.vx, this.vy) > 4) {
            this.walking += dt * 8;
            this.direction = Math.abs(this.vx) > Math.abs(this.vy) ? this.vx < 0 ? 1 : 3 : this.vy < 0 ? 2 : 0;
        }
        else
            this.walking = 0;
        if (!this.route.length && this.arrive) {
            const id = this.arrive;
            this.arrive = '';
            return id;
        }
        return '';
    }
}

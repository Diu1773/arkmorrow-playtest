import { crewFrame, foeFrame, floorTile, structureFrame } from './field-art.js';
import { LOCAL_ENEMIES } from './chapters.js';
import { TrialScene } from './scenes.js';
import { drawScene } from './scene-art.js';
export const EARTH_PALETTE = ['#202535', '#34354b', '#4a4b61', '#657182', '#91a2a3', '#c6c8ac', '#e1d8b5', '#a68d68', '#806b56', '#655244', '#4f494b', '#b19c77', '#49634d', '#607751', '#7f925e', '#a2a96b', '#3b5150', '#526a68', '#75918a', '#a8c0ae', '#83646a', '#a27d70', '#c1977a', '#d6b68d', '#79534e', '#a46150', '#ce885b', '#e4b56c', '#426075', '#648798', '#8ca5af', '#c4c8b7'];
const cache = new Map();
const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function block(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function disk(c, x, y, r, color, flat = 1) { c.fillStyle = color; for (let dy = -Math.ceil(r * flat); dy <= r * flat; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - (dy / flat) ** 2)));
    c.fillRect(Math.round(x) - dx, Math.round(y + dy), dx * 2 + 1, 1);
} }
export const groundCrew = crewFrame;
export function earthEnemy(id, phase = 0, flash = false) {
    if (!id.includes('mini') && !['launch', 'atmosphere', 'village'].includes(id))
        return foeFrame(id, phase % 2, flash);
    const key = 'enemy:' + id + phase + flash;
    if (cache.has(key))
        return cache.get(key);
    const base = id.split('-mini-')[0], boss = ['launch', 'atmosphere', 'village'].includes(base), ca = canvas(boss ? 64 : 32), c = ca.getContext('2d');
    const tint = id === 'atmosphere' ? '#8ca5af' : id === 'village' ? '#7f925e' : '#a68d68';
    if (!boss)
        return foeFrame(id, phase % 2, flash);
    else if (id.includes('-mini-')) {
        const second = id.endsWith('1');
        if (base === 'launch') {
            block(c, 12, 23, 40, 27, '#34354b');
            block(c, 16, 22, 32, 23, second ? '#806b56' : '#657182');
            block(c, 18, 22, 28, 4, '#b19c77');
            for (const x of [9, 47])
                for (const y of [28, 44])
                    block(c, x, y, 8, 8, '#4a4b61');
            if (second) {
                disk(c, 32, 26, 15, '#806b56', .7);
                block(c, 26, 21, 12, 6, '#a46150');
            }
            else {
                block(c, 27, 5, 10, 28, '#91a2a3');
                block(c, 25, 6, 14, 4, '#e1d8b5');
            }
        }
        if (base === 'atmosphere') {
            if (second) {
                disk(c, 32, 25, 22, '#34354b');
                disk(c, 30, 23, 18, '#75918a');
                block(c, 30, 44, 4, 12, '#b19c77');
                block(c, 23, 51, 18, 8, '#657182');
            }
            else {
                for (let i = 0; i < 8; i++) {
                    block(c, 6 + i * 6, 18 + Math.abs(i - 4) * 3, 8, 8, '#648798');
                }
                block(c, 27, 12, 10, 39, '#91a2a3');
            }
            block(c, 24, 24, 5, 5, '#e4b56c');
            block(c, 36, 24, 5, 5, '#e4b56c');
        }
        if (base === 'village') {
            if (second) {
                for (let i = 0; i < 4; i++)
                    disk(c, 12 + i * 11, 39 - Math.sin(i) * 10, 9, '#49634d');
                disk(c, 48, 25, 13, '#806b56');
                block(c, 44, 23, 4, 4, '#e4b56c');
            }
            else {
                block(c, 29, 10, 6, 49, '#806b56');
                block(c, 7, 28, 50, 6, '#a68d68');
                block(c, 16, 11, 32, 6, '#b19c77');
                block(c, 23, 17, 18, 21, '#607751');
                block(c, 24, 23, 4, 4, '#e4b56c');
                block(c, 36, 23, 4, 4, '#e4b56c');
            }
        }
    }
    else if (id === 'launch') {
        block(c, 5, 20, 54, 32, '#34354b');
        for (const x of [5, 47]) {
            block(c, x, 14, 12, 42, '#4a4b61');
            for (let y = 16; y < 55; y += 6)
                block(c, x + 2, y, 8, 3, '#202535');
        }
        block(c, 15, 18, 34, 30, tint);
        block(c, 17, 19, 30, 4, '#d6b68d');
        block(c, 22, 12, 22, 20, '#657182');
        block(c, 29, 2, 6, 25, '#91a2a3');
        block(c, 29, 2, 6, 3, '#e1d8b5');
        block(c, 24, 27, 16, 5, '#79534e');
        block(c, 25, 28, 4, 2, '#e4b56c');
        block(c, 36, 28, 4, 2, '#e4b56c');
    }
    else if (id === 'atmosphere') {
        for (let arm = 0; arm < 5; arm++)
            for (let i = 0; i < 30; i++) {
                const a = arm * Math.PI * 2 / 5 + i * .15, r = 29 - i * .65;
                disk(c, 32 + Math.cos(a) * r, 32 + Math.sin(a) * r, 3, i % 3 ? '#648798' : '#c4c8b7');
            }
        disk(c, 32, 32, 13, '#34354b');
        disk(c, 32, 32, 8, '#c4c8b7');
        disk(c, 32, 32, 4, '#79534e');
    }
    else {
        for (const x of [10, 48]) {
            block(c, x, 31, 8, 25, '#34354b');
            block(c, x - 3, 50, 13, 5, '#806b56');
        }
        disk(c, 32, 31, 23, '#34354b');
        disk(c, 32, 28, 21, '#607751');
        for (let i = 0; i < 7; i++)
            block(c, 13 + i * 6, 9 + Math.abs(i - 3) * 2, 4, 8, '#a68d68');
        block(c, 18, 25, 8, 6, '#e4b56c');
        block(c, 38, 25, 8, 6, '#e4b56c');
        block(c, 22, 40, 20, 6, '#34354b');
        for (let i = 0; i < 4; i++)
            block(c, 24 + i * 4, 40, 2, 4, '#e1d8b5');
    }
    if (phase > 0) {
        block(c, boss ? 28 : 10, boss ? 34 : 15, boss ? 8 : 3, 2, '#a46150');
        if (phase > 1)
            block(c, boss ? 34 : 15, boss ? 35 : 17, 2, boss ? 12 : 5, '#202535');
    }
    if (flash) {
        c.globalCompositeOperation = 'source-in';
        block(c, 0, 0, ca.width, ca.height, '#fff4dc');
    }
    cache.set(key, ca);
    return ca;
}
export function drawEarth(c, s, w, h, cx, cy, u, t, low = false) {
    const id = s.chapter.id, X = (x) => Math.round(w / 2 + (x - cx) * u), Y = (y) => Math.round(h / 2 + (y - cy) * u);
    if (id === 'atmosphere') {
        const stage = Math.min(5, Math.floor(s.time / 110));
        block(c, 0, 0, w, h, ['#648798', '#426075', '#31475f', '#253449', '#192438', '#101725'][stage]);
        for (let i = 0; i < (low ? 12 : 25); i++) {
            const x = (i * 157 - Math.floor(cx * .015)) % (w + 120), y = (i * 79 - t * 9 * (1 + i % 3 * .2) + h * 100) % (h + 60) - 30;
            for (let j = 0; j < 4; j++)
                block(c, x + j * 7, y - j % 2 * 3, 58 - j * 9, 5, stage < 2 ? '#91a2a3' : '#4a4b61');
        }
        for (const ter of s.terrain) {
            const x = X(ter.x), y = Y(ter.y), r = Math.round(ter.r * u);
            if (ter.kind === 'thunder') {
                disk(c, x, y, r, '#34354b', .55);
                disk(c, x - r * .3, y - r * .2, r * .5, '#4a4b61', .5);
                if (s.time % 9 > 7.8)
                    block(c, x - 1, y - r * .3, 2, r * .7, '#c4c8b7');
            }
            if (ter.kind === 'jetstream') {
                c.globalAlpha = .35;
                for (let i = 0; i < 5; i++) {
                    const off = (t * 35 + i * r * .4) % (r * 2) - r;
                    block(c, x + off * .6, y - off, 2, 12, '#91a2a3');
                    block(c, x + off * .6 + 3, y - off - 5, 2, 7, '#91a2a3');
                }
                c.globalAlpha = 1;
            }
        }
        if (s.time > 420) {
            c.globalAlpha = .10;
            block(c, 0, 0, 6, h, '#ce885b');
            block(c, w - 6, 0, 6, h, '#ce885b');
            c.globalAlpha = 1;
        }
        if (s.bossKilled) {
            disk(c, w / 2, h + w, w + 10, '#648798');
            disk(c, w / 2, h + w + 7, w + 10, '#3b5150');
        }
        return;
    }
    const size = Math.max(32, Math.round(144 * u)), ox = X(0) % size, oy = Y(0) % size;
    for (let y = -size; y < h + size; y += size)
        for (let x = -size; x < w + size; x += size) {
            const tx = Math.floor((cx + (x - w / 2) / u) / 48), ty = Math.floor((cy + (y - h / 2) / u) / 48), v = Math.abs(tx * 13 + ty * 7) % 4;
            c.drawImage(floorTile(id, v), x + ox, y + oy, size, size);
        }
    if (id === 'launch') {
        block(c, X(2260), 0, Math.round(280 * u), h, '#252d3d');
        for (let y = Y(0) % Math.max(6, Math.round(110 * u)); y < h; y += Math.max(6, Math.round(110 * u)))
            block(c, X(2395), y, Math.max(2, Math.round(10 * u)), Math.round(50 * u), '#4b5e70');
    }
    for (const ter of s.terrain) {
        const x = X(ter.x), y = Y(ter.y), r = Math.round(ter.r * u);
        if (x + r < 0 || y + r < 0 || x - r > w || y - r > h)
            continue;
        const color = ter.kind === 'field' ? '#343b32' : ter.kind === 'puddle' ? '#173b42' : '#302b32';
        disk(c, x, y, r, color, .6);
        for (let i = 0; i < 36; i++) {
            const a = i / 36 * Math.PI * 2, rr = r + (i % 3 - 1) * 3;
            block(c, x + Math.cos(a) * rr, y + Math.sin(a) * rr * .6, 2, 2, color);
        }
        if (ter.kind === 'field') {
            for (let i = -r; i < r; i += 7)
                block(c, x - r, y + i * .55, r * 2, 2, '#655244');
            for (let i = 0; i < (low ? 8 : 32); i++) {
                const gx = ter.x + Math.cos(i * 2.4) * ter.r * .8 * (i % 5 + 1) / 5, gy = ter.y + Math.sin(i * 2.4) * ter.r * .5 * (i % 5 + 1) / 5, bent = s.traces.some(tr => tr.age < 1.5 && Math.hypot(tr.x - gx, tr.y - gy) < 50), burn = s.traces.some(tr => tr.kind === 'scorch' && Math.hypot(tr.x - gx, tr.y - gy) < 100);
                block(c, X(gx), Y(gy), bent ? 5 : 2, bent ? 1 : 4, burn ? '#4f494b' : '#607751');
            }
        }
    }
    for (const tr of (low ? s.traces.slice(-45) : s.traces)) {
        c.globalAlpha = Math.max(0, 1 - tr.age / tr.life) * .5;
        const x = X(tr.x), y = Y(tr.y);
        if (tr.kind === 'light')
            disk(c, x, y, 55 * u, '#e4b56c', .65);
        else if (tr.kind === 'water')
            disk(c, x, y, 3 + tr.age * 10, '#a8c0ae', .3);
        else if (tr.kind === 'scorch')
            disk(c, x, y, 20 * u, '#34354b', .4);
        else if (tr.kind === 'debris') {
            block(c, x, y, 4, 2, '#a27d70');
            block(c, x + 5, y + 2, 2, 2, '#657182');
        }
        else {
            block(c, x - 2, y, 2, 3, tr.kind === 'grass' ? '#a2a96b' : '#34354b');
            block(c, x + 2, y + 2, 2, 3, '#34354b');
        }
    }
    c.globalAlpha = 1;
    if (!low)
        for (let i = 0; i < 45; i++) {
            const x = (i * 157 + Math.floor(t * 5) - cx * .02 + w * 100) % w, y = (i * 73 + Math.sin(t + i) * 3 - cy * .02 + h * 100) % h;
            block(c, x, y, 2, 1, id === 'village' ? '#7f925e' : '#a68d68');
        }
}
export function drawProps(c, s, X, Y, u, t) {
    for (const o of s.props) {
        const x = X(o.x) + Math.round(Math.sin(t * 37) * o.shake * 2), y = Y(o.y), r = Math.max(4, Math.round(o.r * u));
        if (x + r < 0 || y + r < 0 || x - r > c.canvas.width || y - r * 3 > c.canvas.height)
            continue;
        if (o.w !== undefined) {
            if (!o.broken)
                c.drawImage(structureFrame(o.kind, s.chapter?.id), X(o.x - o.w / 2), Y(o.y - o.h / 2), Math.ceil(o.w * u), Math.ceil(o.h * u));
            continue;
        }
        if (['barrel', 'cover', 'pad', 'turret', 'station', 'rock', 'cloud', 'launchpad'].includes(o.kind)) {
            if (!o.broken) {
                c.drawImage(structureFrame(o.kind, s.chapter?.id), x - r, y - r, r * 2, r * 2);
                if (o.kind === 'pad' && o.cooldown > 0) {
                    c.globalAlpha = .65;
                    disk(c, x, y, r * .75, '#252d3d', .8);
                    c.globalAlpha = 1;
                }
            }
            else
                block(c, x - r / 2, y - r / 3, r, 4, '#4f494b');
            continue;
        }
        disk(c, x + 3, y + 3, r, '#34354b', .35);
        if (o.broken) {
            block(c, x - r, y - 3, r * 2, 5, '#4f494b');
            block(c, x, y - 6, 5, 5, '#657182');
            continue;
        }
        if (['tree', 'house', 'hangar'].includes(o.kind) && Math.abs(s.player.x - o.x) < o.r + 30 && s.player.y < o.y + 35 && s.player.y > o.y - o.r * 3)
            c.globalAlpha = .42;
        if (o.kind === 'tree') {
            block(c, x - 3, y - r, 6, r, '#806b56');
            disk(c, x, y - r * 1.8, r, '#34354b', 1.1);
            disk(c, x - 2, y - r * 1.9, r * .88, '#49634d', 1.1);
            disk(c, x - 5, y - r * 2.1, r * .62, '#607751');
        }
        else if (o.kind === 'house' || o.kind === 'hangar') {
            block(c, x - r, y - r * 1.6, r * 2, r * 1.6, '#252d3d');
            block(c, x - r - 4, y - r * 2.1, r * 2 + 8, r * .65, o.kind === 'house' ? '#473257' : '#354256');
            block(c, x - r, y - r * 2.1, r * 2, 3, '#4b5e70');
            block(c, x - 4, y - r * .6, 8, r * .6, '#34354b');
            for (const d of [-.6, .5])
                block(c, x + r * d, y - r * 1.2, 6, 7, '#e4b56c');
        }
        else if (o.kind === 'well') {
            disk(c, x, y - 3, r, '#91a2a3', .6);
            disk(c, x, y - 3, r * .6, o.cooldown ? '#34354b' : '#648798', .6);
        }
        else if (o.kind === 'fence') {
            for (const d of [-r, r])
                block(c, x + d, y - r, 4, r, '#806b56');
            block(c, x - r, y - r * .6, r * 2, 3, '#b19c77');
        }
        else if (o.kind === 'vent') {
            block(c, x - r, y - r * .3, r * 2, r * .6, '#34354b');
            for (let j = 0; j < 5; j++)
                block(c, x - r + j * r * .4, y - r * .3, 2, r * .6, '#91a2a3');
            if (Math.floor(s.time) % 8 > 5) {
                c.globalAlpha = .2;
                disk(c, x, y, r * 1.5, '#ce885b', .4);
                c.globalAlpha = 1;
            }
            block(c, x - r, y - r, 3, 3, Math.floor(t * 3) % 2 ? '#ce885b' : '#79534e');
        }
        else {
            block(c, x - r, y - r * 1.4, r * 2, r * 1.4, o.kind === 'car' ? '#657182' : '#806b56');
            block(c, x - r + 2, y - r * 1.4, r * 2 - 4, 4, '#b19c77');
            block(c, x - 3, y - r, 6, 4, '#79534e');
        }
        c.globalAlpha = 1;
    }
}
export function drawMapTerrain(c, s, X, Y, u) {
    for (const t of s.terrain) {
        if (!['fuel', 'electric', 'ice', 'mist'].includes(t.kind))
            continue;
        const x = X(t.x), y = Y(t.y), r = Math.max(3, Math.round(t.r * u));
        if (x + r < 0 || y + r < 0 || x - r > c.canvas.width || y - r > c.canvas.height)
            continue;
        const lit = (t.litUntil ?? 0) > s.time, color = t.kind === 'fuel' ? (lit ? '#b85d38' : '#72513c') : t.kind === 'ice' ? '#548a9c' : t.kind === 'mist' ? '#57466d' : '#66634a';
        c.globalAlpha = .6;
        disk(c, x, y, r, color);
        c.globalAlpha = 1;
        for (let i = 0; i < 12; i++) {
            const a = i * 2.4, rr = r * (.25 + i % 4 * .17), px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
            if (t.kind === 'electric') {
                block(c, px, py, 2, 6, '#ddcb78');
                block(c, px - 2, py + 5, 4, 2, '#ddcb78');
            }
            else if (t.kind === 'ice') {
                block(c, px, py, 7, 1, '#a8dce2');
                block(c, px + 3, py - 3, 1, 7, '#a8dce2');
            }
            else if (lit) {
                block(c, px, py - Math.sin(s.time * 9 + i) * 3, 3, 7, '#e9a35b');
            }
            else
                block(c, px, py, 5, 2, t.kind === 'mist' ? '#9683aa' : '#a98356');
        }
    }
    for (const h of s.hazards) {
        if (!h.mapKind || h.age >= h.warning)
            continue;
        const x = X(h.x), y = Y(h.y), fall = (1 - h.age / h.warning) * 180 * u;
        if (h.mapKind === 'meteor') {
            block(c, x - fall * .4, y - fall, 6, 7, '#b6927d');
            block(c, x - fall * .4 - 4, y - fall - 12, 3, 12, '#dc9c62');
        }
        if (h.mapKind === 'lightning' && h.age > h.warning * .65) {
            block(c, x, y - 28, 2, 16, '#ded39c');
            block(c, x - 3, y - 13, 7, 2, '#ded39c');
        }
    }
}
export function drawEarthEnemy(c, s, e, x, y, size) {
    const local = !!LOCAL_ENEMIES[s.chapter?.id ?? ''];
    if (!local)
        return false;
    const id = e.type === 'boss' ? s.chapter.id + (e.role === 'final' ? '' : `-mini-${Math.abs(e.bossArt - 6) % 2}`) : e.type;
    const img = e.type === 'boss' ? earthEnemy(id, e.phase, e.flash > 0 || e.attackFlash > 0) : foeFrame(id, Math.floor(e.age * 7) % 2, e.flash > 0 || e.attackFlash > 0, e.elite);
    const sy = e.type === 'boss' ? Math.max(64, size) : img.height, sw = e.type === 'boss' ? sy : img.width, squash = e.warnTime > 0 ? .82 : 1;
    c.drawImage(img, Math.round(x - sw / 2), Math.round(y - sy / 2), sw, Math.round(sy * squash));
    return true;
}
let launch;
export function drawLaunch(c, s, w, h, low, reduced) {
    launch ??= new TrialScene('launch');
    launch.sim = s;
    launch.time = 12 + s.launchAge * 1.9;
    launch.takeoffAt = s.launchAge < .65 ? null : 12;
    launch.phase = s.launchAge < .65 ? 'ground' : s.launchAge < 1.3 ? 'ignite' : 'ascent';
    launch.ship = { x: s.player.x + Math.max(0, .65 - s.launchAge) * 160, y: s.player.y };
    drawScene(c, launch, w, h, low, reduced);
}

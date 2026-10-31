import { crewSprite } from '../crew.js';
import { crewUnlocked } from '../chapters.js';
import { ROOMS } from '../base-rooms.js';
import { speakers } from '../dialogue/data.js';
import { capsuleArt } from './options-art.js';
const ink = '#101722', steel = '#46566a', edge = '#83959a', amber = '#e2a65a', teal = '#71d6ce';
const colors = ['#e2a65a', '#a2d4c8', '#8faad7', '#bca984', '#88bd85', '#71d6ce'];
const rect = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function panel(c, x, y, w, h, color = steel) { rect(c, x - 2, y - 2, w + 4, h + 4, ink); rect(c, x, y, w, h, color); rect(c, x, y, w, 2, edge); rect(c, x + 2, y + h - 3, w - 4, 3, '#283647'); }
function ellipse(c, x, y, rx, ry, color) { for (let row = -Math.floor(ry); row <= ry; row++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry))));
    rect(c, x - half, y + row, half * 2 + 1, 1, color);
} }
function earth(c, time, returns) {
    const x = 620, y = 54, r = Math.max(12, 42 / (1 + time * .004 + returns * .1));
    ellipse(c, x, y, r + 2, r + 2, '#69968a');
    ellipse(c, x, y, r, r, '#315773');
    ellipse(c, x - 4, y - 4, r * .82, r * .82, '#477f94');
    for (let i = 0; i < 20; i++) {
        const a = i * 2.4, px = x + Math.cos(a) * r * .72, py = y + Math.sin(a) * r * .65;
        rect(c, px, py, 3 + i % 4, 2, i % 4 ? '#69968a' : '#e2a65a');
        if (i % 4 === 0)
            rect(c, px + 2, py - 3, 2, 3, '#b76245');
    }
}
export const boxesOverlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
export function arkNames(c, deck, states, cleared, lang, camera) {
    const l = deck.layout, size = 11, requests = [];
    for (const r of l.rooms) {
        const def = ROOMS.find(d => d.id === r.id);
        requests.push({ id: 'room-' + r.id, text: def[lang], x: r.x + r.w / 2, y: r.y + 8, color: states[r.id].restored ? colors[ROOMS.indexOf(def)] : '#d0d6d1', size });
    }
    for (const p of l.places.filter(p => !p.id.startsWith('room-') && p.id !== 'window'))
        requests.push({ id: p.id, text: p[lang], x: p.x, y: p.y + 36, color: p.id === 'launch' ? '#f3c686' : '#c4d2cf', size });
    for (const p of [...deck.actors(), { id: deck.crew, x: deck.x, y: deck.y }])
        requests.push({ id: 'crew-' + p.id, text: crewUnlocked(p.id, cleared) ? speakers[p.id].name : lang === 'ko' ? '수면 중' : 'STASIS', x: p.x, y: p.y + 14, color: p.id === deck.crew ? teal : '#c4d2cf', size });
    requests.sort((a, b) => Number(b.id === 'crew-' + deck.crew) - Number(a.id === 'crew-' + deck.crew));
    const bodies = [...deck.actors(), { x: deck.x, y: deck.y }].map(p => ({ x: p.x - camera.x - 14, y: p.y - camera.y - 27, w: 28, h: 35 }));
    const boxes = [];
    for (const r of requests) {
        const px = r.x - camera.x, py = r.y - camera.y;
        if (px < 0 || px > camera.w || py < -12 || py > camera.h + 12)
            continue;
        c.font = `${r.size}px Galmuri11,monospace`;
        const w = Math.ceil(c.measureText(r.text).width) + 10, h = r.size + 7;
        for (const dy of [0, -h - 3, h + 3, -2 * (h + 3), 2 * (h + 3)]) {
            const b = { ...r, x: Math.round(Math.max(4, Math.min(camera.w - w - 4, px - w / 2))), y: Math.round(Math.max(4, Math.min(camera.h - h - 4, py + dy))), w, h };
            if (!boxes.some(other => boxesOverlap({ ...b, x: b.x - 2, y: b.y - 2, w: b.w + 4, h: b.h + 4 }, other)) && !bodies.some(body => boxesOverlap(b, body))) {
                boxes.push(b);
                break;
            }
        }
    }
    return boxes;
}
function roomProps(c, r, on, color, time) {
    const x = r.x, y = r.y, w = r.w, b = y + r.h, screen = on ? color : '#182632';
    if (r.id === 'workshop') {
        panel(c, x + 14, y + 29, w - 28, 19, '#283647');
        for (let i = 0; i < 9; i++) {
            const px = x + 23 + i * 15;
            rect(c, px, y + 33, 2, 9, i % 2 ? edge : amber);
            rect(c, px - 2, y + 34, 6, 2, edge);
        }
        panel(c, x + 48, b - 30, 91, 11, '#695d50');
        for (const px of [x + 52, x + 130])
            rect(c, px, b - 19, 4, 16, steel);
        panel(c, x + 57, b - 46, 29, 15, '#34485a');
        rect(c, x + 61, b - 42, 21, 7, screen);
        rect(c, x + 105, b - 36, 20, 5, amber);
        rect(c, x + 119, b - 47, 4, 14, edge);
        if (on) {
            rect(c, x + 64 + Math.floor(time * 2) % 3 * 4, b - 39, 7, 2, teal);
            rect(c, x + 99, b - 42, 6, 5, edge);
        }
    }
    else if (r.id === 'infirmary') {
        panel(c, x + w - 44, y + 29, 27, r.h - 36, '#536572');
        for (let i = 0; i < 3; i++) {
            rect(c, x + w - 40, y + 34 + i * 10, 18, 2, edge);
            for (let j = 0; j < 3; j++)
                rect(c, x + w - 39 + j * 6, y + 30 + i * 10, 3, 4, on ? '#a2d4c8' : '#354a59');
        }
        panel(c, x + 20, b - 23, 83, 12, '#718b8d');
        rect(c, x + 24, b - 28, 20, 8, on ? '#d5e3cf' : '#536572');
        rect(c, x + 49, b - 25, 50, 9, on ? '#a2c7ba' : '#46566a');
        for (const px of [x + 24, x + 94])
            rect(c, px, b - 10, 3, 8, steel);
        panel(c, x + 114, b - 40, 24, 21);
        rect(c, x + 117, b - 37, 18, 12, screen);
        if (on)
            for (let i = 0; i < 6; i++)
                rect(c, x + 119 + i * 2, b - 32 - Math.round(Math.sin(time * 3 + i) * 3), 2, 1, teal);
    }
    else if (r.id === 'observatory') {
        const tx = x + w * .58, ty = b - 26, angle = on ? -.45 + Math.sin(time * .35) * .15 : -.2;
        rect(c, tx - 2, ty, 4, 24, edge);
        for (let i = 0; i < 16; i++) {
            rect(c, tx - i, ty + 9 + i, 2, 2, steel);
            rect(c, tx + i, ty + 9 + i, 2, 2, steel);
        }
        for (let i = 0; i < 31; i++)
            rect(c, tx - 16 + i, ty - 11 + Math.sin(angle) * i, 3, 10, '#718b8d');
        rect(c, tx + 13, ty - 11 + Math.sin(angle) * 30, 4, 11, screen);
        panel(c, x + 13, b - 25, 29, 18);
        rect(c, x + 17, b - 21, 21, 9, screen);
        if (on)
            rect(c, x + 20 + Math.floor(time) % 8, b - 18, 7, 1, '#d5e3cf');
    }
    else if (r.id === 'cargo') {
        rect(c, x + 13, y + 28, w - 26, 4, steel);
        const hook = x + 110 + (on ? Math.sin(time * .6) * 7 : 0);
        rect(c, hook, y + 32, 2, 17, edge);
        rect(c, hook - 3, y + 47, 5, 3, amber);
        for (let i = 0; i < 7; i++) {
            const px = x + 19 + i % 4 * 32, py = b - 23 - Math.floor(i / 4) * 20;
            panel(c, px, py, 28, 20, i % 2 ? '#695d50' : '#536572');
            rect(c, px + 12, py + 3, 3, 14, amber);
            rect(c, px + 3, py + 7, 7, 3, on ? color : '#354a59');
        }
    }
    else if (r.id === 'greenhouse') {
        rect(c, x + 12, y + 28, 4, r.h - 31, '#477f94');
        rect(c, x + 12, y + 28, w - 24, 3, '#477f94');
        for (let i = 0; i < 6; i++) {
            const px = x + 28 + i * 28, sway = on ? Math.round(Math.sin(time * 1.2 + i)) : 0;
            panel(c, px - 6, b - 16, 16, 11, '#695d50');
            rect(c, px + 1, b - 36, 2, 20, on ? '#69968a' : '#46566a');
            rect(c, px - 6 + sway, b - 34, 8, 4, on ? '#88bd85' : '#354a59');
            rect(c, px + 3 + sway, b - 40, 8, 5, on ? '#a2d4a1' : '#46566a');
            rect(c, px + 3, b - 29, 8, 4, on ? '#69968a' : '#354a59');
        }
        if (on)
            rect(c, x + w - 20, y + 31 + Math.floor(time * 8) % 12, 2, 3, teal);
    }
    else {
        for (let i = 0; i < 6; i++) {
            const px = x + 15 + i % 3 * 46, py = y + 31 + Math.floor(i / 3) * 20;
            panel(c, px, py, 41, 17, '#34485a');
            rect(c, px + 3, py + 3, 35, 10, screen);
            if (on)
                for (let j = 0; j < 4; j++)
                    rect(c, px + 6, py + 5 + j * 2, 9 + (i + j + Math.floor(time * 2)) % 4 * 5, 1, j % 2 ? teal : edge);
        }
        rect(c, x + w - 18, b - 33, 3, 29, edge);
        for (let i = 0; i < 3; i++)
            rect(c, x + w - 23 + i * 3, b - 34 - i * 3, 9 - i * 2, 2, on ? color : steel);
    }
}
function roomArt(c, r, index, deck, states, time, returns) {
    const on = states[r.id].restored, p = deck.roomLighting[r.id] ?? (on ? 1 : 0), color = colors[index], x = r.x, y = r.y, w = r.w, h = r.h;
    panel(c, x, y, w, h, on ? ['#3c3934', '#34494b', '#303c56', '#403d37', '#30473d', '#293f4c'][index] : '#19232e');
    for (let i = 0; i < 3; i++) {
        rect(c, x + 7 + i * (w - 18) / 3, y + 3, (w - 28) / 3, 3, on && p > (i + 1) * .2 ? color : '#35414d');
    }
    for (let i = 0; i < w - 12; i += 23) {
        rect(c, x + 6 + i, y + h - 7, 16, 2, on ? '#536572' : '#283647');
        if (index % 2 === 0)
            rect(c, x + 6 + i, y + 25, 2, h - 34, '#283647');
    }
    const wx = index === 2 ? x + 9 : x + w - 52, wy = y + 28, ww = index === 2 ? w - 18 : 40, wh = index === 2 ? 31 : 16;
    c.save();
    c.beginPath();
    c.rect(wx, wy, ww, wh);
    c.clip();
    rect(c, wx, wy, ww, wh, '#101c31');
    if (index === 2)
        earth(c, time, returns);
    for (let i = 0; i < 9; i++)
        rect(c, wx + (i * 23) % ww, wy + (i * 11) % wh, 1, 1, edge);
    c.restore();
    rect(c, wx - 2, wy - 2, ww + 4, 2, edge);
    rect(c, wx - 2, wy + wh, ww + 4, 2, steel);
    for (let i = 0; i < (index === 2 ? 3 : 1); i++)
        rect(c, wx + i * ww / 3, wy, 2, wh, steel);
    const raised = [0, 8, 4, 0, 6, 2][index];
    if (raised) {
        rect(c, x + 7, y + h - raised - 3, w - 14, raised, '#34485a');
        rect(c, x + 7, y + h - raised - 3, w - 14, 2, on ? color : steel);
    }
    roomProps(c, raised ? { ...r, h: h - raised } : r, on && p > .42, color, time);
    if (!on) {
        for (let i = 0; i < 5; i++) {
            rect(c, x + 18 + i * 29, y + h - 5 - i % 2 * 2, 5 + i % 3, 2, i % 2 ? '#695d50' : '#536572');
        }
        for (let i = 0; i < 8; i++)
            rect(c, wx + 5 + i * 3, wy + 3 + i % 4 * 2, 3, 1, ink);
        for (let i = 0; i < 13; i++)
            rect(c, x + w - 15 + Math.round(Math.sin(i * .55) * 3), y + 6 + i * 2, 2, 3, ink);
        if (Math.floor(time * 7 + index * 11) % 47 === 0) {
            rect(c, x + w - 17, y + 29, 2, 4, amber);
            rect(c, x + w - 20, y + 28, 8, 1, '#f3c686');
        }
        rect(c, x + 3, y + 25, w - 6, h - 28, '#10172260');
    }
    else {
        rect(c, x + 5, y + 7, w - 10, 2, color);
        if (p < 1) {
            rect(c, x + 3, y + 25, w - 6, h - 28, `rgba(16,23,34,${(1 - p) * .7})`);
            rect(c, x + 6, y + h - 4, Math.max(0, (w - 12) * p), 2, color);
        }
    }
    rect(c, x + w - 11, y + 14, 4, 4, on && p > .8 ? teal : amber);
}
function lowerDeck(c, deck, time, camera) {
    panel(c, 30, 278, 692, 80, '#293846');
    rect(c, 32, 345, 688, 10, '#3c5060');
    rect(c, 32, 345, 688, 2, edge);
    for (let x = 39; x < 715; x += 24) {
        rect(c, x, 351, 16, 2, '#61757f');
        rect(c, x, 356, 2, 2, ink);
    }
    for (const x of [28, 260, 528, 722]) {
        panel(c, x, 279, 5, 65);
        rect(c, x, 284, 5, 3, amber);
    }
    for (let x = 286; x < 492; x += 16)
        rect(c, x, 342, 9, 2, '#bca984');
    for (const p of deck.places.filter(p => !p.id.startsWith('room-') && p.id !== 'window')) {
        const { x, y, id } = p;
        if (x + 40 < camera.x || x - 40 > camera.x + camera.w || y + 8 < camera.y || y - 60 > camera.y + camera.h)
            continue;
        if (id === 'launch') {
            panel(c, x - 31, y - 55, 62, 58, '#536572');
            panel(c, x - 24, y - 48, 48, 46, '#1f2d3c');
            rect(c, x - 1, y - 45, 2, 39, '#83959a');
            rect(c, x - 18, y - 42, 13, 29, '#34485a');
            rect(c, x + 6, y - 42, 13, 29, '#34485a');
            for (let i = 0; i < 8; i++) {
                rect(c, x - 31 + i * 8, y - 56, 5, 4, i % 2 ? ink : amber);
                rect(c, x - 31 + i * 8, y + 2, 5, 4, i % 2 ? ink : amber);
            }
            rect(c, x - 26, y - 52, 52, 2, teal);
            rect(c, x - 21, y - 5, 42, 3, Math.floor(time * 1.5) % 3 ? '#a2d4c8' : teal);
            rect(c, x - 8, y - 34, 16, 2, '#d5e3cf');
            rect(c, x - 4, y - 38, 8, 2, '#d5e3cf');
        }
        else if (id === 'capsule') {
            capsuleArt(c, x, y - 2);
            rect(c, x - 17, y + 4, 34, 3, steel);
        }
        else if (id === 'equipment') {
            panel(c, x - 23, y - 39, 46, 41);
            for (let i = 0; i < 3; i++) {
                panel(c, x - 19 + i * 13, y - 34, 11, 32, '#283647');
                rect(c, x - 13 + i * 13, y - 21, 2, 5, amber);
            }
        }
        else if (id === 'research') {
            panel(c, x - 19, y - 35, 38, 30);
            rect(c, x - 15, y - 31, 30, 18, ink);
            for (let i = 0; i < 6; i++)
                rect(c, x - 12 + i * 4, y - 17 - i % 3 * 3, 2, 4 + i % 3 * 3, teal);
            rect(c, x - 11, y - 4, 22, 4, steel);
        }
        else if (id === 'records') {
            panel(c, x - 24, y - 43, 48, 44);
            for (let i = 0; i < 6; i++) {
                rect(c, x - 18 + i % 3 * 13, y - 36 + Math.floor(i / 3) * 17, 9, 11, i % 2 ? '#bca984' : '#a2c7ba');
                rect(c, x - 16 + i % 3 * 13, y - 33 + Math.floor(i / 3) * 17, 5, 2, steel);
            }
        }
        else {
            rect(c, x - 3, y - 29, 6, 30, '#957a5c');
            panel(c, x - 15, y - 31, 30, 17, '#9c8e70');
            rect(c, x - 22, y - 19, 44, 4, '#bca984');
            for (const px of [x - 8, x + 5])
                rect(c, px, y - 27, 3, 3, ink);
            rect(c, x - 18, y + 1, 36, 4, steel);
        }
    }
}
export function arkArt(canvas, deck, cleared, returns, time, lang, camera, states) {
    const c = canvas.getContext('2d'), l = deck.layout;
    c.imageSmoothingEnabled = false;
    rect(c, 0, 0, canvas.width, canvas.height, '#101c31');
    c.save();
    c.translate(-camera.x, -camera.y);
    for (let i = 0; i < 120; i++)
        rect(c, (i * 79 - time * .3 + l.w * 100) % l.w, (i * 47) % l.h, 1, 1, i % 9 ? '#40516f' : '#a2d4c8');
    earth(c, time, returns);
    panel(c, 24, 26, 704, 334, '#1f2d3c');
    for (const y of [128, 240]) {
        rect(c, 30, y + 5, 692, 9, steel);
        rect(c, 30, y + 5, 692, 2, edge);
        for (let x = 40; x < 715; x += 24)
            rect(c, x, y + 10, 12, 1, '#61757f');
    }
    lowerDeck(c, deck, time, camera);
    for (const x of [240, 504]) {
        rect(c, x - 15, 112, 30, 242, ink);
        rect(c, x - 13, 112, 3, 242, steel);
        rect(c, x + 11, 112, 3, 242, steel);
        rect(c, x - 8, 112, 2, 242, edge);
        rect(c, x + 7, 112, 2, 242, edge);
        for (let y = 118; y < 354; y += 8)
            rect(c, x - 8, y, 17, 2, '#bca984');
        for (const y of [128, 240, 352]) {
            rect(c, x - 17, y + 5, 7, 4, amber);
            rect(c, x + 11, y + 5, 7, 4, amber);
        }
    }
    for (let i = 0; i < l.rooms.length; i++) {
        const r = l.rooms[i];
        if (r.x + r.w + 3 >= camera.x && r.x - 3 <= camera.x + camera.w && r.y + r.h + 3 >= camera.y && r.y - 3 <= camera.y + camera.h)
            roomArt(c, r, i, deck, states, time, returns);
    }
    const people = [...deck.actors().map(a => ({ ...a, direction: 0, frame: 0 })), { id: deck.crew, x: deck.x, y: deck.y, direction: deck.direction, frame: deck.walking ? 1 + Math.floor(deck.walking) % 2 : 0 }];
    for (const p of people) {
        if (p.x + 20 < camera.x || p.x - 20 > camera.x + camera.w || p.y + 12 < camera.y || p.y - 30 > camera.y + camera.h)
            continue;
        if (!crewUnlocked(p.id, cleared)) {
            capsuleArt(c, p.x, p.y);
            continue;
        }
        rect(c, p.x - 9, p.y + 5, 18, 3, ink);
        c.drawImage(crewSprite(p.id, p.direction, p.frame), Math.round(p.x) - 18, Math.round(p.y) - 28, 36, 36);
        if (p.id === deck.crew)
            rect(c, p.x - 4, p.y + 8, 8, 2, teal);
    }
    c.restore();
    for (const b of arkNames(c, deck, states, cleared, lang, camera)) {
        rect(c, b.x, b.y, b.w, b.h, ink);
        rect(c, b.x, b.y, 2, b.h, b.color);
        c.font = `${b.size}px Galmuri11,monospace`;
        c.textAlign = 'left';
        c.textBaseline = 'top';
        c.fillStyle = b.color;
        c.fillText(b.text, b.x + 5, b.y + 3);
    }
    c.textBaseline = 'alphabetic';
}
export function overviewArt(canvas, deck, states) {
    const c = canvas.getContext('2d'), l = deck.layout;
    if (!l)
        return;
    c.imageSmoothingEnabled = false;
    rect(c, 0, 0, 128, 52, ink);
    const s = Math.min(120 / l.w, 44 / l.h), ox = (128 - l.w * s) / 2, oy = 3;
    for (const r of l.rooms)
        rect(c, ox + r.x * s, oy + r.y * s, Math.max(3, r.w * s), Math.max(3, r.h * s), states[r.id].restored ? teal : '#695d50');
    for (const p of l.places.filter(p => p.id === 'launch'))
        rect(c, ox + p.x * s - 1, oy + p.y * s - 1, 3, 3, amber);
    rect(c, ox + deck.x * s - 1, oy + deck.y * s - 1, 3, 3, '#e6f5df');
    rect(c, 2, 49, 124, 1, steel);
}

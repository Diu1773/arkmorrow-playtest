import { crewSprite } from '../crew.js';
import { crewUnlocked } from '../chapters.js';
import { ROOMS } from '../base-rooms.js';
import { speakers, deckDetails } from '../dialogue/data.js';
const ink = '#101722', hull = '#46566a', edge = '#83959a', dark = '#1f2d3c', light = '#a2d4c8', amber = '#e2a65a', teal = '#71d6ce';
const box = (c, x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function plate(c, x, y, w, h, color = hull) { box(c, x - 2, y - 2, w + 4, h + 4, ink); box(c, x, y, w, h, color); box(c, x, y, w, 2, edge); box(c, x + 2, y + h - 3, w - 4, 3, dark); }
function label(c, text, x, y, color = light, size = 7) { c.font = `${size}px Galmuri11,monospace`; c.textAlign = 'center'; c.fillStyle = ink; c.fillText(text, Math.round(x) + 1, Math.round(y) + 1); c.fillStyle = color; c.fillText(text, Math.round(x), Math.round(y)); }
function ellipse(c, x, y, rx, ry, color) { for (let row = -Math.floor(ry); row <= ry; row++) {
    const half = Math.floor(rx * Math.sqrt(Math.max(0, 1 - row * row / (ry * ry))));
    box(c, x - half, y + row, half * 2 + 1, 1, color);
} }
function space(c, w, h, time, rotating) {
    box(c, 0, 0, w, h, '#101c31');
    for (let i = 0; i < 110; i++) {
        let x = (i * 73) % w, y = (i * 43) % h;
        if (rotating) {
            const a = time * .018 + i * 2.4, r = 40 + (i * 17) % 240;
            x = w / 2 + Math.cos(a) * r;
            y = h / 2 + Math.sin(a) * r * .7;
        }
        else
            x = (x - time * (1 + i % 3) * .3 + w * 100) % w;
        box(c, x, y, i % 29 ? 1 : 2, 1, i % 7 ? '#40516f' : light);
    }
}
function earth(c, x, y, time, returns) {
    const r = Math.max(9, 32 / (1 + time * .012 + returns * .12));
    ellipse(c, x, y, r, r, '#315773');
    ellipse(c, x - 2, y - 3, r * .8, r * .8, '#477f94');
    for (let i = 0; i < 10; i++) {
        const a = i * 2.4, px = x + Math.cos(a) * r * .65, py = y + Math.sin(a) * r * .55;
        box(c, px, py, 4, 2, i % 3 ? '#69968a' : amber);
        box(c, px + 1, py - 2, 2, 2, '#b76245');
    }
    box(c, x - r * .7, y - r * .7, r, 2, '#a68e68');
}
function prop(c, r, restored) {
    const x = r.x + r.w / 2, y = r.y + r.h - 18, color = restored ? teal : '#354a59';
    if (r.id === 'workshop') {
        plate(c, x - 17, y - 7, 34, 12, '#695d50');
        box(c, x - 10, y - 13, 20, 4, amber);
        box(c, x - 4, y - 20, 4, 13, edge);
        box(c, x - 10, y - 20, 14, 4, edge);
    }
    if (r.id === 'infirmary') {
        plate(c, x - 19, y - 5, 38, 11);
        box(c, x - 16, y - 8, 12, 6, light);
        box(c, x + 5, y - 11, 3, 11, color);
        box(c, x + 1, y - 7, 11, 3, color);
    }
    if (r.id === 'observatory') {
        plate(c, x - 17, y - 17, 34, 22, dark);
        ellipse(c, x, y - 7, 10, 7, color);
        box(c, x - 1, y - 16, 2, 17, light);
        box(c, x - 13, y - 8, 26, 2, light);
    }
    if (r.id === 'cargo') {
        for (let i = 0; i < 3; i++) {
            plate(c, x - 22 + i * 15, y - 10 + (i % 2) * 5, 13, 16, '#695d50');
            box(c, x - 18 + i * 15, y - 7 + (i % 2) * 5, 5, 2, color);
        }
    }
    if (r.id === 'greenhouse') {
        plate(c, x - 20, y + 1, 40, 7, '#695d50');
        for (let i = 0; i < 4; i++) {
            box(c, x - 15 + i * 9, y - 12, 2, 14, restored ? '#69968a' : edge);
            box(c, x - 18 + i * 9, y - 9, 8, 4, restored ? light : '#354a59');
        }
    }
    if (r.id === 'communications') {
        plate(c, x - 18, y - 19, 36, 25, dark);
        for (let i = 0; i < 5; i++)
            box(c, x - 13 + i * 6, y - 11 + (i % 3) * 3, 3, 10 - (i % 3) * 3, color);
    }
}
function room(c, r, states, lang, compact) {
    const on = states[r.id].restored, def = ROOMS.find(d => d.id === r.id);
    plate(c, r.x, r.y, r.w, r.h, on ? '#34485a' : '#182632');
    box(c, r.x + 4, r.y + 4, r.w - 8, 3, on ? light : '#354a59');
    if (!compact) {
        box(c, r.x + 7, r.y + 11, r.w - 14, 16, '#101c31');
        for (let i = 0; i < 3; i++)
            box(c, r.x + 18 + i * 44, r.y + 13, 18, 1, on ? '#477f94' : '#263640');
    }
    prop(c, r, on);
    if (!on) {
        box(c, r.x + 8, r.y + r.h - 10, 8, 2, amber);
        box(c, r.x + 16, r.y + r.h - 12, 9, 2, amber);
        box(c, r.x + 25, r.y + r.h - 10, 3, 7, ink);
        box(c, r.x + r.w - 15, r.y + 12, 2, 11, ink);
        box(c, r.x + r.w - 18, r.y + 19, 5, 2, ink);
    }
    label(c, def[lang], r.x + r.w / 2, r.y - 5, on ? light : edge, compact ? 6 : 7);
    box(c, r.x + r.w - 8, r.y + 7, 3, 3, on ? teal : amber);
    if (!compact)
        label(c, lang === 'ko' ? (on ? '가동 중' : '복구 대기') : (on ? 'ONLINE' : 'OFFLINE'), r.x + r.w / 2, r.y + 29, on ? teal : amber, 6);
}
function facility(c, id, x, y) {
    if (id === 'launch') {
        plate(c, x - 17, y - 17, 34, 22, dark);
        for (let i = 0; i < 4; i++)
            box(c, x - 13 + i * 8, y - 12, 4, 2, amber);
        box(c, x - 15, y + 2, 30, 3, teal);
    }
    if (id === 'capsule') {
        plate(c, x - 12, y - 28, 24, 30);
        box(c, x - 8, y - 24, 16, 22, '#1f3e4b');
        box(c, x - 5, y - 21, 10, 14, teal);
        box(c, x - 6, y - 3, 12, 2, light);
    }
    if (id === 'equipment') {
        plate(c, x - 17, y - 20, 34, 23);
        for (let i = 0; i < 3; i++) {
            box(c, x - 13 + i * 10, y - 16, 8, 16, dark);
            box(c, x - 9 + i * 10, y - 10, 2, 3, amber);
        }
    }
    if (id === 'research') {
        plate(c, x - 15, y - 23, 30, 21);
        box(c, x - 11, y - 19, 22, 12, dark);
        for (let i = 0; i < 3; i++)
            box(c, x - 8, y - 16 + i * 3, 10 + i * 3, 1, teal);
    }
    if (id === 'practice') {
        plate(c, x - 12, y - 19, 24, 14, '#9c8e70');
        box(c, x - 3, y - 5, 6, 8, edge);
        box(c, x - 14, y + 3, 28, 3, edge);
        box(c, x - 7, y - 15, 3, 3, ink);
        box(c, x + 4, y - 15, 3, 3, ink);
    }
    if (id === 'records') {
        plate(c, x - 15, y - 21, 30, 22);
        for (let i = 0; i < 3; i++)
            box(c, x - 11 + i * 8, y - 16, 6, 9, i % 2 ? amber : light);
    }
}
export function capsuleArt(c, x, y) {
    plate(c, x - 12, y - 27, 24, 30, '#536572');
    box(c, x - 8, y - 23, 16, 20, '#1f3e4b');
    box(c, x - 6, y - 21, 12, 2, '#477f94');
    for (let i = 0; i < 3; i++)
        box(c, x - 6, y - 16 + i * 5, 12, 2, '#315773');
    box(c, x - 6, y + 1, 12, 2, amber);
}
export function optionArt(canvas, deck, cleared, returns, time, lang, camera, states) {
    const l = deck.layout, c = canvas.getContext('2d'), detail = deckDetails[returns % deckDetails.length];
    c.imageSmoothingEnabled = false;
    box(c, 0, 0, canvas.width, canvas.height, '#0c1422');
    c.save();
    c.translate(-camera.x, -camera.y);
    space(c, l.w, l.h, time, l.variant === 'b');
    if (l.variant === 'a') {
        earth(c, 326, 35, time, returns);
        plate(c, 24, 32, 592, 248, dark);
        for (const y of [104, 184, 264]) {
            box(c, 30, y + 6, 580, 8, hull);
            box(c, 32, y + 6, 576, 2, edge);
            box(c, 34, y + 14, 572, 3, ink);
            for (let x = 40; x < 610; x += 40)
                box(c, x, y + 9, 12, 2, amber);
        }
        for (const x of [216, 424]) {
            box(c, x - 11, 96, 22, 170, ink);
            box(c, x - 8, 96, 2, 170, edge);
            box(c, x + 7, 96, 2, 170, edge);
            for (let y = 100; y < 266; y += 8)
                box(c, x - 8, y, 17, 2, amber);
        }
        for (const r of l.rooms)
            room(c, r, states, lang, false);
        box(c, 260, 35, 116, 20, '#101c31');
        c.save();
        c.beginPath();
        c.rect(260, 35, 116, 20);
        c.clip();
        earth(c, 326, 42, time, returns);
        c.restore();
        box(c, 258, 55, 120, 3, edge);
        label(c, lang === 'ko' ? '거주층' : 'HABITAT', 584, 220, edge, 6);
        label(c, lang === 'ko' ? '승강 사다리 ↑↓' : 'LADDERS ↑↓', 320, 215, light, 7);
    }
    else if (l.variant === 'b') {
        ellipse(c, 208, 152, 198, 140, ink);
        ellipse(c, 208, 152, 192, 134, hull);
        ellipse(c, 208, 152, 184, 126, edge);
        ellipse(c, 208, 152, 180, 122, '#315773');
        ellipse(c, 208, 152, 174, 118, dark);
        ellipse(c, 208, 152, 141, 79, hull);
        ellipse(c, 208, 152, 136, 74, ink);
        ellipse(c, 208, 152, 129, 68, '#101c31');
        for (let i = 0; i < 24; i++) {
            const a = i * Math.PI / 12, x = 208 + Math.cos(a) * 183, y = 152 + Math.sin(a) * 125;
            box(c, x - 2, y - 2, 4, 4, light);
        }
        for (let i = 0; i < 12; i++) {
            const a = i * Math.PI / 6;
            box(c, 208 + Math.cos(a) * 151, 152 + Math.sin(a) * 91, 3, 3, amber);
        }
        for (const r of l.rooms)
            room(c, r, states, lang, true);
        label(c, 'ARK / 01', 208, 141, light, 10);
        label(c, lang === 'ko' ? '거주 고리' : 'HABITAT RING', 208, 157, edge);
        label(c, lang === 'ko' ? '둘레를 따라 이동' : 'WALK THE RING', 208, 173, edge, 6);
    }
    else {
        const w = l.w;
        plate(c, 8, 80, w - 16, 200, hull);
        plate(c, 16, 60, w - 32, 212, hull);
        plate(c, 24, 36, w - 48, 228, hull);
        box(c, 20, 82, w - 40, 188, dark);
        box(c, 28, 44, w - 56, 220, dark);
        box(c, 30, 47, w - 60, 30, '#101c31');
        c.save();
        c.beginPath();
        c.rect(30, 47, w - 60, 30);
        c.clip();
        earth(c, w / 2, 56, time, returns);
        c.restore();
        for (const x of [w * .33, w * .66])
            box(c, x, 44, 3, 34, edge);
        for (const y of [136, 200, 264]) {
            box(c, 24, y, w - 48, 3, '#34485a');
            box(c, w / 2 - 8, y, 16, 2, amber);
        }
        for (const r of l.rooms)
            room(c, r, states, lang, true);
        plate(c, w / 2 - 12, 145, 24, 14, '#695d50');
        box(c, w / 2 - 8, 148, 16, 3, teal);
        plate(c, 34, 180, 28, 13, '#695d50');
        box(c, 37, 183, 22, 5, ink);
        label(c, 'MEW', 48, 177, amber, 6);
        label(c, lang === 'ko' ? '정비대' : 'TOOLS', 48, 277, edge, 6);
        label(c, lang === 'ko' ? '실험대' : 'LAB', w - 48, 277, edge, 6);
    }
    for (const p of l.places.filter(p => !p.id.startsWith('room-') && p.id !== 'window')) {
        facility(c, p.id, p.x, p.y);
        if (l.variant !== 'c' || p.id === 'launch')
            label(c, p[lang], p.x, p.y + 18, p.kind === 'launch' ? amber : edge, l.variant === 'a' ? 7 : 6);
    }
    const people = [...deck.actors().map(a => ({ ...a, direction: 0, frame: 0 })), { id: deck.crew, x: deck.x, y: deck.y, direction: deck.direction, frame: deck.walking ? 1 + Math.floor(deck.walking) % 2 : 0 }].sort((a, b) => a.y - b.y);
    for (const p of people) {
        const open = crewUnlocked(p.id, cleared);
        if (!open) {
            capsuleArt(c, p.x, p.y);
            label(c, lang === 'ko' ? '수면 중' : 'STASIS', p.x, p.y + 13, amber, 6);
            continue;
        }
        box(c, p.x - 9, p.y + 5, 18, 3, ink);
        c.drawImage(crewSprite(p.id, p.direction, p.frame), Math.round(p.x) - 18, Math.round(p.y) - 28, 36, 36);
        if (p.id === 'mew')
            box(c, p.x - 3, p.y - 10, 8, 2, detail.collar);
        label(c, speakers[p.id].name, p.x, p.y + 16, p.id === deck.crew ? teal : light, 6);
        if (p.id === deck.crew)
            box(c, p.x - 4, p.y + 20, 8, 2, teal);
    }
    c.restore();
    // A compact overview keeps facilities visible while the camera follows the crew.
    if (l.variant === 'c')
        return;
    const mw = canvas.width < 300 ? 60 : 76, mh = canvas.width < 300 ? 38 : 48, mx = canvas.width - mw - 6, my = 8, s = Math.min(mw / l.w, (mh - 2) / l.h);
    plate(c, mx, my, mw, mh, dark);
    for (const r of l.rooms)
        box(c, mx + r.x * s, my + r.y * s, Math.max(3, r.w * s), Math.max(3, r.h * s), states[r.id].restored ? teal : '#695d50');
    for (const p of l.places.filter(p => p.id === 'launch'))
        box(c, mx + p.x * s - 1, my + p.y * s - 1, 3, 3, amber);
    box(c, mx + deck.x * s - 1, my + deck.y * s - 1, 3, 3, light);
}

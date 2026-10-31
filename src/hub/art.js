import { crewSprite } from '../crew.js';
import { crewUnlocked } from '../chapters.js';
import { DECK, places, crewSpots } from './model.js';
import { deckDetails, speakers } from '../dialogue/data.js';
const letters = { A: ['01110', '11011', '11011', '11111', '11011', '11011', '11011'], R: ['11110', '11011', '11011', '11110', '11100', '11010', '11011'], K: ['11011', '11010', '11100', '11100', '11110', '11011', '11011'], M: ['11011', '11111', '11111', '11011', '11011', '11011', '11011'], O: ['01110', '11011', '11011', '11011', '11011', '11011', '01110'], W: ['11011', '11011', '11011', '11011', '11111', '11111', '01010'] };
export function drawLogo(c, x, y, scale) {
    const word = 'ARKMORROW';
    for (let i = 0; i < word.length; i++)
        for (let row = 0; row < 7; row++)
            for (let col = 0; col < 5; col++)
                if (letters[word[i]][row][col] === '1') {
                    c.fillStyle = '#0b151f';
                    c.fillRect(x + (i * 6 + col) * scale + scale, y + row * scale + scale, scale, scale);
                    c.fillStyle = row < 2 ? '#e6f5df' : row < 5 ? '#a2d4c8' : '#5caaa8';
                    c.fillRect(x + (i * 6 + col) * scale, y + row * scale, scale, scale);
                }
}
function rect(c, x, y, w, h, color) { c.fillStyle = color; c.fillRect(Math.round(x), Math.round(y), w, h); }
function panel(c, x, y, w, h, color = '#46566a') { rect(c, x - 2, y - 2, w + 4, h + 4, '#101722'); rect(c, x, y, w, h, color); rect(c, x, y, w, 2, '#83959a'); rect(c, x + 3, y + h - 3, w - 6, 3, '#283647'); }
function stars(c, w, h, time) {
    rect(c, 0, 0, w, h, '#101c31');
    for (let i = 0; i < 150; i++) {
        const depth = 1 + i % 3, x = ((i * 73.17 - time * depth * .8) % w + w) % w, y = (i * 41.77) % h;
        rect(c, x, y, i % 19 === 0 ? 2 : 1, 1, i % 5 === 0 ? '#9bc5c4' : '#40516f');
    }
    for (let y = 0; y < 120; y += 2) {
        const width = Math.round(Math.sqrt(Math.max(0, 3600 - (y - 60) ** 2)));
        rect(c, w * .76 - width, y + h * .13, width * 2, 2, y < 60 ? '#477f94' : '#315773');
    }
    for (let i = 0; i < 35; i++)
        rect(c, w * .76 - 48 + (i * 17) % 94, h * .13 + 20 + (i * 13) % 62, 3 + i % 5, 2, '#69968a');
}
export function titleArt(canvas, time) {
    const portrait = window.innerWidth < 600, w = portrait ? 288 : 640, h = portrait ? 480 : 400;
    canvas.width = w;
    canvas.height = h;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    rect(c, 0, 0, w, h, '#141c29');
    c.save();
    c.beginPath();
    c.rect(18, 35, w - 36, h * .57);
    c.clip();
    stars(c, w, h * .7, time);
    c.restore();
    for (const x of [10, w / 2 - 3, w - 20])
        panel(c, x, 27, 10, h * .6, '#34485a');
    panel(c, 8, h * .64, w - 16, 12, '#5e7077');
    for (let y = Math.floor(h * .68); y < h; y += 24) {
        rect(c, 0, y, w, 1, '#33424e');
        for (let x = (y % 48 ? 0 : 12); x < w; x += 48)
            rect(c, x, y, 1, 24, '#263640');
    }
    c.drawImage(crewSprite('pip', 2, 0), w / 2 - 30, h * .57 - 48, 60, 60);
    rect(c, w / 2 + 8, h * .57 - 20, 27, 4, '#4faeb2');
    rect(c, w / 2 + 22, h * .57 - 16, 17, 4, '#377e8b');
    const scale = portrait ? 4 : 8;
    drawLogo(c, Math.floor((w - 53 * scale) / 2), h * .77, scale);
}
export function deckCamera(canvas, deck) {
    const bounds = canvas.getBoundingClientRect(), width = bounds.width || window.innerWidth, height = bounds.height || window.innerHeight - 150, scale = width < 600 ? 2 : Math.max(1, Math.floor(Math.min(width / 320, height / 240))), w = Math.ceil(width / scale), h = Math.ceil(height / scale);
    canvas.width = w;
    canvas.height = h;
    return { x: Math.round(Math.max(0, Math.min(DECK.w - w, deck.x - w / 2))), y: Math.round(Math.max(0, Math.min(DECK.h - h, deck.y - h / 2))), w, h, scale };
}
export function deckArt(canvas, deck, cleared, returns, time, lang, camera) {
    const c = canvas.getContext('2d'), detail = deckDetails[returns % deckDetails.length];
    c.imageSmoothingEnabled = false;
    rect(c, 0, 0, canvas.width, canvas.height, '#0c1422');
    c.save();
    c.translate(-camera.x, -camera.y);
    stars(c, 640, 92, time);
    for (let y = 77; y < 384; y += 16)
        for (let x = 24; x < 616; x += 16) {
            rect(c, x, y, 15, 15, ((x / 16 + y / 16) | 0) % 4 === 0 ? '#33434e' : '#2d3a46');
            rect(c, x + 2, y + 2, 2, 1, '#3a4b55');
        }
    panel(c, 20, 60, 600, 17, '#61757f');
    panel(c, 20, 77, 15, 310, '#3c5060');
    panel(c, 605, 77, 15, 310, '#3c5060');
    panel(c, 20, 376, 600, 14, '#61757f');
    for (let x = 30; x < 610; x += 80) {
        rect(c, x, 61, 28, 3, '#a2d4c8');
        rect(c, x, 380, 28, 3, '#708185');
    }
    for (const x of [150, 465])
        panel(c, x, 0, 12, 63, '#455e6c');
    // Floor strips lead from the capsule to the hatch.
    for (let x = 368; x < 496; x += 16)
        rect(c, x, 280, 8, 2, '#8b8166');
    for (let y = 286; y < 360; y += 16)
        rect(c, 488, y, 2, 8, '#8b8166');
    panel(c, 52, 117, 64, 24, '#695d50');
    for (let i = 0; i < 4; i++)
        rect(c, 57 + i * 13, 120, 8, 4, '#a68e68');
    rect(c, 59, 109, 11, 7, '#718b8d');
    panel(c, 258, 148, 116, 33, '#6b6054');
    for (let i = 0; i < detail.cups; i++) {
        rect(c, 277 + i * 28, 156, 7, 8, '#c7c5aa');
        rect(c, 284 + i * 28, 157, 3, 4, '#89999b');
    }
    panel(c, 278, 187, 20, 10, '#47606a');
    panel(c, 518, 113, 62, 32, '#516b72');
    panel(c, 524, 117, 46, 19, '#152633');
    for (let i = 0; i < 4; i++)
        rect(c, 528, 121 + i * 3, 18 + i * 5, 1, '#71d6ce');
    panel(c, 61, 205, 46, 30, '#536572');
    for (let i = 0; i < 3; i++) {
        rect(c, 65 + i * 13, 209, 10, 21, '#354a59');
        rect(c, 69 + i * 13, 215, 3, 3, '#b5a383');
    }
    rect(c, 64, 203, 39, 2, '#e2a65a');
    panel(c, 331, 210, 42, 28, '#607e84');
    panel(c, 338, 212, 28, 22, '#1f3e4b');
    rect(c, 344, 214, 16, 17, '#78c8c3');
    rect(c, 344, 228, 16, 3, '#d5f2d7');
    panel(c, 527, 211, 51, 26, '#4e5a60');
    for (let i = 0; i < 5; i++)
        rect(c, 532 + i * 8, 216, 6, 10, i % 2 ? '#a2d4c8' : '#e2a65a');
    panel(c, 433, 315, 96, 44, '#384d54');
    rect(c, 441, 321, 80, 29, '#162630');
    for (let i = 0; i < 5; i++)
        rect(c, 446 + i * 16, 333, 10, 3, '#e2a65a');
    rect(c, 441, 353, 80, 3, '#86c8ad');
    panel(c, 105, 300, 45, 16, '#686052');
    rect(c, 125, 280, 7, 22, '#957a5c');
    panel(c, 116, 280, 25, 18, '#9c8e70');
    rect(c, 120, 284, 4, 4, '#252c37');
    rect(c, 132, 284, 4, 4, '#252c37');
    rect(c, 98, 295, 58, 5, '#bca984');
    panel(c, 565, 81, 28, 16, '#182a38');
    rect(c, 570, 86, 18, 3, Math.floor(time) % 3 ? '#91c0a8' : '#e2a65a');
    const people = [...deck.actors().map(a => ({ ...a, direction: 0, frame: 0 })), { x: deck.x, y: deck.y, id: deck.crew, direction: deck.direction, frame: deck.walking ? 1 + Math.floor(deck.walking) % 2 : 0 }].sort((a, b) => a.y - b.y);
    for (const person of people) {
        const unlocked = crewUnlocked(person.id, cleared);
        rect(c, person.x - 9, person.y + 5, 18, 4, '#17232c');
        c.save();
        if (!unlocked)
            c.filter = 'brightness(0.12)';
        c.drawImage(crewSprite(person.id, person.direction, person.frame), Math.round(person.x) - 18, Math.round(person.y) - 28, 36, 36);
        c.restore();
        if (person.id === 'mew')
            rect(c, person.x - 3, person.y - 10, 8, 2, detail.collar);
        if (person.id === deck.crew) {
            rect(c, person.x - 4, person.y + 13, 8, 2, '#71d6ce');
        }
        else {
            c.fillStyle = unlocked ? '#bfcfc9' : '#8b969a';
            c.font = '7px Galmuri11,monospace';
            c.textAlign = 'center';
            c.fillText(unlocked ? speakers[person.id].name : '?', person.x, person.y + 18);
        }
    }
    c.font = '8px Galmuri11,monospace';
    c.textAlign = 'center';
    for (const p of places) {
        c.fillStyle = p.kind === 'launch' ? '#f3c686' : '#93a8ad';
        c.fillText(p[lang], p.x, p.y + (p.kind === 'window' ? -4 : 19));
    }
    c.fillStyle = '#8da6a8';
    c.font = '6px Galmuri11,monospace';
    c.textAlign = 'left';
    c.fillText(detail.graffiti, 542, 248);
    c.fillText('ARK / RESIDENTIAL', 42, 95);
    c.restore();
}
export function portraitArt(canvas, id, expression) { const c = canvas.getContext('2d'); c.imageSmoothingEnabled = false; rect(c, 0, 0, 80, 80, '#233441'); c.drawImage(crewSprite(id, 0, 0), -6, -2, 92, 92); if (expression === 'surprised') {
    rect(c, 61, 8, 3, 10, '#f3c686');
    rect(c, 61, 21, 3, 3, '#f3c686');
} if (expression === 'smile') {
    rect(c, 60, 13, 5, 2, '#71d6ce');
    rect(c, 65, 11, 2, 2, '#71d6ce');
} }
export function crewSpot(id) { return crewSpots[id]; }

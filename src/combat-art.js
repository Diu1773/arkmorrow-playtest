import { SKILLS, skillDef } from './combat-catalog.js';
import { EffectRenderer } from './vfx-art.js';
import { effect } from './effect-grammar.js';
const fieldEffects = new EffectRenderer();
const masks = [
    ['.......xx...', '.....xxxx...', '...xxxx.....', '.xxxx.......', 'xxxx....x...', '.xxxx...xx..', '...xxxx.xxx.', '.....xxxxxxx', '.......xxxx.'],
    ['...xxxxxx...', '..xxxxxxxx..', '..xxxxxxxx..', '...xxxxxx...', '.....xx.....', '.....xx.....', '....xxxx....', '..xxxxxxxx..', 'xxxxxxxxxxxx'],
    ['x..........x', 'xx..xxxx..xx', 'xxxxxxxxyxxx', '..xxxxxxxx..', '....xxxx....', '...xx..xx...', '..xx....xx..', '...x....x...'],
    ['.....xx.....', '....xxxx....', '...xxxx.....', '..xxxx......', '...xxxxxxx..', '.....xxxx...', '....xxxx....', '...xxx......', '..xx........'],
    ['...xxxxxx...', '..xxx..xxx..', '.xx......xx.', 'xx...xx...xx', 'xx..xxxx..xx', 'xx..xxxx..xx', 'xx...xx...xx', '.xx......xx.', '..xxx..xxx..', '...xxxxxx...'],
    ['.....xx.....', '.....xx.....', '..x..xx..x..', '...xxxxxx...', '....xxxx....', '.xxxxxxxxxx.', '...xxxxxx...', '..xx.xx.xx..', '.xx..xx..xx.', '.....xx.....'],
    ['..xxxxxxxx..', '...xx..xx...', '....xxxx....', '.....xx.....', '....xxxx....', '...xx..xx...', '..xxxxxxxx..', '.xx......xx.'],
    ['.....xx.....', '...xxxxxx...', '.xxxxxxxxxx.', '.xx......xx.', '.xx..xx..xx.', '..xx.xx.xx..', '...xxxxxx...', '....xxxx....', '.....xx.....'],
];
const cache = new Map();
export function skillSprite(id) {
    const old = cache.get(id);
    if (old)
        return old;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 24;
    const c = canvas.getContext('2d'), def = skillDef(id), index = SKILLS.findIndex(s => s.id === id), rows = masks[index] ?? masks[{ attack: 5, movement: 3, defense: 7, control: 4, summon: 2, buff: 6 }[def.category]], color = def.color;
    for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++)
            if (rows[y][x] !== ' ' && rows[y][x] !== '.') {
                c.fillStyle = '#10131d';
                c.fillRect(x + 5, y + 5, 3, 3);
            }
    for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++)
            if (rows[y][x] !== '.') {
                c.fillStyle = (x + y) % 4 === 0 ? '#e8f1e9' : color;
                c.fillRect(x + 6, y + 6, 1, 1);
            }
    if (index >= 8) {
        c.fillStyle = color;
        for (let i = 0; i < 4; i++)
            if ((index - 7) & 1 << i)
                c.fillRect(4 + i * 4, 20, 3, 2);
    }
    cache.set(id, canvas);
    return canvas;
}
export const skillIcon = (id) => `<canvas class="pixel-icon" data-skill-icon="${id}" width="48" height="48" aria-hidden="true"></canvas>`;
export function drawCombatIcons(root) {
    for (const canvas of root.querySelectorAll('canvas[data-skill-icon]')) {
        const id = canvas.dataset.skillIcon;
        if (!SKILLS.some(s => s.id === id))
            continue;
        const c = canvas.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.clearRect(0, 0, canvas.width, canvas.height);
        c.drawImage(skillSprite(id), 0, 0, canvas.width, canvas.height);
    }
}
export function drawSkillFields(c, s, view) {
    for (const field of s.combatFields ?? []) {
        const x = view.X(field.x), y = view.Y(field.y), r = field.radius * view.unit, t = view.reduced ? .3 : view.time;
        if (field.id === 'drone') {
            const phase = view.reduced ? 0 : view.time * 3;
            for (let j = 0; j < field.count; j++) {
                const a = phase + j * 2.1;
                c.drawImage(skillSprite('drone'), Math.round(x + Math.cos(a) * 25) - 12, Math.round(y + Math.sin(a) * 15) - 25);
            }
        }
        else if (field.id === 'reflect') {
            const edge = (ax, ay, bx, by) => { const steps = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)))); c.fillStyle = '#87b6cf'; for (let k = 0; k <= steps; k++)
                c.fillRect(Math.round(ax + (bx - ax) * k / steps), Math.round(ay + (by - ay) * k / steps), 2, 2); };
            for (let j = 0; j < 6; j++) {
                const a = j * Math.PI / 3 + (view.reduced ? 0 : t * .18), cx = x + Math.cos(a) * r * .8, cy = y + Math.sin(a) * r * .8, w = Math.max(5, r * .16), h = Math.max(8, r * .25);
                edge(cx - w, cy - h, cx + w, cy - h);
                edge(cx + w, cy - h, cx + w, cy + h * .45);
                edge(cx + w, cy + h * .45, cx, cy + h);
                edge(cx, cy + h, cx - w, cy + h * .45);
                edge(cx - w, cy + h * .45, cx - w, cy - h);
                c.fillStyle = '#d8edf1';
                c.fillRect(Math.round(cx - w * .3), Math.round(cy - h * .6), 2, Math.max(3, Math.round(h * .7)));
                c.fillStyle = '#526a88';
                c.fillRect(Math.round(cx), Math.round(cy), 2, Math.max(2, Math.round(h * .4)));
            }
        }
        else if (field.id === 'stasis') {
            const alpha = c.globalAlpha;
            c.globalAlpha = alpha * .4;
            c.fillStyle = '#91a6b2';
            for (let yy = -r; yy <= r; yy += 4)
                for (let xx = -r; xx <= r; xx += 4)
                    if (xx * xx + yy * yy < r * r)
                        c.fillRect(Math.round(x + xx), Math.round(y + yy), 1, 1);
            c.globalAlpha = alpha;
            fieldEffects.effect(c, effect('time', 'ring', Math.max(16, Math.min(240, r * 2)), 1), x, y, t, true);
            fieldEffects.effect(c, effect('time', 'field', 48, 1), x, y, 0, true);
        }
        else if (field.id === 'bombard') {
            for (let j = 0; j < 6; j++) {
                const a = j * Math.PI / 3;
                fieldEffects.effect(c, effect('fire', 'summon', 24, 1), x + Math.cos(a) * r * .7, y + Math.sin(a) * r * .7, t + j * .1, true);
            }
        }
    }
}

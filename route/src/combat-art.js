import { SKILLS, skillDef } from './combat-catalog.js';
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
    const c = canvas.getContext('2d'), rows = masks[SKILLS.findIndex(s => s.id === id)], color = skillDef(id).color;
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
        const x = view.X(field.x), y = view.Y(field.y), r = field.radius * view.unit, def = skillDef(field.id);
        c.fillStyle = def.color;
        if (field.id === 'drone') {
            const phase = view.reduced ? 0 : view.time * 3;
            for (let j = 0; j < field.count; j++) {
                const a = phase + j * 2.1;
                c.drawImage(skillSprite('drone'), Math.round(x + Math.cos(a) * 25) - 12, Math.round(y + Math.sin(a) * 15) - 25);
            }
        }
        else if (field.id === 'reflect') {
            for (let j = 0; j < 16; j++) {
                const a = j * Math.PI / 8 + (view.reduced ? 0 : view.time * .8), xx = Math.round(x + Math.cos(a) * r), yy = Math.round(y + Math.sin(a) * r * .65);
                c.fillRect(xx - 3, yy - 3, 6, 6);
                c.fillStyle = '#e8f1e9';
                c.fillRect(xx - 1, yy - 1, 2, 2);
                c.fillStyle = def.color;
            }
        }
        else if (field.id === 'stasis') {
            c.globalAlpha = .5;
            for (let i = -2; i <= 2; i++)
                for (let j = -2; j <= 2; j++)
                    if (i * i + j * j < 8) {
                        c.fillRect(Math.round(x + i * r / 3), Math.round(y + j * r / 3), 2, 7);
                        c.fillRect(Math.round(x + i * r / 3), Math.round(y + j * r / 3), 6, 2);
                    }
            c.globalAlpha = 1;
            c.drawImage(skillSprite('stasis'), Math.round(x) - 12, Math.round(y) - 12);
        }
        else if (field.id === 'bombard') {
            for (let j = 0; j < 6; j++) {
                const a = j * Math.PI / 3;
                c.fillRect(Math.round(x + Math.cos(a) * r * .7) - 2, Math.round(y + Math.sin(a) * r * .7) - 2, 4, 4);
            }
        }
    }
}

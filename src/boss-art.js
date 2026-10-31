import { bossState, bossWorld } from './boss-director.js';
const cache = new Map();
const ink = '#171923', glow = '#ffe9b0', core = '#f488a7';
const textCache = new Map();
function textImage(text, size, color) {
    const key = text + '|' + size + '|' + color, old = textCache.get(key);
    if (old)
        return old;
    const canvas = document.createElement('canvas'), g = canvas.getContext('2d'), font = `bold ${size}px Galmuri11, monospace`;
    g.font = font;
    canvas.width = Math.ceil(g.measureText(text).width) + 2;
    canvas.height = Math.ceil(size * 1.3);
    const h = canvas.getContext('2d');
    h.font = font;
    h.textBaseline = 'top';
    h.fillStyle = color;
    h.fillText(text, 1, 0);
    textCache.set(key, canvas);
    return canvas;
}
function pixelLine(c, x0, y0, x1, y1, w) {
    const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
    for (let i = 0; i <= n; i++) {
        const t = i / n;
        c.fillRect(Math.round(x0 + (x1 - x0) * t - w / 2), Math.round(y0 + (y1 - y0) * t - w / 2), w, w);
    }
}
function pixelRing(c, cx, cy, r, w) {
    const n = Math.max(12, Math.ceil(Math.PI * 2 * r));
    for (let i = 0; i < n; i++) {
        const a = i / n * Math.PI * 2;
        c.fillRect(Math.round(cx + Math.cos(a) * r - w / 2), Math.round(cy + Math.sin(a) * r - w / 2), w, w);
    }
}
export function bossFrame(d, variant = 2, phase = 0, frame = 0, flash = false) {
    const key = [d.id, variant, phase, frame, flash].join(':');
    if (cache.has(key))
        return cache.get(key);
    const size = variant === 2 ? d.size : variant === 0 ? 72 : 80, ca = document.createElement('canvas');
    ca.width = ca.height = size;
    const c = ca.getContext('2d'), scale = size / 96;
    const rect = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(x * scale), Math.round(y * scale), Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))); };
    const oval = (x, y, rx, ry, color) => { for (let y0 = Math.floor(-ry * scale); y0 <= ry * scale; y0++) {
        const r = Math.floor(rx * scale * Math.sqrt(Math.max(0, 1 - (y0 / (ry * scale)) ** 2)));
        c.fillStyle = color;
        c.fillRect(Math.round(x * scale) - r, Math.round(y * scale) + y0, 2 * r + 1, 1);
    } };
    const plate = (x, y, w, h) => { rect(x - 2, y - 2, w + 4, h + 4, ink); rect(x, y, w, h, d.colors[0]); rect(x + 2, y + 2, w - 4, h - 5, d.colors[1]); rect(x + 2, y + 2, w - 4, 3, d.colors[3]); rect(x + w - 5, y + 5, 3, h - 7, d.colors[2]); };
    const eye = (x, y, r = 5) => { oval(x, y, r + 3, r + 3, ink); oval(x, y, r, r, core); rect(x - 2, y - 2, 4, 4, glow); };
    const bob = frame === 1 ? 1 : 0;
    if (variant < 2) {
        const shape = d.shape, second = variant === 1;
        if (shape === 0) {
            if (!second) {
                plate(24, 32, 48, 44);
                for (const x of [19, 68]) {
                    rect(x, 31, 9, 48, ink);
                    for (let y = 34; y < 78; y += 8)
                        rect(x + 2, y, 5, 4, d.colors[2]);
                }
                plate(40, 9, 14, 34);
                eye(48, 54, 8);
            }
            else {
                oval(48, 49, 32, 25, ink);
                oval(48, 46, 28, 22, d.colors[1]);
                for (const x of [12, 70])
                    plate(x, 49, 14, 28);
                plate(32, 19, 32, 22);
                eye(48, 42, 10);
            }
        }
        else if (shape === 1) {
            if (!second) {
                for (let i = 0; i < 5; i++)
                    plate(9 + i * 15, 38 - Math.abs(i - 2) * 6, 16, 18);
                plate(38, 22, 20, 52);
                eye(48, 40, 7);
            }
            else {
                oval(48, 38, 30, 29, ink);
                oval(48, 36, 26, 25, d.colors[1]);
                plate(29, 67, 38, 16);
                for (const x of [35, 57])
                    rect(x, 55, 4, 14, d.colors[3]);
                eye(48, 36, 10);
            }
        }
        else if (shape === 2) {
            if (!second) {
                plate(27, 29, 42, 40);
                plate(10, 34, 76, 12);
                plate(22, 19, 52, 10);
                for (const x of [34, 56])
                    plate(x, 68, 8, 20);
                eye(48, 45, 7);
            }
            else {
                for (let i = 0; i < 5; i++) {
                    oval(20 + i * 13, 64 - i * 6, 13, 17, ink);
                    oval(20 + i * 13, 62 - i * 6, 10, 14, d.colors[1]);
                }
                oval(70, 32, 16, 20, d.colors[2]);
                eye(72, 27, 6);
            }
        }
        else if (shape === 3) {
            if (!second) {
                oval(48, 43, 25, 30, ink);
                oval(46, 40, 21, 26, d.colors[1]);
                plate(29, 14, 38, 10);
                plate(34, 68, 28, 13);
                for (const x of [19, 70])
                    plate(x, 36, 7, 27);
                eye(48, 39, 10);
            }
            else {
                for (let i = 0; i < 4; i++) {
                    oval(24 + i * 15, 64 - i * 10, 12, 18, ink);
                    oval(24 + i * 15, 61 - i * 10, 9, 14, d.colors[1]);
                }
                plate(58, 12, 20, 22);
                plate(66, 4, 9, 14);
                eye(67, 29, 7);
            }
        }
        else if (shape === 4) {
            if (!second) {
                for (let i = 0; i < 5; i++)
                    plate(8 + i * 15, 55 - Math.abs(i - 2) * 13, 17, 19);
                plate(39, 20, 18, 55);
                for (const x of [12, 73])
                    plate(x, 63, 12, 18);
                eye(48, 41, 8);
            }
            else {
                for (const x of [13, 37, 61]) {
                    plate(x, 22 + (x === 37 ? -8 : 0), 22, 48);
                    plate(x + 6, 10 + (x === 37 ? -7 : 0), 10, 16);
                }
                plate(10, 62, 76, 12);
                eye(48, 46, 9);
            }
        }
        else if (shape === 5) {
            if (!second) {
                oval(48, 48, 35, 25, ink);
                oval(48, 45, 31, 21, d.colors[1]);
                oval(48, 30, 20, 16, ink);
                for (const x of [12, 72]) {
                    plate(x, 21, 12, 35);
                    plate(x - 3, 62, 17, 15);
                }
                plate(30, 50, 36, 19);
                eye(48, 53, 8);
            }
            else {
                plate(36, 9, 24, 73);
                for (let i = 0; i < 4; i++) {
                    oval(48, 19 + i * 17, 17 - i * 2, 10, ink);
                    oval(46, 17 + i * 17, 14 - i * 2, 7, d.colors[2]);
                }
                plate(22, 76, 52, 9);
                eye(48, 45, 10);
            }
        }
        else if (shape === 6) {
            if (!second) {
                oval(48, 48, 28, 29, ink);
                oval(46, 45, 24, 25, d.colors[1]);
                for (let i = 0; i < 8; i++) {
                    const a = i / 8 * Math.PI * 2;
                    plate(43 + Math.cos(a) * 32, 43 + Math.sin(a) * 32, 10, 11);
                }
                eye(48, 43, 11);
            }
            else {
                plate(15, 15, 24, 63);
                plate(30, 58, 52, 19);
                plate(66, 26, 15, 44);
                plate(20, 7, 14, 12);
                plate(69, 15, 10, 17);
                eye(27, 40, 8);
                eye(71, 60, 6);
            }
        }
        else if (shape === 7) {
            if (!second) {
                for (const x of [29, 54])
                    plate(x, 18, 15, 61);
                for (let i = 0; i < 3; i++)
                    eye(48 + (i % 2 ? 8 : -8), 26 + i * 21, 8);
                plate(24, 78, 48, 7);
            }
            else {
                oval(24, 42, 19, 25, ink);
                oval(23, 40, 15, 21, d.colors[1]);
                oval(72, 42, 19, 25, ink);
                oval(71, 40, 15, 21, d.colors[1]);
                plate(28, 31, 40, 13);
                plate(28, 55, 40, 13);
                eye(24, 40, 8);
                eye(72, 40, 8);
            }
        }
        else if (!second) {
            plate(18, 17, 60, 59);
            plate(28, 27, 40, 39);
            for (const [x, y] of [[8, 8], [70, 72], [70, 8], [8, 72]])
                plate(x, y, 17, 16);
            eye(48, 45, 12);
        }
        else {
            for (let i = 0; i < 4; i++) {
                plate(18 + i * 7, 13 + i * 7, 60 - i * 14, 9);
                plate(18 + i * 7, 74 - i * 7, 60 - i * 14, 9);
            }
            plate(40, 32, 16, 32);
            eye(48, 45, 10);
        }
    }
    else if (d.shape === 0) {
        for (const x of [8, 73]) {
            rect(x, 31, 16, 51, ink);
            rect(x + 2, 33, 12, 47, d.colors[0]);
            for (let y = 35; y < 78; y += 8) {
                rect(x + 3, y, 10, 4, d.colors[1]);
                rect(x + 3, y, 3, 4, d.colors[3]);
            }
        }
        plate(23, 30, 50, 46);
        plate(28, 20, 37, 34);
        plate(30, 7, 9, 29);
        plate(60, 4, 9, 35);
        plate(32, 7, 32, 7);
        plate(42, 1, 11, 18);
        plate(33, 47, 30, 19);
        eye(48, 52, 8);
        rect(26, 69, 44, 5, d.colors[2]);
        for (const x of [28, 64])
            rect(x, 65, 4, 4, glow);
    }
    else if (d.shape === 1) {
        for (let i = 0; i < 6; i++) {
            const x = 23 + i * 10, offset = (i % 2 ? 1 : -1) * (frame - 1) * 2;
            for (let y = 52; y < 88; y += 7)
                plate(x + offset + (y % 3 - 1) * 2, y, 5, 11);
        }
        oval(48, 38 + bob, 40, 28, ink);
        oval(48, 35 + bob, 36, 25, d.colors[0]);
        oval(45, 31 + bob, 32, 21, d.colors[1]);
        oval(43, 24, 23, 12, d.colors[2]);
        oval(38, 21, 14, 6, d.colors[3]);
        for (const x of [20, 69])
            plate(x, 37, 8, 21);
        eye(48, 41, 11);
        rect(46, 52, 5, 10, glow);
        rect(42, 61, 8, 4, core);
        rect(47, 65, 5, 8, glow);
    }
    else if (d.shape === 2) {
        for (const x of [17, 66]) {
            plate(x, 59, 14, 26);
            plate(x - 3, 78, 20, 8);
        }
        oval(48, 51, 34, 29, ink);
        oval(48, 49, 30, 26, d.colors[0]);
        oval(48, 44, 27, 20, d.colors[1]);
        for (const x of [17, 68]) {
            plate(x, 17, 11, 27);
            plate(x + (x < 40 ? -6 : 6), 13, 10, 12);
        }
        plate(22, 28, 52, 28);
        for (const x of [28, 59])
            eye(x, 38, 5);
        plate(29, 53, 38, 18);
        for (let x = 33; x < 65; x += 7)
            rect(x, 54, 4, 7, glow);
        eye(48, 68, 7);
    }
    else if (d.shape === 3) {
        for (const sign of [-1, 1]) {
            for (let i = 0; i < 4; i++)
                plate(42 + sign * (18 + i * 7) - 9, 16 + i * 10 + bob, 18, 27 - i * 3);
            plate(42 + sign * 25 - 7, 62, 14, 14);
        }
        plate(36, 22, 24, 53);
        plate(40, 10, 7, 19);
        plate(52, 7, 7, 22);
        eye(48, 43, 11);
        plate(40, 72, 16, 12);
    }
    else if (d.shape === 4) {
        plate(8, 31, 80, 29);
        plate(32, 13, 32, 68);
        for (const x of [9, 66]) {
            plate(x, 19, 21, 19);
            plate(x, 58, 21, 19);
            for (let y = 24; y < 74; y += 12)
                rect(x + 5, y, 10, 3, d.colors[2]);
        }
        plate(38, 4, 20, 12);
        plate(39, 80, 18, 10);
        eye(48, 44, 10);
        for (const x of [35, 57])
            rect(x, 63, 5, 8, core);
    }
    else if (d.shape === 5) {
        oval(48, 52, 36, 32, ink);
        oval(48, 49, 32, 28, d.colors[0]);
        oval(44, 44, 27, 23, d.colors[1]);
        for (let i = 0; i < 7; i++) {
            const a = i / 7 * Math.PI * 2;
            oval(48 + Math.cos(a) * 29, 48 + Math.sin(a) * 28, 8, 8, ink);
            oval(48 + Math.cos(a) * 29, 48 + Math.sin(a) * 28, 5, 5, d.colors[2]);
        }
        for (const x of [27, 43, 59])
            plate(x, 7 + (x === 43 ? -3 : 4), 10, 20);
        plate(26, 23, 44, 10);
        eye(48, 45, 14);
        plate(32, 75, 32, 9);
    }
    else if (d.shape === 6) {
        for (const sign of [-1, 1]) {
            plate(42 + sign * 26 - 9, 12, 18, 68);
            plate(42 + sign * 35 - 8, 27, 16, 38);
            plate(42 + sign * 30 - 5, 3, 10, 18);
        }
        plate(26, 31, 44, 34);
        plate(39, 15, 18, 65);
        plate(43, 3, 10, 17);
        plate(39, 78, 18, 11);
        eye(48, 46, 13);
        for (const x of [16, 72])
            rect(x, 41, 8, 6, core);
    }
    else if (d.shape === 7) {
        for (const x of [10, 51]) {
            oval(x + 17, 44, 22, 32, ink);
            oval(x + 17, 41, 18, 28, d.colors[0]);
            plate(x + 2, 23, 30, 37);
            plate(x + 5, 12, 10, 14);
            plate(x + 20, 66, 10, 17);
            eye(x + 17, 40, 8);
        }
        for (let y = 29; y < 65; y += 12)
            plate(39, y, 18, 6);
        eye(48, 57, 7);
    }
    else {
        oval(48, 47, 43, 40, ink);
        oval(48, 44, 39, 36, d.colors[0]);
        oval(46, 41, 32, 30, d.colors[1]);
        oval(48, 43, 22, 24, ink);
        for (const x of [7, 68]) {
            plate(x, 25, 21, 41);
            plate(x + 4, 11, 13, 20);
            plate(x + 3, 64, 14, 18);
        }
        plate(35, 6, 26, 13);
        plate(35, 74, 26, 14);
        eye(48, 43, 12);
        for (const sign of [-1, 1])
            plate(44 + sign * 13, 52, 8, 21);
    }
    if (phase > 0) {
        rect(29, 31, 6, 9, ink);
        rect(33, 38, 6, 8, ink);
        rect(37, 44, 5, 9, core);
        rect(39, 52, 3, 10, glow);
        if (phase > 1) {
            rect(56, 17, 8, 17, ink);
            rect(52, 30, 7, 13, core);
            rect(62, 59, 11, 12, ink);
            rect(58, 65, 9, 7, d.colors[2]);
            eye(48, 48, variant === 2 ? 13 : 9);
        }
        for (let i = 0; i < phase; i++) {
            c.clearRect(Math.round((16 + i * 52) * scale), Math.round((14 + i * 5) * scale), Math.round(13 * scale), Math.round(15 * scale));
        }
    }
    if (flash) {
        c.globalCompositeOperation = 'source-atop';
        c.fillStyle = '#fff3db';
        c.fillRect(0, 0, size, size);
    }
    cache.set(key, ca);
    return ca;
}
export function paintBoss(c, _s, e, x, y, unit, reduced = false) {
    const b = bossState(e);
    if (!b)
        return false;
    const image = bossFrame(b.design, b.variant, e.phase, reduced ? 0 : Math.floor(e.age * 5) % 3, e.flash > 0 || e.attackFlash > 0), size = image.width, worldSize = size * (b.variant === 2 ? 2.65 : 3.6);
    const landing = b.intro < .35 ? Math.max(0, (.35 - b.intro) / .35) : 0, offset = reduced ? 0 : landing * (c.canvas.height + size * unit * 3);
    const exposed = b.stun > 0 || b.recovery > 0, width = Math.max(1, Math.round(worldSize * unit)), squash = exposed ? .8 : !reduced && b.intro >= .35 && b.intro < .5 ? .85 : 1;
    c.fillStyle = '#0c101a';
    c.globalAlpha = .45;
    for (let yy = -3; yy <= 3; yy++)
        c.fillRect(Math.round(x - width * .35 + Math.abs(yy) * 2), Math.round(y + width * .3 + yy), Math.round(width * .7 - Math.abs(yy) * 4), 1);
    c.globalAlpha = b.intro < .1 ? 0 : 1;
    c.drawImage(image, Math.round(x - width / 2), Math.round(y - width / 2 - offset + (exposed ? width * .15 : 0)), width, Math.round(width * squash));
    c.globalAlpha = 1;
    if (b.intro < .8)
        return true;
    const meter = Math.max(38, Math.round(width * .65)), my = Math.round(y - width * .48 - 10);
    c.fillStyle = '#111521';
    c.fillRect(Math.round(x - meter / 2) - 1, my - 1, meter + 2, 6);
    c.fillStyle = '#574963';
    c.fillRect(Math.round(x - meter / 2), my, meter, 4);
    c.fillStyle = b.stun > 0 ? '#fff1a3' : '#ab90ef';
    c.fillRect(Math.round(x - meter / 2), my, Math.round(meter * (b.stun > 0 ? b.stun / 3.5 : b.stagger / 100)), 4);
    if (exposed) {
        const pulse = reduced || Math.floor(e.age * 8) % 2 === 0;
        c.fillStyle = pulse ? '#fff4c0' : '#e4a15c';
        for (let dy = -12; dy <= 12; dy++) {
            const half = Math.round(10 * (1 - Math.abs(dy) / 12));
            c.fillRect(Math.round(x) - half, Math.round(y) + dy, half * 2 + 1, 1);
        }
        c.fillStyle = '#402e4c';
        c.fillRect(x - 3, y - 3, 6, 6);
        for (const [dx, dy] of [[-18, 0], [18, 0], [0, -20], [0, 20]])
            c.fillRect(x + dx - 2, y + dy - 2, 4, 4);
        if (b.stun > 0)
            for (let i = 0; i < 3; i++) {
                const a = i * Math.PI * 2 / 3 + (reduced ? 0 : e.age * 2), sx = x + Math.cos(a) * 22, sy = my - 8 + Math.sin(a) * 5;
                c.fillStyle = '#fff1a3';
                c.fillRect(sx - 3, sy - 1, 7, 3);
                c.fillRect(sx - 1, sy - 3, 3, 7);
            }
    }
    return true;
}
export function paintBossArena(c, s, X, Y, unit) {
    const a = bossWorld(s).arena;
    if (!a)
        return;
    const alpha = a.release >= 0 ? Math.max(0, 1 - a.release / 1.2) : Math.min(1, a.age / .7), left = X(a.x - a.halfW), right = X(a.x + a.halfW), top = Y(a.y - a.halfH), bottom = Y(a.y + a.halfH);
    const boss = s.enemies.find(e => e.id === a.owner), phase = boss?.role === 'final' ? boss.phase : 0;
    c.fillStyle = ['#28344b', '#5a2848', '#793d30'][phase];
    c.globalAlpha = .07 * alpha;
    c.fillRect(left, top, right - left, bottom - top);
    c.globalAlpha = 1;
    if (phase > 0) {
        c.strokeStyle = phase === 1 ? '#bd82ee' : '#f0a33a';
        c.fillStyle = c.strokeStyle;
        const cut = phase === 1 ? 18 : 42, corners = [[left + cut, top + 5], [right - cut, top + 5], [right - 5, top + cut], [right - 5, bottom - cut], [right - cut, bottom - 5], [left + cut, bottom - 5], [left + 5, bottom - cut], [left + 5, top + cut]];
        for (let i = 0; i < corners.length; i++) {
            const [x0, y0] = corners[i], [x1, y1] = corners[(i + 1) % corners.length];
            pixelLine(c, x0, y0, x1, y1, 2);
        }
    }
    c.globalAlpha = .8 * alpha;
    c.fillStyle = '#695375';
    c.fillRect(left, top, right - left, 2);
    c.fillRect(left, bottom - 2, right - left, 2);
    c.fillRect(left, top, 2, bottom - top);
    c.fillRect(right - 2, top, 2, bottom - top);
    c.fillStyle = '#f3c1be';
    for (let x = left; x <= right; x += 12) {
        c.fillRect(x, top, 4, 1);
        c.fillRect(x, bottom - 1, 4, 1);
    }
    for (let y = top; y <= bottom; y += 12) {
        c.fillRect(left, y, 1, 4);
        c.fillRect(right - 1, y, 1, 4);
    }
    c.globalAlpha = 1;
    if (a.release >= 0)
        return;
    c.globalAlpha = .10 * alpha;
    c.fillStyle = '#c47a87';
    const n = Math.max(2, Math.round(18 * unit));
    for (const x of [left, right - n])
        for (let y = top; y < bottom; y += 4)
            c.fillRect(x, y, n, 2);
    c.globalAlpha = 1;
}
export function paintBossThreats(c, s, X, Y, unit, lang = 'ko', reduced = false) {
    const w = bossWorld(s);
    const arrow = (x, y) => { const xx = X(x), yy = Y(y), cx = c.canvas.width / 2, cy = c.canvas.height / 2; if (xx >= 12 && xx <= cx * 2 - 12 && yy >= 12 && yy <= cy * 2 - 12)
        return; const dx = xx - cx, dy = yy - cy, k = Math.min((cx - 18) / Math.max(.01, Math.abs(dx)), (cy - 18) / Math.max(.01, Math.abs(dy))), a = Math.atan2(dy, dx), ox = Math.round(cx + dx * k), oy = Math.round(cy + dy * k), cs = Math.cos(a), sn = Math.sin(a); c.fillStyle = '#ffe1a3'; for (let py = -9; py <= 9; py++)
        for (let px = -9; px <= 9; px++) {
            const u = px * cs + py * sn, v = -px * sn + py * cs;
            if (u >= -6 && u <= 9 && Math.abs(v) <= (9 - u) * 6 / 15)
                c.fillRect(ox + px, oy + py, 1, 1);
        } };
    for (const t of w.threats)
        if (t.age >= 0 && t.age < t.warning)
            arrow(t.sourceX, t.sourceY);
    for (const b of s.bullets)
        if (!b.reflected && (s.player.x - b.x) * b.vx + (s.player.y - b.y) * b.vy > 0 && Math.hypot(b.x - s.player.x, b.y - s.player.y) < Math.max(s.viewWidth, s.viewHeight))
            arrow(b.x, b.y);
    const strip = (x, y, angle, length, width) => {
        const n = Math.ceil(length / 9);
        for (let i = 0; i <= n; i++) {
            const d = i / n * length;
            c.fillRect(Math.round(X(x + Math.cos(angle) * d) - width * unit / 2), Math.round(Y(y + Math.sin(angle) * d) - width * unit / 2), Math.max(2, Math.round(width * unit)), Math.max(2, Math.round(width * unit)));
        }
    };
    for (const t of w.threats) {
        if (t.age < t.warning)
            continue;
        const elapsed = t.age - t.warning;
        c.fillStyle = '#f28ca2';
        c.globalAlpha = .7;
        if (t.kind === 'disk' || t.kind === 'fragment' || t.kind === 'landing') {
            const r = Math.round(t.radius * unit);
            for (let yy = -r; yy <= r; yy += 3) {
                const dx = t.kind === 'fragment' ? r - Math.abs(yy) : Math.sqrt(Math.max(0, r * r - yy * yy));
                c.fillRect(Math.round(X(t.x) - dx), Y(t.y) + yy, Math.max(1, Math.round(dx * 2)), 2);
            }
            if (t.kind === 'fragment') {
                c.fillStyle = '#ffe2aa';
                const height = (1 - Math.min(1, elapsed / .2)) * 140 * unit;
                c.fillRect(X(t.x) - 8, Y(t.y) - height - 8, 16, 16);
            }
        }
        if (t.kind === 'grasp') {
            for (let j = 0; j < 7; j++) {
                const a = t.angle - .6 + j * .2, r = t.radius * (1 - (elapsed * 1.5 % 1));
                strip(t.x + Math.cos(a) * r, t.y + Math.sin(a) * r, a + Math.PI, 35, 7);
            }
        }
        if (t.kind === 'decoy') {
            const e = s.enemies.find(e => e.id === t.owner), b = e && bossState(e);
            if (b) {
                const img = bossFrame(b.design, b.variant, e.phase), size = img.width * 2.65 * unit;
                c.globalAlpha = .25;
                c.drawImage(img, X(t.x) - size / 2, Y(t.y) - size / 2, size, size);
            }
        }
        if (t.kind === 'safezone' && w.arena) {
            const a = w.arena, r = (t.radius - elapsed * t.spin) * unit;
            c.globalAlpha = .35;
            for (let y = Y(a.y - a.halfH); y < Y(a.y + a.halfH); y += 4) {
                const dy = y - Y(t.y), gap = Math.abs(dy) < r ? Math.sqrt(r * r - dy * dy) : 0;
                for (const [lo, hi] of [[X(a.x - a.halfW), X(t.x) - gap], [X(t.x) + gap, X(a.x + a.halfW)]])
                    c.fillRect(lo, y, Math.max(0, hi - lo), 2);
            }
            c.globalAlpha = 1;
            c.fillStyle = '#ffe1a3';
            pixelRing(c, X(t.x), Y(t.y), r, 2);
        }
        if (t.kind === 'beam')
            strip(t.x, t.y, t.angle + t.spin * elapsed, t.length, t.width);
        if (t.kind === 'corridor' && w.arena) {
            const a = w.arena, center = t.y + Math.sin(elapsed * t.spin) * t.radius;
            for (const [lo, hi] of [[a.y - a.halfH, center - t.width / 2], [center + t.width / 2, a.y + a.halfH]]) {
                c.globalAlpha = .3;
                for (let y = Y(lo); y < Y(hi); y += 4)
                    c.fillRect(X(a.x - a.halfW), y, Math.round(a.halfW * 2 * unit), 2);
                c.globalAlpha = 1;
                c.fillRect(X(a.x - a.halfW), Y(lo === a.y - a.halfH ? hi : lo), Math.round(a.halfW * 2 * unit), 2);
            }
        }
        if (t.kind === 'ring') {
            const radius = t.radius + elapsed * 215;
            for (let i = 0; i < 120; i++) {
                const a = i / 120 * Math.PI * 2, delta = Math.atan2(Math.sin(a - t.angle - t.spin * elapsed), Math.cos(a - t.angle - t.spin * elapsed));
                if (Math.abs(delta) < .55)
                    continue;
                const size = Math.max(2, Math.round(t.width * unit));
                c.fillRect(X(t.x + Math.cos(a) * radius) - size / 2, Y(t.y + Math.sin(a) * radius) - size / 2, size, size);
            }
        }
        c.globalAlpha = 1;
    }
    for (const e of s.enemies) {
        const b = bossState(e);
        if (!b || b.stun > 0 || b.recovery > 0)
            continue;
        const escorts = s.enemies.filter(n => n.hp > 0 && n.escort && n.leader === e.id);
        if (!escorts.length)
            continue;
        c.fillStyle = '#9ccdf2';
        c.globalAlpha = .7;
        pixelRing(c, X(e.x), Y(e.y), e.r * 2.2 * unit, 2);
        for (const n of escorts)
            pixelLine(c, X(e.x), Y(e.y), X(n.x), Y(n.y), 2);
        c.globalAlpha = 1;
    }
    for (const r of w.remains) {
        const image = bossFrame(r.design, r.variant, 2), size = image.width * (r.variant === 2 ? 2.65 : 3.6) * unit;
        c.globalAlpha = Math.max(0, 1 - r.age / 1.6);
        for (let i = 0; i < 6; i++) {
            const col = i % 3, row = Math.floor(i / 3), angle = i / 6 * Math.PI * 2, dx = Math.cos(angle) * r.age * 110 * unit, dy = Math.sin(angle) * r.age * 90 * unit + r.age * r.age * 80 * unit;
            c.drawImage(image, col * image.width / 3, row * image.height / 2, image.width / 3, image.height / 2, Math.round(X(r.x) - size / 2 + col * size / 3 + dx), Math.round(Y(r.y) - size / 2 + row * size / 2 + dy), Math.ceil(size / 3), Math.ceil(size / 2));
        }
        c.globalAlpha = 1;
    }
    if (w.counterTime > 0 || w.hintTime > 0) {
        const counter = w.counterTime > 0, text = counter ? (lang === 'en' ? 'COUNTER!' : '반격!') : (lang === 'en' ? 'Dash in to counter!' : '파고들어 반격!'), x = c.canvas.width / 2, y = Math.max(42, c.canvas.height * .22);
        c.save();
        const label = textImage(text, counter ? 26 : 14, counter ? '#fff1a3' : '#d4e8ff'), width = label.width + 24;
        c.fillStyle = '#141624';
        c.globalAlpha = .9;
        c.fillRect(x - width / 2, y - 28, width, 38);
        c.globalAlpha = 1;
        c.drawImage(label, Math.round(x - label.width / 2), Math.round(y - label.height + 6));
        if (counter && !reduced && w.counterTime > .9) {
            c.globalAlpha = .12;
            c.fillStyle = '#fff1a3';
            c.fillRect(0, 0, c.canvas.width, c.canvas.height);
        }
        c.restore();
    }
}

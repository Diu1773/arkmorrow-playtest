import { criticalStyle, floaterPriority } from './hit-feedback.js';
import { drawSkillFields } from './combat-art.js';
import { EffectRenderer } from './vfx-art.js';
const vfx = new EffectRenderer();
import { pixelContext } from './pixel-context.js';
import { weaponFrame } from './field-art.js';
import { drawEarth, drawProps, drawMapTerrain, drawEarthEnemy, groundCrew, drawLaunch } from './expedition-art.js';
import { warningShapes, windupFrame } from './telegraph.js';
import { paintWarning } from './telegraph-art.js';
import { paintBoss, paintBossArena, paintBossThreats } from './boss-art.js';
import { combatCopy } from './i18n.js';
import { t } from './i18n.js';
import { sprite, directionFrame } from './pixel-art.js';
const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PHOTOS = ['orion.jpg', 'pleiades.jpg', 'm13.jpg', 'milkyway.jpg', 'andromeda.jpg', 'deepfield.jpg'];
export const PHOTO_PALETTE = ['#10131e', '#161c2b', '#202536', '#293146', '#34435a', '#47596b', '#647886', '#8c9ca3', '#b1b9ac', '#e0d9bd', '#30273a', '#433247', '#584053', '#704c5d', '#8c626e', '#ad8287', '#2b292f', '#40383c', '#554947', '#6c5950', '#88705c', '#a58b6b', '#c6ac85', '#e7d1a6', '#1c2b39', '#293e50', '#3b5367', '#536f82', '#7593a4', '#a3bdc5', '#c6d9da', '#f0ede0'];
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], rgb = PHOTO_PALETTE.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)));
const photoCache = new WeakMap(), combatPhotos = new WeakMap(), lowPhotos = new WeakMap(), cloudCache = new Map();
let lowQuality = false, fxPressure = 0, currentReduced = false;
let canvas, ctx, mini, mctx, launchCanvas, zoom = 1, cw = 1, ch = 1, lang = 'ko', lastTime = 0, v = { w: 1, h: 1, scale: 1, camX: 0, camY: 0, time: 0 }, unit = 1;
const word = k => t(k, lang), X = x => Math.round((x - v.camX) * unit + cw / 2), Y = y => Math.round((y - v.camY) * unit + ch / 2);
const visible = (x, y, r = 40) => Math.abs(x - v.camX) < v.w / v.scale / 2 + r && Math.abs(y - v.camY) < v.h / v.scale / 2 + r;
function setup() { const next = document.getElementById('world'); if (canvas !== next) {
    canvas = next;
    ctx = canvas ? (pixelContext(canvas) ?? canvas.getContext('2d', { alpha: false })) : null;
} mini = document.getElementById('minimap'); mctx = mini?.getContext('2d'); }
export function ditherPhoto(img) {
    if (img.pixelReady)
        return img;
    const old = photoCache.get(img);
    if (old)
        return old;
    const c = document.createElement('canvas');
    c.width = 640;
    c.height = Math.round(640 * img.height / img.width);
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0, c.width, c.height);
    const data = g.getImageData(0, 0, c.width, c.height);
    for (let y = 0; y < c.height; y++)
        for (let x = 0; x < c.width; x++) {
            const i = (y * c.width + x) * 4, d = (bayer[(y % 4) * 4 + x % 4] - 7.5) * 2;
            let best = 0, distance = Infinity;
            for (let k = 0; k < rgb.length; k++) {
                const p = rgb[k], n = (data.data[i] + d - p[0]) ** 2 + (data.data[i + 1] + d - p[1]) ** 2 + (data.data[i + 2] + d - p[2]) ** 2;
                if (n < distance) {
                    best = k;
                    distance = n;
                }
            }
            data.data[i] = rgb[best][0];
            data.data[i + 1] = rgb[best][1];
            data.data[i + 2] = rgb[best][2];
        }
    g.putImageData(data, 0, 0);
    photoCache.set(img, c);
    return c;
}
export function resize(w, h) { setup(); zoom = Math.max(1, Math.round((w < h ? Math.min(w / 195, h / 422) : h / 360))); cw = Math.ceil(w / zoom); ch = Math.ceil(h / zoom); if (canvas) {
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = cw * zoom + 'px';
    canvas.style.height = ch * zoom + 'px';
    canvas.style.left = Math.floor((w - cw * zoom) / 2) + 'px';
    canvas.style.top = Math.floor((h - ch * zoom) / 2) + 'px';
    ctx.imageSmoothingEnabled = false;
} }
function rect(x, y, w, h, c) { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); }
const lineCache = new Map();
let linePixels = 0;
function line(x, y, ex, ey, color, width = 1, dash = false) { x = Math.round(x); y = Math.round(y); ex = Math.round(ex); ey = Math.round(ey); const half = Math.floor(width / 2); if (Math.max(x, ex) + width - half < 0 || Math.min(x, ex) - half >= cw || Math.max(y, ey) + width - half < 0 || Math.min(y, ey) - half >= ch)
    return; const ddx = ex - x, ddy = ey - y, w = Math.abs(ddx) + width, h = Math.abs(ddy) + width; if (w <= 512 && h <= 512 && w * h <= 65536) {
    const key = ddx + ':' + ddy + ':' + width + ':' + color + ':' + Number(dash);
    let img = lineCache.get(key);
    if (!img) {
        img = document.createElement('canvas');
        img.width = w;
        img.height = h;
        const g = img.getContext('2d'), ox = Math.min(x, ex) - half, oy = Math.min(y, ey) - half;
        g.fillStyle = color;
        let px = x, py = y, dx = Math.abs(ddx), sx = x < ex ? 1 : -1, dy = -Math.abs(ddy), sy = y < ey ? 1 : -1, err = dx + dy, n = 0;
        for (;;) {
            if (!dash || Math.floor(n / 4) % 2 === 0)
                g.fillRect(px - half - ox, py - half - oy, width, width);
            if (px === ex && py === ey)
                break;
            const e = 2 * err;
            if (e >= dy) {
                err += dy;
                px += sx;
            }
            if (e <= dx) {
                err += dx;
                py += sy;
            }
            n++;
        }
        const pixels = img.width * img.height;
        while (lineCache.size && (lineCache.size >= 2048 || linePixels + pixels > 4194304)) {
            const first = lineCache.keys().next().value, old = lineCache.get(first);
            linePixels -= old.width * old.height;
            lineCache.delete(first);
        }
        linePixels += pixels;
        lineCache.set(key, img);
    }
    ctx.drawImage(img, Math.min(x, ex) - half, Math.min(y, ey) - half);
    return;
} let dx = Math.abs(ddx), sx = x < ex ? 1 : -1, dy = -Math.abs(ddy), sy = y < ey ? 1 : -1, err = dx + dy, n = 0; ctx.fillStyle = color; for (;;) {
    if ((!dash || Math.floor(n / 4) % 2 === 0) && x + width - half > 0 && x - half < cw && y + width - half > 0 && y - half < ch)
        ctx.fillRect(x - half, y - half, width, width);
    if (x === ex && y === ey)
        break;
    const e = 2 * err;
    if (e >= dy) {
        err += dy;
        x += sx;
    }
    if (e <= dx) {
        err += dx;
        y += sy;
    }
    n++;
} }
function wline(x, y, ex, ey, color, width = 3, dash = false) { line(X(x), Y(y), X(ex), Y(ey), color, Math.max(1, Math.round(width * unit)), dash); }
const circleCache = new Map(), arcCache = new Map();
function circleImage(radius, thick, color, dash) {
    const key = radius + ':' + thick + ':' + color + ':' + Number(dash);
    let c = circleCache.get(key);
    if (c)
        return c;
    c = document.createElement('canvas');
    const pad = Math.ceil(thick / 2) + 1;
    c.width = c.height = radius * 2 + pad * 2 + 1;
    const g = c.getContext('2d'), steps = Math.max(8, Math.ceil(TAU * radius * 1.4));
    g.fillStyle = color;
    for (let i = 0; i <= steps; i++) {
        if (dash && Math.floor(i / 5) % 2)
            continue;
        const a = i / steps * TAU;
        g.fillRect(Math.round(radius + pad + Math.cos(a) * radius) - Math.floor(thick / 2), Math.round(radius + pad + Math.sin(a) * radius) - Math.floor(thick / 2), thick, thick);
    }
    if (circleCache.size >= 256)
        circleCache.delete(circleCache.keys().next().value);
    circleCache.set(key, c);
    return c;
}
function arc(x, y, r, a, b, color, width = 3, dash = false) {
    if (a === 0 && Math.abs(b - TAU) < .0001) {
        const radius = Math.max(1, Math.round(r * unit)), thick = Math.max(1, Math.round(width * unit)), pad = Math.ceil(thick / 2) + 1;
        ctx.drawImage(circleImage(radius, thick, color, dash), X(x) - radius - pad, Y(y) - radius - pad);
        return;
    }
    const radius = r * unit, thick = Math.max(1, Math.round(width * unit)), half = Math.floor(thick / 2), pad = Math.ceil(radius + thick), key = radius.toFixed(3) + ':' + a.toFixed(3) + ':' + b.toFixed(3) + ':' + color + ':' + thick + ':' + Number(dash);
    let img = arcCache.get(key);
    if (!img) {
        img = document.createElement('canvas');
        img.width = img.height = pad * 2 + 1;
        const g = img.getContext('2d'), steps = Math.max(8, Math.ceil(Math.abs(b - a) * radius * 1.4));
        g.fillStyle = color;
        for (let i = 0; i <= steps; i++) {
            if (dash && Math.floor(i / 5) % 2)
                continue;
            const t = a + (b - a) * i / steps;
            g.fillRect(Math.round(pad + Math.cos(t) * radius) - half, Math.round(pad + Math.sin(t) * radius) - half, thick, thick);
        }
        if (arcCache.size >= 256)
            arcCache.delete(arcCache.keys().next().value);
        arcCache.set(key, img);
    }
    ctx.drawImage(img, X(x) - pad, Y(y) - pad);
}
function disk(x, y, r, color) { const cx = X(x), cy = Y(y), rr = Math.max(1, Math.round(r * unit)); ctx.fillStyle = color; for (let y = -rr; y <= rr; y++) {
    const span = Math.floor(Math.sqrt(rr * rr - y * y));
    ctx.fillRect(cx - span, cy + y, span * 2 + 1, 1);
} }
function polygon(points, color) { const ps = points.map(([x, y]) => [X(x), Y(y)]), min = Math.max(0, Math.min(...ps.map(p => p[1]))), max = Math.min(ch - 1, Math.max(...ps.map(p => p[1]))); ctx.fillStyle = color; for (let y = min; y <= max; y++) {
    const xs = [];
    for (let i = 0, j = ps.length - 1; i < ps.length; j = i++) {
        const a = ps[i], b = ps[j];
        if ((a[1] > y) !== (b[1] > y))
            xs.push(Math.round(a[0] + (y - a[1]) * (b[0] - a[0]) / (b[1] - a[1])));
    }
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2)
        ctx.fillRect(xs[i], y, xs[i + 1] - xs[i] + 1, 1);
} }
const sizedSprites = new Map(), trimmedSprites = new WeakMap();
let spriteOpacity = 1;
function trimmed(img) { let result = trimmedSprites.get(img); if (result)
    return result; const pixels = img.getContext('2d').getImageData(0, 0, img.width, img.height).data; let left = img.width, top = img.height, right = 0, bottom = 0; for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++)
        if (pixels[(y * img.width + x) * 4 + 3]) {
            left = Math.min(left, x);
            top = Math.min(top, y);
            right = Math.max(right, x);
            bottom = Math.max(bottom, y);
        } const image = document.createElement('canvas'); image.width = Math.max(1, right - left + 1); image.height = Math.max(1, bottom - top + 1); image.getContext('2d').drawImage(img, left, top, image.width, image.height, 0, 0, image.width, image.height); result = { image, x: left, y: top }; trimmedSprites.set(img, result); return result; }
function stamp(id, x, y, size, angle = 0, flame = -1, flash = false, dim = false, prep = -1) { if (!visible(x, y, size))
    return; const direction = directionFrame(angle), s = Math.max(1, Math.round(size * unit)), key = id + ':' + direction + ':' + flame + ':' + s + ':' + Number(flash) + (dim ? ':dim' : '') + (prep >= 0 ? ':prep' + prep : '') + (spriteOpacity < 1 ? ':a' + spriteOpacity : ''); let img = sizedSprites.get(key); if (!img) {
    const base = sprite(id, direction, flame);
    img = document.createElement('canvas');
    img.width = img.height = s;
    const c = img.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.globalAlpha = spriteOpacity;
    const inset = prep < 0 ? 0 : Math.floor((prep + 1) * s * .045);
    c.drawImage(flash ? whiteSprite(base) : dim ? dimSprite(base) : base, inset, 0, s - inset * 2, s);
    sizedSprites.set(key, img);
} const crop = trimmed(img); ctx.drawImage(crop.image, X(x) - Math.floor(s / 2) + crop.x, Y(y) - Math.floor(s / 2) + crop.y); }
const dims = new WeakMap();
function dimSprite(img) { let c = dims.get(img); if (c)
    return c; c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-atop'; g.fillStyle = '#10131d'; g.globalAlpha = .38; g.fillRect(0, 0, c.width, c.height); dims.set(img, c); return c; }
const whites = new WeakMap();
function whiteSprite(img) { let c = whites.get(img); if (c)
    return c; c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d'); g.drawImage(img, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff4dc'; g.fillRect(0, 0, c.width, c.height); whites.set(img, c); return c; }
const outlines = new WeakMap();
function outlined(img) { let c = outlines.get(img); if (c)
    return c; c = document.createElement('canvas'); c.width = img.width + 2; c.height = img.height + 2; const g = c.getContext('2d'), white = whiteSprite(img); for (const [x, y] of [[0, 1], [2, 1], [1, 0], [1, 2]])
    g.drawImage(white, x, y); g.drawImage(img, 1, 1); outlines.set(img, c); return c; }
let enemyOpacity = 1, crowdDim = false, layerCanvas;
function layer(draw, opacity) {
    if (ctx.pixelLayer) {
        ctx.pixelLayer(draw, opacity);
        return;
    }
    if (opacity >= 1) {
        draw();
        return;
    }
    if (!layerCanvas)
        layerCanvas = document.createElement('canvas');
    layerCanvas.pixelDynamic = true;
    if (layerCanvas.width !== cw || layerCanvas.height !== ch) {
        layerCanvas.width = cw;
        layerCanvas.height = ch;
    }
    const main = ctx, g = layerCanvas.getContext('2d');
    g.clearRect(0, 0, cw, ch);
    g.imageSmoothingEnabled = false;
    ctx = g;
    draw();
    ctx = main;
    ctx.globalAlpha = opacity;
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.globalAlpha = 1;
}
let seed = 381992;
const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const stars = Array.from({ length: 180 }, (_, i) => ({ x: rand() * 1600, y: rand() * 1100, l: i % 3, t: rand() * TAU }));
function combatPhoto(img) { let photo = combatPhotos.get(img); if (photo)
    return photo; const base = ditherPhoto(img), ca = document.createElement('canvas'); ca.width = base.width; ca.height = base.height; const g = ca.getContext('2d'); g.drawImage(base, 0, 0); const data = g.getImageData(0, 0, ca.width, ca.height); for (let i = 0; i < data.data.length; i += 4) {
    const gray = data.data[i] * .22 + data.data[i + 1] * .7 + data.data[i + 2] * .08;
    for (let c = 0; c < 3; c++)
        data.data[i + c] = Math.round(data.data[i + c] * .5 + gray * .5);
} g.putImageData(data, 0, 0); combatPhotos.set(img, ca); return ca; }
function lowPhoto(img) { let photo = lowPhotos.get(img); if (photo)
    return photo; photo = document.createElement('canvas'); photo.width = Math.min(320, img.width); photo.height = Math.max(1, Math.round(img.height * photo.width / img.width)); const g = photo.getContext('2d'); g.imageSmoothingEnabled = false; g.drawImage(img, 0, 0, photo.width, photo.height); lowPhotos.set(img, photo); return photo; }
function background(G) {
    if (G?.expedition && ['launch', 'atmosphere', 'village'].includes(G.chapter?.id)) {
        drawEarth(ctx, G, cw, ch, v.camX, v.camY, unit, v.time, lowQuality);
        return;
    }
    rect(0, 0, cw, ch, '#111620');
    const img = v.images?.[PHOTOS[G?.sector || 0]];
    if (img?.complete && img.width) {
        let photo = G ? combatPhoto(img) : ditherPhoto(img);
        if (lowQuality)
            photo = lowPhoto(photo);
        const s = Math.max(cw / photo.width, ch / photo.height) * 1.12, w = Math.round(photo.width * s), h = Math.round(photo.height * s);
        ctx.globalAlpha = G ? .3 : .78;
        ctx.drawImage(photo, Math.round((cw - w) / 2 - Math.sin(v.camX * .0002) * cw * .025), Math.round((ch - h) / 2 - Math.cos(v.camY * .0002) * ch * .025), w, h);
        ctx.globalAlpha = 1;
    }
    for (let i = 0; i < stars.length; i += lowQuality ? 2 : 1) {
        const s = stars[i], z = (s.l + 1) * .012, x = ((s.x - v.camX * z) / zoom % cw + cw) % cw, y = ((s.y - v.camY * z) / zoom % ch + ch) % ch;
        const bright = Math.sin(v.time * (.5 + s.l * .5) + s.t) > .5;
        rect(x, y, s.l === 2 && bright ? 2 : 1, 1, bright ? '#c3c9c6' : s.l ? '#687987' : '#3b4758');
        if (s.l === 2 && bright)
            rect(x, y - 1, 1, 3, '#8799a3');
    }
}
function cloud(kind) {
    let ca = cloudCache.get(kind);
    if (ca)
        return ca;
    ca = document.createElement('canvas');
    ca.width = ca.height = 96;
    const c = ca.getContext('2d'), colors = { emission: ['#51303d', '#663944', '#7b4651'], reflection: ['#293e60', '#354f78', '#496487'], dark: ['#11131e', '#191923', '#25222a'], core: ['#514637', '#74604b', '#a38d65'], elliptical: ['#4e4139', '#71604d', '#a28d6b'], spiral: ['#2f3c52', '#455875', '#798797'], irregular: ['#2b443f', '#3d5c51', '#708a66'] }[kind] || ['#293e60', '#354f78', '#496487'];
    for (let y = 0; y < 96; y++)
        for (let x = 0; x < 96; x++) {
            const dx = (x - 48) / 45, dy = (y - 48) / (kind === 'elliptical' ? 25 : 40);
            let d = dx * dx + dy * dy + (Math.sin(x * .25) + Math.sin(y * .31)) * .1;
            if (kind === 'spiral') {
                const r = Math.hypot(dx, dy);
                d = r < .25 ? r * 2 : r * .7 + Math.abs(Math.sin(Math.atan2(dy, dx) - r * 5)) * .85;
            }
            if (kind === 'irregular')
                d = Math.min((dx + .4) ** 2 + (dy + .3) ** 2, (dx - .32) ** 2 + (dy + .12) ** 2, (dx + .03) ** 2 + (dy - .4) ** 2) * 1.8 + (Math.sin(x * .4) + Math.cos(y * .36)) * .14;
            if (d > 1.1)
                continue;
            const stipple = bayer[(y % 4) * 4 + x % 4] / 16;
            if (d > .65 && stipple < (d - .6) * 2)
                continue;
            c.fillStyle = kind === 'core' && (x * 41 + y * 23) % 97 === 0 && d < .95 ? '#dfd3b4' : colors[Math.min(2, Math.floor((1.1 - d) * 2.5))];
            c.fillRect(x, y, 1, 1);
        }
    cloudCache.set(kind, ca);
    return ca;
}
function terrain(G) {
    for (const t of G.terrain || []) {
        if (!visible(t.x, t.y, (t.R || t.r) * 1.4))
            continue;
        if (t.kind === 'mark') {
            stamp('xp', t.x, t.y, 20);
            continue;
        }
        if (t.kind === 'galaxy') {
            for (const [width, color] of [[170, '#263347'], [90, '#35445c'], [32, '#67718b']])
                for (const arm of t.arms || [])
                    for (let i = 1; i < arm.length; i++)
                        wline(...arm[i - 1], ...arm[i], color, width);
            for (const arm of t.arms || [])
                for (let i = 0; i < arm.length; i += 3) {
                    const q = arm[i];
                    rect(X(q[0]) + (i * 7 % 7) - 3, Y(q[1]) + (i * 11 % 9) - 4, 1, 1, '#bcc6ca');
                }
            beam(t.x - t.bar, t.y, 0, t.bar * 2, t.bar * .6, '#5b5147');
            beam(t.x - t.bar, t.y, 0, t.bar * 2, t.bar * .17, '#b09a73');
            disk(t.x, t.y, 95, '#b9a17a');
            if (!t.sun.found) {
                stamp('xp', t.sun.x, t.sun.y, 40);
                arc(t.sun.x, t.sun.y, 60, 0, TAU, '#ffd260', 3, true);
            }
            continue;
        }
        if (t.kind === 'bluestars') {
            arc(t.x, t.y, t.r, 0, TAU, '#587395', 3, true);
            for (const s of t.stars || []) {
                rect(X(t.x + s[0]) - 1, Y(t.y + s[1]) - 1, 3, 3, '#aec4de');
                line(X(t.x + s[0]) - 3, Y(t.y + s[1]), X(t.x + s[0]) + 3, Y(t.y + s[1]), '#d7e6ec');
            }
            continue;
        }
        const img = cloud(t.kind), r = t.r || 200, w = Math.round(r * 2.3 * unit);
        ctx.globalAlpha = t.kind === 'dark' ? .96 : .7;
        ctx.drawImage(img, X(t.x) - Math.floor(w / 2), Y(t.y) - Math.floor(w / 2), w, w);
        ctx.globalAlpha = 1;
        if (t.kind !== 'dark')
            arc(t.x, t.y, r, 0, TAU, { emission: '#bc6471', reflection: '#7196c5', core: '#b6a073', elliptical: '#a98e68', spiral: '#7187a6', irregular: '#85ac8f' }[t.kind] || '#8278ac', 2, true);
    }
}
function beam(x, y, a, len, width, color) { const dx = Math.cos(a), dy = Math.sin(a), nx = -dy * width / 2, ny = dx * width / 2; polygon([[x + nx, y + ny], [x + dx * len + nx, y + dy * len + ny], [x + dx * len - nx, y + dy * len - ny], [x - nx, y - ny]], color); }
function gapAngle(gaps, width, a) { return gaps.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < width / 2); }
function ring(x, y, r, gaps, gw, color, width, warning) { const steps = Math.max(60, Math.ceil(r * unit * TAU)); for (let i = 0; i < steps; i++) {
    const a = i / steps * TAU;
    if (gapAngle(gaps, gw, a))
        continue;
    const size = Math.max(1, Math.round(width * unit));
    rect(X(x + Math.cos(a) * r) - Math.floor(size / 2), Y(y + Math.sin(a) * r) - Math.floor(size / 2), size, size, color);
} }
function hazards(G) {
    for (const h of G.hazards || []) {
        if (h.age < h.warning || h.duration <= 0)
            continue;
        const color = h.age - h.warning < 1 / 60 ? '#f4ecdc' : '#d06a79', a = h.angle || 0;
        if (h.type === 'sweep') {
            const angle = a + h.spin * (h.age - h.warning);
            beam(h.x - Math.cos(angle) * h.length, h.y - Math.sin(angle) * h.length, angle, h.length * 2, h.width, color);
            beam(h.x - Math.cos(angle) * h.length, h.y - Math.sin(angle) * h.length, angle, h.length * 2, 4, '#f4dbcc');
        }
        else if (h.type === 'shell') {
            const r = h.r0 + (h.r1 - h.r0) * clamp((h.age - h.warning) / h.duration, 0, 1);
            ring(h.x, h.y, r, h.gaps || [], h.gapW || .6, color, h.width, false);
            ring(h.x, h.y, r, h.gaps || [], h.gapW || .6, '#f4dbcc', 3, false);
        }
        else if (h.type === 'laser') {
            beam(h.x, h.y, a, h.length, h.width, color);
            beam(h.x, h.y, a, h.length, 4, '#f4dbcc');
        }
    }
}
function hpBar(e, width, y, color) { if (e.hp >= e.maxHp)
    return; const x = X(e.x) - Math.round(width * unit / 2), yy = Y(y), w = Math.max(8, Math.round(width * unit)); rect(x - 1, yy - 1, w + 2, 4, '#10131d'); rect(x, yy, w, 2, '#3c2936'); rect(x, yy, w * clamp(e.hp / e.maxHp, 0, 1), 2, color); }
function enemies(G) {
    for (const e of G.enemies || []) {
        if (e.hp <= 0 || !visible(e.x, e.y, e.r * 3))
            continue;
        const boss = e.type === 'boss' || e.type === 'decoy', angle = (e.angle || 0) + Math.PI / 2;
        ctx.globalAlpha = enemyOpacity * (e.hidden ? (e.warnTime > 0 ? .65 : .18) : e.type === 'decoy' ? .55 : 1);
        if (e.elite) {
            const i = ['swift', 'armored', 'mending', 'volatile', 'echo'].indexOf(e.prefix), color = ['#79d8f2', '#e8f1e9', '#8af0a2', '#f0a33a', '#bd82ee'][Math.max(0, i)];
            arc(e.x, e.y, e.r * 1.45, 0, TAU, color, 5);
            damage(combatCopy(lang).elites[Math.max(0, i)], e.x, e.y - e.r * 1.8, color, false);
        }
        if (e.shielded) {
            const a = directionFrame(e.angle) * TAU / 16;
            arc(e.x, e.y, e.r * 1.35, a - 1.1, a + 1.1, '#91a6b2', 6);
        }
        const prep = e.warnTime > 0 ? windupFrame(e) : -1, pull = prep < 0 ? 0 : (prep + 1) * e.r * .1, warped = vfx.distort(pull ? e.x - Math.cos(e.angle) * pull : e.x, pull ? e.y - Math.sin(e.angle) * pull : e.y), ex = warped.x, ey = warped.y;
        if (!paintBoss(ctx, G, e, X(ex), Y(ey), unit, v.reduced) && !(G.expedition && drawEarthEnemy(ctx, G, e, X(ex), Y(ey), Math.max(1, Math.round(e.r * (boss ? 3.8 : 3.5) * unit)))))
            stamp(boss ? 'boss:' + (e.bossArt ?? G.sector) + ':' + (e.phase || 0) : 'enemy:' + e.type, ex, ey, e.r * (boss ? 3.8 : 3.5), angle, -1, e.flash > 0 || e.attackFlash > 0, crowdDim && !boss, prep);
        ctx.globalAlpha = enemyOpacity;
        if (prep >= 0) {
            const a = e.action ? e.actionAngle : e.angle;
            rect(X(e.x + Math.cos(a) * e.r * .5) - 1, Y(e.y + Math.sin(a) * e.r * .5) - 1, 2, 2, prep === 2 ? '#efe7d7' : '#ba8b80');
            if (e.elite) {
                const x = X(e.x), y = Y(e.y - e.r * 1.8);
                rect(x, y - 4, 1, 2, '#ead2bd');
                rect(x, y - 1, 1, 1, '#ead2bd');
            }
        }
        if (e.status?.freeze > 0)
            arc(e.x, e.y, e.r * 1.2, 0, TAU, '#79d8f2', 4, true);
        if (e.status?.burn > 0)
            rect(X(e.x) - 2, Y(e.y - e.r) - 3, 4, 4, '#f0a33a');
        if (e.status?.shock > 0)
            rect(X(e.x) + 3, Y(e.y - e.r), 2, 4, '#f6d454');
        if (e.status?.mark > 0) {
            arc(e.x, e.y, e.r * 1.35, 0, TAU, '#bd82ee', 4, true);
            wline(e.x - 20, e.y, e.x + 20, e.y, '#bd82ee', 5);
            wline(e.x, e.y - 20, e.x, e.y + 20, '#bd82ee', 5);
        }
        if (e.stageGuard > 0)
            arc(e.x, e.y, e.r * 1.65, 0, TAU, '#ffe1f7', 4, true);
        if (e.mirror > 0) {
            ring(e.x, e.y, e.r * 1.65, [], 0, '#d8c8ee', 5, false);
        }
        if (!boss)
            hpBar(e, e.r * 2, e.y + e.r * 1.6, '#cf797b');
    }
    ctx.globalAlpha = 1;
}
function warningPart(q) {
    if (q.kind === 'sight') {
        ctx.globalAlpha = q.opacity;
        wline(q.x, q.y, q.x + Math.cos(q.angle) * q.length, q.y + Math.sin(q.angle) * q.length, '#b98286', 1 / unit);
        ctx.globalAlpha = 1;
        return;
    }
    if (q.kind === 'wall') {
        const a = q.angle, dx = Math.cos(a), dy = Math.sin(a);
        for (const [lo, hi] of [[-450, q.gap - 80], [q.gap + 80, 450]]) {
            const x = q.x + dx * 80 - dy * lo, y = q.y + dy * 80 + dx * lo;
            paintWarning(ctx, { ...q, kind: 'strip', angle: a + Math.PI / 2, length: hi - lo }, X(x), Y(y), unit);
        }
        return;
    }
    paintWarning(ctx, q, X(q.x), Y(q.y), unit);
    if (q.kind === 'ring' && q.gaps.length) {
        ctx.globalAlpha = q.flash ? 1 : q.opacity;
        for (const gap of q.gaps)
            for (const side of [-1, 1]) {
                const a = gap + side * q.gapWidth / 2, r = q.radius;
                line(X(q.x + Math.cos(a) * (r - 5)), Y(q.y + Math.sin(a) * (r - 5)), X(q.x + Math.cos(a) * (r + 5)), Y(q.y + Math.sin(a) * (r + 5)), q.flash ? '#f4ecdc' : q.color, 1);
            }
        ctx.globalAlpha = 1;
    }
}
function enemyWarnings(G, settings) { const shapes = warningShapes(G, settings.telegraphs ?? G.telegraphs ?? 'boss'); for (const q of shapes) {
    warningPart(q);
    if (!q.boss)
        continue;
    const x = X(q.sourceX), y = Y(q.sourceY);
    if (x >= 0 && x < cw && y >= 0 && y < ch)
        continue;
    const a = Math.atan2(y - ch / 2, x - cw / 2), edge = Math.min((cw / 2 - 10) / Math.max(.01, Math.abs(Math.cos(a))), (ch / 2 - 10) / Math.max(.01, Math.abs(Math.sin(a)))), cx = Math.round(cw / 2 + Math.cos(a) * edge), cy = Math.round(ch / 2 + Math.sin(a) * edge);
    for (const side of [-1, 1])
        line(cx, cy, cx - Math.cos(a + side * .65) * 6, cy - Math.sin(a + side * .65) * 6, q.flash ? '#f4ecdc' : q.color, 1);
} }
const digits = { A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'], J: ['011', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'], M: ['101', '111', '111', '101', '101'], N: ['101', '111', '111', '111', '101'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '111', '011'], R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'], Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'], 0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '111', '001', '111'], 4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'], 8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'], '-': ['000', '000', '111', '000', '000'] };
const numberCache = new Map();
function damage(text, x, y, color, big) { const s = big ? 2 : 1, key = text + ':' + color + ':' + s; let img = numberCache.get(key); if (!img) {
    img = document.createElement('canvas');
    img.width = text.length * 4 * s + 2;
    img.height = 5 * s + 2;
    const g = img.getContext('2d'), blocks = [];
    for (let k = 0; k < text.length; k++) {
        const rows = digits[text[k]];
        if (!rows)
            continue;
        for (let j = 0; j < 5; j++)
            for (let i = 0; i < 3; i++)
                if (rows[j][i] === '1')
                    blocks.push([1 + (k * 4 + i) * s, 1 + j * s]);
    }
    g.fillStyle = '#080b11';
    for (const [x, y] of blocks)
        g.fillRect(x - 1, y - 1, s + 2, s + 2);
    g.fillStyle = color;
    for (const [x, y] of blocks)
        g.fillRect(x, y, s, s);
    if (numberCache.size >= 256)
        numberCache.delete(numberCache.keys().next().value);
    numberCache.set(key, img);
} ctx.drawImage(img, X(x) - Math.floor(text.length * 4 * s / 2) - 1, Y(y) - 1); }
const blastRows = ['.......5......./......565....../.......5.......', '......555....../....5566555..../...566666665.../....5566555..../......555......', '...5.......5.../....5555555..../..5566666555.../.556668666655./..5566666555.../....5555555..../...5.......5...', '..55.......55../.5555.....5555./..555.....555../....55...55..../..555.....555../.5555.....5555./..55.......55..', '..5.........5../.....5...5...../..5.........5../.............../....5.....5....'];
const blastCache = new Map();
function blast(frame) { if (blastCache.has(frame))
    return blastCache.get(frame); const ca = document.createElement('canvas'); ca.width = ca.height = 20; const c = ca.getContext('2d'), rows = blastRows[frame].split('/'); for (let y = 0; y < rows.length; y++)
    for (let x = 0; x < rows[y].length; x++)
        if (rows[y][x] !== '.') {
            c.fillStyle = { '5': '#e1844b', '6': '#ffd878', '8': '#fff6d2' }[rows[y][x]];
            c.fillRect(x + 2, y + 5, 1, 1);
        } blastCache.set(frame, ca); return ca; }
export function consumeEvents(events) { vfx.consume(events); }
function floaters(G) {
    const list = [...(G.floaters || [])].sort(floaterPriority);
    for (const f of list.slice(0, lowQuality ? 12 : 24)) {
        if (!visible(f.x, f.y, 120))
            continue;
        const age = .65 - f.life, style = criticalStyle(age, currentReduced), heavy = f.critical || Number(f.text) >= 75, y = f.y - (f.critical ? style.lift : 0), text = f.reaction === undefined ? f.text : combatCopy(lang).reactionNames[f.reaction];
        damage(text, f.x, y, f.critical ? style.color : f.color || '#eef2f8', heavy);
        if (f.critical && style.spark) {
            const x = X(f.x) + text.length * 4 + 4, sy = Y(y) + 3, r = [2, 3, 4, 3, 2, 1][style.frame];
            rect(x - 1, sy - r, 2, r * 2 + 1, style.color);
            rect(x - r, sy - 1, r * 2 + 1, 2, '#fff4dc');
            if (style.frame % 2 === 0) {
                rect(x + r + 3, sy - 4, 1, 1, '#ffd260');
                rect(x - r - 3, sy + 4, 1, 1, '#ff746e');
            }
        }
    }
}
function darkness(G) { const p = G.player; if (!p?.inDark && !G.blackout)
    return; const cx = X(p.x), cy = Y(p.y), r = (G.blackout > 0 ? 200 : 230) * unit; for (let y = 0; y < ch; y += 4)
    for (let x = 0; x < cw; x += 4) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > r * 1.9)
            rect(x, y, 4, 4, '#090c14');
        else if (d > r * .6 && bayer[((y / 4) % 4) * 4 + (x / 4) % 4] / 16 < (d / r - .6) / 1.3)
            rect(x, y, 4, 4, '#090c14');
    } }
let miniFrame = 0;
function minimap(G) { if (!mctx || miniFrame++ % 3)
    return; const w = mini.width, h = mini.height, s = Math.min((w - 8) / G.world.w, (h - 8) / G.world.h), mx = x => Math.round((w - G.world.w * s) / 2 + x * s), my = y => Math.round((h - G.world.h * s) / 2 + y * s); mctx.imageSmoothingEnabled = false; mctx.fillStyle = '#171d2a'; mctx.fillRect(0, 0, w, h); for (const t of G.terrain || []) {
    if (t.kind === 'galaxy') {
        mctx.fillStyle = '#71809b';
        for (const arm of t.arms || [])
            for (const q of arm)
                mctx.fillRect(mx(q[0]), my(q[1]), 1, 1);
        mctx.fillStyle = '#c8ad76';
        mctx.fillRect(mx(t.x - t.bar), my(t.y) - 1, Math.max(2, Math.round(t.bar * 2 * s)), 2);
        if (!t.sun.found) {
            mctx.fillStyle = '#ffd260';
            mctx.fillRect(mx(t.sun.x) - 1, my(t.sun.y) - 1, 3, 3);
        }
        continue;
    }
    mctx.fillStyle = { emission: '#71464e', reflection: '#425877', dark: '#0a0d16', core: '#8d7960', bluestars: '#6c8baa' }[t.kind] || '#55526c';
    const r = Math.max(2, Math.round((t.r || 50) * s));
    mctx.fillRect(mx(t.x) - r, my(t.y) - r, r * 2, r * 2);
} for (const o of G.props || []) {
    if (o.broken)
        continue;
    mctx.fillStyle = o.kind === 'pad' ? '#b5a0eb' : o.kind === 'turret' ? '#a2d497' : o.hp > 0 ? '#d5ad75' : '#7e8d9f';
    const rx = Math.max(1, Math.round((o.w ? o.w / 2 : o.r) * s)), ry = Math.max(1, Math.round((o.h ? o.h / 2 : o.r) * s));
    mctx.fillRect(mx(o.x) - rx, my(o.y) - ry, rx * 2, ry * 2);
} for (const e of G.enemies || []) {
    if (e.hp <= 0)
        continue;
    mctx.fillStyle = e.type === 'boss' ? '#ffb786' : '#c26c7c';
    const k = e.type === 'boss' ? 3 : 1;
    mctx.fillRect(mx(e.x) - k, my(e.y) - k, k * 2, k * 2);
} for (const d of G.drops || []) {
    mctx.fillStyle = '#ffd260';
    mctx.fillRect(mx(d.x) - 2, my(d.y) - 2, 4, 4);
} if (G.beacon) {
    mctx.fillStyle = '#a9dfcf';
    mctx.fillRect(mx(G.beacon.x) - 2, my(G.beacon.y) - 2, 4, 4);
} mctx.fillStyle = '#edf4e9'; mctx.fillRect(mx(G.player.x) - 2, my(G.player.y) - 2, 4, 4); }
function arrows(G) { const targets = []; if (G.beacon?.hp > 0)
    targets.push([G.beacon, '#a9dfcf']); const boss = G.enemies.find(e => e.type === 'boss' && e.hp > 0); if (boss)
    targets.push([boss, '#ef8b85']); const gal = G.terrain.find(t => t.kind === 'galaxy'); if (gal && !gal.sun.found && !boss)
    targets.push([gal.sun, '#ffe08a']); for (const [e, color] of targets) {
    const x = X(e.x), y = Y(e.y);
    if (x > 20 && x < cw - 20 && y > 40 && y < ch - 45)
        continue;
    const a = Math.atan2(y - ch / 2, x - cw / 2), dx = Math.cos(a), dy = Math.sin(a), f = Math.min((cw / 2 - 20) / (Math.abs(dx) || 1), (ch / 2 - 45) / (Math.abs(dy) || 1)), px = Math.round(cw / 2 + dx * f), py = Math.round(ch / 2 + dy * f);
    line(px - dx * 7 - dy * 4, py - dy * 7 + dx * 4, px, py, color, 2);
    line(px - dx * 7 + dy * 4, py - dy * 7 - dx * 4, px, py, color, 2);
} }
const pixelImages = new Map();
let enlarged = true;
function pixelImage(id, angle = 0, scale = 1) {
    const direction = directionFrame(angle), key = id + ':' + direction + ':' + scale + ':' + spriteOpacity;
    let cached = pixelImages.get(key);
    if (!cached) {
        const base = sprite(id, direction), data = base.getContext('2d').getImageData(0, 0, base.width, base.height).data;
        let left = base.width, top = base.height, right = 0, bottom = 0;
        for (let y = 0; y < base.height; y++)
            for (let x = 0; x < base.width; x++)
                if (data[(y * base.width + x) * 4 + 3]) {
                    left = Math.min(left, x);
                    right = Math.max(right, x);
                    top = Math.min(top, y);
                    bottom = Math.max(bottom, y);
                }
        const image = document.createElement('canvas'), w = right - left + 1, h = bottom - top + 1;
        image.width = Math.max(1, Math.round(w * scale));
        image.height = Math.max(1, Math.round(h * scale));
        const c = image.getContext('2d');
        c.imageSmoothingEnabled = false;
        c.globalAlpha = spriteOpacity;
        c.drawImage(base, left, top, w, h, 0, 0, image.width, image.height);
        cached = { image, x: Math.round((left - base.width / 2) * scale), y: Math.round((top - base.height / 2) * scale) };
        if (pixelImages.size > 4096)
            pixelImages.clear();
        pixelImages.set(key, cached);
    }
    return cached;
}
function pixelStamp(id, x, y, angle = 0, scale = 1) { if (!visible(x, y, 45))
    return; const cached = pixelImage(id, angle, scale); ctx.drawImage(cached.image, X(x) + cached.x, Y(y) + cached.y); }
let batchCanvas, batchData, batchWords;
function pixelBatch(items, idFor, angleFor = () => 0, scale = 1) {
    if (ctx.backend === 'WebGL' || items.length < 64) {
        for (const b of items)
            pixelStamp(idFor(b), b.x, b.y, angleFor(b), scale);
        return;
    }
    if (!batchCanvas) {
        batchCanvas = document.createElement('canvas');
        batchCanvas.pixelDynamic = true;
    }
    if (batchCanvas.width !== cw || batchCanvas.height !== ch || !batchData) {
        batchCanvas.width = cw;
        batchCanvas.height = ch;
        batchData = batchCanvas.getContext('2d').createImageData(cw, ch);
        batchWords = new Uint32Array(batchData.data.buffer);
    }
    batchWords.fill(0);
    for (const b of items) {
        if (!visible(b.x, b.y, 45))
            continue;
        const stamp = pixelImage(idFor(b), angleFor(b), scale), im = stamp.image;
        if (!stamp.words) {
            const data = im.getContext('2d').getImageData(0, 0, im.width, im.height);
            stamp.words = new Uint32Array(data.data.buffer);
        }
        const ox = X(b.x) + stamp.x, oy = Y(b.y) + stamp.y, src = stamp.words, iw = im.width, ih = im.height;
        for (let y = Math.max(0, -oy); y < ih && y + oy < ch; y++)
            for (let x = Math.max(0, -ox); x < iw && x + ox < cw; x++) {
                const color = src[y * iw + x], alpha = color >>> 24;
                if (!alpha)
                    continue;
                const i = (y + oy) * cw + x + ox;
                if (alpha === 255 || !batchWords[i])
                    batchWords[i] = color;
                else {
                    const dst = batchWords[i], da = dst >>> 24, inv = 255 - alpha, out = alpha + da * inv / 255, f = da * inv / 255;
                    let result = (Math.round(out) << 24) >>> 0;
                    for (let k = 0; k < 3; k++) {
                        const shift = k * 8, v = Math.round((((color >>> shift) & 255) * alpha + ((dst >>> shift) & 255) * f) / out);
                        result |= v << shift;
                    }
                    batchWords[i] = result >>> 0;
                }
            }
    }
    batchCanvas.getContext('2d').putImageData(batchData, 0, 0);
    ctx.drawImage(batchCanvas, 0, 0);
}
function enemyBullet(b) { pixelStamp('bullet' + (Math.floor(v.time * 8 + (b.age || 0) * 2) % 2 === 0 ? ':spark' : ''), b.x, b.y, 0, enlarged ? 1 : .75); }
function player(G, p, settings) {
    const a = G.aimAngle ?? p.angle, d = Math.abs(Math.cos(a)) > Math.abs(Math.sin(a)) ? (Math.cos(a) > 0 ? 3 : 1) : (Math.sin(a) > 0 ? 0 : 2), frame = Math.hypot(p.vx, p.vy) > 20 ? Math.floor(v.time * 8) % 4 : 0, img = groundCrew(G.crew || 'pip', d, frame, p.flash > 0), x = X(p.x), y = Y(p.y), firing = G.muzzleTime > 0, back = Math.sin(a) < -.35;
    if (!settings.reduced)
        for (const ghost of G.dashGhosts || []) {
            ctx.globalAlpha = Math.max(0, ghost.life) * 1.4;
            ctx.drawImage(img, X(ghost.x) - 18, Y(ghost.y) - 30);
        }
    ctx.globalAlpha = 1;
    ctx.globalAlpha = p.flash > 0 ? 1 : p.invul > 0 ? (settings.reduced ? .6 : Math.floor(v.time * 16) % 2 === 0 ? .3 : 1) : 1;
    if (G.chapter?.kind !== 'ground') {
        const flicker = settings.reduced ? 0 : Math.floor(v.time * 12) % 3;
        rect(x - 11, y - 10, 5, 10, '#657182');
        rect(x + 7, y - 10, 5, 10, '#657182');
        rect(x - 10, y, 3, 5 + flicker * 2, '#f0a33a');
        rect(x + 8, y, 3, 5 + flicker * 2, '#79d8f2');
    }
    const gun = weaponFrame(G.crew || 'pip', a, firing), recoil = firing ? 2 : 0;
    const drawGun = () => ctx.drawImage(gun, x - 17 - Math.round(Math.cos(a) * recoil), y - 31 - Math.round(Math.sin(a) * recoil));
    if (back)
        drawGun();
    ctx.drawImage(img, x - 18, y - 30);
    if (!back)
        drawGun();
    if (p.invul > 0)
        arc(p.x, p.y, p.r * 1.6, 0, TAU, '#aacbd0', 2, true);
    line(x - 5, y + 2, x + 5, y + 2, '#090d18', 3);
    line(x - 4, y + 2, x + 4, y + 2, '#78e1df', 1);
    ctx.globalAlpha = 1;
}
let overlapCanvas;
function overlapRim(G, p, img, x, y) {
    const near = (G.enemies || []).filter(e => e.hp > 0 && !e.hidden && Math.abs(e.x - p.x) < e.r * 1.9 + 38 && Math.abs(e.y - p.y) < e.r * 1.9 + 38);
    if (!near.length)
        return;
    if (!overlapCanvas) {
        overlapCanvas = document.createElement('canvas');
        overlapCanvas.pixelDynamic = true;
    }
    const c = overlapCanvas;
    if (c.width !== img.width + 2 || c.height !== img.height + 2) {
        c.width = img.width + 2;
        c.height = img.height + 2;
    }
    const g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    for (const e of near) {
        const boss = e.type === 'boss' || e.type === 'decoy', size = Math.max(1, Math.round(e.r * (boss ? 3.8 : 3.5) * unit));
        g.drawImage(sprite(boss ? 'boss:' + (e.bossArt ?? G.sector) + ':' + (e.phase || 0) : 'enemy:' + e.type, directionFrame((e.angle || 0) + Math.PI / 2)), X(e.x) - Math.floor(size / 2) - x, Y(e.y) - Math.floor(size / 2) - y, size, size);
    }
    g.globalCompositeOperation = 'source-in';
    g.drawImage(outlined(img), 0, 0);
    g.globalCompositeOperation = 'destination-out';
    g.drawImage(img, 1, 1);
    g.globalCompositeOperation = 'source-in';
    g.fillStyle = '#c9ffff';
    g.fillRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'source-over';
    ctx.drawImage(c, x, y);
}
function arrivals(G) {
    if (!G.expedition || G.time >= G.swarmUntil)
        return;
    const id = G.chapter?.id, age = G.time - G.swarmStarted;
    for (const site of G.arrivalSites || []) {
        const x = X(site.x), y = Y(site.y), r = (id === 'launch' ? 35 : 65) * unit;
        if (site.age < 1) {
            arc(site.x, site.y, r / unit, 0, TAU, id === 'launch' ? '#f4c783' : '#d68661', 2, true);
            line(x - r, y, x + r, y, '#e4b382', 1);
            line(x, y - r, x, y + r, '#e4b382', 1);
            const top = y - (1 - site.age) * 150 * unit;
            if (id === 'launch') {
                rect(x - 5, top - 12, 10, 18, '#323b59');
                rect(x - 3, top - 9, 6, 8, '#c7ac75');
                line(x, top - 20, x, top - 13, '#f4cf88', 2);
            }
            else {
                rect(x - 5, top - 7, 10, 10, '#836862');
                line(x - 20, top - 35, x, top, '#e7a35e', 3);
            }
        }
        else {
            arc(site.x, site.y, r / unit, 0, TAU, '#70566d', 4);
            if (id === 'village') {
                rect(x - r / 2, y - 4, r, 8, '#161522');
                arc(site.x, site.y, r / unit * .6, 0, TAU, '#c38b68', 2);
            }
        }
    }
    if (id === 'atmosphere') {
        const side = G.swarmIndex % 2 ? 1 : -1, x = cw / 2 + side * cw * .4;
        for (let i = 0; i < 8; i++) {
            const y = (i * 47 + age * 9) % ch;
            rect(x - 20, y, 40, 12, '#4c4b75');
            line(x, y + 12, x - 5, y + 21, '#f3d789', 2);
            line(x - 5, y + 21, x + 4, y + 20, '#f3d789', 2);
        }
    }
    else if (id !== 'launch' && id !== 'village') {
        for (let i = 0; i < 18; i++) {
            const a = age * .4 + i * .35, x = cw / 2 + Math.cos(a) * (cw * .39 + i % 3 * 4), y = ch / 2 + Math.sin(a) * ch * .38;
            rect(x, y, 6 + i % 3 * 2, 3, '#778395');
            line(x, y, x - Math.sin(a) * 12, y + Math.cos(a) * 12, '#627288', 2);
        }
    }
}
export function render(G, V, settings = {}) {
    currentReduced = !!settings.reduced;
    setup();
    if (!ctx || ctx.lost)
        return;
    if (canvas.width !== Math.ceil(V.w / Math.max(1, Math.round((V.w < V.h ? Math.min(V.w / 195, V.h / 422) : V.h / 360)))) || canvas.height !== Math.ceil(V.h / Math.max(1, Math.round((V.w < V.h ? Math.min(V.w / 195, V.h / 422) : V.h / 360)))))
        resize(V.w, V.h);
    v = { ...V, reduced: settings.reduced };
    const entrance = G?.bossRecords?.at(-1), intro = entrance ? G.time - entrance.spawned : 10;
    if (intro >= 0 && intro < 1.2 && !settings.reduced)
        v.scale *= 1 + .06 * Math.sin(intro / 1.2 * Math.PI);
    lowQuality = settings.quality === 'low';
    lang = settings.lang || 'ko';
    unit = v.scale / zoom;
    vfx.bind(G, { X, Y, unit, w: cw, h: ch, time: v.time, low: lowQuality, reduced: !!settings.reduced, large: settings.largeProjectiles !== false });
    const shake = settings.reduced ? 0 : Math.min((v.shake || 0) + vfx.feedback(), 8);
    v.camX -= Math.round(shake * Math.sin(v.time * 61) / zoom) / unit;
    v.camY -= Math.round(shake * Math.cos(v.time * 49) / zoom) / unit;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = 1;
    background(G);
    lastTime = v.time;
    if (!G) {
        ctx.flush?.();
        return;
    }
    if (G.launchAge >= 0) {
        if (ctx.backend === 'WebGL') {
            launchCanvas ??= document.createElement('canvas');
            if (launchCanvas.width !== cw || launchCanvas.height !== ch) {
                launchCanvas.width = cw;
                launchCanvas.height = ch;
            }
            launchCanvas.pixelDynamic = true;
            const c = launchCanvas.getContext('2d');
            c.clearRect(0, 0, cw, ch);
            drawLaunch(c, G, cw, ch, lowQuality, settings.reduced);
            ctx.drawImage(launchCanvas, 0, 0);
            ctx.flush();
        }
        else
            drawLaunch(ctx, G, cw, ch, lowQuality, settings.reduced);
        return;
    }
    if (G.expedition) {
        if (!['launch', 'atmosphere', 'village'].includes(G.chapter?.id))
            terrain(G);
        drawMapTerrain(ctx, G, X, Y, unit);
        drawProps(ctx, G, X, Y, unit, v.time);
    }
    else {
        terrain(G);
        for (const o of G.obstacles || [])
            stamp(o.kind || 'debris', o.x, o.y, o.r * 3.2, o.angle || 0);
    }
    const right = G.world.w - 18, bottom = G.world.h - 18;
    wline(18, 18, right, 18, '#637386', 3, true);
    wline(18, 18, 18, bottom, '#637386', 3, true);
    wline(right, 18, right, bottom, '#637386', 3, true);
    wline(18, bottom, right, bottom, '#637386', 3, true);
    arrivals(G);
    paintBossArena(ctx, G, X, Y, unit);
    const crowded = (G.enemies?.length || 0) > 220 || (G.shots?.length || 0) + (G.effects?.length || 0) > 160;
    fxPressure = (G.enemies?.length || 0) > 700 ? 2 : crowded ? 1 : 0;
    ctx.globalAlpha = clamp(settings.effectsOpacity ?? .75, .1, 1) * (crowded ? .65 : 1);
    for (const [index, e] of (G.effects || []).entries())
        if (e.kind === 'ground' && (!lowQuality || index < 48))
            vfx.field(ctx, e);
    ctx.globalAlpha = 1;
    enemyOpacity = 1;
    crowdDim = crowded;
    vfx.warp(ctx);
    enemies(G);
    enlarged = settings.largeProjectiles !== false;
    const p = G.player, opacity = clamp(settings.effectsOpacity ?? .75, .1, 1) * (crowded ? .65 : 1);
    layer(() => { vfx.projectiles(ctx); vfx.effects(ctx); }, opacity);
    floaters(G);
    darkness(G);
    vfx.pickups(ctx);
    ctx.globalAlpha = opacity;
    vfx.chests(ctx);
    ctx.globalAlpha = 1;
    const b = G.beacon;
    if (b?.hp > 0) {
        stamp('beacon', b.x, b.y, b.r * 3);
        hpBar(b, b.r * 2, b.y + b.r * 1.7, '#8fc6ad');
    }
    layer(() => drawSkillFields(ctx, G, { X, Y, unit, time: v.time, reduced: settings.reduced }), opacity);
    if (p)
        player(G, p, settings);
    if (intro >= 0 && intro < 1.2) {
        ctx.globalAlpha = .2 * Math.sin(intro / 1.2 * Math.PI);
        rect(0, 0, cw, ch, '#080a16');
        ctx.globalAlpha = 1;
    }
    hazards(G);
    paintBossThreats(ctx, G, X, Y, unit, settings.lang, settings.reduced);
    enemyWarnings(G, settings);
    arrows(G);
    pixelBatch(G.bullets || [], b => 'bullet' + (Math.floor(v.time * 8 + (b.age || 0) * 2) % 2 === 0 ? ':spark' : ''), undefined, enlarged ? 1 : .75);
    minimap(G);
    ctx.flush?.();
}
export function snapshotShip(id, target) { if (!target)
    return; const c = target.getContext('2d'), img = sprite('ship:' + id, 1, 0), scale = Math.max(1, Math.floor(Math.min(target.width / 40, target.height / 32))); c.imageSmoothingEnabled = false; c.clearRect(0, 0, target.width, target.height); c.drawImage(img, Math.floor((target.width - 48 * scale) / 2), Math.floor((target.height - 48 * scale) / 2), 48 * scale, 48 * scale); }
export const shipSprite = id => sprite('ship:' + id);
export const enemySprite = (id, phase = 0) => sprite(id === 'boss' ? 'boss:' + phase : 'enemy:' + id);
export const explosionSprite = frame => blast(frame);
export const rendererInfo = () => ({ backend: ctx?.backend ?? 'Canvas2D', device: ctx?.device ?? null });

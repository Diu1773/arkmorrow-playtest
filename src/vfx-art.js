import { LEGACY_WEAPONS as WEAPONS } from './data.js';
import { EFFECT_ELEMENTS, EFFECT_SHAPES, EFFECT_READ_LIMITS, EFFECT_FPS, effectFrame, paintEffect, paintElement } from './effect-grammar.js';
export const FX_PALETTE = ['#090d18', '#1b2132', '#252d3d', '#38445a', '#526579', '#91a6b2', '#d0d8ce', '#fff4db', '#254e62', '#3da6ba', '#78e1df', '#c4f4ee', '#323d79', '#536caf', '#89b9ed', '#d2eeff', '#49335e', '#76529a', '#aa8cce', '#e3d0f2', '#543d43', '#9b5748', '#e68a4b', '#f6bf58', '#756544', '#b69b62', '#e9d699', '#fff1b0', '#264e48', '#488a67', '#83bd75', '#c2e8a0'];
export const FX_LIMITS = { bursts: 96, lowBursts: 24, particles: 240, lowParticles: 60, effects: 180, lowEffects: 48, atlases: 3, atlasSize: 1024 };
const ramps = { physical: [4, 5, 6, 7], fire: [20, 21, 22, 23], ice: [8, 9, 10, 11], electric: [24, 25, 26, 27], poison: [28, 29, 30, 31], gravity: [16, 17, 18, 19] };
const family = (id) => id === 'acid' ? 'poison' : WEAPONS.find(w => w.id === id)?.element ?? 'physical';
const ramp = (id) => ramps[family(id)];
const elementOf = (id) => id === 'acid' ? 'acid' : family(id);
const masks = [
    '..aa......./.abbbaaaa../aabbbbccca./.abbbaaaa../..aa.......',
    '...aaa...../.aabbaa..../aabccbaa.../abccccba.../.abccbaa.../..aabaa....',
    '....aa...../..aabbca.../aaabcccca../..aabbca.../....aa.....',
    '.....aaa.../....abba.../...abba..../..abccaa.../....abba.../...abba..../..aaa......',
    '...aaaaaaa./aabccccccca/...aaaaaaa.',
    '..a...a..../.aabbbaa.../aabcccbbaa/.abbcccbba./..aabbbaa../..a...a....',
    '..a....a.../.aba..aba../aabcaabca../.aba..aba../..a....a...',
    '....aa...../..aabba..../aabcccbbaa/.bbccccbb../aabcccbbaa/..aabba..../....aa.....',
    '...aaa...../..abba...../.abccba..../abccccba.../.abccba..../..abba.....',
    '..aaaa...../.abbbbaa.../abbccbbba../.abbbbaa.../..aaaa.....',
    '..aa..aa.../.abbccba.../aabbccbaa../..abbba..../...aaa.....',
    '...aaaa..../.aabbbaa.../aab..bcba../abc..bcba../.abbbaa..../..aaaa.....',
    '....a....../..a.ba...../.abbcba..../aabcccba.../abccccbba../.abbbbba...',
    '...aaa...../..abbba..../..abccba.../.abcccba.../aabcccbaa../.aabbbaa...',
    '....a....../..a.ba.a.../...bccb..../aabbccbaa../...bccb..../..a.ba.a...',
    'a.......a../ab.a.a.ba../.bbbcbbb.../..bcccb..../.bbbcbbb.../ab.a.a.ba../a.......a..',
    '..aa.aa..../.abbabba.../abccbccba../.abbabba.../..aa.aa....',
    '...acc...../...abb...../.aabbbbaa../abccccccba/.abbabbaa../..aa..aa...',
    '......aa.../.....abca../....abcca../...abcca.../..abcca..../.abcca...../.aaa.......',
    'aa.....aa../abb.a.bba../.bbcccbb.../..bcccb..../.bbcccbb.../abb.a.bba../aa.....aa..'
];
const stamps = new Map(), pages = [];
let shelfX = 0, shelfY = 0, shelfH = 0;
function bakeStamp(key, size, paint) {
    if (!pages.length || shelfY + size + 2 > FX_LIMITS.atlasSize) {
        if (pages.length === FX_LIMITS.atlases)
            throw Error('Effect atlas capacity exceeded');
        const c = document.createElement('canvas');
        Object.assign(c, { pixelExact: true });
        c.width = c.height = FX_LIMITS.atlasSize;
        pages.push(c);
        shelfX = shelfY = shelfH = 0;
    }
    if (shelfX + size + 2 > FX_LIMITS.atlasSize) {
        shelfX = 0;
        shelfY += shelfH + 2;
        shelfH = 0;
    }
    if (shelfY + size + 2 > FX_LIMITS.atlasSize) {
        shelfY = FX_LIMITS.atlasSize;
        return bakeStamp(key, size, paint);
    }
    const image = pages.at(-1), x = shelfX, y = shelfY, c = image.getContext('2d'), occupied = new Uint8Array(size * size);
    shelfX += size + 2;
    shelfH = Math.max(shelfH, size);
    let minX = size, minY = size, maxX = 0, maxY = 0;
    const dot = (dx, dy, color, w = 1, h = w) => { dx = Math.round(dx + size / 2); dy = Math.round(dy + size / 2); const left = Math.max(0, dx), top = Math.max(0, dy), right = Math.min(size, dx + w), bottom = Math.min(size, dy + h); if (right <= left || bottom <= top)
        return; minX = Math.min(minX, left); minY = Math.min(minY, top); maxX = Math.max(maxX, right); maxY = Math.max(maxY, bottom); for (let yy = top; yy < bottom; yy++)
        occupied.fill(1, yy * size + left, yy * size + right); c.fillStyle = FX_PALETTE[color]; c.fillRect(x + left, y + top, right - left, bottom - top); };
    const line = (ax, ay, bx, by, col, w = 2) => { const n = Math.max(1, Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)))); for (let i = 0; i <= n; i++)
        dot(ax + (bx - ax) * i / n, ay + (by - ay) * i / n, col, w); };
    paint({ dot, line });
    const left = Math.max(0, minX - 1), top = Math.max(0, minY - 1), right = Math.min(size, maxX + 1), bottom = Math.min(size, maxY + 1);
    c.fillStyle = FX_PALETTE[0];
    for (let yy = top; yy < bottom; yy++)
        for (let xx = left; xx < right; xx++) {
            const pos = yy * size + xx;
            if (!occupied[pos] && (xx > 0 && occupied[pos - 1] || xx < size - 1 && occupied[pos + 1] || yy > 0 && occupied[pos - size] || yy < size - 1 && occupied[pos + size]))
                c.fillRect(x + xx, y + yy, 1, 1);
        }
    minX = left;
    minY = top;
    maxX = right;
    maxY = bottom;
    stamps.set(key, { image, x, y, size, left: minX, top: minY, right: maxX, bottom: maxY });
}
function glyph(b, id, frame, tier, direction) {
    if (['flame', 'frost', 'chain', 'acid', 'blackhole'].includes(id)) {
        const a = direction * Math.PI / 4, co = Math.cos(a), si = Math.sin(a), scale = tier ? .7 : .55;
        paintElement({ dot: (x, y, c, w = 1, h = w) => b.dot((x * co - y * si) * scale, (x * si + y * co) * scale, c, Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))), line: (x, y, ex, ey, c, w = 1) => b.line((x * co - y * si) * scale, (x * si + y * co) * scale, (ex * co - ey * si) * scale, (ex * si + ey * co) * scale, c, w) }, elementOf(id), frame * 2 + tier);
        if (tier)
            b.dot(7, -6, 7, 2, 1);
        return;
    }
    const index = Math.max(0, WEAPONS.findIndex(w => w.id === id)), rows = masks[index].split('/'), colors = ramp(id), a = direction * Math.PI / 4, co = Math.cos(a), si = Math.sin(a), scale = tier ? 1.22 : 1;
    for (let y = 0; y < rows.length; y++)
        for (let x = 0; x < rows[y].length; x++)
            if (rows[y][x] !== '.') {
                const dx = (x - 5) * scale, dy = (y - rows.length / 2) * scale, k = 'abc'.indexOf(rows[y][x]);
                b.dot(dx * co - dy * si, dx * si + dy * co, colors[Math.min(3, k + Number(frame === 1))], tier ? 2 : 1);
            }
    for (let j = 0; j < 2 + tier; j++)
        b.dot(-co * (7 + j * 2) + si * ((frame + j) % 3 - 1), -si * (7 + j * 2) - co * ((frame + j) % 3 - 1), colors[j % 2], 2);
    if (tier) {
        b.dot(co * 7, -2 + si * 7, 7, 2);
        b.dot(-si * 6 + co * 2, co * 6 + si * 2, 23, 2);
    }
}
function impactArt(b, id, f, variant = 0) {
    const scale = variant ? 1.6 : 1.25;
    paintEffect({ dot: (x, y, c, w = 1, h = w) => b.dot(x * scale, y * scale, c, Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))), line: (x, y, ex, ey, c, w = 1) => b.line(x * scale, y * scale, ex * scale, ey * scale, c, w) }, elementOf(id), 'explosion', f);
}
function fieldArt(b, kind, f) {
    const id = kind === 'ground' ? 'flame' : kind === 'shatter' ? 'frost' : kind === 'mark' ? 'mark' : kind === 'tether' ? 'tether' : 'ripple', colors = ramp(id), p = f / 7;
    if (kind === 'mark') {
        for (let j = 0; j < 4; j++) {
            const a = j * Math.PI / 2 + p * .4, x = Math.cos(a) * 18, y = Math.sin(a) * 18;
            b.line(x, y, x - Math.cos(a) * 6, y - Math.sin(a) * 6, colors[2], 3);
            b.dot(x - Math.sin(a) * 3, y + Math.cos(a) * 3, colors[3], 2);
        }
        return;
    }
    if (kind === 'ground') {
        for (let j = 0; j < 20; j++) {
            const a = j * 2.4, r = 4 + Math.sqrt(j / 20) * 23;
            glyph({ dot: (x, y, c, w, h) => b.dot(x * .5 + Math.cos(a) * r, y * .5 + Math.sin(a) * r, c, w, h), line: b.line }, 'flame', f % 4, 0, 0);
        }
        return;
    }
    if (kind === 'quake') {
        for (let j = 0; j < 6; j++) {
            const a = j * Math.PI / 3, r = 8 + p * 17;
            for (let k = 0; k < 4; k++)
                b.line(Math.cos(a) * r * k / 4, Math.sin(a) * r * k / 4, Math.cos(a + .16 * (k % 2 ? 1 : -1)) * r * (k + 1) / 4, Math.sin(a + .16 * (k % 2 ? 1 : -1)) * r * (k + 1) / 4, f < 2 ? 7 : k % 2 ? 10 : 4, 2);
        }
        return;
    }
    if (kind === 'blast' || kind === 'shatter') {
        impactArt(b, kind === 'shatter' ? 'frost' : 'bomb', f, 1);
        return;
    }
    const r = kind === 'wave' ? 19 : 4 + p * 24;
    for (let j = 0; j < 24; j++) {
        if (f > 4 && (j + f) % 3 === 0)
            continue;
        const a = j * Math.PI / 12, rr = r + (j % 3 - 1) * (f > 4 ? 2 : 1), x = Math.cos(a) * rr, y = Math.sin(a) * rr;
        b.dot(x - 2, y - 2, f < 2 ? 7 : colors[j % 3 + 1], f > 5 ? 2 : 4, 3);
        if (j % 3 === 0)
            b.dot(x * 1.14, y * 1.14, 4, 2);
    }
}
function holeArt(b, f) {
    const phase = f * Math.PI / 4;
    for (let arm = 0; arm < 4; arm++)
        for (let j = 0; j < 18; j++) {
            const t = j / 18, a = arm * Math.PI / 2 + phase + t * 5, r = 43 * (1 - t), x = Math.cos(a) * r, y = Math.sin(a) * r * .58;
            b.dot(x, y, j % 4 === 0 ? 19 : j % 3 === 0 ? 18 : 17, j % 4 === 0 ? 3 : 2, 2);
        }
    for (let y = -12; y <= 12; y++) {
        const width = Math.floor(17 * Math.sqrt(1 - (y / 13) ** 2));
        b.dot(-width, y, 0, width * 2 + 1, 1);
    }
    for (let j = 0; j < 80; j++) {
        const a = j * Math.PI / 40, front = Math.sin(a) > 0, r = 24 + Math.sin(a * 3 + phase) * 2, x = Math.cos(a) * r, y = Math.sin(a) * r * .33 - 4 + Math.cos(a) * .24 * r;
        b.dot(x, y, front ? (j + f * 3) % 11 < 4 ? 19 : 18 : (j + f * 4) % 13 < 5 ? 19 : 17, front ? 3 : 2, front ? 3 : 2);
    }
    for (let j = 0; j < 10; j++) {
        const t = ((j / 10 + f / 8) % 1), a = j * 2.4 + phase + t * 2, r = 42 * (1 - t);
        b.dot(Math.cos(a) * r, Math.sin(a) * r * .6, t > .5 ? 19 : 18, 2);
    }
}
const rankColors = [6, 10, 18, 14, 23, 19];
function chestArt(b, rank, f) {
    const color = rankColors[rank], rise = f >= 4 ? (f - 3) * 3 : 0;
    b.dot(-10, 0, 0, 21, 12);
    b.dot(-9, -1, 4, 19, 10);
    b.dot(-7, 0, color, 15, 7);
    b.dot(-7, 6, 3, 15, 3);
    b.dot(-2, 1, 23, 4, 5);
    b.dot(-11 - rise / 2, -7 - rise, 0, 23, 7);
    b.dot(-10 - rise / 2, -6 - rise, color, 21, 4);
    b.dot(-8 - rise / 2, -5 - rise, 6, 17, 1);
    if (f >= 4) {
        for (let j = 0; j < 6 + rank; j++) {
            const a = j * 2.4, r = 7 + (f - 4) * 4;
            b.dot(Math.cos(a) * r, Math.sin(a) * r - rise - 5, j % 2 ? color : 7, 2);
        }
        glyph({ dot: (x, y, c, w, h) => b.dot(x * .6, y * .6 - rise - 5, c, w, h), line: b.line }, WEAPONS[(rank * 3) % 20].id, f % 4, 0, 0);
    }
}
function initialize() {
    if (pages.length)
        return;
    const jobs = [], bake = (key, size, paint) => jobs.push({ key, size, paint });
    for (const element of EFFECT_ELEMENTS)
        for (const shape of EFFECT_SHAPES)
            for (let f = 0; f < 8; f++)
                bake(`grammar:${element}:${shape}:${f}`, 32, b => paintEffect(b, element, shape, f));
    for (const w of WEAPONS)
        for (let tier = 0; tier < 2; tier++)
            for (let f = 0; f < 4; f++)
                for (let d = 0; d < 8; d++)
                    bake(`shot:${w.id}:${tier}:${f}:${d}`, 24, b => glyph(b, w.id, f, tier, d));
    for (const w of WEAPONS)
        for (let f = 0; f < 8; f++)
            bake(`hit:${w.id}:${f}`, 48, b => impactArt(b, w.id, f));
    for (const w of WEAPONS)
        for (let f = 0; f < 8; f++)
            bake(`ground:${w.id}:${f}`, 48, b => { for (let j = 0; j < 9; j++) {
                const a = j * 2.4, r = Math.sqrt((j + .5) / 9) * 15;
                paintElement({ dot: (x, y, c, ww = 1, h = ww) => b.dot(x * .5 + Math.cos(a) * r, y * .5 + Math.sin(a) * r, c, ww, h), line: (x, y, ex, ey, c, ww = 1) => b.line(x * .5 + Math.cos(a) * r, y * .5 + Math.sin(a) * r, ex * .5 + Math.cos(a) * r, ey * .5 + Math.sin(a) * r, c, ww) }, elementOf(w.id), (f + j) % 8);
            } });
    for (const kind of ['ring', 'blast', 'ripple', 'wave', 'quake', 'mark', 'resonance', 'shatter'])
        for (let f = 0; f < 8; f++)
            bake(`field:${kind}:${f}`, 64, b => fieldArt(b, kind, f));
    for (let f = 0; f < 8; f++)
        bake(`hole:${f}`, 96, b => holeArt(b, f));
    for (let f = 0; f < 8; f++)
        bake(`dust:${f}`, 48, b => { for (let j = 0; j < 9; j++) {
            const a = j * 2.4, r = 2 + f * 2, x = Math.cos(a) * r, y = Math.sin(a) * r * .35;
            b.dot(x - 2, y - 1, f > 4 ? 3 : j % 2 ? 4 : 5, Math.max(1, 5 - Math.floor(f / 2)), f > 5 ? 1 : 3);
        } });
    for (let f = 0; f < 4; f++)
        bake(`crystal:${f}`, 16, b => { for (let y = -5; y <= 5; y++) {
            const w = Math.max(1, 4 - Math.floor(Math.abs(y) * .65));
            b.dot(-w, y, 28, w * 2 + 1);
            b.dot(-w + 1, y, y < 0 ? 31 : 30, w);
        } b.dot(f % 2 ? -1 : 0, -3, 7, 2); if (f === 1) {
            b.line(-6, 0, 5, 0, 31);
            b.line(0, -6, 0, 5, 31);
        } });
    for (let electric = 0; electric < 2; electric++)
        for (let f = 0; f < 4; f++)
            for (let d = 0; d < 8; d++)
                bake(`beam:${electric}:${f}:${d}`, 32, b => { const a = d * Math.PI / 4, co = Math.cos(a), si = Math.sin(a), colors = ramp(electric ? 'chain' : 'laser'); for (let j = -12; j < 12; j += 2) {
                    const bend = electric ? Math.round(Math.sin(j * 1.3 + f * 2) * 2) : 0, x = co * j - si * bend, y = si * j + co * bend;
                    b.dot(x - 1, y - 1, colors[1], 4, 4);
                    b.dot(x, y, colors[3], 2);
                    if (electric && (j + f) % 5 === 0)
                        b.dot(x - si * 4, y + co * 4, colors[2], 2);
                } });
    for (let rank = 0; rank < 6; rank++)
        for (let f = 0; f < 8; f++)
            bake(`chest:${rank}:${f}`, 48, b => chestArt(b, rank, f));
    for (let reaction = 0; reaction < 6; reaction++)
        for (let f = 0; f < 8; f++)
            bake(`reaction:${reaction}:${f}`, 64, b => {
                const id = ['frost', 'blackhole', 'tether', 'acid', 'frost', 'chain'][reaction];
                if (reaction === 1) {
                    holeArt({ dot: (x, y, c, w, h) => b.dot(x * .55, y * .55, c, w, h), line: b.line }, 7 - f);
                    if (f > 3)
                        fieldArt(b, 'blast', f - 2);
                }
                else if (reaction === 4) {
                    for (let j = 0; j < 8; j++) {
                        const a = j * 2.4, r = 4 + f * 2;
                        b.dot(Math.cos(a) * r, Math.sin(a) * r - f * 2, f < 2 ? 15 : 4, 5 - f % 3, 4);
                    }
                    if (f < 4)
                        impactArt(b, id, f);
                }
                else {
                    impactArt(b, id, f, 1);
                    if (reaction === 3 && f < 6)
                        impactArt(b, 'flame', Math.min(7, f + 1));
                    if (reaction === 5)
                        fieldArt(b, 'ring', f);
                }
            });
    for (const job of jobs.sort((a, b) => b.size - a.size))
        bakeStamp(job.key, job.size, job.paint);
}
export function vfxSprite(key) { initialize(); const s = stamps.get(key); if (!s)
    throw Error('Unknown effect frame: ' + key); return s; }
export const atlasInfo = () => ({ pages: pages.length, frames: stamps.size, bytes: pages.length * FX_LIMITS.atlasSize ** 2 * 4 });
export class EffectRenderer {
    bursts = [];
    scene = null;
    clock = 0;
    pickupValue = 0;
    pickupAt = 0;
    drops = new WeakMap();
    p;
    upgraded = new Map();
    holes = [];
    low = false;
    cells = new Map();
    selected = new Set();
    pressure = false;
    warpImage;
    warpFrame = -1;
    warpScene = null;
    bind(scene, p) {
        if (scene !== this.scene || p.time < this.clock) {
            this.bursts.length = 0;
            this.drops = new WeakMap();
            this.pickupValue = 0;
            this.pickupAt = 0;
        }
        this.scene = scene;
        this.p = p;
        this.clock = p.time;
        this.low = p.low;
        this.holes = scene?.effects.filter(e => e.kind === 'gravity').slice(0, p.low ? 3 : 8) ?? [];
        this.upgraded.clear();
        for (const w of scene?.weapons ?? [])
            this.upgraded.set(w.id, w.fusion ? 2 : w.evolved ? 1 : 0);
        this.cells.clear();
        this.selected.clear();
        this.pressure = (scene?.shots.length ?? 0) + (scene?.effects.length ?? 0) > 160;
        const occupied = new Map(), fieldLimit = p.low ? EFFECT_READ_LIMITS.lowFields : EFFECT_READ_LIMITS.fields;
        for (const e of [...(scene?.effects ?? [])].sort((a, b) => b.radius - a.radius)) {
            if (!this.visible(e.x, e.y, e.radius * p.unit + 40))
                continue;
            const key = Math.floor(p.X(e.x) / EFFECT_READ_LIMITS.cell) + ':' + Math.floor(p.Y(e.y) / EFFECT_READ_LIMITS.cell), n = occupied.get(key) ?? 0;
            if (this.selected.size >= fieldLimit || n >= EFFECT_READ_LIMITS.fieldsPerCell)
                continue;
            this.selected.add(e);
            occupied.set(key, n + 1);
        }
        const limit = p.low ? FX_LIMITS.lowBursts : FX_LIMITS.bursts;
        this.bursts = this.bursts.filter(b => p.time - b.birth < (b.kind === 'chest' ? 1.1 : .64)).slice(-limit);
        for (const d of scene?.drops ?? [])
            if (!this.drops.has(d))
                this.drops.set(d, p.time);
    }
    consume(events) {
        for (const e of events) {
            if (e.kind === 'pickup') {
                if (this.clock - this.pickupAt > .25)
                    this.pickupValue = 0;
                this.pickupValue += e.value;
                this.pickupAt = this.clock;
                continue;
            }
            if (!['hit', 'kill', 'reaction', 'chest', 'impact', 'level', 'evolve'].includes(e.kind))
                continue;
            const b = { kind: e.kind, x: e.x, y: e.y, birth: this.clock, value: e.value, weapon: e.weapon ?? 'pulse', size: e.size ?? 20, tier: this.upgraded.get(e.weapon ?? 'pulse') ?? 0 };
            const limit = this.low ? FX_LIMITS.lowBursts : FX_LIMITS.bursts;
            if (this.bursts.length >= limit) {
                if (e.kind === 'hit' || e.kind === 'kill')
                    continue;
                const replace = this.bursts.findIndex(x => x.kind === 'hit' || x.kind === 'kill');
                if (replace < 0)
                    this.bursts.shift();
                else
                    this.bursts.splice(replace, 1);
            }
            this.bursts.push(b);
        }
    }
    effect(ctx, spec, x, y, age, loop = false) {
        const f = effectFrame(spec, age, loop, this.p?.reduced ?? false);
        this.draw(ctx, `grammar:${spec.element}:${spec.shape}:${f}`, x, y, spec.size);
    }
    draw(ctx, key, x, y, size) {
        const n = Math.max(1, Math.round(size ?? vfxSprite(key).size));
        if (this.pressure && n <= 40 && !key.startsWith('crystal:')) {
            const cell = Math.floor(x / EFFECT_READ_LIMITS.cell) + ':' + Math.floor(y / EFFECT_READ_LIMITS.cell), count = this.cells.get(cell) ?? 0;
            if (count >= EFFECT_READ_LIMITS.smallPerCell)
                return;
            this.cells.set(cell, count + 1);
        }
        const s = vfxSprite(key), left = Math.max(0, Math.ceil(s.left * n / s.size - .5)), top = Math.max(0, Math.ceil(s.top * n / s.size - .5)), right = Math.min(n, Math.ceil(s.right * n / s.size - .5)), bottom = Math.min(n, Math.ceil(s.bottom * n / s.size - .5));
        if (right <= left || bottom <= top)
            return;
        const scale = s.size / n;
        ctx.drawImage(s.image, s.x + left * scale, s.y + top * scale, (right - left) * scale, (bottom - top) * scale, Math.round(x - n / 2) + left, Math.round(y - n / 2) + top, right - left, bottom - top);
    }
    visible(x, y, r = 32) { const xx = this.p.X(x), yy = this.p.Y(y); return xx > -r && xx < this.p.w + r && yy > -r && yy < this.p.h + r; }
    frame(age = 0, loop = false) { return this.p.reduced ? 2 : loop ? Math.floor(this.p.time * (this.p.low ? 6 : 12)) % 4 : Math.min(7, Math.max(0, Math.floor(age * 14))); }
    distort(x, y) { for (const e of this.holes) {
        const dx = x - e.x, dy = y - e.y, d = Math.hypot(dx, dy), r = e.radius;
        if (d < r && d > 10) {
            const n = (1 - d / r) * Math.min(18, r * .09);
            return { x: x - dy / d * n, y: y + dx / d * n };
        }
    } return { x, y }; }
    warp(ctx) {
        if (this.p.reduced)
            return;
        const holes = this.holes.filter(e => this.visible(e.x, e.y, e.radius * this.p.unit)).slice(0, this.p.low ? 1 : 2).map(e => ({ x: this.p.X(e.x), y: this.p.Y(e.y), r: Math.min(100, Math.round(e.radius * this.p.unit)), phase: this.p.time }));
        if (!holes.length)
            return;
        const w = this.p.w, h = this.p.h;
        const draw = (copy) => {
            for (const hole of holes)
                for (let y = Math.max(0, hole.y - hole.r); y < Math.min(h, hole.y + hole.r); y += 12)
                    for (let x = Math.max(0, hole.x - hole.r); x < Math.min(w, hole.x + hole.r); x += 12) {
                        const dx = x - hole.x, dy = y - hole.y, d = Math.hypot(dx, dy);
                        if (d < 8 || d > hole.r)
                            continue;
                        const pull = (1 - d / hole.r) * 5, ox = Math.round(-dy / d * pull), oy = Math.round(dx / d * pull), ww = Math.min(12, w - x), hh = Math.min(12, h - y), sx = Math.max(0, Math.min(w - ww, x + ox)), sy = Math.max(0, Math.min(h - hh, y + oy));
                        copy(sx, sy, ww, hh, x, y);
                    }
        };
        const frame = Math.floor(this.p.time * (this.p.low ? 6 : 12));
        if (ctx.pixelWarp) {
            ctx.pixelWarp(draw, this.scene, frame);
            return;
        }
        this.warpImage ??= document.createElement('canvas');
        const image = this.warpImage;
        if (image.width !== w || image.height !== h || this.warpScene !== this.scene || this.warpFrame !== frame) {
            image.width = w;
            image.height = h;
            image.getContext('2d').drawImage(ctx.canvas, 0, 0);
            this.warpFrame = frame;
            this.warpScene = this.scene;
        }
        draw((sx, sy, ww, hh, x, y) => ctx.drawImage(image, sx, sy, ww, hh, x, y, ww, hh));
    }
    feedback() { if (this.p.reduced)
        return 0; let n = 0; for (const b of this.bursts) {
        const age = this.p.time - b.birth;
        if (age < .12 && ['reaction', 'chest', 'impact'].includes(b.kind) && this.visible(b.x, b.y))
            n = Math.max(n, (1 - age / .12) * (b.kind === 'chest' ? 1 + b.value * .3 : 1.5));
    } for (const d of this.scene?.drops ?? []) {
        const age = this.p.time - (this.drops.get(d) ?? 0);
        if (age > .58 && age < .72 && this.visible(d.x, d.y))
            n = Math.max(n, 1.2);
    } return n; }
    projectiles(ctx) {
        const p = this.p, s = this.scene;
        if (!s)
            return;
        const frame = this.frame(0, true), size = p.large ? 24 : 18;
        for (const shot of s.shots) {
            if (!this.visible(shot.x, shot.y))
                continue;
            const x = p.X(shot.x), y = p.Y(shot.y), cell = Math.floor(x / EFFECT_READ_LIMITS.cell) + ':' + Math.floor(y / EFFECT_READ_LIMITS.cell);
            if (this.pressure && (this.cells.get(cell) ?? 0) >= EFFECT_READ_LIMITS.smallPerCell)
                continue;
            const tier = Number((this.upgraded.get(shot.weapon) ?? 0) > 0), dir = (Math.round(Math.atan2(shot.vy, shot.vx) / (Math.PI / 4)) + 8) % 8, key = `shot:${shot.weapon}:${tier}:${frame}:${dir}`;
            if (!p.low && !p.reduced && !this.pressure && s.shots.length < 300) {
                const a = Math.atan2(shot.vy, shot.vx);
                this.draw(ctx, key, x - Math.round(Math.cos(a) * 6), y - Math.round(Math.sin(a) * 6), Math.round(size * .6));
            }
            this.draw(ctx, key, x, y, size + (tier ? 4 : 0));
            if (this.upgraded.get(shot.weapon) === 2 && !this.pressure)
                this.effect(ctx, { element: shot.weapon === 'missile' ? 'gravity' : shot.weapon === 'flame' ? 'acid' : elementOf(shot.weapon), shape: 'ring', size: 36, duration: 1 }, x, y, p.time, true);
        }
        if (s.player.orbitCount)
            for (let i = 0; i < s.player.orbitCount; i++) {
                const a = s.orbitAngle + i * Math.PI * 2 / s.player.orbitCount;
                this.draw(ctx, `shot:orbit:${Number((this.upgraded.get('orbit') ?? 0) > 0)}:${frame}:0`, p.X(s.player.x + Math.cos(a) * s.player.orbitRadius), p.Y(s.player.y + Math.sin(a) * s.player.orbitRadius), size);
            }
    }
    field(ctx, e) {
        const p = this.p;
        if (!this.selected.has(e) || e.kind === 'splitwarn' || e.kind === 'level' || this.scene?.combatFields.some(field => field.id === 'stasis' && field.visual === e) || !this.visible(e.x, e.y, e.radius * p.unit + 40))
            return;
        const age = e.life - e.ttl, tier = this.upgraded.get(e.weapon) ?? 0, f = this.frame(age), loop = this.frame(0, true), x = p.X(e.x), y = p.Y(e.y), radius = Math.max(8, Math.round(e.radius * p.unit));
        if (e.kind === 'gravity') {
            const intro = Math.min(1, .5 + age * 4), out = Math.min(1, .5 + e.ttl * 3);
            this.draw(ctx, `hole:${p.reduced ? 2 : Math.floor(p.time * (p.low ? 6 : 12)) % 8}`, x, y, Math.min(300, Math.max(52, radius * 1.9)) * intro * out);
            if (tier === 2 && !p.low)
                this.draw(ctx, `field:resonance:${2 + loop}`, x, y, radius * 2.2);
            return;
        }
        if (e.kind === 'line' || e.kind === 'tether') {
            const ex = p.X(e.x2), ey = p.Y(e.y2), dx = ex - x, dy = ey - y, length = Math.hypot(dx, dy), steps = Math.min(p.low ? 16 : 32, Math.max(1, Math.ceil(length / 16))), electric = e.weapon === 'chain' || e.kind === 'tether', direction = (Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) + 8) % 8;
            for (let j = 0; j <= steps; j++) {
                const t = j / steps, bend = electric && j > 0 && j < steps ? Math.sin(j * 2.1 + loop * 3) * 3 : 0;
                this.draw(ctx, `beam:${Number(electric)}:${loop}:${direction}`, x + dx * t - dy / (length || 1) * bend, y + dy * t + dx / (length || 1) * bend, 32 + tier * 4);
            }
            this.draw(ctx, `hit:${e.weapon}:${f}`, ex, ey, 32 + tier * 6);
            return;
        }
        if (e.kind === 'mine' || e.kind === 'turret') {
            this.draw(ctx, `shot:${e.weapon}:${Number(tier > 0)}:${loop}:0`, x, y, 26 + tier * 6);
            return;
        }
        if (e.kind === 'ground') {
            this.draw(ctx, e.ttl < .2 ? `hit:${e.weapon}:${e.ttl < .1 ? 7 : 6}` : `ground:${e.weapon}:${p.reduced ? 2 : Math.floor(p.time * EFFECT_FPS[elementOf(e.weapon)]) % 8}`, x, y, Math.min(560, radius * 2) * (age < .1 ? .6 + age * 4 : 1));
            if (tier === 2 && !this.pressure)
                this.effect(ctx, { element: e.weapon === 'flame' ? 'acid' : elementOf(e.weapon), shape: 'ring', size: Math.max(24, Math.min(240, radius * 2)), duration: 1 }, x, y, p.time, true);
            return;
        }
        if (['blast', 'shatter', 'ripple', 'wave'].includes(e.kind)) {
            this.effect(ctx, { element: e.kind === 'shatter' ? 'ice' : elementOf(e.weapon), shape: e.kind === 'wave' ? 'ring' : 'explosion', size: Math.min(240, Math.max(24, radius * 2)), duration: Math.max(.1, e.life) }, x, y, age, e.kind === 'wave');
            return;
        }
        const kind = e.kind === 'evolve' ? 'ring' : e.kind;
        const phase = e.ttl < .16 ? e.ttl < .08 ? 7 : 6 : ['wave', 'mark', 'resonance'].includes(kind) ? age < .12 ? 0 : 2 + loop : f;
        this.draw(ctx, `field:${kind}:${phase}`, x, y, Math.min(560, Math.max(24, radius * 2)));
        if (tier && !p.low)
            this.draw(ctx, `hit:${e.weapon}:${Math.min(7, f + 1)}`, x, y, 36 + tier * 12);
    }
    effects(ctx) {
        const s = this.scene, p = this.p;
        if (!s)
            return;
        const limit = p.low ? FX_LIMITS.lowEffects : FX_LIMITS.effects;
        for (let i = 0; i < Math.min(limit, s.effects.length); i++)
            if (s.effects[i].kind !== 'ground')
                this.field(ctx, s.effects[i]);
        for (const b of this.bursts) {
            const age = p.time - b.birth, f = this.frame(age);
            if (!this.visible(b.x, b.y, 100) || b.kind === 'chest')
                continue;
            const x = p.X(b.x), y = p.Y(b.y);
            if (b.kind === 'reaction')
                this.draw(ctx, `reaction:${b.value}:${f}`, x, y, 80);
            else if (b.kind === 'level' || b.kind === 'evolve')
                this.draw(ctx, `field:ring:${f}`, x, y, 90 + f * 12);
            else if (b.kind === 'impact') {
                this.draw(ctx, `hit:${b.weapon}:${f}`, x, y, Math.min(220, Math.max(64, b.size * p.unit * 2)));
                if (b.weapon === 'blackhole') {
                    this.draw(ctx, `field:ring:${f}`, x, y, 80 + f * 20);
                    for (let j = 0; j < 8; j++) {
                        const a = j * Math.PI / 4;
                        this.draw(ctx, `crystal:${f % 4}`, x + Math.cos(a) * age * 110, y + Math.sin(a) * age * 70, 10);
                    }
                }
            }
            else if (b.kind === 'kill')
                this.draw(ctx, `dust:${f}`, x, y, 32 + b.tier * 10);
            else
                this.draw(ctx, `hit:${b.weapon}:${f}`, x, y, 36 + b.tier * 10);
        }
        for (let i = 0; i < Math.min(s.particles.length, this.pressure ? 0 : p.low ? FX_LIMITS.lowParticles : FX_LIMITS.particles); i++) {
            const q = s.particles[i];
            if (!this.visible(q.x, q.y, 10))
                continue;
            const f = this.frame((1 - q.life / q.maxLife) * .5), id = q.inward ? 'blackhole' : q.color === '#79d8f2' ? 'frost' : q.color === '#f0a33a' ? 'flame' : q.color === '#f6d454' ? 'chain' : 'pulse';
            this.draw(ctx, `hit:${id}:${f}`, p.X(q.x), p.Y(q.y), Math.min(14, 4 + q.r * 2));
        }
    }
    pickups(ctx) {
        const p = this.p;
        for (const g of this.scene?.pickups ?? []) {
            if (!this.visible(g.x, g.y, 14))
                continue;
            if (g.kind === 'heal') {
                const x = p.X(g.x), y = p.Y(g.y);
                ctx.fillStyle = FX_PALETTE[0];
                ctx.fillRect(x - 5, y - 5, 11, 11);
                ctx.fillStyle = FX_PALETTE[30];
                ctx.fillRect(x - 4, y - 4, 9, 9);
                ctx.fillStyle = FX_PALETTE[7];
                ctx.fillRect(x - 1, y - 3, 3, 7);
                ctx.fillRect(x - 3, y - 1, 7, 3);
                continue;
            }
            const x = p.X(g.x), y = p.Y(g.y), f = p.reduced ? 2 : Math.floor((p.time + g.x * .01) * 8) % 4;
            if (g.pull && !p.reduced) {
                const dx = p.X(this.scene.player.x) - x, dy = p.Y(this.scene.player.y) - y, d = Math.hypot(dx, dy) || 1;
                for (let j = 1; j <= (p.low ? 1 : 3); j++) {
                    ctx.fillStyle = FX_PALETTE[29 + (j === 1 ? 1 : 0)];
                    ctx.fillRect(Math.round(x - dx / d * j * 3), Math.round(y - dy / d * j * 3), 2, 2);
                }
            }
            this.draw(ctx, `crystal:${f}`, x, y, g.cluster || g.value >= 12 ? 16 : 12);
        }
        if (this.pickupValue >= 12 && p.time - this.pickupAt < .22 && !p.reduced) {
            const strength = Math.min(1, this.pickupValue / 80) * (1 - (p.time - this.pickupAt) / .22);
            ctx.fillStyle = FX_PALETTE[30];
            for (let x = 0; x < p.w; x += 6)
                ctx.fillRect(x, p.h - 2 - Math.round(strength * (x % 17)), 4, 2);
        }
    }
    chests(ctx) {
        const p = this.p;
        for (const d of this.scene?.drops ?? []) {
            if (!this.visible(d.x, d.y, 140))
                continue;
            const age = p.time - (this.drops.get(d) ?? p.time), rank = d.rank ?? 0, x = p.X(d.x), y = p.Y(d.y), fall = p.reduced ? 0 : Math.max(0, 1 - age / .6), width = Math.round(6 + (1 - fall) * 16);
            ctx.fillStyle = FX_PALETTE[0];
            ctx.fillRect(x - Math.floor(width / 2), y + 5, width, 3);
            if (!fall) {
                ctx.fillStyle = FX_PALETTE[rankColors[rank]];
                const height = 24 + rank * 9;
                for (let j = 0; j < (p.low ? 2 : 3 + rank); j++)
                    ctx.fillRect(x - 3 + j % 3 * 2, y - height + j * 6, rank >= 4 ? 3 : 2, height - j * 6);
                if (!p.reduced && age < .95)
                    this.draw(ctx, `dust:${Math.min(7, Math.floor((age - .6) * 22))}`, x, y + 5, 50 + rank * 3);
            }
            this.draw(ctx, `chest:${rank}:${this.frame(0, true)}`, x + (!p.reduced && age > .6 && age < .8 ? Math.round(Math.sin(age * 80) * 2) : 0), y - Math.round(fall * fall * 160), 48);
            if (fall && !p.low) {
                ctx.fillStyle = FX_PALETTE[4];
                for (let j = 0; j < 3; j++)
                    ctx.fillRect(x - 8 + j * 7, y - Math.round(fall * fall * 160) - 20 - j * 7, 2, 5);
            }
        }
        for (const b of this.bursts)
            if (b.kind === 'chest' && this.visible(b.x, b.y, 120)) {
                const age = p.time - b.birth, f = Math.min(7, 4 + Math.floor(age * 5)), rank = Math.max(0, Math.min(5, b.value));
                this.draw(ctx, `chest:${rank}:${f}`, p.X(b.x), p.Y(b.y), 48);
                this.draw(ctx, `field:ring:${this.frame(age)}`, p.X(b.x), p.Y(b.y), 50 + rank * 9);
            }
    }
    counts() { return { bursts: this.bursts.length, limit: this.low ? FX_LIMITS.lowBursts : FX_LIMITS.bursts, visibleFields: this.selected.size, largestField: Math.max(0, ...[...this.selected].map(e => e.radius)), smallCells: Object.fromEntries(this.cells), ...atlasInfo() }; }
}

export const EFFECT_ELEMENTS = ['fire', 'ice', 'electric', 'gravity', 'physical', 'acid', 'time'];
export const EFFECT_SHAPES = ['projectile', 'explosion', 'field', 'beam', 'ring', 'dash', 'summon'];
export const EFFECT_FPS = { fire: 16, ice: 6, electric: 24, gravity: 12, physical: 14, acid: 8, time: 4 };
export const EFFECT_READ_LIMITS = { cell: 64, smallPerCell: 6, fieldsPerCell: 2, fields: 48, lowFields: 24 };
export function effect(element, shape, size, duration) {
    if (!EFFECT_ELEMENTS.includes(element) || !EFFECT_SHAPES.includes(shape))
        throw Error('Unknown effect combination');
    if (!Number.isFinite(size) || size < 1 || size > 560 || !Number.isFinite(duration) || duration <= 0 || duration > 60)
        throw Error('Invalid effect dimensions');
    return Object.freeze({ element, shape, size, duration });
}
export function effectFrame(spec, age, loop = false, reduced = false) {
    if (reduced)
        return 2;
    const tick = Math.max(0, Math.floor(age * EFFECT_FPS[spec.element]));
    return loop ? tick % 8 : Math.min(7, Math.floor(Math.max(0, age) / spec.duration * 8));
}
export function paintElement(b, element, f) {
    if (element === 'fire') {
        const sway = [0, 1, 2, 1, -1, -2, -1, 0][f], height = [7, 9, 11, 8, 10, 7, 9, 6][f];
        for (let y = 0; y < height; y++) {
            const w = Math.max(1, Math.floor((height - y) / 3)), x = Math.round(sway * y / height);
            b.dot(x - w, 4 - y, 21, w * 2 + 1, 1);
            if (y < height - 2)
                b.dot(x - w + 1, 4 - y, 22, Math.max(1, w * 2 - 1), 1);
            if (y < 4)
                b.dot(x, 3 - y, 23, 1, 1);
        }
        b.dot(-4, 1, 22, 2, 3);
        b.dot(3, -2 - f % 3, 21, 2, 3);
        if (f > 4)
            b.dot(sway, -height - 1, 4, 2, 2);
    }
    else if (element === 'ice') {
        const points = [[-3, -6], [2, -6], [5, -1], [2, 5], [-3, 5], [-6, -1]];
        for (let j = 0; j < 6; j++) {
            const a = points[j], z = points[(j + 1) % 6];
            b.line(a[0], a[1], z[0], z[1], 9, 1);
        }
        b.line(-3, -5, 1, -1, 11, 2);
        b.line(1, -1, 1, 4, 10, 2);
        b.line(1, -1, 4, -1, 11, 1);
        b.dot(-2, 0, 10, 2, 3);
        b.dot(-2 + f % 4, -3 + Math.floor(f / 4), 7, 1, 1);
        if (f > 3) {
            b.dot(-8 - f % 2, -5, 11, 2, 1);
            b.dot(5, 5 + f % 2, 9, 2, 2);
        }
    }
    else if (element === 'electric') {
        const shift = f % 2 ? 2 : -1, col = f % 3 === 2 ? 25 : 27;
        b.line(3 + shift, -8, -3, -1, col, 2);
        b.line(-3, -1, 3, 0, col, 2);
        b.line(3, 0, -4 - shift, 7, col, 2);
        if (f % 2 === 0) {
            b.line(0, -2, 6, -3, 7, 1);
            b.line(6, -3, 8, -6, 26, 1);
            b.dot(-7, 2, 7, 2, 1);
        }
    }
    else if (element === 'gravity') {
        for (let arm = 0; arm < 3; arm++)
            for (let j = 0; j < 14; j++) {
                const t = j / 14, a = arm * Math.PI * 2 / 3 + f * Math.PI / 4 + t * 5, r = 13 * (1 - t);
                b.dot(Math.cos(a) * r, Math.sin(a) * r * .62, j % 4 === 0 ? 19 : 17, 2, 1);
            }
        b.dot(-4, -3, 0, 9, 7);
        b.line(-5, 1, 2, 3, 18, 2);
        b.line(2, 3, 7, 0, 19, 1);
    }
    else if (element === 'acid') {
        for (let j = 0; j < 3; j++) {
            const x = j * 5 - 5, y = 3 - ((f + j * 2) % 6), r = j === 1 ? 3 : 2;
            b.dot(x - r, y - r, 29, r * 2 + 1, r * 2 + 1);
            b.dot(x - r + 1, y - r + 1, 31, r, 1);
            b.dot(x - 1, y, 30, r, 2);
        }
        b.dot(-7, 5, 29, 14, 2);
        if (f > 4)
            b.dot(6, -6, 31, 2, 1);
    }
    else if (element === 'time') {
        for (let j = 0; j < 12; j++) {
            const a = j * Math.PI / 6;
            b.dot(Math.cos(a) * 11, Math.sin(a) * 11, 5, j % 3 ? 1 : 2, 2);
        }
        b.line(0, 0, 0, -7, 6, 1);
        b.line(0, 0, 5, 2, 5, 1);
        b.dot(-7, -3, 4, 2, 2);
        b.dot(5, -6, 6, 1, 1);
        b.dot(-4, 6, 5, 1, 1);
        b.dot(-2, -1, 6, 2, 2);
        b.dot(10 - f % 4, -7, 4 + f % 3, 1, 2);
    }
    else {
        b.line(-5 - f % 3, 0, 5 + f % 2, 0, 7, 2);
        b.line(0, -5, 0, 4, 6, 1);
        b.line(-3, -3, 3, 3, 5, 1);
        for (let j = 0; j < 3; j++)
            b.dot(-7 + j * 6, 5 + f % 3, 4 + j, 2, 1);
        b.dot(-1, -1, 4 + f % 4, 2, 2);
    }
}
export function paintEffect(b, element, shape, f) {
    const motif = (x, y, scale = 1) => paintElement({ dot: (dx, dy, c, w = 1, h = w) => b.dot(x + dx * scale, y + dy * scale, c, Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))), line: (ax, ay, bx, by, c, w = 1) => b.line(x + ax * scale, y + ay * scale, x + bx * scale, y + by * scale, c, Math.max(1, Math.round(w * scale))) }, element, f);
    if (shape === 'projectile') {
        motif(2, 0, .7);
        b.line(-12, 2, -6, 2, element === 'physical' ? 6 : 4, 1);
        return;
    }
    if (shape === 'beam') {
        for (let j = -1; j <= 1; j++)
            motif(j * 10, 0, .55);
        return;
    }
    if (shape === 'dash') {
        for (let j = 0; j < 4; j++) {
            b.line(-13 + j * 4, 6 - j * 3, -5 + j * 4, 6 - j * 3, element === 'time' ? 5 : 6, 1);
        }
        motif(7, -2, .65);
        return;
    }
    if (shape === 'summon') {
        b.line(-11, 10, 10, 10, 5, 2);
        b.line(-10, 10, -10, 5, 6, 1);
        b.line(10, 10, 10, 5, 6, 1);
        motif(0, -2, .8);
        return;
    }
    if (shape === 'field') {
        for (let j = 0; j < 5; j++) {
            const a = j * 2.4, r = j ? 9 : 0;
            motif(Math.cos(a) * r, Math.sin(a) * r * .65, .45);
        }
        return;
    }
    if (shape === 'ring') {
        for (let j = 0; j < 8; j++) {
            const a = j * Math.PI / 4, r = 10 + (f % 3);
            motif(Math.cos(a) * r, Math.sin(a) * r, .25);
        }
        return;
    }
    if (f < 2) {
        motif(0, 0, .8);
        b.dot(-1, -1, 7, 2, 2);
        return;
    }
    for (let j = 0; j < 5; j++) {
        const a = j * 2.4, r = 3 + (f - 2) * 1.8;
        motif(Math.cos(a) * r, Math.sin(a) * r, Math.max(.2, .6 - f * .045));
    }
    if (element === 'fire' && f > 5)
        for (let j = 0; j < 4; j++)
            b.dot(j * 5 - 8, -f - 2, 4, 3, 2);
}

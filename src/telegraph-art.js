const cache = new Map();
let pixels = 0;
const delta = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
function raster(q, unit) {
    const radius = Math.max(3, Math.round(q.radius * unit)), length = Math.max(1, Math.round(q.length * unit)), progress = Math.ceil(q.progress * 16) / 16;
    const width = Math.max(3, Math.round(q.width * unit)), angle = Math.round(q.angle * 128 / (Math.PI * 2)) * Math.PI * 2 / 128;
    const key = [q.kind, radius, length, width, angle, progress, q.flash, q.gaps.join(','), q.gapWidth, q.color].join(':');
    const old = cache.get(key);
    if (old)
        return old;
    const dx = Math.cos(angle), dy = Math.sin(angle), half = q.kind === 'strip' ? Math.max(1, width * (.3 + .7 * progress) / 2) : width / 2;
    let left = -radius - width, top = left, right = -left, bottom = right;
    if (q.kind === 'strip') {
        const xs = [-dy * half, dy * half, dx * length - dy * half, dx * length + dy * half], ys = [dx * half, -dx * half, dy * length + dx * half, dy * length - dx * half];
        left = Math.floor(Math.min(...xs)) - 2;
        right = Math.ceil(Math.max(...xs)) + 2;
        top = Math.floor(Math.min(...ys)) - 2;
        bottom = Math.ceil(Math.max(...ys)) + 2;
    }
    const image = document.createElement('canvas');
    image.width = right - left + 1;
    image.height = bottom - top + 1;
    const g = image.getContext('2d'), color = q.flash ? '#f4ecdc' : q.color;
    g.fillStyle = color;
    for (let y = top; y <= bottom; y++)
        for (let x = left; x <= right; x++) {
            let inside = false, border = false, depth = 0;
            if (q.kind === 'strip') {
                const along = x * dx + y * dy, across = Math.abs(-x * dy + y * dx);
                inside = along >= 0 && along <= length && across <= half;
                border = half - across < 1 || along < 1 || length - along < 1;
                depth = (half - across) / half;
            }
            else {
                const d = Math.hypot(x, y), a = Math.atan2(y, x);
                if (q.kind === 'ring') {
                    inside = Math.abs(d - radius) <= half && !q.gaps.some(gap => delta(a, gap) < q.gapWidth / 2);
                    border = half - Math.abs(d - radius) < 1;
                    depth = (radius + half - d) / Math.max(1, width);
                }
                else {
                    inside = d <= radius;
                    depth = (radius - d) / radius;
                    border = radius - d < 1;
                    if (q.kind === 'cone') {
                        const edge = q.gapWidth / 2 - delta(a, angle);
                        inside &&= edge >= 0 && d >= 4;
                        border ||= edge >= 0 && d * Math.sin(edge) < 1;
                    }
                }
            }
            if (!inside)
                continue;
            if (border) {
                g.globalAlpha = q.flash ? 1 : .8;
                g.fillRect(x - left, y - top, 1, 1);
            }
            else if (depth <= progress && (Math.floor(x / 2) + Math.floor(y / 2)) % 2 === 0) {
                g.globalAlpha = q.flash ? .85 : .23;
                g.fillRect(x - left, y - top, 1, 1);
            }
        }
    g.globalAlpha = 1;
    const cost = image.width * image.height;
    while (cache.size && (cache.size >= 128 || pixels + cost > 3145728)) {
        const first = cache.keys().next().value, item = cache.get(first);
        pixels -= item.image.width * item.image.height;
        cache.delete(first);
    }
    const result = { image, left, top };
    pixels += cost;
    cache.set(key, result);
    return result;
}
export function paintWarning(ctx, q, x, y, unit) {
    if (q.kind === 'shadow') {
        const r = Math.max(3, Math.round(q.radius * unit));
        ctx.fillStyle = '#070a13';
        ctx.globalAlpha = q.opacity;
        for (let yy = -Math.ceil(r * .4); yy <= r * .4; yy += 2)
            for (let xx = -r; xx <= r; xx += 2)
                if (xx * xx + yy * yy * 6 < r * r)
                    ctx.fillRect(x + xx, y + yy, 2, 2);
        ctx.globalAlpha = 1;
        return;
    }
    const image = raster(q, unit);
    const rhythm = q.boss ? (q.progress > .8 ? 1 : Math.floor(q.progress * 6) % 2 ? .8 : 1) : 1;
    ctx.globalAlpha = q.flash ? 1 : q.opacity * rhythm;
    ctx.drawImage(image.image, Math.round(x + image.left), Math.round(y + image.top));
    ctx.globalAlpha = 1;
}

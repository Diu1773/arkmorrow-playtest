import { rng, clamp, SpatialHash } from './core.js';
export const MAP_PATTERNS = {
    launch: ['plain', 'corridor', 'canyon', 'hub'], atmosphere: ['plain', 'islands', 'ring', 'canyon'],
    nebula: ['plain', 'corridor', 'islands', 'hub'], 'open-cluster': ['plain', 'islands', 'ring', 'hub'],
    globular: ['corridor', 'ring', 'canyon', 'hub'], galaxy: ['corridor', 'islands', 'ring', 'hub'],
    outer: ['plain', 'islands', 'canyon', 'hub'], expansion: ['plain', 'corridor', 'ring', 'canyon'],
    village: ['plain', 'corridor', 'islands', 'hub'],
};
const sizes = { plain: [4800, 3360], corridor: [4800, 4320], islands: [5760, 3840], ring: [5280, 4320], canyon: [5760, 3360], hub: [5280, 3840] };
export function createLayout(chapter, seed, pattern) {
    let salt = 0;
    for (let i = 0; i < chapter.length; i++)
        salt = Math.imul(salt, 31) + chapter.charCodeAt(i) | 0;
    const random = rng(seed ^ salt ^ 0x4f1bbcdc), choices = MAP_PATTERNS[chapter], selected = pattern ?? choices[Math.floor(random() * choices.length)], base = sizes[selected], variant = random(), w = base[0] + Math.floor(random() * 2) * 240, h = base[1] + Math.floor(random() * 2) * 240;
    const nx = w / 240, ny = h / 240, open = new Uint8Array(nx * ny), phase = variant * Math.PI * 2;
    for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
            const px = (x + .5) * 240, py = (y + .5) * 240, dx = px - w / 2, dy = py - h / 2;
            let free = true;
            if (selected === 'plain')
                free = !(x % 5 === 2 && y % 4 === 1 && random() < .75);
            if (selected === 'corridor')
                free = x % 6 !== 3 || ((Math.floor(x / 6) + Math.floor(variant * 2)) % 2 ? y < 4 : y > ny - 5);
            if (selected === 'islands') {
                const centers = [[w * .24, h * .24], [w * .76, h * .24], [w * .24, h * .76], [w * .76, h * .76], [w / 2, h / 2]];
                free = centers.some(([cx, cy]) => Math.hypot(px - cx, py - cy) < 650 + variant * 110) || Math.abs(dx) < 270 || Math.abs(dy) < 270 || Math.abs(py - h * .24) < 210 || Math.abs(py - h * .76) < 210;
            }
            if (selected === 'ring') {
                const radius = Math.min(w, h) * (.29 + variant * .035), angle = Math.atan2(dy, dx) - phase;
                free = Math.abs(Math.hypot(dx, dy) - radius) > 160 || Math.abs(Math.sin(angle * 2)) < .32;
            }
            if (selected === 'canyon')
                free = Math.abs(dx - Math.sin(py / 650 + phase) * 460) < 620 + (py / h) * 220;
            if (selected === 'hub')
                free = !(Math.abs(dx) > 350 + variant * 220 && Math.abs(dx) < 1100 + variant * 180 && Math.abs(dy) > 350 + (1 - variant) * 180 && Math.abs(dy) < 980 + variant * 120);
            if (Math.hypot(px - 2400, py - 1600) < 420 || Math.abs(py - 1600) < 190 && px >= Math.min(2400, w / 2) && px <= Math.max(2400, w / 2))
                free = true;
            open[y * nx + x] = Number(free);
        }
    const seen = new Uint8Array(open.length), queue = [], flood = () => { seen.fill(0); queue.length = 0; const start = Math.floor(1600 / 240) * nx + Math.floor(2400 / 240); seen[start] = 1; queue.push(start); for (let n = 0; n < queue.length; n++) {
        const i = queue[n], x = i % nx, y = Math.floor(i / nx);
        for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]])
            if (a >= 0 && b >= 0 && a < nx && b < ny) {
                const j = b * nx + a;
                if (open[j] && !seen[j]) {
                    seen[j] = 1;
                    queue.push(j);
                }
            }
    } };
    flood();
    for (let i = 0; i < open.length; i++)
        if (open[i] && !seen[i]) {
            let x = i % nx, y = Math.floor(i / nx);
            const tx = Math.floor(2400 / 240), ty = Math.floor(1600 / 240);
            while (x !== tx || y !== ty) {
                for (let a = -1; a <= 1; a++)
                    for (let b = -1; b <= 1; b++)
                        if (x + a >= 0 && x + a < nx && y + b >= 0 && y + b < ny)
                            open[(y + b) * nx + x + a] = 1;
                if (x !== tx)
                    x += Math.sign(tx - x);
                else
                    y += Math.sign(ty - y);
            }
            flood();
        }
    const walls = [];
    for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++)
            if (!open[y * nx + x])
                walls.push({ x: (x + .5) * 240, y: (y + .5) * 240, w: 240, h: 240 });
    return { pattern: selected, variant, w, h, walls };
}
export const NAV_CELL = 80;
export const NAV_CLEARANCE = 52;
const maps = new WeakMap();
const routes = new WeakMap();
export function invalidateMap(s) { const n = maps.get(s); if (n)
    n.dirty = true; }
export function mapNavigation(s) {
    let n = maps.get(s);
    if (!n) {
        const nx = Math.ceil(s.world.w / NAV_CELL), ny = Math.ceil(s.world.h / NAV_CELL);
        n = { source: s.props, count: -1, hash: new SpatialHash(160), extent: 0, nearby: Array.from({ length: nx * ny }, () => []), seen: new WeakMap(), stamp: 0, blocked: new Uint8Array(nx * ny), distance: new Int32Array(nx * ny), queue: new Int32Array(nx * ny), nx, ny, goal: -1, dirty: true, queries: 0, candidates: 0 };
        maps.set(s, n);
    }
    if (n.source !== s.props || n.count !== s.props.length) {
        n.source = s.props;
        n.count = s.props.length;
        n.dirty = true;
    }
    return n;
}
export function propContains(o, x, y, r = 0) { return o.w !== undefined ? Math.abs(x - o.x) < o.w / 2 + r && Math.abs(y - o.y) < o.h / 2 + r : (x - o.x) ** 2 + (y - o.y) ** 2 < (o.r + r) ** 2; }
export function queryProps(s, x, y, r, visit) { const n = mapNavigation(s); n.queries++; n.hash.query(x, y, r + n.extent, o => { n.candidates++; if (!o.broken)
    visit(o); }); }
export function blockedAt(s, x, y, r = 24) {
    if (x < r + 24 || y < r + 24 || x > s.world.w - r - 24 || y > s.world.h - r - 24)
        return true;
    if (r <= 64) {
        const n = maps.get(s);
        n.queries++;
        const bucket = n.nearby[Math.floor(y / NAV_CELL) * n.nx + Math.floor(x / NAV_CELL)];
        for (const o of bucket) {
            n.candidates++;
            if (!o.broken && o.solid && propContains(o, x, y, r))
                return true;
        }
        return false;
    }
    let blocked = false;
    queryProps(s, x, y, r, o => { if (o.solid && propContains(o, x, y, r))
        blocked = true; });
    return blocked;
}
export function refreshNavigation(s) {
    const n = mapNavigation(s);
    if (n.dirty) {
        n.dirty = false;
        n.hash.clear();
        n.extent = 0;
        for (const bucket of n.nearby)
            bucket.length = 0;
        for (const o of s.props)
            if (!o.broken) {
                n.hash.insert(o);
                n.extent = Math.max(n.extent, o.r, o.w ? Math.max(o.w, o.h) / 2 : 0);
                if (o.solid) {
                    const rx = (o.w ? o.w / 2 : o.r) + 64, ry = (o.h ? o.h / 2 : o.r) + 64;
                    for (let y = Math.max(0, Math.floor((o.y - ry) / NAV_CELL)); y <= Math.min(n.ny - 1, Math.floor((o.y + ry) / NAV_CELL)); y++)
                        for (let x = Math.max(0, Math.floor((o.x - rx) / NAV_CELL)); x <= Math.min(n.nx - 1, Math.floor((o.x + rx) / NAV_CELL)); x++)
                            n.nearby[y * n.nx + x].push(o);
                }
            }
        for (let y = 0; y < n.ny; y++)
            for (let x = 0; x < n.nx; x++)
                n.blocked[y * n.nx + x] = Number(blockedAt(s, (x + .5) * NAV_CELL, (y + .5) * NAV_CELL, NAV_CLEARANCE));
        n.goal = -1;
    }
    const gx = clamp(Math.floor(s.player.x / NAV_CELL), 0, n.nx - 1), gy = clamp(Math.floor(s.player.y / NAV_CELL), 0, n.ny - 1);
    let goal = gy * n.nx + gx;
    if (n.blocked[goal]) {
        let best = Infinity;
        for (let i = 0; i < n.blocked.length; i++)
            if (!n.blocked[i]) {
                const d = (i % n.nx - gx) ** 2 + (Math.floor(i / n.nx) - gy) ** 2;
                if (d < best) {
                    best = d;
                    goal = i;
                }
            }
    }
    if (goal !== n.goal) {
        n.goal = goal;
        n.distance.fill(-1);
        n.distance[goal] = 0;
        n.queue[0] = goal;
        let end = 1;
        for (let q = 0; q < end; q++) {
            const i = n.queue[q], x = i % n.nx, y = Math.floor(i / n.nx);
            for (const j of [x > 0 ? i - 1 : -1, x < n.nx - 1 ? i + 1 : -1, y > 0 ? i - n.nx : -1, y < n.ny - 1 ? i + n.nx : -1])
                if (j >= 0 && !n.blocked[j] && n.distance[j] < 0) {
                    n.distance[j] = n.distance[i] + 1;
                    n.queue[end++] = j;
                }
        }
    }
    return n;
}
export function clearMapPoint(s, p, r = 24) {
    refreshNavigation(s);
    p.x = clamp(p.x, r + 25, s.world.w - r - 25);
    p.y = clamp(p.y, r + 25, s.world.h - r - 25);
    if (!blockedAt(s, p.x, p.y, r))
        return p;
    const n = mapNavigation(s);
    let best = Infinity, bx = 2400, by = 1600;
    for (let i = 0; i < n.blocked.length; i++)
        if (!n.blocked[i]) {
            const x = (i % n.nx + .5) * NAV_CELL, y = (Math.floor(i / n.nx) + .5) * NAV_CELL, d = (x - p.x) ** 2 + (y - p.y) ** 2;
            if (d < best && !blockedAt(s, x, y, r)) {
                best = d;
                bx = x;
                by = y;
            }
        }
    p.x = bx;
    p.y = by;
    return p;
}
export function moveMapBody(s, p, dx, dy) {
    if (!s.layout) {
        p.x = clamp(p.x + dx, 30, s.world.w - 30);
        p.y = clamp(p.y + dy, 30, s.world.h - 30);
        return;
    }
    if (blockedAt(s, p.x, p.y, p.r))
        clearMapPoint(s, p, p.r);
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 24)), sx = dx / steps, sy = dy / steps;
    for (let i = 0; i < steps; i++) {
        if (!blockedAt(s, p.x + sx, p.y, p.r))
            p.x += sx;
        if (!blockedAt(s, p.x, p.y + sy, p.r))
            p.y += sy;
    }
}
export function mapEnemyAngle(s, e, angle) {
    if (!s.layout || e.type === 'boss' || e.hidden)
        return angle;
    const n = maps.get(s), x = clamp(Math.floor(e.x / NAV_CELL), 0, n.nx - 1), y = clamp(Math.floor(e.y / NAV_CELL), 0, n.ny - 1), cell = y * n.nx + x;
    let route = routes.get(e);
    if (!route || route.id !== e.id || route.cell !== cell || route.goal !== n.goal) {
        const dx = s.player.x - e.x, dy = s.player.y - e.y, steps = Math.ceil(Math.hypot(dx, dy) / 40);
        let blocked = false;
        for (let i = 0; i <= steps; i++) {
            const cx = clamp(Math.floor((e.x + dx * i / (steps || 1)) / NAV_CELL), 0, n.nx - 1), cy = clamp(Math.floor((e.y + dy * i / (steps || 1)) / NAV_CELL), 0, n.ny - 1);
            if (n.blocked[cy * n.nx + cx]) {
                blocked = true;
                break;
            }
        }
        route = { id: e.id, cell, goal: n.goal, blocked };
        routes.set(e, route);
    }
    const ax = Math.cos(angle), ay = Math.sin(angle);
    if (!route.blocked && !blockedAt(s, e.x + ax * 20, e.y + ay * 20, e.r + 4) && !blockedAt(s, e.x + ax * 40, e.y + ay * 40, e.r + 4) && !blockedAt(s, e.x + ax * 60, e.y + ay * 60, e.r + 4))
        return angle;
    let best = Infinity, target = -1;
    const current = n.distance[cell];
    for (const [a, b] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]])
        if (a >= 0 && b >= 0 && a < n.nx && b < n.ny) {
            const i = b * n.nx + a;
            if (n.distance[i] >= 0 && (current < 0 || n.distance[i] < current)) {
                const score = n.distance[i] + Math.hypot((a + .5) * NAV_CELL - e.x, (b + .5) * NAV_CELL - e.y) * .001;
                if (score < best) {
                    best = score;
                    target = i;
                }
            }
        }
    if (target < 0)
        return angle;
    const tx = (target % n.nx + .5) * NAV_CELL, ty = (Math.floor(target / n.nx) + .5) * NAV_CELL, next = Math.atan2(ty - e.y, tx - e.x);
    return blockedAt(s, e.x + Math.cos(next) * 35, e.y + Math.sin(next) * 35, e.r) ? Math.atan2((y + .5) * NAV_CELL - e.y, (x + .5) * NAV_CELL - e.x) : next;
}
export function surfaceBulletHit(s, b, ox, oy) {
    if (!s.layout)
        return null;
    const dx = b.x - ox, dy = b.y - oy;
    let time = Infinity, prop;
    const n = maps.get(s), stamp = ++n.stamp;
    const visit = (o) => {
        if (n.seen.get(o) === stamp)
            return;
        n.seen.set(o, stamp);
        if (o.broken)
            return;
        if (!o.solid)
            return;
        let t = Infinity;
        if (o.w !== undefined) {
            let lo = 0, hi = 1;
            for (const [start, delta, center, half] of [[ox, dx, o.x, o.w / 2 + b.r], [oy, dy, o.y, o.h / 2 + b.r]]) {
                if (Math.abs(delta) < 1e-9) {
                    if (Math.abs(start - center) > half)
                        return;
                }
                else {
                    const a = (center - half - start) / delta, c = (center + half - start) / delta;
                    lo = Math.max(lo, Math.min(a, c));
                    hi = Math.min(hi, Math.max(a, c));
                }
            }
            if (lo <= hi)
                t = lo;
        }
        else {
            const x = ox - o.x, y = oy - o.y, a = dx * dx + dy * dy, c = x * x + y * y - (o.r + b.r) ** 2, k = x * dx + y * dy, d = k * k - a * c;
            if (c <= 0)
                t = 0;
            else if (a && d >= 0)
                t = (-k - Math.sqrt(d)) / a;
        }
        if (t >= 0 && t <= 1 && t < time) {
            time = t;
            prop = o;
        }
    };
    for (let y = Math.max(0, Math.floor((Math.min(oy, b.y) - b.r) / NAV_CELL)); y <= Math.min(n.ny - 1, Math.floor((Math.max(oy, b.y) + b.r) / NAV_CELL)); y++)
        for (let x = Math.max(0, Math.floor((Math.min(ox, b.x) - b.r) / NAV_CELL)); x <= Math.min(n.nx - 1, Math.floor((Math.max(ox, b.x) + b.r) / NAV_CELL)); x++)
            for (const o of n.nearby[y * n.nx + x])
                visit(o);
    return prop ? { prop, time } : null;
}

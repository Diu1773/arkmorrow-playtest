const colors = { edge: '#090d18', floor: '#1b2132', steel: '#657182', light: '#fff4db', teal: '#78e1df', gold: '#f6bf58', rust: '#9b5748', purple: '#76529a' };
const sprites = new Map();
export function routeSprite(kind) {
    if (sprites.has(kind))
        return sprites.get(kind);
    const ca = document.createElement('canvas');
    ca.width = ca.height = 32;
    const c = ca.getContext('2d');
    const b = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(x, y, w, h); };
    if (kind === 'door') {
        b(4, 2, 24, 30, colors.edge);
        b(6, 3, 20, 29, colors.steel);
        b(9, 6, 14, 26, colors.floor);
        b(10, 8, 12, 23, '#3b5150');
        b(15, 9, 2, 22, colors.teal);
        b(8, 4, 16, 2, colors.light);
        b(26, 14, 3, 7, colors.gold);
    }
    else if (kind === 'key') {
        b(3, 6, 13, 13, colors.edge);
        b(5, 8, 9, 9, colors.gold);
        b(8, 11, 3, 3, colors.floor);
        b(13, 13, 16, 5, colors.edge);
        b(14, 14, 13, 2, colors.gold);
        b(22, 15, 3, 6, colors.gold);
        b(26, 15, 2, 4, colors.gold);
    }
    else if (kind === 'bomb') {
        b(7, 11, 18, 15, colors.edge);
        b(10, 8, 12, 20, colors.edge);
        b(10, 12, 12, 13, colors.rust);
        b(12, 13, 3, 4, colors.light);
        b(15, 6, 3, 5, colors.steel);
        b(17, 3, 7, 2, colors.gold);
        b(24, 1, 2, 5, colors.light);
    }
    else if (kind === 'wall') {
        b(2, 6, 28, 23, colors.edge);
        b(3, 7, 26, 20, colors.steel);
        for (let y = 8; y < 27; y += 6)
            b(3, y, 25, 1, colors.floor);
        b(17, 6, 3, 7, colors.edge);
        b(14, 12, 4, 7, colors.edge);
        b(17, 18, 3, 9, colors.edge);
        b(12, 13, 2, 2, colors.gold);
    }
    else if (kind === 'altar') {
        b(4, 25, 24, 5, colors.edge);
        b(7, 21, 18, 5, colors.steel);
        b(10, 12, 12, 11, colors.edge);
        b(12, 14, 8, 8, colors.purple);
        b(14, 3, 4, 8, colors.teal);
        b(11, 5, 10, 3, colors.teal);
        b(14, 5, 4, 3, colors.light);
    }
    else if (kind === 'record') {
        b(7, 3, 19, 26, colors.edge);
        b(9, 5, 15, 22, colors.steel);
        b(11, 7, 11, 14, colors.floor);
        for (let y = 9; y < 20; y += 4)
            b(12, y, 8, 1, colors.teal);
        b(15, 23, 3, 2, colors.gold);
    }
    else if (kind === 'node') {
        b(10, 6, 12, 20, colors.edge);
        b(6, 10, 20, 12, colors.edge);
        b(11, 8, 10, 16, colors.teal);
        b(8, 11, 16, 10, colors.teal);
        b(12, 12, 8, 8, colors.floor);
    }
    else {
        b(4, 10, 24, 18, colors.edge);
        b(6, 12, 20, 14, colors.rust);
        b(4, 7, 24, 7, colors.edge);
        b(6, 8, 20, 4, kind === 'cache' ? colors.purple : colors.gold);
        b(13, 11, 6, 11, colors.edge);
        b(15, 13, 2, 6, colors.teal);
    }
    sprites.set(kind, ca);
    return ca;
}
export function rewardGlyph(reward) { return ({ weapon: '✦', skill: '✧', crate: '▣', gold: '●', heal: '+', shop: '▤', event: '!', elite: '◆', mystery: '?', boss: '◆', back: '↶' })[reward]; }
export function drawRoute(c, s, X, Y, u) {
    const b = (x, y, w, h, color) => { c.fillStyle = color; c.fillRect(Math.round(X(x)), Math.round(Y(y)), Math.max(1, Math.round(w * u)), Math.max(1, Math.round(h * u))); };
    const tint = ['#426075', '#76529a', '#9b5748', '#3da6ba', '#7f925e', '#657182', '#f6bf58'][s.place];
    for (const x of [1810, 2990])
        b(x, 1130, 6, 940, tint);
    for (const y of [1130, 2070])
        b(1810, y, 1186, 6, tint);
    for (let x = 1860; x < 2950; x += 160) {
        b(x, 2010, 60, 7, tint);
        b(x, 1190, 60, 7, tint);
    }
    if (s.place === 1 || s.place === 5)
        for (let x = 2000; x < 2800; x += 200) {
            b(x, 1350, 70, 4, tint);
            b(x, 1350, 4, 110, tint);
        }
    if (s.place === 2)
        for (let i = 0; i < 8; i++)
            b(2120 + i * 70, 1370 + i % 2 * 14, 25, 6, colors.gold);
    if (s.place === 3) {
        b(2370, 1370, 60, 150, colors.steel);
        b(2340, 1380, 120, 30, colors.edge);
        b(2350, 1385, 100, 6, colors.teal);
    }
    if (s.place === 4) {
        b(2320, 1380, 160, 100, '#3b5150');
        b(2390, 1400, 20, 60, colors.teal);
        b(2370, 1420, 60, 20, colors.teal);
    }
    if (!s.secret) {
        b(2800, 1170, 6, 100, colors.steel);
        b(2800, 1320, 6, 50, colors.steel);
        b(2800, 1370, 160, 6, colors.steel);
    }
    for (const o of s.objects) {
        if (o.used || o.kind === 'cache' && !s.wallOpen && !s.secret || o.kind === 'secret' && !s.wallOpen && s.keys < 3)
            continue;
        const img = routeSprite(o.kind === 'secret' ? 'door' : o.kind);
        c.drawImage(img, X(o.x) - 16 * u, Y(o.y) - 25 * u, 32 * u, 32 * u);
    }
    for (const door of s.doors) {
        c.drawImage(routeSprite('door'), X(door.x) - 32 * u, Y(door.y) - 45 * u, 64 * u, 64 * u);
        const reward = door.reward, cx = X(door.x), cy = Y(door.y) - 55 * u;
        c.fillStyle = reward === 'elite' ? colors.rust : colors.gold;
        c.fillRect(cx - 10 * u, cy - 10 * u, 20 * u, 20 * u);
        c.fillStyle = colors.edge;
        if (reward === 'heal') {
            c.fillRect(cx - 2 * u, cy - 7 * u, 4 * u, 14 * u);
            c.fillRect(cx - 7 * u, cy - 2 * u, 14 * u, 4 * u);
        }
        else if (reward === 'weapon' || reward === 'skill') {
            c.fillRect(cx - 2 * u, cy - 7 * u, 4 * u, 14 * u);
            c.fillRect(cx - 5 * u, cy + 3 * u, 10 * u, 2 * u);
        }
        else if (reward === 'mystery') {
            c.fillRect(cx - 5 * u, cy - 6 * u, 10 * u, 3 * u);
            c.fillRect(cx + 2 * u, cy - 3 * u, 3 * u, 5 * u);
            c.fillRect(cx - 2 * u, cy + 4 * u, 3 * u, 3 * u);
        }
        else
            c.drawImage(routeSprite(reward === 'crate' ? 'crate' : reward === 'event' ? 'record' : 'node'), cx - 8 * u, cy - 8 * u, 16 * u, 16 * u);
    }
}

import { crewSprite, CREW } from './crew.js';
import { sprite, directionFrame } from './pixel-art.js';
const TAU = Math.PI * 2;
const photo = typeof Image === 'undefined' ? null : new Image();
if (photo)
    photo.src = './assets/pixel/photos/orion.png';
export function pixelDisk(c, x, y, r, color, flatten = 1) {
    c.fillStyle = color;
    for (let dy = -Math.ceil(r * flatten); dy <= r * flatten; dy++) {
        const dx = Math.floor(Math.sqrt(Math.max(0, r * r - (dy / flatten) ** 2)));
        c.fillRect(Math.round(x) - dx, Math.round(y + dy), dx * 2 + 1, 1);
    }
}
function line(c, x, y, ex, ey, color, width = 1) {
    const steps = Math.ceil(Math.max(Math.abs(ex - x), Math.abs(ey - y)));
    c.fillStyle = color;
    for (let n = 0; n <= steps; n++)
        c.fillRect(Math.round(x + (ex - x) * n / (steps || 1)), Math.round(y + (ey - y) * n / (steps || 1)), width, width);
}
function text(c, value, x, y, color = '#e8f1e9', size = 11) { c.font = `${size}px Galmuri11, monospace`; c.fillStyle = '#10131d'; c.fillText(value, Math.round(x) + 1, Math.round(y) + 1); c.fillStyle = color; c.fillText(value, Math.round(x), Math.round(y)); }
function stars(c, w, h, time, low = false) {
    for (let i = 0; i < (low ? 65 : 170); i++) {
        const x = (i * 197 + 31) % w, y = (i * 89 + time * (i % 3 + 1) * 2) % h;
        c.fillStyle = ['#465165', '#91a6b2', '#e8f1e9'][i % 3];
        c.fillRect(Math.floor(x), Math.floor(y), i % 17 === 0 ? 2 : 1, 1);
    }
}
export function drawHangar(c, w, h, time) {
    c.fillStyle = '#161c2b';
    c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
        c.fillStyle = y % 64 ? '#293342' : '#202536';
        c.fillRect(0, y, w, 31);
    }
    for (let x = 0; x < w; x += 48) {
        c.fillStyle = '#465165';
        c.fillRect(x, 0, 2, h);
        c.fillStyle = '#cf8839';
        c.fillRect(x, Math.floor(h * .7), 32, 3);
    }
    const cell = w / 4;
    for (const [i, person] of CREW.entries()) {
        const x = cell * (i + .5), y = h * .55, dir = Math.floor(time / 2) % 4, frame = Math.floor(time * 7) % 3;
        pixelDisk(c, x, y + 20, 19, '#10131d', .22);
        c.drawImage(crewSprite(person.id, dir, frame), Math.round(x - 24), Math.round(y - 24), 48, 48);
        text(c, person.name, x - 14, y + 40, person.color);
    }
    text(c, 'CREW / HANGAR', 10, 20, '#91a6b2');
}
export function drawScene(c, trial, w, h, low = false, reduced = false) {
    const s = trial.sim, p = s.player, t = trial.time, portrait = w < h;
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    c.fillStyle = '#10131d';
    c.fillRect(0, 0, w, h);
    const rise = trial.rise, ground = trial.id === 'launch' && rise < .72;
    let unit = Math.min(w / 1100, h / 760);
    if (trial.id === 'launch')
        unit *= 1 - Math.min(1, rise * 5) * .58;
    if (trial.id === 'slingshot')
        unit = Math.min(unit, w * .72 / (Math.abs(p.x - trial.planet.x) + 360), h * .66 / (Math.abs(p.y - trial.planet.y) + 280));
    const cx = trial.id === 'slingshot' ? trial.planet.x * .6 + p.x * .4 : trial.id === 'blackhole' && trial.holeAge >= 0 ? p.x * .4 + trial.hole.x * .6 : p.x;
    const cy = trial.id === 'slingshot' ? trial.planet.y * .6 + p.y * .4 : trial.id === 'blackhole' && trial.holeAge >= 0 ? p.y * .4 + trial.hole.y * .6 : p.y;
    const shake = reduced ? 0 : trial.phase === 'ignite' ? 2 : trial.phase === 'ascent' ? 3 : trial.phase === 'burst' && trial.holeAge < 8.5 ? 5 : 0;
    const ox = Math.round(Math.sin(t * 67) * shake), oy = Math.round(Math.cos(t * 53) * shake);
    const X = (x) => Math.round(w / 2 + (x - cx) * unit) + ox, Y = (y) => Math.round(h * .54 + (y - cy) * unit) + oy;
    const stamp = (id, x, y, size, angle = 0) => { const img = sprite(id, directionFrame(angle)); const side = Math.max(id.startsWith('ship:') ? 28 : 3, Math.round(size * unit)); c.drawImage(img, X(x) - Math.floor(side / 2), Y(y) - Math.floor(side / 2), side, side); };
    if (ground) {
        const sky = ['#536f82', '#3b5367', '#293e50', '#202536', '#10131d'][Math.min(4, Math.floor(rise * 5))];
        c.fillStyle = sky;
        c.fillRect(0, 0, w, h);
        const horizon = Math.round(h * (.25 + rise * 1.9));
        c.fillStyle = '#647886';
        for (let i = 0; i < 8; i++) {
            const x = (i * 137 + Math.floor(t * 4)) % (w + 100) - 70;
            c.fillRect(x, horizon - 40 - i % 3 * 8, 60, 5);
            c.fillRect(x + 8, horizon - 44 - i % 3 * 8, 38, 4);
        }
        c.fillStyle = '#88705c';
        c.fillRect(0, horizon, w, h - horizon);
        c.fillStyle = '#b1b9ac';
        c.fillRect(0, horizon, w, 2);
        for (let i = 0; i < 120; i++) {
            const x = (i * 73 - Math.round(cx * unit)) % w, y = horizon + ((i * 43 + Math.round(cy * unit)) % Math.max(1, h - horizon));
            c.fillStyle = i % 3 ? '#6c5950' : '#a58b6b';
            c.fillRect((x + w) % w, y, 3, 1);
        }
        const padX = X(trial.ship.x), padY = Y(trial.ship.y) + Math.round(rise * h * 1.7), padScale = 1 - rise * .95;
        c.fillStyle = '#465165';
        c.fillRect(padX - Math.round(40 * padScale), padY - 8, Math.round(80 * padScale), Math.round(26 * padScale));
        for (let i = 0; i < 8; i++) {
            c.fillStyle = i % 2 ? '#10131d' : '#f0a33a';
            c.fillRect(padX - Math.round(40 * padScale) + Math.round(i * 10 * padScale), padY + Math.round(14 * padScale), Math.round(10 * padScale), Math.max(1, Math.round(4 * padScale)));
        }
        if (rise > 0) {
            if (rise > .35)
                stars(c, w, h, t, low);
            if (rise < .55)
                for (let i = 0; i < 9; i++) {
                    const y = Math.round((i * 67 + t * 190) % h);
                    c.fillStyle = '#b1b9ac';
                    c.fillRect((i * 131) % w, y, 80, 3);
                    c.fillStyle = '#e8f1e9';
                    c.fillRect((i * 131) % w + 12, y - 3, 45, 3);
                }
        }
    }
    else {
        if (photo?.complete && photo.naturalWidth && trial.id !== 'launch') {
            c.globalAlpha = .22;
            c.drawImage(photo, 0, 0, w, h);
            c.globalAlpha = 1;
        }
        stars(c, w, h, t, low);
        if (trial.id === 'launch') {
            const r = w * 1.2;
            pixelDisk(c, w * .5, h + r * .86, r, '#5796a5', 1);
            pixelDisk(c, w * .5, h + r * .86 + 5, r, '#267485', 1);
            for (let i = 0; i < 25; i++) {
                const x = i * w / 25, y = h - 15 + Math.floor(Math.sin(i * .8) * 6);
                c.fillStyle = '#87cf78';
                c.fillRect(Math.round(x), y, 10, 5);
            }
        }
    }
    if (trial.id === 'slingshot') {
        const x = X(trial.planet.x), y = Y(trial.planet.y), r = Math.max(15, Math.round(trial.planet.r * unit * .63));
        for (let i = 0; i < 90; i++) {
            const a = i / 90 * TAU;
            line(c, x + Math.cos(a) * r * 1.62, y + Math.sin(a) * r * 1.62, x + Math.cos(a + .025) * r * 1.62, y + Math.sin(a + .025) * r * 1.62, trial.phase === 'orbiting' ? '#f6b751' : '#526579');
        }
        pixelDisk(c, x, y, r + 2, '#10131d');
        pixelDisk(c, x, y, r, '#745035');
        pixelDisk(c, x - 2, y - 3, r - 3, '#cf8839');
        for (let i = -3; i <= 3; i++) {
            const yy = y + i * r / 4, half = Math.sqrt(Math.max(0, r * r - (yy - y) ** 2));
            line(c, x - half + 3, yy, x + half - 3, yy, i % 2 ? '#e8be76' : '#a58b6b', 2);
        }
        pixelDisk(c, x + r * .35, y + r * .2, r * .28, '#745035');
        text(c, '행성', x - 11, y + r + 16, '#f6b751');
    }
    for (const [i, point] of trial.trail.entries()) {
        const fade = 1 - point.age / 1.3;
        if (fade <= 0)
            continue;
        c.globalAlpha = fade * .55;
        const a = X(point.x), b = Y(point.y);
        c.fillStyle = trial.phase === 'boost' ? '#c9ffff' : '#f6b751';
        c.fillRect(a - 1, b - 1, 2, 2);
        if (trial.phase === 'boost' && !low && i % 4 === 0) {
            c.globalAlpha = fade * .3;
            c.drawImage(sprite('ship:aster', directionFrame(Math.atan2(trial.dash.y, trial.dash.x) + Math.PI / 2), 1), a - 9, b - 9, 18, 18);
        }
    }
    c.globalAlpha = 1;
    for (const e of s.enemies) {
        if (e.hp <= 0)
            continue;
        const x = X(e.x), y = Y(e.y);
        if (x < -25 || y < -25 || x > w + 25 || y > h + 25)
            continue;
        if (trial.phase === 'suction') {
            const hx = X(trial.hole.x), hy = Y(trial.hole.y), dx = hx - x, dy = hy - y, d = Math.hypot(dx, dy) || 1;
            line(c, x - dx / d * 6, y - dy / d * 6, x + dx / d * 10, y + dy / d * 10, e.id % 4 ? '#cf8839' : '#f4766b', 2);
        }
        stamp('enemy:' + e.type, e.x, e.y, Math.max(26, e.r * 2.8), e.angle + Math.PI / 2);
    }
    for (const b of s.bullets)
        stamp('bullet', b.x, b.y, 17);
    for (const g of s.pickups)
        stamp(g.value >= 12 ? 'crystal' : 'xp', g.x, g.y, 20);
    for (const b of s.shots)
        stamp('projectile:' + b.weapon + ':0:' + Math.floor(t * 12) % 3, b.x, b.y, 20, Math.atan2(b.vy, b.vx) + Math.PI / 2);
    if (p.orbitCount)
        for (let i = 0; i < p.orbitCount; i++) {
            const a = s.orbitAngle + i / p.orbitCount * TAU;
            stamp('projectile:orbit:0:0', p.x + Math.cos(a) * p.orbitRadius, p.y + Math.sin(a) * p.orbitRadius, 26);
        }
    for (const e of s.effects) {
        const radius = e.radius * unit * (1 - e.ttl / e.life);
        if (radius < 2)
            continue;
        for (let i = 0; i < 36; i++) {
            const a = i / 36 * TAU;
            c.fillStyle = e.color;
            c.fillRect(X(e.x) + Math.round(Math.cos(a) * radius), Y(e.y) + Math.round(Math.sin(a) * radius), 2, 2);
        }
    }
    if (trial.id === 'blackhole' && trial.holeAge >= 0) {
        const age = trial.holeAge, hx = X(trial.hole.x), hy = Y(trial.hole.y);
        if (age < 8) {
            for (let arm = 0; arm < 5; arm++)
                for (let i = 0; i < (low ? 42 : 85); i++) {
                    const f = i / (low ? 42 : 85), r = (18 + f * 460) * unit, a = arm * TAU / 5 + f * 6.8 - t * 2.5;
                    c.fillStyle = i % 5 === 0 ? '#fff0ff' : i % 2 ? '#bd82ee' : '#493e66';
                    c.fillRect(Math.round(hx + Math.cos(a) * r), Math.round(hy + Math.sin(a) * r), i % 7 === 0 ? 3 : 2, 2);
                }
            pixelDisk(c, hx, hy, Math.max(10, 40 * unit), '#f0a33a', .55);
            pixelDisk(c, hx, hy, Math.max(8, 33 * unit), '#bd82ee');
            pixelDisk(c, hx, hy, Math.max(6, 27 * unit), '#10131d');
            line(c, hx - 32, hy, hx + 32, hy, '#f6b751', 2);
        }
        else if (age < 10) {
            const r = (age - 8) * 130;
            for (let i = 0; i < 90; i++) {
                const a = i / 90 * TAU;
                c.fillStyle = i % 3 ? '#bd82ee' : '#caffed';
                c.fillRect(Math.round(hx + Math.cos(a) * r), Math.round(hy + Math.sin(a) * r), 3, 3);
            }
        }
    }
    if (trial.id === 'launch' && trial.phase !== 'ground') {
        const x = X(p.x), y = Y(p.y);
        if (trial.phase === 'ignite' || trial.phase === 'ascent') {
            const length = trial.phase === 'ignite' ? 12 + Math.floor(t * 15) % 8 : 40 + Math.floor(t * 20) % 12;
            c.fillStyle = '#cf8839';
            c.fillRect(x - 7, y + 10, 14, length);
            c.fillStyle = '#f6b751';
            c.fillRect(x - 4, y + 10, 8, length - 5);
            c.fillStyle = '#e8f1e9';
            c.fillRect(x - 2, y + 10, 4, length - 12);
            if (!reduced)
                for (let i = 0; i < 24; i++) {
                    const xx = (i * 71 + 9) % w, yy = (i * 67 + t * 200) % h;
                    line(c, xx, yy, xx, yy + 12 + rise * 40, rise > .4 ? '#f4766b' : '#91a6b2');
                }
            if (rise > .3 && rise < .82)
                for (let i = 0; i < 18; i++) {
                    const a = i / 18 * TAU, r = 18 + Math.floor(t * 25 + i) % 9;
                    c.fillStyle = i % 3 ? '#f4766b' : '#ffe2c7';
                    c.fillRect(Math.round(x + Math.cos(a) * r), Math.round(y + Math.sin(a) * r * 1.8), 2, 4);
                }
        }
    }
    if (trial.id === 'launch' && trial.takeoffAt === null) {
        stamp('ship:aster', trial.ship.x, trial.ship.y, 100);
        const x = X(trial.ship.x), y = Y(trial.ship.y);
        text(c, '탑승 ↓', x - 18, y - 27, '#f6b751');
    }
    const isHuman = trial.id === 'launch' && trial.takeoffAt === null;
    if (isHuman) {
        const moving = Math.hypot(p.vx, p.vy) > 5, dir = (Math.abs(p.vx) > Math.abs(p.vy) ? p.vx < 0 ? 1 : 3 : p.vy < 0 ? 2 : 0);
        const side = Math.max(24, Math.round(48 * unit));
        c.drawImage(crewSprite('pip', dir, p.flash > 0 ? 3 : moving ? Math.floor(t * 8) % 3 : 0), X(p.x) - Math.floor(side / 2), Y(p.y) - Math.floor(side / 2), side, side);
    }
    else
        stamp('ship:aster', p.x, p.y, 90, trial.id === 'launch' && trial.rise < 1 ? 0 : p.angle + Math.PI / 2);
    if (trial.phase === 'boost') {
        const a = Math.atan2(trial.dash.y, trial.dash.x);
        for (let i = -6; i <= 6; i++) {
            const angle = a + i * .14, r = 16 + Math.abs(i);
            c.fillStyle = i % 2 ? '#c9ffff' : '#69c9ce';
            c.fillRect(X(p.x) + Math.round(Math.cos(angle) * r), Y(p.y) + Math.round(Math.sin(angle) * r), 2, 2);
        }
    }
    const name = trial.id === 'launch' ? '대기권 돌파' : trial.id === 'blackhole' ? '블랙홀 흡입' : '스윙바이 돌진';
    c.fillStyle = '#10131d';
    c.fillRect(0, 0, w, portrait ? 73 : 38);
    text(c, name, 10, 16, '#f6b751', portrait ? 12 : 13);
    text(c, `${t.toFixed(1)} / ${trial.duration}초`, portrait ? 10 : w - 104, portrait ? 65 : 16, '#e8f1e9', portrait ? 9 : 11);
    const hint = trial.id === 'launch' ? (trial.phase === 'ground' ? t < 12 ? '이동하며 버티기 · 12초에 탑승 준비' : t < 14 ? '우주선 가까이 가면 탑승' : '구조선 접근 중' : trial.phase === 'ignite' ? '점화' : trial.phase === 'ascent' ? rise < .5 ? '구름층 통과' : '대기권 돌파' : '궤도 전투') : trial.id === 'blackhole' ? (trial.phase === 'swarm' ? '15초에 블랙홀 발동' : trial.phase === 'suction' ? `흡입 중  ${trial.sucked.enemies}마리` : `흡입 완료  ${trial.sucked.enemies}마리`) : trial.phase === 'orbiting' ? '궤도 가속 → 이동 방향으로 발사' : trial.phase === 'boost' ? '돌진!' : `점선 궤도로 이동  /  돌진 ${trial.boosts}회`;
    if (portrait) {
        c.font = '9px Galmuri11, monospace';
        let row = '', y = 32;
        for (const char of hint) {
            if (c.measureText(row + char).width > w - 20) {
                text(c, row, 10, y, '#91a6b2', 9);
                row = '';
                y += 12;
            }
            row += char;
        }
        text(c, row, 10, y, '#91a6b2', 9);
    }
    else
        text(c, hint, 10, 32, '#91a6b2', 10);
    c.fillStyle = '#cf8839';
    c.fillRect(0, portrait ? 71 : 36, Math.round(w * t / trial.duration), 2);
}

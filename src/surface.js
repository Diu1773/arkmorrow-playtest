import { CREW } from './crew.js';
import { LOCAL_ENEMIES } from './chapters.js';
import { chapterRhythm, chapterDensity } from './chapters.js';
import { arenaSpawnAllowed } from './boss-director.js';
import { createLayout, clearMapPoint, refreshNavigation, invalidateMap, queryProps, moveMapBody } from './map-layout.js';
export function buildSurface(s, seed = 17) {
    const id = s.chapter.id;
    s.layout = createLayout(id, seed);
    s.world = { w: s.layout.w, h: s.layout.h };
    s.props = [];
    s.obstacles = [];
    const ground = s.chapter.kind === 'ground', wallKind = id === 'launch' ? 'wall' : id === 'village' ? 'rock' : id === 'atmosphere' ? 'cloud' : 'wreck';
    if (ground || id === 'atmosphere')
        s.terrain = [];
    for (const wall of s.layout.walls)
        s.props.push({ kind: wallKind, ...wall, r: 120, hp: 0, solid: true, shake: 0, cooldown: 0, broken: false });
    invalidateMap(s);
    refreshNavigation(s);
    const village = id === 'village';
    if (ground)
        s.terrain = [{ kind: village ? 'field' : 'sand', x: 2100, y: 1650, r: 220 }, { kind: village ? 'field' : 'sand', x: 2700, y: 1420, r: 200 }, { kind: 'puddle', x: 2440, y: 1820, r: 75 }];
    const add = (kind, x, y, r, hp = 0, solid = true) => {
        for (let attempt = 0; attempt < 80; attempt++) {
            const angle = attempt * 2.399963, distance = 150 * Math.sqrt(attempt), p = clearMapPoint(s, { kind, x: x + Math.cos(angle) * distance, y: y + Math.sin(angle) * distance, r, hp, solid, shake: 0, cooldown: 0, broken: false }, r + 50);
            if ((solid || kind === 'pad') && Math.hypot(p.x - s.player.x, p.y - s.player.y) < r + 90)
                continue;
            s.props.push(p);
            if (!solid)
                return p;
            invalidateMap(s);
            const n = refreshNavigation(s);
            if (!n.blocked.some((v, i) => !v && n.distance[i] < 0))
                return p;
            s.props.pop();
            invalidateMap(s);
            refreshNavigation(s);
        }
        throw Error('No connected placement for structure');
    };
    if (village) {
        add('house', 2870, 1190, 82);
        add('house', 1750, 1750, 75);
        add('well', 2430, 1360, 30, 0, false);
        for (let i = 0; i < 14; i++)
            add(i < 8 ? 'tree' : 'fence', 1800 + (i * 223) % 1400, 1000 + (i * 173) % 1200, i < 8 ? 34 : 26, i < 8 ? 120 : 65);
    }
    else if (id === 'launch') {
        add('hangar', 1850, 1260, 90);
        add('car', 2800, 1750, 40, 140);
        add('launchpad', 3250, 2100, 90);
        for (let i = 0; i < 6; i++)
            add('tank', 2100 + i % 3 * 210, 1200 + Math.floor(i / 3) * 850, 32, 75);
        for (const x of [2150, 2650])
            add('vent', x, 1600, 65, 0, false);
    }
    else if (id === 'atmosphere') {
        s.terrain = [{ kind: 'thunder', x: 2650, y: 1600, r: 160 }, { kind: 'jetstream', x: 2100, y: 1450, r: 260, angle: -.6 }, { kind: 'heat', x: 2400, y: 1600, r: 1250 }];
        for (let i = 0; i < 8; i++)
            add('cloud', 900 + i * 430, 800 + (i % 3) * 840, 65);
        for (const t of s.terrain)
            if (t.kind !== 'heat')
                clearMapPoint(s, t, 90);
    }
    else
        for (let i = 0; i < 14; i++)
            add(i % 4 === 0 ? 'station' : 'rock', 600 + (i * 479) % (s.world.w - 1200), 600 + (i * 313) % (s.world.h - 1200), 36 + i % 3 * 12);
    for (let i = 0; i < 12; i++)
        add(i % 3 === 0 ? 'barrel' : 'cover', 700 + (i * 431 + seed * 13) % (s.world.w - 1400), 650 + (i * 397 + seed * 7) % (s.world.h - 1300), i % 3 === 0 ? 27 : 38, i % 3 === 0 ? 55 : 110);
    add('turret', 2600, 1920, 34, 0, false);
    const a = add('pad', 1100, 1000, 45, 0, false), b = add('pad', s.world.w - 950, s.world.h - 850, 45, 0, false);
    a.link = s.props.indexOf(b);
    b.link = s.props.indexOf(a);
    for (const [kind, x, y, r] of (id === 'launch' ? [['fuel', 2860, 1950, 150], ['electric', 3300, 1300, 135]] : id === 'atmosphere' ? [['electric', 3200, 2100, 175], ['ice', 1850, 2200, 180]] : village ? [['ice', 3100, 2300, 150]] : [['mist', 2900, 2000, 220], ['ice', 1750, 2250, 180], ['electric', 3450, 1250, 145]])) {
        const p = clearMapPoint(s, { x, y }, 50);
        s.terrain.push({ kind, ...p, r });
    }
    invalidateMap(s);
    refreshNavigation(s);
    clearMapPoint(s, s.player, s.player.r);
    s.obstacles = s.props.filter(p => p.solid).map(p => Object.assign(p, { angle: 0 }));
}
export function material(s) { if (s.chapter?.kind !== 'ground')
    return 'air'; if (s.inside('puddle'))
    return 'water'; if (s.inside('field'))
    return 'grass'; if (s.inside('sand'))
    return 'sand'; return s.chapter.id === 'launch' ? (Math.abs(s.player.x - 2400) < 135 ? 'asphalt' : 'metal') : 'soil'; }
export function trace(s, kind, x, y, life = 3, angle = 0) { if (s.traces.length >= 160)
    s.traces.shift(); s.traces.push({ kind, x, y, age: 0, life, angle }); }
export function moveExpedition(s, dt, m, speed) {
    const p = s.player, person = CREW.find(c => c.id === s.crew), ground = s.chapter?.kind === 'ground';
    const surface = s.inside('mist') ? .55 : ground ? (s.inside('field') ? .62 : s.inside('sand') ? .8 : s.inside('puddle') ? .72 : 1) : 1;
    const targetX = m.x * speed * s.speed * surface, targetY = m.y * speed * s.speed * surface;
    const tau = s.inside('ice') ? .65 : ground ? ({ pip: .13, bolt: .18, mori: .12, mew: .10 }[person.id]) : .08;
    const blend = s.movement === 'instant' && !s.inside('ice') ? 1 : 1 - Math.exp(-dt / (Math.hypot(m.x, m.y) > .1 ? tau * .45 : tau * (s.inside('ice') ? 1 : ground ? .3 : .22)));
    p.vx += (targetX - p.vx) * blend;
    p.vy += (targetY - p.vy) * blend;
    if (p.dashTime > 0) {
        p.vx = p.dashX * 650;
        p.vy = p.dashY * 650;
    }
    const jet = !!s.inside('jetstream');
    moveMapBody(s, p, (p.vx + (jet ? 65 : 0)) * dt, (p.vy - (jet ? 90 : 0)) * dt);
    if (ground && Math.hypot(p.vx, p.vy) > 30 && s.time >= s.nextFoot) {
        s.nextFoot = s.time + .22;
        const mat = material(s);
        trace(s, mat, p.x, p.y, mat === 'water' ? .6 : 4, p.angle);
        s.emit('foot', p.x, p.y, ['grass', 'asphalt', 'sand', 'metal', 'soil', 'water'].indexOf(mat));
    }
}
export function updateSurface(s, dt) {
    if (!s.layout)
        return;
    let changed = false;
    for (const o of s.props)
        if (o.broken && o.solid) {
            o.solid = false;
            changed = true;
        }
    if (changed)
        invalidateMap(s);
    refreshNavigation(s);
    for (let i = s.traces.length - 1; i >= 0; i--) {
        s.traces[i].age += dt;
        if (s.traces[i].age > s.traces[i].life)
            s.traces.splice(i, 1);
    }
    for (const o of s.props) {
        o.shake = Math.max(0, o.shake - dt * 5);
        o.cooldown = Math.max(0, o.cooldown - dt);
        if (o.broken)
            continue;
        if (o.kind === 'well' && o.cooldown <= 0 && Math.hypot(s.player.x - o.x, s.player.y - o.y) < 70) {
            s.player.hp = Math.min(s.player.maxHp, s.player.hp + 12);
            o.cooldown = 25;
            s.emit('pickup', o.x, o.y, 12);
        }
        if (!arenaSpawnAllowed(s, 'rusher'))
            continue;
        if (o.kind === 'turret' && o.cooldown <= 0 && Math.hypot(s.player.x - o.x, s.player.y - o.y) < 80) {
            o.cooldown = 18;
            s.effect('turret', o.x, o.y, 500, '#a5d5a1', 6, 30, 0, 0, false, 'turret');
        }
        if (o.kind === 'pad' && o.cooldown <= 0 && Math.hypot(s.player.x - o.x, s.player.y - o.y) < o.r) {
            const target = s.props[o.link ?? -1];
            if (target && !target.broken) {
                const p = clearMapPoint(s, { x: target.x, y: target.y + 75 }, s.player.r);
                s.player.x = p.x;
                s.player.y = p.y;
                s.player.vx = s.player.vy = 0;
                o.cooldown = target.cooldown = 3;
                s.effect('ring', p.x, p.y, 85, '#aa9bdd', .6);
            }
        }
        if (o.kind === 'vent' && Math.floor(s.time / 8) > Math.floor((s.time - dt) / 8))
            s.hazard('shell', o.x, o.y, { boss: true, r0: 0, r1: 100, warning: 1.2, duration: .8, damage: 12, gaps: [], gapW: 0 });
    }
    if (s.chapter?.id === 'atmosphere') {
        for (const f of s.particles) {
            f.vx += 15 * dt;
            f.vy -= 45 * dt;
        }
        if (s.timeline > 420 && (s.player.x < 180 || s.player.x > s.world.w - 180 || s.player.y < 150 || s.player.y > s.world.h - 150))
            s.hurt(4, 'friction');
    }
    const rhythm = chapterRhythm(s.chapter.id);
    s.spawnBoost *= chapterDensity(s.chapter.id, s.time);
    if (!arenaSpawnAllowed(s, 'rusher') || s.bossKilled)
        return;
    const crossing = (period) => Math.floor(s.time / period) > Math.floor((s.time - dt) / period);
    for (const t of s.terrain) {
        if (t.kind === 'electric' && crossing(6))
            s.hazard('shell', t.x, t.y, { r0: 0, r1: t.r, warning: .9, duration: .65, damage: 10, gaps: [], gapW: 0 });
        if (t.kind === 'fuel' && (t.litUntil ?? 0) > s.time) {
            if (Math.hypot(s.player.x - t.x, s.player.y - t.y) < t.r)
                s.hurt(8, 'fuel');
            if (crossing(.5))
                s.areaDamage(t.x, t.y, t.r, 12, 0, 'flame');
        }
    }
    for (const event of rhythm.events)
        if (s.time >= event.at && s.time < event.at + event.duration && crossing(event.every)) {
            const k = Math.floor(s.time / event.every), p = s.player, angle = k * 2.399963, range = 120 + k % 3 * 90, point = clearMapPoint(s, { x: p.x + Math.cos(angle) * range, y: p.y + Math.sin(angle) * range }, 35);
            if (event.kind === 'supply') {
                s.dropXP(point.x, point.y, 8, 'heal');
                s.effect('ring', point.x, point.y, 70, '#a1d1a8', .6);
            }
            else
                s.hazard('shell', point.x, point.y, { mapKind: event.kind, r0: 0, r1: event.kind === 'meteor' ? 125 : 160, warning: event.kind === 'lightning' ? .85 : 1.1, duration: .6, damage: event.kind === 'lightning' ? 16 : 12, gaps: [], gapW: 0 });
        }
}
export function hitProps(s, x, y, r, damage) {
    if (damage <= 0)
        return;
    for (const t of s.terrain)
        if (t.kind === 'fuel' && (t.litUntil ?? 0) <= s.time && Math.hypot(x - t.x, y - t.y) < r + t.r)
            t.litUntil = s.time + 7;
    queryProps(s, x, y, r, o => {
        if (o.hp <= 0 || Math.hypot(x - o.x, y - o.y) > r + o.r)
            return;
        o.hp -= damage;
        o.shake = 1;
        s.emit('material', o.x, o.y, o.kind === 'tree' ? 0 : 1);
        if (o.hp <= 0) {
            o.broken = true;
            o.solid = false;
            invalidateMap(s);
            s.obstacles = s.obstacles.filter(b => b.x !== o.x || b.y !== o.y);
            trace(s, 'scorch', o.x, o.y, 12);
            if (o.kind === 'tank' || o.kind === 'barrel') {
                s.effect('blast', o.x, o.y, 210, '#d69a61', .6);
                s.areaDamage(o.x, o.y, 210, 170, 45, 'bomb');
                if (Math.hypot(s.player.x - o.x, s.player.y - o.y) < 210)
                    s.hurt(12, 'fuel');
            }
            else if (o.kind === 'cover' && s.combatRandom() < .45)
                s.dropXP(o.x, o.y, 10, 'heal');
        }
    });
}
export function localSpawn(s, type, crowd = false) { const id = s.chapter?.id ?? '', list = LOCAL_ENEMIES[id]; if (type === 'mini' && list)
    return id === 'village' ? 'gnat' : id === 'launch' ? 'invader' : 'jelly'; if (crowd && list) {
    const n = s.combatRandom();
    return list[n < .58 ? 0 : n < .83 ? 1 : n < .93 ? 2 : 3];
} return list && type !== 'boss' && type !== 'decoy' ? list[Math.floor(s.combatRandom() * Math.min(list.length, 1 + Math.floor(s.timeline / 55)))] : type; }

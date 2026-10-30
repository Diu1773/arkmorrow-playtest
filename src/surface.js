import { CREW } from './crew.js';
import { LOCAL_ENEMIES } from './chapters.js';
export function buildSurface(s) {
    const id = s.chapter.id;
    s.terrain = [];
    s.obstacles = [];
    if (id === 'atmosphere') {
        s.terrain = [{ kind: 'thunder', x: 2650, y: 1600, r: 160 }, { kind: 'jetstream', x: 2100, y: 1450, r: 260, angle: -.6 }, { kind: 'heat', x: 2400, y: 1600, r: 1250 }];
        return;
    }
    const village = id === 'village';
    s.terrain = [{ kind: village ? 'field' : 'sand', x: 2100, y: 1650, r: 220 }, { kind: village ? 'field' : 'sand', x: 2700, y: 1420, r: 200 }, { kind: 'puddle', x: 2440, y: 1820, r: 75 }];
    const add = (kind, x, y, r, hp = 0, solid = true) => s.props.push({ kind, x, y, r, hp, solid, shake: 0, cooldown: 0, broken: false });
    if (village) {
        add('house', 2870, 1190, 82);
        add('house', 1750, 1750, 75);
        add('well', 2430, 1360, 30, 0, false);
        for (let i = 0; i < 14; i++)
            add(i < 8 ? 'tree' : 'fence', 1800 + (i * 223) % 1400, 1000 + (i * 173) % 1200, i < 8 ? 34 : 26, i < 8 ? 120 : 65);
    }
    else {
        add('hangar', 1850, 1260, 90);
        add('car', 2800, 1750, 40, 140);
        for (let i = 0; i < 6; i++)
            add('tank', 2100 + i % 3 * 210, 1200 + Math.floor(i / 3) * 850, 32, 75);
        for (const x of [2150, 2650])
            add('vent', x, 1600, 65, 0, false);
    }
    s.obstacles = s.props.filter(p => p.solid).map(p => ({ x: p.x, y: p.y, r: p.r, kind: p.kind, angle: 0, solid: true }));
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
    const surface = ground ? (s.inside('field') ? .62 : s.inside('sand') ? .8 : s.inside('puddle') ? .72 : 1) : 1;
    const targetX = m.x * speed * s.speed * surface, targetY = m.y * speed * s.speed * surface;
    const tau = ground ? ({ pip: .13, bolt: .18, mori: .12, mew: .10 }[person.id]) : .08;
    const blend = s.movement === 'instant' ? 1 : 1 - Math.exp(-dt / (Math.hypot(m.x, m.y) > .1 ? tau * .45 : tau * (ground ? .3 : .22)));
    p.vx += (targetX - p.vx) * blend;
    p.vy += (targetY - p.vy) * blend;
    if (s.inside('jetstream')) {
        p.x += 65 * dt;
        p.y -= 90 * dt;
    }
    if (p.dashTime > 0) {
        p.vx = p.dashX * 650;
        p.vy = p.dashY * 650;
    }
    p.x = Math.max(30, Math.min(4770, p.x + p.vx * dt));
    p.y = Math.max(30, Math.min(3170, p.y + p.vy * dt));
    if (ground && Math.hypot(p.vx, p.vy) > 30 && s.time >= s.nextFoot) {
        s.nextFoot = s.time + .22;
        const mat = material(s);
        trace(s, mat, p.x, p.y, mat === 'water' ? .6 : 4, p.angle);
        s.emit('foot', p.x, p.y, ['grass', 'asphalt', 'sand', 'metal', 'soil', 'water'].indexOf(mat));
    }
}
export function updateSurface(s, dt) {
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
        if (o.kind === 'vent' && Math.floor(s.time / 8) > Math.floor((s.time - dt) / 8))
            s.hazard('shell', o.x, o.y, { boss: true, r0: 0, r1: 100, warning: 1.2, duration: .8, damage: 12, gaps: [], gapW: 0 });
    }
    if (s.chapter?.id === 'atmosphere') {
        for (const f of s.particles) {
            f.vx += 15 * dt;
            f.vy -= 45 * dt;
        }
        if (Math.floor(s.time / 9) > Math.floor((s.time - dt) / 9)) {
            const t = s.terrain[0];
            s.hazard('shell', t.x, t.y, { boss: true, r0: 0, r1: 160, warning: 1.4, duration: .5, damage: 18, gaps: [], gapW: 0 });
        }
        if (s.time > 420 && (s.player.x < 180 || s.player.x > 4620 || s.player.y < 150 || s.player.y > 3050))
            s.hurt(4, 'friction');
    }
}
export function hitProps(s, x, y, r, damage) {
    for (const o of s.props) {
        if (o.hp <= 0 || o.broken || Math.hypot(x - o.x, y - o.y) > r + o.r)
            continue;
        o.hp -= damage;
        o.shake = 1;
        s.emit('material', o.x, o.y, o.kind === 'tree' ? 0 : 1);
        if (o.hp <= 0) {
            o.broken = true;
            o.solid = false;
            s.obstacles = s.obstacles.filter(b => b.x !== o.x || b.y !== o.y);
            trace(s, 'scorch', o.x, o.y, 12);
            if (o.kind === 'tank') {
                s.effect('blast', o.x, o.y, 210, '#d69a61', .6);
                s.hitStop = .035;
                s.areaDamage(o.x, o.y, 210, 170, 45, 'bomb');
                if (Math.hypot(s.player.x - o.x, s.player.y - o.y) < 210)
                    s.hurt(12, 'fuel');
            }
        }
    }
}
export function localSpawn(s, type, crowd = false) { const id = s.chapter?.id ?? '', list = LOCAL_ENEMIES[id]; if (type === 'mini' && list)
    return id === 'village' ? 'gnat' : id === 'launch' ? 'invader' : 'jelly'; if (crowd && list) {
    const n = s.combatRandom();
    return list[n < .58 ? 0 : n < .83 ? 1 : n < .93 ? 2 : 3];
} return list && type !== 'boss' && type !== 'decoy' ? list[Math.floor(s.combatRandom() * Math.min(list.length, 1 + Math.floor(s.time / 55)))] : type; }

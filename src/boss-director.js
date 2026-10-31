import { bossDesign, middleMoves } from './boss-catalog.js';
const TAU = Math.PI * 2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const worlds = new WeakMap(), states = new WeakMap();
const homing = new WeakMap(), rebounds = new WeakMap();
const elites = new WeakMap();
export const BOSS_TELLS = { fan: .45, spiral: .5, rebound: .5, charge: .5, mines: .55, sweep: .9, rain: .55, corridor: .95, summon: .6, pulse: .55 };
export const bossTell = (move, phase, tell) => Math.max(.35, BOSS_TELLS[move] - .025 * phase) * tell;
export function interruptBoss(s, e) { const b = states.get(e); if (!b || b.breakCD > 0 || e.warnTime <= 0)
    return false; bossWorld(s).threats = bossWorld(s).threats.filter(t => t.owner !== e.id || t.released); e.warnTime = 0; b.next = .65; b.breakCD = 8; return true; }
export function skipBossIntro(s) { for (const e of s.enemies) {
    const b = states.get(e);
    if (b && b.intro < .8)
        b.intro = .8;
} s.hitStop = 0; }
export function bossWorld(s) { let w = worlds.get(s); if (!w) {
    w = { arena: null, threats: [], remains: [], bounces: 0, history: [] };
    worlds.set(s, w);
} return w; }
export const bossState = (e) => states.get(e);
export function bossEntryPoint(s) { const halfW = clamp(s.viewWidth * .55, 440, 1100), halfH = clamp(s.viewHeight * .55, 350, 1100), x = clamp(s.player.x, halfW + 35, 4765 - halfW), y = clamp(s.player.y, halfH + 35, 3165 - halfH); return { x: clamp(s.player.x + 260, x - halfW + 100, x + halfW - 100), y: clamp(s.player.y - 170, y - halfH + 100, y + halfH - 100) }; }
export function arenaPoint(s, point, margin = 55) { const a = worlds.get(s)?.arena; if (a && a.release < 0) {
    point.x = clamp(point.x, a.x - a.halfW + margin, a.x + a.halfW - margin);
    point.y = clamp(point.y, a.y - a.halfH + margin, a.y + a.halfH - margin);
} return point; }
const hurtBoss = (s, damage, cause) => s.hurt(Math.min(damage, s.player.maxHp * .24 / ((s.chapter?.damage ?? 1) * s.chaos.incoming)), cause);
export function updateElite(s, e, dt) {
    if (!s.expedition || !e.elite)
        return false;
    let state = elites.get(e);
    if (!state || state.id !== e.id) {
        state = { id: e.id, next: 4, windup: 0 };
        elites.set(e, state);
    }
    state.next -= dt;
    if (state.windup > 0) {
        state.windup -= dt;
        e.warnTime = Math.max(0, state.windup);
        if (state.windup > 0)
            return true;
        e.attackFlash = 1 / 30;
        e.lastAttack = e.pendingAttack;
        e.pendingAttack = null;
        e.action = '';
        if (e.prefix === 'swift') {
            e.x += Math.cos(e.actionAngle) * 95;
            e.y += Math.sin(e.actionAngle) * 95;
        }
        if (e.prefix === 'armored')
            e.mirror = .8;
        if (e.prefix === 'mending')
            for (const n of s.enemies)
                if (n.type !== 'boss' && Math.hypot(n.x - e.x, n.y - e.y) < 180)
                    n.hp = Math.min(n.maxHp, n.hp + n.maxHp * .12);
        if (e.prefix === 'volatile')
            for (let i = 0; i < 5; i++)
                s.fire(e.x, e.y, e.actionAngle + (i - 2) * .27, 200, e.damage * .6, true);
        if (e.prefix === 'echo')
            for (const sign of [-1, 1]) {
                const n = s.spawn('mini', e.x + sign * 45, e.y);
                if (n) {
                    n.hp = n.maxHp = Math.min(100, e.maxHp * .05);
                    n.xp = 2;
                }
            }
        return true;
    }
    if (state.next <= 0 && !e.action && e.warnTime <= 0) {
        state.windup = .45;
        state.next = 6;
        e.action = 'elite';
        e.actionAngle = Math.atan2(s.player.y - e.y, s.player.x - e.x) + (e.prefix === 'swift' ? Math.PI / 2 : 0);
        e.warnTime = e.warnDuration = .45;
        e.pendingAttack = { pattern: 'fan', angle: e.actionAngle, phase: 0, x: e.x, y: e.y, gap: 0 };
        s.emit('prepare', e.x, e.y);
        return true;
    }
    return false;
}
export function setupBoss(s, e) {
    if (!s.expedition)
        return;
    const design = bossDesign(s.chapter.id), variant = e.role === 'final' ? 2 : e.bossArt === 7 ? 1 : 0;
    e.hp = e.maxHp = design.hp[variant] * s.mode.hp;
    e.r = variant === 2 ? 56 : 40;
    e.speed = variant === 2 ? 155 : 170;
    e.damage = variant === 2 ? 12 : 9;
    e.timer = 1.1;
    e.stages = 3;
    s.hitStop = Math.max(s.hitStop, .12);
    states.set(e, { design, variant, recent: [], casts: 0, phase: 0, intro: 0, dash: 0, heading: 0, next: 1.1, move: null, breakCD: 0 });
    const w = bossWorld(s), halfW = clamp(s.viewWidth * .55, 440, 1100), halfH = clamp(s.viewHeight * .55, 350, 1100);
    const x = clamp(s.player.x, halfW + 35, 4765 - halfW), y = clamp(s.player.y, halfH + 35, 3165 - halfH);
    w.arena = { x, y, halfW, halfH, age: 0, release: -1, owner: e.id };
    w.threats = [];
    s.hazards = [];
    s.bulletPool.active.length = 0;
    s.shotPool.active.length = 0;
    s.swarmUntil = 0;
    s.arrivalSites = [];
    // An empty landing area keeps terrain and existing enemies out of the first warning.
    s.obstacles = s.obstacles.filter(o => Math.abs(o.x - x) > halfW + o.r || Math.abs(o.y - y) > halfH + o.r);
    for (const o of s.props)
        if (Math.abs(o.x - x) < halfW + o.r && Math.abs(o.y - y) < halfH + o.r)
            o.broken = true;
    for (let i = s.enemies.length - 1; i >= 0; i--)
        if (s.enemies[i] !== e)
            s.enemyPool.remove(i);
    s.player.x = clamp(s.player.x, x - halfW + 60, x + halfW - 60);
    s.player.y = clamp(s.player.y, y - halfH + 60, y + halfH - 60);
    for (const point of [...s.pickups, ...s.drops, ...s.beacon ? [s.beacon] : []])
        arenaPoint(s, point);
    const entry = bossEntryPoint(s);
    e.x = entry.x;
    e.y = entry.y;
    s.player.invul = Math.max(s.player.invul, 2.1);
}
export function bossMoves(e) { const b = states.get(e); if (!b)
    return []; const moves = b.variant === 2 ? [...b.design.moves] : middleMoves(b.design, b.variant === 1); return moves.slice(0, b.variant === 2 ? 4 + e.phase : 2 + e.phase); }
export function chooseBossMove(s, e) { const b = states.get(e); const all = bossMoves(e), filtered = all.filter(m => !b.recent.includes(m)), available = filtered.length ? filtered : all.filter(m => m !== b.recent.at(-1)), order = b.variant === 2 ? b.design.moves : middleMoves(b.design, b.variant === 1), linked = order[(order.indexOf(b.move) + 1) % order.length]; const move = b.casts % 2 === 1 && available.includes(linked) ? linked : available[Math.floor(s.combatRandom() * available.length)]; b.recent = [...b.recent.slice(-1), move]; return move; }
export function castBossMove(s, e, move) {
    const b = states.get(e), w = bossWorld(s), a = w.arena, p = s.player, angle = Math.atan2(p.y - e.y, p.x - e.x), damage = e.damage * s.mode.damage, phase = e.phase;
    b.move = move;
    b.casts++;
    w.history.push({ id: e.id, move, phase, at: s.time });
    if (w.history.length > 200)
        w.history.shift();
    e.warnTime = e.warnDuration = bossTell(move, phase, s.mode.tell);
    e.attackFlash = 0;
    s.emit('warning', e.x, e.y);
    const threat = (kind, extra = {}) => w.threats.push({ kind, move, x: e.x, y: e.y, angle, radius: 90, width: 28, length: Math.max(a.halfW, a.halfH) * 2.5, age: 0, warning: e.warnDuration, duration: .2, damage, phase, spin: 0, released: false, owner: e.id, sourceX: e.x, sourceY: e.y, ...extra });
    if (move === 'fan' || move === 'rebound' || move === 'spiral')
        threat('volley', { duration: move === 'spiral' ? 1.05 : .02 });
    if (move === 'pulse')
        threat('ring', { radius: 90, width: 24, duration: 2.6, angle: angle + .8, spin: .26 });
    if (move === 'charge')
        threat('charge', { width: e.r * 2, length: Math.min(430, Math.hypot(p.x - e.x, p.y - e.y) + 100), duration: .62 });
    if (move === 'sweep')
        threat('beam', { angle: angle - .4, width: 26, duration: 1.5, spin: -.75 });
    if (move === 'mines' || move === 'rain') {
        const count = move === 'rain' ? 5 : 3;
        const escape = Math.atan2(a.y - p.y, a.x - p.x), side = escape + Math.PI / 2;
        for (let i = 0; i < count; i++) {
            const offset = i === 0 ? 0 : i === 1 ? 190 : -190, dx = move === 'rain' ? (i - 2) * 100 : Math.cos(side) * offset, dy = move === 'rain' ? Math.sin(i * 1.6) * 75 : Math.sin(side) * offset;
            threat('disk', { x: clamp(p.x + dx, a.x - a.halfW + 25, a.x + a.halfW - 25), y: clamp(p.y + dy, a.y - a.halfH + 25, a.y + a.halfH - 25), radius: move === 'rain' ? 62 : 80, age: -i * .1, duration: .32 });
        }
    }
    if (move === 'corridor')
        threat('corridor', { x: a.x, y: clamp(p.y, a.y - a.halfH + 220, a.y + a.halfH - 220), width: Math.min(230, a.halfH * .6), radius: Math.min(105, a.halfH * .25), duration: 2.4, spin: .75, angle: 0 });
    if (move === 'summon')
        threat('summon', { x: a.x, y: a.y, radius: Math.min(a.halfW, a.halfH) - 110, duration: .02, angle: 0 });
    b.next = Math.max(...w.threats.filter(t => t.owner === e.id).map(t => t.warning + t.duration - t.age)) + (b.casts % 2 === 1 ? .22 : .65) - phase * .06;
    e.timer = b.next;
}
export function updateBoss(s, e, dt) {
    const b = states.get(e);
    if (!b)
        return false;
    b.intro += dt;
    b.next -= dt;
    b.breakCD = Math.max(0, b.breakCD - dt);
    e.warnTime = Math.max(0, e.warnTime - dt);
    e.angle = Math.atan2(s.player.y - e.y, s.player.x - e.x);
    if (b.intro < .8) {
        if (b.intro >= .35 && b.intro - dt < .35) {
            s.shake = 8;
            s.emit('impact', e.x, e.y, 1);
        }
        return true;
    }
    if (e.phase !== b.phase) {
        b.phase = e.phase;
        b.next = .9;
        b.move = null;
        bossWorld(s).threats = bossWorld(s).threats.filter(t => t.owner !== e.id);
        s.bulletPool.active.length = 0;
    }
    if (e.stageGuard > 0)
        return true;
    const arena = bossWorld(s).arena;
    if (!arena)
        return true;
    if (b.dash > 0) {
        const travel = Math.min(b.dash, 720 * dt);
        b.dash -= travel;
        e.x += Math.cos(b.heading) * travel;
        e.y += Math.sin(b.heading) * travel;
    }
    else if (e.warnTime <= 0) {
        const dx = s.player.x - e.x, dy = s.player.y - e.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx) + (d < 230 ? Math.PI / 2 : 0), speed = e.speed * (1 + e.phase * .16) * (e.status.freeze > 0 ? .65 : 1);
        e.x += Math.cos(a) * speed * dt;
        e.y += Math.sin(a) * speed * dt;
    }
    e.x = clamp(e.x, arena.x - arena.halfW + e.r + 20, arena.x + arena.halfW - e.r - 20);
    e.y = clamp(e.y, arena.y - arena.halfH + e.r + 20, arena.y + arena.halfH - e.r - 20);
    if (b.next <= 0 && b.dash <= 0)
        castBossMove(s, e, chooseBossMove(s, e));
    if (Math.hypot(s.player.x - e.x, s.player.y - e.y) < e.r + s.player.r)
        hurtBoss(s, e.damage, 'boss:' + e.bossArt);
    return true;
}
export function arenaContains(a, x, y, r = 0) { return Math.abs(x - a.x) <= a.halfW - r && Math.abs(y - a.y) <= a.halfH - r; }
export function arenaSpawnAllowed(s, type, escort = false) { const a = worlds.get(s)?.arena; return !a || a.release >= 0 || type === 'boss' || escort; }
export function constrainArena(s) { const a = worlds.get(s)?.arena; if (!a || a.release >= 0)
    return; const p = s.player, margin = p.r + 10, x = clamp(p.x, a.x - a.halfW + margin, a.x + a.halfW - margin), y = clamp(p.y, a.y - a.halfH + margin, a.y + a.halfH - margin); if (x !== p.x || y !== p.y) {
    p.x = x;
    p.y = y;
    p.vx = p.vy = 0;
    s.hurt(Math.min(3 / (s.chapter?.damage ?? 1), p.maxHp * .02 / (s.chapter?.damage ?? 1)), 'arena');
} }
export function bounceArena(s, b, enemy) {
    const a = worlds.get(s)?.arena;
    if (!a || a.release >= 0)
        return;
    const x = clamp(b.x, a.x - a.halfW + b.r, a.x + a.halfW - b.r), y = clamp(b.y, a.y - a.halfH + b.r, a.y + a.halfH - b.r);
    if (x === b.x && y === b.y)
        return;
    const count = rebounds.get(b) ?? 0;
    if (count >= (b.kind === 'ricochet' ? 3 : 1)) {
        b.life = 0;
        return;
    }
    if (x !== b.x)
        b.vx = (x < b.x ? -1 : 1) * Math.abs(b.vx);
    if (y !== b.y)
        b.vy = (y < b.y ? -1 : 1) * Math.abs(b.vy);
    b.x = x;
    b.y = y;
    rebounds.set(b, count + 1);
    if (enemy)
        bossWorld(s).bounces++;
}
export function resetBossBullet(b) { homing.delete(b); rebounds.delete(b); }
export function steerBossBullet(s, b, dt) { const turn = homing.get(b); if (turn === undefined || b.age > 1.1)
    return; const heading = Math.atan2(b.vy, b.vx), target = Math.atan2(s.player.y - b.y, s.player.x - b.x), delta = Math.atan2(Math.sin(target - heading), Math.cos(target - heading)), a = heading + clamp(delta, -turn * dt, turn * dt), speed = Math.hypot(b.vx, b.vy); b.vx = Math.cos(a) * speed; b.vy = Math.sin(a) * speed; }
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export function threatHits(t, x, y, r, age = t.age) {
    const elapsed = age - t.warning;
    if (elapsed < 0 || elapsed > t.duration)
        return false;
    const dx = x - t.x, dy = y - t.y;
    if (t.kind === 'disk')
        return Math.hypot(dx, dy) < t.radius + r;
    if (t.kind === 'beam') {
        const a = t.angle + t.spin * elapsed, along = dx * Math.cos(a) + dy * Math.sin(a), across = -dx * Math.sin(a) + dy * Math.cos(a);
        return along >= -r && along < t.length + r && Math.abs(across) < t.width / 2 + r;
    }
    if (t.kind === 'ring') {
        const radius = t.radius + elapsed * 215;
        return Math.abs(Math.hypot(dx, dy) - radius) < t.width / 2 + r && angleDistance(Math.atan2(dy, dx), t.angle + t.spin * elapsed) > .55;
    }
    if (t.kind === 'corridor') {
        const center = Math.sin(elapsed * t.spin) * t.radius;
        return Math.abs(dy - center) > t.width / 2 - r;
    }
    return false;
}
function release(s, t) {
    const e = s.enemies.find(e => e.id === t.owner);
    if (!e || e.hp <= 0)
        return;
    e.attackFlash = 1 / 30;
    const shot = (angle, speed, kind = 'pulse', x = t.x, y = t.y) => { const damage = Math.min(t.damage, s.player.maxHp * .24 / ((s.chapter?.damage ?? 1) * s.chaos.incoming)), b = s.fire(x, y, angle, speed, damage, true, kind, '#ff80a2', kind === 'ricochet' ? 4.5 : 3.4); if (b && t.move === 'rain')
        homing.set(b, .65); return b; };
    const speed = (270 + t.phase * 32) * s.mode.speed;
    if (t.move === 'fan')
        for (let wave = 0; wave < 2; wave++)
            for (let i = 0; i < 7 + t.phase * 2; i++)
                shot(t.angle + (i - (6 + t.phase * 2) / 2) * .17, speed + wave * 45);
    if (t.move === 'rebound')
        for (let i = 0; i < 12 + t.phase * 2; i++) {
            const a = i / (12 + t.phase * 2) * TAU;
            if (angleDistance(a, t.angle + .6) < .5)
                continue;
            shot(a, speed, 'ricochet');
        }
    if (t.kind === 'charge') {
        const b = states.get(e);
        b.dash = t.length;
        b.heading = t.angle;
    }
    if (t.kind === 'summon')
        for (let i = 0; i < 3; i++) {
            const a = i / 3 * TAU, x = t.x + Math.cos(a) * t.radius, y = t.y + Math.sin(a) * t.radius;
            const n = s.spawn('mini', x, y, '', false, false, true);
            if (n) {
                n.hp = n.maxHp = Math.min(160, e.maxHp * .006);
                n.speed = 110;
                n.damage = e.damage * .45;
                n.escort = true;
                n.xp = 6;
            }
        }
    if (t.move === 'rain')
        shot(Math.atan2(s.player.y - t.y, s.player.x - t.x), 200 * s.mode.speed, 'seeker');
}
export function updateBossWorld(s, dt) {
    const w = worlds.get(s);
    if (!w)
        return;
    const a = w.arena;
    if (a) {
        a.age += dt;
        if (a.release >= 0) {
            a.release += dt;
            if (a.release > 1.2)
                w.arena = null;
        }
    }
    for (const r of w.remains)
        r.age += dt;
    w.remains = w.remains.filter(r => r.age < 1.6);
    for (let i = w.threats.length - 1; i >= 0; i--) {
        const t = w.threats[i], before = t.age;
        t.age += dt;
        if (!t.released && t.age >= t.warning) {
            t.released = true;
            release(s, t);
        }
        if (t.move === 'spiral' && t.age >= t.warning && Math.floor((t.age - t.warning) * 10) > Math.floor(Math.max(-.01, before - t.warning) * 10)) {
            for (let k = 0; k < 3; k++) {
                const a = t.angle + k * TAU / 3 + (t.age - t.warning) * 3.4;
                s.fire(t.x, t.y, a, (270 + t.phase * 32) * s.mode.speed, Math.min(t.damage, s.player.maxHp * .24 / ((s.chapter?.damage ?? 1) * s.chaos.incoming)), true, 'pulse', '#ff80a2', 3.4);
            }
        }
        if (threatHits(t, s.player.x, s.player.y, s.player.r))
            hurtBoss(s, t.damage, 'boss:' + t.move);
        if (t.age > t.warning + t.duration)
            w.threats.splice(i, 1);
    }
}
export function finishBoss(s, e) { const b = states.get(e); if (!b)
    return; const w = bossWorld(s); w.remains.push({ x: e.x, y: e.y, age: 0, design: b.design, variant: b.variant }); if (w.arena?.owner === e.id)
    w.arena.release = 0; w.threats = w.threats.filter(t => t.owner !== e.id); s.bulletPool.active.length = 0; const drop = s.drops.at(-1); if (drop)
    drop.rank = Math.max(3, drop.rank ?? 0); states.delete(e); }
export function bossWarningShapes(s) {
    const w = worlds.get(s);
    if (!w)
        return [];
    const out = [];
    for (const t of w.threats) {
        if (t.age < 0 || t.age > t.warning + 1 / 30)
            continue;
        const progress = clamp(t.age / t.warning, 0, 1), q = { kind: 'disk', x: t.x, y: t.y, angle: t.angle, radius: t.radius, width: t.width, length: t.length, gaps: [], gapWidth: 0, gap: 0, progress, flash: t.age >= t.warning, boss: true, floor: true, opacity: .85, color: progress > .8 ? '#ffe1a3' : '#e590a0', sourceX: t.sourceX, sourceY: t.sourceY };
        if (t.kind === 'charge')
            q.kind = 'strip';
        if (t.kind === 'beam') {
            q.kind = 'cone';
            q.angle = t.angle + t.spin * t.duration / 2;
            q.radius = Math.min(t.length, 1000);
            q.gapWidth = Math.abs(t.spin * t.duration) + .1;
        }
        if (t.kind === 'volley') {
            q.kind = t.move === 'fan' ? 'cone' : 'ring';
            q.radius = t.move === 'fan' ? 300 : 100;
            q.gaps = t.move === 'spiral' ? [] : [t.angle + .6];
            q.gapWidth = t.move === 'fan' ? 1.7 : 1;
        }
        if (t.kind === 'ring') {
            q.kind = 'ring';
            q.gaps = [t.angle];
            q.gapWidth = 1.1;
        }
        if (t.kind === 'summon') {
            for (let i = 0; i < 3; i++)
                out.push({ ...q, x: t.x + Math.cos(i / 3 * TAU) * t.radius, y: t.y + Math.sin(i / 3 * TAU) * t.radius, radius: 40 });
            continue;
        }
        if (t.kind === 'corridor') {
            const a = w.arena;
            for (const sign of [-1, 1])
                out.push({ ...q, kind: 'strip', x: a.x - a.halfW, y: sign < 0 ? (a.y - a.halfH + t.y - t.width / 2) / 2 : (a.y + a.halfH + t.y + t.width / 2) / 2, angle: 0, length: a.halfW * 2, width: sign < 0 ? t.y - t.width / 2 - (a.y - a.halfH) : a.y + a.halfH - t.y - t.width / 2 });
            continue;
        }
        out.push(q);
    }
    return out;
}

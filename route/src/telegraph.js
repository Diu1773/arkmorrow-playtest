import { bossWarningShapes, bossState } from './boss-director.js';
export const warningProgress = (remaining, duration) => Math.max(0, Math.min(1, 1 - remaining / Math.max(.001, duration)));
export const windupFrame = (e) => e.warnTime > 0 ? Math.min(2, Math.floor(warningProgress(e.warnTime, e.warnDuration) * 3)) : -1;
const base = (x, y, boss, progress, flash = false) => ({ kind: 'disk', x, y, angle: 0, radius: 90, width: 28, length: 250, gaps: [], gapWidth: 0, gap: 0, progress, flash: flash && boss, boss, floor: true, opacity: boss ? .72 : .22, color: '#b45d68', sourceX: x, sourceY: y });
function bossPattern(e, p, progress, flash) {
    const q = base(e.x, e.y, true, progress, flash);
    q.angle = p.angle;
    if (p.pattern === 'ring' || p.pattern === 'closing' || p.pattern === 'balloon') {
        q.kind = 'ring';
        q.radius = p.pattern === 'closing' ? 430 : p.pattern === 'balloon' ? 130 : e.r + 65;
        if (p.pattern === 'closing') {
            q.x = p.x;
            q.y = p.y;
        }
        q.gaps = p.pattern === 'ring' ? [p.angle + .7] : p.pattern === 'balloon' ? [p.gap, p.gap + Math.PI] : [p.gap];
        q.gapWidth = p.pattern === 'ring' ? .7 : p.pattern === 'closing' ? .85 : .8;
    }
    else if (p.pattern === 'wall') {
        q.kind = 'wall';
        q.gap = p.gap;
        q.length = 900;
        q.width = 26;
    }
    else if (['laser', 'charge', 'barSweep'].includes(p.pattern)) {
        q.kind = 'strip';
        q.length = p.pattern === 'charge' ? 300 : 1100;
        q.width = p.pattern === 'charge' ? e.r * 2 : 30;
        if (p.pattern === 'barSweep') {
            q.x -= Math.cos(p.angle) * 1100;
            q.y -= Math.sin(p.angle) * 1100;
            q.length = 2200;
        }
    }
    else if (p.pattern === 'fan' || p.pattern === 'prism') {
        q.kind = 'cone';
        q.radius = 250;
        q.gapWidth = ((p.pattern === 'fan' ? 7 + p.phase * 2 : 3 + p.phase) - 1) * .25 + .12;
    }
    else {
        q.kind = 'ring';
        q.radius = e.r * 1.4;
    }
    return q;
}
export function warningShapes(sim, mode = sim.telegraphs) {
    if (mode === 'off')
        return [];
    const shapes = bossWarningShapes(sim);
    for (const h of sim.hazards) {
        if (!h.boss && mode !== 'all' || h.age > h.warning + 1 / 60)
            continue;
        const q = base(h.x, h.y, h.boss, warningProgress(h.warning - h.age, h.warning), h.age >= h.warning);
        q.angle = h.angle;
        q.width = h.width;
        q.length = h.length;
        q.radius = h.type === 'shell' ? Math.max(h.r0, 130) : h.r;
        q.gaps = h.gaps;
        q.gapWidth = h.gapW;
        q.gap = h.gap;
        q.kind = h.type === 'shell' || h.type === 'ringwarn' ? 'ring' : h.type === 'wallwarn' ? 'wall' : 'strip';
        if (h.type === 'sweep') {
            q.x -= Math.cos(h.angle) * h.length;
            q.y -= Math.sin(h.angle) * h.length;
            q.length *= 2;
        }
        shapes.push(q);
    }
    for (const e of sim.enemies) {
        if (e.hp <= 0 || bossState(e))
            continue;
        const boss = e.type === 'boss', flash = e.attackFlash > 0, p = e.warnTime > 0 ? e.pendingAttack : flash ? e.lastAttack : null;
        if (!p)
            continue;
        const progress = warningProgress(e.warnTime, e.warnDuration);
        if (boss) {
            if (e.warnTime > 0 && ['closing', 'ring', 'wall', 'barSweep', 'balloon', 'laser', 'charge'].includes(p.pattern))
                continue;
            shapes.push(bossPattern(e, p, progress, flash));
            continue;
        }
        const action = e.action || e.type;
        if (mode !== 'all' && action !== 'snipe' && action !== 'burrow')
            continue;
        const q = base(e.x, e.y, false, progress, flash);
        q.angle = e.action ? e.actionAngle : p.angle;
        if (action === 'snipe') {
            q.kind = 'sight';
            q.floor = false;
            q.length = 850;
            q.opacity = (.08 + progress * .24) * (Math.floor(sim.time * 18) % 2 ? .6 : 1);
            shapes.push(q);
            continue;
        }
        if (action === 'burrow') {
            q.kind = 'shadow';
            q.floor = false;
            q.x = e.targetX;
            q.y = e.targetY;
            q.radius = 42;
            q.opacity = .18 + progress * .12;
            shapes.push(q);
            continue;
        }
        if (mode !== 'all')
            continue;
        if (action === 'teleport') {
            q.x = e.targetX;
            q.y = e.targetY;
            q.radius = 40;
        }
        else if (action === 'charge') {
            q.kind = 'strip';
            q.length = 250;
            q.width = e.r * 1.6;
        }
        else if (action === 'suicide')
            q.radius = 110;
        else if (action === 'heal' || action === 'summon')
            q.radius = 85;
        else {
            q.kind = 'cone';
            q.radius = 150;
            q.gapWidth = .3;
        }
        shapes.push(q);
    }
    return shapes;
}

import { WEAPONS } from './data.js';
export function weaponAim(sim, id, input, range = 800) {
    const p = sim.player, mode = WEAPONS.find(w => w.id === id).aim;
    let target;
    if (mode === 'closest')
        target = sim.nearest(p.x, p.y, range);
    else if (mode === 'none' && ['quake', 'blackhole', 'frost'].includes(id)) {
        let seen = 0;
        for (const e of sim.enemies)
            if (e.hp > 0 && !e.hidden && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 <= range * range && sim.combatRandom() < 1 / ++seen)
                target = e;
    }
    const beacon = mode === 'closest' && ['pulse', 'missile', 'laser'].includes(id) && sim.beacon && Math.hypot(sim.beacon.x - p.x, sim.beacon.y - p.y) < 500 ? sim.beacon : null, point = beacon ?? target;
    const angle = mode === 'none' ? target ? Math.atan2(target.y - p.y, target.x - p.x) : 0 : input.manual && Math.hypot(input.aimX, input.aimY) > .1 ? Math.atan2(input.aimY, input.aimX) : mode === 'closest' && point ? Math.atan2(point.y - p.y, point.x - p.x) : p.angle;
    return { mode, target, angle, x: mode === 'movement' ? p.x + Math.cos(angle) * 120 : target?.x ?? p.x, y: mode === 'movement' ? p.y + Math.sin(angle) * 120 : target?.y ?? p.y };
}

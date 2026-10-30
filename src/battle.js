import { weaponAim } from './aim.js';
import { ELEMENTS, WEAPONS } from './data.js';
import { clamp, weaponStats } from './core.js';
import { REACTIONS, reactionFor } from './combat-rules.js';
import { combatCopy } from './i18n.js';
export const elementOf = (weapon) => WEAPONS.find(w => w.id === weapon)?.element ?? 'physical';
export function impact(sim, x, y, r, damage, weapon, push = 0) {
    sim.areaDamage(x, y, r, damage, push, weapon);
    sim.effect('blast', x, y, r, ELEMENTS[elementOf(weapon)].color, .55, 0, 0, 0, false, weapon);
    sim.burst(x, y, ELEMENTS[elementOf(weapon)].color, r >= 180 ? 18 : 10, r >= 180 ? 3 : 2);
    if (r >= 150) {
        sim.shake = Math.max(sim.shake, r >= 280 ? 8 : 4);
        sim.hitStop = Math.max(sim.hitStop, r >= 280 ? .065 : .035);
    }
    sim.emit('impact', x, y, r, ELEMENTS[elementOf(weapon)].color, weapon, r);
}
export function statusHit(sim, e, damage, weapon) {
    const s = e.status, element = elementOf(weapon), reaction = reactionFor(s, weapon, element);
    if (reaction) {
        s.reactionCD = .7;
        sim.reactionCounts[reaction] = (sim.reactionCounts[reaction] ?? 0) + 1;
        const index = REACTIONS.findIndex(r => r.id === reaction), color = ELEMENTS[REACTIONS[index].element].color;
        if (sim.floaters.length >= 24) {
            const numeric = sim.floaters.findIndex(f => Number.isFinite(Number(f.text)));
            if (numeric >= 0)
                sim.floaters.splice(numeric, 1);
        }
        if (sim.floaters.length < 24)
            sim.floaters.push({ x: e.x, y: e.y - e.r - 18, life: .9, text: combatCopy('en').reactionNames[index], color });
        sim.effect(reaction === 'arc' ? 'line' : reaction === 'shatter' ? 'shatter' : reaction === 'collapse' ? 'gravity' : 'blast', e.x, e.y, 95, color, .5, 0, e.x + 50, e.y - 40, false, weapon);
        sim.burst(e.x, e.y, color, 12, 3);
        sim.emit('reaction', e.x, e.y, index, color, weapon);
        const multiplier = reaction === 'collapse' ? 1.3 : reaction === 'shatter' ? 1.1 : .65;
        sim.hash.query(e.x, e.y, 160, n => { if (n.hp <= 0 || n.hidden || Math.hypot(n.x - e.x, n.y - e.y) > 150)
            return; if (reaction === 'arc' && n !== e && n.status.shock <= 0)
            return; sim.hit(n, damage * multiplier, weapon, false); if (reaction === 'arc' && n !== e)
            sim.effect('line', e.x, e.y, 0, color, .18, 0, n.x, n.y, false, 'chain'); });
        if (reaction === 'shatter' || reaction === 'steam')
            s.freeze = 0;
        if (reaction === 'toxic')
            s.acid = 0;
        if (reaction === 'overload')
            s.shock = 0;
    }
    const duration = sim.attributes.duration;
    if (element === 'fire') {
        s.burn = 2.4 * duration;
        s.dot = Math.max(s.dot, damage * .1);
    }
    if (element === 'ice')
        s.freeze = Math.max(s.freeze, (weapon === 'frost' ? .9 : .45) * duration);
    if (element === 'electric')
        s.shock = 2.8 * duration;
    if (element === 'gravity')
        s.pull = 1.2 * duration;
    if (weapon === 'acid')
        s.acid = 3 * duration;
    if (weapon === 'mark')
        s.mark = 4 * duration;
    if (weapon === 'quake' || weapon === 'resonance')
        s.stun = Math.max(s.stun, .16);
}
export function attackSkill(sim, slot, input) {
    if (WEAPONS.findIndex(w => w.id === slot.id) < 8 && !slot.fusion)
        return false;
    const p = sim.player, s = sim.attributes, w = weaponStats(slot, s), element = elementOf(slot.id), color = ELEMENTS[element].color;
    const aim = weaponAim(sim, slot.id, input, 650), target = aim.target, a = aim.angle;
    const x = aim.x, y = aim.y, damage = w.damage * sim.power, n = slot.evolved ? 3 : slot.level >= 5 ? 3 : slot.level >= 3 ? 2 : 1;
    const zone = (kind, xx, yy, r, life, dmg = damage, weapon = slot.id) => sim.effect(kind, xx, yy, r, ELEMENTS[elementOf(weapon)].color, life * w.duration, dmg, 0, 0, false, weapon);
    if (slot.fusion === 'supernova') {
        zone('gravity', x, y, w.radius * 1.35, 2.3, damage);
        sim.effect('mine', x, y, w.radius * 1.5, ELEMENTS.fire.color, 2.3 * w.duration, damage * 4, 0, 0, true, 'bomb');
    }
    else if (slot.fusion === 'thunderhead') {
        zone('ground', p.x, p.y, 260 * s.area, 2.6, damage, 'tether');
        for (let j = 0; j < 3; j++) {
            const ang = a + j * Math.PI * 2 / 3;
            sim.effect('wave', p.x, p.y, 350 * s.area, ELEMENTS.electric.color, 1.2, damage, Math.cos(ang) * 300, Math.sin(ang) * 300, false, 'tether');
        }
    }
    else if (slot.fusion === 'glassfall') {
        zone('ground', x, y, w.radius * 1.4, 3, damage, 'frost');
        for (let j = 0; j < 8; j++)
            sim.fire(p.x, p.y, a + j * Math.PI / 4, 300, damage, false, 'blade', ELEMENTS.ice.color, 1.8, 8, 'blade');
    }
    else if (slot.fusion === 'reactor') {
        zone('ground', x, y, 200 * s.area, 3, damage, 'acid');
        zone('ground', x, y, 190 * s.area, 3, damage, 'flame');
    }
    else if (slot.id === 'bomb') {
        for (let j = 0; j < w.count; j++) {
            const b = sim.fire(p.x, p.y, a + (j - (w.count - 1) / 2) * .22, 320, damage, false, 'bomb', color, 1.8, 0, 'bomb');
            if (b)
                b.targetId = target?.id ?? 0;
        }
    }
    else if (slot.id === 'ripple') {
        sim.effect('wave', p.x, p.y, w.radius, color, 1.2, damage, Math.cos(a) * 300, Math.sin(a) * 300, false, slot.id);
        if (slot.level >= 3)
            sim.effect('ripple', p.x, p.y, w.radius * .7, color, .6, damage * .35, 0, 0, false, slot.id);
        if (slot.level >= 5)
            sim.effect('ripple', p.x, p.y, w.radius, color, .9, damage, 0, 0, false, slot.id);
    }
    else if (slot.id === 'quake') {
        zone('quake', x, y, w.radius * (slot.evolved ? 2 : 1), slot.level >= 3 ? 3.5 : 2.8);
        if (slot.level >= 3)
            zone('quake', x - Math.cos(a) * 100, y - Math.sin(a) * 100, w.radius * .6, 2, damage * .25);
        if (slot.level >= 5)
            zone('quake', x + Math.cos(a + 1.57) * 100, y + Math.sin(a + 1.57) * 100, w.radius * .75, 2);
    }
    else if (slot.id === 'blackhole') {
        zone('gravity', x, y, w.radius * (slot.evolved ? 1.45 : 1), 2 + (slot.level >= 3 ? .5 : 0));
        if (slot.level >= 5)
            zone('gravity', x + 130, y - 80, w.radius * .65, 1.5, damage * .5);
    }
    else if (['flame', 'acid', 'frost'].includes(slot.id)) {
        for (let j = 0; j < n; j++) {
            const offset = (j - (n - 1) / 2) * 85;
            zone('ground', slot.id === 'flame' ? p.x - Math.cos(a) * (30 + j * 65) : x - Math.sin(a) * offset, slot.id === 'flame' ? p.y - Math.sin(a) * (30 + j * 65) : y + Math.cos(a) * offset, w.radius, slot.id === 'flame' ? 2.8 : 3.2);
        }
    }
    else if (slot.id === 'tether') {
        if (target) {
            const other = sim.nearest(x, y, Math.min(450, w.radius), new Set([target.id]));
            for (let j = 0; j < n; j++)
                sim.effect('tether', p.x + (j - 1) * 45, p.y, w.radius, color, 1.7 * w.duration, damage, other?.x ?? x, other?.y ?? y, false, 'tether');
        }
    }
    else if (slot.id === 'mark') {
        const used = new Set();
        for (let j = 0; j < (slot.level >= 3 ? 3 : 1); j++) {
            const e = sim.nearest(p.x, p.y, w.radius, used);
            if (!e)
                break;
            used.add(e.id);
            sim.hit(e, damage, 'mark');
            if (slot.level >= 5)
                sim.effect('mine', e.x, e.y, 90, color, .7, damage * .35, 0, 0, false, 'mark');
            sim.effect('mark', e.x, e.y, e.r + 16, color, 1.1 * w.duration, 0, 0, 0, false, 'mark');
        }
    }
    else if (slot.id === 'turret') {
        for (let j = 0; j < n; j++)
            zone('turret', p.x + Math.cos(a + j * 2.1) * 65, p.y + Math.sin(a + j * 2.1) * 65, w.radius, 3.3);
    }
    else if (slot.id === 'blade') {
        for (let j = 0; j < w.count; j++)
            sim.fire(p.x, p.y, a + (j - (w.count - 1) / 2) * .35, 320, damage, false, 'blade', color, 1.9, 2 + s.pierce, slot.id);
    }
    else if (slot.id === 'resonance')
        sim.effect('resonance', p.x, p.y, w.radius, color, slot.evolved ? 2.1 : slot.level >= 8 ? 1.8 : slot.level >= 5 ? 1.5 : slot.level >= 3 ? 1.2 : .9, damage, 0, 0, false, slot.id);
    sim.emit('shoot', p.x, p.y, 0, color, slot.id);
    return true;
}
export function updateBattleEffects(sim, dt) {
    for (let i = sim.effects.length - 1; i >= 0; i--) {
        const e = sim.effects[i];
        e.ttl -= dt;
        e.tick -= dt;
        const age = e.life - e.ttl;
        if (e.kind === 'mine' && !e.done && e.ttl <= .12) {
            e.done = true;
            impact(sim, e.x, e.y, e.radius, e.damage, e.weapon, 20);
            if (e.repeat)
                sim.effect('mine', e.x, e.y, e.radius * .75, e.color, .5, e.damage * .4, 0, 0, false, e.weapon);
        }
        if (e.kind === 'wave') {
            e.x += e.x2 * dt;
            e.y += e.y2 * dt;
        }
        if (['ground', 'quake', 'gravity', 'turret', 'tether', 'ripple', 'wave', 'resonance'].includes(e.kind) && e.tick <= 0) {
            const cadence = e.kind === 'resonance' ? .3 : .38;
            e.tick = cadence;
            if (e.kind === 'turret') {
                const target = sim.nearest(e.x, e.y, e.radius);
                if (target) {
                    const a = Math.atan2(target.y - e.y, target.x - e.x);
                    sim.fire(e.x, e.y, a, 600, e.damage, false, 'pulse', e.color, 1, sim.attributes.pierce, e.weapon);
                }
            }
            else {
                const radius = e.kind === 'ripple' ? e.radius * clamp(age / e.life, 0, 1) : e.kind === 'wave' ? e.radius * .38 : e.radius;
                sim.hash.query(e.x, e.y, e.kind === 'tether' ? e.radius + 80 : radius + 70, n => {
                    if (n.hp <= 0 || n.hidden)
                        return;
                    const d = Math.hypot(n.x - e.x, n.y - e.y);
                    const on = e.kind === 'tether' ? segment(n.x, n.y, e.x, e.y, e.x2, e.y2) < n.r + 18 : d < radius + n.r;
                    if (!on)
                        return;
                    if ((e.kind === 'ripple' || e.kind === 'wave') && e.hits.has(n.id))
                        return;
                    e.hits.add(n.id);
                    if (e.kind === 'gravity' && n.type !== 'boss') {
                        const pull = Math.min(d, 36 * sim.attributes.duration);
                        n.x += (e.x - n.x) / (d || 1) * pull;
                        n.y += (e.y - n.y) / (d || 1) * pull;
                        n.status.pull = 1;
                    }
                    sim.hit(n, e.damage * (e.kind === 'gravity' ? .8 : 1), e.weapon);
                    if (e.kind === 'wave' || e.kind === 'ripple') {
                        n.x += (n.x - e.x) / (d || 1) * 24;
                        n.y += (n.y - e.y) / (d || 1) * 24;
                    }
                });
                sim.hitBeacon(e.x, e.y, radius, e.damage * .5);
                if (e.kind === 'resonance' || e.kind === 'quake') {
                    sim.shake = Math.max(sim.shake, 2);
                    sim.emit('impact', e.x, e.y, 2, e.color, e.weapon);
                }
            }
            if (e.kind === 'ground' || e.kind === 'gravity')
                sim.burst(e.x, e.y, e.color, 3, 1, e.kind === 'gravity');
        }
        if (e.ttl <= 0) {
            if (e.kind === 'gravity')
                impact(sim, e.x, e.y, e.radius, e.damage * 2, 'blackhole');
            if (e.kind === 'splitwarn') {
                sim.spawn('mini', e.x - 18, e.y);
                sim.spawn('mini', e.x + 18, e.y);
            }
            sim.effectPool.remove(i);
        }
    }
}
function segment(x, y, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1), 0, 1); return Math.hypot(x - ax - dx * t, y - ay - dy * t); }

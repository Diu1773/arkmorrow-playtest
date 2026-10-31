import { DASH, SKILLS, skillDef, skillStats } from './combat-catalog.js';
import { impact, gravityMultiplier } from './battle.js';
import { arenaPoint, constrainArena, interruptBoss } from './boss-director.js';
const distance = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t);
};
export function castSkill(sim, slot, input, automatic = false) {
    if (slot.timer > 0 || slot.cast > 0 || sim.skills.some(s => s.cast > 0))
        return false;
    const p = sim.player, def = skillDef(slot.id), target = automatic ? sim.enemies.filter(e => e.hp > 0 && !e.hidden && Math.hypot(e.x - p.x, e.y - p.y) < 650).sort((a, b) => Number(b.type === 'boss') - Number(a.type === 'boss') || Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y))[0] : undefined;
    slot.angle = input.manual && Math.hypot(input.aimX, input.aimY) > .1 ? Math.atan2(input.aimY, input.aimX) : target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
    const reach = slot.id === 'hammer' || slot.id === 'shock' ? 110 : ['defense', 'buff', 'summon'].includes(def.category) || slot.id === 'flare' ? 0 : 300;
    const point = arenaPoint(sim, { x: p.x + Math.cos(slot.angle) * reach, y: p.y + Math.sin(slot.angle) * reach });
    slot.x = point.x;
    slot.y = point.y;
    slot.automatic = automatic;
    slot.timer = skillStats(slot, sim.attributes).cooldown;
    slot.cast = def.cast;
    sim.skillUses[slot.id] = (sim.skillUses[slot.id] ?? 0) + 1;
    if (slot.cast) {
        sim.effect('mark', slot.x, slot.y, skillStats(slot, sim.attributes).radius, def.color, slot.cast, 0, 0, 0, false, def.weapon);
        sim.emit('prepare', slot.x, slot.y, 0, def.color, def.weapon);
    }
    else
        releaseSkill(sim, slot);
    return true;
}
function releaseSkill(sim, slot) {
    const p = sim.player, def = skillDef(slot.id), w = skillStats(slot, sim.attributes), damage = w.damage * sim.power;
    sim.emit('shoot', p.x, p.y, 0, def.color, def.weapon);
    if (def.category === 'movement') {
        const start = { x: p.x, y: p.y }, length = slot.id === 'swing' ? 310 : slot.id === 'vault' ? 230 : slot.id === 'warp' ? 210 : 145;
        p.x = Math.max(30, Math.min(4770, p.x + Math.cos(slot.angle) * length));
        p.y = Math.max(30, Math.min(3170, p.y + Math.sin(slot.angle) * length));
        constrainArena(sim);
        p.invul = Math.max(p.invul, .3);
        p.vx = p.vy = 0;
        for (let j = 0; j < 6; j++)
            sim.dashGhosts.push({ x: start.x + (p.x - start.x) * j / 6, y: start.y + (p.y - start.y) * j / 6, life: .3 });
        for (const e of sim.enemies)
            if (e.hp > 0 && distance(e.x, e.y, start.x, start.y, p.x, p.y) < w.radius + e.r) {
                sim.hit(e, damage, def.weapon);
                e.status.mark = 0;
                e.status.stun = Math.max(e.status.stun, slot.id === 'flash' ? 1.5 : .25);
            }
        if (slot.evolved) {
            impact(sim, p.x, p.y, w.radius * (slot.id === 'flash' ? .8 : 1.5), damage * .65, def.weapon, 25);
            for (const e of sim.enemies)
                if (Math.hypot(e.x - p.x, e.y - p.y) < w.radius + e.r)
                    e.status.mark = 0;
        }
        if (slot.fusion === 'thunderhead') {
            const field = sim.effect('ground', p.x, p.y, 180, SKILLS[7].color, 2, damage * .12, 0, 0, false, 'tether');
            if (field)
                field.normalScale = .02;
        }
        sim.effect('line', start.x, start.y, 0, def.color, .3, 0, p.x, p.y, false, def.weapon);
        return;
    }
    if (['rail', 'comet', 'flare', 'shock', 'barrier', 'aegis', 'overdrive', 'haste'].includes(slot.id)) {
        if (slot.id === 'rail') {
            const end = arenaPoint(sim, { x: p.x + Math.cos(slot.angle) * 680, y: p.y + Math.sin(slot.angle) * 680 });
            for (const e of sim.enemies)
                if (e.hp > 0 && distance(e.x, e.y, p.x, p.y, end.x, end.y) < w.radius + e.r)
                    sim.hit(e, damage, def.weapon);
            sim.effect('line', p.x, p.y, 0, def.color, .25, 0, end.x, end.y, false, def.weapon);
        }
        else {
            impact(sim, slot.x, slot.y, w.radius, damage, def.weapon, slot.id === 'flare' ? 55 : 15);
            if (slot.id === 'shock')
                for (const e of sim.enemies)
                    if (e.hp > 0 && Math.hypot(e.x - slot.x, e.y - slot.y) < w.radius + e.r) {
                        e.status.stun = slot.evolved ? 1.6 : 1;
                        interruptBoss(sim, e);
                    }
        }
        if (slot.id === 'barrier') {
            sim.combatBuffs.shield = Math.max(sim.combatBuffs.shield, p.maxHp * (.12 + .025 * slot.level) * (slot.evolved ? 1.35 : 1));
            sim.combatBuffs.shieldTime = w.duration;
            sim.effect('ring', p.x, p.y, 65, def.color, w.duration);
        }
        if (slot.id === 'aegis') {
            p.invul = Math.max(p.invul, slot.evolved ? .45 : .25);
            for (let i = sim.bullets.length - 1; i >= 0; i--)
                if (Math.hypot(sim.bullets[i].x - p.x, sim.bullets[i].y - p.y) < w.radius)
                    sim.bulletPool.remove(i);
        }
        if (slot.id === 'overdrive') {
            sim.combatBuffs.power = w.duration;
            sim.combatBuffs.powerGain = .12 + .02 * slot.level + (slot.evolved ? .08 : 0);
        }
        if (slot.id === 'haste') {
            sim.combatBuffs.speed = w.duration;
            sim.combatBuffs.speedGain = .16 + .025 * slot.level + (slot.evolved ? .1 : 0);
        }
        return;
    }
    if (slot.id === 'hammer') {
        impact(sim, slot.x, slot.y, w.radius, damage, 'quake', 60);
        for (const e of sim.enemies)
            if (Math.hypot(e.x - slot.x, e.y - slot.y) < w.radius + e.r)
                e.status.stun = slot.evolved ? 1.4 : .7;
        if (slot.evolved || slot.fusion === 'glassfall')
            sim.effect('quake', slot.x, slot.y, w.radius, def.color, 2, damage * .12, 0, 0, false, slot.fusion === 'glassfall' ? 'frost' : 'quake');
        return;
    }
    const count = slot.id === 'void' || slot.id === 'bombard' ? w.count + (slot.evolved && slot.id === 'bombard' ? 2 : 0) : slot.evolved && slot.id === 'drone' ? 2 : 1;
    for (let j = 0; j < count && sim.combatFields.length < 24; j++) {
        const offset = (j - (count - 1) / 2) * (slot.id === 'void' ? 65 : 100), point = arenaPoint(sim, { x: slot.x - Math.sin(slot.angle) * offset, y: slot.y + Math.cos(slot.angle) * offset });
        const target = slot.id === 'void' ? sim.enemies.find(e => e.type === 'boss' && e.hp > 0 && !e.hidden && Math.hypot(e.x - point.x, e.y - point.y) < w.radius + e.r) : undefined;
        const radius = w.radius * (slot.evolved && slot.id === 'reflect' ? 1.3 : 1), visual = sim.effect(slot.id === 'void' || slot.id === 'tether' ? 'gravity' : def.category === 'summon' ? 'turret' : slot.id === 'reflect' ? 'tether' : 'ground', point.x, point.y, radius, def.color, w.duration, 0, point.x, point.y, false, def.weapon);
        if (visual)
            visual.skillVisual = true;
        sim.combatFields.push({ id: slot.id, slot, x: point.x, y: point.y, ttl: w.duration, tick: 0, target: target?.id ?? 0, damage: slot.id === 'void' ? damage / count : damage, radius, count, visual });
    }
}
export function updateSkills(sim, dt, input) {
    for (const key of ['power', 'speed', 'shieldTime'])
        sim.combatBuffs[key] = Math.max(0, sim.combatBuffs[key] - dt);
    if (sim.combatBuffs.shieldTime === 0)
        sim.combatBuffs.shield = 0;
    for (const ghost of sim.dashGhosts)
        ghost.life -= dt;
    sim.dashGhosts = sim.dashGhosts.filter(g => g.life > 0).slice(-16);
    const p = sim.player;
    if (p.dashTime > 0 && !sim.dashGhosts.some(g => g.life > .16))
        sim.dashGhosts.push({ x: p.x, y: p.y, life: .2 });
    for (let i = 0; i < sim.skills.length; i++) {
        const slot = sim.skills[i];
        slot.timer = Math.max(0, slot.timer - dt);
        if (slot.cast > 0) {
            slot.cast = Math.max(0, slot.cast - dt);
            if (slot.cast === 0)
                releaseSkill(sim, slot);
        }
        else {
            const pressed = input.skills?.[i] ?? (i === 0 ? input.skill1 : i === 1 ? input.skill2 : false);
            if (pressed || sim.autoCast && sim.enemies.some(e => e.hp > 0 && !e.hidden && Math.hypot(e.x - p.x, e.y - p.y) < 600))
                castSkill(sim, slot, input, !pressed);
        }
    }
    for (let i = sim.combatFields.length - 1; i >= 0; i--) {
        const f = sim.combatFields[i], def = skillDef(f.id);
        f.ttl -= dt;
        f.tick -= dt;
        if (f.id === 'void' || f.id === 'tether') {
            let target = sim.enemies.find(e => e.id === f.target && e.hp > 0);
            if (!target) {
                target = sim.enemies.find(e => e.type === 'boss' && e.hp > 0 && !e.hidden && Math.hypot(e.x - f.x, e.y - f.y) < f.radius + e.r);
                f.target = target?.id ?? 0;
            }
            if (target && f.id === 'void') {
                f.x = target.x;
                f.y = target.y;
            }
            if (f.id === 'tether')
                for (const e of sim.enemies)
                    if (e.type === 'boss' && Math.hypot(e.x - f.x, e.y - f.y) < f.radius + e.r)
                        e.status.freeze = Math.max(e.status.freeze, .12);
            for (const e of sim.enemies)
                if (e.hp > 0 && e.type !== 'boss' && Math.hypot(e.x - f.x, e.y - f.y) < f.radius + e.r) {
                    const d = Math.hypot(e.x - f.x, e.y - f.y) || 1, travel = Math.min(d, 280 * dt);
                    e.x += (f.x - e.x) / d * travel;
                    e.y += (f.y - e.y) / d * travel;
                    e.status.pull = 1;
                    sim.hash.moved(e);
                }
        }
        if (f.id === 'drone' || f.id === 'reflect') {
            f.x = p.x;
            f.y = p.y;
        }
        if (f.visual && sim.effects.includes(f.visual)) {
            f.visual.x = f.x;
            f.visual.y = f.y;
            f.visual.x2 = f.x + f.radius;
            f.visual.y2 = f.y;
        }
        if (f.id === 'stasis')
            for (const e of sim.enemies)
                if (e.hp > 0 && Math.hypot(e.x - f.x, e.y - f.y) < f.radius + e.r) {
                    e.status.freeze = .15;
                    e.status.stun = e.type === 'boss' ? .08 : .15;
                }
        if (f.id === 'reflect')
            for (let j = sim.bullets.length - 1; j >= 0; j--) {
                const b = sim.bullets[j];
                if (Math.hypot(b.x - p.x, b.y - p.y) > f.radius)
                    continue;
                const a = Math.atan2(-b.vy, -b.vx);
                sim.fire(b.x, b.y, a, Math.max(350, Math.hypot(b.vx, b.vy)), f.damage, false, 'pulse', def.color, 2, sim.attributes.pierce, 'tether');
                sim.bulletPool.remove(j);
                sim.reflections++;
            }
        if (f.tick <= 0) {
            f.tick = f.id === 'void' ? 1 : f.id === 'bombard' ? .5 : .5;
            if (f.id === 'drone' || f.id === 'sentry') {
                for (let j = 0; j < skillStats(f.slot, sim.attributes).count; j++) {
                    const e = sim.nearest(f.x, f.y, f.radius);
                    if (e)
                        sim.fire(f.x, f.y, Math.atan2(e.y - f.y, e.x - f.x), 650, f.damage, false, 'pulse', def.color, 1, sim.attributes.pierce, 'turret');
                }
                for (const g of sim.pickups)
                    if (Math.hypot(g.x - f.x, g.y - f.y) < f.radius)
                        g.pull = true;
                if (f.slot.evolved && f.id === 'drone')
                    p.hp = Math.min(p.maxHp, p.hp + p.maxHp * .008);
            }
            else if (f.id === 'void')
                gravityHit(sim, f, false);
            else if (f.id !== 'reflect')
                sim.areaDamage(f.x, f.y, f.radius, f.damage, 0, def.weapon);
            if (f.slot.fusion === 'supernova') {
                for (const e of sim.enemies)
                    if (e.hp > 0 && Math.hypot(e.x - f.x, e.y - f.y) < f.radius * .65 + e.r)
                        sim.hit(e, f.damage * (e.type === 'boss' || e.elite ? .5 : .003), 'missile', true, { x: f.x, y: f.y });
                impact(sim, f.x, f.y, f.radius * .65, 0, 'missile');
            }
        }
        if (f.ttl <= 0) {
            if (f.id === 'void') {
                gravityHit(sim, f, true);
                impact(sim, f.x, f.y, f.radius, 0, def.weapon, 25);
            }
            else if (f.id !== 'drone' && f.id !== 'sentry')
                impact(sim, f.x, f.y, f.radius, f.damage * (f.id === 'reflect' ? 3 : 1), def.weapon, 25);
            if (f.slot.evolved && f.id === 'void')
                p.invul = Math.max(p.invul, .5);
            if (f.slot.fusion === 'reactor')
                sim.effect('ground', f.x, f.y, f.radius, def.color, 2, f.damage * .2, 0, 0, false, 'acid');
            sim.combatFields.splice(i, 1);
        }
    }
}
function gravityHit(sim, f, final) {
    for (const e of sim.enemies)
        if (e.hp > 0 && Math.hypot(e.x - f.x, e.y - f.y) < f.radius + e.r) {
            sim.hit(e, f.damage * gravityMultiplier(e, final), 'blackhole', true, { x: f.x, y: f.y });
        }
}
export function castMovement(sim) { return sim.skills.some(s => s.cast > 0) ? .5 : 1; }
export function startDash(sim, x, y) {
    const p = sim.player, len = Math.hypot(x, y);
    p.dashTime = DASH.duration;
    p.dashCD = DASH.cooldown * (sim.equipment.traits.dashHaste ? .7 : 1);
    p.invul = Math.max(p.invul, DASH.duration);
    p.dashX = len ? x / len : Math.cos(p.angle);
    p.dashY = len ? y / len : Math.sin(p.angle);
    sim.dashUses++;
}

export function pilotInput(s) {
    const p = s.player;
    let x = Math.cos(s.time * .1), y = Math.sin(s.time * .1), nearest = Infinity;
    for (const g of [...s.pickups, ...s.drops]) {
        const d = Math.hypot(g.x - p.x, g.y - p.y);
        if (d < nearest) {
            nearest = d;
            x = (g.x - p.x) / (d || 1);
            y = (g.y - p.y) / (d || 1);
        }
    }
    for (const e of s.enemies) {
        if (e.hp <= 0)
            continue;
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
        if (d < 180) {
            x += dx / d * (180 - d) / 65;
            y += dy / d * (180 - d) / 65;
        }
    }
    for (const o of s.obstacles) {
        const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy) || 1;
        if (d < o.r + 80) {
            x += dx / d * (o.r + 80 - d) / 35;
            y += dy / d * (o.r + 80 - d) / 35;
        }
    }
    for (const b of s.bullets) {
        const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 1;
        if (d < 110) {
            x += dx / d * (110 - d) / 35;
            y += dy / d * (110 - d) / 35;
        }
    }
    if (p.x < 2000)
        x += 2;
    if (p.x > 2800)
        x -= 2;
    if (p.y < 1300)
        y += 2;
    if (p.y > 1900)
        y -= 2;
    return { x, y, aimX: 0, aimY: 0, manual: false, dash: s.enemies.some(e => e.hp > 0 && Math.hypot(e.x - p.x, e.y - p.y) < 85), skill1: false, skill2: false };
}
export function resolvePilotChoices(s) {
    for (let guard = 0; guard < 100 && (s.pendingLevels || s.pendingChests); guard++) {
        const chest = s.pendingChests > 0, offers = s.offers(chest);
        const score = (c) => c.kind === 'evolve' || c.kind === 'skillEvolve' || c.kind === 'fusion' ? 100 : c.kind === 'heal' ? (s.player.hp < s.player.maxHp * .4 ? 80 : -10) : c.kind === 'weapon' ? 45 + (s.weapons.find(w => w.id === c.id)?.level ?? -3) * 3 : c.kind === 'skill' ? 42 + (s.skills.find(w => w.id === c.id)?.level ?? -2) * 3 : c.kind === 'shards' ? -20 : 20;
        offers.sort((a, b) => score(b) - score(a));
        if (!offers[0] || !s.apply(offers[0], chest))
            throw Error('Automatic choice rejected');
    }
}

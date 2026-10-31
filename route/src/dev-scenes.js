export function fillStress(sim) {
    sim.stress = true;
    sim.invincible = true;
    sim.time = 240;
    sim.pendingLevels = sim.pendingChests = 0;
    sim.enemyPool.active.length = 0;
    sim.shotPool.active.length = 0;
    sim.bulletPool.active.length = 0;
    sim.gemPool.active.length = 0;
    const types = ['rusher', 'shooter', 'mini', 'shield', 'swarm', 'spinner'];
    for (let i = 0; i < 1100; i++) {
        const a = sim.random() * Math.PI * 2, d = i < 5 ? i * 9 : 35 + sim.random() * 590;
        sim.spawn(types[i % types.length], 2400 + Math.cos(a) * d, 1600 + Math.sin(a) * d);
    }
    for (let i = 0; i < 650; i++) {
        const a = sim.random() * Math.PI * 2, d = 45 + sim.random() * 480;
        sim.fire(2400 + Math.cos(a) * d, 1600 + Math.sin(a) * d, a, 200, 5, i < 420);
    }
    for (let i = 0; i < 360; i++) {
        const a = sim.random() * Math.PI * 2, d = 50 + sim.random() * 440;
        sim.dropXP(2400 + Math.cos(a) * d, 1600 + Math.sin(a) * d, i % 30 === 0 ? 35 : 7);
    }
    for (let i = 0; i < 100; i++) {
        const a = i * 2.4, d = 50 + sim.random() * 390, x = 2400 + Math.cos(a) * d, y = 1600 + Math.sin(a) * d;
        const effect = sim.effect(i % 3 === 0 ? 'line' : 'ring', x, y, 40 + sim.random() * 100, '#c9ffff', .7, 0, x + 100, y - 70);
        if (effect)
            effect.ttl = .35;
    }
    for (let i = 0; i < 24; i++)
        sim.damageNumber(2040 + i % 8 * 95, 1370 + Math.floor(i / 8) * 160, 23 + i, '#eef2f8');
    for (let i = 0; i < 180; i++)
        sim.particles.push({ x: 2050 + sim.random() * 700, y: 1350 + sim.random() * 500, vx: 0, vy: 0, r: 3, life: .4, maxLife: .5, color: '#ffd6a0' });
    sim.events = [];
}

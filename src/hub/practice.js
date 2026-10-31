import { Simulation } from '../sim.js';
export class PracticeRoom {
    sim;
    damage = 0;
    seconds = 0;
    constructor(save, weapon, evolved = false) {
        this.sim = new Simulation(save.ship, save.meta, 42, 'practice', 0, 'normal', save.equipment, { chapter: 0, crew: save.crew, movement: save.settings.movement });
        const s = this.sim;
        s.invincible = true;
        s.updateHorde = () => { };
        s.enemyPool.active.length = 0;
        s.terrain = [];
        s.obstacles = [];
        s.props = [];
        s.nextSupply = s.nextBeacon = s.nextElite = Infinity;
        s.encounterIndex = s.encounters.length;
        s.swarmIndex = 100;
        s.spawnBudget = -1e9;
        if (weapon)
            s.weapons = [{ id: weapon, level: 8, evolved, timer: 0 }];
        const dummy = s.spawn('guard', s.player.x + 140, s.player.y);
        dummy.hp = dummy.maxHp = 1e9;
        dummy.speed = 0;
        dummy.damage = 0;
        dummy.xp = 0;
        dummy.behaviorCD = Infinity;
    }
    step(dt, input) { const s = this.sim, dummy = s.enemies[0]; if (!dummy)
        return; const hp = dummy.hp; s.time = this.seconds % 120; dummy.x = s.player.x + 140; dummy.y = s.player.y; dummy.status.freeze = 1; s.step(dt, input); this.damage += Math.max(0, hp - dummy.hp); dummy.hp = 1e9; this.seconds += dt; s.pendingChests = s.pendingLevels = 0; s.events.length = 0; }
}

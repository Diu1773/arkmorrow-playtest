import { defaultSave, clamp } from './core.js';
import { Simulation, segmentDistance } from './sim.js';
export const SCENES = [
    { id: 'launch', name: '대기권 돌파', seconds: 34, hint: '둘러싸이기 전에, 우주선으로!' },
    { id: 'blackhole', name: '블랙홀 흡입', seconds: 32, hint: '15초 뒤, 앞쪽에 블랙홀이 열린다.' },
    { id: 'slingshot', name: '스윙바이 돌진', seconds: 32, hint: '행성의 점선 가까이 이동 → 원하는 쪽으로 튕겨 나가기' },
];
export const idle = { x: 0, y: 0, aimX: 0, aimY: 0, dash: false, manual: false };
export class TrialScene {
    id;
    sim;
    time = 0;
    done = false;
    phase = '';
    takeoffAt = null;
    ship = { x: 2570, y: 1600 };
    rescueCalled = false;
    hole = { x: 2400, y: 1430 };
    planet = { x: 2400, y: 1600, r: 160 };
    sucked = { enemies: 0, bullets: 0, xp: 0 };
    peakEnemies = 0;
    boosts = 0;
    dashHits = 0;
    orbitAt = -1;
    boostUntil = 0;
    cooldown = 0;
    angle = 0;
    dash = { x: 1, y: 0 };
    trail = [];
    signals = [];
    suctionArms = new WeakMap();
    constructor(id, seed = 707) {
        this.id = id;
        this.sim = new Simulation('aster', defaultSave().meta, seed, 'trial-' + id);
        const s = this.sim;
        s.autoCast = false;
        s.invincible = s.stress = true;
        s.terrain = [];
        s.obstacles = [];
        s.enemyPool.active.length = 0;
        s.spawnBudget = -1e9;
        s.nextBeacon = s.nextSupply = Infinity;
        s.encounterIndex = 99;
        s.swarmIndex = 99;
        s.weapons = [{ id: id === 'slingshot' ? 'fan' : 'pulse', level: 3, evolved: false, timer: 0 }];
        if (id === 'slingshot') {
            s.player.x = 2160;
            s.player.y = 1730;
        }
        this.phase = id === 'launch' ? 'ground' : id === 'blackhole' ? 'swarm' : 'approach';
    }
    get duration() { return SCENES.find(s => s.id === this.id).seconds; }
    get rise() { return this.takeoffAt === null ? 0 : clamp((this.time - this.takeoffAt - 1.2) / 7, 0, 1); }
    get holeAge() { return this.time - 15; }
    step(dt, input = idle) {
        if (this.done || !Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, 1 / 30);
        this.time = Math.min(this.duration, this.time + dt);
        const s = this.sim, p = s.player;
        this.signals = [];
        const oldX = p.x, oldY = p.y;
        s.pendingLevels = s.pendingChests = 0;
        s.step(dt, { ...input, dash: false, manual: false });
        s.pendingLevels = s.pendingChests = 0;
        if (this.id === 'launch')
            this.launch(dt);
        if (this.id === 'blackhole')
            this.blackhole(dt);
        if (this.id === 'slingshot')
            this.slingshot(dt, input, oldX, oldY);
        this.peakEnemies = Math.max(this.peakEnemies, s.enemies.length);
        for (const point of this.trail)
            point.age += dt;
        this.trail = this.trail.filter(t => t.age < 1.3);
        if (this.time >= this.duration) {
            this.done = true;
            this.phase = 'done';
        }
    }
    fill(count, cx, cy, radius) {
        const s = this.sim;
        while (s.enemies.length < count) {
            const a = s.random() * Math.PI * 2, r = radius * (.55 + s.random() * .45), e = s.spawn(s.nextId % 8 === 0 ? 'shooter' : s.nextId % 3 === 0 ? 'swarm' : 'rusher', cx + Math.cos(a) * r, cy + Math.sin(a) * r);
            if (!e)
                break;
            e.speed *= .35;
        }
    }
    launch(dt) {
        const s = this.sim, p = s.player;
        if (this.takeoffAt === null) {
            this.fill(Math.floor(18 + this.time * 10), p.x, p.y, Math.max(190, 470 - this.time * 20));
            if (this.time >= 14) {
                if (!this.rescueCalled) {
                    this.rescueCalled = true;
                    this.ship = { x: p.x + 280, y: p.y - 180 };
                }
                const d = Math.hypot(p.x - this.ship.x, p.y - this.ship.y);
                this.ship.x += (p.x - this.ship.x) / (d || 1) * Math.min(d, 650 * dt);
                this.ship.y += (p.y - this.ship.y) / (d || 1) * Math.min(d, 650 * dt);
            }
            if (this.time >= 12 && Math.hypot(p.x - this.ship.x, p.y - this.ship.y) < 85) {
                this.takeoffAt = this.time;
                this.phase = 'ignite';
                this.signals.push('ignite');
            }
        }
        else {
            const age = this.time - this.takeoffAt;
            if (age < 8.2) {
                p.x = this.ship.x;
                p.y = this.ship.y;
                if (age >= 1.2) {
                    if (this.phase === 'ignite')
                        this.signals.push('rise');
                    this.phase = 'ascent';
                    for (const e of s.enemies) {
                        const a = Math.atan2(e.y - p.y, e.x - p.x);
                        e.x += Math.cos(a) * dt * 600;
                        e.y += Math.sin(a) * dt * 600;
                    }
                    if (age > 2.6)
                        s.enemyPool.active.length = 0;
                }
            }
            else {
                this.phase = 'orbit';
                this.fill(70, p.x, p.y, 460);
            }
        }
    }
    blackhole(dt) {
        const s = this.sim, p = s.player, age = this.holeAge;
        if (age < 0) {
            this.fill(Math.floor(70 + this.time * 31), p.x, p.y, 520);
            return;
        }
        if (this.phase === 'swarm') {
            this.hole = { x: clamp(p.x + Math.cos(p.angle) * 165, 800, 4000), y: clamp(p.y + Math.sin(p.angle) * 165, 700, 2500) };
            this.fill(640, this.hole.x, this.hole.y, 600);
            for (let i = 0; i < 150; i++) {
                const a = s.random() * Math.PI * 2, r = 90 + s.random() * 500;
                s.fire(this.hole.x + Math.cos(a) * r, this.hole.y + Math.sin(a) * r, a + 2, 25, 1, true, 'pulse', '#df5c53', 10);
            }
            for (let i = 0; i < 100; i++) {
                const a = s.random() * Math.PI * 2, r = 110 + s.random() * 450;
                s.dropXP(this.hole.x + Math.cos(a) * r, this.hole.y + Math.sin(a) * r, 3);
            }
            this.phase = 'suction';
            this.signals.push('hole');
        }
        if (age < 8) {
            const pools = [s.enemyPool, s.bulletPool, s.gemPool];
            for (let k = 0; k < pools.length; k++) {
                const pool = pools[k];
                for (let i = pool.active.length - 1; i >= 0; i--) {
                    const item = pool.active[i], dx = item.x - this.hole.x, dy = item.y - this.hole.y, r = Math.hypot(dx, dy), current = Math.atan2(dy, dx), next = Math.max(0, r - dt * (45 + r * .24));
                    if (!this.suctionArms.has(item))
                        this.suctionArms.set(item, Math.round((current - r / 600 * 6.8 + age * 1.8) / (Math.PI * 2 / 5)));
                    const target = this.suctionArms.get(item) * Math.PI * 2 / 5 + next / 600 * 6.8 - age * 1.8, diff = Math.atan2(Math.sin(target - current), Math.cos(target - current)), a = current + diff * Math.min(1, dt * 9);
                    if (k === 0)
                        item.speed = 0;
                    else if (k === 1) {
                        item.vx = 0;
                        item.vy = 0;
                    }
                    item.x = this.hole.x + Math.cos(a) * next;
                    item.y = this.hole.y + Math.sin(a) * next;
                    if (next < 22) {
                        if (k === 0) {
                            this.sucked.enemies++;
                            s.kills++;
                        }
                        else if (k === 1)
                            this.sucked.bullets++;
                        else
                            this.sucked.xp += item.value;
                        pool.remove(i);
                    }
                }
            }
        }
        else if (this.phase === 'suction') {
            for (const e of s.enemies)
                if (Math.hypot(e.x - this.hole.x, e.y - this.hole.y) < 700) {
                    e.hp = 0;
                    this.sucked.enemies++;
                }
            this.sucked.bullets += s.bullets.length;
            s.bulletPool.active.length = 0;
            s.gemPool.active.length = 0;
            for (let i = 0; i < 120; i++) {
                const a = i / 120 * Math.PI * 2, r = 80 + (i % 5) * 38;
                s.dropXP(this.hole.x + Math.cos(a) * r, this.hole.y + Math.sin(a) * r, Math.max(3, Math.ceil(this.sucked.enemies / 20)));
            }
            this.phase = 'burst';
            this.signals.push('burst');
        }
    }
    slingshot(dt, input, oldX, oldY) {
        const s = this.sim, p = s.player, c = this.planet;
        this.cooldown = Math.max(0, this.cooldown - dt);
        this.fill(170, c.x, c.y, 550);
        if (this.phase === 'orbiting') {
            this.angle += dt * 3.8;
            p.x = c.x + Math.cos(this.angle) * c.r;
            p.y = c.y + Math.sin(this.angle) * c.r;
            this.addTrail();
            if (this.time - this.orbitAt >= 1.25) {
                const length = Math.hypot(input.x, input.y);
                this.dash = length > .1 ? { x: input.x / length, y: input.y / length } : { x: -Math.sin(this.angle), y: Math.cos(this.angle) };
                this.phase = 'boost';
                this.boostUntil = this.time + 1.05;
                this.boosts++;
                this.signals.push('boost');
            }
        }
        else if (this.phase === 'boost') {
            p.x = clamp(oldX + this.dash.x * 1150 * dt, 400, 4400);
            p.y = clamp(oldY + this.dash.y * 1150 * dt, 400, 2800);
            this.addTrail();
            for (const e of s.enemies)
                if (e.hp > 0 && segmentDistance(e.x, e.y, oldX, oldY, p.x, p.y) < 85 + e.r) {
                    s.hit(e, 10000);
                    this.dashHits++;
                    s.effect('ring', e.x, e.y, 70, '#c9ffff', .35);
                }
            if (this.time >= this.boostUntil) {
                this.phase = 'approach';
                this.cooldown = .8;
            }
        }
        else if (this.cooldown <= 0 && Math.hypot(p.x - c.x, p.y - c.y) < c.r + 70) {
            this.phase = 'orbiting';
            this.orbitAt = this.time;
            this.angle = Math.atan2(p.y - c.y, p.x - c.x);
        }
    }
    addTrail() { const p = this.sim.player, last = this.trail.at(-1); if (!last || Math.hypot(last.x - p.x, last.y - p.y) > 28)
        this.trail.push({ x: p.x, y: p.y, age: 0 }); }
}

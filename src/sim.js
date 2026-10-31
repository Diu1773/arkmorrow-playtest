import { effectFeedback } from './vfx-feedback.js';
import { CHAPTER_RATE, CHAPTER_SECONDS, bossSchedule, swarmSchedule, arrivalFor } from './encounters.js';
import { hordeTarget } from './horde.js';
import { setupBoss, updateBoss, updateElite, updateBossWorld, arenaPoint, arenaSpawnAllowed, constrainArena, bounceArena, steerBossBullet, resetBossBullet, finishBoss } from './boss-director.js';
import { chapterDef, LOCAL_ENEMIES, LOCAL_PATTERNS } from './chapters.js';
import { CREW } from './crew.js';
import { buildSurface, moveExpedition, updateSurface, hitProps, trace, localSpawn } from './surface.js';
import { weaponAim } from './aim.js';
import { warningShapes } from './telegraph.js';
import { attackSkill, elementOf, impact, statusHit, updateBattleEffects } from './battle.js';
import { canFuse, emptyStatus, FUSIONS } from './combat-rules.js';
import { BEHAVIORS, CHAPTER_ENEMIES, ELITES, ENEMY_BEHAVIOR, ENEMY_XP, ELEMENTS, PASSIVES, CAPTAINS, ENEMIES, MODES, SECTORS, SHIPS, WEAPONS, WORLD } from './data.js';
import { Pool, SpatialHash, canEvolve, choices, clamp, hpScale, moveVector, reward, rng, stats, waveAt, weaponStats, xpNeeded } from './core.js';
import { gearBonus } from './equipment.js';
import { CHAPTERS, ECONOMY, RUN_CHESTS, RUN_SKILL_LIMIT, rollRunChest } from './economy.js';
export const XP_LIMIT = 360;
const TAU = Math.PI * 2, blank = { x: 0, y: 0, aimX: 0, aimY: 0, dash: false, manual: false };
export const inGap = (gaps, width, a) => gaps.some(g => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < width / 2);
export function segmentDistance(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0; return Math.hypot(px - ax - dx * t, py - ay - dy * t); }
function squaredSegmentDistance(px, py, ax, ay, bx, by) { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy, t = l ? clamp(((px - ax) * dx + (py - ay) * dy) / l, 0, 1) : 0, qx = px - ax - dx * t, qy = py - ay - dy * t; return qx * qx + qy * qy; }
export class Simulation {
    particleMinimum = 0;
    stepAttributes;
    frameIndex = 0;
    xpCredit = 0;
    rewardKills = 0;
    viewWidth = 1400;
    viewHeight = 800;
    aimAngle = -Math.PI / 2;
    muzzleTime = 0;
    crowdBudget = 0;
    expedition = false;
    chapterKey = 2;
    crew = 'pip';
    movement = 'instant';
    props = [];
    traces = [];
    nextFoot = 0;
    launchAge = -1;
    crewShield = false;
    ship;
    meta;
    sector;
    difficulty;
    random;
    id;
    lastDamageCause = 'unknown';
    telegraphs = 'boss';
    get warningShapes() { return warningShapes(this, this.telegraphs); }
    get timeline() { return this.expedition ? this.time / CHAPTER_RATE : this.time; }
    get encounters() { return bossSchedule(this.expedition); }
    get duration() { return this.expedition ? CHAPTER_SECONDS : 600; }
    get progress() { return this.bossKilled ? 1 : Math.min(.99, this.time / this.duration); }
    bossWarning = -1;
    bossDefeatedAt = -1;
    arrivalSites = [];
    swarmStarted = 0;
    time = 0;
    level = 1;
    xp = 0;
    kills = 0;
    bonus = 0;
    evolutions = 0;
    rerolls;
    banishes = 3;
    banished = [];
    pendingLevels = 0;
    pendingChests = 0;
    status = 'playing';
    invincible = false;
    stress = false;
    miniSpawned = false;
    bossSpawned = false;
    bossKilled = false;
    spawnBudget = 0;
    nextSupply = 120;
    nextBeacon = 35;
    nextElite = 90;
    nextId = 1;
    blackout = 0;
    orbitAngle = 0;
    hitStop = 0;
    slowMotion = 0;
    shake = 0;
    reflections = 0;
    firstLevelAt = null;
    encounterIndex = 0;
    swarmIndex = 0;
    swarmUntil = 0;
    bossRecords = [];
    levelTimes = [];
    boosts = { damage: 0, hull: 0, reach: 0 };
    equipment = { attack: 0, hp: 0, armor: 0, traits: {} };
    chapter;
    shieldReady = 0;
    rescued = false;
    roomRescue = 0;
    player;
    world = WORLD;
    terrain = [];
    obstacles = [];
    beacon = null;
    hazards = [];
    drops = [];
    events = [];
    particlePool = new Pool(240, () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 2, life: 0, maxLife: 1, color: '' }));
    get particles() { return this.particlePool.active; }
    combatRandom;
    reactionCounts = {};
    chestQueue = [];
    chaosHistory = [];
    chaos = { hp: 1, damage: 0, haste: 1, incoming: 1 };
    chaosSuitAt = 0;
    chaosGloveAt = 0;
    chaosHelmetAt = 12;
    chaosPackAt = 15;
    get skillLevels() { return this.weapons.reduce((n, w) => n + w.level, 0) + Object.values(this.passives).reduce((n, lv) => n + (lv ?? 0), 0); }
    get chestRank() { return this.chestQueue[0]?.rank ?? 0; }
    floaters = [];
    weapons;
    passives = {};
    enemyPool = new Pool(1600, () => ({ escort: false, offscreenLag: 0, crowd: false, id: 0, type: 'rusher', x: 0, y: 0, r: 0, angle: 0, hp: 0, maxHp: 0, speed: 0, damage: 0, xp: 0, age: 0, timer: 0, flash: 0, orbitHit: 0, warnTime: 0, warnDuration: 0, attackFlash: 0, lastAttack: null, pendingAttack: null, attackIndex: 0, phase: 0, hidden: false, shielded: false, mirror: 0, elite: false, role: '', bossArt: 0, stages: 1, stageGuard: 0, leader: 0, offX: 0, offY: 0, arm: 0, ti: 0, dir: 1, ttl: 0, status: emptyStatus(), behaviorCD: 2, action: '', actionTime: 0, actionAngle: 0, targetX: 0, targetY: 0, prefix: '' }));
    shotPool = new Pool(1800, () => this.blankBullet());
    bulletPool = new Pool(900, () => this.blankBullet());
    gemPool = new Pool(1800 + XP_LIMIT, () => ({ x: 0, y: 0, value: 0, kind: 'xp', pull: false, age: 0 }));
    effectPool = new Pool(180, () => ({ x: 0, y: 0, x2: 0, y2: 0, radius: 0, ttl: 0, life: 0, color: '', kind: 'ring', damage: 0, done: false, repeat: false, weapon: 'pulse', tick: 0, hits: new Set() }));
    hash = new SpatialHash(96);
    power = 1;
    speed = 1;
    xpBoost = 1;
    dashBoost = 1;
    spawnBoost = 1;
    constructor(ship, meta, seed = Date.now(), id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, sector = 0, difficulty = 'normal', equipment, expedition) {
        this.ship = ship;
        this.meta = { ...meta };
        this.sector = clamp(Math.floor(sector), 0, 5);
        this.difficulty = difficulty;
        this.random = rng(seed);
        this.combatRandom = rng(seed ^ 0x726ea9);
        this.id = id;
        this.rerolls = 3 + meta.forecast;
        if (equipment) {
            this.equipment = gearBonus(equipment);
            this.chapter = CHAPTERS[this.sector + 2];
        }
        this.chapterKey = this.sector + 2;
        if (expedition) {
            this.xpCredit = 12;
            this.expedition = true;
            this.chapterKey = expedition.chapter;
            this.chapter = chapterDef(expedition.chapter);
            this.sector = this.chapter.sector;
            this.crew = expedition.crew;
            this.movement = expedition.movement;
            this.crewShield = this.chapter.kind === 'ground' && this.crew === 'pip';
        }
        const person = CREW.find(c => c.id === this.crew), s = stats(ship, {}, meta);
        if (this.chapter?.kind === 'ground' && this.expedition)
            s.maxHp += person.hp - SHIPS.find(c => c.id === ship).hp;
        const hp = s.maxHp + this.equipment.hp;
        this.player = { x: 2400, y: 1600, vx: 0, vy: 0, r: 16, angle: -Math.PI / 2, ship, hp, maxHp: hp, invul: 3, flash: 0, dashTime: 0, dashCD: 0, dashX: 0, dashY: -1, range: 500, orbitCount: 0, orbitRadius: 100, inDark: false };
        this.weapons = [{ id: SHIPS.find(s => s.id === ship).weapon, level: 1, evolved: false, timer: .15 }];
        this.buildTerrain();
        for (let i = 0; i < 22; i++) {
            const a = this.random() * TAU, d = 550 + this.random() * 1500;
            this.obstacles.push({ x: clamp(2400 + Math.cos(a) * d, 100, 4700), y: clamp(1600 + Math.sin(a) * d, 100, 3100), r: 24 + this.random() * 22, kind: i % 4 === 0 ? 'station' : 'debris', angle: a, solid: true });
        }
        if (this.expedition && LOCAL_ENEMIES[this.chapter.id]) {
            buildSurface(this);
            this.weapons[0].id = this.chapter.kind === 'ground' ? person.weapon : this.weapons[0].id;
            this.player.r = this.crew === 'mew' && this.chapter.kind === 'ground' ? 11 : 16;
        }
        if (this.expedition) {
            this.nextSupply *= CHAPTER_RATE;
            this.nextBeacon *= CHAPTER_RATE;
            this.nextElite *= CHAPTER_RATE;
        }
        this.spawn('rusher', 2600, 1600);
        this.spawn('rusher', 2340, 1400);
        this.spawn('rusher', 2240, 1720);
        this.spawn('rusher', 2540, 1800);
    }
    burst(x, y, color, count, priority = 1, inward = false) {
        for (let j = 0; j < count; j++) {
            if (this.particles.length >= this.particlePool.limit) {
                if (this.stepAttributes && priority + 1 <= this.particleMinimum)
                    return;
                let smallest = -1, minimum = Infinity;
                for (let i = 0; i < this.particles.length; i++) {
                    minimum = Math.min(minimum, this.particles[i].r);
                    if (this.particles[i].r < priority + 1 && (smallest < 0 || this.particles[i].r < this.particles[smallest].r))
                        smallest = i;
                }
                if (this.stepAttributes)
                    this.particleMinimum = minimum;
                if (smallest < 0)
                    return;
                this.particlePool.remove(smallest);
            }
            const f = this.particlePool.acquire();
            if (!f)
                return;
            if (this.stepAttributes)
                this.particleMinimum = Math.min(this.particleMinimum, priority + 1);
            const a = this.combatRandom() * TAU, sp = 35 + this.combatRandom() * 100, d = inward ? 40 + this.combatRandom() * 100 : 0;
            Object.assign(f, { x: x + Math.cos(a) * d, y: y + Math.sin(a) * d, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: priority + 1, life: .5, maxLife: .5, color, inward, cx: x, cy: y });
        }
    }
    dropChest(x, y) { const point = arenaPoint(this, { x, y }); if (this.drops.length < 80)
        this.drops.push({ ...point, rank: rollRunChest(this.combatRandom, this.sector, this.passives.luck ?? 0) }); }
    queueChest(rank) { const remaining = rank === 5 ? 1 : RUN_CHESTS.upgrades[rank]; this.chestQueue.push({ rank, remaining, chaos: rank === 5 ? Math.floor(this.combatRandom() * 3) : undefined }); this.pendingChests += remaining; if (rank === 4)
        this.gainXP(RUN_CHESTS.legendXP); }
    updateBehavior(e, dt, a, d) {
        const behavior = ENEMY_BEHAVIOR[e.type], p = this.player;
        if (!behavior || ['shield', 'split', 'flock', 'orbit'].includes(behavior))
            return false;
        if (e.status.freeze > 0 || e.status.stun > 0)
            return true;
        e.behaviorCD -= dt;
        if (e.action) {
            e.actionTime -= dt;
            e.warnTime = Math.max(0, e.actionTime);
            if (e.action === 'charging') {
                e.warnTime = 0;
                e.x = clamp(e.x + Math.cos(e.actionAngle) * 500 * dt, 30, 4770);
                e.y = clamp(e.y + Math.sin(e.actionAngle) * 500 * dt, 30, 3170);
                if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r)
                    this.hurt(e.damage, e.type);
                if (e.actionTime <= 0) {
                    e.action = '';
                    e.behaviorCD = BEHAVIORS.charge.cooldown;
                }
                return true;
            }
            if (e.actionTime > 0)
                return true;
            const action = e.action;
            e.attackFlash = 1 / 60;
            e.lastAttack = e.pendingAttack;
            e.action = '';
            e.warnTime = 0;
            e.behaviorCD = BEHAVIORS[behavior].cooldown;
            e.pendingAttack = null;
            if (action === 'charge') {
                e.action = 'charging';
                e.actionTime = .5;
                return true;
            }
            if (action === 'dodge') {
                const sign = e.id % 2 ? 1 : -1;
                e.x = clamp(e.x + Math.cos(e.actionAngle + sign * Math.PI / 2) * 85, 30, 4770);
                e.y = clamp(e.y + Math.sin(e.actionAngle + sign * Math.PI / 2) * 85, 30, 3170);
            }
            if (action === 'suicide') {
                this.areaDamage(e.x, e.y, 135, e.damage * 3, 40, 'bomb');
                if (Math.hypot(p.x - e.x, p.y - e.y) < 135 + p.r)
                    this.hurt(e.damage, 'bomber');
                e.hp = 0;
                this.effect('blast', e.x, e.y, 135, '#df5c53', .5);
            }
            if (action === 'teleport' || action === 'burrow') {
                e.x = e.targetX;
                e.y = e.targetY;
                this.effect('ring', e.x, e.y, 65, '#df5c53', .3);
                if (action === 'burrow' && Math.hypot(p.x - e.x, p.y - e.y) < e.r + p.r + 18)
                    this.hurt(e.damage, 'burrower');
            }
            if (action === 'snipe')
                this.fire(e.x, e.y, e.actionAngle, 380, e.damage, true, 'pulse', '#ff558b', 2.2);
            if (action === 'heal') {
                this.hash.query(e.x, e.y, 190, n => { if (n.hp > 0 && n.type !== 'boss') {
                    n.hp = Math.min(n.maxHp, n.hp + n.maxHp * .12);
                } });
                this.effect('ring', e.x, e.y, 190, '#8af0a2', .4);
            }
            if (action === 'summon')
                for (let j = 0; j < 3; j++)
                    this.spawn('mini', e.x + Math.cos(j * 2.1) * 55, e.y + Math.sin(j * 2.1) * 55, '', false, e.crowd);
            return true;
        }
        const trigger = behavior === 'dodge' ? this.shots.some(b => (b.x - e.x) ** 2 + (b.y - e.y) ** 2 < 360 ** 2 && (e.x - b.x) * b.vx + (e.y - b.y) * b.vy > 0) : behavior === 'suicide' ? d < 170 : d < 650;
        if (e.behaviorCD <= 0 && trigger) {
            e.action = behavior;
            e.actionTime = BEHAVIORS[behavior].tell;
            e.warnTime = e.warnDuration = e.actionTime;
            this.emit('prepare', e.x, e.y);
            e.actionAngle = a;
            e.targetX = clamp(p.x - Math.cos(a) * 110, 40, 4760);
            e.targetY = clamp(p.y - Math.sin(a) * 110, 40, 3160);
            if (behavior === 'burrow') {
                e.targetX = p.x;
                e.targetY = p.y;
            }
            e.pendingAttack = { pattern: 'laser', angle: a, phase: 0, x: e.targetX, y: e.targetY, gap: 0 };
            return true;
        }
        if (behavior === 'snipe' && d < 380) {
            e.x -= Math.cos(a) * e.speed * dt;
            e.y -= Math.sin(a) * e.speed * dt;
            return true;
        }
        return false;
    }
    edgeSpawn() {
        const p = this.player;
        for (let i = 0; i < 64; i++) {
            const a = this.random() * TAU, dx = Math.cos(a), dy = Math.sin(a), d = Math.min((this.viewWidth / 2 + 40) / Math.max(.001, Math.abs(dx)), (this.viewHeight / 2 + 40) / Math.max(.001, Math.abs(dy)));
            const x = p.x + dx * d, y = p.y + dy * d;
            if (x >= 35 && x <= 4765 && y >= 35 && y <= 3165)
                return { x, y };
        }
        return { x: p.x < 2400 ? 4765 : 35, y: p.y < 1600 ? 3165 : 35 };
    }
    updateArrivals(dt) {
        for (const site of this.arrivalSites)
            site.age += dt;
        this.arrivalSites = this.arrivalSites.filter(site => site.age < 3);
        if (this.time >= this.swarmUntil || this.enemies.some(e => e.type === 'boss' && e.hp > 0))
            return;
        const kind = arrivalFor(this.chapter.id), p = this.player;
        if (kind === 'pods' || kind === 'crater') {
            const interval = kind === 'pods' ? 1.4 : 3;
            if (Math.floor((this.time - this.swarmStarted) / interval) > Math.floor((this.time - this.swarmStarted - dt) / interval) || !this.arrivalSites.length) {
                const a = this.swarmIndex * 1.9 + Math.floor((this.time - this.swarmStarted) / interval) * 2.4, d = kind === 'pods' ? 320 : 420;
                this.arrivalSites.push({ x: clamp(p.x + Math.cos(a) * d, 80, 4720), y: clamp(p.y + Math.sin(a) * d, 80, 3120), age: 0, spawned: false });
            }
            for (const site of this.arrivalSites)
                if (site.age >= 1 && !site.spawned) {
                    site.spawned = true;
                    this.effect('blast', site.x, site.y, kind === 'pods' ? 60 : 100, kind === 'pods' ? '#d4b67e' : '#bc825e', .6);
                    for (let i = 0; i < 8; i++) {
                        const a = i / 8 * TAU;
                        this.spawn('rusher', site.x + Math.cos(a) * 35, site.y + Math.sin(a) * 35, '', false, true);
                    }
                }
        }
    }
    updateHorde(dt) {
        if (this.bossKilled || !arenaSpawnAllowed(this, 'rusher'))
            return;
        const boss = this.enemies.some(e => e.type === 'boss' && e.hp > 0), target = hordeTarget(this.timeline, boss, this.time < this.swarmUntil);
        if (boss) {
            let count = this.enemies.length;
            for (let i = this.enemies.length - 1; i >= 0 && count > target; i--) {
                const e = this.enemies[i];
                if (e.type !== 'boss' && e.type !== 'decoy' && !e.elite && !e.escort) {
                    this.enemyPool.remove(i);
                    count--;
                }
            }
        }
        this.crowdBudget = Math.min(20, this.crowdBudget + Math.max(45, (target - this.enemies.length) * 12) * dt);
        while (this.enemies.length < target && this.crowdBudget >= 1) {
            const types = SECTORS[this.sector].types, type = this.time < 35 ? 'rusher' : this.combatRandom() < .3 ? CHAPTER_ENEMIES[this.sector][Math.floor(this.combatRandom() * 4)] : types[Math.floor(this.combatRandom() * Math.min(types.length, 1 + Math.floor(this.time / 65)))];
            let point;
            if (this.time < this.swarmUntil && !boss) {
                const kind = arrivalFor(this.chapter.id), p = this.player;
                if (kind === 'storm')
                    point = { x: clamp(p.x + (this.swarmIndex % 2 ? 1 : -1) * (this.viewWidth / 2 + 60), 35, 4765), y: clamp(p.y + (this.combatRandom() - .5) * this.viewHeight, 35, 3165) };
                if (kind === 'vortex') {
                    const a = (this.time - this.swarmStarted) * .4 + this.combatRandom() * .5, r = Math.max(this.viewWidth, this.viewHeight) / 2 + 70;
                    point = { x: clamp(p.x + Math.cos(a) * r, 35, 4765), y: clamp(p.y + Math.sin(a) * r, 35, 3165) };
                }
            }
            const e = this.spawn(type, point?.x, point?.y, '', false, true, boss);
            if (!e)
                break;
            this.crowdBudget--;
        }
    }
    blankBullet() { return { x: 0, y: 0, vx: 0, vy: 0, r: 4, damage: 0, life: 0, age: 0, kind: 'pulse', color: '#a9d8df', pierce: 0, targetId: 0, weapon: 'pulse', hit: new Set(), split: false, reflected: false }; }
    get enemies() { return this.enemyPool.active; }
    get shots() { return this.shotPool.active; }
    get bullets() { return this.bulletPool.active; }
    get pickups() { return this.gemPool.active; }
    get effects() { return this.effectPool.active; }
    get attributes() { if (this.stepAttributes)
        return this.stepAttributes; const s = stats(this.ship, this.passives, this.meta), b = this.equipment, t = b.traits; if (this.expedition && this.chapter?.kind === 'ground') {
        const c = CREW.find(c => c.id === this.crew), ship = SHIPS.find(c => c.id === this.ship);
        s.maxHp += (c.hp - ship.hp) * (1 + (this.passives.hull ?? 0) * .2);
        s.speed *= c.speed / ship.speed;
        if (c.id === 'mori')
            s.xp *= 1.2;
        if (c.id === 'bolt')
            s.knockback = (s.knockback + 4) * 1.3;
    } s.damage += this.boosts.damage * .03 + b.attack + this.chaos.damage; s.maxHp += this.boosts.hull * 5 + b.hp; s.armor += b.armor + (t.armor ?? 0) * 2; s.magnet += this.boosts.reach * 5 + (t.magnet ?? 0) * 45; s.regen += (t.regen ?? 0) * .6; s.xp += (t.xp ?? 0) * .15; s.area += (t.area ?? 0) * .15; s.cooldown *= Math.max(.65, 1 - (t.cooldown ?? 0) * .08); if (t.chaosGloves)
        s.crit += .12; s.maxHp *= this.chaos.hp; s.cooldown *= this.chaos.haste; if (t.lowSpeed && this.player.hp < this.player.maxHp * .3)
        s.speed *= 1.2; return s; }
    get mode() { return MODES[this.difficulty]; }
    emit(kind, x = this.player.x, y = this.player.y, value = 0, color = '#ffd260', weapon, size) { if (kind === 'shoot') {
        this.muzzleTime = .09;
    } const event = { kind, x, y, value, color, weapon, size }; effectFeedback(this, event); if (this.events.length < 120)
        this.events.push(event);
    else if (['hurt', 'warning', 'level', 'boss', 'evolve', 'chest', 'reaction', 'bossWarning'].includes(kind)) {
        const i = this.events.findIndex(e => ['hit', 'shoot', 'kill', 'pickup'].includes(e.kind));
        if (i >= 0)
            this.events[i] = event;
    } }
    spawn(type, x, y, role = '', elite = false, crowd = false, bossPhase) {
        if (!arenaSpawnAllowed(this, type, bossPhase === true && !crowd))
            return null;
        if (this.expedition)
            type = localSpawn(this, type, crowd);
        if (this.expedition && x === undefined && y === undefined) {
            const point = this.edgeSpawn();
            x = point.x;
            y = point.y;
        }
        if (this.expedition && !this.stress && crowd && type !== 'boss' && this.enemies.length >= hordeTarget(this.timeline, bossPhase ?? this.enemies.some(n => n.type === 'boss' && n.hp > 0), this.time < this.swarmUntil))
            return null;
        const e = this.enemyPool.acquire();
        if (!e)
            return null;
        const p = this.player, def = ENEMIES[type], a = this.random() * TAU, d = 640 + this.random() * 120;
        const hp = def.hp * (type === 'boss' ? (role === 'middle' ? .32 : 1) : hpScale(this.timeline)) * (1 + this.sector * .22) * this.mode.hp * (elite ? 6 : 1) * (this.chapter?.hp ?? 1);
        Object.assign(e, { escort: false, offscreenLag: 0, crowd, id: this.nextId++, type, x: clamp(x ?? p.x + Math.cos(a) * d, 35, 4765), y: clamp(y ?? p.y + Math.sin(a) * d, 35, 3165), r: def.r * (elite ? 1.5 : role === 'captain' ? .85 : type === 'boss' ? 1.15 : 1), angle: a, hp, maxHp: hp, speed: def.speed * (elite ? .8 : 1), damage: def.damage * this.mode.damage * (1 + this.sector * .08), xp: def.xp * (elite ? 5 : 1) * (type === 'boss' ? 1 : this.timeline >= ENEMY_XP.lateAt ? ENEMY_XP.late : 1), age: 0, timer: 2 + this.random(), flash: 0, orbitHit: -10, warnTime: 0, warnDuration: 0, attackFlash: 0, lastAttack: null, pendingAttack: null, attackIndex: 0, phase: 0, hidden: false, shielded: ENEMY_BEHAVIOR[type] === 'shield', mirror: 0, elite, role, bossArt: this.sector, stages: type === 'boss' ? (role === 'captain' ? 2 : 3) : 1, stageGuard: 0, leader: 0, offX: 0, offY: 0, arm: this.nextId % 2, ti: 20, dir: 1, ttl: 12, status: emptyStatus(), behaviorCD: 2 + this.combatRandom() * 2, action: '', actionTime: 0, actionAngle: a, targetX: 0, targetY: 0, prefix: elite ? ELITES[Math.floor(this.combatRandom() * ELITES.length)] : '' });
        if (e.prefix === 'swift')
            e.speed *= 1.55;
        if (e.prefix === 'armored') {
            e.hp *= 1.4;
            e.maxHp = e.hp;
        }
        if (crowd) {
            e.damage *= this.chapter?.id === 'atmosphere' ? .08 : .12;
            e.hp *= this.chapter?.id === 'village' ? .6 : this.chapter?.id === 'atmosphere' ? .2 : .3;
            e.hp = Math.max(e.hp, def.hp * Math.max(0, (this.timeline - 120) / 90));
            e.maxHp = e.hp;
            e.speed = Math.max(85, e.speed);
        }
        return e;
    }
    fire(x, y, a, speed, damage, enemy = false, kind = 'pulse', color = '#a9d8df', life = 2, pierce = 0, weapon = kind === 'missile' ? 'missile' : 'pulse') {
        const b = (enemy ? this.bulletPool : this.shotPool).acquire();
        if (!b)
            return null;
        Object.assign(b, { x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, r: enemy ? 6 : 4, damage, life, age: 0, kind, color, pierce, targetId: 0, weapon, split: false, reflected: false });
        b.hit.clear();
        resetBossBullet(b);
        return b;
    }
    effect(kind, x, y, radius, color, life = .5, damage = 0, x2 = 0, y2 = 0, repeat = false, weapon = 'pulse') { const e = this.effectPool.acquire(); if (!e)
        return null; Object.assign(e, { kind, x, y, radius, color, ttl: life, life, damage, x2, y2, done: false, repeat, weapon, tick: 0 }); e.hits.clear(); return e; }
    nearest(x, y, radius, excluded) { return this.hash.nearest(x, y, radius, e => e.hp > 0 && !e.hidden && !excluded?.has(e.id) && (!this.expedition || Math.abs(e.x - this.player.x) <= this.viewWidth / 2 + e.r && Math.abs(e.y - this.player.y) <= this.viewHeight / 2 + e.r)); }
    hit(e, damage, weapon = 'pulse', reactive = true, origin = { x: this.player.x, y: this.player.y }) {
        if (e.hp <= 0 || e.hidden || e.mirror > 0 || e.stageGuard > 0)
            return;
        const t = this.equipment.traits, attributes = this.attributes, element = elementOf(weapon), crit = reactive && attributes.crit > 0 && this.combatRandom() < attributes.crit;
        const frontal = damage !== 0 && e.shielded && Math.cos(Math.atan2(origin.y - e.y, origin.x - e.x) - e.angle) > .45;
        const before = e.hp, actual = damage === 0 ? 0 : damage * (frontal ? .2 : 1) * (e.prefix === 'armored' ? .72 : 1) * (e.type === 'boss' ? 1 + (t.bossDamage ?? 0) * .15 : 1) * (weapon === this.equipment.family ? 1 + (t.linkedPower ?? 0) * .6 : 1) * (1 + (this.passives[element] ?? 0) * .18) * (crit ? 1.8 : 1);
        e.hp -= actual;
        e.flash = .035;
        if (this.expedition && e.type !== 'boss') {
            const a = Math.atan2(e.y - origin.y, e.x - origin.x), weight = e.r > 26 ? .35 : e.r < 16 ? 1.5 : 1;
            e.x += Math.cos(a) * 3 * weight;
            e.y += Math.sin(a) * 3 * weight;
            if (actual > 100)
                this.hitStop = Math.max(this.hitStop, .018);
        }
        if (reactive) {
            statusHit(this, e, actual, weapon);
            if (crit && t.chaosGloves && this.time >= this.chaosGloveAt) {
                this.chaosGloveAt = this.time + .5;
                this.areaDamage(e.x, e.y, 95, actual * .35, 0, 'blade');
                this.effect('shatter', e.x, e.y, 95, ELEMENTS.ice.color, .35, 0, 0, 0, false, 'blade');
            }
            const push = attributes.knockback;
            if (push && e.type !== 'boss') {
                const a = Math.atan2(e.y - this.player.y, e.x - this.player.x);
                e.x += Math.cos(a) * push;
                e.y += Math.sin(a) * push;
            }
        }
        if (e.type === 'boss' && e.phase < e.stages - 1) {
            const boundary = e.maxHp * (e.stages - e.phase - 1) / e.stages;
            if (e.hp <= boundary) {
                e.hp = boundary;
                e.phase++;
                e.stageGuard = .65;
                e.warnTime = 0;
                e.pendingAttack = null;
                e.timer = .7;
                this.bossRecords.find(r => r.id === e.id)?.phases.push(this.time);
                this.effect('evolve', e.x, e.y, e.r * 1.6, '#ffc4ee', .35);
                this.emit('warning', e.x, e.y, e.phase);
            }
        }
        this.hash.moved(e);
        const number = this.random() < .28;
        if (actual !== 0) {
            if (number)
                this.damageNumber(e.x, e.y - e.r, Math.round(before - e.hp), '#eef2f8');
            this.emit('hit', e.x, e.y, Math.round(before - e.hp), '#ffd260', weapon, e.r);
        }
    }
    areaDamage(x, y, r, damage, push = 0, weapon = 'pulse') { const origin = { x, y }; this.hash.query(x, y, r + 100, e => { if (e.hp <= 0)
        return; const squared = (e.x - x) ** 2 + (e.y - y) ** 2; if (squared < (r + e.r) ** 2) {
        const d = push ? Math.sqrt(squared) : 0;
        this.hit(e, damage, weapon, true, origin);
        if (push && e.type !== 'boss') {
            e.x += (e.x - x) / (d || 1) * push;
            e.y += (e.y - y) / (d || 1) * push;
            this.hash.moved(e);
        }
    } }); this.hitBeacon(x, y, r, damage); if (this.expedition) {
        hitProps(this, x, y, r, damage);
        if (this.chapter?.kind === 'ground' && ['bomb', 'missile', 'mine'].includes(weapon)) {
            trace(this, 'scorch', x, y, 8);
            trace(this, 'light', x, y, .15);
        }
    } }
    hitBeacon(x, y, r, damage) { const b = this.beacon; if (!b || b.hp <= 0 || Math.hypot(x - b.x, y - b.y) > r + b.r)
        return; b.hp -= damage; b.flash = .1; if (b.hp <= 0) {
        this.dropChest(b.x, b.y);
        this.bonus += ECONOMY.beaconShards;
        this.beacon = null;
        this.emit('chest', b.x, b.y);
        this.effect('ring', b.x, b.y, 100, '#ffd260');
    } }
    damageNumber(x, y, value, color) { const old = this.floaters.find(f => f.color === color && f.life > .45 && (f.x - x) ** 2 + (f.y - y) ** 2 < 52 ** 2); if (old) {
        old.text = String(Number(old.text) + value);
        return;
    } if (this.floaters.length < 24)
        this.floaters.push({ x, y, life: .65, text: String(value), color }); }
    hurt(raw, cause = 'unknown') { const p = this.player; if (p.invul > 0 || p.dashTime > 0 || this.invincible || this.status !== 'playing')
        return; if (this.crewShield) {
        this.crewShield = false;
        p.invul = 1;
        this.effect('ring', p.x, p.y, 55, '#c9ffff', .35);
        return;
    } const t = this.equipment.traits; if (t.lastShield && this.time >= this.shieldReady) {
        this.shieldReady = this.time + 60;
        p.invul = 1;
        this.effect('evolve', p.x, p.y, 100, '#f6c454', .45);
        return;
    } this.lastDamageCause = cause; const damage = Math.max(1, raw * (this.chapter?.damage ?? 1) * this.chaos.incoming - this.attributes.armor); p.hp = Math.max(0, p.hp - damage); p.invul = this.mode.iframes; p.flash = .18; this.shake = 6; this.hitStop = .045; this.emit('hurt', p.x, p.y, Math.ceil(damage), '#ff746e'); this.damageNumber(p.x, p.y - 30, -Math.ceil(damage), '#ffaca4'); if (this.passives.thorns)
        impact(this, p.x, p.y, 130, 18 * this.passives.thorns, 'nova', 30); if (t.chaosSuit && this.time >= this.chaosSuitAt) {
        this.chaosSuitAt = this.time + 6;
        this.areaDamage(p.x, p.y, 200, 40, 20, 'frost');
        this.effect('ripple', p.x, p.y, 200, ELEMENTS.ice.color, .5);
    } if (p.hp <= 0) {
        if ((t.rescue || this.roomRescue) && !this.rescued) {
            this.rescued = true;
            p.hp = p.maxHp * Math.max(.5, this.roomRescue);
            p.invul = 3;
            this.effect('evolve', p.x, p.y, 200, '#f6c454', .8);
        }
        else
            this.status = 'lost';
    } }
    gainXP(value) { this.xp += value * this.attributes.xp * this.xpBoost; while (this.xp >= xpNeeded(this.level)) {
        this.xp -= xpNeeded(this.level);
        this.level++;
        this.pendingLevels++;
        this.firstLevelAt ??= this.time;
        this.levelTimes.push(this.time);
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + 8);
        this.emit('level');
        this.effect('level', this.player.x, this.player.y, 180, '#9affd5', .38);
        for (const e of this.enemies) {
            const dx = e.x - this.player.x, dy = e.y - this.player.y, d = Math.hypot(dx, dy);
            if (e.hp > 0 && e.type !== 'boss' && d < 190 + e.r) {
                e.x += dx / (d || 1) * 95;
                e.y += dy / (d || 1) * 95;
                this.hash.moved(e);
            }
        }
        this.shake = Math.max(this.shake, 3);
    } }
    offers(chest = false, previous = []) {
        if (chest && this.chestRank === 5)
            return [{ kind: 'chaos', id: String(this.chestQueue[0]?.chaos ?? 0) }];
        let offers = choices(this.weapons, this.passives, this.time, chest, this.random, previous, this.banished);
        if (chest && this.chestRank === 3) {
            const evolved = offers.filter(c => c.kind === 'evolve' || c.kind === 'fusion');
            if (evolved.length)
                return evolved;
        }
        if (chest && this.chestRank === 1)
            offers.sort((a, b) => this.choiceLevel(b) - this.choiceLevel(a));
        return offers;
    }
    choiceLevel(c) { return c.kind === 'weapon' ? this.weapons.find(w => w.id === c.id)?.level ?? 0 : this.passives[c.id] ?? 0; }
    apply(choice, chest = false) {
        if (chest ? this.pendingChests <= 0 : this.pendingLevels <= 0)
            return false;
        if ((choice.kind === 'weapon' || choice.kind === 'passive') && this.skillLevels >= RUN_SKILL_LIMIT)
            return false;
        const old = this.attributes.maxHp;
        if (choice.kind === 'weapon') {
            const def = WEAPONS.find(w => w.id === choice.id), slot = this.weapons.find(w => w.id === choice.id);
            if (!def || this.banished.some(b => b.kind === choice.kind && b.id === choice.id))
                return false;
            if (slot) {
                if (slot.level >= 8)
                    return false;
                slot.level++;
            }
            else if (this.weapons.length < 6)
                this.weapons.push({ id: def.id, level: 1, evolved: false, timer: 0 });
            else
                return false;
        }
        else if (choice.kind === 'passive') {
            const key = choice.id;
            if (!PASSIVES.some(p => p.id === key) || this.banished.some(b => b.kind === choice.kind && b.id === choice.id))
                return false;
            const level = this.passives[key] ?? 0;
            if (level >= 6 || (!level && Object.keys(this.passives).length >= 6))
                return false;
            this.passives[key] = level + 1;
        }
        else if (choice.kind === 'chaos') {
            if (!chest || this.chestRank !== 5 || Number(choice.id) !== this.chestQueue[0].chaos)
                return false;
            const id = Number(choice.id);
            if (id === 0) {
                for (const w of this.weapons)
                    w.level += Math.max(0, Math.min(8 - w.level, RUN_CHESTS.chaosWeaponLevels, RUN_SKILL_LIMIT - this.skillLevels));
                this.chaos.hp *= 1 - RUN_CHESTS.chaosHpCost;
            }
            else if (id === 1) {
                this.chaos.damage += RUN_CHESTS.chaosDamage;
                this.chaos.incoming *= 1.15;
            }
            else if (id === 2) {
                this.chaos.haste *= 1 - RUN_CHESTS.chaosHaste;
                this.chaos.hp *= 1 - RUN_CHESTS.chaosHpCost;
            }
            else
                return false;
            this.chaosHistory.push(id);
            this.player.hp = Math.min(this.player.hp, this.attributes.maxHp);
            this.emit('evolve');
        }
        else if (choice.kind === 'fusion') {
            if (!chest || !canFuse(choice.id, this.weapons, this.time))
                return false;
            const f = FUSIONS.find(f => f.id === choice.id), a = this.weapons.find(w => w.id === f.a);
            a.fusion = f.id;
            a.evolved = true;
            this.weapons = this.weapons.filter(w => w.id !== f.b);
            this.evolutions++;
            this.emit('evolve');
            this.effect('evolve', this.player.x, this.player.y, 300, ELEMENTS[elementOf(a.id)].color, 1);
            this.shake = 8;
        }
        else if (choice.kind === 'evolve') {
            const slot = this.weapons.find(w => w.id === choice.id);
            if (!chest || !slot || !canEvolve(slot, this.passives, this.time))
                return false;
            slot.evolved = true;
            this.evolutions++;
            this.emit('evolve');
            this.effect('evolve', this.player.x, this.player.y, 280, '#d8b5ff', 1.5);
            this.shake = 7;
        }
        else if (choice.kind === 'boost') {
            if (!['damage', 'hull', 'reach'].includes(choice.id))
                return false;
            this.boosts[choice.id]++;
        }
        else if (choice.kind === 'heal')
            this.player.hp = Math.min(this.attributes.maxHp, this.player.hp + 30);
        else if (choice.kind === 'shards')
            this.bonus += ECONOMY.cardShards;
        else
            return false;
        this.player.maxHp = this.attributes.maxHp;
        this.player.hp += Math.max(0, this.player.maxHp - old);
        if (chest) {
            if (this.chestRank === 3 && ['evolve', 'fusion'].includes(choice.kind) && this.chestQueue.length) {
                this.pendingChests -= this.chestQueue[0].remaining - 1;
                this.chestQueue[0].remaining = 1;
            }
            this.pendingChests--;
            if (this.chestQueue.length && --this.chestQueue[0].remaining <= 0)
                this.chestQueue.shift();
        }
        else
            this.pendingLevels--;
        return true;
    }
    banish(choice) { if (this.banishes <= 0 || !['weapon', 'passive'].includes(choice.kind) || this.banished.some(b => b.kind === choice.kind && b.id === choice.id))
        return false; this.banishes--; this.banished.push({ ...choice }); return true; }
    buildTerrain() {
        const T = [], r = this.random, range = (a, b) => a + r() * (b - a);
        if (this.sector === 0) {
            for (let i = 0; i < 15; i++) {
                let x = 0, y = 0;
                for (let n = 0; n < 50; n++) {
                    x = range(350, 4450);
                    y = range(300, 2900);
                    if (Math.hypot(x - 2400, y - 1600) > 500 && !T.some(t => Math.hypot(t.x - x, t.y - y) < 380))
                        break;
                }
                T.push({ kind: ['emission', 'reflection', 'dark'][i % 3], x, y, r: i % 3 === 0 ? 260 : 220, angle: r() * TAU });
            }
            T[0] = { kind: 'emission', x: 2740, y: 1650, r: 220 };
            T[1] = { kind: 'reflection', x: 2140, y: 1400, r: 185 };
        }
        if (this.sector === 1)
            for (const [x, y] of [[900, 800], [2400, 750], [3900, 800], [900, 2450], [2400, 2500], [3900, 2450]])
                T.push({ kind: 'bluestars', x, y, r: 230, stars: Array.from({ length: 9 }, () => { const a = r() * TAU, d = range(20, 200); return [Math.cos(a) * d, Math.sin(a) * d, range(.6, 1.2)]; }) });
        if (this.sector === 2)
            T.push({ kind: 'core', x: 2400, y: 1600, r: 720 });
        if (this.sector === 3) {
            const R = 1350, bar = 330, arms = Array.from({ length: 2 }, (_, k) => Array.from({ length: 71 }, (_, i) => { const f = i / 70, a = k * Math.PI + f * 3.4, d = bar + f * (R - bar); return [2400 + Math.cos(a) * d, 1600 + Math.sin(a) * d]; }));
            const q = arms[0][30];
            T.push({ kind: 'galaxy', x: 2400, y: 1600, r: R, R, bar, arms, sun: { x: q[0], y: q[1], found: false } });
        }
        if (this.sector === 4)
            [[900, 800], [3900, 800], [2400, 2550], [850, 2500], [3950, 2450]].forEach(([x, y], i) => T.push({ kind: ['elliptical', 'spiral', 'irregular', 'spiral', 'elliptical'][i], x, y, r: 420, angle: r() * TAU, seed: i + 5 }));
        if (this.sector === 5)
            for (let i = 0; i < 40; i++) {
                const a = r() * TAU, d = range(150, 1400);
                T.push({ kind: 'mark', x: 2400 + Math.cos(a) * d, y: 1600 + Math.sin(a) * d, r: 10, age: 1, c: '#c9b8ff88' });
            }
        this.terrain = T;
    }
    inside(kind, x = this.player.x, y = this.player.y) { return this.terrain.find(t => t.kind === kind && (t.x - x) ** 2 + (t.y - y) ** 2 < t.r * t.r); }
    updateTerrain(dt) {
        const p = this.player;
        this.power = 1;
        this.speed = 1;
        this.xpBoost = 1;
        this.dashBoost = 1;
        this.spawnBoost = 1;
        this.blackout = Math.max(0, this.blackout - dt);
        p.inDark = !!this.inside('dark');
        if (this.inside('emission'))
            this.power = 1.2;
        if (this.inside('bluestars')) {
            this.speed = 1.1;
            this.dashBoost = 2;
        }
        if (this.inside('core')) {
            this.xpBoost = 1.5;
            this.spawnBoost = 1.4;
        }
        const g = this.terrain.find(t => t.kind === 'galaxy');
        if (g?.arms) {
            if (g.arms.some(arm => arm.some(q => (q[0] - p.x) ** 2 + (q[1] - p.y) ** 2 < 95 ** 2)))
                this.speed = 1.2;
            const s = g.sun;
            if (!s.found && Math.hypot(p.x - s.x, p.y - s.y) < 90) {
                s.found = true;
                this.gainXP(40);
            }
        }
        if (this.sector === 5)
            for (const d of this.drops) {
                d.x = clamp(d.x + (d.x - p.x) * .035 * dt, 30, 4770);
                d.y = clamp(d.y + (d.y - p.y) * .035 * dt, 30, 3170);
                arenaPoint(this, d);
            }
        if (this.sector === 4 && !this.terrain.some(t => Math.hypot(p.x - t.x, p.y - t.y) < t.r))
            this.spawnBoost = .6;
        for (let i = this.terrain.length - 1; i >= 0; i--) {
            const t = this.terrain[i];
            if (t.ttl !== undefined && (t.ttl -= dt) <= 0)
                this.terrain.splice(i, 1);
            if (t.kind === 'mark') {
                t.age = (t.age ?? 0) + dt;
                t.x += (t.x - p.x) * .06 * dt;
                t.y += (t.y - p.y) * .06 * dt;
                if (Math.hypot(t.x - p.x, t.y - p.y) > 1700) {
                    const a = this.random() * TAU;
                    t.x = p.x + Math.cos(a) * 300;
                    t.y = p.y + Math.sin(a) * 300;
                    t.age = 0;
                }
            }
        }
    }
    formation(x, y) { const leader = this.spawn('wingLeader', x, y); if (!leader)
        return; leader.escort = true; for (let i = 0; i < 4; i++) {
        const w = this.spawn('wing', x + (i % 2 ? 1 : -1) * (40 + Math.floor(i / 2) * 35), y + 50 + Math.floor(i / 2) * 40);
        if (w) {
            w.escort = true;
            w.leader = leader.id;
            w.offX = (i % 2 ? 1 : -1) * (40 + Math.floor(i / 2) * 35);
            w.offY = 50 + Math.floor(i / 2) * 40;
        }
    } }
    updateEnemy(e, dt) {
        const p = this.player;
        e.age += dt;
        e.attackFlash = Math.max(0, e.attackFlash - dt);
        for (const key of ['burn', 'freeze', 'shock', 'pull', 'acid', 'mark', 'stun', 'reactionCD'])
            e.status[key] = Math.max(0, e.status[key] - dt);
        if (e.status.burn > 0)
            e.hp -= e.status.dot * dt;
        if (e.prefix === 'mending')
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * .025 * dt);
        e.flash = Math.max(0, e.flash - dt);
        e.mirror = Math.max(0, e.mirror - dt);
        e.stageGuard = Math.max(0, e.stageGuard - dt);
        e.timer -= dt;
        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, a = Math.atan2(dy, dx);
        let angle = a, speed = e.speed * this.mode.speed;
        e.angle = e.warnTime > 0 ? e.pendingAttack?.angle ?? a : e.action === 'charging' || e.action === 'bossCharge' ? e.actionAngle : a;
        e.hidden = e.type !== 'boss' && (e.action === 'teleport' || e.action === 'burrow' || (this.blackout > 0 && d > 240) || (p.inDark && d > 260) || (d > 220 && !!this.inside('dark', e.x, e.y)));
        if (e.type === 'boss' && updateBoss(this, e, dt))
            return;
        if (updateElite(this, e, dt))
            return;
        if (e.type !== 'boss' && this.updateBehavior(e, dt, a, d))
            return;
        if (e.status.freeze > 0 || e.status.stun > 0)
            speed *= e.type === 'boss' ? .65 : 0;
        else if (e.status.shock > 0)
            speed *= .8;
        if (e.type === 'boss') {
            if (d < 160)
                speed *= .05;
            else if (d > 260)
                speed = Math.max(speed, 180);
            if (e.stageGuard > 0)
                speed = 0;
            else if (e.action === 'bossCharge') {
                speed = 0;
                e.actionTime -= dt;
                e.x = clamp(e.x + Math.cos(e.actionAngle) * 500 * dt, 30, 4770);
                e.y = clamp(e.y + Math.sin(e.actionAngle) * 500 * dt, 30, 3170);
                if (e.actionTime <= 0)
                    e.action = '';
            }
            else if (e.warnTime > 0) {
                speed = 0;
                e.warnTime -= dt;
                if (e.warnTime <= 0 && e.pendingAttack) {
                    e.attackFlash = 1 / 60;
                    e.lastAttack = e.pendingAttack;
                    this.firePattern(e, e.pendingAttack);
                    e.pendingAttack = null;
                }
            }
            else if (e.timer <= 0) {
                const patterns = this.expedition && LOCAL_PATTERNS[this.chapter.id] ? LOCAL_PATTERNS[this.chapter.id] : e.role === 'final' ? SECTORS[this.sector].patterns : CAPTAINS[Math.max(0, e.bossArt - 6) % 4];
                this.beginPattern(e, patterns[(e.attackIndex++ + e.phase) % patterns.length]);
                e.timer = (5.4 - e.phase * .55) / (this.chapter?.tempo ?? 1);
            }
        }
        else {
            if (e.type === 'wing' && e.leader) {
                const l = this.enemies.find(q => q.id === e.leader && q.hp > 0);
                if (l) {
                    const tx = l.x - Math.cos(l.angle) * e.offY - Math.sin(l.angle) * e.offX, ty = l.y - Math.sin(l.angle) * e.offY + Math.cos(l.angle) * e.offX;
                    angle = Math.atan2(ty - e.y, tx - e.x);
                    speed *= Math.min(1.6, Math.hypot(tx - e.x, ty - e.y) / 25);
                }
                else {
                    e.leader = 0;
                    speed *= 1.5;
                }
            }
            if (e.type === 'orbiter') {
                const orbit = Math.max(95, 330 - e.age * 6), ang = e.age * e.speed / orbit + e.id, tx = p.x + Math.cos(ang) * orbit, ty = p.y + Math.sin(ang) * orbit;
                angle = Math.atan2(ty - e.y, tx - e.x);
            }
            if (e.type === 'patrol') {
                const g = this.terrain.find(t => t.kind === 'galaxy');
                if (g?.arms) {
                    const arm = g.arms[e.arm], q = arm[e.ti];
                    angle = Math.atan2(q[1] - e.y, q[0] - e.x);
                    if (Math.hypot(q[0] - e.x, q[1] - e.y) < 30) {
                        e.ti += e.dir;
                        if (e.ti <= 0 || e.ti >= 70)
                            e.dir *= -1;
                        e.ti = clamp(e.ti, 0, 70);
                    }
                }
            }
            if (e.type === 'wingLeader')
                angle += Math.sin(e.age * 2) * .55;
            if (e.type === 'spinner')
                angle += .8;
            if (e.type === 'erratic')
                angle += Math.sin(e.age * 5 + e.id);
            if (e.type === 'dustling')
                angle += Math.sin(e.age) * .35;
            const ranged = ['shooter', 'wingLeader', 'orbiter', 'patrol', 'ellip', 'galaxyDot', 'decoy'].includes(e.type);
            if (ranged) {
                if (d < 250 && e.type !== 'orbiter' && e.type !== 'patrol')
                    speed *= .15;
                if (e.warnTime > 0) {
                    e.warnTime -= dt;
                    if (e.warnTime <= 0) {
                        e.attackFlash = 1 / 60;
                        e.lastAttack = e.pendingAttack;
                        const n = e.type === 'ellip' || e.type === 'orbiter' ? 8 : e.type === 'wingLeader' ? 3 : 1;
                        for (let i = 0; i < n; i++)
                            this.fire(e.x, e.y, n === 8 ? i / n * TAU : (e.pendingAttack?.angle ?? a) + (i - (n - 1) / 2) * .18, 160 * this.mode.speed, e.damage, true);
                        e.timer = 3.2;
                    }
                }
                else if (e.timer <= 0 && d < 800) {
                    e.warnTime = e.warnDuration = .5;
                    this.emit('prepare', e.x, e.y);
                    e.pendingAttack = { pattern: 'prism', angle: a, phase: 0, x: e.x, y: e.y, gap: 0 };
                }
            }
            if (e.type === 'decoy' && (e.ttl -= dt) <= 0)
                e.hp = 0;
        }
        if (this.sector === 5 && e.type !== 'boss') {
            e.x += (e.x - p.x) * .035 * dt;
            e.y += (e.y - p.y) * .035 * dt;
        }
        e.x = clamp(e.x + Math.cos(angle) * speed * dt, 25, 4775);
        e.y = clamp(e.y + Math.sin(angle) * speed * dt, 25, 3175);
        if (d < e.r + p.r)
            this.hurt(e.damage, e.type === 'boss' ? 'boss:' + e.bossArt : e.type);
        if (d > 1500 && this.sector !== 4 && e.type !== 'boss' && !e.elite) {
            const ang = this.random() * TAU;
            e.x = clamp(p.x + Math.cos(ang) * 760, 35, 4765);
            e.y = clamp(p.y + Math.sin(ang) * 760, 35, 3165);
        }
    }
    hazard(type, x, y, extra = {}) { const h = { type, x, y, angle: 0, length: 1000, width: 26, r: 0, r0: 90, r1: 950, spin: .8, age: 0, warning: 1.3 * this.mode.tell, duration: 2.8, damage: 18 * this.mode.damage, gaps: [this.random() * TAU], gapW: .8, gap: 0, off: 80, boss: true, ...extra }; this.hazards.push(h); return h; }
    beginPattern(e, pattern) {
        const p = this.player, a = Math.atan2(p.y - e.y, p.x - e.x), gap = this.random() * TAU;
        e.pendingAttack = { pattern, angle: a, phase: e.phase, x: p.x, y: p.y, gap };
        e.warnTime = e.warnDuration = 1.3 * this.mode.tell;
        this.emit('warning', e.x, e.y);
        if (pattern === 'closing')
            this.hazard('ringwarn', p.x, p.y, { r: 430, gaps: [gap], gapW: .85, duration: 0, damage: 0 });
        if (pattern === 'ring')
            this.hazard('ringwarn', e.x, e.y, { r: e.r + 65, gaps: [a + .7], gapW: .7, duration: 0, damage: 0 });
        if (pattern === 'wall') {
            e.pendingAttack.gap = (this.random() - .5) * 500;
            this.hazard('wallwarn', e.x, e.y, { angle: a, gap: e.pendingAttack.gap, duration: 0, damage: 0 });
        }
        if (pattern === 'barSweep')
            this.hazard('sweep', e.x, e.y, { angle: a, spin: (this.random() < .5 ? -1 : 1) * .75, length: 1100, duration: 2.6 });
        if (pattern === 'balloon')
            this.hazard('shell', e.x, e.y, { gaps: [gap, gap + Math.PI], gapW: .8, duration: 3.2 });
        if (pattern === 'charge')
            this.hazard('laser', e.x, e.y, { angle: a, length: 300, width: e.r * 2, damage: 0, duration: 0 });
        if (pattern === 'laser')
            this.hazard('laser', e.x, e.y, { angle: a, length: 1100, duration: 1.2, width: 30 });
    }
    firePattern(e, pa) {
        if (pa.pattern === 'charge') {
            e.action = 'bossCharge';
            e.actionTime = .6;
            e.actionAngle = pa.angle;
            return;
        }
        const a = pa.angle, ph = pa.phase, sp = this.mode.speed * (this.chapter?.tempo ?? 1), damage = e.damage, dense = (n) => Math.ceil(n * (this.chapter?.density ?? 1));
        if (pa.pattern === 'prism' || pa.pattern === 'fan') {
            const base = pa.pattern === 'prism' ? 3 + ph : 7 + ph * 2, n = dense(base);
            for (let i = 0; i < n; i++) {
                const b = this.fire(e.x, e.y, a + (i / (n - 1) - .5) * (base - 1) * .25, 145 * sp, damage, true);
                if (b && pa.pattern === 'prism') {
                    b.split = true;
                    b.r = 8;
                }
            }
        }
        if (pa.pattern === 'blackout') {
            this.blackout = 3.6;
            for (let i = 0; i < 10; i++)
                this.fire(e.x, e.y, i / 10 * TAU, 120 * sp, damage, true);
        }
        if (pa.pattern === 'squad')
            for (const k of [-1, 1])
                this.formation(clamp(e.x + Math.cos(a + k * Math.PI / 2) * 170, 80, 4720), clamp(e.y + Math.sin(a + k * Math.PI / 2) * 170, 80, 3120));
        if (pa.pattern === 'wall')
            for (let k = -450; k <= 450; k += 30) {
                if (Math.abs(k - pa.gap) < 80)
                    continue;
                this.fire(e.x - Math.sin(a) * k + Math.cos(a) * 80, e.y + Math.cos(a) * k + Math.sin(a) * 80, a, 155 * sp, damage, true);
            }
        if (pa.pattern === 'closing')
            for (let i = 0; i < dense(48); i++) {
                const ang = i / dense(48) * TAU;
                if (inGap([pa.gap], .85, ang))
                    continue;
                this.fire(pa.x + Math.cos(ang) * 430, pa.y + Math.sin(ang) * 430, ang + Math.PI, 110 * sp, damage, true, 'pulse', '#ff746e', 4.1 / sp);
            }
        if (pa.pattern === 'ring') {
            const gap = a + .7;
            for (let i = 0; i < dense(28); i++) {
                const ang = i / dense(28) * TAU;
                if (!inGap([gap], .7, ang))
                    this.fire(e.x, e.y, ang, 140 * sp, damage, true);
            }
        }
        if (pa.pattern === 'mirror')
            e.mirror = 3.5;
        if (pa.pattern === 'clone')
            for (const k of [-1, 1])
                this.spawn('decoy', e.x + Math.cos(a + k * Math.PI / 2) * 170, e.y + Math.sin(a + k * Math.PI / 2) * 170);
    }
    updateHazards(dt) {
        const p = this.player;
        for (let i = this.hazards.length - 1; i >= 0; i--) {
            const h = this.hazards[i];
            h.age += dt;
            if (h.age > h.warning + h.duration) {
                this.hazards.splice(i, 1);
                continue;
            }
            if (h.age < h.warning || h.damage <= 0)
                continue;
            let hit = false;
            const a = h.angle + (h.type === 'sweep' ? h.spin * (h.age - h.warning) : 0), dx = p.x - h.x, dy = p.y - h.y, along = dx * Math.cos(a) + dy * Math.sin(a), across = -dx * Math.sin(a) + dy * Math.cos(a);
            if (h.type === 'laser')
                hit = along >= 0 && along < h.length && Math.abs(across) < h.width / 2 + p.r;
            if (h.type === 'sweep')
                hit = Math.abs(along) < h.length && Math.abs(across) < h.width / 2 + p.r;
            if (h.type === 'shell') {
                const rad = h.r0 + (h.r1 - h.r0) * clamp((h.age - h.warning) / h.duration, 0, 1);
                hit = Math.abs(Math.hypot(dx, dy) - rad) < h.width / 2 + p.r && !inGap(h.gaps, h.gapW, Math.atan2(dy, dx));
            }
            if (hit)
                this.hurt(h.damage, 'hazard');
        }
    }
    attack(slot, input) {
        if (attackSkill(this, slot, input))
            return;
        const p = this.player, s = this.attributes, w = weaponStats(slot, s), def = WEAPONS.find(w => w.id === slot.id), extra = slot.id === this.equipment.family ? (this.equipment.traits.linkedShot ?? 0) : 0, damage = w.damage * this.power;
        const target = this.nearest(p.x, p.y, 800), b = this.beacon, bt = b && Math.hypot(b.x - p.x, b.y - p.y) < 500 ? b : null, t = bt ?? target;
        const a = weaponAim(this, slot.id, input).angle;
        if (slot.id === 'orbit')
            return;
        if (slot.id === 'pulse' || slot.id === 'fan') {
            if (!t && !input.manual)
                return;
            const fan = slot.id === 'fan', n = (fan ? (slot.evolved ? 9 : 5 + Number(slot.level >= 3) + Number(slot.level >= 5) + Number(slot.level >= 8) * 2 + s.multi) : w.count + (slot.evolved ? 2 : 0)) + extra;
            for (let j = 0; j < n; j++)
                this.fire(p.x + Math.cos(a) * 20, p.y + Math.sin(a) * 20, a + (j - (n - 1) / 2) * (fan ? .16 : .11), fan ? 460 : 670, damage, false, 'pulse', def.color, w.radius / (fan ? 460 : 670), (slot.evolved ? 3 : this.ship === 'lynx' ? 1 : 0) + s.pierce, slot.id);
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
        }
        else if (slot.id === 'missile' && t) {
            for (let j = 0; j < (slot.evolved ? 5 : Math.min(3, w.count)) + extra; j++) {
                const shot = this.fire(p.x, p.y, a + (j - (w.count - 1) / 2) * .35, 310, damage, false, 'missile', def.color, 3);
                if (shot)
                    shot.targetId = target?.id ?? 0;
            }
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
        }
        else if (slot.id === 'chain' && t) {
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
            if (bt) {
                this.hitBeacon(bt.x, bt.y, 30, damage);
                this.effect('line', p.x, p.y, 0, def.color, .2, 0, bt.x, bt.y, false, slot.id);
            }
            let last = { x: p.x, y: p.y }, next = target;
            const used = new Set();
            for (let j = 0; j < (slot.evolved ? 9 : 2 + w.count) && next; j++) {
                used.add(next.id);
                this.hit(next, damage, slot.id);
                this.effect('line', last.x, last.y, 0, def.color, .2, 0, next.x, next.y, false, slot.id);
                last = next;
                next = this.nearest(last.x, last.y, w.radius, used);
            }
        }
        else if (slot.id === 'laser' && t) {
            for (let j = 0; j < (slot.evolved ? 5 : w.count); j++) {
                const ang = a + (j - ((slot.evolved ? 5 : w.count) - 1) / 2) * .2, x2 = p.x + Math.cos(ang) * w.radius, y2 = p.y + Math.sin(ang) * w.radius;
                this.hash.query(p.x, p.y, w.radius + 70, e => { if (e.hp > 0 && segmentDistance(e.x, e.y, p.x, p.y, x2, y2) < e.r + 8)
                    this.hit(e, damage, slot.id); });
                if (bt && segmentDistance(bt.x, bt.y, p.x, p.y, x2, y2) < bt.r + 8)
                    this.hitBeacon(bt.x, bt.y, 1, damage);
                this.effect('line', p.x, p.y, 0, def.color, .28, 0, x2, y2, false, slot.id);
            }
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
        }
        else if (slot.id === 'mine') {
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
            for (let j = 0; j < (slot.evolved ? 5 : w.count); j++)
                this.effect('mine', p.x - Math.cos(a) * 40 + Math.cos(j * TAU / 3) * j * 40, p.y - Math.sin(a) * 40 + Math.sin(j * TAU / 3) * j * 40, w.radius, def.color, 1.2, damage, 0, 0, slot.evolved || slot.level >= 8, slot.id);
        }
        else if (slot.id === 'nova') {
            this.emit('shoot', p.x, p.y, 0, def.color, slot.id);
            const r = w.radius * (slot.evolved ? 1.5 : 1);
            this.areaDamage(p.x, p.y, r, damage, 45, slot.id);
            this.effect('ring', p.x, p.y, r, def.color, .6, 0, 0, 0, false, slot.id);
            if (slot.level >= 3)
                this.effect('ripple', p.x, p.y, r * .75, def.color, .45, damage * .2, 0, 0, false, slot.id);
            if (slot.level >= 5)
                this.effect('mine', p.x, p.y, r, def.color, .65, damage * .2, 0, 0, false, slot.id);
            this.shake = Math.max(this.shake, r >= 280 ? 8 : r >= 180 ? 4 : 2);
            if (r >= 220)
                this.hitStop = Math.max(this.hitStop, .045);
            if (slot.evolved || extra)
                this.effect('mine', p.x, p.y, r, def.color, .45, damage * .7, 0, 0, false, slot.id);
        }
    }
    orbitAttack(slot) { const p = this.player, w = weaponStats(slot, this.attributes), n = (slot.evolved ? 8 : 2 + Number(slot.level >= 3) + Number(slot.level >= 5) + Number(slot.level >= 8) * 2) + this.attributes.multi + (slot.id === this.equipment.family ? (this.equipment.traits.linkedShot ?? 0) : 0), r = w.radius * (slot.evolved ? 1.3 : 1); p.orbitCount = n; p.orbitRadius = r; for (let j = 0; j < n; j++) {
        const a = this.orbitAngle + j / n * TAU, x = p.x + Math.cos(a) * r, y = p.y + Math.sin(a) * r;
        this.hash.query(x, y, 110, e => { if (e.hp > 0 && this.time - e.orbitHit >= w.cooldown && (x - e.x) ** 2 + (y - e.y) ** 2 < (e.r + 15) ** 2) {
            e.orbitHit = this.time;
            this.hit(e, w.damage * this.power, slot.id);
        } });
        this.hitBeacon(x, y, 15, w.damage * .03);
    } }
    updateProjectiles(pool, dt, enemy) {
        let maximumRadius = 0;
        if (!enemy)
            for (const e of this.enemies)
                if (e.hp > 0)
                    maximumRadius = Math.max(maximumRadius, e.r);
        const targets = new Map();
        if (!enemy && pool.active.some(b => b.kind === 'missile' || b.kind === 'bomb'))
            for (const e of this.enemies)
                if (!targets.has(e.id))
                    targets.set(e.id, e);
        for (let i = pool.active.length - 1; i >= 0; i--) {
            const b = pool.active[i];
            b.life -= dt;
            b.age += dt;
            const ox = b.x, oy = b.y;
            if (b.kind === 'blade' && b.age > .65) {
                const a = Math.atan2(this.player.y - b.y, this.player.x - b.x);
                b.vx += (Math.cos(a) * 390 - b.vx) * Math.min(1, dt * 10);
                b.vy += (Math.sin(a) * 390 - b.vy) * Math.min(1, dt * 10);
                if (b.age > 1 && Math.hypot(b.x - this.player.x, b.y - this.player.y) < 25)
                    b.life = 0;
            }
            if (b.kind === 'missile' || b.kind === 'bomb') {
                const tracked = targets.get(b.targetId), target = tracked && tracked.hp > 0 ? tracked : this.nearest(b.x, b.y, 650);
                if (target) {
                    const a = Math.atan2(target.y - b.y, target.x - b.x);
                    b.vx += (Math.cos(a) * 350 - b.vx) * Math.min(1, dt * 7);
                    b.vy += (Math.sin(a) * 350 - b.vy) * Math.min(1, dt * 7);
                }
            }
            if (enemy)
                steerBossBullet(this, b, dt);
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            bounceArena(this, b, enemy);
            if (enemy && !b.reflected)
                for (const t of this.terrain) {
                    if (t.kind !== 'reflection')
                        continue;
                    const d0 = Math.hypot(ox - t.x, oy - t.y), d1 = Math.hypot(b.x - t.x, b.y - t.y);
                    if (d0 >= t.r && d1 < t.r) {
                        const nx = (ox - t.x) / d0, ny = (oy - t.y) / d0, dot = b.vx * nx + b.vy * ny;
                        b.vx -= 2 * dot * nx;
                        b.vy -= 2 * dot * ny;
                        b.x = ox;
                        b.y = oy;
                        b.reflected = true;
                        this.reflections++;
                        break;
                    }
                }
            if (b.split && b.age >= .95) {
                b.life = 0;
                b.split = false;
                const a = Math.atan2(b.vy, b.vx);
                for (let k = -1; k <= 1; k++)
                    this.fire(b.x, b.y, a + k * .4, 175 * this.mode.speed, b.damage, true);
            }
            if (enemy) {
                if (!b.reflected && squaredSegmentDistance(this.player.x, this.player.y, ox, oy, b.x, b.y) < (this.player.r + b.r) ** 2) {
                    this.hurt(b.damage, 'bullet');
                    b.life = 0;
                }
            }
            else if (b.life > 0) {
                const queryRadius = b.pierce <= 0 || b.kind === 'missile' || b.kind === 'bomb' ? Math.min(100, maximumRadius + b.r + Math.hypot(b.x - ox, b.y - oy) + this.hash.movementSlack) : 100;
                this.hash.query(b.x, b.y, queryRadius, e => {
                    if (e.hp <= 0 || e.hidden || b.life <= 0 || b.hit.has(e.id) || squaredSegmentDistance(e.x, e.y, ox, oy, b.x, b.y) > (e.r + b.r) ** 2)
                        return;
                    if (e.mirror > 0) {
                        b.life = 0;
                        this.fire(b.x, b.y, Math.atan2(this.player.y - e.y, this.player.x - e.x), 220, e.damage, true);
                        return;
                    }
                    if (b.kind === 'missile' || b.kind === 'bomb') {
                        const w = this.weapons.find(w => w.id === b.weapon), radius = (b.kind === 'bomb' ? 135 : WEAPONS[2].radius) * this.attributes.area * (w?.level === 8 ? 1.6 : 1);
                        impact(this, b.x, b.y, radius, b.damage, b.weapon);
                        if (b.kind === 'bomb' && w?.evolved)
                            for (let j = 0; j < 3; j++)
                                this.effect('mine', b.x + Math.cos(j * 2.1) * 65, b.y + Math.sin(j * 2.1) * 65, radius * .6, b.color, .6, b.damage * .35, 0, 0, false, 'bomb');
                        b.life = 0;
                    }
                    else {
                        this.hit(e, b.damage, b.weapon, true, { x: ox, y: oy });
                        b.hit.add(e.id);
                        if (b.pierce-- <= 0)
                            b.life = 0;
                    }
                }, () => b.life <= 0);
                const bc = this.beacon;
                if (bc && squaredSegmentDistance(bc.x, bc.y, ox, oy, b.x, b.y) < (bc.r + b.r) ** 2 && b.life > 0) {
                    this.hitBeacon(bc.x, bc.y, 0, b.damage);
                    b.life = 0;
                }
            }
            if (!enemy && b.life > 0 && this.expedition)
                for (const o of this.props) {
                    if (o.hp > 0 && !o.broken && squaredSegmentDistance(o.x, o.y, ox, oy, b.x, b.y) < (o.r + b.r) ** 2) {
                        hitProps(this, o.x, o.y, 0, b.damage);
                        b.life = 0;
                        break;
                    }
                }
            if (b.life <= 0) {
                if (!enemy && b.kind === 'bomb' && b.hit.size === 0 && b.age >= 1.8)
                    impact(this, b.x, b.y, 135 * this.attributes.area, b.damage, b.weapon);
                pool.remove(i);
            }
        }
    }
    dropXP(x, y, value, kind = 'xp') {
        const capped = this.pickups.reduce((n, g) => n + Number(g.kind === kind), 0) >= (kind === 'xp' ? XP_LIMIT : 1800);
        const g = capped ? null : this.gemPool.acquire();
        if (g) {
            Object.assign(g, { x, y, value, kind, pull: false, age: 0, cluster: false });
            return;
        }
        const p = this.player;
        let closest, best = Infinity, large, largeDistance = 240 ** 2;
        for (const gem of this.pickups) {
            if (gem.kind !== kind)
                continue;
            const d = (gem.x - (kind === 'xp' ? p.x : x)) ** 2 + (gem.y - (kind === 'xp' ? p.y : y)) ** 2;
            if (d < best) {
                closest = gem;
                best = d;
            }
            if (kind === 'xp' && (gem.cluster || gem.value >= 12) && d < largeDistance) {
                large = gem;
                largeDistance = d;
            }
        }
        if (large) {
            closest = large;
            best = largeDistance;
        }
        if (closest) {
            if (kind === 'xp' && best > 240 ** 2) {
                const a = Math.atan2(closest.y - p.y, closest.x - p.x);
                closest.x = clamp(p.x + Math.cos(a) * 220, 30, 4770);
                closest.y = clamp(p.y + Math.sin(a) * 220, 30, 3170);
            }
            closest.value += value;
            if (kind === 'xp') {
                closest.pull = true;
                closest.cluster = true;
            }
        }
    }
    cleanup() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hp > 0)
                continue;
            if (!this.expedition)
                this.rewardKills = this.kills;
            const previousRewardKills = this.rewardKills;
            this.kills++;
            this.rewardKills = (Math.round(this.rewardKills * 100) + (e.crowd ? 1 : 100)) / 100;
            if (this.expedition)
                trace(this, 'debris', e.x, e.y, 5, e.angle);
            if (this.equipment.traits.killHeal && Math.floor(this.rewardKills / 20) > Math.floor(previousRewardKills / 20))
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .1);
            this.shake = Math.max(this.shake, 1.8);
            const xp = this.expedition && e.type !== 'boss' ? Math.min(e.xp, this.xpCredit) : e.xp;
            if (this.expedition && e.type !== 'boss')
                this.xpCredit -= xp;
            if (xp > 0)
                this.dropXP(e.x, e.y, xp);
            this.emit('kill', e.x, e.y, e.type === 'boss' ? 2 : 0, '#ffd260', undefined, e.r);
            if (this.random() < .025 * (e.crowd ? .01 : 1))
                this.dropXP(e.x + 12, e.y, 10, 'heal');
            this.burst(e.x, e.y, e.type === 'boss' ? '#f6c454' : '#df5c53', e.type === 'boss' ? 24 : 4, 1);
            if (this.passives.volatile && this.combatRandom() < this.passives.volatile * .05)
                impact(this, e.x, e.y, 85, 24 * this.passives.volatile, 'bomb');
            if (e.status.mark > 0) {
                impact(this, e.x, e.y, 95, 35, 'mark');
                let count = 0;
                this.hash.query(e.x, e.y, 190, n => { if (n.hp > 0 && count++ < 3)
                    n.status.mark = 3; });
            }
            if (e.prefix === 'volatile')
                this.hazard('shell', e.x, e.y, { boss: false, r0: 10, r1: 150, warning: .5, duration: .65, damage: e.damage, gaps: [], gapW: 0 });
            if (e.prefix === 'echo')
                for (let j = 0; j < 2; j++)
                    this.spawn('mini', e.x + j * 24, e.y);
            if (this.equipment.traits.chaosWeapon && Math.floor(this.rewardKills / 40) > Math.floor(previousRewardKills / 40))
                this.effect('gravity', e.x, e.y, 200, ELEMENTS.gravity.color, 2.2, 35, 0, 0, false, 'blackhole');
            if (e.type === 'splitter' || this.expedition && ENEMY_BEHAVIOR[e.type] === 'split') {
                this.effect('splitwarn', e.x, e.y, 45, '#df5c53', .5, 0, 0, 0, e.crowd);
            }
            if (e.type === 'dustling' && this.terrain.filter(t => t.ttl !== undefined).length < 6)
                this.terrain.push({ kind: 'dark', x: e.x, y: e.y, r: 100, ttl: 8 });
            if (e.type === 'boss' || e.elite) {
                this.dropChest(e.x, e.y);
                this.bonus += e.elite ? ECONOMY.eliteShards : e.role === 'middle' ? ECONOMY.middleShards : ECONOMY.bossShards;
                this.shake = 8;
                this.hitStop = e.type === 'boss' ? .11 : .04;
                if (e.type === 'boss') {
                    this.slowMotion = e.role === 'final' ? 1.1 : .4;
                    this.effect('blast', e.x, e.y, e.role === 'final' ? 360 : 180, '#ffc76d', 1);
                }
                const record = this.bossRecords.find(r => r.id === e.id);
                if (record)
                    record.killed = this.time;
                finishBoss(this, e);
                if (e.role === 'final') {
                    this.bossKilled = true;
                    this.bossDefeatedAt = this.time;
                    this.player.invul = Math.max(this.player.invul, 3);
                    if (this.expedition) {
                        this.pendingLevels = this.pendingChests = 0;
                        this.chestQueue = [];
                    }
                    this.blackout = 0;
                    this.hazards = [];
                    for (const b of this.bullets)
                        b.life = 0;
                }
            }
            if (e.type !== 'boss' && !e.elite && this.combatRandom() < RUN_CHESTS.drop.normal * (e.crowd ? .01 : 1))
                this.dropChest(e.x, e.y);
            this.enemyPool.remove(i);
        }
    }
    step(dt, input = blank) {
        if (this.launchAge >= 0) {
            this.launchAge += Math.min(.1, Math.max(0, dt));
            if (this.launchAge >= 5)
                this.status = 'won';
            return;
        }
        if (this.status !== 'playing' || !this.bossKilled && (this.pendingLevels || this.pendingChests))
            return;
        if (!Number.isFinite(dt) || dt <= 0)
            return;
        dt = Math.min(dt, .1);
        this.time = Math.min(this.expedition ? 528 : 660, this.time + dt);
        const p = this.player, s = this.attributes, m = moveVector(input.x, input.y);
        this.stepAttributes = s;
        this.particleMinimum = 0;
        if (this.expedition && LOCAL_ENEMIES[this.chapter.id]) {
            this.power = this.speed = this.xpBoost = this.dashBoost = this.spawnBoost = 1;
            updateSurface(this, dt);
        }
        else
            this.updateTerrain(dt);
        p.maxHp = s.maxHp;
        p.invul = Math.max(0, p.invul - dt);
        p.flash = Math.max(0, p.flash - dt);
        p.hp = Math.min(p.maxHp, p.hp + s.regen * dt);
        p.dashCD = Math.max(0, p.dashCD - dt * this.dashBoost);
        p.dashTime = Math.max(0, p.dashTime - dt);
        this.shake = Math.max(0, this.shake - dt * 16);
        if (input.dash && p.dashCD <= 0) {
            if (this.equipment.traits.chaosBoots)
                this.effect('ground', p.x, p.y, 100, ELEMENTS.fire.color, 2.5, 30, 0, 0, false, 'flame');
            p.dashTime = .22;
            p.dashCD = 4.5 * (this.equipment.traits.dashHaste ? .7 : 1);
            const len = Math.hypot(m.x, m.y);
            p.dashX = len ? m.x / len : Math.cos(p.angle);
            p.dashY = len ? m.y / len : Math.sin(p.angle);
        }
        if (this.expedition)
            moveExpedition(this, dt, m, s.speed);
        else {
            p.vx = p.dashTime > 0 ? p.dashX * 650 : m.x * s.speed * this.speed;
            p.vy = p.dashTime > 0 ? p.dashY * 650 : m.y * s.speed * this.speed;
            p.x = clamp(p.x + p.vx * dt, 30, 4770);
            p.y = clamp(p.y + p.vy * dt, 30, 3170);
        }
        if (Math.hypot(m.x, m.y) > .1)
            p.angle = Math.atan2(m.y, m.x);
        constrainArena(this);
        for (const o of this.obstacles) {
            if (!o.solid)
                continue;
            const dx = p.x - o.x, dy = p.y - o.y, d = Math.hypot(dx, dy), r = p.r + o.r;
            if (d < r) {
                p.x = o.x + dx / (d || 1) * (r + .5);
                p.y = o.y + dy / (d || 1) * (r + .5);
            }
        }
        if (!this.bossKilled) {
            this.spawnBudget += waveAt(this.timeline) * this.mode.spawn * this.spawnBoost * (this.bossSpawned ? .85 : 1) * dt / (this.expedition ? CHAPTER_RATE : 1);
            while (this.spawnBudget >= 1) {
                const types = SECTORS[this.sector].types;
                const type = this.time < 35 ? 'rusher' : types[Math.floor(this.random() * Math.min(types.length, 1 + Math.floor(this.time / 65)))];
                if (this.sector === 4) {
                    const island = this.terrain.reduce((best, t) => Math.hypot(t.x - p.x, t.y - p.y) < Math.hypot(best.x - p.x, best.y - p.y) ? t : best, this.terrain[0]), a = this.random() * TAU;
                    const islandType = island.kind === 'elliptical' ? 'ellip' : island.kind === 'spiral' ? 'spinner' : 'erratic';
                    this.spawn(islandType, island.x + Math.cos(a) * island.r * .7, island.y + Math.sin(a) * island.r * .7);
                }
                else {
                    const special = this.time > 40 && this.combatRandom() < Math.min(.38, (this.time - 40) / 700);
                    this.spawn(special ? CHAPTER_ENEMIES[this.sector][Math.floor(this.combatRandom() * Math.min(4, 1 + Math.floor(this.time / 90)))] : type);
                }
                this.spawnBudget--;
            }
            const encounter = this.encounters[this.encounterIndex];
            if (encounter && this.time >= encounter.at - 2.5 && this.bossWarning !== this.encounterIndex) {
                this.bossWarning = this.encounterIndex;
                this.emit('bossWarning', p.x, p.y, encounter.role === 'final' ? 1 : 0);
            }
            if (encounter && this.time >= encounter.at && arenaSpawnAllowed(this, 'rusher')) {
                const e = this.spawn('boss', p.x + 220, p.y - 120, encounter.role);
                if (e) {
                    e.bossArt = encounter.art < 0 ? this.sector : encounter.art;
                    e.stages = encounter.stages;
                    e.hp = e.maxHp = encounter.hp * this.mode.hp * (1 + this.sector * .12) * (this.chapter?.bossHp ?? 1) * (this.expedition ? CHAPTER_RATE : 1);
                    e.xp = encounter.role === 'final' ? 900 : encounter.role === 'middle' ? 400 : 180;
                    e.r = encounter.role === 'captain' ? 52 : encounter.role === 'middle' ? 66 : 78;
                    setupBoss(this, e);
                    this.bossRecords.push({ id: e.id, art: e.bossArt, role: e.role, spawned: this.time, killed: null, phases: [], hp: e.maxHp });
                    this.encounterIndex++;
                    if (e.role === 'middle')
                        this.miniSpawned = true;
                    if (e.role === 'final')
                        this.bossSpawned = true;
                    this.emit('boss', e.x, e.y, e.bossArt);
                    p.invul = Math.max(p.invul, 2);
                }
            }
            const swarm = swarmSchedule(this.expedition)[this.swarmIndex];
            if (swarm && this.time >= swarm.at) {
                this.swarmUntil = this.time + swarm.duration;
                this.swarmStarted = this.time;
                this.arrivalSites = [];
                this.swarmIndex++;
                if (!this.expedition)
                    this.emit('swarm');
                for (let i = 0; i < swarm.count; i++) {
                    const a = i / swarm.count * TAU, d = 450 + i % 4 * 35;
                    if (!this.expedition)
                        this.spawn('swarm', clamp(p.x + Math.cos(a) * d, 35, 4765), clamp(p.y + Math.sin(a) * d, 35, 3165));
                }
            }
            if (!LOCAL_ENEMIES[this.chapter?.id ?? ''] && this.sector === 1 && Math.floor(this.time / 25) > Math.floor((this.time - dt) / 25))
                this.formation(clamp(p.x + 550, 100, 4700), p.y);
            if (this.sector === 5 && Math.floor(this.time / 28) > Math.floor((this.time - dt) / 28))
                for (let i = 0; i < 7; i++)
                    this.spawn('galaxyDot', clamp(p.x + 450 + i * 24, 30, 4770), clamp(p.y - 140 + i * 18, 30, 3170));
        }
        if (this.time >= this.nextBeacon && this.timeline < 500) {
            if (!this.beacon)
                this.beacon = { x: clamp(p.x + 250, 100, 4700), y: clamp(p.y + 150, 100, 3100), r: 30, hp: 130 + this.sector * 30, maxHp: 130 + this.sector * 30, flash: 0 };
            this.nextBeacon += 100 * (this.expedition ? CHAPTER_RATE : 1);
        }
        if (this.beacon)
            arenaPoint(this, this.beacon, 80);
        if (this.time >= this.nextSupply && this.nextSupply <= 480 * (this.expedition ? CHAPTER_RATE : 1)) {
            this.dropChest(clamp(p.x + 80, 50, 4750), clamp(p.y + 40, 50, 3150));
            this.nextSupply += 120 * (this.expedition ? CHAPTER_RATE : 1);
        }
        if (this.time >= this.nextElite && this.timeline < 530) {
            this.spawn(CHAPTER_ENEMIES[this.sector][Math.floor(this.combatRandom() * 4)], undefined, undefined, '', true);
            this.nextElite += this.expedition ? 52 : 75;
        }
        if (this.expedition) {
            this.xpCredit = Math.min(600, this.xpCredit + dt / CHAPTER_RATE * (this.timeline < 12 ? 6 : this.timeline < 120 ? 10.5 : this.timeline < 300 ? 30 : this.timeline < 540 ? 68 : this.timeline < 600 ? 140 : 70));
            this.updateArrivals(dt);
            this.updateHorde(dt);
        }
        this.muzzleTime = Math.max(0, this.muzzleTime - dt);
        this.frameIndex++;
        this.hash.clear();
        for (const e of this.enemies) {
            if (e.hp > 0) {
                const outside = Math.abs(e.x - p.x) > this.viewWidth / 2 + e.r || Math.abs(e.y - p.y) > this.viewHeight / 2 + e.r;
                if (e.crowd && outside && e.age > .3 && this.frameIndex % 3 !== e.id % 3)
                    e.offscreenLag += dt;
                else {
                    const elapsed = dt + e.offscreenLag;
                    if (e.crowd && outside) {
                        const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1, travel = Math.min(d, e.speed * 12 * elapsed);
                        e.x = clamp(e.x + dx / d * travel, 25, 4775);
                        e.y = clamp(e.y + dy / d * travel, 25, 3175);
                        e.angle = Math.atan2(dy, dx);
                        e.age += elapsed;
                        e.flash = Math.max(0, e.flash - elapsed);
                    }
                    else
                        this.updateEnemy(e, elapsed);
                    e.offscreenLag = 0;
                }
                this.hash.insert(e);
            }
        }
        if (this.expedition) {
            const slot = this.weapons[0], kind = WEAPONS.find(w => w.id === slot.id).aim, target = kind === 'closest' ? this.nearest(p.x, p.y, 800) : undefined;
            this.aimAngle = input.manual ? Math.atan2(input.aimY, input.aimX) : target ? Math.atan2(target.y - p.y, target.x - p.x) : p.angle;
        }
        p.orbitCount = 0;
        this.orbitAngle = this.time * 2.6;
        for (const slot of this.weapons) {
            if (slot.id === 'orbit') {
                this.orbitAttack(slot);
                continue;
            }
            slot.timer -= dt;
            if (slot.timer <= 0) {
                this.attack(slot, input);
                slot.timer = weaponStats(slot, s).cooldown;
            }
        }
        this.updateProjectiles(this.shotPool, dt, false);
        this.updateProjectiles(this.bulletPool, dt, true);
        this.updateHazards(dt);
        updateBossWorld(this, dt);
        updateBattleEffects(this, dt);
        if (this.equipment.traits.chaosHelmet && this.time >= this.chaosHelmetAt) {
            this.chaosHelmetAt = this.time + 12;
            this.attack({ id: 'chain', level: 3, evolved: false, timer: 0 }, blank);
        }
        if (this.equipment.traits.chaosPack && this.time >= this.chaosPackAt) {
            this.chaosPackAt = this.time + 15;
            this.effect('turret', p.x, p.y, 480, ELEMENTS.physical.color, 5, 35, 0, 0, false, 'turret');
        }
        this.cleanup();
        const firstRecovery = this.expedition && this.level === 1 && this.time >= 11.5;
        for (let i = this.pickups.length - 1; i >= 0; i--) {
            const g = this.pickups[i], dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
            g.age += dt;
            if (d < s.magnet || g.kind === 'xp' && firstRecovery && g.age >= 3 || g.kind === 'xp' && this.time >= ENEMY_XP.recoverAt && this.time - (this.levelTimes.at(-1) ?? 0) >= ENEMY_XP.recoverGap && g.age >= ENEMY_XP.recoverAge)
                g.pull = true;
            if (this.sector === 5 && !g.pull && g.age < 18) {
                g.x += (g.x - p.x) * .05 * dt;
                g.y += (g.y - p.y) * .05 * dt;
                arenaPoint(this, g);
            }
            if (g.pull || g.kind === 'xp' && g.age >= 18) {
                const speed = g.pull ? (firstRecovery && g.kind === 'xp' ? Math.max(600, 340 + Math.max(0, s.magnet - d) * 6) : 340 + Math.max(0, s.magnet - d) * 6) : Math.min(180, 35 + (g.age - 18) * 5), travel = Math.min(d, speed * dt);
                g.x += dx / (d || 1) * travel;
                g.y += dy / (d || 1) * travel;
            }
            if (d < 20 && !(this.expedition && this.bossKilled)) {
                if (g.kind === 'heal')
                    p.hp = Math.min(p.maxHp, p.hp + g.value);
                else
                    this.gainXP(g.value);
                this.emit('pickup', g.x, g.y, g.value);
                this.gemPool.remove(i);
            }
        }
        for (let i = this.drops.length - 1; i >= 0; i--)
            if (!(this.expedition && this.bossKilled) && Math.hypot(this.drops[i].x - p.x, this.drops[i].y - p.y) < 38) {
                this.queueChest(this.drops[i].rank ?? 0);
                this.emit('chest', p.x, p.y, this.drops[i].rank ?? 0);
                this.drops.splice(i, 1);
            }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const f = this.particles[i];
            f.life -= dt;
            f.x += f.vx * dt;
            f.y += f.vy * dt;
            if (f.inward) {
                const a = Math.atan2((f.cy ?? 0) - f.y, (f.cx ?? 0) - f.x) + .7;
                f.vx = Math.cos(a) * 130;
                f.vy = Math.sin(a) * 130;
            }
            if (f.life <= 0)
                this.particlePool.remove(i);
        }
        for (let i = this.floaters.length - 1; i >= 0; i--) {
            const f = this.floaters[i];
            f.life -= dt;
            f.y -= 25 * dt;
            if (f.life <= 0)
                this.floaters.splice(i, 1);
        }
        if (this.status === 'playing' && this.bossKilled && this.time >= (this.expedition ? this.bossDefeatedAt + 1.2 : 600)) {
            if (this.expedition && this.chapter?.id === 'launch') {
                this.launchAge = 0;
                this.pendingChests = this.pendingLevels = 0;
                this.chestQueue = [];
            }
            else
                this.status = 'won';
        }
        if (this.status === 'playing' && this.time >= (this.expedition ? 528 : 660)) {
            this.lastDamageCause = 'timeout';
            this.status = 'lost';
        }
        this.stepAttributes = undefined;
    }
    end() { if (this.status === 'playing') {
        this.lastDamageCause = 'abandon';
        this.status = 'lost';
    } }
    result() { return { difficulty: this.difficulty, middleKilled: this.bossRecords.some(r => r.role === 'middle' && r.killed !== null), id: this.id, sector: this.expedition ? (this.chapterKey === 'village' ? 3 : this.chapterKey) : this.sector, special: this.chapterKey === 'village' ? 'village' : undefined, time: this.time, kills: this.kills, rewardKills: this.expedition ? this.rewardKills : undefined, won: this.status === 'won', earned: this.stress ? 0 : reward(this.time, this.expedition ? this.rewardKills : this.kills, this.bonus, this.status === 'won'), evolutions: this.evolutions, bosses: this.bossRecords.filter(r => r.killed !== null).length }; }
    setLoadout(weapons, passives) { this.weapons = weapons.slice(0, 6).map(id => ({ id, level: 8, evolved: false, timer: 0 })); this.passives = { ...passives }; this.player.maxHp = this.attributes.maxHp; this.player.hp = this.player.maxHp; }
}

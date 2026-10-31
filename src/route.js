import { Simulation } from './sim.js';
import { clamp, defaultSave, rng, canEvolve } from './core.js';
import { CHAPTER_BOSSES } from './encounters.js';
import { WEAPONS } from './data.js';
import { SKILLS } from './combat-catalog.js';
import { moveExpedition } from './surface.js';
import { routeRecords } from './dialogue/data.js';
export const ROUTE_KEY = 'cosmos-survivor.route.v1';
export const routePlaces = [
    { ko: '활주로', en: 'Runway', seconds: 75, device: 'vent' },
    { ko: '격납고', en: 'Hangar', seconds: 80, device: 'hangar' },
    { ko: '연료 저장소', en: 'Fuel store', seconds: 85, device: 'tank' },
    { ko: '관제탑 아래', en: 'Control tower', seconds: 90, device: 'scanner' },
    { ko: '정비동', en: 'Workshop', seconds: 95, device: 'repair' },
    { ko: '보급 격납고', en: 'Supply hangar', seconds: 70, device: 'hangar' },
    { ko: '발사대', en: 'Launch pad', seconds: 120, device: 'tank' },
];
export const routeRewards = {
    weapon: ['무기 선택', 'Weapon choice'], skill: ['스킬 선택', 'Skill choice'], crate: ['장비 상자', 'Equipment crate'],
    gold: ['골드', 'Gold'], heal: ['회복', 'Healing'], shop: ['상점', 'Shop'], event: ['사건', 'Event'],
    elite: ['정예 · 큰 보상', 'Elite · rich reward'], mystery: ['?', '?'], boss: ['최종 보스', 'Final boss'], back: ['돌아가기', 'Return'],
};
export function readRouteArchive(raw) {
    try {
        const a = JSON.parse(raw ?? 'null');
        if (a?.version === 1 && Array.isArray(a.seen) && Array.isArray(a.runs))
            return { version: 1, seen: a.seen.filter((s) => typeof s === 'string').slice(-100), runs: a.runs.filter((r) => r && typeof r.id === 'string' && Array.isArray(r.rooms)).slice(-20) };
    }
    catch { }
    return { version: 1, seen: [], runs: [] };
}
export function saveRouteRecord(storage, sim) {
    const a = readRouteArchive(storage.getItem(ROUTE_KEY));
    a.seen = [...new Set([...a.seen, ...sim.discoveries])];
    a.runs = [...a.runs.filter(r => r.id !== sim.id), sim.routeRecord()].slice(-20);
    storage.setItem(ROUTE_KEY, JSON.stringify(a));
}
const idle = { x: 0, y: 0, aimX: 0, aimY: 0, manual: false, dash: false };
export class RouteSimulation extends Simulation {
    depth = 0;
    place = 0;
    phase = 'combat';
    elapsed = 0;
    roomTime = 0;
    hits = 0;
    roomHits = 0;
    roomKills = 0;
    roomReward = 'gold';
    keys = 0;
    bombs = 0;
    coins = 0;
    secrets = 0;
    elite = false;
    secret = false;
    secretVisited = false;
    wallOpen = false;
    doors = [];
    objects = [];
    path = [];
    rooms = [];
    discoveries = [];
    known;
    notice = '';
    noticeUntil = 0;
    directAim = false;
    autoPilot = false;
    walkTo = null;
    routeRandom;
    transit = 0;
    nextDoor = null;
    eliteIds = [];
    rewardFilter = null;
    recorded = false;
    parentRoom = null;
    constructor(save = defaultSave(), seed = Date.now(), difficulty = 'normal', seen = []) {
        super(save.ship, save.meta, seed, `route-${seed}`, 0, difficulty, save.equipment, { chapter: 0, crew: save.crew, movement: save.settings.movement });
        this.routeRandom = rng(seed ^ 0x231b29);
        this.known = new Set(seen);
        this.setupRoom();
    }
    get timeline() { return Math.min(570, (this.elapsed ?? 0) / .95); }
    get encounters() { return this.depth === 6 && !this.secret ? CHAPTER_BOSSES.filter(b => b.role === 'final').map(b => ({ ...b, at: 2 })) : []; }
    get progress() { return this.status === 'won' ? 1 : Math.min(.99, (this.depth + Math.min(1, this.roomTime / routePlaces[this.place].seconds)) / 7); }
    get placeName() { return this.secret ? { ko: '숨은 보급실', en: 'Hidden supply room' } : routePlaces[this.place]; }
    get targetSeconds() { return this.secret ? 45 : routePlaces[this.place].seconds; }
    get remainingElites() { return this.enemies.filter(e => this.eliteIds.includes(e.id) && e.hp > 0).length; }
    message(ko, en) { this.notice = ko + '|' + en; this.noticeUntil = this.elapsed + 4; }
    discover(id, ko, en) {
        if (!this.discoveries.includes(id))
            this.discoveries.push(id);
        if (!this.known.has(id)) {
            this.known.add(id);
            this.message('발견 · ' + ko, 'Found · ' + en);
        }
    }
    clearField() {
        for (const pool of [this.enemyPool, this.shotPool, this.bulletPool, this.gemPool, this.effectPool, this.particlePool])
            while (pool.active.length)
                pool.remove(pool.active.length - 1);
        this.props = [];
        this.obstacles = [];
        this.terrain = [];
        this.hazards = [];
        this.drops = [];
        this.traces = [];
        this.combatFields = [];
        this.dashGhosts = [];
        this.hash.clear();
        this.beacon = null;
    }
    shiftClock(delta) {
        for (const key of ['nextFoot', 'shieldReady', 'chaosSuitAt', 'chaosGloveAt', 'chaosHelmetAt', 'chaosPackAt'])
            this[key] = Math.max(0, this[key] + delta);
        this.levelTimes = this.levelTimes.map(t => t + delta);
    }
    setupRoom(grant = true) {
        this.shiftClock(-this.time);
        this.clearField();
        this.time = this.roomTime = this.roomHits = 0;
        this.roomKills = this.kills;
        this.recorded = false;
        this.bossKilled = this.bossSpawned = false;
        this.launchAge = -1;
        this.bossRecords = [];
        this.encounterIndex = 0;
        this.bossWarning = -1;
        this.swarmIndex = 99;
        this.nextSupply = this.nextBeacon = this.nextElite = Infinity;
        this.spawnBudget = this.crowdBudget = 0;
        this.doors = [];
        this.walkTo = null;
        Object.assign(this.player, { x: 2400, y: 1780, vx: 0, vy: 0, invul: 2 });
        this.phase = 'combat';
        const add = (kind, x, y, r, hp = 0, solid = false) => this.props.push({ kind, x, y, r, hp, solid, shake: 0, cooldown: 0, broken: false });
        const device = this.secret ? 'tank' : routePlaces[this.place].device;
        if (device === 'tank') {
            add('tank', 2180, 1400, 32, 75, true);
            add('tank', 2670, 1470, 32, 75, true);
        }
        if (device === 'hangar') {
            add('hangar', 2080, 1390, 90, 0, true);
            add('car', 2670, 1400, 40, 140, true);
        }
        if (device === 'vent') {
            add('vent', 2180, 1420, 65);
            add('vent', 2640, 1600, 65);
        }
        this.obstacles = this.props.filter(p => p.solid).map(p => ({ ...p, angle: 0 }));
        this.objects = this.secret ? [{ id: 'rare-cache', kind: 'cache', x: 2400, y: 1550, used: false }] : [
            { id: 'key-' + this.depth, kind: 'key', x: 2240, y: 1780, used: false },
            { id: 'bomb-' + this.depth, kind: 'bomb', x: 2530, y: 1830, used: false },
            { id: 'crate-' + this.depth, kind: 'crate', x: 2750, y: 1690, used: false },
            { id: 'altar-' + this.depth, kind: 'altar', x: 2120, y: 1680, used: false },
            { id: 'record-' + this.depth, kind: 'record', x: 2580, y: 1340, used: false },
            { id: 'wall-' + this.depth, kind: 'wall', x: 2820, y: 1270, used: false },
            { id: 'cache-' + this.depth, kind: 'cache', x: 2890, y: 1230, used: false },
        ];
        this.wallOpen = false;
        if (this.depth === 2 && !this.secret && !this.secretVisited)
            this.objects.push({ id: 'hidden-door', kind: 'secret', x: 2900, y: 1280, used: false });
        this.eliteIds = [];
        if (this.elite || this.secret) {
            for (let i = 0; i < (this.secret ? 2 : 3); i++) {
                const e = this.spawn('rusher', 2200 + i * 210, 1420, '', true);
                if (e)
                    this.eliteIds.push(e.id);
            }
        }
        if (grant)
            this.grant(this.roomReward);
        this.message(this.placeName.ko, this.placeName.en);
    }
    grant(reward) {
        if (reward === 'weapon' || reward === 'skill') {
            this.pendingLevels++;
            this.rewardFilter = reward;
        }
        if (reward === 'crate') {
            this.queueChest(2);
        }
        if (reward === 'gold')
            this.coins += 30;
        if (reward === 'heal')
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .45);
        if (reward === 'mystery') {
            this.grant(['weapon', 'skill', 'crate', 'heal', 'gold'][Math.floor(this.routeRandom() * 5)]);
        }
        if (reward === 'shop')
            this.phase = 'shop';
        if (reward === 'event')
            this.phase = 'event';
    }
    offers(chest = false, exclude = []) {
        if (chest || !this.rewardFilter)
            return super.offers(chest, exclude);
        const selected = [];
        if (this.rewardFilter === 'weapon')
            for (const w of WEAPONS) {
                const owned = this.weapons.find(s => s.id === w.id);
                if (owned && canEvolve(owned, this.passives, this.time))
                    selected.push({ kind: 'evolve', id: w.id });
                else if (this.skillLevels < 40 && (owned ? owned.level < 5 : this.weapons.length < 3))
                    selected.push({ kind: 'weapon', id: w.id });
            }
        if (this.rewardFilter === 'skill')
            for (const skill of SKILLS) {
                const owned = this.skills.find(s => s.id === skill.id);
                if (owned && owned.level === 5 && !owned.evolved)
                    selected.push({ kind: 'skillEvolve', id: skill.id });
                else if (this.skillLevels < 40 && (owned ? owned.level < 5 : this.skills.length < 2))
                    selected.push({ kind: 'skill', id: skill.id });
            }
        const allowed = selected.filter(c => !this.banished.some(b => b.id === c.id && b.kind === c.kind));
        for (let i = allowed.length - 1; i > 0; i--) {
            const j = Math.floor(this.routeRandom() * (i + 1));
            [allowed[i], allowed[j]] = [allowed[j], allowed[i]];
        }
        allowed.sort((a, b) => Number(exclude.some(c => c.id === a.id && c.kind === a.kind)) - Number(exclude.some(c => c.id === b.id && c.kind === b.kind)));
        return allowed.length ? allowed.slice(0, 3) : super.offers(chest, exclude);
    }
    apply(choice, chest = false) { const applied = super.apply(choice, chest); if (applied && !chest)
        this.rewardFilter = null; return applied; }
    eventChoice(choice) {
        if (this.phase === 'shop') {
            if (choice === 'heal' && this.coins >= 25) {
                this.coins -= 25;
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .5);
            }
            else if (choice === 'crate' && this.coins >= 40) {
                this.coins -= 40;
                this.queueChest(2);
            }
            else if (choice !== 'leave')
                return;
        }
        else if (this.phase === 'event') {
            if (choice === 'risk' && this.player.hp > this.player.maxHp * .2) {
                this.player.hp -= this.player.maxHp * .2;
                this.queueChest(3);
            }
            else if (choice === 'safe')
                this.coins += 20;
            else
                return;
        }
        else
            return;
        this.phase = 'combat';
    }
    hurt(raw, cause = 'unknown') { const before = this.player.hp; super.hurt(raw, cause); if (this.player.hp < before) {
        this.hits++;
        this.roomHits++;
    } }
    areaDamage(x, y, r, damage, push = 0, weapon = 'pulse') {
        super.areaDamage(x, y, r, damage, push, weapon);
        if (['bomb', 'missile', 'mine'].includes(weapon) && damage > 0)
            for (const o of this.objects ?? [])
                if (o.kind === 'wall' && !o.used && Math.hypot(x - o.x, y - o.y) < r + 30)
                    this.openWall(o);
    }
    openWall(o) { o.used = true; this.wallOpen = true; this.discover('cracked-wall', '금 간 벽', 'Cracked wall'); this.message('벽 뒤에 길이 있다', 'A passage behind the wall'); }
    interact() {
        for (const o of this.objects) {
            if (o.used || Math.hypot(this.player.x - o.x, this.player.y - o.y) > 52)
                continue;
            if (o.kind === 'key') {
                this.keys++;
                o.used = true;
            }
            if (o.kind === 'bomb') {
                this.bombs++;
                o.used = true;
            }
            if (o.kind === 'wall') {
                if (this.bombs) {
                    this.bombs--;
                    this.openWall(o);
                }
                else
                    this.message('금 간 벽 · 폭탄이나 폭발 공격 필요', 'Cracked wall · needs a bomb or explosion');
            }
            if (o.kind === 'crate') {
                if (!this.keys) {
                    this.message('잠긴 상자 · 열쇠 1개 필요', 'Locked crate · needs 1 key');
                    continue;
                }
                this.keys--;
                o.used = true;
                this.queueChest(2);
                this.discover('locked-crate', '잠긴 보급 상자', 'Locked supply crate');
            }
            if (o.kind === 'altar') {
                if (this.player.hp <= this.player.maxHp * .25) {
                    this.message('제단 · 체력이 부족하다', 'Altar · not enough HP');
                    continue;
                }
                this.player.hp -= this.player.maxHp * .2;
                o.used = true;
                this.grant(this.routeRandom() < .5 ? 'weapon' : 'skill');
                this.discover('altar', '제단', 'Altar');
            }
            if (o.kind === 'record') {
                o.used = true;
                const line = routeRecords[this.depth % routeRecords.length];
                this.discover(line.id, '대원의 기록', 'Crew record');
                this.message(line.lines[0].ko, line.lines[0].en);
            }
            if (o.kind === 'cache' && (this.secret || this.wallOpen)) {
                o.used = true;
                this.secrets++;
                this.queueChest(this.secret ? 3 : 2);
                this.discover(this.secret ? 'rare-cache' : 'wall-cache', this.secret ? '숨은 보급실 상자' : '벽 뒤 상자', this.secret ? 'Hidden room cache' : 'Cache behind the wall');
            }
            if (o.kind === 'secret' && !this.secretVisited && (this.wallOpen || this.keys >= 3) && this.phase === 'doors') {
                if (!this.wallOpen)
                    this.keys -= 3;
                this.secretVisited = true;
                o.used = true;
                this.discover('secret-room', '숨은 보급실', 'Hidden supply room');
                this.beginDoor({ id: 'secret', reward: 'mystery', place: this.place, x: o.x, y: o.y });
                break;
            }
        }
    }
    recordRoom() { if (this.recorded)
        return; this.recorded = true; this.rooms.push({ place: this.placeName.ko, depth: this.depth, secret: this.secret, reward: this.roomReward, seconds: this.roomTime, kills: this.kills - this.roomKills, hits: this.roomHits, level: this.level, clean: (this.elite || this.secret) && this.roomHits === 0 }); }
    openDoors() {
        this.recordRoom();
        if ((this.elite || this.secret) && this.roomHits === 0) {
            this.coins += 45;
            this.queueChest(3);
            this.message('깔끔히 · 추가 보상', 'Clean clear · bonus reward');
        }
        this.clearCombat();
        this.phase = 'doors';
        const rewards = this.secret ? ['back'] : this.depth === 5 ? ['boss'] : this.depth === 4 ? ['shop', 'heal'] : [['weapon', 'skill', 'crate'], ['gold', 'heal', 'elite'], ['shop', 'event', 'mystery'], ['elite', 'crate', 'skill']].map(r => r)[this.depth];
        this.doors = rewards.map((reward, i) => ({ id: `${this.depth}-${i}`, reward, place: this.depth + 1, x: i === 0 ? 1870 : 2930, y: rewards.length === 3 ? 1280 + i * 320 : 1420 + i * 350 }));
    }
    clearCombat() { for (const pool of [this.enemyPool, this.shotPool, this.bulletPool, this.effectPool])
        while (pool.active.length)
            pool.remove(pool.active.length - 1); this.hazards = []; this.combatFields = []; }
    chooseDoor(id) { if (this.phase === 'doors')
        this.walkTo = this.doors.find(d => d.id === id) ?? null; }
    beginDoor(door) { this.nextDoor = door; this.transit = 0; this.phase = 'transition'; this.walkTo = null; }
    arrive() {
        const door = this.nextDoor;
        this.nextDoor = null;
        if (door.id === 'secret') {
            this.parentRoom = { time: this.roomTime, reward: this.roomReward, elite: this.elite, objects: this.objects.map(o => ({ ...o })), wallOpen: this.wallOpen, doors: this.doors };
            this.secret = true;
            this.roomReward = 'mystery';
            this.setupRoom();
            return;
        }
        if (this.secret) {
            const parent = this.parentRoom;
            this.parentRoom = null;
            this.secret = false;
            this.elite = parent.elite;
            this.roomReward = parent.reward;
            this.setupRoom(false);
            this.clearCombat();
            this.objects = parent.objects;
            this.wallOpen = parent.wallOpen;
            this.shiftClock(parent.time);
            this.time = this.roomTime = parent.time;
            this.recorded = true;
            this.doors = parent.doors;
            this.phase = 'doors';
            return;
        }
        this.path.push(door.reward);
        this.depth++;
        this.place = door.place;
        this.elite = door.reward === 'elite';
        this.roomReward = door.reward;
        this.setupRoom();
    }
    step(dt, input = idle) {
        if (!Number.isFinite(dt) || dt <= 0 || this.status !== 'playing')
            return;
        dt = Math.min(dt, .1);
        if (this.pendingLevels || this.pendingChests)
            return;
        if (this.phase === 'event' || this.phase === 'shop') {
            if (this.autoPilot)
                this.eventChoice(this.phase === 'event' ? 'safe' : this.player.hp < this.player.maxHp * .7 && this.coins >= 25 ? 'heal' : this.coins >= 40 ? 'crate' : 'leave');
            return;
        }
        if (this.phase === 'combat') {
            this.interact();
            if (this.pendingLevels || this.pendingChests)
                return;
        }
        this.elapsed += dt;
        if (this.phase === 'transition') {
            this.transit += dt;
            this.player.x += 55 * dt;
            this.player.vx = 55;
            if (this.transit >= 1.4)
                this.arrive();
            return;
        }
        if (this.phase === 'doors') {
            if (this.autoPilot && !this.walkTo) {
                const priority = ['heal', 'skill', 'weapon', 'elite', 'crate', 'shop', 'event', 'gold', 'mystery', 'boss', 'back'];
                const doors = [...this.doors];
                if (this.player.hp > this.player.maxHp * .65)
                    priority.push(priority.shift());
                doors.sort((a, b) => priority.indexOf(a.reward) - priority.indexOf(b.reward));
                this.walkTo = doors[0];
            }
            let movement = input;
            if (this.walkTo) {
                const dx = this.walkTo.x - this.player.x, dy = this.walkTo.y - this.player.y, d = Math.hypot(dx, dy) || 1;
                movement = { ...idle, x: dx / d, y: dy / d };
            }
            moveExpedition(this, dt, movement, this.attributes.speed);
            this.interact();
            for (const door of this.doors)
                if (this.phase === 'doors' && Math.hypot(this.player.x - door.x, this.player.y - door.y) < 52) {
                    this.beginDoor(door);
                    break;
                }
            return;
        }
        super.step(dt, { ...input, manual: this.directAim && input.manual });
        this.roomTime = this.time;
        this.player.x = clamp(this.player.x, 1840, 2960);
        this.player.y = clamp(this.player.y, 1170, 2030);
        if (this.place === 3 && Math.floor(this.time / 10) > Math.floor((this.time - dt) / 10))
            this.hazard('shell', 2400, 1450, { boss: true, r0: 40, r1: 350, warning: 1.5, duration: 1, damage: 10, gaps: [Math.PI / 2], gapW: 1.2 });
        if (this.place === 4 && Math.hypot(this.player.x - 2400, this.player.y - 1450) < 80)
            this.player.hp = Math.min(this.player.maxHp, this.player.hp + this.player.maxHp * .015 * dt);
        this.interact();
        if (!this.secret && !this.wallOpen && this.player.x > 2800 && this.player.y < 1370) {
            if (this.player.x - 2800 < 1370 - this.player.y)
                this.player.x = 2800;
            else
                this.player.y = 1370;
        }
        if (this.depth < 6 && this.status === 'playing' && this.roomTime >= this.targetSeconds && this.remainingElites === 0)
            this.openDoors();
        if (this.depth < 6 && this.roomTime >= 120 && this.remainingElites > 0) {
            this.message('정예를 모두 처치해야 문이 열린다', 'Defeat all elites to open the doors');
            if (this.roomTime >= 150) {
                this.lastDamageCause = 'timeout';
                this.status = 'lost';
            }
        }
        if (this.status !== 'playing')
            this.recordRoom();
    }
    end() { super.end(); this.recordRoom(); }
    result() { return { ...super.result(), time: this.elapsed, earned: 0 }; }
    routeRecord() { return { id: this.id, won: this.status === 'won', seconds: this.elapsed, kills: this.kills, level: this.level, hits: this.hits, secrets: this.secrets, path: [...this.path], rooms: this.rooms.map(r => ({ ...r })), discoveries: [...this.discoveries] }; }
}

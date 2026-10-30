export { CHAPTERS } from './chapters.js';
import { GEAR, SLOTS, addItem, gearBonus, slotRecord } from './equipment.js';
export const ECONOMY = { pullCost: 30, pullRates: [.5, .3, .16, .035, .005, 0], rarePity: 10, epicPity: 40, firstGems: 120, achievementGems: 60, dropBase: .12, dropTime: .0005, goldTime: .5, goldKills: .12, firstChests: 1, levelGold: 35, salvageFraction: .5, salvageGold: 15, salvageBlueprints: 2, testGold: 100000, testGems: 3000, testBlueprints: 1000, beaconShards: 15, eliteShards: 20, middleShards: 35, bossShards: 80, cardShards: 20 };
export const shardReward = (time, kills, bonus, won) => Math.floor(time / 8) + Math.floor(kills / 8) + Math.floor(bonus) + (won ? 100 : 0);
export function testCurrency(s) { return { ...s, gold: s.gold + ECONOMY.testGold, gems: s.gems + ECONOMY.testGems, blueprints: Object.fromEntries(SLOTS.map(slot => [slot, s.blueprints[slot] + ECONOMY.testBlueprints])) }; }
export function combatPower(save) { const b = gearBonus(save.equipment), m = save.meta; const offense = 1 + b.attack + m.output * .06; const defense = 1 + (b.hp + m.hull * 12) / 100 + (b.armor + m.guard) * .04 + (m.repair * .2) * .3; const utility = m.thrust * .02 + m.magnet * .01 + m.learning * .02 + m.forecast * .01 + Object.values(b.traits).reduce((n, x) => n + (x ?? 0) * .05, 0); return Math.round(700 * Math.sqrt(offense * defense) * (1 + utility)); }
export const powerStatus = (power, recommended) => power / recommended >= 1.2 ? 0 : power / recommended >= .95 ? 1 : power / recommended >= .8 ? 2 : 3;
export function rollRank(random, rates) { const sample = random(), r = Number.isFinite(sample) ? Math.max(0, Math.min(1 - Number.EPSILON, sample)) : 0; let acc = 0; for (let i = 0; i < rates.length; i++) {
    acc = Math.round((acc + rates[i]) * 1e12) / 1e12;
    if (r < acc)
        return i;
} return (rates.length - 1); }
export function pull(s, count, random) {
    if (![1, 10].includes(count) || s.gems < count * ECONOMY.pullCost || s.items.length + count > 1000)
        return { state: s, items: [] };
    let state = { ...s, gems: s.gems - count * ECONOMY.pullCost };
    const items = [];
    for (let i = 0; i < count; i++) {
        let rank = rollRank(random, ECONOMY.pullRates);
        if (state.pityEpic + 1 >= ECONOMY.epicPity)
            rank = Math.max(3, rank);
        else if (state.pityRare + 1 >= ECONOMY.rarePity)
            rank = Math.max(2, rank);
        const pool = GEAR.filter(d => d.id !== 'field-pack'), def = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
        items.push(state.nextId);
        state = addItem(state, def.id, rank);
        state = { ...state, pulls: state.pulls + 1, pityRare: rank >= 2 ? 0 : state.pityRare + 1, pityEpic: rank >= 3 ? 0 : state.pityEpic + 1 };
    }
    return { state, items };
}
export function chestRates(sector, boss = true) { const c = Math.max(0, Math.min(5, sector)), chaos = boss && c >= 3 ? (c - 2) * .0005 : 0; return [.34 - c * .035, .4 - c * .01, .22 + c * .025, .035 + c * .016, .005 + c * .004 - chaos, chaos]; }
export function awardRun(s, r, random, totals) {
    const first = r.won && !s.cleared.includes(r.sector), factor = 1 + r.sector * .35;
    const gold = Math.floor((r.time * ECONOMY.goldTime + r.kills * ECONOMY.goldKills) * factor), blueprints = slotRecord(Math.floor((r.time / 75 + r.kills / 200) * factor)), qualifiedRuns = s.qualifiedRuns + Number(r.time >= 60);
    const chests = (r.bosses ?? 0) + (first ? ECONOMY.firstChests : 0), achievements = [];
    for (const [key, met] of [['first-win', r.won], ['five-runs', qualifiedRuns >= 5], ['thousand-kills', totals.kills >= 1000], ['first-evolution', totals.evolutions >= 1]])
        if (met && !s.achievements.includes(key))
            achievements.push(key);
    const gems = (first ? ECONOMY.firstGems : 0) + achievements.length * ECONOMY.achievementGems;
    let next = { ...s, qualifiedRuns, gold: s.gold + gold, gems: s.gems + gems, blueprints: Object.fromEntries(SLOTS.map(slot => [slot, s.blueprints[slot] + blueprints[slot]])), cleared: first ? [...s.cleared, r.sector] : s.cleared, achievements: [...s.achievements, ...achievements] };
    const before = next.nextId, drop = r.time >= 30 && random() < Math.min(.65, ECONOMY.dropBase + r.time * ECONOMY.dropTime);
    for (let i = 0; i < chests + Number(drop); i++) {
        const rank = rollRank(random, chestRates(r.sector, i < (r.bosses ?? 0))), pool = GEAR.filter(d => d.id !== 'field-pack'), def = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
        const added = addItem(next, def.id, rank);
        if (added === next) {
            const slot = def.slot;
            next = { ...next, blueprints: { ...next.blueprints, [slot]: next.blueprints[slot] + (rank + 1) * 3 } };
        }
        else
            next = added;
    }
    const received = Object.fromEntries(SLOTS.map(slot => [slot, next.blueprints[slot] - s.blueprints[slot]]));
    return { ...next, lastLoot: { gold, gems, blueprints: received, items: next.items.filter(i => i.uid >= before), chests, first, achievements } };
}
export const RUN_CHESTS = { drop: { normal: .0012, elite: 1, boss: 1 }, rates: [.72, .2, .06, .016, .0038, .0002], upgrades: [1, 1, 2, 3, 4, 0], duration: [.45, .65, .9, 1.15, 1.5, 1.9], legendXP: 320, chaosWeaponLevels: 2, chaosHpCost: .2, chaosDamage: .3, chaosHaste: .15 };
export function runChestRates(sector, luck) {
    const boost = 1 + Math.max(0, Math.min(5, sector)) * .14 + Math.max(0, Math.min(6, luck)) * .16;
    const rates = RUN_CHESTS.rates.map((v, i) => v * (i ? boost ** (i * .32) : 1)), sum = rates.reduce((a, b) => a + b, 0);
    return rates.map(v => v / sum);
}
export const rollRunChest = (random, sector, luck) => rollRank(random, runChestRates(sector, luck));
export const RUN_SKILL_LIMIT = 72;

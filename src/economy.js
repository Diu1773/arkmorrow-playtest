import { GEAR, SLOTS, addItem, gearBonus, slotRecord } from './equipment.js';
export const ECONOMY = { pullCost: 30, pullRates: [.5, .3, .16, .035, .005], rarePity: 10, epicPity: 40, firstGems: 120, achievementGems: 60, dropBase: .12, dropTime: .0005, goldTime: .5, goldKills: .12, firstChests: 1, levelGold: 35, salvageFraction: .5, salvageGold: 15, salvageBlueprints: 2, testGold: 100000, testGems: 3000, testBlueprints: 1000, beaconShards: 15, eliteShards: 20, middleShards: 35, bossShards: 80, cardShards: 20 };
export const shardReward = (time, kills, bonus, won) => Math.floor(time / 8) + Math.floor(kills / 8) + Math.floor(bonus) + (won ? 100 : 0);
export function testCurrency(s) { return { ...s, gold: s.gold + ECONOMY.testGold, gems: s.gems + ECONOMY.testGems, blueprints: Object.fromEntries(SLOTS.map(slot => [slot, s.blueprints[slot] + ECONOMY.testBlueprints])) }; }
export const CHAPTERS = [
    { id: 'nebula', sector: 0, recommended: 1450, hp: 1.6, damage: 5.5, bossHp: 1.7, tempo: 1, density: 1 },
    { id: 'open-cluster', sector: 1, recommended: 2100, hp: 2.3, damage: 3.8, bossHp: 2.6, tempo: 1.08, density: 1.12 },
    { id: 'globular', sector: 2, recommended: 3100, hp: 3, damage: 3.2, bossHp: 2.6, tempo: 1.16, density: 1.24 },
    { id: 'galaxy', sector: 3, recommended: 4400, hp: 4, damage: 3.3, bossHp: 3, tempo: 1.24, density: 1.36 },
    { id: 'outer', sector: 4, recommended: 6100, hp: 4.5, damage: 11, bossHp: 3.5, tempo: 1.32, density: 1.48 },
    { id: 'expansion', sector: 5, recommended: 8500, hp: 5, damage: 10, bossHp: 4, tempo: 1.4, density: 1.6 },
];
export function combatPower(save) { const b = gearBonus(save.equipment), m = save.meta; const offense = 1 + b.attack + m.output * .06; const defense = 1 + (b.hp + m.hull * 12) / 100 + (b.armor + m.guard) * .04 + (m.repair * .2) * .3; const utility = m.thrust * .02 + m.magnet * .01 + m.learning * .02 + m.forecast * .01 + Object.values(b.traits).reduce((n, x) => n + (x ?? 0) * .05, 0); return Math.round(700 * Math.sqrt(offense * defense) * (1 + utility)); }
export const powerStatus = (power, recommended) => power / recommended >= 1.2 ? 0 : power / recommended >= .95 ? 1 : power / recommended >= .8 ? 2 : 3;
export function rollRank(random, rates) { const r = random(); let acc = 0; for (let i = 0; i < rates.length; i++) {
    acc = Math.round((acc + rates[i]) * 1e12) / 1e12;
    if (r < acc)
        return i;
} return 4; }
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
        const def = GEAR[Math.min(GEAR.length - 1, Math.floor(random() * GEAR.length))];
        items.push(state.nextId);
        state = addItem(state, def.id, rank);
        state = { ...state, pulls: state.pulls + 1, pityRare: rank >= 2 ? 0 : state.pityRare + 1, pityEpic: rank >= 3 ? 0 : state.pityEpic + 1 };
    }
    return { state, items };
}
export const chestRates = (sector) => [.34 - sector * .035, .4 - sector * .01, .22 + sector * .025, .035 + sector * .016, .005 + sector * .004];
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
        const rank = rollRank(random, chestRates(r.sector)), def = GEAR[Math.min(GEAR.length - 1, Math.floor(random() * GEAR.length))];
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

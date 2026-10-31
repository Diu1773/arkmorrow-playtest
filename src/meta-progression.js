import { GEAR, addItem, slotRecord } from './equipment.js';
import { chestRates, rollRank, ECONOMY } from './economy.js';
export const DIFFICULTY_REWARDS = { easy: .6, normal: 1, hard: 1.5 };
export const chapterKey = (r) => r.special ?? String(r.sector);
export const totalStars = (save) => Object.values(save.records).reduce((n, r) => n + [1, 2, 4].filter(b => r.stars & b).length, 0);
export const difficultyOpen = (save, key, difficulty) => difficulty !== 'hard' || !!save.records[key]?.clears.normal;
export const STAR_UNLOCKS = [{ id: 'workshop', stars: 1 }, { id: 'cargo', stars: 4 }, { id: 'greenhouse', stars: 6 }, { id: 'scarf', stars: 12 }];
export const starUnlocked = (save, id) => { const rule = STAR_UNLOCKS.find(r => r.id === id); return !!rule && totalStars(save) >= rule.stars; };
export function grantStarRewards(save) { if (!starUnlocked(save, 'scarf') || save.milestones.includes('scarf'))
    return save; return { ...save, scarf: true, milestones: [...save.milestones, 'scarf'] }; }
export function toggleScarf(save) { const next = grantStarRewards(save); return next.milestones.includes('scarf') ? { ...next, scarf: !next.scarf } : next; }
export const starGoals = (mask, lang) => [1, 2, 4].map((bit, n) => ({ bit, met: !!(mask & bit), label: (lang === 'ko' ? ['중간 보스 처치', '챕터 클리어', '어려움 클리어'] : ['Defeat a middle boss', 'Clear the chapter', 'Clear on Hard'])[n], gems: [0, 120, 80][n] }));
export function awardMetaRun(save, r, random) {
    const key = chapterKey(r), old = save.records[key] ?? { stars: 0, clears: {} }, difficulty = r.difficulty ?? 'normal';
    if (!difficultyOpen(save, key, difficulty))
        return save;
    const multiplier = DIFFICULTY_REWARDS[difficulty], stars = (r.middleKilled ? 1 : 0) | (r.won ? 2 : 0) | (r.won && difficulty === 'hard' ? 4 : 0), newStars = stars & ~old.stars;
    const firstDifficulty = r.won && !old.clears[difficulty], first = r.won && !Object.keys(old.clears).length, kills = r.rewardKills ?? r.kills, factor = 1 + (r.special ? 3 : r.sector) * .35;
    const dust = Math.floor((r.earned + (r.time * .5 + kills * .12) * factor) * multiplier), parts = Math.floor((r.time / 75 + kills / 200) * factor * 6 * multiplier);
    const qualifiedRuns = save.equipment.qualifiedRuns + Number(r.time >= 60), achievements = [];
    for (const [id, met] of [['first-win', r.won], ['five-runs', qualifiedRuns >= 5], ['thousand-kills', save.kills + r.kills >= 1000], ['first-evolution', save.evolutions + r.evolutions >= 1]])
        if (met && !save.equipment.achievements.includes(id))
            achievements.push(id);
    const gemBreakdown = { first: firstDifficulty ? ({ easy: 40, normal: 120, hard: 200 }[difficulty]) : 0, stars: ((newStars & 2) ? 120 : 0) + ((newStars & 4) ? 80 : 0), achievements: achievements.map(id => ({ id, gems: 60 })) };
    const gems = gemBreakdown.first + gemBreakdown.stars + gemBreakdown.achievements.reduce((n, a) => n + a.gems, 0);
    const chests = (r.bosses ?? 0) + [1, 2, 4].filter(b => newStars & b).length + Number(firstDifficulty);
    let equipment = { ...save.equipment, parts: (save.equipment.parts ?? 0) + parts, gems: save.equipment.gems + gems, qualifiedRuns, cleared: r.won && !r.special ? [...new Set([...save.equipment.cleared, r.sector])] : save.equipment.cleared, achievements: [...save.equipment.achievements, ...achievements] };
    const awards = [];
    const pool = GEAR.filter(d => d.id !== 'field-pack');
    const give = (def, rank) => { equipment = addItem(equipment, def, rank); const item = equipment.items.find(i => i.def === def && i.rank === rank); awards.push({ ...item, count: 1 }); };
    const drop = r.time >= 30 && random() < Math.min(.65, ECONOMY.dropBase + r.time * ECONOMY.dropTime);
    for (let n = 0; n < chests + Number(drop); n++) {
        const rates = chestRates(Math.max(0, Math.min(5, (r.special ? 3 : r.sector) - 2 + (difficulty === 'hard' ? 1 : difficulty === 'easy' ? -1 : 0))), n < (r.bosses ?? 0));
        let rank = rollRank(random, rates);
        if (n >= (r.bosses ?? 0) && newStars & 4)
            rank = Math.max(rank, 2);
        give(pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))].id, rank);
    }
    const exclusive = firstDifficulty && difficulty === 'hard' ? `chapter-${key}-gold` : undefined;
    if (firstDifficulty && difficulty === 'hard') {
        const def = pool[(r.special ? 8 : r.sector) % pool.length];
        give(def.id, 3);
    }
    if (r.special && first)
        give('field-pack', 2);
    equipment = { ...equipment, lastLoot: { gold: 0, gems, blueprints: slotRecord(), items: awards, chests, first, achievements } };
    return grantStarRewards({ ...save, equipment, shards: save.shards + dust, records: { ...save.records, [key]: { stars: old.stars | stars, clears: { ...old.clears, ...(r.won ? { [difficulty]: (old.clears[difficulty] ?? 0) + 1 } : {}) } } }, milestones: exclusive ? [...new Set([...save.milestones, exclusive])] : save.milestones, lastMetaLoot: { dust, parts, gems, gemBreakdown, multiplier, stars: newStars, firstDifficulty, exclusive }, specialCleared: r.special && r.won ? [...new Set([...save.specialCleared, r.special])] : save.specialCleared, runs: save.runs + 1, wins: save.wins + Number(r.won), kills: save.kills + r.kills, evolutions: save.evolutions + r.evolutions, best: Math.max(save.best, r.time), unlocked: r.won && !r.special ? Math.max(save.unlocked, Math.min(7, r.sector + 1)) : save.unlocked, settled: [...save.settled, r.id].slice(-100) });
}

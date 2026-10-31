export const TRACKS = ['nebula', 'open', 'globular', 'milkyway', 'galaxies', 'expansion', 'boss', 'title', 'launch', 'atmosphere', 'refuge', 'boss-assault', 'boss-dread'].map(id => ({ id }));
export function musicIntensity(seconds, enemies, current = 1) {
    if (seconds >= 420 || enemies >= 650)
        return 3;
    if (current === 3 && (seconds >= 390 || enemies >= 520))
        return 3;
    if (seconds >= 150 || enemies >= 220)
        return 2;
    if (current >= 2 && (seconds >= 120 || enemies >= 160))
        return 2;
    return 1;
}
export const SFX_IDS = ['pulse', 'orbit', 'missile', 'chain', 'laser', 'mine', 'fan', 'nova', 'kill', 'pickup', 'crystal', 'hurt', 'warning', 'level', 'evolve', 'chest', 'boss', 'clear', 'down', 'resonance', 'hover', 'click', 'back', 'buy', 'locked', 'start', 'air', 'blast', 'wave', 'spark', 'gravity', 'field', 'prepare', 'dash', 'footgrass', 'footstone', 'footmetal', 'footwater'];
export const SKILL_SOUND_IDS = ['skill-swing', 'skill-hammer', 'skill-drone', 'skill-flash', 'skill-void', 'skill-bombard', 'skill-stasis', 'skill-reflect'];
export const EXTRA_SOUND_IDS = ['heal', 'ice', 'bossIncoming', 'lowHealth', 'charge', 'tail'];
export const ALL_SOUND_IDS = [...SFX_IDS, ...SKILL_SOUND_IDS, ...EXTRA_SOUND_IDS];
export const VARIANTS = 4;
export function soundDuration(id) { return { 'skill-swing': .57, 'skill-hammer': .9, 'skill-drone': .73, 'skill-flash': .51, 'skill-void': 1.38, 'skill-bombard': 1.4, 'skill-stasis': .36, 'skill-reflect': .67, counter: 1.8, dash: .28, prepare: .12, blast: .075, wave: .55, spark: .062, gravity: .078, ice: .068, heal: .52, bossIncoming: .94, lowHealth: .22, charge: .82, tail: .35, level: 1.1, evolve: 1.8, chest: 1.9, boss: 1.7, clear: 2.1, down: 1.4, start: 1, resonance: .6, warning: .4, hurt: .34, air: .09, pickup: .14, crystal: .18, kill: .115, nova: .32, mine: .28, missile: .23, pulse: .052 }[id] ?? .14; }

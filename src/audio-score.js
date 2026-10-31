export const TRACKS = ['nebula', 'open', 'globular', 'milkyway', 'galaxies', 'expansion', 'boss', 'title', 'launch', 'atmosphere', 'refuge'].map(id => ({ id }));
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
export const ALL_SOUND_IDS = [...SFX_IDS, ...SKILL_SOUND_IDS];
export const VARIANTS = 4;
export function soundDuration(id) { return { 'skill-swing': .35, 'skill-hammer': .45, 'skill-drone': .65, 'skill-flash': .32, 'skill-void': .9, 'skill-bombard': .7, 'skill-stasis': .6, 'skill-reflect': .6, dash: .28, prepare: .12, blast: .48, wave: .55, spark: .16, gravity: .65, field: .24, level: 1.1, evolve: 1.8, chest: 1.9, boss: 1.7, clear: 2.1, down: 1.4, start: 1, resonance: .6, warning: .4, hurt: .25, air: .09, pickup: .19, crystal: .32, kill: .18, nova: .32, mine: .28, missile: .23 }[id] ?? .14; }

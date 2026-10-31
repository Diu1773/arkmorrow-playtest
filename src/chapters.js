export const CHAPTERS = [
    { id: 'launch', ko: '로켓 발사 기지', en: 'Launch Base', kind: 'ground', sector: 0, recommended: 800, hp: 0.8, damage: 0.5, bossHp: 0.42, tempo: .85, density: 1, regen: .3 },
    { id: 'atmosphere', ko: '대기권', en: 'Atmosphere', kind: 'flight', sector: 0, recommended: 1325, hp: 1.3, damage: 1.9, bossHp: 0.75, tempo: 1, density: 1 },
    { id: 'nebula', ko: '성운', en: 'Nebula', kind: 'flight', sector: 0, recommended: 1800, hp: 1.6, damage: 3.5, bossHp: 0.9, tempo: 1, density: 1 },
    { id: 'open-cluster', ko: '산개성단', en: 'Open Cluster', kind: 'flight', sector: 1, recommended: 2500, hp: 1.6, damage: 3.4, bossHp: 1, tempo: 1.08, density: 1.12 },
    { id: 'globular', ko: '구상성단', en: 'Globular Cluster', kind: 'flight', sector: 2, recommended: 3500, hp: 1.8, damage: 2, bossHp: 1, tempo: 1.16, density: 1.24 },
    { id: 'galaxy', ko: '우리은하', en: 'Milky Way', kind: 'flight', sector: 3, recommended: 4800, hp: 2, damage: 3.8, bossHp: 1.1, tempo: 1.24, density: 1.36 },
    { id: 'outer', ko: '외부 은하', en: 'Outer Galaxies', kind: 'flight', sector: 4, recommended: 6500, hp: 1.8, damage: 6.5, bossHp: 1, tempo: 1.32, density: 1.48 },
    { id: 'expansion', ko: '우주 팽창', en: 'Expansion', kind: 'flight', sector: 5, recommended: 9000, hp: 2, damage: 8, bossHp: 1, tempo: 1.4, density: 1.6 },
];
export const SPECIAL_THEMES = [{ id: 'village', ko: '시골 마을', en: 'Country Village', kind: 'ground', sector: 0, recommended: 2100, hp: 1.6, damage: 2.1, bossHp: 0.85, tempo: 1.08, density: 1.12, unlock: 1 }];
export const chapterDef = (key) => key === 'village' ? SPECIAL_THEMES[0] : CHAPTERS[Math.max(0, Math.min(7, key))];
export const crewUnlocked = (id, cleared) => id === 'pip' || id === 'bolt' && cleared.includes(0) || id === 'mori' && cleared.includes(1) || id === 'mew' && cleared.includes(2);
export const LOCAL_ENEMIES = { launch: ['slime', 'invader', 'guard', 'pod'], atmosphere: ['jelly', 'sparkling', 'jet', 'weatherBomb'], village: ['fieldSlime', 'worm', 'scarecrow', 'gnat'] };
export const LOCAL_PATTERNS = { launch: ['fan', 'laser', 'charge', 'wall'], atmosphere: ['ring', 'barSweep', 'balloon', 'closing'], village: ['charge', 'squad', 'ring', 'fan'] };
export const LOCAL_BOSSES = { launch: 'COMMAND TANK', atmosphere: 'STORM EYE', village: 'CRATER BEAST' };
export const LOCAL_CAPTAINS = { launch: ['POD MARSHAL', 'FUEL ROVER'], atmosphere: ['THUNDER RAY', 'BALLOON KING'], village: ['HAY COLOSSUS', 'BURROW MAW'] };
export const localBossName = (chapter, art, final) => final ? LOCAL_BOSSES[chapter] : LOCAL_CAPTAINS[chapter]?.[Math.abs(art - 6) % 2];
export const CHAPTER_RHYTHMS = {
    launch: { swarms: [{ at: 95, duration: 18, count: 64 }, { at: 238, duration: 22, count: 94 }, { at: 369, duration: 20, count: 115 }], density: [[0, .7], [45, .9], [90, 1.1], [130, .65], [180, 1], [235, 1.2], [280, .75], [340, 1.1], [405, .8]], events: [{ kind: 'supply', at: 55, duration: 12, every: 6 }, { kind: 'surge', at: 200, duration: 24, every: 4 }, { kind: 'supply', at: 345, duration: 14, every: 7 }] },
    atmosphere: { swarms: [{ at: 78, duration: 20, count: 68 }, { at: 219, duration: 28, count: 95 }, { at: 355, duration: 26, count: 120 }], density: [[0, .8], [60, 1.15], [112, .7], [180, .9], [218, 1.25], [270, .7], [330, 1.15], [395, .75]], events: [{ kind: 'lightning', at: 38, duration: 28, every: 3 }, { kind: 'lightning', at: 188, duration: 32, every: 2 }, { kind: 'lightning', at: 370, duration: 36, every: 2 }] },
    nebula: { swarms: [{ at: 110, duration: 24, count: 72 }, { at: 254, duration: 18, count: 92 }, { at: 390, duration: 20, count: 124 }], density: [[0, .65], [75, 1], [108, 1.2], [140, .7], [205, .85], [250, 1.2], [285, .75], [350, .95], [388, 1.25]], events: [{ kind: 'surge', at: 63, duration: 22, every: 5 }, { kind: 'meteor', at: 206, duration: 24, every: 4 }, { kind: 'surge', at: 352, duration: 24, every: 3 }] },
    'open-cluster': { swarms: [{ at: 65, duration: 17, count: 68 }, { at: 205, duration: 25, count: 94 }, { at: 364, duration: 25, count: 118 }], density: [[0, .9], [60, 1.2], [105, .75], [180, 1.15], [250, .8], [330, 1], [362, 1.2], [405, .8]], events: [{ kind: 'meteor', at: 96, duration: 26, every: 4 }, { kind: 'supply', at: 245, duration: 18, every: 9 }, { kind: 'meteor', at: 390, duration: 22, every: 3 }] },
    globular: { swarms: [{ at: 125, duration: 16, count: 76 }, { at: 232, duration: 30, count: 102 }, { at: 380, duration: 25, count: 126 }], density: [[0, .7], [90, 1.05], [122, 1.2], [175, .8], [230, 1.2], [280, .7], [345, 1.05], [378, 1.25]], events: [{ kind: 'surge', at: 55, duration: 32, every: 4 }, { kind: 'meteor', at: 190, duration: 22, every: 3 }, { kind: 'surge', at: 335, duration: 28, every: 3 }] },
    galaxy: { swarms: [{ at: 88, duration: 27, count: 74 }, { at: 266, duration: 18, count: 100 }, { at: 350, duration: 32, count: 122 }], density: [[0, .85], [85, 1.15], [125, .7], [190, 1], [263, 1.2], [315, .75], [348, 1.2], [400, .8]], events: [{ kind: 'meteor', at: 52, duration: 28, every: 4 }, { kind: 'surge', at: 210, duration: 24, every: 3 }, { kind: 'meteor', at: 387, duration: 24, every: 3 }] },
    outer: { swarms: [{ at: 100, duration: 20, count: 78 }, { at: 215, duration: 23, count: 106 }, { at: 396, duration: 17, count: 128 }], density: [[0, .75], [97, 1.2], [133, .8], [212, 1.15], [265, .7], [335, 1], [393, 1.25]], events: [{ kind: 'meteor', at: 45, duration: 25, every: 3 }, { kind: 'meteor', at: 248, duration: 24, every: 2 }, { kind: 'supply', at: 345, duration: 18, every: 9 }] },
    expansion: { swarms: [{ at: 70, duration: 24, count: 80 }, { at: 246, duration: 24, count: 108 }, { at: 372, duration: 30, count: 130 }], density: [[0, .85], [68, 1.15], [120, .7], [180, .9], [243, 1.2], [280, .8], [335, 1.05], [370, 1.25], [410, .85]], events: [{ kind: 'surge', at: 103, duration: 26, every: 3 }, { kind: 'meteor', at: 198, duration: 24, every: 3 }, { kind: 'meteor', at: 338, duration: 28, every: 2 }] },
    village: { swarms: [{ at: 105, duration: 22, count: 70 }, { at: 225, duration: 24, count: 98 }, { at: 360, duration: 20, count: 118 }], density: [[0, .7], [70, .95], [102, 1.1], [138, .7], [180, .9], [222, 1.2], [270, .75], [340, 1], [358, 1.2], [398, .8]], events: [{ kind: 'supply', at: 62, duration: 18, every: 9 }, { kind: 'surge', at: 185, duration: 24, every: 4 }, { kind: 'meteor', at: 390, duration: 20, every: 4 }] },
};
export const chapterRhythm = (id) => CHAPTER_RHYTHMS[id] ?? CHAPTER_RHYTHMS.launch;
export function chapterDensity(id, time) { const knots = chapterRhythm(id).density; let value = knots[0][1]; for (let i = 1; i < knots.length; i++) {
    const [at, next] = knots[i];
    if (time < at) {
        const [previous, start] = knots[i - 1];
        return start + (next - start) * Math.max(0, (time - previous) / (at - previous));
    }
    value = next;
} return value; }

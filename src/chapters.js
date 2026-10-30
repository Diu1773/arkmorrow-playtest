export const CHAPTERS = [
    { id: 'launch', ko: '로켓 발사 기지', en: 'Launch Base', kind: 'ground', sector: 0, recommended: 800, hp: .8, damage: .65, bossHp: .42, tempo: .85, density: 1 },
    { id: 'atmosphere', ko: '대기권', en: 'Atmosphere', kind: 'flight', sector: 0, recommended: 1325, hp: 1.3, damage: 4.5, bossHp: .75, tempo: 1, density: 1 },
    { id: 'nebula', ko: '성운', en: 'Nebula', kind: 'flight', sector: 0, recommended: 1800, hp: 1.6, damage: 5.5, bossHp: 1.7, tempo: 1, density: 1 },
    { id: 'open-cluster', ko: '산개성단', en: 'Open Cluster', kind: 'flight', sector: 1, recommended: 2500, hp: 2.3, damage: 3.8, bossHp: 2.6, tempo: 1.08, density: 1.12 },
    { id: 'globular', ko: '구상성단', en: 'Globular Cluster', kind: 'flight', sector: 2, recommended: 3500, hp: 3, damage: 3.2, bossHp: 2.6, tempo: 1.16, density: 1.24 },
    { id: 'galaxy', ko: '우리은하', en: 'Milky Way', kind: 'flight', sector: 3, recommended: 4800, hp: 4, damage: 3.3, bossHp: 3, tempo: 1.24, density: 1.36 },
    { id: 'outer', ko: '외부 은하', en: 'Outer Galaxies', kind: 'flight', sector: 4, recommended: 6500, hp: 4.5, damage: 11, bossHp: 3.5, tempo: 1.32, density: 1.48 },
    { id: 'expansion', ko: '우주 팽창', en: 'Expansion', kind: 'flight', sector: 5, recommended: 9000, hp: 5, damage: 10, bossHp: 4, tempo: 1.4, density: 1.6 },
];
export const SPECIAL_THEMES = [{ id: 'village', ko: '시골 마을', en: 'Country Village', kind: 'ground', sector: 0, recommended: 2100, hp: 2, damage: 5.2, bossHp: 1.8, tempo: 1.08, density: 1.12, unlock: 1 }];
export const chapterDef = (key) => key === 'village' ? SPECIAL_THEMES[0] : CHAPTERS[Math.max(0, Math.min(7, key))];
export const crewUnlocked = (id, cleared) => id === 'pip' || id === 'bolt' && cleared.includes(0) || id === 'mori' && cleared.includes(1) || id === 'mew' && cleared.includes(2);
export const LOCAL_ENEMIES = { launch: ['slime', 'invader', 'guard', 'pod'], atmosphere: ['jelly', 'sparkling', 'jet', 'weatherBomb'], village: ['fieldSlime', 'worm', 'scarecrow', 'gnat'] };
export const LOCAL_PATTERNS = { launch: ['fan', 'laser', 'charge', 'wall'], atmosphere: ['ring', 'barSweep', 'balloon', 'closing'], village: ['charge', 'squad', 'ring', 'fan'] };
export const LOCAL_BOSSES = { launch: 'COMMAND TANK', atmosphere: 'STORM EYE', village: 'CRATER BEAST' };
export const LOCAL_CAPTAINS = { launch: ['POD MARSHAL', 'FUEL ROVER'], atmosphere: ['THUNDER RAY', 'BALLOON KING'], village: ['HAY COLOSSUS', 'BURROW MAW'] };
export const localBossName = (chapter, art, final) => final ? LOCAL_BOSSES[chapter] : LOCAL_CAPTAINS[chapter]?.[Math.abs(art - 6) % 2];

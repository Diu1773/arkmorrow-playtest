export const ELEMENTS = { physical: { color: '#e8f1e9', symbol: '◆' }, fire: { color: '#f0a33a', symbol: '♨' }, ice: { color: '#79d8f2', symbol: '❄' }, electric: { color: '#f6d454', symbol: 'ϟ' }, gravity: { color: '#bd82ee', symbol: '◉' } };
export const WEAPONS = [
    { id: 'pulse', aim: 'closest', passive: 'regen', damage: 25, cooldown: .55, radius: 500, color: '#a9d8df' },
    { id: 'orbit', aim: 'none', passive: 'speed', damage: 20, cooldown: .42, radius: 100, color: '#b3c7ff' },
    { id: 'missile', aim: 'closest', passive: 'area', damage: 45, cooldown: 1.8, radius: 90, color: '#ffc18b' },
    { id: 'chain', aim: 'closest', passive: 'armor', damage: 29, cooldown: 1.4, radius: 230, color: '#d8b5ff' },
    { id: 'laser', aim: 'closest', passive: 'haste', damage: 48, cooldown: 1.5, radius: 620, color: '#e8f7ff' },
    { id: 'mine', aim: 'movement', passive: 'magnet', damage: 65, cooldown: 1.65, radius: 125, color: '#ffb5a7' },
    { id: 'fan', aim: 'movement', passive: 'power', damage: 17, cooldown: .95, radius: 440, color: '#ffe4a0' },
    { id: 'nova', aim: 'none', passive: 'hull', damage: 40, cooldown: 2, radius: 155, color: '#e8f1e9' },
    { id: 'bomb', aim: 'closest', passive: 'crit', damage: 76, cooldown: 2.1, radius: 135, color: '#f0a33a', element: 'fire' },
    { id: 'ripple', aim: 'movement', passive: 'knockback', damage: 38, cooldown: 1.65, radius: 270, color: '#e8f1e9', element: 'physical' },
    { id: 'quake', aim: 'none', passive: 'duration', damage: 24, cooldown: 3.5, radius: 135, color: '#e8f1e9', element: 'physical' },
    { id: 'blackhole', aim: 'none', passive: 'gravity', damage: 14, cooldown: 4.8, radius: 210, color: '#bd82ee', element: 'gravity' },
    { id: 'flame', aim: 'movement', passive: 'fire', damage: 18, cooldown: 1.9, radius: 100, color: '#f0a33a', element: 'fire' },
    { id: 'acid', aim: 'movement', passive: 'volatile', damage: 16, cooldown: 2.6, radius: 135, color: '#e8f1e9', element: 'physical' },
    { id: 'frost', aim: 'none', passive: 'ice', damage: 24, cooldown: 2.5, radius: 150, color: '#79d8f2', element: 'ice' },
    { id: 'tether', aim: 'closest', passive: 'electric', damage: 28, cooldown: 2.8, radius: 340, color: '#f6d454', element: 'electric' },
    { id: 'mark', aim: 'closest', passive: 'luck', damage: 46, cooldown: 1.8, radius: 500, color: '#bd82ee', element: 'gravity' },
    { id: 'turret', aim: 'movement', passive: 'multi', damage: 18, cooldown: 4, radius: 480, color: '#e8f1e9', element: 'physical' },
    { id: 'blade', aim: 'movement', passive: 'pierce', damage: 48, cooldown: 1.5, radius: 420, color: '#79d8f2', element: 'ice' },
    { id: 'resonance', aim: 'none', passive: 'thorns', damage: 35, cooldown: 2.8, radius: 190, color: '#e8f1e9', element: 'physical' }
];
for (const w of WEAPONS) {
    w.element ??= w.id === 'missile' || w.id === 'mine' ? 'fire' : w.id === 'chain' ? 'electric' : 'physical';
    w.color = ELEMENTS[w.element].color;
}
export const PASSIVES = [
    { id: 'power', color: '#ffc66d' }, { id: 'haste', color: '#d8b5ff' }, { id: 'speed', color: '#a9d8df' },
    { id: 'hull', color: '#d0d6e0' }, { id: 'area', color: '#ffe4a0' }, { id: 'magnet', color: '#ffd260' },
    { id: 'regen', color: '#b6e390' }, { id: 'armor', color: '#b3c7ff' },
    { id: 'crit', color: '#e8f1e9' }, { id: 'pierce', color: '#e8f1e9' }, { id: 'multi', color: '#e8f1e9' },
    { id: 'duration', color: '#e8f1e9' }, { id: 'knockback', color: '#e8f1e9' }, { id: 'luck', color: '#f6c454' },
    { id: 'fire', color: '#f0a33a' }, { id: 'ice', color: '#79d8f2' }, { id: 'electric', color: '#f6d454' },
    { id: 'gravity', color: '#bd82ee' }, { id: 'thorns', color: '#e8f1e9' }, { id: 'volatile', color: '#f0a33a' }
];
export const SHIPS = [
    { id: 'aster', hp: 120, speed: 205, weapon: 'pulse', color: '#83ebe8', cost: 0 },
    { id: 'vega', hp: 105, speed: 220, weapon: 'pulse', color: '#b0b1ff', cost: 100 },
    { id: 'lynx', hp: 100, speed: 200, weapon: 'pulse', color: '#f3ca8b', cost: 180 },
    { id: 'atlas', hp: 155, speed: 180, weapon: 'orbit', color: '#b0e7ad', cost: 240 }
];
export const META = [
    { id: 'output', icon: 'power', cost: 25 }, { id: 'hull', icon: 'hull', cost: 20 },
    { id: 'thrust', icon: 'speed', cost: 20 }, { id: 'magnet', icon: 'magnet', cost: 15 },
    { id: 'repair', icon: 'regen', cost: 30 }, { id: 'forecast', icon: 'haste', cost: 25 },
    { id: 'learning', icon: 'area', cost: 25 }, { id: 'guard', icon: 'armor', cost: 25 }
];
export const SECTORS = [
    { id: 'nebula', image: 'orion.jpg', patterns: ['prism', 'blackout', 'laser'], types: ['rusher', 'dustling', 'shooter', 'splitter'] },
    { id: 'open', image: 'pleiades.jpg', patterns: ['squad', 'wall', 'prism'], types: ['wingLeader', 'wing', 'rusher', 'shooter'] },
    { id: 'globular', image: 'm13.jpg', patterns: ['closing', 'ring', 'fan'], types: ['orbiter', 'shield', 'swarm', 'shooter'] },
    { id: 'milky', image: 'milkyway.jpg', patterns: ['barSweep', 'laser', 'wall'], types: ['patrol', 'spinner', 'rusher', 'shield'] },
    { id: 'external', image: 'andromeda.jpg', patterns: ['mirror', 'clone', 'fan'], types: ['ellip', 'spinner', 'erratic', 'shooter'] },
    { id: 'expansion', image: 'deepfield.jpg', patterns: ['balloon', 'closing', 'laser'], types: ['galaxyDot', 'erratic', 'shield', 'shooter'] }
];
export const ENEMIES = {
    slime: { hp: 22, speed: 62, damage: 8, xp: 6, r: 18 }, invader: { hp: 32, speed: 70, damage: 9, xp: 8, r: 20 }, guard: { hp: 75, speed: 42, damage: 12, xp: 14, r: 28 }, pod: { hp: 50, speed: 36, damage: 10, xp: 13, r: 25 },
    jelly: { hp: 28, speed: 63, damage: 10, xp: 8, r: 21 }, sparkling: { hp: 30, speed: 86, damage: 12, xp: 9, r: 17 }, jet: { hp: 40, speed: 94, damage: 12, xp: 11, r: 24 }, weatherBomb: { hp: 30, speed: 52, damage: 14, xp: 10, r: 23 },
    fieldSlime: { hp: 30, speed: 68, damage: 10, xp: 8, r: 20 }, worm: { hp: 38, speed: 56, damage: 11, xp: 10, r: 18 }, scarecrow: { hp: 65, speed: 34, damage: 12, xp: 16, r: 30 }, gnat: { hp: 14, speed: 110, damage: 7, xp: 5, r: 12 },
    rusher: { hp: 22, speed: 76, damage: 9, xp: 6, r: 18 }, shooter: { hp: 36, speed: 52, damage: 9, xp: 8, r: 21 },
    splitter: { hp: 48, speed: 65, damage: 10, xp: 11, r: 25 }, mini: { hp: 10, speed: 106, damage: 5, xp: 2, r: 12 },
    shield: { hp: 90, speed: 48, damage: 13, xp: 14, r: 27 }, swarm: { hp: 12, speed: 98, damage: 6, xp: 2, r: 12 },
    dustling: { hp: 35, speed: 46, damage: 10, xp: 10, r: 24 }, wingLeader: { hp: 55, speed: 74, damage: 10, xp: 15, r: 22 },
    wing: { hp: 16, speed: 88, damage: 7, xp: 4, r: 14 }, orbiter: { hp: 43, speed: 90, damage: 9, xp: 10, r: 20 },
    patrol: { hp: 52, speed: 105, damage: 10, xp: 12, r: 22 }, ellip: { hp: 110, speed: 40, damage: 14, xp: 16, r: 30 },
    spinner: { hp: 34, speed: 98, damage: 11, xp: 9, r: 20 }, erratic: { hp: 38, speed: 75, damage: 9, xp: 10, r: 20 },
    galaxyDot: { hp: 20, speed: 60, damage: 8, xp: 5, r: 15 }, decoy: { hp: 200, speed: 55, damage: 10, xp: 16, r: 40 },
    boss: { hp: 4800, speed: 36, damage: 18, xp: 150, r: 61 },
    dodger: { hp: 29, speed: 78, damage: 8, xp: 8, r: 18 }, charger: { hp: 46, speed: 58, damage: 12, xp: 10, r: 22 },
    bomber: { hp: 34, speed: 68, damage: 14, xp: 9, r: 20 }, blinker: { hp: 40, speed: 48, damage: 9, xp: 10, r: 20 },
    sniper: { hp: 31, speed: 35, damage: 12, xp: 9, r: 20 }, healer: { hp: 55, speed: 42, damage: 7, xp: 13, r: 23 },
    burrower: { hp: 38, speed: 56, damage: 11, xp: 10, r: 20 }, summoner: { hp: 68, speed: 32, damage: 8, xp: 16, r: 25 }
};
export const BEHAVIORS = { dodge: { tell: .3, cooldown: 2.8 }, charge: { tell: .5, cooldown: 3.2 }, suicide: { tell: .5, cooldown: 4 }, teleport: { tell: .45, cooldown: 4.8 }, snipe: { tell: .5, cooldown: 4 }, shield: { tell: .5, cooldown: 2.5 }, heal: { tell: .45, cooldown: 4.5 }, split: { tell: .5, cooldown: 3 }, flock: { tell: .5, cooldown: 3 }, burrow: { tell: .5, cooldown: 4.5 }, summon: { tell: .5, cooldown: 6 }, orbit: { tell: .5, cooldown: 3 } };
export const ENEMY_BEHAVIOR = { slime: 'split', invader: 'dodge', guard: 'shield', pod: 'summon', jelly: 'orbit', sparkling: 'teleport', jet: 'charge', weatherBomb: 'suicide', fieldSlime: 'split', worm: 'burrow', scarecrow: 'summon', gnat: 'dodge', dodger: 'dodge', charger: 'charge', bomber: 'suicide', blinker: 'teleport', sniper: 'snipe', shield: 'shield', healer: 'heal', splitter: 'split', wingLeader: 'flock', wing: 'flock', burrower: 'burrow', summoner: 'summon', orbiter: 'orbit' };
export const CHAPTER_ENEMIES = [['dodger', 'charger', 'bomber', 'healer'], ['charger', 'sniper', 'blinker', 'summoner'], ['burrower', 'healer', 'bomber', 'dodger'], ['sniper', 'charger', 'summoner', 'burrower'], ['blinker', 'dodger', 'healer', 'summoner'], ['burrower', 'blinker', 'sniper', 'bomber']];
export const ELITES = ['swift', 'armored', 'mending', 'volatile', 'echo'];
export const MODES = {
    easy: { hp: .75, damage: .55, speed: .85, spawn: .8, tell: 1.4, iframes: 1 },
    normal: { hp: 1, damage: .8, speed: 1, spawn: 1, tell: 1.15, iframes: .85 },
    hard: { hp: 1.3, damage: 1.2, speed: 1.1, spawn: 1.3, tell: 1, iframes: .65 }
};
export const WAVES = [1.3, 1.9, 2.7, 3.8, 5, 6, 7.2, 8.4, 9.4, 3.5];
export const CAPTAINS = [['fan', 'ring', 'laser', 'charge'], ['squad', 'wall', 'fan'], ['laser', 'barSweep', 'ring'], ['closing', 'wall', 'balloon']];
export const BOSS_ENCOUNTERS = [
    { at: 90, role: 'captain', art: 6, hp: 2600, stages: 2 },
    { at: 210, role: 'captain', art: 7, hp: 6500, stages: 2 },
    { at: 300, role: 'middle', art: 8, hp: 27500, stages: 3 },
    { at: 420, role: 'captain', art: 9, hp: 22500, stages: 2 },
    { at: 540, role: 'final', art: -1, hp: 145000, stages: 3 }
];
export const SWARM_EVENTS = [{ at: 155, duration: 14, count: 72 }, { at: 365, duration: 18, count: 120 }];
export const WORLD = { w: 4800, h: 3200 };
export const ENEMY_XP = { lateAt: 540, late: 3, recoverAt: 120, recoverGap: 32, recoverAge: 8 };

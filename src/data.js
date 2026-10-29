export const WEAPONS = [
    { id: 'pulse', passive: 'regen', damage: 25, cooldown: .55, radius: 500, color: '#a9d8df' },
    { id: 'orbit', passive: 'speed', damage: 20, cooldown: .42, radius: 100, color: '#b3c7ff' },
    { id: 'missile', passive: 'area', damage: 45, cooldown: 1.8, radius: 90, color: '#ffc18b' },
    { id: 'chain', passive: 'armor', damage: 29, cooldown: 1.4, radius: 230, color: '#d8b5ff' },
    { id: 'laser', passive: 'haste', damage: 48, cooldown: 1.5, radius: 620, color: '#e8f7ff' },
    { id: 'mine', passive: 'magnet', damage: 65, cooldown: 1.65, radius: 125, color: '#ffb5a7' },
    { id: 'fan', passive: 'power', damage: 17, cooldown: .95, radius: 440, color: '#ffe4a0' },
    { id: 'nova', passive: 'hull', damage: 40, cooldown: 2, radius: 155, color: '#a9c9ff' }
];
export const PASSIVES = [
    { id: 'power', color: '#ffc66d' }, { id: 'haste', color: '#d8b5ff' }, { id: 'speed', color: '#a9d8df' },
    { id: 'hull', color: '#d0d6e0' }, { id: 'area', color: '#ffe4a0' }, { id: 'magnet', color: '#ffd260' },
    { id: 'regen', color: '#b6e390' }, { id: 'armor', color: '#b3c7ff' }
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
    rusher: { hp: 22, speed: 76, damage: 9, xp: 6, r: 18 }, shooter: { hp: 36, speed: 52, damage: 9, xp: 8, r: 21 },
    splitter: { hp: 48, speed: 65, damage: 10, xp: 11, r: 25 }, mini: { hp: 10, speed: 106, damage: 5, xp: 2, r: 12 },
    shield: { hp: 90, speed: 48, damage: 13, xp: 14, r: 27 }, swarm: { hp: 12, speed: 98, damage: 6, xp: 2, r: 12 },
    dustling: { hp: 35, speed: 46, damage: 10, xp: 10, r: 24 }, wingLeader: { hp: 55, speed: 74, damage: 10, xp: 15, r: 22 },
    wing: { hp: 16, speed: 88, damage: 7, xp: 4, r: 14 }, orbiter: { hp: 43, speed: 90, damage: 9, xp: 10, r: 20 },
    patrol: { hp: 52, speed: 105, damage: 10, xp: 12, r: 22 }, ellip: { hp: 110, speed: 40, damage: 14, xp: 16, r: 30 },
    spinner: { hp: 34, speed: 98, damage: 11, xp: 9, r: 20 }, erratic: { hp: 38, speed: 75, damage: 9, xp: 10, r: 20 },
    galaxyDot: { hp: 20, speed: 60, damage: 8, xp: 5, r: 15 }, decoy: { hp: 200, speed: 55, damage: 10, xp: 16, r: 40 },
    boss: { hp: 4800, speed: 36, damage: 18, xp: 150, r: 61 }
};
export const MODES = {
    easy: { hp: .75, damage: .55, speed: .85, spawn: .8, tell: 1.4, iframes: 1 },
    normal: { hp: 1, damage: .8, speed: 1, spawn: 1, tell: 1.15, iframes: .85 },
    hard: { hp: 1.3, damage: 1.2, speed: 1.1, spawn: 1.3, tell: 1, iframes: .65 }
};
export const WAVES = [1.3, 1.9, 2.7, 3.8, 5, 6, 7.2, 8.4, 9.4, 3.5];
export const CAPTAINS = [['fan', 'ring', 'laser'], ['squad', 'wall', 'fan'], ['laser', 'barSweep', 'ring'], ['closing', 'wall', 'balloon']];
export const BOSS_ENCOUNTERS = [
    { at: 90, role: 'captain', art: 6, hp: 2200, stages: 2 },
    { at: 210, role: 'captain', art: 7, hp: 3500, stages: 2 },
    { at: 300, role: 'middle', art: 8, hp: 10000, stages: 3 },
    { at: 420, role: 'captain', art: 9, hp: 7000, stages: 2 },
    { at: 540, role: 'final', art: -1, hp: 58000, stages: 3 }
];
export const SWARM_EVENTS = [{ at: 155, duration: 14, count: 72 }, { at: 365, duration: 18, count: 120 }];
export const WORLD = { w: 4800, h: 3200 };

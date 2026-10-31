const iron = ['#34354b', '#657182', '#a68d68', '#e1d8b5'];
const cloud = ['#303447', '#526a87', '#8ca5c7', '#d4dde5'];
const earth = ['#3c3045', '#79534e', '#b19c77', '#e4b56c'];
const violet = ['#30273e', '#654d85', '#aa79bc', '#e2bbd2'];
const gold = ['#34334b', '#896448', '#d6a553', '#ffe1a3'];
const coral = ['#372e4c', '#8b4f6c', '#d57b86', '#ffceae'];
const blue = ['#292b48', '#495f9b', '#859ad6', '#d3d8f2'];
export const BOSS_DESIGNS = [
    { id: 'launch', size: 96, shape: 0, colors: iron, moves: ['fan', 'rebound', 'charge', 'mines', 'summon', 'sweep'], hp: [17500, 61000, 187500] },
    { id: 'atmosphere', size: 112, shape: 1, colors: cloud, moves: ['pulse', 'rain', 'sweep', 'spiral', 'corridor', 'rebound'], hp: [13250, 35000, 104000] },
    { id: 'village', size: 96, shape: 2, colors: earth, moves: ['charge', 'mines', 'fan', 'summon', 'pulse', 'corridor'], hp: [44000, 110000, 345000] },
    { id: 'nebula', size: 96, shape: 3, colors: violet, moves: ['fan', 'spiral', 'mines', 'rebound', 'sweep', 'corridor'], hp: [33300, 119700, 246000] },
    { id: 'open-cluster', size: 96, shape: 4, colors: gold, moves: ['summon', 'fan', 'rebound', 'rain', 'charge', 'corridor'], hp: [22000, 67500, 266000] },
    { id: 'globular', size: 112, shape: 5, colors: coral, moves: ['pulse', 'spiral', 'mines', 'fan', 'corridor', 'rebound'], hp: [34000, 140000, 380000] },
    { id: 'galaxy', size: 128, shape: 6, colors: blue, moves: ['sweep', 'fan', 'charge', 'rain', 'rebound', 'corridor'], hp: [48000, 144000, 475000] },
    { id: 'outer', size: 112, shape: 7, colors: violet, moves: ['rebound', 'rain', 'fan', 'spiral', 'summon', 'sweep'], hp: [91000, 219000, 713000] },
    { id: 'expansion', size: 128, shape: 8, colors: coral, moves: ['corridor', 'pulse', 'rain', 'sweep', 'spiral', 'rebound'], hp: [103500, 204000, 700000] },
];
export function bossDesign(id) { return BOSS_DESIGNS.find(b => b.id === id) ?? BOSS_DESIGNS[3]; }
export const DUEL_ENCOUNTERS = [
    { at: 150, role: 'middle', art: 6, stages: 2, hp: 5200 },
    { at: 300, role: 'middle', art: 7, stages: 2, hp: 15000 },
    { at: 432, role: 'final', art: -1, stages: 3, hp: 54000 },
];
export const middleMoves = (d, second) => second ? [d.moves[1], d.moves[3], d.moves[0], d.moves[4]] : [d.moves[0], d.moves[2], d.moves[1], d.moves[3]];

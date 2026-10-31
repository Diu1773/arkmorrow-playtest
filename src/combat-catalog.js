export const AUTO_LIMIT = 3, SKILL_LIMIT = 6, INITIAL_SKILL_SLOTS = 2, PASSIVE_LIMIT = 4, WEAPON_LEVEL = 5;
export const GROWTH_LIMIT = 40;
export const DASH = { duration: .22, cooldown: 4.5, speed: 650 };
export const SKILLS = [
    { id: 'swing', category: 'movement', element: 'physical', shape: 'trail', name: 'SWING-BY', ko: '전방으로 돌진하며 경로를 벤다.', en: 'Rush forward and cut through the path.', evolution: 'COMET TRAIL', cooldown: 8, cast: 0, duration: 0, damage: 280, radius: 45, weapon: 'blade', color: '#79d8f2' },
    { id: 'hammer', category: 'attack', element: 'physical', shape: 'explosion', name: 'GRAVITY HAMMER', ko: '앞을 내려쳐 밀어내고 기절시킨다.', en: 'Slam ahead, knock back and stun.', evolution: 'FAULT LINE', cooldown: 10, cast: .3, duration: 0, damage: 380, radius: 165, weapon: 'quake', color: '#e8f1e9' },
    { id: 'drone', category: 'summon', element: 'physical', shape: 'summon', name: 'SAMPLE DRONE', ko: '5초간 표본을 모으고 주변을 사격한다.', en: 'Collect samples and fire nearby for five seconds.', evolution: 'FIELD MEDIC', cooldown: 16, cast: 0, duration: 5, damage: 36, radius: 380, weapon: 'turret', color: '#87cf78' },
    { id: 'flash', category: 'movement', element: 'gravity', shape: 'trail', name: 'FLASH STEP', ko: '짧게 이동하며 주변 적을 실명시킨다.', en: 'Blink a short distance and blind nearby enemies.', evolution: 'AFTERIMAGE', cooldown: 7, cast: 0, duration: 0, damage: 160, radius: 60, weapon: 'mark', color: '#bd82ee' },
    { id: 'void', category: 'control', element: 'gravity', shape: 'field', name: 'BLACK HOLE', ko: '0.6초간 느려진 뒤 적을 모은다. 보스를 따라가며 보스·정예에 크게 터진다.', en: 'Slow for 0.6s and gather foes. Track bosses and detonate heavily against bosses and elites.', evolution: 'EVENT HORIZON', cooldown: 14, cast: .6, duration: 3.5, damage: 70, radius: 175, weapon: 'blackhole', color: '#bd82ee' },
    { id: 'bombard', category: 'attack', element: 'fire', shape: 'explosion', name: 'ORBITAL STRIKE', ko: '조준한 곳에 예고 후 연속 폭격한다.', en: 'Mark the aimed point, then bombard it.', evolution: 'STARFALL ARRAY', cooldown: 12, cast: .75, duration: 1.6, damage: 95, radius: 150, weapon: 'bomb', color: '#f0a33a' },
    { id: 'stasis', category: 'control', element: 'ice', shape: 'field', name: 'TIME FIELD', ko: '지정한 영역의 적을 멈추고 마지막에 깨뜨린다.', en: 'Stop enemies in a field and shatter it at the end.', evolution: 'FROZEN HOUR', cooldown: 15, cast: .25, duration: 3, damage: 28, radius: 195, weapon: 'frost', color: '#79d8f2' },
    { id: 'reflect', category: 'defense', element: 'electric', shape: 'ring', name: 'MIRROR SHIELD', ko: '3초간 탄을 반사하고 받은 충격을 방출한다.', en: 'Reflect projectiles for three seconds and release the stored impact.', evolution: 'PRISM GUARD', cooldown: 13, cast: 0, duration: 3, damage: 90, radius: 115, weapon: 'tether', color: '#f6d454' },
    { id: 'rail', name: 'ION LANCE', ko: '일직선의 적을 꿰뚫는다. 보스의 빈틈에 집중한다.', en: 'Pierce a narrow line during a boss opening.', evolution: 'POLAR LANCE', cooldown: 11, cast: 0.18, duration: 0, damage: 390, radius: 24, weapon: 'laser', color: '#79d8f2', category: 'attack', element: 'electric', shape: 'beam' },
    { id: 'comet', name: 'EMBER SEED', ko: '조준 지점에 작은 화염탄을 터뜨린다.', en: 'Burst a compact ember at the aimed point.', evolution: 'EMBER CLUSTER', cooldown: 10, cast: 0.25, duration: 0, damage: 290, radius: 100, weapon: 'missile', color: '#f0a33a', category: 'attack', element: 'fire', shape: 'projectile' },
    { id: 'flare', name: 'CORONA BURST', ko: '주변에 열 고리를 터뜨려 밀어낸다.', en: 'Release a heat ring and push nearby foes.', evolution: 'CORONA BLOOM', cooldown: 12, cast: 0, duration: 0, damage: 130, radius: 145, weapon: 'flame', color: '#e4b56c', category: 'attack', element: 'fire', shape: 'ring' },
    { id: 'vault', name: 'ICE VAULT', ko: '전방으로 도약하며 경로를 얼린다.', en: 'Vault ahead and freeze the path.', evolution: 'GLACIER WAKE', cooldown: 8, cast: 0, duration: 0, damage: 100, radius: 38, weapon: 'frost', color: '#8ca5c7', category: 'movement', element: 'ice', shape: 'trail' },
    { id: 'warp', name: 'FOLD STEP', ko: '조준 방향으로 짧게 접혀 이동하고 적을 밀어낸다.', en: 'Fold a short distance and repel nearby foes.', evolution: 'FOLD ECHO', cooldown: 9, cast: 0, duration: 0, damage: 110, radius: 70, weapon: 'blackhole', color: '#aa79bc', category: 'movement', element: 'gravity', shape: 'trail' },
    { id: 'barrier', name: 'HULL SCREEN', ko: '짧은 충격파와 3초간 소모되는 보호막.', en: 'Pulse outward and absorb damage for three seconds.', evolution: 'HULL BASTION', cooldown: 14, cast: 0, duration: 3, damage: 70, radius: 140, weapon: 'resonance', color: '#87cf78', category: 'defense', element: 'physical', shape: 'ring' },
    { id: 'aegis', name: 'PHASE SHELL', ko: '즉시 주변 탄을 지우고 잠깐 무적이 된다.', en: 'Clear nearby shots and gain brief invulnerability.', evolution: 'PHASE CITADEL', cooldown: 16, cast: 0, duration: 0, damage: 75, radius: 145, weapon: 'tether', color: '#d3d8f2', category: 'defense', element: 'electric', shape: 'ring' },
    { id: 'tether', name: 'ANCHOR WELL', ko: '조준 지점으로 적을 끌어당긴다. 보스는 잠깐 느려진다.', en: 'Gather foes at an anchor; briefly slow bosses.', evolution: 'ANCHOR ARRAY', cooldown: 13, cast: 0.2, duration: 2, damage: 9, radius: 145, weapon: 'blackhole', color: '#bd82ee', category: 'control', element: 'gravity', shape: 'field' },
    { id: 'shock', name: 'STATIC BREAK', ko: '전방의 적을 기절시키고 준비 중인 보스 패턴을 끊는다.', en: 'Stun foes ahead and interrupt a preparing boss.', evolution: 'STATIC RUPTURE', cooldown: 18, cast: 0.12, duration: 0, damage: 120, radius: 145, weapon: 'chain', color: '#f6d454', category: 'control', element: 'electric', shape: 'explosion' },
    { id: 'sentry', name: 'WATCH POST', ko: '그 자리에 4초간 사격하는 포탑을 세운다.', en: 'Deploy a stationary sentry for four seconds.', evolution: 'WATCH PAIR', cooldown: 15, cast: 0, duration: 4, damage: 32, radius: 440, weapon: 'turret', color: '#b19c77', category: 'summon', element: 'physical', shape: 'summon' },
    { id: 'overdrive', name: 'CORE SURGE', ko: '짧은 충격파 후 4초간 공격력이 오른다.', en: 'Pulse outward and increase attack power for four seconds.', evolution: 'CORE ASCENT', cooldown: 20, cast: 0, duration: 4, damage: 45, radius: 160, weapon: 'resonance', color: '#e4b56c', category: 'buff', element: 'physical', shape: 'ring' },
    { id: 'haste', name: 'TAILWIND', ko: '짧은 충격파 후 4초간 이동 속도가 오른다.', en: 'Pulse outward and increase movement speed for four seconds.', evolution: 'TAILWIND STREAM', cooldown: 17, cast: 0, duration: 4, damage: 25, radius: 140, weapon: 'ripple', color: '#79d8f2', category: 'buff', element: 'physical', shape: 'ring' },
];
export const CREW_SKILL = { pip: 'swing', bolt: 'hammer', mori: 'drone', mew: 'flash' };
export const skillDef = (id) => SKILLS.find(s => s.id === id);
export const skillSlot = (id) => ({ id, level: 1, evolved: false, timer: 0, cast: 0, angle: 0, x: 0, y: 0, automatic: false });
export function skillStats(slot, stats) {
    const def = skillDef(slot.id), level = Math.max(1, Math.min(5, slot.level));
    return { damage: def.damage * (1 + (slot.id === 'void' ? .22 : .3) * (level - 1)) * stats.damage * (slot.evolved ? 1.4 : 1) * (slot.automatic ? .7 : 1),
        cooldown: def.cooldown * stats.cooldown, radius: def.radius * (1 + .12 * (level - 1)) * stats.area,
        duration: (def.duration + (slot.id === 'void' ? .3 * (level - 1) : 0)) * stats.duration * (slot.evolved && slot.id === 'stasis' ? 1.35 : 1), count: 1 + Number(level >= 3) + Number(level >= 5) + stats.multi };
}
export function passiveApplies(id, weapon) {
    if (['speed', 'hull', 'magnet', 'regen', 'armor', 'luck', 'thorns'].includes(id))
        return false;
    if (id === 'area')
        return weapon !== 'blade';
    if (id === 'duration')
        return ['mine', 'flame', 'frost', 'turret', 'resonance'].includes(weapon);
    if (id === 'pierce')
        return ['pulse', 'fan', 'blade', 'turret'].includes(weapon);
    if (id === 'knockback')
        return true;
    if (['fire', 'ice', 'electric', 'gravity'].includes(id))
        return { fire: ['missile', 'mine', 'flame'], ice: ['frost', 'blade'], electric: ['chain'], gravity: [] }[id].includes(weapon);
    return true;
}
export const COMBAT_SOUND_SLOTS = ['bossIncoming', ...SKILLS.map(s => `skill-${s.id}`)];

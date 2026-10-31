export const AUTO_LIMIT = 3, SKILL_LIMIT = 2, PASSIVE_LIMIT = 4, WEAPON_LEVEL = 5;
export const GROWTH_LIMIT = 40;
export const DASH = { duration: .22, cooldown: 4.5, speed: 650 };
export const SKILLS = [
    { id: 'swing', name: 'SWING-BY', ko: '전방으로 돌진하며 경로를 벤다.', en: 'Rush forward and cut through the path.', evolution: 'COMET TRAIL', cooldown: 8, cast: 0, duration: 0, damage: 280, radius: 75, weapon: 'blade', color: '#79d8f2' },
    { id: 'hammer', name: 'GRAVITY HAMMER', ko: '앞을 내려쳐 밀어내고 기절시킨다.', en: 'Slam ahead, knock back and stun.', evolution: 'FAULT LINE', cooldown: 10, cast: .3, duration: 0, damage: 380, radius: 175, weapon: 'quake', color: '#e8f1e9' },
    { id: 'drone', name: 'SAMPLE DRONE', ko: '5초간 표본을 모으고 주변을 사격한다.', en: 'Collect samples and fire nearby for five seconds.', evolution: 'FIELD MEDIC', cooldown: 16, cast: 0, duration: 5, damage: 36, radius: 380, weapon: 'turret', color: '#87cf78' },
    { id: 'flash', name: 'FLASH STEP', ko: '짧게 이동하며 주변 적을 실명시킨다.', en: 'Blink a short distance and blind nearby enemies.', evolution: 'AFTERIMAGE', cooldown: 7, cast: 0, duration: 0, damage: 160, radius: 125, weapon: 'mark', color: '#bd82ee' },
    { id: 'void', name: 'BLACK HOLE', ko: '0.6초간 느려진 뒤 조준한 곳을 흡입. 보스에 붙어 터진다.', en: 'Slow for 0.6s, then pull at the aimed point. Attach to bosses and detonate.', evolution: 'EVENT HORIZON', cooldown: 14, cast: .6, duration: 3.5, damage: 70, radius: 175, weapon: 'blackhole', color: '#bd82ee' },
    { id: 'bombard', name: 'ORBITAL STRIKE', ko: '조준한 곳에 예고 후 연속 폭격한다.', en: 'Mark the aimed point, then bombard it.', evolution: 'STARFALL ARRAY', cooldown: 12, cast: .75, duration: 1.6, damage: 95, radius: 150, weapon: 'bomb', color: '#f0a33a' },
    { id: 'stasis', name: 'TIME FIELD', ko: '지정한 영역의 적을 멈추고 마지막에 깨뜨린다.', en: 'Stop enemies in a field and shatter it at the end.', evolution: 'FROZEN HOUR', cooldown: 15, cast: .25, duration: 3, damage: 28, radius: 195, weapon: 'frost', color: '#79d8f2' },
    { id: 'reflect', name: 'MIRROR SHIELD', ko: '3초간 탄을 반사하고 받은 충격을 방출한다.', en: 'Reflect projectiles for three seconds and release the stored impact.', evolution: 'PRISM GUARD', cooldown: 13, cast: 0, duration: 3, damage: 90, radius: 115, weapon: 'tether', color: '#f6d454' },
];
export const CREW_SKILL = { pip: 'swing', bolt: 'hammer', mori: 'drone', mew: 'flash' };
export const skillDef = (id) => SKILLS.find(s => s.id === id);
export const skillSlot = (id) => ({ id, level: 1, evolved: false, timer: 0, cast: 0, angle: 0, x: 0, y: 0, automatic: false });
export function skillStats(slot, stats) {
    const def = skillDef(slot.id), level = Math.max(1, Math.min(5, slot.level));
    return { damage: def.damage * (1 + (slot.id === 'void' ? 1.3 : .3) * (level - 1)) * stats.damage * (slot.evolved ? 1.4 : 1) * (slot.automatic ? .7 : 1),
        cooldown: def.cooldown * stats.cooldown, radius: def.radius * (1 + .12 * (level - 1)) * stats.area,
        duration: def.duration * stats.duration * (slot.evolved && slot.id === 'stasis' ? 1.35 : 1), count: (slot.id === 'void' ? level : 1 + Number(level >= 3) + Number(level >= 5)) + stats.multi };
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

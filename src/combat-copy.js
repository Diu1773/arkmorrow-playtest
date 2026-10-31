import { text, combatCopy as originalCombatCopy } from './i18n.js';
import { WEAPONS, weaponTextIndex } from './data.js';
export function combatText(lang) {
    const d = text(lang), indices = WEAPONS.map(w => weaponTextIndex(w.id));
    const evolved = lang === 'ko' ? ['피해 45% 증가 · 탄 2발 추가 · 관통 2', '피해 45% 증가 · 드론 추가 · 궤도 확장', '피해 45% 증가 · 유도탄 추가', '피해 45% 증가 · 연쇄 대상 2명 추가', '피해 45% 증가 · 광선 추가', '피해 45% 증가 · 지뢰 추가 · 2차 폭발', '피해 45% 증가 · 산탄 추가 · 관통 2', '피해 45% 증가 · 불길 추가', '피해 45% 증가 · 얼음 바닥 추가', '피해 45% 증가 · 포탑 추가', '피해 45% 증가 · 왕복 관통', '피해 45% 증가 · 더 긴 공명'] : ['45% more damage · two extra shots · pierce 2', '45% more damage · extra drone · wider orbit', '45% more damage · extra homing missile', '45% more damage · two extra chain targets', '45% more damage · extra beam', '45% more damage · extra mine · secondary blast', '45% more damage · extra shot · pierce 2', '45% more damage · extra fire trail', '45% more damage · extra frozen field', '45% more damage · extra turret', '45% more damage · returning pierce', '45% more damage · longer resonance'];
    const descriptions = indices.map(i => d.weaponDescriptions[i]);
    descriptions[1] = lang === 'ko' ? '대원 둘레를 도는 드론' : 'Drones orbit the crew member';
    return { ...d, weaponNames: indices.map(i => d.weaponNames[i]), weaponDescriptions: descriptions, evolutionNames: indices.map(i => d.evolutionNames[i]), evolutionDescriptions: evolved };
}
export const combatLabels = (lang) => lang === 'ko' ? {
    skills: '스킬', auto: '자동 시전', autoHint: '자동 시전 피해 70%. 스킬 키 또는 버튼으로 직접 쓰면 피해 100%.', dash: '대시', empty: '스킬 획득', evolve: '스킬 진화', ready: '준비', applies: '적용 무기', controls: '대시 Space / Shift · 스킬 Q E R F C V · 조작 탭에서 변경', condition: '무기 5레벨 + 짝 패시브 1레벨',
} : { skills: 'Skills', auto: 'Auto cast', autoHint: 'Auto cast deals 70% damage. Skill keys or buttons deal 100%.', dash: 'Dash', empty: 'Find a skill', evolve: 'Skill evolution', ready: 'Ready', applies: 'Affected weapons', controls: 'Dash Space / Shift · Skills Q E R F C V · Remap in Controls', condition: 'Weapon level 5 + partner level 1' };
export function combatCopy(lang) {
    const d = originalCombatCopy(lang), ko = lang === 'ko';
    return { ...d, chaos: [ko ? '자동 무기 +2레벨 (최대 5·전체 성장 한도 40), 최대 체력 −20%' : 'Automatic weapons +2 levels (cap 5, total growth budget 40); max HP −20%', ...d.chaos.slice(1)], fusionDescriptions: ko ? ['블랙홀 안에 유성 폭발 추가', '섬광 이동 자리에 전기 울타리 생성', '중력 해머가 얼음 균열을 남김', '반사 보호막이 끝난 자리에 산성 구름 생성'] : ['Meteor blasts inside the black hole', 'Flash Step leaves an electric fence', 'Gravity Hammer leaves frozen fractures', 'Mirror Shield leaves an acid cloud'] };
}

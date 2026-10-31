import { SKILL_SOUND_IDS } from './audio-score.js';
const bossTracks = ['boss', 'boss-assault', 'boss-dread'];
export const BOSS_TRACK_NAMES = ['보스 · 추격', '보스 · 강습', '보스 · 심연'];
export function bossTrack(sector, final, chapter, encounter = 0) {
    const index = ['launch', 'atmosphere', 'village', 'nebula', 'open-cluster', 'globular', 'galaxy', 'outer', 'expansion'].indexOf(chapter ?? '');
    return bossTracks[((index < 0 ? Math.max(0, sector) + 3 : index) + (final ? 2 : encounter % 2)) % bossTracks.length];
}
export const isBossTrack = (track) => bossTracks.includes(track);
export const bossOption = (track) => isBossTrack(track) ? ['a', 'b', 'c'][bossTracks.indexOf(track)] : undefined;
export function skillSound(id) { const sound = 'skill-' + id; return SKILL_SOUND_IDS.includes(sound) ? sound : 'skill-flash'; }
export function skillStages(id) {
    if (!id.startsWith('skill-'))
        return;
    const timing = { swing: [.055, .22, 1.2, .7], hammer: [.3, .55, .65, .7], drone: [.08, .38, 1.05, .8], flash: [.055, .16, 1.6, 1.2], void: [.6, 1.03, .55, .45], bombard: [.75, 1.05, .8, .7], stasis: [.25, .31, 1.3, 1.5], reflect: [.06, .32, 1.3, 1.4] };
    const [body, tail, chargePitch, tailPitch] = timing[id.slice(6)] ?? [.12, .4, 1, 1];
    return [{ id: id === 'skill-stasis' ? 'tail' : 'charge', at: 0, seconds: body, pitch: chargePitch, gain: .38, rise: id === 'skill-void' ? 2.6 : undefined },
        { id, at: body, seconds: id === 'skill-stasis' ? .045 : id === 'skill-void' ? .4 : .28, pitch: 1, gain: 1 },
        { id: 'tail', at: tail, seconds: id === 'skill-stasis' ? .035 : .24, pitch: tailPitch, gain: id === 'skill-stasis' ? .15 : .35, lowpass: id === 'skill-void' ? 900 : undefined }];
}
export const EXTRA_SOUND_NAMES = { heal: '체력 회복', ice: '얼음 타격', bossIncoming: '보스 접근 경보', lowHealth: '체력 낮음', charge: '스킬 준비', tail: '스킬 잔향' };

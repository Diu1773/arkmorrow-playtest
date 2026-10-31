import { BOSS_ENCOUNTERS, SWARM_EVENTS } from './data.js';
import { DUEL_ENCOUNTERS } from './boss-catalog.js';
import { arenaSpawnAllowed, bossEntryPoint } from './boss-director.js';
import { chapterRhythm } from './chapters.js';
export const CHAPTER_SECONDS = 480;
export const CHAPTER_RATE = CHAPTER_SECONDS / 600;
export const CHAPTER_BOSSES = DUEL_ENCOUNTERS;
export const CHAPTER_SWARMS = [{ at: 118, duration: 22, count: 72 }, { at: 264, duration: 24, count: 100 }, { at: 376, duration: 22, count: 120 }];
export const bossSchedule = (chapter) => chapter ? CHAPTER_BOSSES : BOSS_ENCOUNTERS;
export const swarmSchedule = (chapter, id) => chapter ? (id ? chapterRhythm(id).swarms : CHAPTER_SWARMS) : SWARM_EVENTS;
export const bossLeadTime = (role) => role === 'final' ? 6 : 3;
export function incomingBoss(s) {
    const next = s.encounters[s.encounterIndex];
    if (!next || !arenaSpawnAllowed(s, 'rusher') || s.bossWarning !== s.encounterIndex)
        return null;
    const elapsed = s.time - s.incomingAt, remaining = Math.max(0, Math.max(next.at - s.time, bossLeadTime(next.role) - elapsed));
    const point = bossEntryPoint(s), directions = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'], direction = directions[(Math.round(Math.atan2(point.y - s.player.y, point.x - s.player.x) / Math.PI * 4) + 8) % 8];
    return { role: next.role, art: next.art < 0 ? s.sector : next.art, remaining, ...point, direction };
}
export const arrivalFor = (id) => id === 'launch' ? 'pods' : id === 'atmosphere' ? 'storm' : id === 'village' ? 'crater' : 'vortex';
export const arrivalNames = { ko: { pods: '강하 포드 접근', storm: '번개 구름 이동', crater: '분화구에서 출현', vortex: '성운 급류 접근' }, en: { pods: 'Drop pods inbound', storm: 'Storm front approaching', crater: 'Crater breach', vortex: 'Nebula current inbound' } };

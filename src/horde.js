import { chapterDensity } from './chapters.js';
export function hordeTarget(time, boss = false, swarm = false, chapter) {
    if (boss)
        return 18;
    const target = time < 120 ? 30 + time / 4 : time < 300 ? 80 + (time - 120) * 70 / 180 : time < 480 ? 200 + (time - 300) * 100 / 180 : 300 + Math.min(120, time - 480) * 150 / 120;
    const buffer = time < 120 ? 30 : time < 300 ? 50 : 80, ceiling = time < 120 ? 60 : time < 300 ? 150 : time < 480 ? 300 : 450;
    return Math.round(Math.min(swarm ? 450 : ceiling, (target + buffer) * (swarm ? 1.22 : 1) * (chapter ? chapterDensity(chapter, time * .8) : 1)));
}
export function fieldScale(w, h) { return w < h ? .4 : Math.max(.5, Math.min(w / 1120, h / 720, 1.4)); }

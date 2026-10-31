import { ALL_SOUND_IDS, TRACKS } from './audio-score.js';
import { DEFAULT_ASSIGNMENTS } from './audio-defaults.js';
export const ASSIGNMENT_KEY = 'arkmorrow.audio-assignments.v1';
export function validCatalogue(value) {
    if (!value || typeof value !== 'object')
        return false;
    const data = value;
    return data.version === 1 && Array.isArray(data.candidates) && data.candidates.length <= 2000 && new Set(data.candidates.map(c => c?.id)).size === data.candidates.length && data.candidates.every(c => c && /^c\d{4}$/.test(c.id) && new RegExp('^' + c.id + '\\.(mp3|ogg|wav|m4a)$').test(c.file) && ['music', 'sound'].includes(c.kind) && [c.title, c.pack, c.terms].every(s => typeof s === 'string' && s.length <= 300) && Number.isFinite(c.seconds) && c.seconds > 0 && c.seconds <= 3600);
}
export function validClip(value, catalogue, kind) {
    if (!value || typeof value !== 'object')
        return false;
    const c = value, asset = catalogue.find(a => a.id === c.candidate && a.kind === kind);
    return !!asset && Number.isFinite(c.start) && Number.isFinite(c.end) && Number.isFinite(c.gain) && c.start >= 0 && c.end > c.start && c.end <= asset.seconds + .001 && c.gain >= 0 && c.gain <= 2;
}
export function resolveAssignments(value, catalogue) {
    const defaults = structuredClone(DEFAULT_ASSIGNMENTS), data = value;
    // Missing candidates retain their default references so the player can use its bundled fallback.
    for (const [group, ids, kind, max] of [['tracks', TRACKS.map(t => t.id), 'music', 3], ['sounds', ALL_SOUND_IDS, 'sound', 5]]) {
        for (const id of ids) {
            const current = defaults[group][id];
            defaults[group][id] = current.map(c => { const asset = catalogue.find(a => a.id === c.candidate); return asset ? { ...c, end: Math.min(c.end || asset.seconds, asset.seconds) } : c; });
            const proposed = (data?.version === 1 ? data[group] : undefined), list = proposed?.[id];
            if (Array.isArray(list) && list.length >= 1 && list.length <= max && list.every(c => validClip(c, catalogue, kind)))
                defaults[group][id] = list.map(c => ({ candidate: c.candidate, start: c.start, end: c.end, gain: c.gain }));
        }
    }
    return defaults;
}
export function loadAssignments(catalogue, storage) {
    try {
        return resolveAssignments(JSON.parse((storage ?? globalThis.localStorage).getItem(ASSIGNMENT_KEY) ?? 'null'), catalogue);
    }
    catch {
        return resolveAssignments(null, catalogue);
    }
}
export function saveAssignments(value, storage) { try {
    (storage ?? globalThis.localStorage).setItem(ASSIGNMENT_KEY, JSON.stringify(value));
    return true;
}
catch {
    return false;
} }
export function candidateURL(candidate) { return new URL('audio-candidates/' + candidate.file, new URL('../assets/', import.meta.url)).href; }

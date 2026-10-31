import { dialogues } from './data.js';
export const emptyStory = () => ({ seen: [], deaths: 0, bosses: 0, chapter: 0, returns: 0 });
export function parseStory(raw) {
    const state = emptyStory();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return state;
    const r = raw;
    if (Array.isArray(r.seen))
        state.seen = [...new Set(r.seen.filter((v) => typeof v === 'string' && dialogues.some(d => d.id === v)))];
    for (const key of ['deaths', 'bosses', 'chapter', 'returns']) {
        const n = r[key];
        if (typeof n === 'number' && Number.isFinite(n))
            state[key] = Math.max(0, Math.min(key === 'chapter' ? 7 : 1000000, Math.floor(n)));
    }
    return state;
}
export function eligible(entry, state, runs) { const c = entry.condition; return !(entry.once && state.seen.includes(entry.id)) && (!c.beforeFirst || !state.seen.includes(entry.id)) && (c.deaths === undefined || state.deaths >= c.deaths) && (c.bosses === undefined || state.bosses >= c.bosses) && (c.runs === undefined || runs >= c.runs) && (c.chapter === undefined || state.chapter >= c.chapter); }
export function pickDialogue(state, runs, at) { return dialogues.filter(d => d.at === at && eligible(d, state, runs)).sort((a, b) => b.priority - a.priority)[0]; }
export function markSeen(state, id) { return state.seen.includes(id) ? state : { ...state, seen: [...state.seen, id] }; }
export class DialoguePlayer {
    entry;
    index = 0;
    elapsed = 0;
    constructor(entry) { this.entry = entry; }
    get line() { return this.entry.lines[this.index]; }
    tick(dt) { this.elapsed += Math.max(0, dt); }
    visible(lang) { return Array.from(this.line[lang]).slice(0, Math.floor(this.elapsed * 36)).join(''); }
    complete(lang) { return Math.floor(this.elapsed * 36) >= Array.from(this.line[lang]).length; }
    next(lang) { if (!this.complete(lang)) {
        this.elapsed = 10000;
        return false;
    } if (this.index + 1 >= this.entry.lines.length)
        return true; this.index++; this.elapsed = 0; return false; }
}

import { soundDuration } from './audio-score.js';
export const VOICE_LIMIT = 20;
export function soundRule(id) {
    const important = ['warning', 'hurt', 'level', 'evolve', 'chest', 'boss', 'clear', 'down', 'resonance'].includes(id), tiny = ['pulse', 'orbit', 'missile', 'chain', 'laser', 'mine', 'fan', 'nova', 'kill', 'pickup', 'crystal', 'air', 'blast', 'wave', 'spark', 'gravity', 'field', 'prepare'].includes(id);
    return { limit: important ? 2 : 3, interval: important ? .1 : id === 'pickup' ? .06 : .05, priority: important ? (id === 'warning' || id === 'hurt' ? 4 : 5) : id === 'prepare' ? 2 : tiny ? 1 : 3, tiny };
}
export class VoiceManager {
    active = [];
    last = new Map();
    nextToken = 1;
    variant = new Map();
    duckUntil = 0;
    pickupAt = -Infinity;
    pickupStep = -1;
    constructor(publicLimit = VOICE_LIMIT, random = Math.random) { this.limit = publicLimit; this.random = random; }
    limit;
    random;
    prune(now) { this.active = this.active.filter(v => v.end > now); }
    release(token) { this.active = this.active.filter(v => v.token !== token); }
    flush(requests, now, view) {
        this.prune(now);
        const grouped = new Map(), started = [], stolen = [];
        for (const r of requests) {
            if (view && r.x !== undefined && r.y !== undefined && (Math.abs(r.x - view.x) > view.width * .56 || Math.abs(r.y - view.y) > view.height * .56) && soundRule(r.id).tiny)
                continue;
            const old = grouped.get(r.id);
            if (old)
                old.count = (old.count ?? 1) + (r.count ?? 1);
            else
                grouped.set(r.id, { ...r, count: r.count ?? 1 });
        }
        const duck = [...grouped.keys()].some(id => ['warning', 'hurt', 'level'].includes(id));
        if (duck)
            this.duckUntil = Math.max(this.duckUntil, now + .42);
        for (const r of [...grouped.values()].sort((a, b) => soundRule(b.id).priority - soundRule(a.id).priority)) {
            const rule = soundRule(r.id);
            if (now - (this.last.get(r.id) ?? -Infinity) < rule.interval - 1e-8)
                continue;
            const same = this.active.filter(v => v.id === r.id);
            let victim;
            if (same.length >= rule.limit)
                victim = same.reduce((a, b) => a.start < b.start ? a : b);
            else if (this.active.length >= this.limit) {
                const low = this.active.reduce((a, b) => a.priority < b.priority || (a.priority === b.priority && a.start < b.start) ? a : b);
                if (low.priority > rule.priority)
                    continue;
                victim = low;
            }
            if (victim) {
                this.release(victim.token);
                stolen.push(victim.token);
            }
            let pitch = r.pitch ?? 1;
            if (r.id === 'pickup') {
                this.pickupStep = now - this.pickupAt > .65 ? 0 : Math.min(7, this.pickupStep + 1);
                this.pickupAt = now;
                pitch *= 2 ** ([0, 2, 4, 5, 7, 9, 11, 12][this.pickupStep] / 12);
            }
            const variant = ((this.variant.get(r.id) ?? -1) + 1) % 5;
            this.variant.set(r.id, variant);
            const jitter = 2 ** ((this.random() - .5) * .22 / 12);
            pitch *= jitter;
            const gain = (r.id === 'air' ? .035 : rule.tiny ? .36 : .74) * (r.gain ?? 1) * (1 + Math.min(5, (r.count ?? 1) - 1) * .055);
            const voice = { token: this.nextToken++, id: r.id, start: now, end: now + soundDuration(r.id) / pitch, priority: rule.priority, gain, pitch, pan: view && r.x !== undefined ? Math.max(-.5, Math.min(.5, (r.x - view.x) / view.width)) : 0, variant };
            this.last.set(r.id, now);
            this.active.push(voice);
            started.push(voice);
        }
        return { started: started.filter(v => this.active.some(a => a.token === v.token)), stolen, duck };
    }
}

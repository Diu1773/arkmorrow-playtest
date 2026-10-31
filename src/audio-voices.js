import { soundDuration, VARIANTS } from './audio-score.js';
export const VOICE_LIMIT = 12;
export function soundRule(id) {
    const important = ['warning', 'hurt', 'level', 'evolve', 'chest', 'boss', 'bossIncoming', 'clear', 'down', 'resonance', 'heal'].includes(id), tiny = ['pulse', 'orbit', 'missile', 'chain', 'laser', 'mine', 'fan', 'nova', 'kill', 'pickup', 'crystal', 'air', 'blast', 'wave', 'spark', 'gravity', 'ice', 'field', 'prepare', 'dash', 'footgrass', 'footstone', 'footmetal', 'footwater', 'charge', 'tail'].includes(id);
    const hit = ['pulse', 'orbit', 'missile', 'chain', 'laser', 'mine', 'fan', 'nova', 'blast', 'wave', 'spark', 'gravity', 'ice', 'field'].includes(id);
    return { limit: hit || id.startsWith('foot') || id === 'hurt' || id === 'lowHealth' ? 1 : 2, interval: hit ? .065 : id === 'lowHealth' ? 1.2 : important ? .15 : id === 'pickup' || id === 'crystal' ? .06 : .08, priority: id === 'hurt' ? 7 : id === 'down' ? 8 : important ? (id === 'warning' ? 4 : 5) : id === 'prepare' ? 2 : tiny ? 1 : 3, tiny, hit };
}
export class VoiceManager {
    active = [];
    last = new Map();
    nextToken = 1;
    variant = new Map();
    duckUntil = 0;
    pickupAt = -Infinity;
    pickupStep = -1;
    hitAt = -Infinity;
    constructor(publicLimit = VOICE_LIMIT, random = Math.random) { this.limit = publicLimit; this.random = random; }
    limit;
    random;
    variantCount = (_id) => VARIANTS;
    duration = (id, _variant) => soundDuration(id);
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
        let duck = false;
        const hits = [...grouped.values()].filter(r => soundRule(r.id).hit).sort((a, b) => (b.count ?? 1) - (a.count ?? 1) || (this.last.get(a.id) ?? -1e9) - (this.last.get(b.id) ?? -1e9));
        // Alternate two short accents per cluster, with one shared retrigger clock.
        const allowedHits = new Set(now - this.hitAt >= .065 - 1e-8 ? hits.slice(0, 2).map(r => r.id) : []);
        for (const r of [...grouped.values()].sort((a, b) => soundRule(b.id).priority - soundRule(a.id).priority)) {
            const rule = soundRule(r.id);
            if (rule.hit && !allowedHits.has(r.id) || now - (this.last.get(r.id) ?? -Infinity) < rule.interval - 1e-8)
                continue;
            const same = this.active.filter(v => v.id === r.id);
            let victim;
            if (same.length >= rule.limit) {
                if (r.id === 'hurt')
                    victim = same[0];
                else
                    continue;
            }
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
            if (r.id === 'pickup' || r.id === 'crystal') {
                this.pickupStep = now - this.pickupAt >= 1 - 1e-8 ? 0 : Math.min(12, this.pickupStep + 1);
                this.pickupAt = now;
                pitch *= 2 ** (this.pickupStep / 12);
            }
            const count = this.variantCount(r.id), variant = r.variant !== undefined ? Math.max(0, Math.min(count - 1, r.variant)) : ((this.variant.get(r.id) ?? -1) + 1) % count;
            this.variant.set(r.id, variant);
            const jitter = rule.hit ? .95 + this.random() * .1 : r.id === 'pickup' || r.id === 'crystal' ? 1 : 2 ** ((this.random() - .5) * .22 / 12);
            pitch *= jitter;
            const gain = (r.id === 'hurt' ? .95 : r.id === 'lowHealth' ? .08 : r.id === 'air' ? .012 : rule.hit ? .09 : rule.tiny ? .20 : .60) * (r.gain ?? 1) * (1 + Math.min(5, (r.count ?? 1) - 1) * .055);
            const voice = { token: this.nextToken++, id: r.id, start: now, end: now + this.duration(r.id, variant) / pitch, priority: rule.priority, gain, pitch, pan: view && r.x !== undefined ? Math.max(-.5, Math.min(.5, (r.x - view.x) / view.width)) : 0, variant };
            this.last.set(r.id, now);
            if (rule.hit)
                this.hitAt = now;
            if (['warning', 'hurt', 'level', 'bossIncoming'].includes(r.id)) {
                duck = true;
                this.duckUntil = Math.max(this.duckUntil, now + (r.id === 'hurt' ? .32 : .42));
            }
            this.active.push(voice);
            started.push(voice);
        }
        return { started: started.filter(v => this.active.some(a => a.token === v.token)), stolen, duck };
    }
}

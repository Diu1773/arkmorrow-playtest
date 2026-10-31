export const CONTACT_DISTANCE = 18, CONTACT_INTERVAL = .18;
export const STOP_INTERVAL = .12, STOP_BUDGET = .024;
export class ImpactClock {
    time = 0;
    remaining = 0;
    next = 0;
    stops = [];
    request(duration, now, exceptional = false) {
        if (!Number.isFinite(duration) || duration <= 0)
            return;
        this.time = Math.max(this.time, now);
        if (exceptional) {
            this.remaining = Math.max(this.remaining, duration);
            return;
        }
        if (this.remaining > 0 || this.time + 1e-9 < this.next)
            return;
        this.stops = this.stops.filter(s => s.at + s.duration > this.time - 1);
        const available = STOP_BUDGET - this.stops.reduce((n, s) => n + s.duration, 0), accepted = Math.min(duration, available);
        if (accepted <= 1e-9)
            return;
        this.stops.push({ at: this.time, duration: accepted });
        this.next = this.time + STOP_INTERVAL;
        this.remaining = accepted;
    }
    advance(delta) {
        const stopped = Math.min(this.remaining, delta);
        this.remaining = Math.max(0, this.remaining - stopped);
        this.time += delta;
        return delta - stopped;
    }
}
export const armorReduction = (armor) => Math.min(.8, Math.max(0, armor) / (Math.max(0, armor) + 12));
export function enemyHealth(base, difficulty, chapter = 1) { return base * difficulty * chapter; }
export const floaterPriority = (a, b) => Number(!!b.player) - Number(!!a.player) || Number(!!b.critical) - Number(!!a.critical) || Math.abs(b.value ?? (Number(b.text) || 0)) - Math.abs(a.value ?? (Number(a.text) || 0));
export function smallestNumber(list) {
    let at = -1;
    for (let i = 0; i < list.length; i++) {
        const f = list[i];
        if (!f.player && f.reaction === undefined && (at < 0 || floaterPriority(f, list[at]) > 0))
            at = i;
    }
    return at;
}
export function criticalStyle(age, reduced = false) {
    const frame = Math.min(5, Math.max(0, Math.floor(age * 24)));
    return { frame, color: ['#ffd260', '#ffb74e', '#ff974b', '#ff746e', '#ef515b', '#ef515b'][frame], lift: reduced ? 0 : Math.sin(Math.min(1, age / .3) * Math.PI) * 16, spark: age < .25 };
}

export class CombatNotice {
    seen = new Set();
    key = '';
    text = '';
    priority = 0;
    until = 0;
    started = 0;
    push(key, text, now, priority = 1, reduced = false) {
        if (reduced && priority < 2 || this.seen.has(key) || now < this.until && priority < this.priority)
            return false;
        this.seen.add(key);
        if (this.seen.size > 128)
            this.seen.delete(this.seen.values().next().value);
        this.key = key;
        this.text = text;
        this.priority = priority;
        this.started = now;
        this.until = now + 1500;
        return true;
    }
    current(now) { return now < this.until ? this.text : ''; }
    clear() { this.until = 0; this.key = ''; this.seen.clear(); }
}

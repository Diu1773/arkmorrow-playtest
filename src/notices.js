export class CombatNotice {
    key = '';
    text = '';
    priority = 0;
    until = 0;
    started = 0;
    push(key, text, now, priority = 1, reduced = false) {
        if (reduced && priority < 2 || key === this.key && now < this.until || now < this.until && priority < this.priority)
            return false;
        this.key = key;
        this.text = text;
        this.priority = priority;
        this.started = now;
        this.until = now + 1500;
        return true;
    }
    current(now) { return now < this.until ? this.text : ''; }
    clear() { this.until = 0; this.key = ''; }
}

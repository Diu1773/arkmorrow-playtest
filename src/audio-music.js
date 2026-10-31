import { isBossTrack } from './audio-feel.js';
export const CROSSFADE_SECONDS = 1.5;
export function musicOption(search = globalThis.location?.search ?? '') {
    const value = new URLSearchParams(search).get('music');
    return value === 'b' || value === 'c' ? value : 'a';
}
export const musicRole = (track) => isBossTrack(track) ? 'boss' : track === 'title' || track === 'refuge' ? 'hub' : 'combat';
export class MusicStream {
    decks = [];
    current = -1;
    pending = -1;
    failures = new Map();
    retryAt = 0;
    enabled = false;
    primed = false;
    ctx;
    base;
    constructor(ctx, destination, base) {
        this.ctx = ctx;
        this.base = base;
        for (let i = 0; i < 2; i++) {
            const element = new Audio();
            element.preload = 'none';
            element.loop = true;
            element.setAttribute('playsinline', '');
            const source = ctx.createMediaElementSource(element), fade = ctx.createGain(), level = ctx.createGain(), filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = .5;
            fade.gain.value = 0;
            source.connect(filter);
            filter.connect(level);
            level.connect(fade);
            fade.connect(destination);
            this.decks.push({ element, source, fade, level, filter, key: '', ready: false, stopAt: Infinity, generation: 0 });
        }
    }
    select(manifest, option, role, intensity) {
        const asset = manifest.music.find(s => s.option === option && s.role === role);
        if (asset)
            this.selectAsset(asset, intensity);
    }
    selectAsset(asset, intensity, gain = 1) {
        this.enabled = true;
        this.tick();
        const key = asset.file;
        for (const deck of this.decks) {
            if (deck.key === key)
                deck.level.gain.setTargetAtTime([.68, .84, 1][intensity - 1] * gain, this.ctx.currentTime, .35);
            deck.filter.frequency.setTargetAtTime([6500, 10500, 18000][intensity - 1], this.ctx.currentTime, .35);
        }
        if (this.pending >= 0 && this.decks[this.pending].key === key)
            return;
        if (this.current >= 0 && this.decks[this.current].key === key) {
            this.decks[this.current].asset = asset;
            if (this.pending >= 0) {
                this.clear(this.decks[this.pending]);
                this.pending = -1;
            }
            return;
        }
        if (this.ctx.currentTime < this.retryAt)
            return;
        const index = this.current === 0 ? 1 : 0, deck = this.decks[index];
        this.clear(deck);
        this.pending = index;
        deck.key = key;
        deck.asset = asset;
        deck.level.gain.setValueAtTime([.68, .84, 1][intensity - 1] * gain, this.ctx.currentTime);
        deck.element.preload = 'auto';
        deck.element.src = new URL(asset.file, this.base).href;
        deck.element.loop = asset.loopStart === 0;
        const generation = deck.generation;
        deck.element.onerror = () => this.failed(deck, generation, 'Music stream unavailable');
        this.start(deck, index, generation);
    }
    start(deck, index, generation) {
        try {
            void deck.element.play().then(() => {
                if (generation !== deck.generation || !this.enabled)
                    return;
                const now = this.ctx.currentTime;
                deck.ready = true;
                this.failures.delete(deck.key);
                if (deck.asset.loopStart > 0)
                    deck.element.currentTime = deck.asset.loopStart;
                if (this.current >= 0 && this.current !== index) {
                    const old = this.decks[this.current];
                    this.ramp(old, 0, now);
                    old.stopAt = now + CROSSFADE_SECONDS;
                }
                this.ramp(deck, 1, now);
                deck.stopAt = Infinity;
                this.current = index;
                this.pending = -1;
            }).catch(error => this.failed(deck, generation, String(error)));
        }
        catch (error) {
            this.failed(deck, generation, String(error));
        }
    }
    failed(deck, generation, error) { if (generation !== deck.generation)
        return; this.failures.set(deck.key, error); this.retryAt = this.ctx.currentTime + 3; this.clear(deck); this.pending = -1; }
    ramp(deck, value, now) { const gain = deck.fade.gain, current = gain.value; gain.cancelScheduledValues(now); gain.setValueAtTime(current, now); gain.linearRampToValueAtTime(value, now + CROSSFADE_SECONDS); }
    tick() { for (const deck of this.decks) {
        if (deck.stopAt <= this.ctx.currentTime) {
            this.clear(deck);
            continue;
        }
        const asset = deck.asset;
        if (deck.ready && asset && deck.element.currentTime >= asset.loopEnd)
            deck.element.currentTime = asset.loopStart + (deck.element.currentTime - asset.loopEnd) % (asset.loopEnd - asset.loopStart);
    } }
    unlock() {
        if (!this.primed) {
            this.primed = true;
            for (const deck of this.decks) {
                const generation = deck.generation;
                deck.element.src = new URL('effects/click-0.m4a', this.base).href;
                try {
                    void deck.element.play().then(() => { if (deck.generation === generation && !deck.key) {
                        deck.element.pause();
                        deck.element.removeAttribute('src');
                        deck.element.load();
                    } }).catch(() => { });
                }
                catch { /* Playback can be retried by the next gesture. */ }
            }
        }
        for (let i = 0; i < this.decks.length; i++) {
            const deck = this.decks[i];
            if (deck.key && !deck.ready)
                this.start(deck, i, deck.generation);
        }
    }
    clear(deck) { deck.generation++; deck.element.onerror = null; deck.element.pause(); deck.element.removeAttribute('src'); deck.element.load(); deck.fade.gain.cancelScheduledValues(this.ctx.currentTime); deck.fade.gain.value = 0; deck.key = ''; deck.asset = undefined; deck.ready = false; deck.stopAt = Infinity; }
    stop() { if (!this.enabled && this.decks.every(d => !d.element.src && !d.key))
        return; this.enabled = false; for (const deck of this.decks)
        this.clear(deck); this.current = this.pending = -1; }
}

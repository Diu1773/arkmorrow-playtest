import { elementOf } from './battle.js';
import { barSeconds, composeBar, musicIntensity, SAMPLE_RATE, synth, synthSound } from './audio-score.js';
import { VoiceManager, soundRule } from './audio-voices.js';
export const MUSIC_VOICE_LIMIT = 32;
export class AudioEngine {
    ctx = null;
    master = null;
    music = null;
    sfx = null;
    small = null;
    settings;
    voices = new VoiceManager();
    nodes = new Map();
    musicNodes = new Set();
    buffers = new Map();
    playing = false;
    track = 'title';
    requestedTrack = 'title';
    intensity = 1;
    requestedIntensity = 1;
    nextBar = 0;
    bars = new Map();
    queue = [];
    spatial;
    musicGroup = null;
    manual = false;
    musicGroups = new Set();
    victoryUntil = 0;
    bossActive = false;
    worker = null;
    pendingTimbres = new Set();
    constructor(settings) { this.settings = settings; }
    async unlock() {
        try {
            if (!this.ctx) {
                const ctx = new AudioContext();
                this.ctx = ctx;
                this.master = ctx.createGain();
                this.music = ctx.createGain();
                this.sfx = ctx.createGain();
                this.small = ctx.createGain();
                const limiter = ctx.createDynamicsCompressor();
                limiter.threshold.value = -6;
                limiter.knee.value = 6;
                limiter.ratio.value = 12;
                limiter.attack.value = .003;
                limiter.release.value = .12;
                this.master.connect(limiter);
                limiter.connect(ctx.destination);
                this.music.connect(this.master);
                this.sfx.connect(this.master);
                this.small.connect(this.sfx);
                this.update(this.settings);
                if (typeof Worker !== 'undefined')
                    try {
                        this.worker = new Worker(new URL('./audio-worker.js', import.meta.url), { type: 'module' });
                        this.worker.onmessage = (event) => { this.pendingTimbres.delete(event.data.key); this.buffer(event.data.key, () => event.data.samples); };
                        this.worker.onerror = () => { this.worker?.terminate(); this.worker = null; this.pendingTimbres.clear(); };
                    }
                    catch {
                        this.worker = null;
                    }
            }
            if (this.ctx.state === 'suspended')
                await this.ctx.resume();
        }
        catch {
            this.ctx = null;
        }
    }
    update(settings) { this.settings = settings; if (!this.ctx)
        return; const now = this.ctx.currentTime; this.master.gain.setTargetAtTime(settings.volume, now, .025); this.music.gain.setTargetAtTime(settings.music * .65, now, .04); this.sfx.gain.setTargetAtTime(settings.sfx * .75, now, .025); }
    setPlaying(playing) { this.setScene(playing ? 'playing' : 'pause'); }
    setScene(scene) {
        this.manual = false;
        const active = scene === 'playing' || scene === 'title' || scene === 'shop' || scene === 'settings';
        this.playing = active;
        if (scene !== 'playing') {
            this.requestedTrack = 'title';
            this.requestedIntensity = 1;
        }
        if (!active)
            this.stopMusic();
    }
    combat(sector, seconds, enemies, boss, final = false) {
        if (this.manual)
            return;
        const track = boss ? 'boss' : ['nebula', 'open', 'globular', 'milkyway', 'galaxies', 'expansion'][sector] ?? 'nebula';
        if (boss && !this.bossActive && this.ctx)
            this.nextBar = Math.min(this.nextBar, this.ctx.currentTime + .025);
        this.bossActive = boss;
        this.requestedTrack = track;
        this.requestedIntensity = boss ? (final ? 3 : 2) : musicIntensity(seconds, enemies, this.requestedIntensity);
    }
    previewTrack(track, intensity) { this.stopMusic(); this.track = this.requestedTrack = track; this.intensity = this.requestedIntensity = intensity; this.bars.set(track, 0); this.manual = true; this.playing = true; }
    stopMusic() {
        if (this.ctx && this.musicGroup) {
            const group = this.musicGroup;
            group.gain.cancelScheduledValues(this.ctx.currentTime);
            group.gain.setTargetAtTime(0, this.ctx.currentTime, .025);
        }
        for (const node of this.musicNodes) {
            try {
                node.source.stop(this.ctx.currentTime + .1);
            }
            catch { /* A release may already have ended. */ }
        }
        for (const group of this.musicGroups) {
            if (group !== this.musicGroup)
                group.disconnect();
        }
        this.musicGroup = null;
        this.nextBar = 0;
    }
    stop() { this.playing = false; this.stopMusic(); this.queue = []; for (const node of this.nodes.values())
        this.releaseNode(node); this.nodes.clear(); this.voices.active = []; }
    releaseNode(node) { try {
        node.source.stop();
    }
    catch { /* Finished buffers need no second stop. */ } node.source.disconnect(); node.gain.disconnect(); node.pan.disconnect(); }
    buffer(key, make) {
        const old = this.buffers.get(key);
        if (old)
            return old;
        const samples = make(), buffer = this.ctx.createBuffer(1, samples.length, SAMPLE_RATE);
        buffer.getChannelData(0).set(samples);
        if (this.buffers.size >= 320)
            this.buffers.delete(this.buffers.keys().next().value);
        this.buffers.set(key, buffer);
        return buffer;
    }
    node(buffer, at, gain, pan, destination, pitch = 1) {
        const ctx = this.ctx, source = ctx.createBufferSource(), level = ctx.createGain(), position = ctx.createStereoPanner();
        source.buffer = buffer;
        source.playbackRate.value = pitch;
        level.gain.value = gain;
        position.pan.value = pan;
        source.connect(level);
        level.connect(position);
        position.connect(destination);
        source.start(at);
        return { source, gain: level, pan: position, start: at, end: at + buffer.duration / pitch };
    }
    startVoice(voice) {
        const buffer = this.buffer(`fx:${voice.id}:${voice.variant}`, () => synthSound(voice.id, voice.variant));
        const node = this.node(buffer, voice.start, voice.gain, voice.pan, soundRule(voice.id).tiny ? this.small : this.sfx, voice.pitch);
        this.nodes.set(voice.token, node);
        node.source.onended = () => { node.source.disconnect(); node.gain.disconnect(); node.pan.disconnect(); this.nodes.delete(voice.token); this.voices.release(voice.token); };
    }
    play(id, options = {}) { if (this.queue.length < 256)
        this.queue.push({ id, ...options }); }
    warmMusic(notes) {
        if (!this.worker)
            return true;
        let ready = true;
        for (const note of notes) {
            const key = `${note.instrument}:${note.midi}:${note.duration.toFixed(4)}`;
            if (this.buffers.has(key))
                continue;
            ready = false;
            if (!this.pendingTimbres.has(key)) {
                this.pendingTimbres.add(key);
                this.worker.postMessage({ key, note });
            }
        }
        return ready;
    }
    ui(type = 'select') { this.play(type === 'select' ? 'click' : type === 'result' ? 'clear' : type); }
    skipCue() { this.queue = this.queue.filter(r => soundRule(r.id).priority < 5); for (const voice of [...this.voices.active])
        if (voice.priority >= 5) {
            const node = this.nodes.get(voice.token);
            if (node)
                this.releaseNode(node);
            this.nodes.delete(voice.token);
            this.voices.release(voice.token);
        } }
    consume(events, view) {
        this.spatial = view;
        for (const e of events) {
            if (e.kind === 'bossWarning') {
                this.play('boss', { gain: .65, pitch: .7 });
                this.warmMusic(composeBar('boss', this.bars.get('boss') ?? 0, e.value ? 3 : 2));
                continue;
            }
            if (e.kind === 'kill' && e.value === 2) {
                this.stopMusic();
                this.play('clear', { gain: .8 });
                this.victoryUntil = (this.ctx?.currentTime ?? 0) + 2.1;
            }
            let id;
            if (e.kind === 'foot' || e.kind === 'material') {
                this.play(e.kind === 'foot' ? 'air' : 'pulse', { gain: e.kind === 'foot' ? .22 : .35, x: e.x, y: e.y, pitch: [.65, 1.4, .8, 1.8, .95, 1.1][e.value] ?? 1 });
                continue;
            }
            if (e.kind === 'shoot')
                id = 'air';
            else if (e.kind === 'hit' || e.kind === 'impact') {
                const w = e.weapon ?? 'pulse', element = elementOf(w);
                id = ['nova', 'quake', 'ripple', 'resonance'].includes(w) ? 'wave' : element === 'gravity' ? 'gravity' : element === 'electric' ? 'spark' : element === 'fire' ? 'blast' : ['flame', 'acid', 'frost'].includes(w) ? 'field' : 'pulse';
            }
            else if (e.kind === 'pickup')
                id = e.value >= 12 ? 'crystal' : 'pickup';
            else if (e.kind === 'reaction')
                id = e.value === 2 || e.value === 5 ? 'spark' : e.value === 1 ? 'gravity' : 'blast';
            else if (e.kind === 'kill')
                id = 'kill';
            else if (e.kind === 'swarm')
                id = 'resonance';
            else
                id = e.kind;
            if (id)
                this.play(id, { gain: e.kind === 'prepare' ? .55 : 1, x: e.x, y: e.y, pitch: e.kind === 'chest' ? .7 + e.value * .12 : e.kind === 'kill' ? Math.max(.55, Math.min(1.6, 22 / (e.size ?? 22))) : e.kind === 'hit' ? Math.max(.72, Math.min(1, 30 / (e.size ?? 22))) : 1 });
            if (e.kind === 'kill' && e.value === 2)
                this.play('resonance', { x: e.x, y: e.y, pitch: .8 });
        }
    }
    tick() {
        if (!this.ctx || this.ctx.state !== 'running')
            return;
        const now = this.ctx.currentTime;
        for (const [token, node] of this.nodes)
            if (node.end <= now) {
                this.releaseNode(node);
                this.nodes.delete(token);
            }
        const result = this.voices.flush(this.queue.splice(0), now, this.spatial);
        for (const token of result.stolen) {
            const node = this.nodes.get(token);
            if (node) {
                this.releaseNode(node);
            }
            this.nodes.delete(token);
        }
        if (result.duck) {
            const gain = this.small.gain;
            gain.cancelScheduledValues(now);
            gain.setTargetAtTime(.2, now, .008);
            gain.setTargetAtTime(1, this.voices.duckUntil, .06);
        }
        if (this.settings.sfx > 0)
            for (const voice of result.started)
                this.startVoice(voice);
        if (!this.playing || this.settings.music === 0)
            return;
        const ready = this.warmMusic(composeBar(this.requestedTrack, this.bars.get(this.requestedTrack) ?? 0, this.requestedIntensity));
        if (now < this.victoryUntil || this.nextBar > now + .16)
            return;
        if (!ready)
            return;
        if (this.nextBar < now)
            this.nextBar = now + .025;
        const at = this.nextBar;
        if (!this.musicGroup || this.track !== this.requestedTrack) {
            for (const group of this.musicGroups)
                if (group !== this.musicGroup) {
                    group.disconnect();
                    this.musicGroups.delete(group);
                }
            if (this.musicGroup) {
                const old = this.musicGroup;
                old.gain.setTargetAtTime(0, at, .08);
                for (const node of this.musicNodes) {
                    node.source.stop(at + .36);
                    node.end = Math.min(node.end, at + .36);
                }
            }
            this.musicGroup = this.ctx.createGain();
            this.musicGroup.gain.setValueAtTime(0, at);
            this.musicGroup.gain.setTargetAtTime(1, at, .09);
            this.musicGroup.connect(this.music);
            this.musicGroups.add(this.musicGroup);
            this.track = this.requestedTrack;
        }
        this.intensity = this.requestedIntensity;
        const bar = this.bars.get(this.track) ?? 0;
        for (const note of composeBar(this.track, bar, this.intensity))
            this.schedule(note, at);
        this.bars.set(this.track, bar + 1);
        this.nextBar = at + barSeconds(this.track);
    }
    schedule(note, at) {
        const start = at + note.time, end = start + note.duration;
        if ([...this.musicNodes].filter(node => node.start < end && node.end > start).length >= MUSIC_VOICE_LIMIT)
            return;
        const key = `${note.instrument}:${note.midi}:${note.duration.toFixed(4)}`, buffer = this.buffer(key, () => synth(note.instrument, note.midi, note.duration));
        const node = this.node(buffer, at + note.time, note.gain, note.pan, this.musicGroup);
        this.musicNodes.add(node);
        node.source.onended = () => { node.source.disconnect(); node.gain.disconnect(); node.pan.disconnect(); this.musicNodes.delete(node); if (!this.musicNodes.size) {
            for (const group of this.musicGroups)
                if (group !== this.musicGroup) {
                    group.disconnect();
                    this.musicGroups.delete(group);
                }
        } };
    }
}

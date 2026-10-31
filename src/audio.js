import { elementOf } from './battle.js';
import { musicIntensity, VARIANTS } from './audio-score.js';
import { VoiceManager, soundRule } from './audio-voices.js';
import { SampleBank } from './audio-samples.js';
import { MusicStream, musicOption, musicRole } from './audio-music.js';
export class AudioEngine {
    ctx = null;
    master = null;
    music = null;
    sfx = null;
    small = null;
    settings;
    voices = new VoiceManager();
    nodes = new Map();
    playing = false;
    track = 'title';
    requestedTrack = 'title';
    intensity = 1;
    requestedIntensity = 1;
    queue = [];
    spatial;
    manual = false;
    skillCounts = {};
    victoryUntil = 0;
    bossActive = false;
    option = musicOption();
    stream = null;
    bank = null;
    ready = null;
    constructor(settings) { this.settings = settings; }
    setMusicOption(option) { this.option = option; }
    async unlock() {
        try {
            if (!this.ctx) {
                const ctx = new AudioContext({ latencyHint: 'interactive' });
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
                this.bank = new SampleBank(ctx);
                this.stream = new MusicStream(ctx, this.music, this.bank.base);
            }
            const resumed = this.ctx.state === 'suspended' ? this.ctx.resume() : Promise.resolve();
            this.stream?.unlock();
            await resumed;
            if (this.bank) {
                this.ready = this.bank.load();
                await this.ready;
            }
        }
        catch { /* A later gesture can retry suspended playback. */ }
    }
    update(settings) { this.settings = settings; if (!this.ctx)
        return; const now = this.ctx.currentTime; this.master.gain.setTargetAtTime(settings.volume, now, .025); this.music.gain.setTargetAtTime(settings.music * .65, now, .04); this.sfx.gain.setTargetAtTime(settings.sfx * .75, now, .025); }
    setPlaying(playing) { this.setScene(playing ? 'playing' : 'pause'); }
    setScene(scene) {
        this.manual = false;
        const active = scene === 'playing' || scene === 'title' || scene === 'shop' || scene === 'settings' || scene === 'equipment' || scene === 'fusion' || scene === 'gacha' || scene === 'chapters';
        this.playing = active;
        if (scene !== 'playing') {
            this.requestedTrack = scene === 'shop' ? 'refuge' : 'title';
            this.requestedIntensity = 1;
        }
        if (!active)
            this.stopMusic();
    }
    combat(sector, seconds, enemies, boss, final = false, chapter) {
        if (this.manual)
            return;
        const track = boss ? 'boss' : chapter === 'launch' ? 'launch' : chapter === 'atmosphere' ? 'atmosphere' : chapter === 'village' ? 'refuge' : ['nebula', 'open', 'globular', 'milkyway', 'galaxies', 'expansion'][sector] ?? 'nebula';
        this.bossActive = boss;
        this.requestedTrack = track;
        this.requestedIntensity = boss ? (final ? 3 : 2) : musicIntensity(seconds, enemies, this.requestedIntensity);
    }
    previewTrack(track, intensity) { this.stopMusic(); this.track = this.requestedTrack = track; this.intensity = this.requestedIntensity = intensity; this.manual = true; this.playing = true; }
    stopMusic() { this.stream?.stop(); }
    stop() { this.playing = false; this.stopMusic(); this.queue = []; for (const node of this.nodes.values())
        this.releaseNode(node); this.nodes.clear(); this.voices.active = []; }
    releaseNode(node) { try {
        node.source.stop();
    }
    catch { /* Finished buffers need no second stop. */ } node.source.disconnect(); node.gain.disconnect(); node.pan.disconnect(); }
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
        const buffer = this.bank?.sound(voice.id, voice.variant);
        if (!buffer) {
            this.voices.release(voice.token);
            return;
        }
        const node = this.node(buffer, voice.start, voice.gain, voice.pan, soundRule(voice.id).tiny ? this.small : this.sfx, voice.pitch);
        this.nodes.set(voice.token, node);
        const end = Math.min(node.end, voice.end);
        node.gain.gain.setValueAtTime(voice.gain, Math.max(voice.start, end - .015));
        node.gain.gain.linearRampToValueAtTime(0, end);
        node.source.stop(end);
        node.end = end;
        node.source.onended = () => { node.source.disconnect(); node.gain.disconnect(); node.pan.disconnect(); this.nodes.delete(voice.token); this.voices.release(voice.token); };
    }
    play(id, options = {}) { if (this.queue.length < 256)
        this.queue.push({ id, ...options }); }
    ui(type = 'select') { this.play(type === 'select' ? 'click' : type === 'result' ? 'clear' : type); }
    skipCue() { this.queue = this.queue.filter(r => soundRule(r.id).priority < 5); for (const voice of [...this.voices.active])
        if (voice.priority >= 5) {
            const node = this.nodes.get(voice.token);
            if (node)
                this.releaseNode(node);
            this.nodes.delete(voice.token);
            this.voices.release(voice.token);
        } }
    consume(events, view, skillUses) {
        this.spatial = view;
        if (skillUses) {
            for (const id of ['swing', 'hammer', 'drone', 'flash', 'void', 'bombard', 'stasis', 'reflect']) {
                const count = skillUses[id] ?? 0;
                if (count > (this.skillCounts[id] ?? 0))
                    this.play(`skill-${id}`);
                this.skillCounts[id] = count;
            }
        }
        for (const e of events) {
            if (e.kind === 'bossWarning') {
                this.play('boss', { gain: .65, pitch: .7 });
                continue;
            }
            if (e.kind === 'kill' && e.value === 2) {
                this.stopMusic();
                this.play('clear', { gain: .8 });
                this.victoryUntil = (this.ctx?.currentTime ?? 0) + 2.1;
            }
            let id;
            if (e.kind === 'foot' || e.kind === 'material') {
                this.play(e.kind === 'foot' ? ['footgrass', 'footstone', 'footstone', 'footmetal', 'footgrass', 'footwater'][e.value] ?? 'footstone' : e.value === 0 ? 'fan' : 'pulse', { gain: e.kind === 'foot' ? .24 : .35, x: e.x, y: e.y });
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
        const queued = this.queue.splice(0), available = queued.filter(r => !!this.bank?.sound(r.id, this.voices.variant.has(r.id) ? (this.voices.variant.get(r.id) + 1) % VARIANTS : 0));
        if (this.bank?.loading)
            this.queue.push(...queued.filter(r => !available.includes(r)).slice(-32));
        const result = this.voices.flush(available, now, this.spatial);
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
        if (!this.playing || this.settings.music === 0) {
            this.stream?.stop();
            return;
        }
        if (now < this.victoryUntil)
            return;
        if (this.bank?.manifest) {
            this.stream?.select(this.bank.manifest, this.option, musicRole(this.requestedTrack), this.requestedIntensity);
            this.track = this.requestedTrack;
            this.intensity = this.requestedIntensity;
        }
    }
}

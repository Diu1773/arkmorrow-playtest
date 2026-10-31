import { elementOf } from './battle.js';
import { SKILLS, skillDef } from './combat-catalog.js';
import { SKILL_SOUND_IDS } from './audio-score.js';
import { musicIntensity, VARIANTS } from './audio-score.js';
import { VoiceManager, soundRule } from './audio-voices.js';
import { SampleBank } from './audio-samples.js';
import { MusicStream, musicOption, musicRole } from './audio-music.js';
import { DEV } from './env.js';
import { CandidateLibrary } from './audio-candidates.js';
import { candidateURL } from './audio-assignments.js';
import { bossTrack, bossOption, skillStages } from './audio-feel.js';
export class AudioEngine {
    ctx = null;
    master = null;
    music = null;
    sfx = null;
    small = null;
    musicDuck = null;
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
    lowHealth = false;
    healthWarningAt = 0;
    musicDuckUntil = 0;
    candidates = DEV ? new CandidateLibrary() : null;
    constructor(settings) { this.settings = settings; this.voices.variantCount = id => this.candidates?.sounds(id).length || VARIANTS; const duration = this.voices.duration; this.voices.duration = (id, variant) => { const stages = skillStages(id); if (stages)
        return Math.max(...stages.map(s => s.at + s.seconds / s.pitch)); const clip = this.candidates?.sounds(id)[variant]; return clip ? clip.end - clip.start : duration(id, variant); }; }
    async applyAssignments(value) { const saved = this.candidates?.assign(value) ?? false; if (this.ctx)
        await this.candidates?.loadSounds(this.ctx); return saved; }
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
                this.musicDuck = ctx.createGain();
                const limiter = ctx.createDynamicsCompressor();
                limiter.threshold.value = -6;
                limiter.knee.value = 6;
                limiter.ratio.value = 12;
                limiter.attack.value = .003;
                limiter.release.value = .12;
                this.master.connect(limiter);
                limiter.connect(ctx.destination);
                this.music.connect(this.master);
                this.musicDuck.connect(this.music);
                this.sfx.connect(this.master);
                this.small.connect(this.sfx);
                this.update(this.settings);
                this.bank = new SampleBank(ctx);
                this.stream = new MusicStream(ctx, this.musicDuck, this.bank.base);
            }
            const resumed = this.ctx.state === 'suspended' ? this.ctx.resume() : Promise.resolve();
            this.stream?.unlock();
            await resumed;
            if (this.bank) {
                this.ready = this.bank.load();
                if (this.candidates) {
                    this.candidates.failures.clear();
                    await Promise.all([this.ready, this.candidates.loadSounds(this.ctx)]);
                }
                else
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
        const active = scene === 'playing' || scene === 'title' || scene === 'refuge' || scene === 'shop' || scene === 'settings' || scene === 'equipment' || scene === 'fusion' || scene === 'gacha' || scene === 'chapters';
        this.playing = active;
        if (scene !== 'playing') {
            this.lowHealth = false;
            this.requestedTrack = scene === 'shop' || scene === 'refuge' ? 'refuge' : 'title';
            this.requestedIntensity = 1;
        }
        if (!active)
            this.stopMusic();
    }
    combat(sector, seconds, enemies, boss, final = false, chapter, health, bossArt) {
        if (this.manual)
            return;
        this.lowHealth = !!health && health.hp > 0 && health.hp / Math.max(1, health.maxHp) < .3;
        const track = boss ? bossTrack(sector, final, chapter, bossArt === undefined ? Number(seconds >= 300) : bossArt % 2) : chapter === 'launch' ? 'launch' : chapter === 'atmosphere' ? 'atmosphere' : chapter === 'village' ? 'refuge' : ['nebula', 'open', 'globular', 'milkyway', 'galaxies', 'expansion'][sector] ?? 'nebula';
        this.bossActive = boss;
        this.requestedTrack = track;
        this.requestedIntensity = boss ? (final ? 3 : 2) : musicIntensity(seconds, enemies, this.requestedIntensity);
    }
    previewTrack(track, intensity) { this.stopMusic(); this.track = this.requestedTrack = track; this.intensity = this.requestedIntensity = intensity; this.manual = true; this.playing = true; }
    stopMusic() { this.stream?.stop(); }
    stop() { this.playing = false; this.lowHealth = false; this.stopMusic(); this.queue = []; for (const node of this.nodes.values())
        this.releaseNode(node); this.nodes.clear(); this.voices.active = []; this.voices.last.clear(); this.voices.hitAt = this.voices.pickupAt = -Infinity; this.voices.pickupStep = -1; }
    releaseNode(node) { for (const child of node.children ?? [])
        this.releaseNode(child); try {
        node.source.stop();
    }
    catch { /* Finished buffers need no second stop. */ } node.source.disconnect(); node.gain.disconnect(); node.pan.disconnect(); node.filter?.disconnect(); }
    node(buffer, at, gain, pan, destination, pitch = 1, offset = 0, duration = buffer.duration - offset, lowpass) {
        const ctx = this.ctx, source = ctx.createBufferSource(), level = ctx.createGain(), position = ctx.createStereoPanner();
        source.buffer = buffer;
        source.playbackRate.value = pitch;
        level.gain.value = gain;
        position.pan.value = pan;
        let filter;
        if (lowpass) {
            filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = lowpass;
            source.connect(filter);
            filter.connect(level);
        }
        else
            source.connect(level);
        level.connect(position);
        position.connect(destination);
        source.start(at, offset, duration);
        return { source, gain: level, pan: position, start: at, end: at + duration / pitch, filter };
    }
    startVoice(voice) {
        const stages = skillStages(voice.id);
        if (stages) {
            const nodes = [];
            for (const stage of stages) {
                const list = this.candidates?.sounds(stage.id), clip = list?.length ? list[voice.variant % list.length] : undefined, buffer = clip ? this.candidates?.buffers.get(clip.candidate) : this.bank?.sound(stage.id, voice.variant % VARIANTS);
                if (!buffer)
                    continue;
                const offset = clip?.start ?? 0, available = clip ? clip.end - offset : buffer.duration - offset, seconds = stage.rise ? available : Math.min(stage.seconds * voice.pitch * stage.pitch, available);
                if (seconds <= 0)
                    continue;
                const gain = voice.gain * stage.gain * (clip?.gain ?? 1), node = this.node(buffer, voice.start + stage.at, gain, voice.pan, this.small, voice.pitch * stage.pitch, offset, seconds, stage.lowpass);
                const end = node.end = Math.min(node.end, node.start + stage.seconds), fade = voice.id === 'skill-stasis' ? .003 : .012;
                if (stage.rise) {
                    node.source.playbackRate.setValueAtTime(voice.pitch * stage.pitch, node.start);
                    node.source.playbackRate.linearRampToValueAtTime(voice.pitch * stage.pitch * stage.rise, end);
                }
                node.gain.gain.setValueAtTime(gain, Math.max(node.start, end - fade));
                node.gain.gain.linearRampToValueAtTime(0, end);
                node.source.stop(end);
                nodes.push(node);
            }
            if (!nodes.length) {
                this.voices.release(voice.token);
                return;
            }
            const parent = nodes[0];
            parent.children = nodes.slice(1);
            parent.end = Math.max(...nodes.map(n => n.end));
            voice.end = parent.end;
            this.nodes.set(voice.token, parent);
            return;
        }
        const clip = this.candidates?.sounds(voice.id)[voice.variant], buffer = clip ? this.candidates?.buffers.get(clip.candidate) : this.bank?.sound(voice.id, voice.variant % VARIANTS);
        if (!buffer) {
            this.voices.release(voice.token);
            return;
        }
        const offset = clip?.start ?? 0, duration = Math.min(buffer.duration - offset, clip ? clip.end - offset : buffer.duration), gain = voice.gain * (clip?.gain ?? 1);
        if (duration <= 0) {
            this.voices.release(voice.token);
            return;
        }
        const node = this.node(buffer, voice.start, gain, voice.pan, voice.id === 'hurt' || voice.id === 'down' ? this.sfx : this.small, voice.pitch, offset, duration);
        this.nodes.set(voice.token, node);
        const end = Math.min(node.end, voice.end);
        node.gain.gain.setValueAtTime(gain, Math.max(voice.start, end - .015));
        node.gain.gain.linearRampToValueAtTime(0, end);
        node.source.stop(end);
        node.end = end;
        node.source.onended = () => { node.source.disconnect(); node.gain.disconnect(); node.pan.disconnect(); this.nodes.delete(voice.token); this.voices.release(voice.token); };
    }
    play(id, options = {}) { if (this.queue.length < 256)
        this.queue.push({ id, ...options }); }
    playCombatSlot(slot) {
        if (slot === 'bossIncoming') {
            this.play('bossIncoming', { gain: .8 });
            return;
        }
        if (SKILL_SOUND_IDS.includes(slot)) {
            this.play(slot);
            return;
        }
        const def = skillDef(slot.slice(6)), fallback = def.category === 'movement' ? 'dash' : def.category === 'defense' ? 'skill-reflect' : def.category === 'summon' ? 'skill-drone' : def.element === 'gravity' ? 'gravity' : def.element === 'electric' ? 'spark' : def.element === 'fire' ? 'blast' : 'wave';
        this.play(fallback);
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
    consume(events, view, skillUses) {
        this.spatial = view;
        if (skillUses) {
            for (const { id } of SKILLS) {
                const count = skillUses[id] ?? 0;
                if (count > (this.skillCounts[id] ?? 0))
                    this.playCombatSlot(`skill-${id}`);
                this.skillCounts[id] = count;
            }
        }
        for (const e of events) {
            if (e.kind === 'bossWarning') {
                this.musicDuckUntil = (this.ctx?.currentTime ?? 0) + (e.value === 1 ? 6 : 3);
                this.play('bossIncoming', { gain: .8 });
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
                id = ['blackhole', 'gravity'].includes(w) || element === 'gravity' ? 'gravity' : element === 'ice' ? 'ice' : element === 'electric' ? 'spark' : element === 'fire' || ['bomb', 'missile', 'mine', 'nova', 'quake', 'ripple', 'resonance'].includes(w) ? 'blast' : 'pulse';
            }
            else if (e.kind === 'pickup')
                id = e.heal ? 'heal' : e.value >= 12 ? 'crystal' : 'pickup';
            else if (e.kind === 'reaction')
                id = e.value === 2 || e.value === 5 ? 'spark' : e.value === 1 ? 'gravity' : 'blast';
            else if (e.kind === 'kill')
                id = 'kill';
            else if (e.kind === 'swarm')
                id = 'resonance';
            else
                id = e.kind;
            if (id)
                this.play(id, { gain: e.kind === 'prepare' ? .55 : e.kind === 'kill' && e.elite ? 1.6 : 1, x: e.x, y: e.y, pitch: e.kind === 'chest' ? .7 + e.value * .12 : e.kind === 'kill' ? Math.max(.75, Math.min(1.15, 22 / (e.size ?? 22))) : 1 });
            if (e.kind === 'kill' && e.value === 2)
                this.play('resonance', { x: e.x, y: e.y, pitch: .8 });
        }
    }
    tick() {
        if (!this.ctx || this.ctx.state !== 'running')
            return;
        const now = this.ctx.currentTime;
        if (this.lowHealth && this.playing && now >= this.healthWarningAt) {
            this.play('lowHealth');
            this.healthWarningAt = now + 1.2;
        }
        this.music?.gain.setTargetAtTime(this.settings.music * .65 * (now < this.musicDuckUntil ? .35 : 1), now, .08);
        for (const [token, node] of this.nodes)
            if (node.end <= now) {
                this.releaseNode(node);
                this.nodes.delete(token);
            }
        const queued = this.queue.splice(0), available = queued.filter(r => !!this.candidates?.sounds(r.id).length || !!this.bank?.sound(r.id, this.voices.variant.has(r.id) ? (this.voices.variant.get(r.id) + 1) % VARIANTS : 0));
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
            for (const [gain, level] of [[this.small.gain, .18], [this.musicDuck.gain, .45]]) {
                gain.cancelScheduledValues(now);
                gain.setTargetAtTime(level, now, .008);
                gain.setTargetAtTime(1, this.voices.duckUntil, .06);
            }
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
        const selection = this.candidates?.music(this.requestedTrack, this.requestedIntensity), file = selection ? candidateURL(selection.asset) : undefined;
        if (selection && file && !this.stream?.failures.has(file)) {
            this.stream?.selectAsset({ file, loopStart: selection.clip.start, loopEnd: selection.clip.end }, this.requestedIntensity, selection.clip.gain);
        }
        else if (this.bank?.manifest)
            this.stream?.select(this.bank.manifest, bossOption(this.requestedTrack) ?? this.option, musicRole(this.requestedTrack), this.requestedIntensity);
        this.track = this.requestedTrack;
        this.intensity = this.requestedIntensity;
    }
}

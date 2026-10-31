import { ALL_SOUND_IDS, VARIANTS } from './audio-score.js';
export const AUDIO_BYTE_LIMIT = 30_000_000;
export function validManifest(m) {
    if (!m || m.version !== 2 || !Array.isArray(m.sounds) || !Array.isArray(m.music) || m.sounds.length !== ALL_SOUND_IDS.length * VARIANTS || m.music.length !== 9)
        return false;
    const entries = [...m.sounds, ...m.music];
    if (entries.some(s => !s || !Number.isInteger(s.bytes) || s.bytes <= 0 || !Number.isFinite(s.seconds) || s.seconds <= 0 || !/^[a-f0-9]{64}$/.test(s.sha256)) || new Set(entries.map(s => s.file)).size !== entries.length || entries.reduce((n, s) => n + s.bytes, 0) > AUDIO_BYTE_LIMIT)
        return false;
    if (m.sounds.some(s => !ALL_SOUND_IDS.includes(s.id) || !Number.isInteger(s.variant) || s.variant < 0 || s.variant >= VARIANTS || s.file !== `effects/${s.id}-${s.variant}.m4a` || s.seconds > 2.1))
        return false;
    if (m.music.some(s => !['a', 'b', 'c'].includes(s.option) || !['hub', 'combat', 'boss'].includes(s.role) || s.file !== `music/${s.option}-${s.role}.m4a` || !Number.isFinite(s.loopStart) || !Number.isFinite(s.loopEnd) || s.loopStart < 0 || s.loopEnd <= s.loopStart || s.loopEnd > s.seconds + .001))
        return false;
    return new Set(m.music.map(s => s.option + ':' + s.role)).size === 9;
}
export class SampleBank {
    manifest = null;
    buffers = new Map();
    failures = new Map();
    loading = null;
    base;
    ctx;
    constructor(ctx, base = new URL('../assets/audio/', import.meta.url)) { this.ctx = ctx; this.base = base; }
    async load() { if (this.loading)
        return this.loading; this.loading = this.read().finally(() => { this.loading = null; }); return this.loading; }
    async read() {
        try {
            if (!this.manifest) {
                const response = await fetch(new URL('manifest.json', this.base));
                if (!response.ok)
                    throw Error(`Audio manifest: ${response.status}`);
                const manifest = await response.json();
                if (!validManifest(manifest))
                    throw Error('Invalid audio manifest');
                this.manifest = manifest;
                this.failures.delete('manifest');
            }
            const entries = this.manifest.sounds.filter(s => !this.buffers.has(s.file));
            let index = 0;
            await Promise.all(Array.from({ length: 6 }, async () => {
                while (index < entries.length) {
                    const sample = entries[index++];
                    try {
                        const response = await fetch(new URL(sample.file, this.base));
                        if (!response.ok)
                            throw Error(`Audio effect: ${response.status}`);
                        const bytes = await response.arrayBuffer();
                        if (bytes.byteLength !== sample.bytes)
                            throw Error('Incomplete audio effect');
                        const buffer = await this.ctx.decodeAudioData(bytes);
                        if (!buffer.length || !Number.isFinite(buffer.duration))
                            throw Error('Empty audio effect');
                        this.buffers.set(sample.file, buffer);
                        this.failures.delete(sample.file);
                    }
                    catch (error) {
                        this.failures.set(sample.file, String(error));
                    }
                }
            }));
        }
        catch (error) {
            this.failures.set('manifest', String(error));
        }
    }
    sound(id, variant) { return this.buffers.get(`effects/${id}-${variant}.m4a`); }
}

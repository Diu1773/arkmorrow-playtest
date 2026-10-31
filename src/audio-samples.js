export const AUDIO_BYTE_LIMIT = 15_000_000;
export class SampleBank {
    manifest = null;
    buffers = new Map();
    failures = new Map();
    loading = null;
    base;
    ctx;
    constructor(ctx, base = new URL('../assets/audio/', import.meta.url)) { this.ctx = ctx; this.base = base; }
    async load() {
        if (this.loading)
            return this.loading;
        this.loading = this.read().finally(() => { this.loading = null; });
        return this.loading;
    }
    async read() {
        try {
            if (!this.manifest) {
                const response = await fetch(new URL('manifest.json', this.base));
                if (!response.ok)
                    throw Error(`Audio manifest: ${response.status}`);
                const manifest = await response.json();
                if (manifest.version !== 1 || !Array.isArray(manifest.instruments) || !Array.isArray(manifest.sounds) || !manifest.room)
                    throw Error('Invalid audio manifest');
                const entries = [...manifest.instruments, ...manifest.sounds, manifest.room];
                if (entries.some(s => !Number.isFinite(s.bytes) || s.bytes <= 0 || !/^(instruments\/[a-z0-9-]+|effects\/[a-z0-9-]+|room)\.m4a$/.test(s.file)) || entries.reduce((n, s) => n + s.bytes, 0) > AUDIO_BYTE_LIMIT)
                    throw Error('Invalid audio asset budget');
                this.manifest = manifest;
                this.failures.delete('manifest');
            }
            const entries = [...this.manifest.instruments, ...this.manifest.sounds, this.manifest.room].filter(s => !this.buffers.has(s.file));
            let index = 0;
            await Promise.all(Array.from({ length: 6 }, async () => {
                while (index < entries.length) {
                    const sample = entries[index++];
                    try {
                        const response = await fetch(new URL(sample.file, this.base));
                        if (!response.ok)
                            throw Error(`Audio sample: ${response.status}`);
                        const bytes = await response.arrayBuffer();
                        if (bytes.byteLength !== sample.bytes)
                            throw Error('Incomplete audio sample');
                        const buffer = await this.ctx.decodeAudioData(bytes);
                        if (!buffer.length || !Number.isFinite(buffer.duration))
                            throw Error('Empty audio sample');
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
    note(instrument, midi) {
        const samples = this.manifest?.instruments.filter(s => s.instrument === instrument) ?? [];
        const sample = samples.reduce((best, s) => !best || Math.abs(s.midi - midi) < Math.abs(best.midi - midi) ? s : best, undefined);
        if (!sample)
            return;
        const buffer = this.buffers.get(sample.file);
        if (!buffer)
            return;
        return { sample, buffer, pitch: 2 ** ((midi - sample.midi) / 12) };
    }
    sound(id, variant) { const sample = this.manifest?.sounds.find(s => s.id === id && s.variant === variant); return sample ? this.buffers.get(sample.file) : undefined; }
    get room() { return this.manifest ? this.buffers.get(this.manifest.room.file) : undefined; }
}

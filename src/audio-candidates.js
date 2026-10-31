import { candidateURL, loadAssignments, resolveAssignments, saveAssignments, validCatalogue, validClip } from './audio-assignments.js';
export class CandidateLibrary {
    catalogue = [];
    assignments = resolveAssignments(null, []);
    buffers = new Map();
    failures = new Set();
    loading = null;
    indexLoading = null;
    available = false;
    async loadIndex() {
        if (this.available)
            return;
        if (this.indexLoading)
            return this.indexLoading;
        this.indexLoading = (async () => { try {
            const response = await fetch(new URL('audio-candidates/index.json', new URL('../assets/', import.meta.url)));
            if (!response.ok)
                throw Error('Candidate index unavailable');
            const data = await response.json();
            if (!validCatalogue(data))
                throw Error('Invalid candidate index');
            this.catalogue = data.candidates;
            this.available = true;
            this.reload();
        }
        catch {
            this.catalogue = [];
            this.assignments = resolveAssignments(null, []);
        } })().finally(() => { this.indexLoading = null; });
        return this.indexLoading;
    }
    reload() { this.assignments = loadAssignments(this.catalogue); }
    assign(value) { this.assignments = resolveAssignments(value, this.catalogue); return saveAssignments(this.assignments); }
    clip(clip, kind) { return validClip(clip, this.catalogue, kind) ? this.catalogue.find(c => c.id === clip.candidate) : undefined; }
    music(track, intensity) { const list = this.assignments.tracks[track], clip = list[Math.min(list.length - 1, intensity - 1)], asset = this.clip(clip, 'music'); return asset ? { clip, asset } : undefined; }
    sounds(id) { return this.assignments.sounds[id].filter(c => this.clip(c, 'sound') && this.buffers.has(c.candidate)); }
    async loadSounds(ctx) {
        if (this.loading) {
            await this.loading;
            return this.loadSounds(ctx);
        }
        this.loading = (async () => {
            await this.loadIndex();
            const ids = [...new Set(Object.values(this.assignments.sounds).flat().map(c => c.candidate))].filter(id => !this.buffers.has(id) && !this.failures.has(id));
            let next = 0;
            await Promise.all(Array.from({ length: 4 }, async () => { while (next < ids.length) {
                const id = ids[next++], asset = this.catalogue.find(c => c.id === id && c.kind === 'sound');
                if (!asset)
                    continue;
                try {
                    const response = await fetch(candidateURL(asset));
                    if (!response.ok)
                        throw Error('Candidate unavailable');
                    const buffer = await ctx.decodeAudioData(await response.arrayBuffer());
                    if (!buffer.length || !Number.isFinite(buffer.duration))
                        throw Error('Empty candidate');
                    this.buffers.set(id, buffer);
                }
                catch {
                    this.failures.add(id);
                }
            } }));
        })().finally(() => { this.loading = null; });
        return this.loading;
    }
}

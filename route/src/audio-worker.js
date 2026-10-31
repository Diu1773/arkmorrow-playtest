import { synth } from './audio-score.js';
self.onmessage = (event) => {
    const { key, note } = event.data, samples = synth(note.instrument, note.midi, note.duration);
    self.postMessage({ key, samples }, { transfer: [samples.buffer] });
};

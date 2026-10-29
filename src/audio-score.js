export const TRACKS = [
    { id: 'nebula', bpm: 96, root: 43, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 8, 5, 10, 0, 3, 8, 7], motif: [0, 2, 4, 3, 2, 1, 3, 2] },
    { id: 'open', bpm: 110, root: 45, scale: [0, 2, 3, 5, 7, 9, 10], chords: [0, 5, 10, 3, 0, 5, 7, 0], motif: [0, 2, 3, 4, 2, 3, 1, 4] },
    { id: 'globular', bpm: 112, root: 40, scale: [0, 1, 3, 5, 7, 8, 10], chords: [0, 1, 0, 8, 5, 1, 8, 0], motif: [0, 1, 2, 1, 4, 3, 2, 1] },
    { id: 'milkyway', bpm: 104, root: 38, scale: [0, 2, 3, 5, 7, 9, 10], chords: [0, 5, 10, 3, 0, 5, 7, 0], motif: [0, 3, 4, 3, 2, 3, 1, 0] },
    { id: 'galaxies', bpm: 90, root: 41, scale: [0, 2, 3, 5, 7, 8, 10], chords: [0, 8, 3, 10, 5, 0, 8, 7], motif: [4, 3, 1, 2, 0, 1, 3, 0] },
    { id: 'expansion', bpm: 100, root: 43, scale: [0, 1, 3, 5, 7, 8, 10], chords: [0, 1, 5, 8, 0, 10, 8, 1], motif: [0, 1, 2, 3, 2, 4, 3, 4] },
    { id: 'boss', bpm: 118, root: 38, scale: [0, 1, 3, 5, 7, 8, 10], chords: [0, 1, 0, 8, 5, 1, 7, 0], motif: [0, 0, 1, 3, 0, 2, 1, 4] },
    { id: 'title', bpm: 92, root: 43, scale: [0, 2, 4, 7, 9], chords: [0, 5, 9, 7, 2, 5, 0, 7], motif: [0, 2, 3, 4, 3, 1, 2, 0] }
];
export const FORM_BARS = 80;
export const barSeconds = (id) => 240 / TRACKS.find(t => t.id === id).bpm;
export function musicIntensity(seconds, enemies, current = 1) {
    if (seconds >= 420 || enemies >= 650)
        return 3;
    if (current === 3 && (seconds >= 390 || enemies >= 520))
        return 3;
    if (seconds >= 150 || enemies >= 220)
        return 2;
    if (current >= 2 && (seconds >= 120 || enemies >= 160))
        return 2;
    return 1;
}
export function composeBar(id, bar, intensity) {
    const t = TRACKS.find(t => t.id === id), b = ((bar % FORM_BARS) + FORM_BARS) % FORM_BARS, section = Math.floor(b / 16), beat = 60 / t.bpm, notes = [];
    const chord = t.chords[(Math.floor(b / 2) + section) % 8], third = id === 'title' ? 4 : 3;
    const add = (instrument, midi, step, length, gain, pan = 0) => notes.push({ instrument, midi, time: step * beat, duration: length * beat, gain, pan });
    const breath = .94 + (b % 11) * .006;
    for (const [i, interval] of [0, third, 7, 10].entries())
        add('pad', t.root + chord + interval, 0, 3.95, .16 * breath * (id === 'galaxies' ? .8 : 1), (i - 1.5) * .22);
    const bassPattern = [[0, 2], [0, 1.5, 3], [0, .75, 2, 3.5], [0, 1, 2.5, 3.5], [0, 2, 3]][section];
    for (const [i, step] of bassPattern.entries())
        add('bass', t.root - 12 + chord + (i === bassPattern.length - 1 && b % 3 === 0 ? 7 : 0), step, .68, .46 * breath);
    if (intensity >= 2) {
        const stride = id === 'galaxies' ? 1 : .5, rotation = (b * 3 + section) % 8;
        for (let i = 0; i < 4 / stride; i++) {
            if ((i + b) % 7 === 0 && section % 2)
                continue;
            const degree = t.motif[(i + rotation) % 8], octave = section === 3 ? 12 : 0;
            add('arp', t.root + chord + t.scale[degree] + octave, i * stride, .42, .065 + (i % 3) * .006, Math.sin(i * 2 + b) * .45);
        }
        for (const step of id === 'boss' ? [0, 1.5, 2, 2.75] : b % 4 === 3 ? [0, 1.5, 2, 3.25] : [0, 2])
            add('kick', 32, step, .48, id === 'boss' ? .62 : .54);
        for (const step of [1, 3])
            add('snare', 45, step, .28, .3);
        for (let i = 0; i < 8; i++)
            if ((i + b) % 5 !== 0)
                add('hat', 60, i * .5, .09, i % 2 ? .06 : .04, (i % 2 ? 1 : -1) * .25);
    }
    if (intensity === 3) {
        const phrase = t.motif.map((n, i) => t.scale[t.motif[(i + section) % 8] ?? n]);
        for (let i = 0; i < 4; i++)
            if (!(b % 8 === 7 && i > 1))
                add('lead', t.root + chord + phrase[(b * 2 + i) % 8] + (section === 3 ? 12 : 0), i + (b % 3 === 0 ? .25 : 0), i === 3 ? 1.15 : .8, .11, Math.sin(b) * .16);
        for (const step of [1.75, 3.5])
            add('kick', 36, step, .25, .31);
        if (b % 4 === 3)
            for (const step of [2.75, 3.25, 3.75])
                add('snare', 50, step, .1, .12);
    }
    return notes;
}
export const SFX_IDS = ['pulse', 'orbit', 'missile', 'chain', 'laser', 'mine', 'fan', 'nova', 'kill', 'pickup', 'crystal', 'hurt', 'warning', 'level', 'evolve', 'chest', 'boss', 'clear', 'down', 'resonance', 'hover', 'click', 'back', 'buy', 'locked', 'start', 'air'];
export const SAMPLE_RATE = 32000;
export const frequency = (midi) => 440 * 2 ** ((midi - 69) / 12);
function finish(data, rate, wet) {
    const dry = data.slice();
    for (const [seconds, gain] of [[.047, .32], [.091, .23], [.149, .14], [.223, .08]]) {
        const offset = Math.round(seconds * rate);
        for (let i = offset; i < data.length; i++)
            data[i] += dry[i - offset] * wet * gain;
    }
    let noise = 17387;
    for (let tap = 0; tap < 24; tap++) {
        noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
        const white = noise / 2147483648, seconds = .013 + (tap + .5 + white * .3) / 24 * .12, offset = Math.round(seconds * rate), gain = white * Math.exp(-seconds * 24) * .09 * wet;
        for (let i = offset; i < data.length; i++)
            data[i] += dry[i - offset] * gain;
    }
    const fade = Math.round(rate * .018);
    for (let i = 0; i < data.length; i++)
        data[i] = Math.tanh(data[i] * 1.25) * .8 * Math.min(1, i / (rate * .002), (data.length - 1 - i) / fade);
    return data;
}
function saw(phase, step) { const p = phase % 1; let v = 2 * p - 1; if (p < step) {
    const t = p / step;
    v -= t + t - t * t - 1;
}
else if (p > 1 - step) {
    const t = (p - 1) / step;
    v -= t * t + t + t + 1;
} return v; }
export function synth(instrument, midi, duration, sampleRate = SAMPLE_RATE, variant = 0, noiseAmount = 0, sweep = 1) {
    const data = new Float32Array(Math.ceil(duration * sampleRate)), f = frequency(midi);
    let phase = 0, noise = 1973 + variant * 7919, low = 0, filter = 0;
    for (let i = 0; i < data.length; i++) {
        const time = i / sampleRate, p = time / duration;
        noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
        const white = noise / 2147483648;
        low += .16 * (white - low);
        const hz = instrument === 'kick' ? 39 + 125 * Math.exp(-time * 38) : f * (1 + (sweep - 1) * p);
        phase += hz / sampleRate;
        const sine = Math.sin(phase * Math.PI * 2), attack = Math.min(1, time / (instrument === 'pad' ? .11 : .004));
        let env = attack * Math.exp(-time / (instrument === 'pad' ? duration : instrument === 'bass' ? .19 : instrument === 'lead' ? .27 : instrument === 'kick' ? .115 : .075)), value = 0;
        if (instrument === 'pad') {
            value = (saw(phase, .99 * hz / sampleRate) + saw(phase * 1.004 + .17, hz * 1.004 / sampleRate) + saw(phase * .996 + .4, hz * .996 / sampleRate)) * .2;
            const cutoff = 320 + 950 * Math.sin(Math.PI * p) ** 2, alpha = 1 - Math.exp(-2 * Math.PI * cutoff / sampleRate);
            filter += alpha * (value - filter);
            value = filter;
            const cycle = (time / (duration / 3.95)) % 1;
            env = Math.sin(Math.PI * p) ** .65 * (.32 + .68 * (1 - Math.exp(-cycle * 9)));
        }
        else if (instrument === 'bass')
            value = sine * .78 + Math.sin(phase * Math.PI) * .12 + saw(phase, hz / sampleRate) * .1;
        else if (instrument === 'kick')
            value = sine * .92 + (white - low) * .13 * Math.exp(-time * 150);
        else if (instrument === 'snare')
            value = (white - low) * .48 + Math.sin(time * 2 * Math.PI * (165 - 80 * p)) * .5 * Math.exp(-time * 20);
        else if (instrument === 'hat')
            value = (white - low) * .48;
        else {
            value = saw(phase, hz / sampleRate) * .45 + sine * .35;
            const cutoff = instrument === 'arp' ? 650 : 1100;
            filter += (1 - Math.exp(-2 * Math.PI * cutoff / sampleRate)) * (value - filter);
            value = filter;
        }
        data[i] = (value * (1 - noiseAmount) + low * noiseAmount) * env;
    }
    return finish(data, sampleRate, instrument === 'pad' ? .55 : instrument === 'arp' || instrument === 'lead' ? .8 : .12);
}
export function soundDuration(id) { return { level: 1.1, evolve: 1.8, chest: 1.9, boss: 1.7, clear: 2.1, down: 1.4, start: 1, resonance: .6, warning: .4, hurt: .25, air: .09, pickup: .19, crystal: .32, kill: .18, nova: .32, mine: .28, missile: .23 }[id] ?? .14; }
const pitches = { pulse: 40, orbit: 37, missile: 30, chain: 48, laser: 39, mine: 28, fan: 43, nova: 25, kill: 35, pickup: 72, crystal: 60, hurt: 31, warning: 48, level: 43, evolve: 38, chest: 41, boss: 26, clear: 43, down: 30, resonance: 33, hover: 45, click: 40, back: 36, buy: 43, locked: 30, start: 36, air: 24 };
export function synthSound(id, variant, sampleRate = SAMPLE_RATE) {
    const duration = soundDuration(id), data = new Float32Array(Math.ceil(duration * sampleRate)), long = duration >= 1, f = frequency(pitches[id] + (variant - 2) * .24);
    let noise = 1709 + variant * 7919, low = 0, body = 0, sub = 0;
    for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
        const white = noise / 2147483648;
        const cutoff = id === 'air' ? 450 : id === 'chain' ? 2300 : 1100 * Math.exp(-t * 18) + 150;
        low += (1 - Math.exp(-2 * Math.PI * cutoff / sampleRate)) * (white - low);
        if (id === 'air') {
            data[i] = low * .12 * Math.sin(Math.PI * t / duration) ** 2;
            continue;
        }
        if (id === 'pickup' || id === 'crystal') {
            const env = (1 - Math.exp(-t * 400)) * Math.exp(-t * (id === 'pickup' ? 24 : 14)), fm = Math.sin(t * f * 2.71 * Math.PI * 2) * 1.3 * Math.exp(-t * 35);
            data[i] = (Math.sin(t * f * Math.PI * 2 + fm) * .37 + Math.sin(t * f * 4.07 * Math.PI * 2) * .075 * Math.exp(-t * 40)) * env;
            continue;
        }
        const offset = long ? .19 : 0, age = t - offset;
        if (long && t < offset)
            data[i] += low * .7 * (t / offset) ** 2;
        if (age < 0)
            continue;
        const fall = Math.exp(-age * (long ? 8 : 24)), hz = f * (.5 + 1.9 * Math.exp(-age * (long ? 17 : 36)));
        body += hz / sampleRate;
        sub += (long ? 43 : 48 + variant) / sampleRate;
        const transient = low * Math.exp(-age * (long ? 28 : 65)) * (id === 'chain' ? .95 : .65), core = Math.sin(body * Math.PI * 2) * fall * .48, bottom = Math.sin(sub * Math.PI * 2) * Math.exp(-age * (long ? 6 : 28)) * .32;
        data[i] += transient + core + bottom;
        if (long) {
            const padAge = Math.max(0, age - .06), padEnv = Math.min(1, padAge / .12) * Math.exp(-padAge * 2.6);
            for (const interval of [0, id === 'clear' ? 4 : 3, 7])
                data[i] += Math.sin(padAge * frequency(pitches[id] + 12 + interval) * Math.PI * 2) * padEnv * .075;
        }
    }
    return finish(data, sampleRate, long ? .7 : .22);
}

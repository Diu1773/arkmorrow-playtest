const minor = [0, 2, 3, 5, 7, 8, 10];
export const TRACKS = [
    { id: 'nebula', bpm: 92, root: 50, scale: minor, style: 'space' },
    { id: 'open', bpm: 100, root: 55, scale: minor, style: 'space' },
    { id: 'globular', bpm: 110, root: 52, scale: minor, style: 'pulse' },
    { id: 'milkyway', bpm: 96, root: 50, scale: minor, style: 'space' },
    { id: 'galaxies', bpm: 90, root: 53, scale: minor, style: 'space' },
    { id: 'expansion', bpm: 104, root: 55, scale: minor, style: 'pulse' },
    { id: 'boss', bpm: 118, root: 50, scale: minor, style: 'battle' },
    { id: 'title', bpm: 92, root: 50, scale: minor, style: 'title' },
    { id: 'launch', bpm: 108, root: 50, scale: minor, style: 'march' },
    { id: 'atmosphere', bpm: 112, root: 50, scale: minor, style: 'rise' },
    { id: 'refuge', bpm: 90, root: 50, scale: minor, style: 'solo' }
];
export const FORM_BARS = 40;
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
// The minor-third opening rises to a fifth before returning to the tonic.
export const THEME = [[0, 0, 1.5], [1.5, 3, .5], [2, 7, 1], [3, 5, .75], [4, 3, 1.5], [5.5, 2, .5], [6, 0, 1.8], [8, 0, 1], [9, 3, 1], [10, 10, 1.5], [11.5, 7, .5], [12, 5, 1.5], [13.5, 2, .5], [14, 0, 1.8]];
export function composeBar(id, bar, intensity) {
    const t = TRACKS.find(t => t.id === id), b = ((bar % FORM_BARS) + FORM_BARS) % FORM_BARS, section = Math.floor(b / 8), beat = 60 / t.bpm, notes = [];
    const harmony = [0, 0, 8, 8, 3, 3, 10, 7][b % 8], root = t.root + harmony + (section === 3 ? 5 : 0), battle = t.style === 'battle', march = t.style === 'march', solo = t.style === 'solo';
    const add = (instrument, midi, step, length, gain, pan = 0) => notes.push({ instrument, midi, time: step * beat, duration: length * beat, gain, pan });
    const upper = (midi) => { while (midi > 83)
        midi -= 12; return midi; };
    const themeBar = b % 4, themeRoot = t.root + 12 + (section === 3 ? 5 : 0);
    const melody = solo || t.style === 'title' ? 'harp' : section === 2 ? 'cello' : march || battle ? 'horn' : 'strings';
    for (const [step, interval, length] of THEME) {
        if (Math.floor(step / 4) !== themeBar)
            continue;
        add(melody, upper(themeRoot + interval - (section === 2 && !solo && t.style !== 'title' ? 12 : 0)), step % 4, length, solo ? .42 : .27, melody === 'strings' ? -.22 : .12);
    }
    if (solo) {
        if (b % 2 === 0)
            add('harp', root, 0, 3.4, .19, -.18);
    }
    else {
        add('cello', root - 12, 0, 3.7, .22, -.18);
        add('strings', upper(root + (harmony === 0 ? 3 : 4) + 12), .05, 3.7, .085, -.38);
        add('strings', upper(root + 7 + 12), .1, 3.6, .075, .38);
        if (march || battle) {
            add('timpani', 50, 0, .85, .36);
            add('drum', 36, 2, .6, .28);
        }
        if (t.style === 'space' || t.style === 'title')
            for (const [i, interval] of [0, 7, 12].entries())
                add('harp', upper(root + interval + 12), i * 1.25, .9, .14, (i - 1) * .45);
        if (section === 1 || section === 4)
            add('harp', upper(root + 7 + 12), 3.25, .55, .12, .35);
        if (t.style === 'rise')
            for (let i = 0; i < 4; i++)
                add('shortstrings', upper(t.root + 12 + t.scale[(b + i) % 7]), i, .65, .15, -.3 + i * .2);
    }
    if (intensity >= 2) {
        if (solo) {
            add('harp', root + 7, 1.75, 1, .13, .2);
            add('harp', root + 12, 3, 1, .12, -.2);
        }
        else {
            add('bass', root - 24, 0, 1.8, .2, .08);
            add('bass', root - 24, 2, 1.65, .18, .08);
            const stride = battle ? .25 : march || t.style === 'pulse' ? .5 : 1;
            for (let i = 0; i < 4 / stride; i++)
                add('shortstrings', upper(root + 12 + [0, 7, harmony === 0 ? 3 : 4, 7, 0, 12, 7, harmony === 0 ? 3 : 4][(i + b) % 8]), i * stride, stride * .72, .12, i % 2 ? .25 : -.25);
            if (!(t.style === 'space' && section === 2)) {
                for (const step of [1, 3])
                    add('snare', 60, step, .24, march ? .14 : .09);
                add('timpani', 50, 2.5, .8, .2);
            }
        }
    }
    if (intensity === 3) {
        if (solo) {
            add('harp', upper(themeRoot + 7), 3.5, .8, .1, .25);
        }
        else {
            add('horn', upper(root + 7), 0, 2.7, .19, .2);
            add('trombone', root - 12, 0, 1.4, .15, .3);
            add('trombone', root - 5, 2, 1.3, .13, .3);
            for (let i = 0; i < 4; i++)
                add('harp', upper(root + 12 + [0, harmony === 0 ? 3 : 4, 7, 12][i]), i + .5, .65, .12, (i - 1.5) * .24);
            if (b % 4 === 0)
                add('cymbal', 60, 0, 1.8, .1, .35);
            if (b % 4 === 3)
                for (const step of [2.5, 3, 3.5, 3.75])
                    add('timpani', 50, step, .22, .13);
        }
    }
    return notes;
}
export const SFX_IDS = ['pulse', 'orbit', 'missile', 'chain', 'laser', 'mine', 'fan', 'nova', 'kill', 'pickup', 'crystal', 'hurt', 'warning', 'level', 'evolve', 'chest', 'boss', 'clear', 'down', 'resonance', 'hover', 'click', 'back', 'buy', 'locked', 'start', 'air', 'blast', 'wave', 'spark', 'gravity', 'field', 'prepare', 'dash', 'footgrass', 'footstone', 'footmetal', 'footwater'];
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
export function soundDuration(id) { return { dash: .28, prepare: .12, blast: .48, wave: .55, spark: .16, gravity: .65, field: .24, level: 1.1, evolve: 1.8, chest: 1.9, boss: 1.7, clear: 2.1, down: 1.4, start: 1, resonance: .6, warning: .4, hurt: .25, air: .09, pickup: .19, crystal: .32, kill: .18, nova: .32, mine: .28, missile: .23 }[id] ?? .14; }
const pitches = { dash: 24, footgrass: 30, footstone: 30, footmetal: 30, footwater: 30, prepare: 43, blast: 23, wave: 27, spark: 48, gravity: 25, field: 32, pulse: 40, orbit: 37, missile: 30, chain: 48, laser: 39, mine: 28, fan: 43, nova: 25, kill: 35, pickup: 72, crystal: 60, hurt: 31, warning: 48, level: 43, evolve: 38, chest: 41, boss: 26, clear: 43, down: 30, resonance: 33, hover: 45, click: 40, back: 36, buy: 43, locked: 30, start: 36, air: 24 };
export function synthSound(id, variant, sampleRate = SAMPLE_RATE) {
    const duration = soundDuration(id), data = new Float32Array(Math.ceil(duration * sampleRate)), long = duration >= 1, f = frequency(pitches[id] + (variant - 2) * .24);
    let noise = 1709 + variant * 7919, low = 0, body = 0, sub = 0;
    for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        noise = (Math.imul(noise, 1664525) + 1013904223) | 0;
        const white = noise / 2147483648;
        const cutoff = id === 'air' ? 450 : id === 'chain' ? 2300 : 1100 * Math.exp(-t * 18) + 150;
        low += (1 - Math.exp(-2 * Math.PI * cutoff / sampleRate)) * (white - low);
        if (id === 'gravity') {
            const p = t / duration, env = Math.sin(p * Math.PI) ** .8;
            data[i] = (Math.sin(t * (42 + 70 * p * p) * Math.PI * 2) * .35 + low * .28) * env;
            continue;
        }
        if (id === 'wave') {
            data[i] = (Math.sin(t * 62 * Math.PI * 2 + Math.sin(t * 18) * 2) * .35 + low * .08) * Math.sin(Math.PI * t / duration) * Math.exp(-t * 3);
            continue;
        }
        if (id === 'spark') {
            data[i] = ((white - low) * .65 + Math.sin(t * 1800 * Math.PI * 2) * .12) * Math.exp(-t * 32) * (Math.sin(t * 270) > .1 ? 1 : .2);
            continue;
        }
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

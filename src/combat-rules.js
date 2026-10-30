export const FUSIONS = [
    { id: 'supernova', a: 'blackhole', b: 'bomb' },
    { id: 'thunderhead', a: 'tether', b: 'ripple' },
    { id: 'glassfall', a: 'frost', b: 'blade' },
    { id: 'reactor', a: 'flame', b: 'acid' },
];
export const canFuse = (id, weapons, time) => {
    const f = FUSIONS.find(f => f.id === id);
    return !!f && time >= 180 && [f.a, f.b].every(id => weapons.some(w => w.id === id && w.level >= 5 && !w.fusion));
};
export const emptyStatus = () => ({ burn: 0, freeze: 0, shock: 0, pull: 0, acid: 0, mark: 0, stun: 0, reactionCD: 0, dot: 0 });
export const REACTIONS = [
    { id: 'shatter', element: 'ice', weapons: ['frost', 'blade', 'nova', 'ripple', 'quake', 'resonance'] },
    { id: 'collapse', element: 'gravity', weapons: ['blackhole', 'mark', 'bomb', 'missile', 'mine'] },
    { id: 'arc', element: 'electric', weapons: ['chain', 'tether'] },
    { id: 'toxic', element: 'fire', weapons: ['flame', 'acid', 'bomb', 'mine'] },
    { id: 'steam', element: 'ice', weapons: ['flame', 'frost', 'blade', 'bomb'] },
    { id: 'overload', element: 'electric', weapons: ['chain', 'tether', 'bomb', 'missile', 'mine'] },
];
const reactionPairs = {
    shatter: [['frost', 'blade'], ['nova', 'ripple', 'quake', 'resonance']],
    collapse: [['blackhole', 'mark'], ['bomb', 'missile', 'mine']],
    arc: [['chain', 'tether'], ['chain', 'tether']],
    toxic: [['acid'], ['flame', 'bomb', 'missile', 'mine']],
    steam: [['flame', 'bomb', 'missile', 'mine'], ['frost', 'blade']],
    overload: [['chain', 'tether'], ['bomb', 'missile', 'mine']],
};
export function reactionReady(id, owned) { return reactionPairs[id].every(group => group.some(id => owned.includes(id))); }
export function weaponsReact(a, b) { return Object.values(reactionPairs).some(([left, right]) => left.includes(a) && right.includes(b) || left.includes(b) && right.includes(a)); }
export function reactionFor(s, weapon, element) {
    if (s.reactionCD > 0)
        return;
    if (s.freeze > 0 && ['nova', 'ripple', 'quake', 'resonance'].includes(weapon))
        return 'shatter';
    if (s.pull > 0 && ['bomb', 'missile', 'mine'].includes(weapon))
        return 'collapse';
    if (s.acid > 0 && element === 'fire' || s.burn > 0 && weapon === 'acid')
        return 'toxic';
    if (s.burn > 0 && element === 'ice' || s.freeze > 0 && element === 'fire')
        return 'steam';
    if (s.shock > 0 && ['bomb', 'missile', 'mine'].includes(weapon))
        return 'overload';
    if (s.shock > 0 && element === 'electric')
        return 'arc';
}

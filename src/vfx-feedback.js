const nextImpact = new WeakMap();
export function effectFeedback(sim, event) {
    const strong = event.kind === 'reaction' || event.kind === 'chest' && event.value >= 3;
    const heavy = event.kind === 'hit' && event.value >= 75;
    if ((!strong && !heavy) || sim.time < (nextImpact.get(sim) ?? 0))
        return;
    nextImpact.set(sim, sim.time + (strong ? .18 : .12));
    sim.requestHitStop(strong ? .018 : .006);
    sim.shake = Math.max(sim.shake, strong ? 3 : 1.5);
}

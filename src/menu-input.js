export function menuScope(app) {
    return app.querySelector('.meta-sheet,#story-dialogue,#deck-panel') ?? app.querySelector('#dialog') ?? app;
}
export function menuItems(app) {
    return Array.from(menuScope(app).querySelectorAll('button:not(:disabled),select,input,textarea,a[href],summary,[tabindex="0"]')).filter(el => !el.closest('[hidden],[inert]') && el.getAttribute('aria-disabled') !== 'true' && !el.closest('details:not([open]) :not(summary)'));
}
export function moveMenuFocus(app, direction) { const all = menuItems(app), index = all.indexOf(document.activeElement); all[index < 0 ? (direction < 0 ? all.length - 1 : 0) : (index + direction + all.length) % all.length]?.focus(); }
export function trapMenuTab(app, event) { if (event.code !== 'Tab' || menuScope(app) === app)
    return false; event.preventDefault(); moveMenuFocus(app, event.shiftKey ? -1 : 1); return true; }
export function menuBack(view, overlay, story, panel) {
    if (story)
        return 'story-skip';
    if (panel)
        return 'hub-close';
    if (overlay)
        return 'meta-close';
    if (view === 'intro')
        return 'enter-hub';
    if (view === 'chestIntro')
        return 'skip-chest';
    if (view === 'choice')
        return 'cancel-choice';
    if (view === 'evolution')
        return 'continue';
    if (view === 'result')
        return 'home';
    if (view === 'pause')
        return 'resume';
    if (view === 'practice')
        return 'hub-leave-practice';
    return view === 'title' ? '' : 'back';
}

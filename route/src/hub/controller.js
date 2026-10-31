import { CREW_SKILL, skillDef } from '../combat-catalog.js';
import { DeckState, places } from './model.js';
import { deckArt, deckCamera, portraitArt } from './art.js';
import { crewPanel, dialogueUI, unlockText } from './ui.js';
import { DialoguePlayer, pickDialogue, markSeen } from '../dialogue/model.js';
import { deckDetails, speakers } from '../dialogue/data.js';
import { CREW } from '../crew.js';
import { crewUnlocked } from '../chapters.js';
import { clamp } from '../core.js';
import { t } from '../i18n.js';
export function createDeckController(o) {
    const app = o.app, deck = new DeckState(o.save().crew), persist = o.persist, toast = o.toast;
    let storyPlayer = null, panelId = '', returnFlashUntil = 0, crewFlashUntil = 0;
    const tr = (key) => t(key, o.save().settings.lang);
    const btn = (act, label, style = '', extra = '') => `<button class="btn ${style}" data-act="${act}" ${extra}>${label}</button>`;
    function closeDeckPanel() { app.querySelector('#deck-panel')?.remove(); panelId = ''; deck.stop(); o.clearInput(); }
    function showDeckPanel(id, content) { closeDeckPanel(); panelId = id; app.insertAdjacentHTML('beforeend', `<div id="deck-panel" role="dialog" aria-modal="true"><section class="panel"><button class="btn small deck-close" data-act="hub-close">${tr('close')}</button>${content}</section></div>`); for (const ca of app.querySelectorAll('[data-portrait]'))
        portraitArt(ca, ca.dataset.portrait, 'normal'); app.querySelector('#deck-panel button')?.focus(); }
    function openStory(at) { const save = o.save(); const entry = pickDialogue(save.story, save.runs, at); if (!entry) {
        toast(save.settings.lang === 'ko' ? '지금은 조용하다.' : 'Quiet for now.');
        return;
    } closeDeckPanel(); deck.stop(); o.clearInput(); storyPlayer = new DialoguePlayer(entry); drawStory(); }
    function drawStory() { const save = o.save(); app.querySelector('#story-dialogue')?.remove(); if (!storyPlayer)
        return; app.insertAdjacentHTML('beforeend', dialogueUI(storyPlayer, save.settings.lang)); portraitArt(app.querySelector('#story-portrait'), storyPlayer.line.speaker, storyPlayer.line.expression); app.querySelector('[data-act=story-next]')?.focus(); }
    function deckAction(act, id = '') {
        const save = o.save();
        const ko = save.settings.lang === 'ko';
        if (act === 'hub-interact') {
            interact(id);
            return;
        }
        if (act === 'story-next' || act === 'story-skip') {
            if (!storyPlayer)
                return;
            if (act === 'story-skip' || storyPlayer.next(save.settings.lang)) {
                save.story = markSeen(save.story, storyPlayer.entry.id);
                persist();
                storyPlayer = null;
                app.querySelector('#story-dialogue')?.remove();
                app.querySelector('#deck-canvas')?.focus();
            }
            else
                drawStory();
            return;
        }
        if (act === 'hub-close') {
            closeDeckPanel();
            app.querySelector('#deck-canvas')?.focus();
            return;
        }
        if (act === 'hub-leave-practice') {
            o.open('title');
            return;
        }
        if (act === 'hub-switch') {
            if (!CREW.some(c => c.id === id))
                return;
            if (!deck.switchCrew(id, save.equipment.cleared)) {
                toast(unlockText(id, save.settings.lang));
                return;
            }
            save.crew = deck.crew;
            persist();
            closeDeckPanel();
            crewFlashUntil = performance.now() + 2000;
            return;
        }
        if (act === 'hub-talk') {
            if (!CREW.some(c => c.id === id))
                return;
            if (!crewUnlocked(id, save.equipment.cleared)) {
                toast(unlockText(id, save.settings.lang));
                return;
            }
            openStory(id);
            return;
        }
        if (act === 'hub-crew') {
            showDeckPanel('crew', crewPanel(save));
            return;
        }
        if (act === 'hub-launch') {
            closeDeckPanel();
            o.open('chapters');
            return;
        }
        if (act === 'hub-equipment') {
            closeDeckPanel();
            o.open('equipment');
            return;
        }
        if (act === 'hub-research') {
            closeDeckPanel();
            o.open('shop');
            return;
        }
        if (act === 'hub-records') {
            showDeckPanel('records', `<h2>${ko ? '기록 벽' : 'Record wall'}</h2><p>${ko ? '출격' : 'Runs'} ${save.runs} / ${ko ? '완료' : 'Clears'} ${save.wins}</p><p>${ko ? '귀환' : 'Returns'} ${save.story.returns} / ${ko ? '보스 처치' : 'Bosses defeated'} ${save.story.bosses}</p><p>${ko ? '커피잔은 분명 두 개였는데.' : 'There used to be two cups.'}</p><div class="record-notes">${deckDetails.slice(0, Math.min(3, save.story.returns + 1)).map((d, i) => `<span>${ko ? '관찰' : 'Observation'} ${i + 1}<br>${ko ? '커피잔' : 'Cups'} ${d.cups}<br>${d.graffiti}</span>`).join('')}</div>`);
            return;
        }
        if (act === 'hub-practice') {
            closeDeckPanel();
            o.open('practice');
            return;
        }
    }
    function interact(id) { const save = o.save(); if (CREW.some(c => c.id === id)) {
        showDeckPanel('crew', crewPanel(save));
        return;
    } if (id === 'window' || id === 'capsule') {
        openStory(id);
        return;
    } deckAction('hub-' + id); }
    function paintDeck(now, dt, active = true) {
        const save = o.save();
        const ca = app.querySelector('#deck-canvas');
        if (!ca)
            return;
        if (active && !panelId && !storyPlayer) {
            const arrived = deck.step(dt, o.input(), save.settings.movement === 'weighted');
            if (arrived)
                interact(arrived);
        }
        const camera = deckCamera(ca, deck);
        deckArt(ca, deck, save.equipment.cleared, save.story.returns, save.settings.reduced ? 0 : now / 1000, save.settings.lang, camera);
        const prompt = app.querySelector('#deck-prompt'), near = deck.nearby();
        if (prompt) {
            prompt.hidden = !active || !!panelId || !!storyPlayer || !near;
            if (near && !prompt.hidden) {
                const label = near.kind === 'crew' ? `${btn('hub-talk', save.settings.lang === 'ko' ? 'E 대화' : 'E Talk', 'small', `data-id="${near.id}"`)}${btn('hub-switch', crewUnlocked(near.id, save.equipment.cleared) ? save.settings.lang === 'ko' ? 'F 교대' : 'F Switch' : unlockText(near.id, save.settings.lang), 'small', `data-id="${near.id}"`)}` : btn('hub-interact', near[save.settings.lang], 'small', `data-id="${near.id}"`);
                if (prompt.innerHTML !== label)
                    prompt.innerHTML = label;
                prompt.style.left = `${clamp((deck.x - camera.x) / camera.w * 100, 18, 82)}%`;
                prompt.style.top = `${clamp((deck.y - camera.y - 48) / camera.h * 100, 8, 80)}%`;
            }
        }
        const name = app.querySelector('#deck-crew');
        if (name)
            name.textContent = speakers[save.crew].name;
        const code = app.querySelector('#return-code');
        if (code) {
            code.hidden = now >= returnFlashUntil;
            if (!code.hidden)
                code.textContent = deckDetails[save.story.returns % deckDetails.length].code;
        }
        const flash = app.querySelector('#crew-flash');
        if (flash) {
            flash.hidden = now >= crewFlashUntil;
            if (!flash.hidden) {
                const person = CREW.find(c => c.id === deck.crew);
                flash.textContent = person.name + ' / ' + skillDef(CREW_SKILL[person.id]).name;
            }
        }
        if (storyPlayer) {
            storyPlayer.tick(dt);
            const target = app.querySelector('#story-text');
            if (target)
                target.textContent = storyPlayer.visible(save.settings.lang);
        }
    }
    app.addEventListener('pointerdown', e => { const ca = e.target.closest('#deck-canvas'); if (!ca || !o.active() || storyPlayer || panelId)
        return; e.preventDefault(); const r = ca.getBoundingClientRect(), camera = deckCamera(ca, deck), point = { x: camera.x + (e.clientX - r.left) / r.width * camera.w, y: camera.y + (e.clientY - r.top) / r.height * camera.h }, target = [...places, ...deck.actors()].find(p => Math.hypot(point.x - p.x, point.y - p.y) < 27); deck.walkTo(target ?? point, target?.id ?? ''); ca.focus(); });
    return { deck, action: deckAction, paint: paintDeck, closePanel: closeDeckPanel, openStory,
        get storyPlayer() { return storyPlayer; }, get panelOpen() { return !!panelId; },
        resetOverlay() { panelId = ''; storyPlayer = null; },
        clearFlashes() { returnFlashUntil = crewFlashUntil = 0; },
        returnToCapsule() { deck.returnToCapsule(); returnFlashUntil = performance.now() + 800; } };
}

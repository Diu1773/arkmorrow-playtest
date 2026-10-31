import { CREW_SKILL, skillDef } from '../combat-catalog.js';
import { DeckState } from './model.js';
import { hubVariant } from './layouts.js';
import { deckArt, deckCamera, portraitArt } from './art.js';
import { overviewArt } from './ark-art.js';
import { crewPanel, dialogueUI, unlockText } from './ui.js';
import { DialoguePlayer, pickDialogue, markSeen } from '../dialogue/model.js';
import { deckDetails, speakers } from '../dialogue/data.js';
import { CREW } from '../crew.js';
import { crewUnlocked } from '../chapters.js';
import { t } from '../i18n.js';
export function createDeckController(o) {
    const app = o.app, deck = new DeckState(o.save().crew, hubVariant(location.search)), persist = o.persist, toast = o.toast;
    let storyPlayer = null, panelId = '', returnFlashUntil = 0, crewFlashUntil = 0;
    const tr = (key) => t(key, o.save().settings.lang);
    const btn = (act, label, style = '', extra = '') => `<button class="btn ${style}" data-act="${act}" ${extra}>${label}</button>`;
    function closeDeckPanel() { app.querySelector('#deck-panel')?.remove(); panelId = ''; deck.stop(); o.clearInput(); }
    function showDeckPanel(id, content) { closeDeckPanel(); panelId = id; app.insertAdjacentHTML('beforeend', `<div id="deck-panel" role="dialog" aria-modal="true"><section class="panel"><button class="btn small deck-close" data-act="hub-close">${tr('close')}</button>${content}</section></div>`); for (const ca of app.querySelectorAll('[data-portrait]')) {
        if (ca.dataset.sleeping) {
            const c = ca.getContext('2d');
            c.fillStyle = '#233441';
            c.fillRect(0, 0, 80, 80);
            c.fillStyle = '#536572';
            c.fillRect(20, 8, 40, 64);
            c.fillStyle = '#1f3e4b';
            c.fillRect(26, 14, 28, 46);
            c.fillStyle = '#e2a65a';
            c.fillRect(31, 65, 18, 3);
        }
        else
            portraitArt(ca, ca.dataset.portrait, 'normal');
    } app.querySelector('#deck-panel button')?.focus(); }
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
    } if (id.startsWith('room-')) {
        deckAction('hub-research');
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
        deck.setPortrait((ca.getBoundingClientRect().width || window.innerWidth) < 600);
        deck.syncRooms(save.rooms, now / 1000, save.settings.reduced);
        const camera = deckCamera(ca, deck);
        deckArt(ca, deck, save.equipment.cleared, save.story.returns, save.settings.reduced ? 0 : now / 1000, save.settings.lang, camera, save.rooms);
        const overview = app.querySelector('#deck-overview');
        if (overview)
            overviewArt(overview, deck, save.rooms);
        const restored = app.querySelector('#deck-restored');
        if (restored) {
            const n = Object.values(save.rooms).filter(r => r.restored).length;
            const text = save.settings.lang === 'ko' ? `방 복구 ${n}/6` : `Rooms ${n}/6`;
            if (restored.textContent !== text)
                restored.textContent = text;
        }
        const prompt = app.querySelector('#deck-prompt'), near = deck.nearby();
        if (prompt) {
            prompt.hidden = !active || !!panelId || !!storyPlayer || !near;
            if (near && !prompt.hidden) {
                const label = near.kind === 'crew' ? `${btn('hub-talk', save.settings.lang === 'ko' ? 'E 대화' : 'E Talk', 'small', `data-id="${near.id}"`)}${btn('hub-switch', crewUnlocked(near.id, save.equipment.cleared) ? save.settings.lang === 'ko' ? 'F 교대' : 'F Switch' : unlockText(near.id, save.settings.lang), 'small', `data-id="${near.id}"`)}` : btn('hub-interact', near[save.settings.lang], 'small', `data-id="${near.id}"`);
                if (prompt.innerHTML !== label)
                    prompt.innerHTML = label;
            }
        }
        const name = app.querySelector('#deck-crew');
        if (name && name.textContent !== speakers[save.crew].name)
            name.textContent = speakers[save.crew].name;
        const code = app.querySelector('#return-code');
        if (code) {
            code.hidden = now >= returnFlashUntil || now < crewFlashUntil;
            if (!code.hidden && code.textContent !== deckDetails[save.story.returns % deckDetails.length].code)
                code.textContent = deckDetails[save.story.returns % deckDetails.length].code;
        }
        const flash = app.querySelector('#crew-flash');
        if (flash) {
            flash.hidden = now >= crewFlashUntil;
            if (!flash.hidden) {
                const person = CREW.find(c => c.id === deck.crew);
                const text = person.name + ' / ' + skillDef(CREW_SKILL[person.id]).name;
                if (flash.textContent !== text)
                    flash.textContent = text;
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
        return; e.preventDefault(); const r = ca.getBoundingClientRect(), camera = deckCamera(ca, deck), point = { x: camera.x + (e.clientX - r.left) / r.width * camera.w, y: camera.y + (e.clientY - r.top) / r.height * camera.h }, target = deck.targetAt(point); deck.walkTo(target ?? point, target?.id ?? ''); ca.focus(); });
    return { deck, action: deckAction, paint: paintDeck, closePanel: closeDeckPanel, openStory,
        get storyPlayer() { return storyPlayer; }, get panelOpen() { return !!panelId; },
        resetOverlay() { panelId = ''; storyPlayer = null; if (deck.layout && !deck.layout.walkable(deck.x, deck.y))
            deck.returnToCapsule(); },
        clearFlashes() { returnFlashUntil = crewFlashUntil = 0; },
        returnToCapsule() { deck.returnToCapsule(); returnFlashUntil = performance.now() + 800; } };
}

import { BOSS_ENCOUNTERS, META, PASSIVES, SECTORS, SHIPS, WEAPONS } from './data.js';
import { SAVE_KEY, clamp, deadzone, defaultSave, metaCost, parseSave, purchase, refund, settle, unlockShip, weaponStats, xpNeeded } from './core.js';
import { Simulation } from './sim.js';
import { text, t } from './i18n.js';
import { icon } from './icons.js';
import { prepareShipFrames } from './pixel-art.js';
import * as cosmos from './cosmos.js';
import { AudioEngine } from './audio.js';
import { DEV } from './env.js';
import { TRACKS, SFX_IDS } from './audio-score.js';
import { fillStress } from './dev-scenes.js';
const app = document.querySelector('#app');
let storageRaw = null, storageReadFailed = false;
try {
    storageRaw = localStorage.getItem(SAVE_KEY);
}
catch {
    storageReadFailed = true;
}
const parsed = parseSave(storageRaw);
let save = parsed.save, view = 'title', sim = null, selectedSector = 0, difficulty = 'normal', offers = [], chest = false, banishing = false, returnView = 'title', shopReturn = 'title', preview = false;
const keys = new Set(), pointer = { down: false, aim: false, x: 0, y: 0 }, joy = { x: 0, y: 0, id: -1 }, audio = new AudioEngine(save.settings);
let lastEvolved = 'pulse', selectedMeta = 'output';
let hangarIndex = -1, resultAt = 0, stressPreview = false, chestUntil = 0, effectsTransparency = .25, largeProjectiles = true;
try {
    const raw = localStorage.getItem('cosmos-survivor.effects.v1');
    if (raw !== null && Number.isFinite(Number(raw)))
        effectsTransparency = clamp(Number(raw), 0, .9);
}
catch { /* Visual preferences can remain local to this session. */ }
try {
    largeProjectiles = localStorage.getItem('cosmos-survivor.projectiles.v1') !== '0';
}
catch { /* A missing visual preference uses the readable default. */ }
let dashPressed = false, toastUntil = 0, stamp = 0, acc = 0, hudTime = 0, hadPad = false, padBefore = [], padMoveAt = 0, evolveUntil = 0, fps = 60, showPerf = false, frames = 0, fpsAt = 0;
const V = { w: window.innerWidth, h: window.innerHeight, dpr: 1, scale: 1, camX: 2400, camY: 1600, time: 0, shake: 0, images: {} };
const tr = (key) => t(key, save.settings.lang), dict = () => text(save.settings.lang);
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const btn = (act, label, style = '', extra = '') => `<button class="btn ${style}" data-act="${act}" ${extra}>${label}</button>`;
const heading = (name, note = '', back = true) => `<div class="dialog-head"><div><h2>${name}</h2>${note ? `<p class="muted">${note}</p>` : ''}</div>${back ? btn('back', tr('back'), 'small') : ''}</div>`;
function toast(message) { let el = document.querySelector('#toast'); if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.role = 'status';
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
} el.textContent = message; el.className = 'show'; toastUntil = performance.now() + 3600; }
function persist() { if (preview || parsed.future || storageReadFailed)
    return; try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
}
catch {
    toast(tr('saveWarning'));
} }
function resetInput() { keys.clear(); pointer.down = pointer.aim = false; joy.x = joy.y = 0; joy.id = -1; dashPressed = false; acc = 0; }
function focusFirst() { (app.querySelector('[data-autofocus]:not(:disabled)') ?? app.querySelector('button:not(:disabled),select,input'))?.focus({ preventScroll: true }); }
function visibleEnemies() { return sim?.enemies.reduce((n, e) => n + Number(e.hp > 0 && !e.hidden && Math.abs(e.x - V.camX) < V.w / V.scale / 2 + e.r && Math.abs(e.y - V.camY) < V.h / V.scale / 2 + e.r), 0) ?? 0; }
function setView(next) { app.classList.remove('cue-skipped'); view = next; resetInput(); audio.setScene(view === 'settings' && sim ? 'pause' : view); if (view === 'playing' && sim)
    audio.combat(sim.sector, sim.time, visibleEnemies(), sim.enemies.some(e => e.type === 'boss' && e.hp > 0)); drawUI(); }
function shipCanvas(id, large = false) { return `<canvas class="${large ? 'hero-ship' : 'ship-preview'}" data-ship="${id}" width="${large ? 432 : 96}" height="${large ? 336 : 96}" aria-label="${esc(dict().shipNames[SHIPS.findIndex(s => s.id === id)])}"></canvas>`; }
function drawShips() { for (const c of app.querySelectorAll('[data-ship]'))
    cosmos.snapshotShip(c.dataset.ship, c); }
function titleUI() {
    const d = dict(), si = hangarIndex < 0 ? SHIPS.findIndex(s => s.id === save.ship) : hangarIndex, selected = SHIPS[si], locked = !save.ships.includes(selected.id), points = [[15, 73], [36, 46], [17, 18], [61, 19], [83, 47], [66, 76]];
    return `<main id="menu"><div class="menu-wrap">
 <header class="menu-header"><span class="small-brand">COSMOS</span><div class="header-actions"><span class="wallet">${icon('shards')}<b>${save.shards}</b></span>${btn('shop', tr('shop'))}${btn('settings', tr('settings'), 'quiet')}</div></header>
 <section class="title-stage"><div class="hangar"><div class="title-mark"><h1 class="title-logo"><img src="./assets/pixel/logo.png" width="512" height="144" alt=""><span class="sr-only">COSMOS</span></h1><p>${tr('subtitle')}</p></div><div class="hangar-bay">${btn('ship-prev', '&#9664;', 'hangar-arrow', `aria-label="${tr('previousShip')}"`)}${shipCanvas(selected.id, true)}${btn('ship-next', '&#9654;', 'hangar-arrow', `aria-label="${tr('nextShip')}"`)}</div><div class="hangar-caption"><div><span class="ship-role">${d.shipRoles[si]}</span><h2>${d.shipNames[si]}</h2></div><div class="ship-spec"><span>${tr('hp')} <b>${Math.round(selected.hp + save.meta.hull * 12)}</b></span><span>${tr('move')} <b>${selected.speed}</b></span></div>${locked ? btn('ship', icon('lock') + ' ' + selected.cost, 'unlock-hangar', `data-id="${selected.id}"`) : ''}</div></div>
 <div class="flight-chart panel"><div class="section-title"><h2>${tr('sectorSelect')}</h2></div><div class="starmap"><canvas class="chart-lines" width="240" height="200" aria-hidden="true"></canvas>${SECTORS.map((sector, i) => `<button class="route-card ${selectedSector === i ? 'selected' : ''} ${i > save.unlocked ? 'locked' : ''}" style="--x:${points[i][0]}%;--y:${points[i][1]}%" data-act="sector" data-id="${i}" aria-disabled="${i > save.unlocked}" aria-pressed="${selectedSector === i}"><span class="route-planet"><img src="./assets/pixel/photos/${sector.image.replace('.jpg', '.png')}" width="48" height="48" alt="">${i > save.unlocked ? icon('lock') : ''}</span><b>${d.sectorNames[i]}</b></button>`).join('')}</div><div class="flight-info"><h3>${d.sectorNames[selectedSector]}</h3><span>${tr('minutes')}</span></div><div class="launch-panel"><label><span class="sr-only">${tr('difficulty')}</span><select id="difficulty" aria-label="${tr('difficulty')}">${['easy', 'normal', 'hard'].map(k => `<option value="${k}" ${difficulty === k ? 'selected' : ''}>${tr(k)}</option>`).join('')}</select></label>${btn('start', tr('launch'), 'primary launch', `data-autofocus ${locked ? 'disabled' : ''}`)}</div></div></section>
 <footer class="title-footer"><a href="/CREDITS.md" target="_blank" rel="noopener">${tr('credits')}</a></footer></div></main>`;
}
function drawChart() { const ca = app.querySelector('.chart-lines'); if (!ca)
    return; const c = ca.getContext('2d'), points = [[36, 146], [86, 92], [41, 36], [146, 38], [199, 94], [158, 152]]; c.imageSmoothingEnabled = false; c.clearRect(0, 0, 240, 200); for (let i = 0; i < 70; i++) {
    c.fillStyle = i % 3 ? '#424c60' : '#6d7785';
    c.fillRect((i * 67 + 19) % 240, (i * 31 + 11) % 200, 1, 1);
} for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1], [ex, ey] = points[i], steps = Math.max(Math.abs(ex - x), Math.abs(ey - y));
    c.fillStyle = i <= save.unlocked ? '#a58b5e' : '#414d60';
    for (let n = 0; n <= steps; n++)
        if (Math.floor(n / 4) % 2 === 0)
            c.fillRect(Math.round(x + (ex - x) * n / steps), Math.round(y + (ey - y) * n / steps), 1, 1);
} }
function hudUI() { return `<section id="hud" aria-label="${tr('hp')}"><div class="mission-box panel"><h2 id="hud-sector"></h2><div class="run-progress"><i id="run-fill"></i></div></div><div class="hud-actions">${btn('pause', '&#8545;', 'icon-btn', `aria-label="${tr('pause')}"`)}${btn('fullscreen', tr('fullscreen'), 'small')}</div><div id="upgrade-chips"></div><div class="minimap-wrap panel"><div><span>${tr('minimap')}</span><span id="map-time"></span></div><canvas id="minimap" width="90" height="60" aria-label="${tr('minimap')}"></canvas></div><div id="bossbar" class="panel" hidden><div><b id="boss-name"></b><span id="boss-phase"></span></div><div class="meter"><i id="boss-fill"></i></div></div><div id="incoming" class="panel" hidden><span id="incoming-kind"></span><b id="incoming-count"></b><small>${tr('safe')}</small></div><div id="danger-label" hidden>${tr('warning')}</div><div id="objective-label"></div><div class="status-box panel" id="status-box"><div class="lv-badge"><small>${tr('level')}</small><b id="hud-level"></b></div><div class="bars"><div class="bar-row"><span>${tr('hp')}</span><div class="meter hp"><i id="hp-fill"></i><em id="hud-hp"></em></div></div><div class="bar-row"><span>${tr('xp')}</span><div class="meter xp"><i id="xp-fill"></i><em id="hud-xp"></em></div></div></div><div class="ship-tag"><b id="hud-ship"></b><span id="hud-time"></span></div></div><div id="joystick" role="group" aria-label="${tr('move')}"><div id="stick"></div><span>${tr('move')}</span></div><button id="dash-btn" aria-label="${tr('dash')}"><b>&#8599;</b><span id="dash-text">${tr('dash')}</span></button><span id="perf" hidden></span></section>`; }
function choiceText(c) { const d = dict(); if (c.kind === 'boost') {
    const i = ['damage', 'hull', 'reach'].indexOf(c.id);
    return { name: d.boostNames[i], desc: '', rank: 0, new: false, kind: d.boost, icon: icon(['power', 'hull', 'magnet'][i]) };
} if (c.kind === 'weapon' || c.kind === 'evolve') {
    const i = WEAPONS.findIndex(w => w.id === c.id), w = WEAPONS[i], slot = sim.weapons.find(w => w.id === c.id);
    return { name: c.kind === 'evolve' ? d.evolutionNames[i] : d.weaponNames[i], desc: c.kind === 'evolve' ? d.evolutionDescriptions[i] : d.weaponDescriptions[i], rank: c.kind === 'evolve' ? 5 : (slot?.level ?? 0) + 1, new: !slot, kind: tr(c.kind === 'evolve' ? 'evolution' : 'weapon'), icon: icon(w.id, c.kind === 'evolve') };
} if (c.kind === 'passive') {
    const i = PASSIVES.findIndex(p => p.id === c.id), p = PASSIVES[i], lv = sim.passives[p.id] ?? 0;
    return { name: d.passiveNames[i], desc: d.passiveDescriptions[i], rank: lv + 1, new: !lv, kind: tr('passive'), icon: icon(p.id) };
} return { name: tr(c.kind === 'heal' ? 'heal' : 'dustBonus'), desc: tr(c.kind === 'heal' ? 'healDesc' : 'dustDesc'), rank: 0, new: false, kind: tr('chest'), icon: icon(c.kind === 'heal' ? 'heal' : 'shards') }; }
const pips = (level) => `<span class="rank-pips" aria-label="${tr('level')} ${level}">${Array.from({ length: 5 }, (_, i) => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</span>`;
function choiceChange(c) {
    const d = dict(), s = sim, value = (key, n) => d[key].replace('{n}', String(n));
    if (c.kind === 'boost') {
        const i = ['damage', 'hull', 'reach'].indexOf(c.id), key = c.id;
        return { rank: `${d.stacked} ${s.boosts[key]} → ${s.boosts[key] + 1}`, gain: d.boostDescriptions[i] };
    }
    if (c.kind === 'evolve')
        return { rank: d.max + ' → ' + d.evolution, gain: d.evolutionDescriptions[WEAPONS.findIndex(w => w.id === c.id)] };
    if (c.kind === 'passive') {
        const level = s.passives[c.id] ?? 0;
        return { rank: `${d.lv} ${level} → ${Math.min(5, level + 1)}${level >= 4 ? ' / ' + d.max : ''}`, gain: d.passiveGains[PASSIVES.findIndex(p => p.id === c.id)] };
    }
    if (c.kind === 'weapon') {
        const slot = s.weapons.find(w => w.id === c.id), level = slot?.level ?? 0, next = { id: c.id, level: Math.min(5, level + 1), evolved: slot?.evolved ?? false, timer: 0 }, after = weaponStats(next, s.attributes), bits = [];
        if (slot) {
            const before = weaponStats(slot, s.attributes);
            bits.push(value('damageGain', Math.round((after.damage / before.damage - 1) * 100)), value('delayGain', Math.round((1 - after.cooldown / before.cooldown) * 100)));
            const extra = c.id === 'pulse' || c.id === 'missile' ? after.count - before.count : c.id === 'orbit' && level === 2 ? 1 : 0;
            if (extra)
                bits.push(value('shotGain', extra));
        }
        else
            bits.push(value('initialDamage', Math.round(after.damage)), value('everySeconds', Number(after.cooldown.toFixed(2))));
        return { rank: `${d.lv} ${level} → ${next.level}${next.level === 5 ? ' / ' + d.max : ''}`, gain: bits.join(' / ') };
    }
    return { rank: '', gain: '' };
}
function choiceUI() { return heading(chest ? tr('chest') : tr('levelup'), banishing ? tr('banishHint') : tr('pick'), false) + `<div class="upgrade-grid">${offers.map((c, i) => { const x = choiceText(c), change = choiceChange(c); return `<button class="upgrade-card ${c.kind === 'evolve' ? 'evolve-card' : c.kind === 'passive' ? 'passive-card' : 'weapon-card'}" data-act="choose" data-id="${i}" style="--order:${i}" ${banishing && !['weapon', 'passive'].includes(c.kind) ? 'disabled' : ''}><div class="card-cap"><span>${x.kind}</span><kbd>${i + 1}</kbd></div><div class="item-portrait">${x.icon}${x.new ? '<b class="new-tag">NEW</b>' : ''}</div><h3>${x.name}</h3>${x.rank ? pips(x.rank) : ''}<p class="card-level">${change.rank}</p><p>${x.desc}</p><p class="upgrade-gain">${change.gain}</p></button>`; }).join('')}</div><div class="button-row">${btn('reroll', tr('reroll') + ` (${sim.rerolls})`, '', sim.rerolls <= 0 ? 'disabled' : '')}${btn('skip-cue', tr('skipCue'), 'quiet')}${btn('banish', tr(banishing ? 'cancel' : 'banish') + ` (${sim.banishes})`, 'quiet', sim.banishes <= 0 ? 'disabled' : '')}</div>`; }
function shopUI() { const d = dict(), selected = META.find(m => m.id === selectedMeta), mi = META.indexOf(selected), lv = save.meta[selected.id], cost = metaCost(selected.id, lv); return heading(tr('shop')) + `<div class="shop-workbench"><div class="shop-wall"><div class="shop-balance wallet">${icon('shards')}<b>${save.shards}</b></div><div class="shop-grid">${META.map((m, i) => `<button class="shop-card ${selectedMeta === m.id ? 'selected' : ''}" data-act="inspect" data-id="${m.id}" aria-label="${d.metaNames[i]}" aria-pressed="${selectedMeta === m.id}">${icon(m.icon)}${pips(save.meta[m.id])}</button>`).join('')}</div></div><section class="shop-detail"><div class="detail-portrait">${icon(selected.icon)}</div><h3>${d.metaNames[mi]}</h3><p>${d.metaDescriptions[mi]}</p>${pips(lv)}<div class="shop-price">${icon('shards')}<b>${lv >= 5 ? tr('soldOut') : cost}</b></div>${btn('buy', tr('buy'), 'primary', `data-id="${selected.id}" ${lv >= 5 || save.shards < cost ? 'disabled' : ''}`)}</section></div><div class="section-title"><h3>${tr('ships')}</h3></div><div class="shop-ships">${SHIPS.map((ship, i) => `<div class="shop-ship">${shipCanvas(ship.id)}<b>${d.shipNames[i]}</b>${btn('unlock', save.ships.includes(ship.id) ? tr('owned') : icon('shards') + String(ship.cost), 'small', `data-id="${ship.id}" ${save.ships.includes(ship.id) || save.shards < ship.cost ? 'disabled' : ''}`)}</div>`).join('')}</div><div class="button-row">${btn('refund', tr('refund'), 'quiet')}<small>${tr('refundHint')}</small></div>`; }
function settingsUI() { return heading(tr('settings')) + `<div class="settings-list">${['volume', 'music', 'sfx', 'shake'].map(k => `<label class="setting-row"><span>${tr(k)}</span><input type="range" min="0" max="1" step=".05" value="${save.settings[k]}" data-setting="${k}"><output data-output="${k}">${Math.round(save.settings[k] * 100)}%</output></label>`).join('')}<label class="setting-row"><span>${tr('language')}</span><select data-setting="lang"><option value="ko" ${save.settings.lang === 'ko' ? 'selected' : ''}>${tr('korean')}</option><option value="en" ${save.settings.lang === 'en' ? 'selected' : ''}>${tr('english')}</option></select></label>${['reduced', 'numbers'].map(k => `<label class="setting-row"><span>${tr(k)}</span><input type="checkbox" data-setting="${k}" ${save.settings[k] ? 'checked' : ''}></label>`).join('')}<label class="setting-row"><span>${tr('largeProjectiles')}</span><input type="checkbox" data-setting="largeProjectiles" ${largeProjectiles ? 'checked' : ''}></label><label class="setting-row"><span>${tr('effectsTransparency')}</span><input type="range" min="0" max=".9" step=".05" value="${effectsTransparency}" data-setting="effectsTransparency"><output data-output="effectsTransparency">${Math.round(effectsTransparency * 100)}%</output></label></div><details class="control-guide"><summary>${tr('howToPlay')}</summary><p>${esc(tr('controls'))}</p><p>${esc(tr('pointerHint'))}</p><p>${esc(tr('evolveHint'))}</p><div class="evolution-guide">${WEAPONS.map((w, i) => `<p>${dict().weaponNames[i]} + ${dict().passiveNames[PASSIVES.findIndex(p => p.id === w.passive)]}<br>→ ${dict().evolutionNames[i]}</p>`).join('')}</div>${dict().sectorNames.map((name, i) => `<p><b>${name}</b><br>${esc(dict().sectorDescriptions[i])}</p>`).join('')}</details><p class="note">${tr('saveHint')}</p><a href="/CREDITS.md" target="_blank" rel="noopener">${tr('credits')}</a>`; }
function resultUI() { const r = sim.result(), d = dict(); resultAt = performance.now(); return `<div class="result-heading"><div class="result-stamp ${r.won ? 'cleared' : 'down'}"><h2>${tr(r.won ? 'victory' : 'defeat')}</h2></div><span>${d.sectorNames[r.sector]}</span><div class="result-wallet wallet">${icon('shards')}<b data-tally="${save.shards}" data-delay=".8">0</b></div></div><div class="result-ship">${shipCanvas(save.ship)}</div><div class="report-stats"><div><b data-tally="${Math.floor(r.time)}" data-clock="true" data-delay="0">00:00</b><span>${tr('survived')}</span></div><div><b data-tally="${r.kills}" data-delay=".2">0</b><span>${tr('kills')}</span></div><div><b data-tally="${r.evolutions}" data-delay=".4">0</b><span>${tr('evolution')}</span></div></div><div class="reward">${icon('shards')}<span>${tr('earned')}</span><b data-tally="${r.earned}" data-delay=".6">0</b>${Array.from({ length: 6 }, (_, i) => `<span class="dust-flight" style="--order:${i}">${icon('shards')}</span>`).join('')}</div>${r.won && r.sector < 5 ? `<p class="new-sector">${tr('nextOpen')}</p>` : ''}<div class="button-row">${btn('shop', tr('shop'), 'primary', 'data-autofocus')}${btn('retry', tr('retry'))}${btn('home', tr('home'), 'quiet')}${btn('skip-cue', tr('skipCue'), 'quiet')}</div>`; }
function animateResults(now) { if (view !== 'result')
    return; for (const el of app.querySelectorAll('[data-tally]')) {
    const n = Number(el.dataset.tally), f = save.settings.reduced ? 1 : clamp((now - resultAt) / 1000 - Number(el.dataset.delay), 0, 1), value = Math.round(n * (1 - (1 - f) ** 3));
    el.textContent = el.dataset.clock ? clock(value) : String(value);
} }
function aimDust() { if (view !== 'result')
    return; const wallet = app.querySelector('.result-wallet')?.getBoundingClientRect(), reward = app.querySelector('.reward')?.getBoundingClientRect(); if (!wallet || !reward)
    return; for (const el of app.querySelectorAll('.dust-flight')) {
    el.style.setProperty('--fly-x', `${Math.round(wallet.left + wallet.width / 2 - reward.left - reward.width * .48)}px`);
    el.style.setProperty('--fly-y', `${Math.round(wallet.top + wallet.height / 2 - reward.top - 25)}px`);
} }
function soundUI() { return heading(tr('soundRoom')) + `<p>${tr('soundHint')}</p><div class="sound-tracks">${TRACKS.map((track, i) => `<div><b>${dict().trackNames[i]}</b>${[1, 2, 3].map(level => btn('sound-track', tr('intensity') + ' ' + level, 'small', `data-id="${track.id}:${level}"`)).join('')}</div>`).join('')}</div><div class="sound-effects">${SFX_IDS.map((id, i) => btn('sound-fx', dict().soundNames[i], 'small', `data-id="${id}"`)).join('')}</div><div class="button-row">${btn('sound-stop', tr('stopSound'))}${btn('settings', tr('settings'))}</div>`; }
function drawUI() {
    document.documentElement.lang = save.settings.lang;
    document.documentElement.classList.toggle('motion-reduced', save.settings.reduced);
    document.title = tr('title') + ' - ' + tr('subtitle');
    if (view === 'title') {
        app.innerHTML = titleUI();
        drawShips();
        drawChart();
        focusFirst();
        return;
    }
    if (view === 'playing') {
        app.innerHTML = hudUI();
        cosmos.resize(V.w, V.h, V.dpr, 'auto');
        updateHUD();
        return;
    }
    let content = '';
    if (view === 'choice')
        content = choiceUI();
    if (view === 'sound')
        content = soundUI();
    if (view === 'chestIntro')
        content = `<div class="chest-signal"><h2>${tr('signalLock')}</h2><div class="signal-rings">${icon('chest')}</div>${btn('skip-chest', tr('skipCue'), 'primary', 'data-autofocus')}</div>`;
    if (view === 'pause')
        content = heading(tr('pause'), '', false) + `<div class="pause-buttons">${btn('resume', tr('resume'), 'primary', 'data-autofocus')}${btn('settings', tr('settings'))}${btn('abandon', tr('abandon'), 'danger')}</div>`;
    if (view === 'settings')
        content = settingsUI();
    if (view === 'shop')
        content = shopUI();
    if (view === 'result')
        content = resultUI();
    if (view === 'evolution') {
        const slot = sim.weapons.find(w => w.id === lastEvolved), i = WEAPONS.findIndex(w => w.id === slot?.id);
        content = `<div class="evolution-show"><div class="evolution-icon">${icon(slot?.id ?? 'pulse', true)}</div><h2>${tr('evolved')}</h2><h3>${dict().evolutionNames[Math.max(0, i)]}</h3><p>${dict().evolutionDescriptions[Math.max(0, i)]}</p>${btn('continue', tr('resume'), 'primary', 'data-autofocus')}</div>`;
    }
    app.innerHTML = `<div id="overlay"><section id="dialog" class="${view === 'shop' ? 'wide' : ''} ${view}-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${content}</section></div>`;
    const h = app.querySelector('h2');
    if (h)
        h.id = 'dialog-title';
    drawShips();
    aimDust();
    animateResults(performance.now());
    focusFirst();
}
function start() { if (selectedSector > save.unlocked || (hangarIndex >= 0 && !save.ships.includes(SHIPS[hangarIndex].id)))
    return; audio.unlock(); audio.ui('start'); sim = new Simulation(save.ship, save.meta, Date.now(), undefined, selectedSector, difficulty); V.camX = sim.player.x; V.camY = sim.player.y; setView('playing'); }
function openChoice() { if (!sim || sim.status !== 'playing')
    return; if (!sim.pendingLevels && !sim.pendingChests) {
    setView('playing');
    return;
} chest = sim.pendingChests > 0; banishing = false; offers = sim.offers(chest); if (chest) {
    chestUntil = performance.now() + 2300;
    setView('chestIntro');
}
else
    setView('choice'); }
function choose(index) { if (view !== 'choice' || !offers[index] || !sim)
    return; if (banishing) {
    if (sim.banish(offers[index])) {
        offers = sim.offers(chest, offers);
        banishing = false;
        drawUI();
    }
    return;
} const evolved = offers[index].kind === 'evolve'; if (!sim.apply(offers[index], chest))
    return; audio.skipCue(); audio.ui(); if (evolved) {
    lastEvolved = offers[index].id;
    audio.consume(sim.events);
    sim.events.length = 0;
    evolveUntil = performance.now() + 1500;
    setView('evolution');
}
else
    openChoice(); }
function finish() { if (!sim)
    return; save = settle(save, sim.result()); persist(); audio.play(sim.status === 'won' ? 'clear' : 'down'); setView('result'); }
function action(act, id = '') {
    if (act === 'sound-track') {
        const [track, level] = id.split(':');
        if (TRACKS.some(t => t.id === track) && [1, 2, 3].includes(Number(level)))
            audio.previewTrack(track, Number(level));
        return;
    }
    if (act === 'sound-fx') {
        if (SFX_IDS.includes(id))
            audio.play(id);
        return;
    }
    if (act === 'sound-stop') {
        audio.stop();
        return;
    }
    if (act === 'skip-chest') {
        audio.skipCue();
        setView('choice');
        return;
    }
    if (act === 'skip-cue') {
        audio.skipCue();
        resultAt = performance.now() - 5000;
        app.classList.add('cue-skipped');
        document.getElementById('cue-skip')?.remove();
        return;
    }
    if (act === 'start' || act === 'retry') {
        start();
        return;
    }
    if (act === 'home') {
        setView('title');
        return;
    }
    if (act === 'ship-prev' || act === 'ship-next') {
        const current = hangarIndex < 0 ? SHIPS.findIndex(s => s.id === save.ship) : hangarIndex;
        hangarIndex = (current + (act === 'ship-next' ? 1 : -1) + SHIPS.length) % SHIPS.length;
        const ship = SHIPS[hangarIndex];
        if (save.ships.includes(ship.id)) {
            save.ship = ship.id;
            persist();
        }
        drawUI();
        app.querySelector(`[data-act=${act}]`)?.focus({ preventScroll: true });
        return;
    }
    if (act === 'inspect') {
        if (META.some(m => m.id === id))
            selectedMeta = id;
        drawUI();
        app.querySelector(`[data-act=inspect][data-id=${selectedMeta}]`)?.focus({ preventScroll: true });
        return;
    }
    if (act === 'ship') {
        if (save.ships.includes(id)) {
            save.ship = id;
            persist();
            drawUI();
        }
        else {
            shopReturn = 'title';
            setView('shop');
        }
        return;
    }
    if (act === 'sector') {
        const n = Number(id);
        if (n > save.unlocked) {
            audio.ui('locked');
            toast(tr('clearFirst'));
            return;
        }
        selectedSector = n;
        drawUI();
        return;
    }
    if (act === 'settings') {
        returnView = view === 'playing' ? 'pause' : view;
        setView('settings');
        return;
    }
    if (act === 'shop') {
        shopReturn = view;
        setView('shop');
        return;
    }
    if (act === 'back') {
        audio.ui('back');
        setView(view === 'settings' ? returnView : view === 'shop' ? shopReturn : 'title');
        return;
    }
    if (act === 'pause' && view === 'playing') {
        setView('pause');
        return;
    }
    if (act === 'resume') {
        setView('playing');
        return;
    }
    if (act === 'abandon') {
        sim?.end();
        finish();
        return;
    }
    if (act === 'choose') {
        choose(Number(id));
        return;
    }
    if (act === 'reroll' && sim && sim.rerolls > 0) {
        sim.rerolls--;
        offers = sim.offers(chest, offers);
        banishing = false;
        drawUI();
        return;
    }
    if (act === 'banish') {
        banishing = !banishing;
        drawUI();
        return;
    }
    if (act === 'continue') {
        audio.skipCue();
        openChoice();
        return;
    }
    if (act === 'buy') {
        audio.ui('buy');
        save = purchase(save, id);
        persist();
        drawUI();
        return;
    }
    if (act === 'unlock') {
        audio.ui('buy');
        save = unlockShip(save, id);
        if (SHIPS[hangarIndex]?.id === id && save.ships.includes(id))
            save.ship = id;
        persist();
        drawUI();
        return;
    }
    if (act === 'refund') {
        save = refund(save);
        persist();
        drawUI();
        return;
    }
    if (act === 'fullscreen')
        document.documentElement.requestFullscreen?.().catch(() => { });
}
function updateHUD() {
    if (!sim || view !== 'playing')
        return;
    const p = sim.player, d = dict(), set = (id, value) => { const el = document.getElementById(id); if (el && el.textContent !== value)
        el.textContent = value; }, fill = (id, value) => { const el = document.getElementById(id); if (el)
        el.style.width = `${clamp(value, 0, 1) * 100}%`; };
    set('hud-sector', d.sectorNames[sim.sector]);
    fill('run-fill', sim.time / 600);
    set('hud-level', String(sim.level));
    set('hud-hp', `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`);
    fill('hp-fill', p.hp / p.maxHp);
    fill('xp-fill', sim.xp / xpNeeded(sim.level));
    set('hud-xp', `${Math.floor(sim.xp / xpNeeded(sim.level) * 100)}%`);
    set('hud-ship', d.shipNames[SHIPS.findIndex(s => s.id === sim.ship)]);
    set('hud-time', clock(sim.time));
    set('map-time', clock(sim.time));
    document.getElementById('status-box')?.classList.toggle('low', p.hp < p.maxHp * .25);
    set('dash-text', p.dashCD > 0 ? p.dashCD.toFixed(1) : tr('dash'));
    const boss = sim.enemies.find(e => e.type === 'boss' && e.hp > 0 && e.role === 'final') ?? sim.enemies.find(e => e.type === 'boss' && e.hp > 0);
    document.getElementById('bossbar').hidden = !boss;
    if (boss) {
        set('boss-name', d.bossNames[boss.bossArt]);
        set('boss-phase', `${d.stage} ${boss.phase + 1}/${boss.stages} / ${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`);
        document.getElementById('bossbar').style.setProperty('--stage-width', `${100 / boss.stages}%`);
        fill('boss-fill', boss.hp / boss.maxHp);
    }
    const next = BOSS_ENCOUNTERS[sim.encounterIndex], remaining = (next?.at ?? Infinity) - sim.time, last = sim.bossRecords.at(-1), arriving = !!last && sim.time - last.spawned < 2.8, swarm = sim.time < sim.swarmUntil;
    document.getElementById('incoming').hidden = !(remaining <= 3 && remaining > 0) && !arriving && !swarm;
    set('incoming-kind', swarm && !arriving ? d.swarmArrival : d.incoming);
    set('incoming-count', arriving ? d.bossNames[last.art] : remaining <= 3 ? String(Math.ceil(remaining)) : swarm ? d.swarmArrival : '');
    document.getElementById('danger-label').hidden = !sim.hazards.some(h => h.age < h.warning) && !boss?.warnTime;
    set('objective-label', sim.beacon ? tr('beaconDesc') : sim.drops.length ? tr('findChest') : '');
    const chips = document.getElementById('upgrade-chips'), markup = `<div class="slot-label">${tr('weapon')} ${sim.weapons.length}/6</div><div class="slot-row">${Array.from({ length: 6 }, (_, i) => { const w = sim.weapons[i], wi = w ? WEAPONS.findIndex(d => d.id === w.id) : -1; return `<span class="slot ${w?.evolved ? 'evolved' : ''}" ${w ? `title="${esc(w.evolved ? d.evolutionNames[wi] : d.weaponNames[wi])}"` : ''}>${w ? icon(w.id, w.evolved) + `<small>${w.evolved ? '&#9733;' : w.level >= 5 ? d.max : w.level}</small>` : ''}</span>`; }).join('')}</div><div class="slot-label">${tr('passive')} ${Object.keys(sim.passives).length}/6</div><div class="slot-row">${Array.from({ length: 6 }, (_, i) => { const id = Object.keys(sim.passives)[i]; return `<span class="slot">${id ? icon(id) + `<small>${sim.passives[id] >= 5 ? d.max : sim.passives[id]}</small>` : ''}</span>`; }).join('')}</div>${Object.values(sim.boosts).some(n => n > 0) ? `<div class="extra-boosts">${d.stacked}: ${d.boostDescriptions.map((label, i) => label.replace(/\d+/, String([sim.boosts.damage * 3, sim.boosts.hull * 5, sim.boosts.reach * 5][i]))).join(' / ')}</div>` : ''}`;
    if (chips.innerHTML !== markup)
        chips.innerHTML = markup;
    const perf = document.getElementById('perf');
    perf.hidden = !showPerf;
    perf.textContent = `${fps.toFixed(0)} FPS  ${sim.enemies.length} / ${sim.shots.length + sim.bullets.length}`;
}
function resize() { V.w = window.innerWidth; V.h = window.innerHeight; V.dpr = Math.min(window.devicePixelRatio || 1, 1.5); V.scale = Math.max(.5, Math.min(V.w / 1120, V.h / 720, 1.4)); cosmos.resize(V.w, V.h, V.dpr, 'auto'); }
function inputState() {
    let x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), y = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    x += joy.x;
    y += joy.y;
    const pad = Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected);
    let ax = 0, ay = 0, manual = pointer.aim;
    if (pad?.connected) {
        const v = deadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
        x += v.x;
        y += v.y;
        const aim = deadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
        if (aim.x || aim.y) {
            ax = aim.x;
            ay = aim.y;
            manual = true;
        }
    }
    if (pointer.down || pointer.aim) {
        const px = sim ? (sim.player.x - V.camX) * V.scale + V.w / 2 : V.w / 2, py = sim ? (sim.player.y - V.camY) * V.scale + V.h / 2 : V.h / 2, dx = pointer.x - px, dy = pointer.y - py, d = Math.hypot(dx, dy);
        if (pointer.down && d > 14) {
            x = dx / d;
            y = dy / d;
        }
        if (pointer.aim) {
            ax = dx;
            ay = dy;
        }
    }
    const dash = dashPressed || keys.has('Space') || !!pad?.buttons[1]?.pressed;
    dashPressed = false;
    return { x, y, aimX: ax, aimY: ay, dash, manual };
}
function pollPad(now) {
    const pad = Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected);
    if (!pad) {
        if (hadPad && view === 'playing')
            setView('pause');
        hadPad = false;
        padBefore = [];
        return;
    }
    hadPad = true;
    const pressed = pad.buttons.map(b => b.pressed), edge = (i) => pressed[i] && !padBefore[i];
    if (edge(9)) {
        if (view === 'playing')
            setView('pause');
        else if (view === 'pause')
            setView('playing');
    }
    else if (view !== 'playing') {
        const dx = (pad.axes[0] ?? 0), dy = (pad.axes[1] ?? 0), active = document.activeElement;
        const horizontal = edge(15) ? 1 : edge(14) ? -1 : now - padMoveAt > 240 && Math.abs(dx) > .6 ? (dx > 0 ? 1 : -1) : 0;
        let adjusted = false;
        if (view === 'settings' && horizontal) {
            if (active instanceof HTMLInputElement && active.type === 'range') {
                active.value = String(clamp(Number(active.value) + horizontal * Number(active.step || .05), 0, 1));
                active.dispatchEvent(new Event('input', { bubbles: true }));
                adjusted = true;
            }
            if (active instanceof HTMLSelectElement) {
                active.selectedIndex = clamp(active.selectedIndex + horizontal, 0, active.options.length - 1);
                active.dispatchEvent(new Event('change', { bubbles: true }));
                adjusted = true;
            }
            if (adjusted)
                padMoveAt = now;
        }
        const move = adjusted ? 0 : edge(13) || edge(15) ? 1 : edge(12) || edge(14) ? -1 : now - padMoveAt > 240 && (Math.abs(dx) > .6 || Math.abs(dy) > .6) ? (dx + dy > 0 ? 1 : -1) : 0;
        if (move) {
            const all = Array.from(app.querySelectorAll('button:not(:disabled),select,input')).filter(el => el.getAttribute('aria-disabled') !== 'true');
            const i = all.indexOf(document.activeElement);
            all[(i + move + all.length) % all.length]?.focus();
            padMoveAt = now;
        }
        if (edge(0))
            document.activeElement?.click();
        if (edge(1)) {
            if (view === 'chestIntro')
                action('skip-chest');
            else if (view === 'settings' || view === 'shop')
                action('back');
            else if (view === 'pause')
                action('resume');
        }
        if (edge(2) && view === 'choice')
            action('reroll');
    }
    padBefore = pressed;
}
function advance(dt) { if (!sim || view !== 'playing' || stressPreview)
    return; sim.step(dt, inputState()); cosmos.consumeEvents(sim.events); audio.consume(sim.events, { x: V.camX, y: V.camY, width: V.w / V.scale, height: V.h / V.scale }); audio.combat(sim.sector, sim.time, visibleEnemies(), sim.enemies.some(e => e.type === 'boss' && e.hp > 0)); if (sim.events.some(e => e.kind === 'boss')) {
    document.getElementById('cue-skip')?.remove();
    app.insertAdjacentHTML('beforeend', btn('skip-cue', tr('skipCue'), 'cue-skip', 'id="cue-skip"'));
} sim.events.length = 0; if (sim.status !== 'playing') {
    finish();
    return;
} if (sim.pendingLevels || sim.pendingChests)
    openChoice(); }
function frame(now) {
    const delta = Math.min(.05, Math.max(0, (now - stamp) / 1000));
    stamp = now;
    V.time = now / 1000;
    pollPad(now);
    if (view === 'playing' && sim && !stressPreview) {
        if (sim.hitStop > 0)
            sim.hitStop = Math.max(0, sim.hitStop - delta);
        else {
            sim.slowMotion = Math.max(0, sim.slowMotion - delta);
            acc += delta * (sim.slowMotion > 0 ? .35 : 1);
            for (let n = 0; acc >= 1 / 60 && n < 4 && view === 'playing'; n++) {
                advance(1 / 60);
                acc -= 1 / 60;
            }
        }
        const p = sim.player, k = 1 - Math.exp(-8 * delta);
        V.camX += (p.x - V.camX) * k;
        V.camY += (p.y - V.camY) * k;
        V.shake = save.settings.reduced ? 0 : sim.shake * save.settings.shake;
    }
    const scene = view === 'title' || (!sim && (view === 'shop' || view === 'settings')) ? null : sim;
    if (scene && !save.settings.numbers) {
        const f = scene.floaters;
        scene.floaters = [];
        cosmos.render(scene, V, { lang: save.settings.lang, reduced: save.settings.reduced, quality: 'auto', effectsOpacity: 1 - effectsTransparency, largeProjectiles });
        scene.floaters = f;
    }
    else
        cosmos.render(scene, V, { lang: save.settings.lang, reduced: save.settings.reduced, quality: 'auto', effectsOpacity: 1 - effectsTransparency, largeProjectiles });
    audio.tick();
    animateResults(now);
    if (view === 'playing' && now - hudTime > 100) {
        updateHUD();
        hudTime = now;
    }
    if (view === 'evolution' && now >= evolveUntil)
        openChoice();
    if (view === 'chestIntro' && now >= chestUntil)
        setView('choice');
    if (toastUntil && now > toastUntil) {
        document.querySelector('#toast')?.classList.remove('show');
        toastUntil = 0;
    }
    frames++;
    if (now - fpsAt > 1000) {
        fps = frames * 1000 / (now - fpsAt);
        frames = 0;
        fpsAt = now;
    }
    requestAnimationFrame(frame);
}
app.addEventListener('click', e => { const b = e.target.closest('[data-act]'); if (b) {
    audio.unlock();
    if (!b.dataset.act?.startsWith('sound-'))
        audio.ui();
    action(b.dataset.act, b.dataset.id);
} });
app.addEventListener('pointerover', e => { const b = e.target.closest('button'); if (b && !b.contains(e.relatedTarget))
    audio.ui(b.disabled ? 'locked' : 'hover'); });
app.addEventListener('focusin', e => { if (e.target.matches('button'))
    audio.ui('hover'); });
app.addEventListener('change', e => { const el = e.target; if (el.id === 'difficulty')
    difficulty = el.value; if (el.dataset.setting === 'lang') {
    save.settings.lang = el.value === 'en' ? 'en' : 'ko';
    persist();
    drawUI();
} });
app.addEventListener('input', e => { const el = e.target, k = el.dataset.setting; if (el.dataset.setting === 'largeProjectiles') {
    largeProjectiles = el.checked;
    if (!preview)
        try {
            localStorage.setItem('cosmos-survivor.projectiles.v1', largeProjectiles ? '1' : '0');
        }
        catch { /* The current session keeps the visual preference. */ }
    return;
} if (el.dataset.setting === 'effectsTransparency') {
    effectsTransparency = clamp(Number(el.value), 0, .9);
    const output = app.querySelector('[data-output=effectsTransparency]');
    if (output)
        output.textContent = Math.round(effectsTransparency * 100) + '%';
    if (!preview)
        try {
            localStorage.setItem('cosmos-survivor.effects.v1', String(effectsTransparency));
        }
        catch { /* The current session still keeps this preference. */ }
    return;
} if (['volume', 'music', 'sfx', 'shake'].includes(k)) {
    const key = k;
    save.settings[key] = clamp(Number(el.value), 0, 1);
    const output = app.querySelector(`[data-output="${key}"]`);
    if (output)
        output.textContent = Math.round(save.settings[key] * 100) + '%';
    audio.update(save.settings);
    persist();
}
else if (k === 'reduced' || k === 'numbers') {
    save.settings[k] = el.checked;
    persist();
} });
window.addEventListener('keydown', e => {
    if (view === 'chestIntro' && (e.code === 'Escape' || e.code === 'Space')) {
        e.preventDefault();
        action('skip-chest');
        return;
    }
    if (e.code === 'F3') {
        e.preventDefault();
        showPerf = !showPerf;
        return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (view === 'playing')
            action('pause');
        else if (view === 'pause')
            action('resume');
        else if (view === 'settings' || view === 'shop')
            action('back');
        return;
    }
    if (view === 'choice' && /^Digit[123]$/.test(e.code)) {
        choose(Number(e.code.slice(-1)) - 1);
        return;
    }
    if (view === 'choice' && e.code === 'KeyR') {
        action('reroll');
        return;
    }
    if (view === 'playing' && ['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
        e.preventDefault();
    keys.add(e.code);
    if (view !== 'playing' && e.code === 'Tab') {
        const all = Array.from(app.querySelectorAll('button:not(:disabled),select,input'));
        const first = all[0], last = all.at(-1);
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
        }
        else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
        }
    }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('resize', () => { resize(); aimDust(); });
window.addEventListener('blur', () => { resetInput(); if (view === 'playing')
    setView('pause'); });
document.addEventListener('visibilitychange', () => { if (document.hidden) {
    if (view === 'playing')
        setView('pause');
    audio.stop();
}
else
    audio.setScene(view === 'settings' && sim ? 'pause' : view); });
const canvas = document.querySelector('#world');
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => { if (view !== 'playing')
    return; audio.unlock(); pointer.down = e.button === 2; pointer.aim = e.button === 0; pointer.x = e.clientX; pointer.y = e.clientY; canvas.setPointerCapture?.(e.pointerId); });
window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; if (e.pointerId === joy.id) {
    const el = document.getElementById('joystick'), r = el.getBoundingClientRect(), dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2, d = Math.hypot(dx, dy), scale = Math.min(1, (r.width * .33) / (d || 1));
    joy.x = dx * scale / (r.width * .33);
    joy.y = dy * scale / (r.width * .33);
    document.getElementById('stick').style.transform = `translate(${dx * scale}px,${dy * scale}px)`;
} });
app.addEventListener('pointerdown', e => { const el = e.target, stick = el.closest('#joystick'); if (stick) {
    e.preventDefault();
    joy.id = e.pointerId;
    stick.setPointerCapture?.(e.pointerId);
} if (el.closest('#dash-btn')) {
    e.preventDefault();
    dashPressed = true;
} });
function pointerUp(e) { pointer.down = pointer.aim = false; if (e.pointerId === joy.id) {
    joy.id = -1;
    joy.x = joy.y = 0;
    const stick = document.getElementById('stick');
    if (stick)
        stick.style.transform = 'translate(0,0)';
} }
window.addEventListener('pointerup', pointerUp);
window.addEventListener('pointercancel', pointerUp);
for (const image of [...new Set(SECTORS.map(s => s.image).concat(['horsehead.jpg', 'elliptical.jpg', 'irregular.jpg']))]) {
    const img = new Image();
    img.onload = () => { Object.defineProperty(img, 'pixelReady', { value: true }); V.images[image] = img; };
    img.src = './assets/pixel/photos/' + image.replace('.jpg', '.png');
}
audio.setScene('title');
prepareShipFrames();
resize();
drawUI();
requestAnimationFrame(frame);
if (parsed.warning || storageReadFailed)
    toast(tr(parsed.future ? 'futureSave' : 'saveWarning'));
function previewScreen(screen) {
    audio.stop();
    stressPreview = false;
    preview = true;
    hangarIndex = -1;
    save = { ...defaultSave(), unlocked: 5, shards: 500, ships: SHIPS.map(s => s.id) };
    if (screen === 'sound') {
        sim = null;
        setView('sound');
        return;
    }
    if (screen === 'title' || screen === 'sector') {
        setView('title');
        return;
    }
    if (screen === 'shop' || screen === 'settings') {
        returnView = 'title';
        shopReturn = 'title';
        setView(screen);
        return;
    }
    sim = new Simulation(save.ship, save.meta, 42, 'preview');
    sim.invincible = true;
    sim.time = 145;
    sim.setLoadout(['pulse', 'orbit', 'missile', 'chain'], { power: 2, magnet: 2 });
    for (let i = 0; i < 70; i++) {
        const a = i * 2.4, d = 160 + i * 4;
        sim.spawn(SECTORS[0].types[i % 4], 2400 + Math.cos(a) * d, 1600 + Math.sin(a) * d);
    }
    for (let i = 0; i < 40; i++)
        sim.dropXP(2400 + Math.cos(i * 1.7) * (70 + i * 5), 1600 + Math.sin(i * 1.7) * (70 + i * 5), 7);
    if (screen === 'stress') {
        sim = new Simulation(save.ship, save.meta, 42, 'stress-preview');
        fillStress(sim);
        stressPreview = true;
        V.camX = 2400;
        V.camY = 1600;
        V.shake = 0;
        setView('playing');
        return;
    }
    if (screen === 'levelup') {
        sim.pendingLevels = 1;
        openChoice();
    }
    else if (screen === 'boss') {
        sim.time = 539.99;
        sim.encounterIndex = 4;
        sim.swarmIndex = 2;
        sim.nextBeacon = sim.nextSupply = Infinity;
        sim.pendingLevels = sim.pendingChests = 0;
        sim.step(.02);
        sim.time = 542;
        const e = sim.enemies.find(e => e.role === 'final');
        if (e)
            sim.beginPattern(e, 'prism');
        setView('playing');
    }
    else if (screen === 'result') {
        sim.time = 600;
        sim.status = 'won';
        sim.kills = 1200;
        setView('result');
    }
    else if (screen === 'pause') {
        setView('pause');
    }
    else
        setView('playing');
}
export const dev = DEV ? { get save() { return save; }, get view() { return view; }, get sim() { return sim; }, get offers() { return offers; }, get preview() { return preview; }, setSave(value) { save = value; audio.update(save.settings); }, action, advance, openChoice, choose, previewScreen, drawUI, get fps() { return fps; } } : undefined;
if (DEV) {
    const screen = new URLSearchParams(location.search).get('screen');
    if (screen)
        previewScreen(screen);
}

import { arrivalFor, arrivalNames } from './encounters.js';
import { CombatNotice } from './notices.js';
import { fieldScale } from './horde.js';
import { CREW } from './crew.js';
import { chapterDef, crewUnlocked, LOCAL_BOSSES, localBossName } from './chapters.js';
import { groundCrew } from './expedition-art.js';
import { signalCopy } from './i18n.js';
import { buildPanel, choiceDetails } from './build-ui.js';
import { FUSIONS } from './combat-rules.js';
import { RUN_CHESTS } from './economy.js';
import { META, PASSIVES, SECTORS, SHIPS, WEAPONS } from './data.js';
import { SAVE_KEY, clamp, deadzone, defaultSave, metaCost, parseSave, purchase, refund, settle, unlockShip, weaponStats, xpNeeded } from './core.js';
import { Simulation } from './sim.js';
import { text, t, equipmentCopy, combatCopy, rankCopy } from './i18n.js';
import { GEAR, SLOTS, addItem, equip, upgrade, fuse, fuseAll, dismantle } from './equipment.js';
import { CHAPTERS, combatPower, powerStatus, pull, testCurrency } from './economy.js';
import { equipmentUI, chapterUI, itemCard } from './equipment-ui.js';
import { drawGearIcons } from './equipment-art.js';
import { icon } from './icons.js';
import { prepareShipFrames } from './pixel-art.js';
import * as cosmos from './cosmos.js';
import { AudioEngine } from './audio.js';
import { BUILD_LABEL } from './build-info.js';
import { FrameStats, browserName, playtestRecord } from './playtest.js';
import { DEV, PLAYTEST } from './env.js';
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
const keys = new Set(), pointer = { down: false, aim: false, x: 0, y: 0 }, joy = { x: 0, y: 0, id: -1, originX: 0, originY: 0 }, audio = new AudioEngine(save.settings);
let lastEvolved = 'pulse', selectedMeta = 'output';
let selectedGear = 1, slotFilter = 'all', rankFilter = 'all', gearSort = 'rank', drawnGear = [], previousPower = combatPower(save), powerAt = 0, pullSequence = 0, gearReturn = 'title';
let special = false;
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
let quality = 'auto';
const frameStats = new FrameStats();
try {
    showPerf = localStorage.getItem('cosmos-survivor.fps.v1') === '1';
    const q = localStorage.getItem('cosmos-survivor.quality.v1');
    if (q === 'auto' || q === 'high' || q === 'low')
        quality = q;
}
catch { }
function visualPreference(key, value) { if (!preview)
    try {
        localStorage.setItem('cosmos-survivor.' + key + '.v1', value);
    }
    catch { } }
const V = { w: window.innerWidth, h: window.innerHeight, dpr: 1, scale: 1, camX: 2400, camY: 1600, time: 0, shake: 0, images: {} };
const tr = (key) => t(key, save.settings.lang), dict = () => text(save.settings.lang);
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clock = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const btn = (act, label, style = '', extra = '') => `<button class="btn ${style}" data-act="${act}" ${extra}>${label}</button>`;
const heading = (name, note = '', back = true) => `<div class="dialog-head"><div><h2>${name}</h2>${note ? `<p class="muted">${note}</p>` : ''}</div>${back ? btn('back', tr('back'), 'small') : ''}</div>`;
const combatNotice = new CombatNotice();
let announcedSim = null;
const announced = new Set();
function announce(key, message, priority = 1) { if (announced.has(key))
    return; announced.add(key); combatNotice.push(key, message, performance.now(), priority, save.settings.lessNotices); }
function toast(message) { if (view === 'playing') {
    combatNotice.push('toast:' + message, message, performance.now(), 1, save.settings.lessNotices);
    return;
} let el = document.querySelector('#toast'); if (!el) {
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
function resetInput() { frameStats.break(); const stick = document.getElementById('joystick'); stick?.classList.remove('active'); stick?.removeAttribute('style'); keys.clear(); pointer.down = pointer.aim = false; joy.x = joy.y = 0; joy.id = -1; dashPressed = false; acc = 0; }
function focusFirst() { (app.querySelector('[data-autofocus]:not(:disabled)') ?? app.querySelector('button:not(:disabled),select,input'))?.focus({ preventScroll: true }); }
function visibleEnemies() { return sim?.enemies.reduce((n, e) => n + Number(e.hp > 0 && !e.hidden && Math.abs(e.x - V.camX) < V.w / V.scale / 2 + e.r && Math.abs(e.y - V.camY) < V.h / V.scale / 2 + e.r), 0) ?? 0; }
function setView(next) { app.classList.remove('cue-skipped'); view = next; resetInput(); audio.setScene(view === 'settings' && sim ? 'pause' : view); if (view === 'playing' && sim)
    audio.combat(sim.sector, sim.timeline, visibleEnemies(), sim.enemies.some(e => e.type === 'boss' && e.hp > 0), sim.enemies.some(e => e.role === 'final' && e.hp > 0)); drawUI(); }
function shipCanvas(id, large = false) { return `<canvas class="${large ? 'hero-ship' : 'ship-preview'}" data-ship="${id}" width="${large ? 432 : 96}" height="${large ? 336 : 96}" aria-label="${esc(dict().shipNames[SHIPS.findIndex(s => s.id === id)])}"></canvas>`; }
function drawShips() {
    for (const ca of app.querySelectorAll('[data-crew]')) {
        const c = ca.getContext('2d');
        c.imageSmoothingEnabled = false;
        const id = ca.dataset.crew;
        c.drawImage(groundCrew(id, 0, 0), 0, 0, ca.width, ca.height);
    }
    drawGearIcons(app, [...save.equipment.items, ...(save.equipment.lastLoot?.items ?? [])]);
    for (const c of app.querySelectorAll('[data-ship]'))
        cosmos.snapshotShip(c.dataset.ship, c);
}
function titleUI() { const d = dict(), ch = chapterDef(special ? 'village' : selectedSector), ground = ch.kind === 'ground', person = CREW.find(c => c.id === save.crew), si = hangarIndex < 0 ? SHIPS.findIndex(s => s.id === save.ship) : hangarIndex, ship = SHIPS[si], locked = !ground && !save.ships.includes(ship.id), ko = save.settings.lang === 'ko'; return `<main id="menu"><div class="menu-wrap"><header class="menu-header"><span class="small-brand">COSMOS</span><div class="header-actions"><span class="wallet">${icon('shards')}<b>${save.shards}</b></span>${btn('special', ko ? '스페셜' : 'Special')}${btn('gear-view', equipmentCopy(save.settings.lang).equipment, '', 'data-id=equipment')}${btn('shop', tr('shop'))}${btn('settings', tr('settings'), 'quiet')}</div></header>${!save.equipment.cleared.includes(1) ? `<p class="special-gate">${ko ? '스페셜 시골 마을: 대기권 클리어 후 열림' : 'Special village: clear Atmosphere to unlock'}</p>` : ''}<section class="title-stage"><div class="hangar"><div class="title-mark"><h1 class="title-logo"><img src="./assets/pixel/logo.png" width="512" height="144" alt=""><span class="sr-only">COSMOS</span></h1><p>${ko ? '지구에서 우주 끝까지' : 'From Earth to the edge of space'}</p></div><div class="hangar-bay">${ground ? `<canvas data-crew="${save.crew}" width="240" height="240" class="hero-crew"></canvas>` : btn('ship-prev', '&#9664;', 'hangar-arrow') + shipCanvas(ship.id, true) + btn('ship-next', '&#9654;', 'hangar-arrow')}</div><div class="hangar-caption"><h2>${ground ? person.name : d.shipNames[si]}</h2><div class="ship-spec">${ground ? person.weaponName + ' / ' + person.trait : d.shipRoles[si]}</div>${ground ? `<div class="crew-choices">${CREW.map(c => btn('crew', c.name, save.crew === c.id ? 'selected' : '', `data-id="${c.id}" ${crewUnlocked(c.id, save.equipment.cleared) ? '' : `disabled title="${ko ? '본편 챕터 클리어 필요' : 'Clear story chapters'}"`}`)).join('')}</div>` : locked ? btn('ship', icon('lock') + ' ' + ship.cost, 'unlock-hangar', `data-id="${ship.id}"`) : ''}</div></div><div class="flight-chart panel"><div class="section-title"><h2>${ch[save.settings.lang]}</h2>${btn('chapters', equipmentCopy(save.settings.lang).chapters, 'small')}</div><div class="mini-route">${[...CHAPTERS].reverse().map((c, j) => { const i = 7 - j; return `<button class="route-card ${selectedSector === i && !special ? 'selected' : ''}" data-act="sector" data-id="${i}" aria-disabled="${i > save.unlocked}" aria-pressed="${selectedSector === i && !special}"><span>${i < 2 ? i === 0 ? '▰' : '☁' : '✦'}</span><b>${i + 1} ${c[save.settings.lang]}</b>${save.equipment.cleared.includes(i) ? ' ✓' : i > save.unlocked ? ' 🔒' : ''}</button>`; }).join('')}</div><div class="chapter-power">${equipmentCopy(save.settings.lang).mine} <b>${combatPower(save)}</b> / ${ch.recommended}<p>${equipmentCopy(save.settings.lang).status[powerStatus(combatPower(save), ch.recommended)]}</p></div><div class="launch-panel"><select id="difficulty" aria-label="${tr('difficulty')}">${['easy', 'normal', 'hard'].map(k => `<option value="${k}" ${difficulty === k ? 'selected' : ''}>${tr(k)}</option>`).join('')}</select>${btn('start', tr('launch'), 'primary launch', `data-autofocus ${locked ? 'disabled' : ''}`)}</div></div></section><footer class="title-footer"><small>${esc(BUILD_LABEL)}</small><a href="./CREDITS.md" target="_blank" rel="noopener">${tr('credits')}</a>${DEV || PLAYTEST ? '<a href="?scenes">시험 장면</a>' : ''}</footer></div></main>`; }
function specialUI() { const ko = save.settings.lang === 'ko', open = save.equipment.cleared.includes(1); return heading(ko ? '스페셜' : 'Special') + `<div class="special-landscape"><h3>${ko ? '시골 마을' : 'Country Village'}</h3><p>${ko ? '들판에 떨어진 운석. 허수아비가 먼저 움직였다.' : 'A meteor landed. The scarecrow moved first.'}</p><p>${open ? (ko ? '본편과 별도 탐사 / HARVEST 배낭' : 'Separate expedition / HARVEST Pack') : (ko ? '본편 챕터 2 대기권 클리어 후 열림' : 'Clear story chapter 2 to unlock')}</p>${btn('special-pick', ko ? '시골 마을로' : 'Visit village', 'primary', open ? '' : 'disabled')}</div>`; }
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
function hudUI() { return `<section id="hud" aria-label="${tr('hp')}"><div class="mission-box panel"><h2 id="hud-sector"></h2></div><div class="run-progress" role="progressbar" aria-label="${save.settings.lang === 'ko' ? '챕터 진행' : 'Chapter progress'}" aria-valuemin="0" aria-valuemax="100"><i id="run-fill"></i>${sim?.encounters.map((b, i) => `<span class="boss-marker ${b.role === 'final' ? 'final' : ''}" style="left:${b.at / sim.duration * 100}%" title="${clock(b.at)}" data-boss="${i}">${b.role === 'final' ? '◆' : '◇'}</span>`).join('') ?? ''}<b id="run-percent"></b></div><div class="hud-actions">${btn('pause', '&#8545;', 'icon-btn', `aria-label="${tr('pause')}"`)}${btn('fullscreen', tr('fullscreen'), 'small')}</div><div id="upgrade-chips"></div><div class="minimap-wrap panel"><div><span>${tr('minimap')}</span><span id="map-time"></span></div><canvas id="minimap" width="90" height="60" aria-label="${tr('minimap')}"></canvas></div><div id="bossbar" class="panel" hidden><div><b id="boss-name"></b><span id="boss-phase"></span></div><div class="meter"><i id="boss-fill"></i></div></div><div id="incoming" role="status" aria-live="polite" hidden><span id="incoming-kind"></span><b id="incoming-count"></b></div><div id="danger-label" hidden>${tr('warning')}</div><div id="objective-label"></div><div class="status-box panel" id="status-box"><div class="lv-badge"><small>${tr('level')}</small><b id="hud-level"></b></div><div class="bars"><div class="bar-row"><span>${tr('hp')}</span><div class="meter hp"><i id="hp-fill"></i><em id="hud-hp"></em></div></div><div class="bar-row"><span>${tr('xp')}</span><div class="meter xp"><i id="xp-fill"></i><em id="hud-xp"></em></div></div></div><div class="ship-tag"><b id="hud-ship"></b><span id="hud-time"></span></div></div><div id="joystick" role="group" aria-label="${tr('move')}"><div id="stick"></div><span>${tr('move')}</span></div><button id="dash-btn" aria-label="${tr('dash')}"><b>&#8599;</b><span id="dash-text">${tr('dash')}</span></button><span id="perf" hidden></span></section>`; }
function choiceText(c) { const d = dict(); if (c.kind === 'chaos')
    return { name: 'CHAOS', desc: combatCopy(save.settings.lang).chaos[Number(c.id)], rank: 0, new: false, kind: 'CHAOS', icon: icon('chest') }; if (c.kind === 'fusion') {
    const f = FUSIONS.find(f => f.id === c.id);
    return { name: combatCopy(save.settings.lang).fusionNames[FUSIONS.indexOf(f)], desc: combatCopy(save.settings.lang).fusionDescriptions[FUSIONS.indexOf(f)], rank: 8, new: false, kind: combatCopy(save.settings.lang).fusion, icon: icon(f.a, true) };
} if (c.kind === 'boost') {
    const i = ['damage', 'hull', 'reach'].indexOf(c.id);
    return { name: d.boostNames[i], desc: '', rank: 0, new: false, kind: d.boost, icon: icon(['power', 'hull', 'magnet'][i]) };
} if (c.kind === 'weapon' || c.kind === 'evolve') {
    const i = WEAPONS.findIndex(w => w.id === c.id), w = WEAPONS[i], slot = sim.weapons.find(w => w.id === c.id);
    return { name: slot?.fusion ? combatCopy(save.settings.lang).fusionNames[FUSIONS.findIndex(f => f.id === slot.fusion)] : c.kind === 'evolve' ? d.evolutionNames[i] : d.weaponNames[i], desc: slot?.fusion ? combatCopy(save.settings.lang).fusionDescriptions[FUSIONS.findIndex(f => f.id === slot.fusion)] : c.kind === 'evolve' ? d.evolutionDescriptions[i] : d.weaponDescriptions[i], rank: c.kind === 'evolve' ? 8 : (slot?.level ?? 0) + 1, new: !slot, kind: tr(c.kind === 'evolve' ? 'evolution' : 'weapon'), icon: icon(w.id, c.kind === 'evolve') };
} if (c.kind === 'passive') {
    const i = PASSIVES.findIndex(p => p.id === c.id), p = PASSIVES[i], lv = sim.passives[p.id] ?? 0;
    return { name: d.passiveNames[i], desc: d.passiveDescriptions[i], rank: lv + 1, new: !lv, kind: tr('passive'), icon: icon(p.id) };
} return { name: tr(c.kind === 'heal' ? 'heal' : 'dustBonus'), desc: tr(c.kind === 'heal' ? 'healDesc' : 'dustDesc'), rank: 0, new: false, kind: tr('chest'), icon: icon(c.kind === 'heal' ? 'heal' : 'shards') }; }
const pips = (level, max = 5) => `<span class="rank-pips" aria-label="${tr('level')} ${level}">${Array.from({ length: max }, (_, i) => `<i class="${i < level ? 'filled' : ''}"></i>`).join('')}</span>`;
function choiceChange(c) {
    if (c.kind === 'chaos' || c.kind === 'fusion')
        return { rank: '', gain: choiceText(c).desc };
    const d = dict(), s = sim, value = (key, n) => d[key].replace('{n}', String(n));
    if (c.kind === 'boost') {
        const i = ['damage', 'hull', 'reach'].indexOf(c.id), key = c.id;
        return { rank: `${d.stacked} ${s.boosts[key]} → ${s.boosts[key] + 1}`, gain: d.boostDescriptions[i] };
    }
    if (c.kind === 'evolve')
        return { rank: d.max + ' → ' + d.evolution, gain: d.evolutionDescriptions[WEAPONS.findIndex(w => w.id === c.id)] };
    if (c.kind === 'passive') {
        const level = s.passives[c.id] ?? 0;
        return { rank: `${d.lv} ${level} → ${Math.min(6, level + 1)}${level >= 5 ? ' / ' + d.max : ''}`, gain: d.passiveGains[PASSIVES.findIndex(p => p.id === c.id)] };
    }
    if (c.kind === 'weapon') {
        const slot = s.weapons.find(w => w.id === c.id), level = slot?.level ?? 0, next = { id: c.id, level: Math.min(8, level + 1), evolved: slot?.evolved ?? false, timer: 0 }, after = weaponStats(next, s.attributes), bits = [];
        if (slot) {
            const before = weaponStats(slot, s.attributes);
            bits.push(value('damageGain', Math.round((after.damage / before.damage - 1) * 100)), value('delayGain', Math.round((1 - after.cooldown / before.cooldown) * 100)));
            const extra = c.id === 'pulse' || c.id === 'missile' ? after.count - before.count : c.id === 'orbit' && level === 2 ? 1 : 0;
            if (extra)
                bits.push(value('shotGain', extra));
        }
        else
            bits.push(value('initialDamage', Math.round(after.damage)), value('everySeconds', Number(after.cooldown.toFixed(2))));
        return { rank: `${d.lv} ${level} → ${next.level}${next.level === 8 ? ' / ' + d.max : ''}`, gain: bits.join(' / ') };
    }
    return { rank: '', gain: '' };
}
function choiceUI() { return heading(chest ? rankCopy[sim.chestRank][save.settings.lang] + ' ' + tr('chest') + ' / ' + combatCopy(save.settings.lang).remaining + ' ' + (sim.chestQueue[0]?.remaining ?? 1) : tr('levelup'), banishing ? tr('banishHint') : tr('pick'), false) + `<div class="upgrade-grid">${offers.map((c, i) => { const x = choiceText(c), change = choiceChange(c); return `<button class="upgrade-card ${c.kind === 'evolve' || c.kind === 'fusion' || c.kind === 'chaos' ? 'evolve-card' : c.kind === 'passive' ? 'passive-card' : 'weapon-card'}" data-act="choose" data-id="${i}" style="--order:${i}" ${banishing && !['weapon', 'passive'].includes(c.kind) ? 'disabled' : ''}><div class="card-cap"><span>${x.kind}</span><kbd>${i + 1}</kbd></div><div class="item-portrait">${x.icon}${x.new ? '<b class="new-tag">NEW</b>' : ''}</div><h3>${x.name}</h3>${x.rank ? pips(x.rank, c.kind === 'passive' ? 6 : 8) : ''}<p class="card-level">${change.rank}</p><p>${x.desc}</p><p class="upgrade-gain">${change.gain}</p>${choiceDetails(sim, c, save.settings.lang)}</button>`; }).join('')}</div><div class="button-row">${btn('reroll', tr('reroll') + ` (${sim.rerolls})`, '', sim.rerolls <= 0 ? 'disabled' : '')}${btn('skip-cue', tr('skipCue'), 'quiet')}${btn('banish', tr(banishing ? 'cancel' : 'banish') + ` (${sim.banishes})`, 'quiet', sim.banishes <= 0 ? 'disabled' : '')}</div>`; }
function shopUI() { const d = dict(), selected = META.find(m => m.id === selectedMeta), mi = META.indexOf(selected), lv = save.meta[selected.id], cost = metaCost(selected.id, lv); return heading(tr('shop')) + `<div class="shop-workbench"><div class="shop-wall"><div class="shop-balance wallet">${icon('shards')}<b>${save.shards}</b></div><div class="shop-grid">${META.map((m, i) => `<button class="shop-card ${selectedMeta === m.id ? 'selected' : ''}" data-act="inspect" data-id="${m.id}" aria-label="${d.metaNames[i]}" aria-pressed="${selectedMeta === m.id}">${icon(m.icon)}${pips(save.meta[m.id])}</button>`).join('')}</div></div><section class="shop-detail"><div class="detail-portrait">${icon(selected.icon)}</div><h3>${d.metaNames[mi]}</h3><p>${d.metaDescriptions[mi]}</p>${pips(lv)}<div class="shop-price">${icon('shards')}<b>${lv >= 5 ? tr('soldOut') : cost}</b></div>${btn('buy', tr('buy'), 'primary', `data-id="${selected.id}" ${lv >= 5 || save.shards < cost ? 'disabled' : ''}`)}</section></div><div class="section-title"><h3>${tr('ships')}</h3></div><div class="shop-ships">${SHIPS.map((ship, i) => `<div class="shop-ship">${shipCanvas(ship.id)}<b>${d.shipNames[i]}</b>${btn('unlock', save.ships.includes(ship.id) ? tr('owned') : icon('shards') + String(ship.cost), 'small', `data-id="${ship.id}" ${save.ships.includes(ship.id) || save.shards < ship.cost ? 'disabled' : ''}`)}</div>`).join('')}</div><div class="button-row">${btn('refund', tr('refund'), 'quiet')}<small>${tr('refundHint')}</small></div>`; }
function settingsUI() { return heading(tr('settings')) + `${DEV || PLAYTEST ? `<p class="test-build">${equipmentCopy(save.settings.lang).testBuild}</p>${btn('test-currency', equipmentCopy(save.settings.lang).test)}` : ''}` + `<div class="settings-list"><label class="setting-row"><span>${save.settings.lang === 'ko' ? '알림 줄이기' : 'Fewer notifications'}</span><input type="checkbox" data-setting="lessNotices" ${save.settings.lessNotices ? 'checked' : ''}></label><label class="setting-row"><span>${save.settings.lang === 'ko' ? '움직임' : 'Movement'}</span><select data-setting="movement"><option value="weighted" ${save.settings.movement === 'weighted' ? 'selected' : ''}>${save.settings.lang === 'ko' ? '무게감 (기본)' : 'Weighted (default)'}</option><option value="instant" ${save.settings.movement === 'instant' ? 'selected' : ''}>${save.settings.lang === 'ko' ? '즉시' : 'Instant'}</option></select></label><label class="setting-row"><span>${signalCopy(save.settings.lang).setting}</span><select data-setting="telegraphs">${['boss', 'all', 'off'].map((mode, i) => `<option value="${mode}" ${save.settings.telegraphs === mode ? 'selected' : ''}>${signalCopy(save.settings.lang).modes[i]}</option>`).join('')}</select></label><p class="note">${signalCopy(save.settings.lang).hint}</p>${['volume', 'music', 'sfx', 'shake'].map(k => `<label class="setting-row"><span>${tr(k)}</span><input type="range" min="0" max="1" step=".05" value="${save.settings[k]}" data-setting="${k}"><output data-output="${k}">${Math.round(save.settings[k] * 100)}%</output></label>`).join('')}<label class="setting-row"><span>${tr('language')}</span><select data-setting="lang"><option value="ko" ${save.settings.lang === 'ko' ? 'selected' : ''}>${tr('korean')}</option><option value="en" ${save.settings.lang === 'en' ? 'selected' : ''}>${tr('english')}</option></select></label>${['reduced', 'numbers'].map(k => `<label class="setting-row"><span>${tr(k)}</span><input type="checkbox" data-setting="${k}" ${save.settings[k] ? 'checked' : ''}></label>`).join('')}<label class="setting-row"><span>${tr('fpsDisplay')}</span><input type="checkbox" data-setting="fpsDisplay" ${showPerf ? 'checked' : ''}></label><label class="setting-row"><span>${tr('quality')}</span><select data-setting="quality">${['auto', 'high', 'low'].map(q => `<option value="${q}" ${quality === q ? 'selected' : ''}>${tr(q === 'auto' ? 'qualityAuto' : q === 'high' ? 'qualityHigh' : 'qualityLow')}</option>`).join('')}</select></label><label class="setting-row"><span>${tr('largeProjectiles')}</span><input type="checkbox" data-setting="largeProjectiles" ${largeProjectiles ? 'checked' : ''}></label><label class="setting-row"><span>${tr('effectsTransparency')}</span><input type="range" min="0" max=".9" step=".05" value="${effectsTransparency}" data-setting="effectsTransparency"><output data-output="effectsTransparency">${Math.round(effectsTransparency * 100)}%</output></label></div><details class="control-guide"><summary>${tr('howToPlay')}</summary><p>${esc(tr('controls'))}</p><p>${esc(tr('pointerHint'))}</p><p>${esc(tr('evolveHint'))}</p><div class="evolution-guide">${WEAPONS.map((w, i) => `<p>${dict().weaponNames[i]} + ${dict().passiveNames[PASSIVES.findIndex(p => p.id === w.passive)]}<br>→ ${dict().evolutionNames[i]}</p>`).join('')}</div>${dict().sectorNames.map((name, i) => `<p><b>${name}</b><br>${esc(dict().sectorDescriptions[i])}</p>`).join('')}</details><p class="note">${tr('saveHint')}</p><a href="./CREDITS.md" target="_blank" rel="noopener">${tr('credits')}</a>`; }
function rewardUI() { const d = equipmentCopy(save.settings.lang), loot = save.equipment.lastLoot, short = Math.max(0, chapterDef(sim.chapterKey).recommended - combatPower(save)); return `<section class="equipment-rewards"><h3>${d.reward}</h3>${loot ? `<p>${d.gold} +${loot.gold} / ${d.gems} +${loot.gems} / ${d.chests} ${loot.chests}${loot.first ? ' / ' + d.first : ''}</p><p>${SLOTS.map((slot, n) => `${d.slots[n]} ${d.blueprints} +${loot.blueprints[slot]}`).join(' / ')}</p><div class="gear-bag">${loot.items.map(i => itemCard(i, save)).join('')}</div>` : ''}${sim.status !== 'won' ? `<p>${short ? d.short.replace('{n}', String(short)) : d.enough}</p>` : ''}${btn('gear-view', d.upgrade, 'primary', 'data-id=equipment')}</section>`; }
function resultUI() { const r = sim.result(), d = dict(); resultAt = performance.now(); return `<div class="result-heading"><div class="result-stamp ${r.won ? 'cleared' : 'down'}"><h2>${tr(r.won ? 'victory' : 'defeat')}</h2></div><span>${sim.chapter?.[save.settings.lang] ?? d.sectorNames[sim.sector]}</span><div class="result-wallet wallet">${icon('shards')}<b data-tally="${save.shards}" data-delay=".8">0</b></div></div><div class="result-ship">${shipCanvas(save.ship)}</div><div class="report-stats"><div><b data-tally="${Math.floor(r.time)}" data-clock="true" data-delay="0">00:00</b><span>${tr('survived')}</span></div><div><b data-tally="${r.kills}" data-delay=".2">0</b><span>${tr('kills')}</span></div><div><b data-tally="${r.evolutions}" data-delay=".4">0</b><span>${tr('evolution')}</span></div></div><div class="reward">${icon('shards')}<span>${tr('earned')}</span><b data-tally="${r.earned}" data-delay=".6">0</b>${Array.from({ length: 6 }, (_, i) => `<span class="dust-flight" style="--order:${i}">${icon('shards')}</span>`).join('')}</div>${r.won && !r.special && r.sector < 7 ? `<p class="new-sector">${tr('nextOpen')}</p>` : ''}${rewardUI()}<div class="button-row">${btn('shop', tr('shop'), 'primary', 'data-autofocus')}${btn('retry', tr('retry'))}${btn('home', tr('home'), 'quiet')}${btn('copy-record', tr('copyRecord'))}${btn('skip-cue', tr('skipCue'), 'quiet')}</div>`; }
function animateResults(now) { for (const el of app.querySelectorAll('[data-power]')) {
    const f = save.settings.reduced ? 1 : clamp((now - powerAt) / 600, 0, 1);
    el.textContent = String(Math.round(Number(el.dataset.from) + (Number(el.dataset.power) - Number(el.dataset.from)) * (1 - (1 - f) ** 3)));
} if (view !== 'result')
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
    document.documentElement.classList.toggle('in-combat', view === 'playing');
    document.documentElement.lang = save.settings.lang;
    document.documentElement.classList.toggle('motion-reduced', save.settings.reduced);
    document.title = tr('title') + ' - ' + tr('subtitle');
    if (view === 'title') {
        app.innerHTML = titleUI();
        drawShips();
        const mini = app.querySelector('.mini-route'), selected = mini?.querySelector('.selected');
        if (mini && selected)
            mini.scrollTop = selected.offsetTop - mini.offsetTop - mini.clientHeight + selected.clientHeight;
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
    if (view === 'equipment' || view === 'fusion' || view === 'gacha') {
        content = equipmentUI(save, view, selectedGear, slotFilter, rankFilter, gearSort, drawnGear, previousPower);
        powerAt = performance.now();
        previousPower = combatPower(save);
    }
    if (view === 'special')
        content = specialUI();
    if (view === 'chapters')
        content = chapterUI(save, selectedSector);
    if (view === 'choice')
        content = choiceUI();
    if (view === 'sound')
        content = soundUI();
    if (view === 'chestIntro')
        content = `<div class="chest-signal chest-rank-${sim.chestRank}" style="--chest-color:${rankCopy[sim.chestRank].color};--chest-time:${RUN_CHESTS.duration[sim.chestRank]}s"><h2>${rankCopy[sim.chestRank][save.settings.lang]} ${combatCopy(save.settings.lang).chestOpen}</h2><p>${combatCopy(save.settings.lang).chestRewards[sim.chestRank]}</p><div class="signal-rings">${icon('chest')}</div>${btn('skip-chest', tr('skipCue'), 'primary', 'data-autofocus')}</div>`;
    if (view === 'pause')
        content = heading(tr('pause'), '', false) + `<div class="pause-buttons">${btn('resume', tr('resume'), 'primary', 'data-autofocus')}${btn('settings', tr('settings'))}${btn('abandon', tr('abandon'), 'danger')}</div>${buildPanel(sim, save.settings.lang)}`;
    if (view === 'settings')
        content = settingsUI();
    if (view === 'shop')
        content = shopUI();
    if (view === 'result')
        content = resultUI();
    if (view === 'evolution') {
        const slot = sim.weapons.find(w => w.id === lastEvolved), i = WEAPONS.findIndex(w => w.id === slot?.id);
        content = `<div class="evolution-show"><div class="evolution-icon">${icon(slot?.id ?? 'pulse', true)}</div><h2>${tr('evolved')}</h2><h3>${slot?.fusion ? combatCopy(save.settings.lang).fusionNames[FUSIONS.findIndex(f => f.id === slot.fusion)] : dict().evolutionNames[Math.max(0, i)]}</h3><p>${slot?.fusion ? combatCopy(save.settings.lang).fusionDescriptions[FUSIONS.findIndex(f => f.id === slot.fusion)] : dict().evolutionDescriptions[Math.max(0, i)]}</p>${btn('continue', tr('resume'), 'primary', 'data-autofocus')}</div>`;
    }
    app.innerHTML = `<div id="overlay"><section id="dialog" class="${['shop', 'equipment', 'fusion', 'gacha', 'chapters'].includes(view) ? 'wide' : ''} ${view}-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${content}</section></div>`;
    const h = app.querySelector('h2');
    if (h)
        h.id = 'dialog-title';
    drawShips();
    if (view === 'chapters') {
        const dialog = app.querySelector('#dialog'), node = app.querySelector('.chapter-choice.selected');
        if (dialog && node)
            dialog.scrollTop = node.offsetTop - dialog.offsetTop - dialog.clientHeight * .5;
    }
    aimDust();
    animateResults(performance.now());
    focusFirst();
}
function start() { if (special && !save.equipment.cleared.includes(1))
    return; const ground = chapterDef(special ? 'village' : selectedSector).kind === 'ground'; if ((!special && selectedSector > save.unlocked) || (!ground && hangarIndex >= 0 && !save.ships.includes(SHIPS[hangarIndex].id)))
    return; audio.unlock(); audio.ui('start'); frameStats.reset(); sim = new Simulation(save.ship, save.meta, Date.now(), undefined, chapterDef(special ? 'village' : selectedSector).sector, difficulty, save.equipment, { chapter: special ? 'village' : selectedSector, crew: save.crew, movement: save.settings.movement }); sim.telegraphs = save.settings.telegraphs; V.camX = sim.player.x; V.camY = sim.player.y; setView('playing'); }
function openChoice() { if (!sim || sim.status !== 'playing')
    return; if (!sim.pendingLevels && !sim.pendingChests) {
    setView('playing');
    return;
} chest = sim.pendingChests > 0; banishing = false; offers = sim.offers(chest); if (chest) {
    chestUntil = performance.now() + RUN_CHESTS.duration[sim.chestRank] * 1000;
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
} const evolved = offers[index].kind === 'evolve' || offers[index].kind === 'fusion'; const chosenId = offers[index].kind === 'fusion' ? FUSIONS.find(f => f.id === offers[index].id).a : offers[index].id; if (!sim.apply(offers[index], chest))
    return; audio.skipCue(); audio.ui(); if (evolved) {
    lastEvolved = chosenId;
    audio.consume(sim.events);
    sim.events.length = 0;
    evolveUntil = performance.now() + 1500;
    setView('evolution');
}
else
    openChoice(); }
function finish() { if (!sim)
    return; save = settle(save, sim.result()); persist(); audio.play(sim.status === 'won' ? 'clear' : 'down'); setView('result'); }
async function copyRecord() { if (!sim)
    return; const record = playtestRecord(sim, frameStats, { width: V.w, height: V.h, touch: navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches, browser: browserName(navigator.userAgent) }, quality, frameStats.autoLow); try {
    if (!navigator.clipboard?.writeText)
        throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(record);
    toast(tr('recordCopied'));
}
catch {
    if (view !== 'result')
        return;
    let box = document.querySelector('#playtest-record');
    if (!box) {
        const label = document.createElement('label');
        label.className = 'record-fallback';
        label.textContent = tr('recordFallback');
        box = document.createElement('textarea');
        box.id = 'playtest-record';
        box.readOnly = true;
        box.rows = 12;
        label.append(box);
        document.querySelector('#dialog')?.append(label);
    }
    box.value = record;
    box.focus();
    box.select();
} }
function action(act, id = '') {
    if (act === 'special') {
        setView('special');
        return;
    }
    if (act === 'special-pick') {
        if (!save.equipment.cleared.includes(1))
            return;
        special = true;
        setView('title');
        return;
    }
    if (act === 'crew') {
        if (CREW.some(c => c.id === id) && crewUnlocked(id, save.equipment.cleared)) {
            save.crew = id;
            persist();
            drawUI();
        }
        return;
    }
    if (act === 'gear-view') {
        if (!['equipment', 'fusion', 'gacha'].includes(id))
            return;
        if (!['equipment', 'fusion', 'gacha'].includes(view))
            gearReturn = view;
        setView(id);
        return;
    }
    if (act === 'chapters') {
        setView('chapters');
        return;
    }
    if (act === 'chapter-pick') {
        const n = Number(id);
        if (!Number.isInteger(n) || n < 0 || n > save.unlocked)
            return;
        selectedSector = n;
        special = false;
        setView('title');
        return;
    }
    if (act === 'gear-inspect') {
        selectedGear = Number(id);
        if (view !== 'equipment') {
            if (!['fusion', 'gacha'].includes(view))
                gearReturn = view;
            setView('equipment');
        }
        else
            drawUI();
        app.querySelector('.gear-detail')?.scrollIntoView({ block: 'start' });
        return;
    }
    if (act === 'test-currency') {
        if (!DEV && !PLAYTEST)
            return;
        save = { ...save, equipment: testCurrency(save.equipment) };
        persist();
        drawUI();
        return;
    }
    if (['gear-equip', 'gear-level', 'gear-fuse', 'gear-fuse-all', 'gear-dismantle', 'gear-pull'].includes(act)) {
        const uid = Number(id), scroll = app.querySelector('#dialog')?.scrollTop ?? 0;
        let next = save.equipment;
        if (act === 'gear-equip')
            next = equip(next, uid);
        if (act === 'gear-level')
            next = upgrade(next, uid);
        if (act === 'gear-fuse')
            next = fuse(next, uid);
        if (act === 'gear-fuse-all')
            next = fuseAll(next);
        if (act === 'gear-dismantle')
            next = dismantle(next, uid);
        if (act === 'gear-pull') {
            const result = pull(next, Number(id), Math.random);
            next = result.state;
            drawnGear = result.items;
        }
        save = { ...save, equipment: next };
        if (!next.items.some(i => i.uid === selectedGear))
            selectedGear = next.items[0]?.uid ?? 0;
        persist();
        drawUI();
        const dialog = app.querySelector('#dialog');
        if (dialog && act !== 'gear-pull')
            dialog.scrollTop = scroll;
        if (act === 'gear-pull' && drawnGear.length) {
            const sequence = ++pullSequence;
            window.setTimeout(() => { if (view === 'gacha' && sequence === pullSequence)
                app.querySelector('.pull-reveal')?.scrollIntoView({ block: 'start' }); }, save.settings.reduced ? 0 : 1100);
        }
        return;
    }
    if (act === 'copy-record') {
        void copyRecord();
        return;
    }
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
        if (!Number.isInteger(n) || n < 0 || n >= CHAPTERS.length)
            return;
        if (n > save.unlocked) {
            audio.ui('locked');
            toast(tr('clearFirst'));
            return;
        }
        selectedSector = n;
        special = false;
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
        if (['equipment', 'fusion', 'gacha'].includes(view)) {
            setView(gearReturn);
            return;
        }
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
    set('hud-sector', sim.chapter?.[save.settings.lang] ?? d.sectorNames[sim.sector]);
    fill('run-fill', sim.progress);
    set('hud-level', String(sim.level));
    set('hud-hp', `${Math.ceil(p.hp)} / ${Math.round(p.maxHp)}`);
    fill('hp-fill', p.hp / p.maxHp);
    fill('xp-fill', sim.xp / xpNeeded(sim.level));
    set('hud-xp', `${Math.floor(sim.xp / xpNeeded(sim.level) * 100)}%`);
    set('hud-ship', sim.expedition && sim.chapter?.kind === 'ground' ? save.crew.toUpperCase() : d.shipNames[SHIPS.findIndex(s => s.id === sim.ship)]);
    set('hud-time', clock(sim.time));
    set('map-time', clock(sim.time));
    document.getElementById('status-box')?.classList.toggle('low', p.hp < p.maxHp * .25);
    set('dash-text', p.dashCD > 0 ? p.dashCD.toFixed(1) : tr('dash'));
    const boss = sim.enemies.find(e => e.type === 'boss' && e.hp > 0 && e.role === 'final') ?? sim.enemies.find(e => e.type === 'boss' && e.hp > 0);
    document.getElementById('bossbar').hidden = !boss;
    if (boss) {
        set('boss-name', sim.expedition && LOCAL_BOSSES[sim.chapter.id] ? localBossName(sim.chapter.id, boss.bossArt, boss.role === 'final') : d.bossNames[boss.bossArt]);
        set('boss-phase', `${d.stage} ${boss.phase + 1}/${boss.stages} / ${Math.ceil(boss.hp)} / ${Math.ceil(boss.maxHp)}`);
        document.getElementById('bossbar').style.setProperty('--stage-width', `${100 / boss.stages}%`);
        fill('boss-fill', boss.hp / boss.maxHp);
    }
    if (announcedSim !== sim) {
        announcedSim = sim;
        announced.clear();
        combatNotice.clear();
    }
    const next = sim.encounters[sim.encounterIndex], remaining = (next?.at ?? Infinity) - sim.time, last = sim.bossRecords.at(-1);
    const bossLabel = (art, final) => sim.expedition && localBossName(sim.chapter.id, art, final) || d.bossNames[art];
    if (remaining <= 2.5 && remaining > 0)
        announce('warning:' + sim.encounterIndex, (save.settings.lang === 'ko' ? '접근 감지 · ' : 'Approaching · ') + bossLabel(next.art < 0 ? sim.sector : next.art, next.role === 'final'), 2);
    if (last && sim.time - last.spawned < 1.5)
        announce('boss:' + last.id, (last.role === 'final' ? (save.settings.lang === 'ko' ? '최종 보스 · ' : 'Final boss · ') : '') + bossLabel(last.art, last.role === 'final'), 3);
    if (sim.swarmIndex && sim.time - sim.swarmStarted < 1.5)
        announce('swarm:' + sim.swarmIndex, arrivalNames[save.settings.lang][arrivalFor(sim.chapter?.id ?? '')]);
    const message = combatNotice.current(performance.now()), incoming = document.getElementById('incoming');
    incoming.hidden = !message;
    if (message && incoming.dataset.notice !== String(combatNotice.started)) {
        incoming.dataset.notice = String(combatNotice.started);
        incoming.style.animation = 'none';
        void incoming.offsetWidth;
        incoming.style.animation = '';
    }
    incoming.classList.toggle('final', !!last && last.role === 'final' && combatNotice.key === 'boss:' + last.id);
    set('incoming-kind', '');
    set('incoming-count', message);
    const progress = document.querySelector('.run-progress');
    progress?.setAttribute('aria-valuenow', String(Math.floor(sim.progress * 100)));
    set('run-percent', Math.floor(sim.progress * 100) + '%');
    for (const marker of document.querySelectorAll('[data-boss]')) {
        const record = sim.bossRecords[Number(marker.dataset.boss)];
        marker.classList.toggle('cleared', record?.killed != null);
        marker.classList.toggle('active', !!record && record.killed == null);
    }
    document.getElementById('bossbar').classList.toggle('final', boss?.role === 'final');
    document.getElementById('danger-label').hidden = save.settings.telegraphs === 'off' || !sim.hazards.some(h => h.age < h.warning && (h.boss || save.settings.telegraphs === 'all')) && !boss?.warnTime;
    set('objective-label', sim.beacon ? '◈' : sim.drops.length ? '▣' : '');
    document.getElementById('objective-label').title = sim.beacon ? tr('beaconDesc') : sim.drops.length ? tr('findChest') : '';
    const chips = document.getElementById('upgrade-chips'), markup = `<div class="slot-label">${tr('weapon')} ${sim.weapons.length}/6</div><div class="slot-row">${Array.from({ length: 6 }, (_, i) => { const w = sim.weapons[i], wi = w ? WEAPONS.findIndex(d => d.id === w.id) : -1; return `<span class="slot ${w?.evolved ? 'evolved' : ''}" ${w ? `title="${esc(w.fusion ? combatCopy(save.settings.lang).fusionNames[FUSIONS.findIndex(f => f.id === w.fusion)] : w.evolved ? d.evolutionNames[wi] : d.weaponNames[wi])}"` : ''}>${w ? icon(w.id, w.evolved) + `<small>${w.evolved ? '&#9733;' : w.level >= 8 ? d.max : w.level}</small>` : ''}</span>`; }).join('')}</div><div class="slot-label">${tr('passive')} ${Object.keys(sim.passives).length}/6</div><div class="slot-row">${Array.from({ length: 6 }, (_, i) => { const id = Object.keys(sim.passives)[i]; return `<span class="slot">${id ? icon(id) + `<small>${sim.passives[id] >= 6 ? d.max : sim.passives[id]}</small>` : ''}</span>`; }).join('')}</div>${Object.values(sim.boosts).some(n => n > 0) ? `<div class="extra-boosts">${d.stacked}: ${d.boostDescriptions.map((label, i) => label.replace(/\d+/, String([sim.boosts.damage * 3, sim.boosts.hull * 5, sim.boosts.reach * 5][i]))).join(' / ')}</div>` : ''}`;
    if (chips.innerHTML !== markup)
        chips.innerHTML = markup;
    const perf = document.getElementById('perf');
    perf.hidden = !showPerf;
    perf.textContent = `${fps.toFixed(0)} FPS  ${sim.enemies.length} / ${sim.shots.length + sim.bullets.length}`;
}
function resize() { V.w = window.innerWidth; V.h = window.innerHeight; V.dpr = Math.min(window.devicePixelRatio || 1, 1.5); V.scale = fieldScale(V.w, V.h); cosmos.resize(V.w, V.h, V.dpr, 'auto'); }
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
    return; sim.viewWidth = V.w / V.scale; sim.viewHeight = V.h / V.scale; sim.step(dt, inputState()); cosmos.consumeEvents(sim.events); audio.consume(sim.events, { x: V.camX, y: V.camY, width: V.w / V.scale, height: V.h / V.scale }); audio.combat(sim.sector, sim.timeline, visibleEnemies(), sim.enemies.some(e => e.type === 'boss' && e.hp > 0), sim.enemies.some(e => e.role === 'final' && e.hp > 0)); if (sim.events.some(e => e.kind === 'boss')) {
    document.getElementById('cue-skip')?.remove();
    app.insertAdjacentHTML('beforeend', btn('skip-cue', tr('skipCue'), 'cue-skip', 'id="cue-skip"'));
} sim.events.length = 0; if (sim.status !== 'playing') {
    finish();
    return;
} if (!sim.bossKilled && (sim.pendingLevels || sim.pendingChests))
    openChoice(); }
function frame(now) {
    frameStats.observe(now, view === 'playing' && !document.hidden);
    if (document.hidden) {
        stamp = now;
        requestAnimationFrame(frame);
        return;
    }
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
        cosmos.render(scene, V, { lang: save.settings.lang, reduced: save.settings.reduced, quality: quality === 'low' || quality === 'auto' && frameStats.autoLow ? 'low' : 'high', effectsOpacity: 1 - effectsTransparency, largeProjectiles, telegraphs: save.settings.telegraphs });
        scene.floaters = f;
    }
    else
        cosmos.render(scene, V, { lang: save.settings.lang, reduced: save.settings.reduced, quality: quality === 'low' || quality === 'auto' && frameStats.autoLow ? 'low' : 'high', effectsOpacity: 1 - effectsTransparency, largeProjectiles, telegraphs: save.settings.telegraphs });
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
app.addEventListener('change', e => { const el = e.target; if (el.dataset.gearFilter) {
    if (el.dataset.gearFilter === 'slot')
        slotFilter = el.value;
    if (el.dataset.gearFilter === 'rank')
        rankFilter = el.value;
    if (el.dataset.gearFilter === 'sort')
        gearSort = el.value;
    drawUI();
    return;
} if (el.id === 'difficulty')
    difficulty = el.value; if (el.dataset.setting === 'telegraphs') {
    save.settings.telegraphs = el.value === 'all' || el.value === 'off' ? el.value : 'boss';
    if (sim)
        sim.telegraphs = save.settings.telegraphs;
    persist();
    return;
} if (el.dataset.setting === 'lang') {
    save.settings.lang = el.value === 'en' ? 'en' : 'ko';
    persist();
    drawUI();
} });
app.addEventListener('input', e => { const el = e.target, k = el.dataset.setting; if (k === 'movement') {
    save.settings.movement = el.value === 'instant' ? 'instant' : 'weighted';
    if (sim)
        sim.movement = save.settings.movement;
    persist();
    return;
} if (el.dataset.setting === 'fpsDisplay') {
    showPerf = el.checked;
    visualPreference('fps', showPerf ? '1' : '0');
    return;
} if (el.dataset.setting === 'quality') {
    quality = ['high', 'low'].includes(el.value) ? el.value : 'auto';
    frameStats.autoLow = false;
    visualPreference('quality', quality);
    return;
} if (el.dataset.setting === 'largeProjectiles') {
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
else if (k === 'reduced' || k === 'numbers' || k === 'lessNotices') {
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
        visualPreference('fps', showPerf ? '1' : '0');
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
document.addEventListener('visibilitychange', () => { resetInput(); if (document.hidden) {
    if (view === 'playing')
        setView('pause');
    audio.stop();
    void audio.ctx?.suspend?.().catch(() => { });
}
else if (view !== 'pause')
    audio.setScene(view === 'settings' && sim ? 'pause' : view); });
const canvas = document.querySelector('#world');
canvas.addEventListener('webglcontextlost', () => { if (view === 'playing')
    action('pause'); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => { if (view !== 'playing')
    return; audio.unlock(); if (e.pointerType === 'touch') {
    e.preventDefault();
    if (e.clientX < V.w * .5 && e.clientY > V.h * .5 && !Array.from(document.querySelectorAll('#upgrade-chips,.status-box,.hud-actions,.minimap-wrap,#bossbar')).some(el => { const r = el.getBoundingClientRect(); return r.width > 0 && e.clientX > r.left - 44 && e.clientX < r.right + 44 && e.clientY > r.top - 44 && e.clientY < r.bottom + 44; }))
        beginJoystick(e);
    return;
} pointer.down = e.button === 2; pointer.aim = e.button === 0; pointer.x = e.clientX; pointer.y = e.clientY; canvas.setPointerCapture?.(e.pointerId); });
window.addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; if (e.pointerId === joy.id)
    moveJoystick(e); });
function moveJoystick(e) { const el = document.getElementById('joystick'); if (!el)
    return; const radius = (el.getBoundingClientRect().width || 88) * .33, dx = e.clientX - joy.originX, dy = e.clientY - joy.originY, d = Math.hypot(dx, dy), scale = Math.min(1, radius / (d || 1)); joy.x = dx * scale / radius; joy.y = dy * scale / radius; document.getElementById('stick').style.transform = `translate(${dx * scale}px,${dy * scale}px)`; }
function beginJoystick(e) { if (joy.id !== -1)
    return; const el = document.getElementById('joystick'); if (!el)
    return; joy.id = e.pointerId; joy.originX = e.clientX; joy.originY = e.clientY; el.classList.add('active'); el.style.left = e.clientX + 'px'; el.style.top = e.clientY + 'px'; el.style.bottom = 'auto'; el.style.transform = 'translate(-50%,-50%)'; e.target.setPointerCapture?.(e.pointerId); moveJoystick(e); }
app.addEventListener('pointerdown', e => { audio.unlock(); if (view !== 'playing')
    return; const el = e.target; if (el.closest('#joystick')) {
    e.preventDefault();
    beginJoystick(e);
} if (el.closest('#dash-btn')) {
    e.preventDefault();
    dashPressed = true;
} });
function pointerUp(e) { pointer.down = pointer.aim = false; if (e.pointerId === joy.id) {
    joy.id = -1;
    joy.x = joy.y = 0;
    const base = document.getElementById('joystick');
    if (base) {
        base.classList.remove('active');
        base.removeAttribute('style');
    }
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
if (storageRaw && !parsed.future && !parsed.warning && [2, 3, 4].includes(JSON.parse(storageRaw).version))
    persist();
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
    save = { ...defaultSave(), unlocked: 7, shards: 500, ships: SHIPS.map(s => s.id) };
    if (['equipment', 'fusion', 'gacha', 'chapters', 'rewards'].includes(screen)) {
        save.equipment.gold = 15000;
        save.equipment.gems = 900;
        for (const slot of SLOTS)
            save.equipment.blueprints[slot] = 100;
        for (const def of GEAR) {
            save.equipment = addItem(save.equipment, def.id, 2);
            save.equipment = addItem(save.equipment, def.id, 2);
            save.equipment = addItem(save.equipment, def.id, 2);
        }
        selectedGear = 7;
        drawnGear = [7, 10, 13];
        if (screen === 'rewards') {
            sim = new Simulation(save.ship, save.meta, 42, 'preview-rewards', 2, 'normal', save.equipment);
            sim.time = 448;
            sim.kills = 1400;
            sim.status = 'lost';
            sim.bossRecords = [{ id: 1, art: 6, role: 'captain', spawned: 90, killed: 120, phases: [105], hp: 1000 }, { id: 2, art: 7, role: 'captain', spawned: 210, killed: 240, phases: [225], hp: 1200 }];
            save = settle(save, sim.result());
            setView('result');
            return;
        }
        setView(screen);
        return;
    }
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
    if (['launch', 'atmosphere', 'village'].includes(screen)) {
        const key = screen === 'village' ? 'village' : screen === 'launch' ? 0 : 1;
        sim = new Simulation(save.ship, save.meta, 42, 'm10-preview', 0, 'normal', save.equipment, { chapter: key, crew: save.crew, movement: save.settings.movement });
        sim.invincible = true;
        sim.time = 145;
        sim.setLoadout(['pulse', 'orbit', 'bomb'], { power: 2, magnet: 2 });
        for (let i = 0; i < 24; i++) {
            const a = i * 2.4, d = 180 + i * 9;
            sim.spawn('rusher', 2400 + Math.cos(a) * d, 1600 + Math.sin(a) * d);
        }
        for (let i = 0; i < 18; i++)
            sim.dropXP(2400 + Math.cos(i) * 180, 1600 + Math.sin(i) * 180, 7);
        V.camX = 2400;
        V.camY = 1600;
        stressPreview = true;
        setView('playing');
        updateHUD();
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
export const dev = DEV ? { get save() { return save; }, get view() { return view; }, get sim() { return sim; }, get offers() { return offers; }, get preview() { return preview; }, setSave(value) { save = value; audio.update(save.settings); }, action, advance, openChoice, choose, previewScreen, drawUI, get fps() { return fps; }, frameStats, get quality() { return quality; }, get audio() { return audio; } } : undefined;
if (DEV) {
    const screen = new URLSearchParams(location.search).get('screen');
    if (screen)
        previewScreen(screen);
}

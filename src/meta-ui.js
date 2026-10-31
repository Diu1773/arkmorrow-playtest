import { SLOTS, RANKS, gearDef, gearName, gearBonus } from './equipment.js';
import { metaCopy, GRADE_COLORS } from './meta-copy.js';
import { equipmentCopy, combatCopy, text } from './i18n.js';
import { stackCount, availableCopies, powerDelta, equipmentPower, equipStack, equipBest, upgradeSlot, slotCost, planFusion, commitFusion, setStackFlag } from './meta-equipment.js';
import { ROOMS, canRestoreRoom, restoreRoom, roomFeatures, collectParts, producedParts } from './base-rooms.js';
import { totalStars, difficultyOpen, toggleScarf } from './meta-progression.js';
import { starGoalsUI, scarfUI, gemBreakdownUI } from './reward-ui.js';
import { CHAPTERS, chapterDef } from './chapters.js';
import { ECONOMY, pull, powerStatus } from './economy.js';
import { bossDesign } from './boss-catalog.js';
const button = (act, label, id = '', disabled = false) => `<button class="btn" data-act="${act}" data-id="${id}" ${disabled ? 'disabled' : ''}>${label}</button>`;
const signed = (n) => `${n > 0 ? '+' : ''}${n}`;
const icon = (i) => `<canvas data-gear="${i.uid}" width="24" height="24" aria-hidden="true"></canvas>`;
export const starMarks = (mask) => [1, 2, 4].map(b => mask & b ? '★' : '☆').join('');
export function itemCard(i, save, selected = 0) { const d = metaCopy(save.settings.lang), worn = save.equipment.equipped[gearDef(i).slot] === i.uid, delta = powerDelta(save.equipment, i.uid), count = stackCount(i); return `<button class="meta-card grade-${i.rank} ${selected === i.uid ? 'selected' : ''}" style="--grade:${GRADE_COLORS[i.rank]}" data-act="meta-inspect" data-id="${i.uid}" aria-label="${gearName(i, save.settings.lang)} ${d.rank[i.rank]} ${count} ${worn ? d.wearing : ''}" aria-pressed="${selected === i.uid}"><span class="grade-marks" aria-hidden="true">${'◆'.repeat(i.rank)}</span>${!worn && delta > 0 ? `<strong class="better">▲ ${signed(delta)}</strong>` : ''}${!i.seen ? `<span class="new-dot" title="${d.fresh}">●</span>` : ''}${icon(i)}<span class="card-name">${gearName(i, save.settings.lang)}</span><small>${d.rank[i.rank]} · Lv ${i.level}</small><span class="copy-meter ${availableCopies(save.equipment, i) >= 3 ? 'ready' : ''}"><i style="width:${Math.min(100, availableCopies(save.equipment, i) / 3 * 100)}%"></i><b>${count}/3</b></span>${worn ? `<span class="worn">${d.wearing}</span>` : ''}${i.locked ? `<span class="lock-mark" title="${d.lock}">🔒</span>` : ''}</button>`; }
const wallet = (s) => { const d = metaCopy(s.settings.lang); return `<div class="meta-wallet"><span>${d.dust} <b>${s.shards}</b></span><span>${d.parts} <b>${s.equipment.parts ?? 0}</b></span><span>${d.gems} <b>${s.equipment.gems}</b></span></div>`; };
const statsLine = (i, s) => { const d = metaCopy(s.settings.lang); if (!i)
    return d.empty; const def = gearDef(i), scale = (1 + i.rank * .8) * (1 + (i.level - 1) * .12); return `${d.stats[0]} +${Math.round(def.attack * scale * 100)}%<br>${d.stats[1]} +${Math.round(def.hp * scale)}<br>${d.stats[2]} +${(def.armor * scale).toFixed(1)}`; };
const traits = (i, s) => { if (!i)
    return []; const def = gearDef(i), d = equipmentCopy(s.settings.lang), keys = ['linkedShot', 'bossDamage', 'linkedPower', 'lowSpeed', 'dashHaste', 'lastShield', 'regen', 'killHeal', 'rescue', 'area', 'magnet', 'xp', 'cooldown', 'armor']; return [...def.traits.filter((_, n) => i.rank >= n + 2).map(t => d.trait[keys.indexOf(t)]), ...(i.rank === 5 ? [combatCopy(s.settings.lang).chaosTraits[SLOTS.indexOf(def.slot)]] : [])]; };
export class MetaScreen {
    selected = 0;
    overlay = '';
    plan = null;
    max = 3;
    drawn = [];
    skipped = false;
    previousPower = 0;
    reset() { this.overlay = ''; this.plan = null; }
    handle(act, id, save) {
        if (!act.startsWith('meta-'))
            return null;
        const s = save.equipment, uid = Number(id);
        if (act === 'meta-inspect') {
            this.selected = uid;
            this.overlay = 'compare';
            return { ...save, equipment: setStackFlag(s, uid, 'seen', true) };
        }
        if (act === 'meta-close') {
            this.reset();
            return save;
        }
        if (act === 'meta-skip') {
            this.skipped = true;
            return save;
        }
        if (act === 'meta-lock') {
            const item = s.items.find(i => i.uid === uid);
            return item ? { ...save, equipment: setStackFlag(s, uid, 'locked', !item.locked) } : save;
        }
        if (act === 'meta-equip')
            return { ...save, equipment: equipStack(s, uid) };
        if (act === 'meta-best') {
            this.previousPower = equipmentPower(s);
            return { ...save, equipment: equipBest(s) };
        }
        if (act === 'meta-level')
            return upgradeSlot(save, uid);
        if (act === 'meta-batch') {
            this.max = 3;
            this.plan = planFusion(s, this.max);
            this.overlay = 'preview';
            return save;
        }
        if (act === 'meta-scope') {
            if ([3, 4, 5].includes(uid)) {
                this.max = uid;
                this.plan = planFusion(s, this.max);
            }
            return save;
        }
        if (act === 'meta-fuse' || act === 'meta-substitute') {
            this.plan = planFusion(s, 5, uid, act === 'meta-substitute');
            this.overlay = 'preview';
            return save;
        }
        if (act === 'meta-confirm' && this.plan) {
            if (this.plan.single === undefined && !roomFeatures(save).batchFusion)
                return save;
            const next = commitFusion(s, this.plan);
            if (next === s) {
                this.plan = planFusion(s, this.max, this.plan.single, this.plan.substitute);
                return save;
            }
            this.overlay = 'result';
            this.skipped = false;
            return { ...save, equipment: next };
        }
        if (act === 'meta-pull') {
            const result = pull(s, uid === 10 ? 10 : 1, Math.random);
            this.drawn = result.items;
            return { ...save, equipment: result.state };
        }
        if (act === 'meta-restore')
            return restoreRoom(save, id);
        if (act === 'meta-collect')
            return collectParts(save);
        if (act === 'meta-scarf')
            return toggleScarf(save);
        return save;
    }
    render(save, screen, slotFilter, rankFilter, sort) {
        const d = metaCopy(save.settings.lang), s = save.equipment, power = equipmentPower(s), b = gearBonus(s);
        const header = `<div class="dialog-head"><h2>${screen === 'gacha' ? d.supply : d.equipment}</h2>${button('back', d.back)}</div>${wallet(save)}<div class="meta-power">${d.power} <strong>${power}</strong>${this.previousPower && this.previousPower !== power ? `<span class="better">${this.previousPower} → ${power}</span>` : ''}</div><nav class="meta-tabs">${button('gear-view', d.equipment, 'equipment')}${button('gear-view', d.supply, 'gacha')}</nav>`;
        if (screen === 'gacha')
            return header + `<section class="meta-supply"><img src="./assets/pixel/icons/chest.png" width="96" height="96" alt=""><p>${d.pity}: ${d.rank[2]} ${10 - s.pityRare} / ${d.rank[3]} ${40 - s.pityEpic}</p><div class="button-row">${button('meta-pull', `${d.pull} ×1 · 30`, '1', s.gems < 30)}${button('meta-pull', `${d.pull} ×10 · 300`, '10', s.gems < 300)}</div><p>${d.odds}</p><div class="meta-odds">${ECONOMY.pullRates.map((p, n) => `<span style="color:${GRADE_COLORS[n]}">${d.rank[n]} ${p * 100}%</span>`).join('')}</div></section><div class="meta-bag">${this.drawn.map(uid => s.items.find(i => i.uid === uid)).filter((i) => !!i).map(i => itemCard(i, save, this.selected)).join('')}</div>` + this.sheet(save);
        const worn = (n) => { const slot = SLOTS[n], item = s.items.find(i => i.uid === s.equipped[slot]), better = s.items.some(i => gearDef(i).slot === slot && powerDelta(s, i.uid) > 0); return `<div class="meta-slot"><span>${d.slots[n]} Lv ${s.slotLevels?.[slot] ?? 1} ${better ? '▲' : ''}</span>${item ? itemCard(item, save) : d.empty}</div>`; };
        let bag = s.items.filter(i => (slotFilter === 'all' || gearDef(i).slot === slotFilter) && (rankFilter === 'all' || i.rank === Number(rankFilter)));
        bag = bag.sort((a, b) => Number(s.equipped[gearDef(b).slot] === b.uid) - Number(s.equipped[gearDef(a).slot] === a.uid) || (sort === 'power' ? powerDelta(s, b.uid) - powerDelta(s, a.uid) : sort === 'new' ? Number(a.seen) - Number(b.seen) || b.uid - a.uid : b.rank - a.rank) || a.uid - b.uid);
        return header + `<div class="meta-loadout"><div>${[0, 2, 4].map(worn).join('')}</div><div class="meta-person"><canvas data-crew="${save.crew}" width="192" height="192"></canvas><strong>${save.crew.toUpperCase()}</strong></div><div>${[1, 3, 5].map(worn).join('')}</div></div><p class="meta-totals">${d.stats[0]} +${Math.round(b.attack * 100)}% / ${d.stats[1]} +${Math.round(b.hp)} / ${d.stats[2]} +${b.armor.toFixed(1)}</p><div class="meta-toolbar">${button('meta-best', d.best)}${button('meta-batch', `${d.preview} ●${planFusion(s).steps.length}`, '', !roomFeatures(save).batchFusion)}</div>${!roomFeatures(save).batchFusion ? `<p class="meta-help">${d.workshop}</p>` : ''}<div class="meta-filters"><h3>${d.bag} ${s.items.length}</h3><label>${d.all}<select data-gear-filter="slot"><option value="all">${d.all}</option>${SLOTS.map((slot, n) => `<option value="${slot}" ${slotFilter === slot ? 'selected' : ''}>${d.slots[n]}</option>`).join('')}</select></label><label>${d.scope}<select data-gear-filter="rank"><option value="all">${d.all}</option>${d.rank.map((r, n) => `<option value="${n}" ${rankFilter === String(n) ? 'selected' : ''}>${r}</option>`).join('')}</select></label><label>${d.sort}<select data-gear-filter="sort">${[['power', d.byPower], ['rank', d.byRank], ['new', d.byNew]].map(([v, label]) => `<option value="${v}" ${sort === v ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div><div class="meta-bag">${bag.map(i => itemCard(i, save, this.selected)).join('')}</div>` + this.sheet(save);
    }
    sheet(save) {
        if (!this.overlay)
            return '';
        const d = metaCopy(save.settings.lang), s = save.equipment, item = s.items.find(i => i.uid === this.selected), plan = this.plan;
        let body = '';
        if (this.overlay === 'compare' && item) {
            const current = s.items.find(i => i.uid === s.equipped[gearDef(item).slot]), delta = powerDelta(s, item.uid), c = slotCost(s.slotLevels?.[gearDef(item).slot] ?? 1), canLevel = save.shards >= c.dust && (s.parts ?? 0) >= c.parts, cap = RANKS[current?.rank ?? item.rank].max, atCap = (s.slotLevels?.[gearDef(item).slot] ?? 1) >= cap, added = traits(item, save).filter(t => !traits(current, save).includes(t)), lost = traits(current, save).filter(t => !traits(item, save).includes(t));
            body = `<h2>${gearName(item, save.settings.lang)}</h2><p class="meta-power ${delta < 0 ? 'worse' : 'better'}">${d.power} ${signed(delta)}</p><div class="meta-comparison"><article><h3>${d.now}</h3>${current ? itemCard(current, save) : d.empty}<p>${statsLine(current, save)}</p></article><article><h3>${d.chosen}</h3>${itemCard(item, save, this.selected)}<p>${statsLine(item, save)}</p></article></div><div class="meta-traits">${traits(item, save).map(t => `<p>${added.includes(t) ? `<b>${d.newTrait}</b> ` : ''}${t}</p>`).join('')}${lost.map(t => `<p class="worse">${d.lostTrait}: ${t}</p>`).join('')}</div><p>${d.dust} ${c.dust} + ${d.parts} ${c.parts} / Lv ${s.slotLevels?.[gearDef(item).slot] ?? 1} → ${cap}</p><div class="meta-toolbar">${button('meta-equip', d.equip, String(item.uid), current?.uid === item.uid)}${button('meta-lock', item.locked ? d.unlock : d.lock, String(item.uid))}${button('meta-level', atCap ? d.limit : d.level, String(item.uid), atCap || !canLevel)}${button('meta-fuse', d.fusion, String(item.uid), !planFusion(s, 5, item.uid).steps.length)}${item.rank === 3 ? button('meta-substitute', d.substitute, String(item.uid), !planFusion(s, 5, item.uid, true).steps.length) : ''}</div>${atCap ? `<p>${d.limit}</p>` : !canLevel ? `<p>${d.need}</p>` : ''}${!planFusion(s, 5, item.uid).steps.length ? `<p>${d.missing}</p>` : ''}`;
        }
        if (this.overlay === 'preview' && plan)
            body = `<h2>${d.preview}</h2>${plan.single === undefined ? `<label>${d.scope}<select data-meta-scope>${[3, 4, 5].map((r, n) => `<option value="${r}" ${this.max === r ? 'selected' : ''}>${d.scopes[n]}</option>`).join('')}</select></label>` : ''}<div class="meta-plan">${plan.steps.map(step => `<p>${step.materials.map(m => `${gearName({ ...step.before, def: m.def }, save.settings.lang)} ${d.rank[m.rank]} ×${m.count}`).join(' + ')} → <b style="color:${GRADE_COLORS[step.to]}">${d.rank[step.to]} ×${step.count}</b></p>`).join('') || d.noFusion}</div><p>${d.protected} (${plan.protected})</p><div class="meta-toolbar">${button('meta-confirm', `${d.confirm} · ${plan.steps.reduce((n, s) => n + s.count, 0)}`, '', !plan.steps.length)}${button('meta-close', d.cancel)}</div>`;
        if (this.overlay === 'result' && plan)
            body = `<div class="fusion-show ${save.settings.reduced || this.skipped ? 'instant' : ''}" data-act="meta-skip"><h2>${d.done}</h2><div class="fusion-summary"><p class="meta-power">${d.power} ${plan.beforePower} &#8594; ${plan.afterPower} (${signed(plan.afterPower - plan.beforePower)})</p><p>${d.best}: ${equipmentPower(equipBest(s))}</p><div class="meta-toolbar">${button('meta-best', d.best)}${button('meta-close', d.close)}</div></div><div class="fusion-material-ghosts" aria-hidden="true"><i>▣</i><i>▣</i><i>▣</i></div><div class="fusion-flash"></div><div class="meta-bag fusion-cards">${plan.steps.map((step, n) => `<article style="--order:${n}">${itemCard(step.after, save)}<p>${d.rank[step.from]} → ${d.rank[step.to]} ×${step.count}</p><p>${statsLine(step.before, save)} →<br>${statsLine(step.after, save)}</p>${traits(step.after, save).filter(t => !traits(step.before, save).includes(t)).map(t => `<p class="better">${d.newTrait}: ${t}</p>`).join('')}</article>`).join('')}</div><div class="fusion-after"><p class="meta-power">${d.power} ${plan.beforePower} → ${plan.afterPower} (${signed(plan.afterPower - plan.beforePower)})</p><p>${d.power} ▲ ${equipmentPower(equipBest(s))} (${d.best})</p><div class="meta-toolbar">${button('meta-best', d.best)}${button('meta-close', d.close)}</div></div><small>${d.skip}</small></div>`;
        return `<div class="meta-sheet-shade"><section class="meta-sheet" role="dialog" aria-modal="true" aria-label="${d.equipment}" tabindex="-1">${this.overlay === 'compare' ? button('meta-close', d.back) : ''}${body}</section></div>`;
    }
}
export function roomsUI(save) { const d = metaCopy(save.settings.lang), f = roomFeatures(save), features = [d.preview, d.rescue, d.bossPreview, d.startChest, d.produce, d.archive]; return `<div class="dialog-head"><h2>${d.rooms}</h2>${button('back', d.back)}</div>${wallet(save)}<p class="meta-power">${d.stars} ${totalStars(save)}</p>${save.migrationRefund ? `<p>${d.refund}: +${save.migrationRefund} ${d.dust}</p>` : ''}<div class="meta-rooms">${ROOMS.map((r, n) => `<article class="${save.rooms[r.id].restored ? 'restored' : ''}"><span class="room-lamp">${save.rooms[r.id].restored ? '◆' : '◇'}</span><h3>${r[save.settings.lang]}</h3><p>${features[n]}</p><p>${d.require}: ${d.clear} ${r.chapter + 1} / ${d.stars} ${r.stars}</p><p>${d.dust} ${r.cost}</p>${button('meta-restore', save.rooms[r.id].restored ? d.repaired : d.restore, r.id, !canRestoreRoom(save, r.id))}${r.id === 'communications' && f.archive ? button('hub-archive', d.archive) : ''}${r.id === 'greenhouse' && f.partsProduction ? `<p>${d.produce}: ${producedParts(save)}</p>${button('meta-collect', d.claim, '', !producedParts(save))}` : ''}${!save.rooms[r.id].restored && !canRestoreRoom(save, r.id) ? `<small>${d.repairNeed}</small>` : ''}</article>`).join('')}</div>${scarfUI(save)}`; }
export function chapterUI(save, selected, launch = '', recordKey = String(selected)) { const d = metaCopy(save.settings.lang), e = equipmentCopy(save.settings.lang), power = equipmentPower(save.equipment); return `<div class="dialog-head"><h2>${e.chapters}</h2>${button('back', d.back)}</div>${launch}${starGoalsUI(save.records[recordKey]?.stars ?? 0, save.settings.lang)}<p class="meta-power">${d.stars} ${totalStars(save)} / 27</p><div class="chapter-list vertical-map">${[...CHAPTERS].reverse().map((c, j) => { const n = 7 - j, r = save.records[String(n)]; return `<button class="chapter-choice ${selected === n ? 'selected' : ''} ${r?.clears.hard ? 'gold-record' : ''}" data-act="chapter-pick" data-id="${n}" ${n > save.unlocked ? 'disabled' : ''}><span class="map-body">${n + 1}</span><span><h3>${c[save.settings.lang]}</h3><strong class="meta-stars">${starMarks(r?.stars ?? 0)}</strong><p>${e.recommended} ${c.recommended} / ${e.status[powerStatus(power, c.recommended)]}</p><small>${r?.clears.hard ? d.gold : difficultyOpen(save, String(n), 'hard') ? text(save.settings.lang).hard : d.hardGate}</small>${roomFeatures(save).bossPreview ? `<p>${d.bossPreview}: ${bossDesign(chapterDef(n).id).moves.map(m => metaCopy(save.settings.lang).moves[m]).join(' / ')}</p>` : ''}</span></button>`; }).join('')}</div>`; }
export function metaRewardUI(save) { const d = metaCopy(save.settings.lang), loot = save.lastMetaLoot; return loot ? `<section class="meta-rewards"><h3>${d.reward}</h3><p class="meta-power">${d.multiplier} ×${loot.multiplier.toFixed(1)}</p><p class="meta-stars">${d.earnedStars} ${starMarks(loot.stars)}</p><p>${d.dust} +${loot.dust} / ${d.parts} +${loot.parts} / ${d.gems} +${loot.gems}</p>${gemBreakdownUI(save)}${loot.firstDifficulty ? `<strong>${d.first}${loot.exclusive ? ' ◆ ' + d.gold : ''}</strong>` : ''}<div class="meta-bag">${save.equipment.lastLoot?.items.map(i => itemCard(i, save)).join('') ?? ''}</div>${button('gear-view', d.upgrade, 'equipment')}</section>` : ''; }

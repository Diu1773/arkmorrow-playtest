import { combatText as text, combatLabels, combatCopy } from './combat-copy.js';
import { skillDef } from './combat-catalog.js';
import { passiveApplication } from './combat-ui.js';
import { ELEMENTS, PASSIVES, WEAPONS } from './data.js';
import { canFuse, FUSIONS, REACTIONS, reactionReady, weaponsReact } from './combat-rules.js';
import { rankCopy, signalCopy } from './i18n.js';
import { RUN_CHESTS, RUN_SKILL_LIMIT, runChestRates } from './economy.js';
export const weaponName = (id, lang) => text(lang).weaponNames[WEAPONS.findIndex(w => w.id === id)];
export function aimBadge(id, lang) {
    const mode = WEAPONS.find(w => w.id === id).aim, d = signalCopy(lang), shape = mode === 'closest' ? '<path d="M4 0h2v3H4zM0 4h3v2H0zM7 4h3v2H7zM4 7h2v3H4zM4 4h2v2H4z"/>' : mode === 'movement' ? '<path d="M4 0h2v2h2v2h2v2H6v4H4V6H0V4h2V2h2z"/>' : '<path d="M2 0h6v2H2zM0 2h2v6H0zM8 2h2v6H8zM2 8h6v2H2z"/>';
    return `<span class="aim-tag" data-aim="${mode}" title="${d.aim}: ${d.aimLabels[mode]}"><svg viewBox="0 0 10 10" width="10" height="10" fill="currentColor" aria-hidden="true" shape-rendering="crispEdges">${shape}</svg> ${d.aimLabels[mode]}</span>`;
}
export function choiceDetails(s, c, lang) {
    if (c.kind === 'skill' || c.kind === 'skillEvolve') {
        const def = skillDef(c.id), slot = s.skills.find(s => s.id === c.id);
        return `<div class="combo-detail"><small>${combatLabels(lang).skills} ${slot?.level ?? 0}/5 → ${def.evolution}</small><small>${def[lang]}</small></div>`;
    }
    const d = combatCopy(lang), w = WEAPONS.find(w => w.id === (c.kind === 'fusion' ? FUSIONS.find(f => f.id === c.id)?.a : c.id)), p = PASSIVES.find(p => p.id === c.id);
    if (!w && !p)
        return '';
    const owned = s.weapons.map(w => w.id), element = w?.element, partners = w ? owned.filter(id => id !== w.id && weaponsReact(w.id, id)) : WEAPONS.filter(w => w.passive === p.id && owned.includes(w.id)).map(w => w.id);
    const slot = s.weapons.find(slot => slot.id === w?.id), passive = w ? s.passives[w.passive] ?? 0 : 0;
    const fusion = FUSIONS.filter(f => !s.skills.some(slot => slot.fusion === f.id) && f.a === w?.id).map(f => `${d.fusion}: ${weaponName(f.a, lang)} ${s.weapons.find(w => w.id === f.a)?.level ?? 0}/5 + ${skillDef(f.b).name} ${s.skills.find(s => s.id === f.b)?.level ?? 0}/5`).join('<br>');
    return `<div class="combo-detail">${w ? aimBadge(w.id, lang) : ''}${element ? `<span class="element-tag" style="color:${ELEMENTS[element].color}" title="${d.element[Object.keys(ELEMENTS).indexOf(element)]}">${ELEMENTS[element].symbol} ${d.element[Object.keys(ELEMENTS).indexOf(element)]}</span>` : ''}<small>${d.linked}: ${partners.length ? partners.map(id => weaponName(id, lang)).join(' + ') : '—'}</small>${w && !slot?.evolved ? `<small>${d.partner}: ${text(lang).passiveNames[PASSIVES.findIndex(p => p.id === w.passive)]} ${passive}/1<br>${text(lang).weapon}: ${slot?.level ?? 0}/5</small>` : ''}${p ? `<small>${passiveApplication(s, p.id, lang)}</small>` : ''}${fusion ? `<small>${fusion}</small>` : ''}</div>`;
}
export function buildPanel(s, lang) {
    const d = combatCopy(lang), t = text(lang), owned = s.weapons.map(w => w.id);
    return `<section class="build-panel"><h3>${d.build}</h3><p class="note">${signalCopy(lang).direction}</p><p>${d.growth}: ${s.skillLevels}/${RUN_SKILL_LIMIT}</p><div class="build-slots">${s.weapons.map(w => `<span style="border-color:${ELEMENTS[WEAPONS.find(d => d.id === w.id).element].color}">${aimBadge(w.id, lang)} ${w.fusion ? d.fusionNames[FUSIONS.findIndex(f => f.id === w.fusion)] : weaponName(w.id, lang)} ${w.level}/5${w.evolved ? ' ★' : ''}</span>`).join('')}${s.skills.map(skill => `<span>${skillDef(skill.id).name} ${skill.level}/5${skill.evolved ? ' ★' : ''}${skill.fusion ? ' + ' + d.fusionNames[FUSIONS.findIndex(f => f.id === skill.fusion)] : ''}</span>`).join('')}${Object.entries(s.passives).map(([id, lv]) => `<span>${t.passiveNames[PASSIVES.findIndex(p => p.id === id)]} ${lv}/6</span>`).join('')}</div><details open><summary>${d.evolutions}</summary>${s.weapons.filter(slot => !slot.evolved).map(slot => { const w = WEAPONS.find(w => w.id === slot.id); return `<p>${slot.evolved ? '★ ' : ''}${weaponName(slot.id, lang)} ${slot.level}/5 + ${t.passiveNames[PASSIVES.findIndex(p => p.id === w.passive)]} ${s.passives[w.passive] ?? 0}/1 → ${t.evolutionNames[WEAPONS.indexOf(w)]}</p>`; }).join('')}${FUSIONS.filter(f => !s.skills.some(slot => slot.fusion === f.id) && (owned.includes(f.a) || s.skills.some(s => s.id === f.b))).map((f) => `<p class="${canFuse(f.id, s.weapons, s.time, s.skills) ? 'combo-ready' : ''}">${d.fusionNames[FUSIONS.indexOf(f)]}: ${weaponName(f.a, lang)} ${s.weapons.find(w => w.id === f.a)?.level ?? 0}/5 + ${skillDef(f.b).name} ${s.skills.find(s => s.id === f.b)?.level ?? 0}/5</p>`).join('')}</details><details open><summary>${d.reactions}</summary>${REACTIONS.map((r, i) => `<p class="${reactionReady(r.id, owned) ? 'combo-ready' : 'combo-locked'}"><b>${d.reactionNames[i]}</b> ${d.reactionDescriptions[i]}<br><small>${r.weapons.filter(id => owned.includes(id)).map(id => weaponName(id, lang)).join(' + ') || '—'}</small></p>`).join('')}</details><details><summary>${d.rates} / ${t.passiveNames[13]} ${s.passives.luck ?? 0}/6</summary><p>${d.drop}: ${d.enemyKinds.map((label, i) => `${label} ${(Object.values(RUN_CHESTS.drop)[i] * 100).toFixed(2)}%`).join(' / ')}</p>${runChestRates(s.sector, s.passives.luck ?? 0).map((rate, i) => `<p style="color:${rankCopy[i].color}"><b>${rankCopy[i][lang]} ${(rate * 100).toFixed(4)}%</b><br>${d.chestRewards[i]}</p>`).join('')}<p>${d.chaos.join('<br>')}</p></details>${s.chaosHistory.length ? `<p>${d.accepted}: ${s.chaosHistory.map(i => d.chaos[i]).join(' / ')}</p>` : ''}</section>`;
}

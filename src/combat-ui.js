import { drawCombatIcons } from './combat-art.js';
import { combatLabels } from './combat-copy.js';
import { skillDef, passiveApplies } from './combat-catalog.js';
import { LEGACY_WEAPONS } from './data.js';
export function combatControls(lang, automatic) {
    const d = combatLabels(lang);
    return `<div class="combat-controls"><label title="${d.autoHint}"><input type="checkbox" data-combat-auto ${automatic ? 'checked' : ''}>${d.auto}</label>${[0, 1].map(i => `<button type="button" id="skill-${i}" data-combat-skill="${i}" aria-label="${d.skills} ${i + 1}"><kbd>${i === 0 ? 'Q' : 'E'}</kbd><canvas data-skill-icon="" width="24" height="24" aria-hidden="true"></canvas><b data-skill-name="${i}"></b><small data-skill-time="${i}"></small><i data-skill-fill="${i}"></i></button>`).join('')}</div>`;
}
export function updateCombatControls(s, lang) {
    const d = combatLabels(lang);
    for (let i = 0; i < 2; i++) {
        const slot = s.skills[i], button = document.getElementById(`skill-${i}`);
        if (!button)
            continue;
        const canvas = button.querySelector('canvas');
        if (canvas && slot && canvas.dataset.skillIcon !== slot.id) {
            canvas.dataset.skillIcon = slot.id;
            drawCombatIcons(button);
        }
        button.disabled = !slot;
        const name = button.querySelector('b'), time = button.querySelector('small'), fill = button.querySelector('i');
        name.textContent = slot ? (slot.evolved ? skillDef(slot.id).evolution : skillDef(slot.id).name) + ` ${slot.level}/5` : d.empty;
        const seconds = lang === 'ko' ? '초' : 's';
        time.textContent = slot ? slot.cast > 0 ? `${slot.cast.toFixed(1)}${seconds}` : slot.timer > 0 ? `${slot.timer.toFixed(1)}${seconds}` : d.ready : '';
        fill.style.width = slot ? `${Math.min(100, slot.timer / (skillDef(slot.id).cooldown * s.attributes.cooldown) * 100)}%` : '0%';
        button.setAttribute('aria-label', `${name.textContent} ${time.textContent}`);
    }
}
export function passiveApplication(s, id, lang) {
    if (['speed', 'hull', 'magnet', 'regen', 'armor', 'luck', 'thorns'].includes(id))
        return lang === 'ko' ? '대원 능력에 적용' : 'Applies to crew attributes';
    const count = s.weapons.filter(w => passiveApplies(id, w.id)).length;
    const skillCount = s.skills.filter(skill => {
        if (id === 'duration')
            return skillDef(skill.id).duration > 0;
        if (id === 'multi')
            return ['void', 'bombard', 'drone'].includes(skill.id);
        if (id === 'area' || id === 'power' || id === 'haste' || id === 'crit')
            return true;
        if (id === 'pierce')
            return skill.id === 'drone' || skill.id === 'reflect';
        if (id === 'knockback')
            return true;
        if (['fire', 'ice', 'electric', 'gravity'].includes(id))
            return LEGACY_WEAPONS.find(w => w.id === skillDef(skill.id).weapon)?.element === id;
        return false;
    }).length;
    const d = combatLabels(lang);
    return `${d.applies}: ${count}/${s.weapons.length} · ${d.skills} ${skillCount}/${s.skills.length}`;
}

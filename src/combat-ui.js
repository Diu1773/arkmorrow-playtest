import { drawCombatIcons } from './combat-art.js';
import { combatLabels } from './combat-copy.js';
import { skillDef, passiveApplies } from './combat-catalog.js';
import { LEGACY_WEAPONS } from './data.js';
import { actionBindingLabel, defaultBindings } from './controls.js';
export function combatControls(lang, automatic, capacity = 2, bindings = defaultBindings()) {
    const d = combatLabels(lang);
    return `<div class="combat-controls" data-capacity="${capacity}"><label title="${d.autoHint}"><input type="checkbox" data-combat-auto ${automatic ? 'checked' : ''}>${d.auto}</label>${Array.from({ length: capacity }, (_, i) => { const angle = (180 + (capacity === 1 ? 45 : i / (capacity - 1) * 90)) * Math.PI / 180; return `<button type="button" id="skill-${i}" data-combat-skill="${i}" style="--skill-x:${204 + 216 * Math.cos(angle)}px;--skill-y:${204 + 216 * Math.sin(angle)}px" aria-label="${d.skills} ${i + 1}"><kbd>${actionBindingLabel(bindings, `skill${i + 1}`)}</kbd><canvas data-skill-icon="" width="24" height="24" aria-hidden="true"></canvas><b data-skill-name="${i}"></b><small data-skill-time="${i}"></small><i data-skill-fill="${i}"></i></button>`; }).join('')}</div>`;
}
export function updateCombatControls(s, lang, bindings = defaultBindings()) {
    const d = combatLabels(lang);
    for (let i = 0; i < s.skillCapacity; i++) {
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
        button.querySelector('kbd').textContent = actionBindingLabel(bindings, `skill${i + 1}`);
        button.classList.toggle('skill-ready', !!slot && slot.timer <= 0 && slot.cast <= 0);
        name.textContent = slot ? (slot.evolved ? skillDef(slot.id).evolution : skillDef(slot.id).name) + ` ${slot.level}/5` : d.empty;
        const seconds = lang === 'ko' ? '초' : 's';
        time.textContent = slot ? slot.cast > 0 ? `${slot.cast.toFixed(1)}${seconds}` : slot.timer > 0 ? `${slot.timer.toFixed(1)}${seconds}` : d.ready : '';
        fill.style.setProperty('--cooldown', slot ? `${Math.min(100, slot.timer / (skillDef(slot.id).cooldown * s.attributes.cooldown) * 100)}%` : '0%');
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

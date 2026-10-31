export const ACTIONS = ['up', 'down', 'left', 'right', 'dash', 'skill1', 'skill2', 'skill3', 'skill4', 'skill5', 'skill6', 'pause'];
export const controlDevice = (token) => token.startsWith('Mouse') ? 'mouse' : token.startsWith('Pad') ? 'pad' : 'keyboard';
const validToken = (v) => typeof v === 'string' && /^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Space|Escape|Tab|Enter|Backspace|Shift(Left|Right)|Control(Left|Right)|Alt(Left|Right)|F(?:[1-9]|1[0-9]|2[0-4])|Backquote|Minus|Equal|BracketLeft|BracketRight|Backslash|Semicolon|Quote|Comma|Period|Slash|CapsLock|Home|End|PageUp|PageDown|Insert|Delete|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|Mouse[0-4]|Pad([0-9]|[12][0-9]|3[01])|PadAxis[0-7][+-])$/.test(v);
export function defaultBindings() {
    return {
        up: ['KeyW', 'ArrowUp', 'PadAxis1-'], down: ['KeyS', 'ArrowDown', 'PadAxis1+'], left: ['KeyA', 'ArrowLeft', 'PadAxis0-'], right: ['KeyD', 'ArrowRight', 'PadAxis0+'],
        dash: ['Space', 'ShiftLeft', 'ShiftRight', 'Pad1'], skill1: ['KeyQ', 'Pad4'], skill2: ['KeyE', 'Pad5'], skill3: ['KeyR', 'Pad2'], skill4: ['KeyF', 'Pad3'], skill5: ['KeyC', 'Pad6'], skill6: ['KeyV', 'Pad7'], pause: ['Escape', 'KeyP', 'Pad9'],
    };
}
export function bindingConflict(bindings, action, token) { return ACTIONS.find(a => a !== action && bindings[a].includes(token)); }
export function bindControl(bindings, action, device, token) {
    if (!validToken(token) || controlDevice(token) !== device)
        return { ok: false };
    const conflict = bindingConflict(bindings, action, token);
    if (conflict)
        return { ok: false, conflict };
    return { ok: true, bindings: { ...bindings, [action]: [...bindings[action].filter(v => controlDevice(v) !== device), token] } };
}
export function parseBindings(raw) {
    const defaults = defaultBindings();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return defaults;
    const values = raw, result = {}, seen = new Set();
    for (const action of ACTIONS) {
        const list = values[action];
        if (!Array.isArray(list) || list.length < 1 || list.length > 12 || list.some(v => !validToken(v) || seen.has(v)) || new Set(list).size !== list.length)
            return defaults;
        result[action] = [...list];
        for (const v of list)
            seen.add(v);
    }
    return result;
}
export const bindingLabel = (token) => token.replace(/^Key|^Digit/, '').replace(/^Arrow/, '↕ ').replace('Mouse', 'M').replace('PadAxis', 'Axis ').replace(/^Pad/, 'B').replace('Space', 'SPACE');
export const controlLabel = (action, lang) => ({ up: ['위', 'Up'], down: ['아래', 'Down'], left: ['왼쪽', 'Left'], right: ['오른쪽', 'Right'], dash: ['대시', 'Dash'], pause: ['일시정지', 'Pause'], skill1: ['스킬 1', 'Skill 1'], skill2: ['스킬 2', 'Skill 2'], skill3: ['스킬 3', 'Skill 3'], skill4: ['스킬 4', 'Skill 4'], skill5: ['스킬 5', 'Skill 5'], skill6: ['스킬 6', 'Skill 6'] }[action][lang === 'ko' ? 0 : 1]);
export function controlAmount(bindings, action, keys, mouse, pad) {
    let amount = 0;
    for (const token of bindings[action]) {
        if (token.startsWith('PadAxis')) {
            const axis = Number(token[7]), value = (pad?.axes[axis] ?? 0) * (token.endsWith('-') ? -1 : 1);
            amount = Math.max(amount, value < .18 ? 0 : Math.min(1, (value - .18) / .82));
        }
        else if (token.startsWith('Pad'))
            amount = Math.max(amount, Number(pad?.buttons[Number(token.slice(3))]?.pressed ?? false));
        else if (token.startsWith('Mouse'))
            amount = Math.max(amount, Number(mouse.has(Number(token.slice(5)))));
        else
            amount = Math.max(amount, Number(keys.has(token)));
    }
    return amount;
}
export function controlsUI(bindings, lang, capture, message) {
    const ko = lang === 'ko';
    return `<p class="note">${ko ? '버튼을 고른 뒤 키, 마우스 버튼 또는 패드 버튼·스틱을 입력하세요. Esc로 취소합니다.' : 'Choose a binding, then press a key, mouse button, pad button or stick. Esc cancels.'}</p><p class="binding-status" role="status" aria-live="polite">${message}</p><div class="binding-table"><div class="binding-row binding-head"><b>${ko ? '동작' : 'Action'}</b><b>${ko ? '키보드' : 'Keyboard'}</b><b>${ko ? '마우스' : 'Mouse'}</b><b>${ko ? '패드' : 'Gamepad'}</b></div>${ACTIONS.map(action => `<div class="binding-row"><b>${controlLabel(action, lang)}</b>${['keyboard', 'mouse', 'pad'].map(device => `<button type="button" data-act="bind-control" data-id="${action}:${device}" aria-label="${controlLabel(action, lang)} ${device}" class="${capture?.action === action && capture.device === device ? 'binding-capture' : ''}">${capture?.action === action && capture.device === device ? (ko ? '입력 대기…' : 'Waiting…') : bindings[action].filter(t => controlDevice(t) === device).map(bindingLabel).join(' / ') || '—'}</button>`).join('')}</div>`).join('')}</div><button type="button" class="btn" data-act="reset-controls">${ko ? '기본값 되돌리기' : 'Restore defaults'}</button>${capture ? `<button type="button" class="btn" data-act="cancel-control">${ko ? '취소' : 'Cancel'}</button>` : ''}`;
}
export function actionBindingLabel(bindings, action) { return bindingLabel(bindings[action].find(t => controlDevice(t) === 'keyboard') ?? bindings[action][0]); }

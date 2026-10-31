import { ALL_SOUND_IDS, TRACKS, soundDuration } from './audio-score.js';
import { ASSIGNMENT_KEY, resolveAssignments } from './audio-assignments.js';
import { combatText } from './combat-copy.js';
const escape = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const skillNames = ['칼날 휘두르기', '망치 내리치기', '지원 드론', '빛 터뜨리기', '중력 우물', '포격', '정지장', '반사막'];
export async function mountSoundboard(host, audio, leave) {
    const library = audio.candidates;
    if (!library)
        return;
    host.innerHTML = '<p role="status">소리 목록을 읽는 중입니다.</p>';
    await library.loadIndex();
    if (!host.isConnected)
        return;
    let draft = structuredClone(library.assignments), revision = 0;
    const status = (message) => { const el = host.querySelector('[role=status]'); if (el)
        el.textContent = message; };
    function row(group, id, label, index = 0) {
        const clips = draft[group][id], clip = clips[index], kind = group === 'tracks' ? 'music' : 'sound', asset = library.catalogue.find(c => c.id === clip.candidate);
        return `<article class="soundboard-row panel" data-group="${group}" data-slot="${id}"><h3>${escape(label)} <small>${id}</small></h3><div class="soundboard-fields"><label>변형 <select data-field="variant" aria-label="${escape(label)} 변형">${clips.map((_, i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${i + 1}${group === 'tracks' ? '단계' : ''}</option>`).join('')}</select></label><label class="soundboard-candidate">후보 <select data-field="candidate" aria-label="${escape(label)} 후보">${!asset ? '<option value="">후보 없음 · 배포 음원 사용</option>' : ''}${library.catalogue.filter(c => c.kind === kind).map(c => `<option value="${c.id}" ${c.id === clip.candidate ? 'selected' : ''}>${escape(c.pack + ' / ' + c.title)} (${c.seconds.toFixed(2)}초)</option>`).join('')}</select></label><label>음량 <input data-field="gain" aria-label="${escape(label)} 음량" type="number" min="0" max="2" step=".05" value="${clip.gain}"></label><label>시작(초) <input data-field="start" aria-label="${escape(label)} 시작" type="number" min="0" step=".01" value="${clip.start}"></label><label>끝(초) <input data-field="end" aria-label="${escape(label)} 끝" type="number" min="0" step=".01" value="${clip.end}"></label></div><p class="soundboard-terms">${escape(asset?.terms ?? '후보가 없으면 기존 배포 음원으로 재생합니다.')}</p><div class="button-row"><button class="btn small" data-sb="listen">듣기</button><button class="btn small" data-sb="add" ${clips.length >= (group === 'tracks' ? 3 : 5) || !asset ? 'disabled' : ''}>변형 추가</button><button class="btn small" data-sb="remove" ${clips.length <= 1 ? 'disabled' : ''}>변형 삭제</button></div></article>`;
    }
    function render() {
        const copy = combatText('ko');
        host.innerHTML = `<div class="dialog-head"><div><h2>소리 갈아끼우기</h2><p>후보를 고르면 저장하고 바로 듣습니다. 음악 변형은 강도 1~3에 대응합니다.</p></div><button class="btn small" data-sb="leave">갑판으로</button></div><div class="soundboard-tools"><button class="btn" data-sb="stop">모두 멈추기</button><button class="btn" data-sb="export">배정 내보내기</button><button class="btn" data-sb="reset">기본 배정으로</button><a class="btn" href="./">게임 열기</a><label>자리 찾기 <input type="search" data-field="search" placeholder="이름 또는 자리"></label></div><p role="status" aria-live="polite">${library.available ? `후보 ${library.catalogue.length}개 · 곡 11자리 · 효과음 46자리` : '후보 목록이 없습니다. 배포 음원으로 들을 수 있습니다. 후보 준비 뒤 새로고침해 주세요.'}</p><textarea id="soundboard-export" aria-label="내보낸 배정" rows="10" readonly hidden></textarea><details open><summary>음악 · 11자리</summary>${TRACKS.map((t, i) => row('tracks', t.id, copy.trackNames[i])).join('')}</details><details open><summary>효과음 · 46자리</summary>${ALL_SOUND_IDS.map((id, i) => row('sounds', id, i < 38 ? copy.soundNames[i] : skillNames[i - 38])).join('')}</details>`;
    }
    function identify(element) { const article = element.closest('[data-slot]'); if (!article)
        return; const group = article.dataset.group, id = article.dataset.slot, index = Number(article.querySelector('[data-field=variant]').value); return { article, group, id, index, list: draft[group][id] }; }
    async function persist() { const saved = await audio.applyAssignments(draft); draft = structuredClone(library.assignments); status(saved ? '배정을 저장했습니다. 게임을 새로고침하면 이 배정으로 재생합니다.' : '저장소에 쓸 수 없어 이번 화면에서만 적용합니다. 내보내기로 현재 선택을 보관할 수 있습니다.'); }
    async function listen(group, id, index) {
        const request = ++revision;
        audio.stop();
        await audio.unlock();
        if (request !== revision || !host.isConnected)
            return;
        if (group === 'tracks')
            audio.previewTrack(id, (index + 1));
        else {
            audio.voices.last.delete(id);
            audio.play(id, { variant: index });
        }
        audio.tick();
        const clip = draft[group][id][index];
        if (library.failures.has(clip.candidate))
            status('이 후보를 읽지 못해 재생 가능한 다른 소리를 사용합니다.');
    }
    host.addEventListener('input', event => { const input = event.target; if (input.dataset.field === 'search') {
        const term = input.value.trim().toLowerCase();
        for (const article of host.querySelectorAll('[data-slot]'))
            article.hidden = !article.querySelector('h3').textContent.toLowerCase().includes(term);
    } });
    host.addEventListener('change', event => {
        void (async () => {
            const input = event.target, selected = identify(input);
            if (!selected)
                return;
            const { article, group, id, index, list } = selected, field = input.dataset.field;
            if (field === 'variant') {
                article.outerHTML = row(group, id, article.querySelector('h3').childNodes[0].textContent.trim(), Number(input.value));
                return;
            }
            const clip = { ...list[index] };
            if (field === 'candidate') {
                const asset = library.catalogue.find(c => c.id === input.value);
                if (!asset)
                    return;
                clip.candidate = asset.id;
                clip.start = 0;
                clip.end = group === 'tracks' ? asset.seconds : Math.min(asset.seconds, soundDuration(id));
            }
            else if (field === 'gain' || field === 'start' || field === 'end')
                clip[field] = Number(input.value);
            else
                return;
            if (!library.clip(clip, group === 'tracks' ? 'music' : 'sound')) {
                status('시작·끝·음량을 확인해 주세요. 끝은 시작보다 크고 파일 길이 이하여야 합니다.');
                return;
            }
            list[index] = clip;
            await persist();
            article.outerHTML = row(group, id, article.querySelector('h3').childNodes[0].textContent.trim(), index);
            if (field === 'candidate')
                await listen(group, id, index);
        })();
    });
    host.addEventListener('click', event => {
        void (async () => {
            const button = event.target.closest('[data-sb]');
            if (!button)
                return;
            const action = button.dataset.sb;
            if (action === 'stop') {
                revision++;
                audio.stop();
                status('재생을 멈췄습니다.');
                return;
            }
            if (action === 'leave') {
                revision++;
                audio.stop();
                leave();
                return;
            }
            if (action === 'export') {
                const box = host.querySelector('#soundboard-export');
                box.hidden = false;
                box.value = JSON.stringify(draft, null, 2);
                box.focus();
                box.select();
                try {
                    await navigator.clipboard.writeText(box.value);
                    status('배정을 복사했습니다.');
                }
                catch {
                    status('복사할 수 없어 아래에 배정을 표시했습니다. 전체를 복사해 주세요.');
                }
                return;
            }
            if (action === 'reset') {
                revision++;
                audio.stop();
                try {
                    localStorage.removeItem(ASSIGNMENT_KEY);
                }
                catch { }
                draft = resolveAssignments(null, library.catalogue);
                await persist();
                render();
                return;
            }
            const selected = identify(button);
            if (!selected)
                return;
            const { article, group, id, index, list } = selected;
            if (action === 'listen') {
                await listen(group, id, index);
                return;
            }
            if (action === 'add' && list.length < (group === 'tracks' ? 3 : 5))
                list.push({ ...list[index] });
            else if (action === 'remove' && list.length > 1)
                list.splice(index, 1);
            else
                return;
            await persist();
            article.outerHTML = row(group, id, article.querySelector('h3').childNodes[0].textContent.trim(), Math.min(index, list.length - 1));
        })();
    });
    render();
}

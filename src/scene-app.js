import { AudioEngine } from './audio.js';
import { SAVE_KEY, parseSave } from './core.js';
import { CREW } from './crew.js';
import { drawHangar, drawScene } from './scene-art.js';
import { FrameStats } from './playtest.js';
import { SCENES, TrialScene, idle } from './scenes.js';
export function mountTrials() {
    const app = document.querySelector('#app'), canvas = document.querySelector('#world'), c = canvas.getContext('2d');
    let raw = null;
    try {
        raw = localStorage.getItem(SAVE_KEY);
    }
    catch { }
    const settings = parseSave(raw).save.settings, audio = new AudioEngine(settings), stats = new FrameStats();
    const params = new URLSearchParams(location.search), requested = params.get('scene');
    let view = 'menu', trial = null, last = 0, acc = 0, anim = 0, paused = false, alive = true;
    let input = { ...idle }, pointerId = -1, origin = { x: 0, y: 0 }, drag = false;
    const keys = new Set(), button = (act, label, extra = '') => `<button class="btn" data-trial="${act}" ${extra}>${label}</button>`;
    function resize() { const zoom = Math.max(1, Math.round(window.innerHeight / 360)); canvas.width = Math.ceil(window.innerWidth / zoom); canvas.height = Math.ceil(window.innerHeight / zoom); canvas.style.cssText = `width:${canvas.width * zoom}px;height:${canvas.height * zoom}px;left:${Math.floor((window.innerWidth - canvas.width * zoom) / 2)}px;top:0`; c.imageSmoothingEnabled = false; }
    function clearInput() { keys.clear(); input = { ...idle }; pointerId = -1; drag = false; document.querySelector('#trial-stick')?.removeAttribute('style'); }
    function ui() {
        document.body.classList.add('trial-mode');
        const actions = button('menu', '다른 장면') + button('home', '타이틀');
        if (view === 'menu')
            app.innerHTML = `<main class="trial-menu panel"><p class="muted">COSMOS / PLAYTEST</p><h1>한 장면 고르기</h1><p>이동만 조작, 공격은 자동. 각 32~34초.</p><div class="trial-choices">${SCENES.map(s => `<button class="btn" data-trial="pick" data-scene="${s.id}"><b>${s.name}</b><span>${s.seconds}초</span><small>${s.hint}</small></button>`).join('')}${button('crew', '탐사대 4명 보기')}</div><p class="muted">짧은 연출 비교용 · 쓰러지지 않음</p>${button('home', '타이틀')}</main>`;
        if (view === 'crew')
            app.innerHTML = `<main class="trial-crew panel"><h1>탐사대 격납고</h1><canvas id="crew-walk" width="600" height="160" aria-label="네 탐사대원이 네 방향으로 번갈아 걷는 도트 시안"></canvas><div class="trial-crew-spec">${CREW.map(person => `<article><h2 style="color:${person.color}">${person.name}</h2><p>${person.intro}</p><p>체력 ${person.hp} / 속도 ${person.speed}</p><b>${person.weaponName}</b><p>${person.trait}</p></article>`).join('')}</div><p class="muted">수치와 특징은 시안. 정식 출격에는 아직 적용하지 않음.</p><div class="trial-buttons">${actions}</div></main>`;
        if (view === 'ready')
            app.innerHTML = `<div class="trial-curtain"><section class="panel trial-ready" role="dialog" aria-label="시험 장면"><h1>${SCENES.find(s => s.id === trial.id).name}</h1><p>${paused ? '탭을 벗어나 멈췄다.' : SCENES.find(s => s.id === trial.id).hint}</p><p>WASD / 방향키 · 마우스 누른 채 이동<br>휴대폰은 화면을 누르고 끌기</p><p class="muted">쓰러지지 않는 짧은 시험판</p><div class="trial-buttons">${button('start', paused ? '계속' : '시작')}${actions}</div></section></div>`;
        if (view === 'playing')
            app.innerHTML = `<div class="trial-controls">${button('pause', '멈춤')}${button('menu', '다른 장면')}<span id="trial-fps"></span></div><div id="trial-stick" aria-hidden="true"></div><p class="trial-move-hint">WASD / 방향키 · 화면을 누르고 이동</p>`;
        if (view === 'result')
            app.innerHTML = `<div class="trial-curtain"><section class="panel trial-ready" role="dialog" aria-label="장면 완료"><h1>${SCENES.find(s => s.id === trial.id).name}</h1><p>${trial.time.toFixed(1)}초 / 평균 ${stats.summary().average.toFixed(1)} FPS</p><div class="trial-buttons">${button('retry', '다시')}${actions}${button('copy', '기록 복사')}</div><div id="trial-copy" role="status"></div></section></div>`;
        app.querySelector('[data-trial="start"],button')?.focus({ preventScroll: true });
    }
    function select(id) { audio.stop(); clearInput(); stats.reset(); acc = 0; trial = new TrialScene(id); paused = false; view = 'ready'; ui(); }
    function menu() { audio.stop(); clearInput(); trial = null; view = 'menu'; stats.reset(); ui(); }
    function pause() { if (view !== 'playing')
        return; paused = true; view = 'ready'; clearInput(); stats.break(); audio.stop(); void audio.ctx?.suspend(); ui(); }
    async function copy() {
        if (!trial)
            return;
        const record = `${SCENES.find(s => s.id === trial.id).name}\n시간 ${trial.time.toFixed(1)}초\n평균 FPS ${stats.summary().average.toFixed(1)} / 하위 1% FPS ${stats.summary().low1.toFixed(1)}`;
        try {
            if (!navigator.clipboard?.writeText)
                throw Error('Clipboard unavailable');
            await navigator.clipboard.writeText(record);
            if (view === 'result')
                document.querySelector('#trial-copy').textContent = '복사됨';
        }
        catch {
            if (view !== 'result')
                return;
            const box = document.createElement('textarea');
            box.readOnly = true;
            box.value = record;
            box.setAttribute('aria-label', '장면 기록');
            document.querySelector('#trial-copy').replaceChildren(box);
            box.focus();
            box.select();
        }
    }
    function click(event) {
        const el = event.target.closest('[data-trial]');
        if (!el)
            return;
        const act = el.dataset.trial;
        if (act === 'pick')
            select(el.dataset.scene);
        if (act === 'crew') {
            audio.stop();
            trial = null;
            view = 'crew';
            clearInput();
            ui();
        }
        if (act === 'menu')
            menu();
        if (act === 'home')
            location.href = location.pathname;
        if (act === 'start') {
            void audio.unlock();
            audio.setScene('playing');
            if (!paused)
                stats.reset();
            stats.break();
            acc = 0;
            view = 'playing';
            clearInput();
            ui();
        }
        if (act === 'pause')
            pause();
        if (act === 'retry' && trial)
            select(trial.id);
        if (act === 'copy')
            void copy();
    }
    function key(event) { const moving = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code); if (view === 'playing' && moving) {
        event.preventDefault();
        if (event.type === 'keydown') {
            keys.add(event.code);
            void audio.unlock();
        }
        else
            keys.delete(event.code);
    } if (event.type === 'keydown' && event.code === 'Escape')
        pause(); }
    function down(event) { if (view !== 'playing' || pointerId !== -1)
        return; event.preventDefault(); void audio.unlock(); pointerId = event.pointerId; drag = event.pointerType !== 'mouse'; origin = drag ? { x: event.clientX, y: event.clientY } : { x: window.innerWidth / 2, y: window.innerHeight * .54 }; canvas.setPointerCapture?.(pointerId); move(event); }
    function move(event) { if (event.pointerId !== pointerId)
        return; const dx = event.clientX - origin.x, dy = event.clientY - origin.y, d = Math.hypot(dx, dy), scale = drag ? 42 : Math.max(42, d); input.x = dx / scale; input.y = dy / scale; const stick = document.querySelector('#trial-stick'); if (stick && drag)
        stick.style.cssText = `display:block;left:${origin.x}px;top:${origin.y}px;transform:translate(-50%,-50%) translate(${dx / (d || 1) * Math.min(32, d)}px,${dy / (d || 1) * Math.min(32, d)}px)`; }
    function up(event) { if (event.pointerId === pointerId) {
        clearInput();
    } }
    function hidden() { if (document.hidden)
        pause(); }
    function frame(now) {
        if (!alive)
            return;
        const delta = last ? Math.min(.1, Math.max(0, (now - last) / 1000)) : 0;
        last = now;
        anim += delta;
        stats.observe(now, view === 'playing' && !document.hidden);
        if (view === 'playing' && trial && !document.hidden) {
            const x = input.x + Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), y = input.y + Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
            acc += delta;
            for (let n = 0; acc >= 1 / 60 && n < 6 && !trial.done; n++) {
                trial.step(1 / 60, { ...idle, x, y });
                acc -= 1 / 60;
                audio.consume(trial.sim.events);
                trial.sim.events.length = 0;
                for (const signal of trial.signals)
                    audio.play(signal === 'ignite' ? 'chest' : signal === 'rise' ? 'evolve' : signal === 'hole' ? 'resonance' : signal === 'burst' ? 'nova' : 'resonance', { pitch: signal === 'ignite' ? .6 : signal === 'rise' ? 1.3 : .8 });
            }
            audio.combat(0, trial.time * 15, trial.sim.enemies.length, false);
            audio.tick();
            if (trial.done) {
                view = 'result';
                clearInput();
                audio.stop();
                ui();
            }
            const fps = document.querySelector('#trial-fps');
            if (fps)
                fps.textContent = `${stats.summary().average.toFixed(0)} FPS${stats.autoLow ? ' / 낮음' : ''}`;
        }
        if (trial)
            drawScene(c, trial, canvas.width, canvas.height, stats.autoLow, settings.reduced);
        else {
            drawHangar(c, canvas.width, canvas.height, anim);
            const crew = document.querySelector('#crew-walk');
            if (crew)
                drawHangar(crew.getContext('2d'), crew.width, crew.height, anim);
        }
        requestAnimationFrame(frame);
    }
    resize();
    app.addEventListener('click', click);
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', key);
    window.addEventListener('keyup', key);
    canvas.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('blur', pause);
    if (requested === 'crew') {
        view = 'crew';
        ui();
    }
    else if (SCENES.some(s => s.id === requested))
        select(requested);
    else
        menu();
    requestAnimationFrame(frame);
    return { get trial() { return trial; }, get view() { return view; }, stats, select, dispose() { alive = false; audio.stop(); audio.worker?.terminate(); clearInput(); app.removeEventListener('click', click); window.removeEventListener('resize', resize); window.removeEventListener('keydown', key); window.removeEventListener('keyup', key); canvas.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('blur', pause); document.body.classList.remove('trial-mode'); } };
}

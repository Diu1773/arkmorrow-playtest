import { skillDef } from './combat-catalog.js';
import { FUSIONS } from './combat-rules.js';
import { combatText as text, combatCopy } from './combat-copy.js';
import { PASSIVES, WEAPONS } from './data.js';
import { BUILD_LABEL } from './build-info.js';
export class FrameStats {
    bins = new Map();
    previous = null;
    count = 0;
    total = 0;
    windowTime = 0;
    windowCount = 0;
    autoLow = false;
    reset() { this.bins.clear(); this.previous = null; this.count = this.total = this.windowTime = this.windowCount = 0; this.autoLow = false; }
    break() { this.previous = null; }
    observe(now, active) {
        if (!active) {
            this.break();
            return;
        }
        const before = this.previous;
        this.previous = now;
        if (before === null)
            return;
        const ms = now - before;
        if (ms <= 0 || !Number.isFinite(ms))
            return;
        const bucket = Math.min(60000, Math.max(1, Math.round(ms * 10) / 10));
        this.bins.set(bucket, (this.bins.get(bucket) ?? 0) + 1);
        this.count++;
        this.total += ms;
        this.windowTime += ms;
        this.windowCount++;
        if (this.windowCount >= 180 || this.windowTime >= 2000) {
            if (this.windowTime / this.windowCount > 24)
                this.autoLow = true;
            this.windowCount = this.windowTime = 0;
        }
    }
    summary() {
        let remaining = Math.ceil(this.count * .01), slowTime = 0, slowCount = 0;
        for (const [ms, count] of [...this.bins].sort((a, b) => b[0] - a[0])) {
            const n = Math.min(remaining, count);
            slowTime += ms * n;
            slowCount += n;
            remaining -= n;
            if (!remaining)
                break;
        }
        return { samples: this.count, average: this.total ? 1000 * this.count / this.total : 0, low1: slowTime ? 1000 * slowCount / slowTime : 0 };
    }
}
export function browserName(ua) { return /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox' : /Chrome\/|CriOS\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : '기타'; }
export function playtestRecord(sim, stats, device, quality, autoLow) {
    const d = text('ko'), fps = stats.summary(), num = (n) => n.toFixed(1), clock = (s) => `${Math.floor(s / 60)}분 ${Math.floor(s % 60)}초`;
    const weapons = sim.weapons.map(w => `${w.fusion ? combatCopy('ko').fusionNames[FUSIONS.findIndex(f => f.id === w.fusion)] : w.evolved ? d.evolutionNames[WEAPONS.findIndex(x => x.id === w.id)] : d.weaponNames[WEAPONS.findIndex(x => x.id === w.id)]} Lv ${w.level}${w.evolved ? ' (진화)' : ''}`).join(', ');
    const passives = PASSIVES.filter(p => sim.passives[p.id]).map((p) => `${d.passiveNames[PASSIVES.indexOf(p)]} Lv ${sim.passives[p.id]}`).join(', ') || '없음';
    const cause = sim.status === 'won' ? '구역 완료' : sim.lastDamageCause.startsWith('boss:') ? d.bossNames[Number(sim.lastDamageCause.slice(5))] : sim.lastDamageCause === 'bullet' ? '적 탄' : sim.lastDamageCause === 'hazard' ? '보스 공격' : sim.lastDamageCause === 'abandon' ? '직접 종료' : sim.lastDamageCause === 'timeout' ? '시간 초과' : sim.lastDamageCause === 'unknown' ? '확인 안 됨' : `적 접촉 (${sim.lastDamageCause})`;
    return [`플레이 테스트 ${BUILD_LABEL}`, `화면 ${device.width}×${device.height} / 터치 ${device.touch ? '있음' : '없음'} / ${device.browser}`, `대원 ${sim.crew.toUpperCase()} / 구역 ${d.sectorNames[sim.sector]} / 난이도 ${d[sim.difficulty]}`, `생존 ${clock(sim.time)} / 레벨 ${sim.level} / 처치 ${sim.kills}`, `무기: ${weapons}`, `패시브: ${passives}`, `스킬: ${sim.skills.map(s => skillDef(s.id).name + ' Lv ' + s.level).join(', ')}`, `추가 강화: 공격 ${sim.boosts.damage} / 체력 ${sim.boosts.hull} / 줍기 ${sim.boosts.reach}`, `종료 원인: ${cause}`, fps.samples ? `평균 FPS ${num(fps.average)} / 하위 1% FPS ${num(fps.low1)} (${fps.samples}프레임)` : 'FPS: 측정 없음', `화질 ${quality === 'auto' ? autoLow ? '자동 (낮음)' : '자동' : quality === 'low' ? '낮음' : '높음'}`].join('\n');
}

export function endSummary(won, cause, lang) {
    const ko = lang === 'ko', reason = won ? 'clear' : cause === 'timeout' ? 'timeout' : 'down';
    return { reason, title: ko ? ({ clear: '클리어', timeout: '시간 초과', down: '쓰러짐' }[reason]) : ({ clear: 'Cleared', timeout: 'Time expired', down: 'Defeated' }[reason]),
        tip: ko ? ({ clear: '다음에는 어려움에 도전해 남은 별을 모아 보자.', timeout: '다음에는 보스에게 쓸 스킬 하나를 더 강화해 보자.', down: '다음에는 장비 보관함에서 체력을 올릴 장비를 골라 보자.' }[reason]) : ({ clear: 'Try Hard next to collect the remaining star.', timeout: 'Upgrade one more skill for the boss next time.', down: 'Choose one piece of gear with more health next time.' }[reason]) };
}
export function overtime(time, duration) { const limit = duration * .1; return { active: time >= duration, remaining: Math.max(0, Math.ceil(duration + limit - time)), fraction: Math.max(0, Math.min(1, (duration + limit - time) / limit)) }; }

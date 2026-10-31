const colors = { o: '#10131d', s: '#293342', m: '#526579', h: '#91a6b2', w: '#e8f1e9', f: '#f0a33a', i: '#79d8f2', e: '#f6d454', g: '#bd82ee', r: '#df5c53', d: '#493e66' };
const art = (rows, color = 'w') => { const grid = rows.split('/'); return { rows: grid.flatMap((r, y) => { const shaded = color === 'r' ? r.replace(/a/g, y < 2 ? 'h' : y >= grid.length - 2 ? 's' : 'a') : r; const doubled = shaded.replace(/./g, c => c + c); return [doubled, doubled]; }), palette: { ...colors, a: colors[color] ?? color, ...(color === 'r' ? { h: '#f4766b', s: '#713b52' } : {}) } }; };
export const skillArt = {
    bomb: art('.....ee.../....mm..../...aaaa.../..awaaas../..awaaas../..aaaaas../...aaas.../..........', 'f'),
    ripple: art('...aaaa.../.aa....aa./aa..aa..aa/a..a..a..a/a..a..a..a/aa..aa..aa/.aa....aa./...aaaa...'),
    quake: art('............/aa..aa..aa../.aa..aa..aa./..aaa.aaa.../....www...../..aaa.aaa.../.aa..aa..aa./aa..aa..aa..'),
    blackhole: art('...aaaa.../.aa...aaa./aa..aaa..a/a..dd..a.a/a.a.dd..aa/aaa...aa../...aaaa.../..........', 'g'),
    flame: art('.....a..../....aaa.../..a.aaa.../..aaaaaa../.aaawaaa../.aawwwaaa./..aawwaa../...aaaa...', 'f'),
    acid: art('..aaa...../.aaaaa..../...aaa..../....aaaa../..aaaaaaa./.aaaaawwaa/aaawwawaaa/.aaaaaaaa.'),
    frost: art('..a....a../..aa..aa../...aaaa.../a..awwa..a/aaaawwaaaa/...aaaa.../..aa..aa../..a....a..', 'i'),
    tether: art('aa......aa/aaa....aaa/..aa..aa../...aaaa.../...aaaa.../..aa..aa../aaa....aaa/aa......aa', 'e'),
    mark: art('....aa..../..aaaaaa../.aa....aa./aa..aa..aa/aa..aa..aa/.aa....aa./..aaaaaa../....aa....', 'g'),
    turret: art('....ww..../....aa..../..mmaamm../.mmwwwwmm./.mmammamm./...mmmm.../..mm..mm../.mm....mm.'),
    blade: art('.....aa.../....awaa../...awaaa../..awaaa.../.awaaa..../.waaa...../..aa....../..........', 'i'),
    resonance: art('aa......aa/.aa.aa.aa./..aaaaaa../...awwa.../...awwa.../..aaaaaa../.aa.aa.aa./aa......aa'),
    crit: art('...aaa..../..awwaa.../.aaaaaaa../aa.a.a.aaa/.aaaaaaa../..aaa.aa../...aaaa.../....aa....'),
    pierce: art('....aa..../...awaa.../...awaa.../..aawaas../...aa...../..a.a.a.../.aa.a.aa../....a.....'),
    multi: art('..aa..aa../..aa..aa../...aaaa.../....aa..../...aaaa.../..aa..aa../.aa....aa./aa......aa'),
    duration: art('..aaaaaa../..awwwwa../...awwa.../....aa..../....aa..../...aaaa.../..awwwwa../..aaaaaa..'),
    knockback: art('..aa....../..awaa..../aaawwaaa../aaawwaaaa./aaawwaaaa./aaawwaaa../..awaa..../..aa......'),
    luck: art('..aa..aa../.awwaawwa./.awwaawwa./..aaaaaa../...aaaa.../..aaaaaa../.aaaaaaa../....aa....', 'e'),
    fire: art('....aa..../...aaaa.../..aaaaaa../.aaawaaa../.aawwwaa../.aaawaaa../..aaaaaa../...aaaa...', 'f'),
    ice: art('..aa..aa../...aaaa.../aa..aa..aa/.aaaaaaaa./.aaaaaaaa./aa..aa..aa/...aaaa.../..aa..aa..', 'i'),
    electric: art('....aaaa../...awwa.../..awwa..../.awwwaaa../.aaaawwa../....awaa../...awaa.../..aaa.....', 'e'),
    gravity: art('...aaaa.../.aa....aa./aa..aa..aa/a..aaaa..a/aa..aa..aa/.aa....aa./...aaaa.../....aa....', 'g'),
    thorns: art('..a....a../.aaa..aaa./aaawwaawaa/.aawwwwaa./..aawwaa../.aaa..aaa./aa......aa/.a......a.'),
    volatile: art('....aa..../.aa.aa.aa./..aaaaaa../aaawwwwaaa/aaawwwwaaa/..aaaaaa../.aa.aa.aa./....aa....', 'f'),
};
export const skillEvolutions = Object.fromEntries(Object.entries(skillArt).slice(0, 12).map(([id, s]) => {
    const rows = s.rows.map((row, y) => y < 3 || y > s.rows.length - 4 ? row : row.replace(/aa/g, 'aw'));
    return [id, { rows: ['....aa........aa....', '..aawwaa....aawwaa..', ...rows, '..aaaaaa....aaaaaa..', '....aa........aa....'], palette: s.palette }];
}));
export const newEnemyArt = {
    dodger: art('aa......aa../.aa....aa.../..aawwaa..../...aaaa...../..aarraa..../.aaarrraa.../aa..aa..aa../....aa......', 'r'),
    charger: art('.....aa...../....awaa..../...awwwaa.../..aawwwwaa../.aaaarraaaa./aaaaarraaaaa/..aammaamm../..aa....aa..', 'r'),
    bomber: art('....aa....../....aa....../..aaaaaa..../.aawwaaaa.../.aawwaaaa.../.aaaraaaa.../..aaaaaa..../..aa..aa....', 'r'),
    blinker: art('..aa..aa..../.aaa..aaa.../aa......aa../aa..ww..aa../aa..rr..aa../aa......aa../.aaa..aaa.../..aa..aa....', 'r'),
    sniper: art('....aa....../....aa....../....aa....../..aawwaa..../.aawwwwaa.../aaaarrarra../..aaaaaa..../.aa....aa...', 'r'),
    healer: art('....aa....../...awwa...../..aawwaa..../aawwwwww aa./aawwwwww aa./..aawwaa..../...awwa...../....aa......'.replaceAll(' ', ''), 'r'),
    burrower: art('............/....aa....../...aawaa..../..aawwaa..../.aaarr aaa.../aaaarr aaaa../..aaaaaa..../aa......aa..'.replaceAll(' ', ''), 'r'),
    summoner: art('..aaaaaaaa../.aawwwwwwaa./aammammammaa/aammawwammaa/aammarrammaa/aammammammaa/.aaaaaaaaaa./..aa....aa..', 'r'),
};

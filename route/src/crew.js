export const CREW = [
    { id: 'pip', name: 'PIP', intro: '첫 출근인데 퇴근길이 우주다.', hp: 100, speed: 210, weapon: 'pulse', weaponName: 'PULSE', trait: '첫 피격을 한 번 막음', color: '#f0a33a' },
    { id: 'bolt', name: 'BOLT', intro: '고장보다 큰 렌치를 가져왔다.', hp: 145, speed: 165, weapon: 'nova', weaponName: 'SHOCKWAVE', trait: '밀어내는 힘 30% 증가', color: '#cf8839' },
    { id: 'mori', name: 'MORI', intro: '표본은 챙겼다. 도시락은 놓고 왔다.', hp: 75, speed: 200, weapon: 'orbit', weaponName: 'ORBITER', trait: '경험치 20% 추가', color: '#87cf78' },
    { id: 'mew', name: 'MEW', intro: '우주복은 싫고 우주는 좋다.', hp: 60, speed: 265, weapon: 'fan', weaponName: 'SCATTER', trait: '작은 몸으로 적 사이를 통과', color: '#bd82ee' },
];
// Directions are front, left, back and right; upright bodies keep a readable silhouette.
const bodies = {
    pip: [
        '.....aaaaaa...../....aHHHHHHa..../...aHvvvvvvHa.../...aHvEvvEvHa.../...aHvvvvvvHa.../....aHHHHHHa..../.....aaaaaa...../....WaaWWaaW..../...WWaWWWWaWW.../...WaaWaaWaaW.../...aaWWWWWWaa.../....WWaWWaWW..../....WWaaaaWW....',
        '......aaaaa...../.....aHHHHHa..../....aHvvvvHa..../....aHEvvvHa..../....aHvvvvHa..../.....aHHHHHa..../......aaaaa...../.....WaWWWBB..../.....WaWWWBB..../....WWaWWWBB..../....WaWWWWBB..../.....WWaWWW...../.....WWaaaW.....',
        '.....aaaaaa...../....aHHHHHHa..../...aHHHHHHHHa.../...aHHHHHHHHa.../...aHHaaaaHHa.../....aHHHHHHa..../.....aaaaaa...../....WaBBBBaW..../...WWaBHHBaWW.../...WaaBHHBaaW.../...aaWBBBBWaa.../....WWaWWaWW..../....WWaaaaWW....',
    ],
    bolt: [
        '....aaaaaaa...../...aHHHHHHHa..../...aHvvvvvHa..../...aHvEvEvHa..../....aHHHHHa...../....aaaaaaa..RR./..aaWWWWWWWaaRR./.aWWWWaWWWWWaRR./.aWWWWaWWWWWaaR./.aaWWWaaaaWWWaR./..aWWWWWWWWWaaR./..aWWaBBBaWWa.R./...aaBBBBBaa..R.',
        '.....aaaaaa...../....aHHHHHHa..../...aHvvvvHHa..../...aHEvvvHHa..../....aHHHHHa...../....aaaaaaa..RR./...aWWWWWWBa.RR./..aWWWWWWWBB.RR./..aWWWWWWWBBaaR./..aaWWWWWWBBWaR./...aWWWWWWBBaaR./...aWWaWWWa...R./....aaaaaa....R.',
        '....aaaaaaa...../...aHHHHHHHa..../...aHHHHHHHa..../...aHHHHHHHa..../....aHHHHHa...../....aaaaaaa..RR./..aaWBBBBBWaaRR./.aWWWBRRRBWWaRR./.aWWWBRRRBWWaaR./.aaWWBBBBBWWWaR./..aWWWWWWWWWaaR./..aWWaWWWaWWa.R./...aaaaaaaaa..R.',
    ],
    mori: [
        '......HHHH....../.....HWHHWH...../....HvvvvvvH..../....vEEvvEEv..../....vEEvvEEv..../.....HvvvvH...../......aaaa....../....HHHaaHHH..../...HHHHaHHHHH.../...HHaHaHaHHH.../...aaHaGaGaaH.../....HHHHHHHH..../....HHaaaaHH....',
        '.......HHHH...../......HWHHHH..../.....HvvvvHH..../....EEvvvvHH..../....EEvvvvHH..../......HvvHH...../......aaaaa...../.....HHHHHBB..../.....HaHHHBB..../....HHaHHHBB..../....HaGHHHBB..../.....HHHHHH...../.....HHaaaH.....',
        '......HHHH....../.....HWHHWH...../....HHHHHHHH..../....HHHHHHHH..../....HHHHHHHH..../.....HHHHHH...../......aaaa....../....HHHaaHHH..../...HHHaGGaHHH.../...HHaGGGGaHH.../...aaHaGGaaaH.../....HHHHHHHH..../....HHaaaaHH....',
    ],
    mew: [
        '...aH......Ha.../...aHHaaaaHHa.../...aWHHHHHHWa.../..aWHvvvvvvHWa../..aWvEvEEvEvWa../..aWvvvaavvvWa../...aWHvvvvHWa.../....aHHHHHHa..../.....aaaaaa..aH./....WaWWWWaW.aH./....WaWaWWaW.Ha./....aaWWWWaaHa../.....WWaaWWa....',
        '.....aH...Ha..../.....aHHaaHHa.../....aWHHHHHWa.../...aWHvvvvHHa.../...aWEvvvvHHa.../...aWvvaavHHa.../....aWHvvHHa..../.....aHHHHa...../......aaaaa..aH./.....WaWWWBB.aH./.....WaWWWBB.Ha./.....aaWWWBBHa../......WWaaWa....',
        '...aH......Ha.../...aHHaaaaHHa.../...aWHHHHHHWa.../..aWHHHHHHHHWa../..aWHHHHHHHHWa../..aWHHHHHHHHWa../...aWHHHHHHWa.../....aHHHHHHa..../.....aaaaaa..aH./....WaBBBBaW.aH./....WaBHHBaW.Ha./....aaBBBBaaHa../.....WWaaWWa....',
    ],
};
const palettes = { a: '#465165', H: '#e8f1e9', W: '#f0a33a', v: '#267485', E: '#c9ffff', B: '#526579', R: '#91a6b2', G: '#87cf78' };
const frames = new Map();
export function crewArt(id, direction, frame) {
    const def = CREW.find(c => c.id === id);
    let rows = bodies[id][direction === 3 ? 1 : direction].split('/');
    if (direction === 3)
        rows = rows.map(r => [...r].reverse().join(''));
    const legs = frame === 1 ? ['....aWW..Wa...../....aaa..WWa..../.........aaa....'] : frame === 2 ? ['.....Wa..WWa..../....aWW..aaa..../....aaa.........'] : ['....aWW..WWa..../....aaa..aaa..../................'];
    rows.push(...legs[0].split('/'));
    const palette = { ...palettes, W: def.color };
    if (id === 'bolt')
        palette.H = '#cf8839';
    if (id === 'mew')
        palette.H = '#c5a45e';
    if (frame === 3) {
        for (const k of Object.keys(palette))
            palette[k] = k === 'E' ? '#ffffff' : '#df5c53';
    }
    return { rows, palette };
}
export function crewSprite(id, direction = 0, frame = 0) {
    const key = `${id}:${direction}:${frame}`;
    const old = frames.get(key);
    if (old)
        return old;
    const art = crewArt(id, direction, frame), canvas = document.createElement('canvas');
    canvas.width = canvas.height = 24;
    const c = canvas.getContext('2d');
    const ox = 4, oy = 3;
    c.fillStyle = '#10131d';
    for (let y = 0; y < art.rows.length; y++)
        for (let x = 0; x < art.rows[y].length; x++)
            if (art.palette[art.rows[y][x]])
                for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]])
                    c.fillRect(x + ox + dx, y + oy + dy, 1, 1);
    for (let y = 0; y < art.rows.length; y++)
        for (let x = 0; x < art.rows[y].length; x++) {
            const color = art.palette[art.rows[y][x]];
            if (color) {
                c.fillStyle = color;
                c.fillRect(x + ox, y + oy, 1, 1);
            }
        }
    frames.set(key, canvas);
    return canvas;
}

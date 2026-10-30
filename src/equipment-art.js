import { gearDef } from './equipment.js';
const rows = {
    weapon: ['................', '..........aaa...', '....aaaaaabcb...', '..aaabbbbbbcba..', '.abbbbbbbbbbba..', '.abcccccccbbba..', '..aaabbbbbbaaa..', '.....abbbaa.....', '.....abbaa......', '.....abbaa......', '.....aaaa.......'],
    orbit: ['.....aaaaaa.....', '...aabbbbbbaa...', '..abccbbbbccba..', '.abcbaaaaabcba..', '.abba....abba..', '.abba.aa.abba..', '.abba.aa.abba..', '.abba....abba..', '.abcbaaaaabcba..', '..abccbbbbccba..', '...aabbbbbbaa...', '.....aaaaaa.....'],
    missile: ['.......aa.......', '......abba......', '.....abccba.....', '.....abccba.....', '.....abccba.....', '....aabbbbaa....', '...abbbbbbbba...', '..abbbabbabbba..', '..aaaabbbbaaaa..', '......adda......', '......adda......', '.......aa.......'],
    nova: ['....aaaaaaaa....', '...abbbbbbbba...', '..abccbbbbccba..', '..abccccccccba..', '..abbbaaaabbba..', '...aabdddbaa....', '....abdddba.....', '....abdddba.....', '...aabbbbaa.....', '..abbbbbbbba....', '..aaaaaaaaaa....'],
    helmet: ['.....aaaaaa.....', '...aabbbbbbaa...', '..abccccccccba..', '..abccccccccba..', '.abbcddddddcbba.', '.abbcddddddcbba.', '.abbcddddddcbba.', '.abbcddddddcbba.', '..abccccccccba..', '..abbbbbbbbbba..', '...aaabbbaaaa...', '.....aaaaaa.....'],
    suit: ['...aaa....aaa...', '..abccaaaaecba..', '.abbccbbbbccbbba', '.abbccbddbccbbba', '.aabccbddbccbaa.', '..abccbbbbccba..', '..abccbbbbccba..', '..abccccccccba..', '..abbbbbbbbbba..', '...abbbaabbba...', '...abbbaabbba...', '...aaaa.aaaa....'],
    gloves: ['..aa......aa....', '.abba....abba...', '.abbbaa..abbbaa.', '.abbbba..abbbba.', '.abccba..abccba.', '.abccba..abccba.', '.abccba..abccba.', '..abba....abba..', '..adda....adda..', '..aaaa....aaaa..'],
    boots: ['...aaaa..aaaa...', '...abba..abba...', '...abba..abba...', '...abba..abba...', '...abba..abba...', '..abbba..abbba..', '.abccba.abccba..', '.abccba.abccba..', '.abbbba.abbbba..', '.aaaaaa.aaaaaa..', '..dddd...dddd...'],
    pack: ['....aaaaaaaa....', '...abbbbbbbba...', '..aabccbbccbaa..', '.abbccccccccbba.', '.abbbbaaaabbbba.', '.abbbaeddeabbba.', '.abbbaeddeabbba.', '.abbbbaaaabbbba.', '.abbccccccccbba.', '..aabbbbbbbbaa..', '...abbbbbbbba...', '....aaaaaaaa....'],
};
export function paintGear(canvas, item) {
    const d = gearDef(item), key = d.family === 'orbit' ? 'orbit' : d.family === 'missile' ? 'missile' : d.family === 'nova' ? 'nova' : d.slot;
    const palette = { a: '#10131d', b: d.variant % 2 ? '#496359' : '#526579', c: '#c3d2cc', d: d.variant % 2 ? '#f6b751' : '#69c9ce', e: '#df5c53' };
    canvas.width = 24;
    canvas.height = 24;
    const c = canvas.getContext('2d');
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 24, 24);
    rows[key].forEach((row, y) => [...row].forEach((pixel, x) => { if (pixel !== '.') {
        c.fillStyle = palette[pixel];
        c.fillRect(x + 4, y + 6, 1, 1);
    } }));
    if (d.variant === 1 && !d.family) {
        c.fillStyle = '#cf8839';
        c.fillRect(d.slot === 'helmet' ? 9 : 10, 9, 4, 2);
        c.fillStyle = '#e8f1e9';
        c.fillRect(10, 9, 2, 1);
    }
}
export function drawGearIcons(root, items) { for (const c of root.querySelectorAll('canvas[data-gear]')) {
    const item = items.find(i => i.uid === Number(c.dataset.gear));
    if (item)
        paintGear(c, item);
} }

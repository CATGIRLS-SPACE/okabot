"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetEmoji = void 0;
const __1 = require("..");
const EMOJI = {
    // main
    'okash': { prod: '', dev: '1317965051650510858' },
    'nekoheart': { prod: '1316232330733682689', dev: '1317973098430988321' },
    // silly
    'cat_raised': { prod: '', dev: '1317967299944255519' },
    'cat_sunglasses': { prod: '', dev: '1317967329702842368' },
    'cat_money': { prod: '', dev: '1317967417099423896' },
    // coins
    'cfw': { prod: '', dev: '1317965338557550746', animated: true },
    'cff': { prod: '', dev: '1317965348045193287' },
    'cfw_red': { prod: '', dev: '1317965114111954954', animated: true },
    'cff_red': { prod: '', dev: '1317965125751275662' },
    'cfw_blue': { prod: '', dev: '1317965285311119391', animated: true },
    'cff_blue': { prod: '', dev: '1317965300481916958' },
    'cfw_dblue': { prod: '', dev: '1317965260593823794', animated: true },
    'cff_dblue': { prod: '', dev: '1317965269133688882' },
    'cfw_green': { prod: '', dev: '1317965218227425463', animated: true },
    'cff_green': { prod: '', dev: '1317965226603188295' },
    'cfw_dgreen': { prod: '', dev: '1317965243049054219', animated: true },
    'cff_dgreen': { prod: '', dev: '1317965251718807584' },
    'cfw_pink': { prod: '', dev: '1317965193250078760', animated: true },
    'cff_pink': { prod: '', dev: '1317965202435739799' },
    'cfw_purple': { prod: '', dev: '1317965168038252554', animated: true },
    'cff_purple': { prod: '', dev: '1317965178993774692' },
    'cfw_rainbow': { prod: '', dev: '1317965135540654090', animated: true },
    'cff_rainbow': { prod: '', dev: '1317965155534901248' },
    // gems
    'g00': { prod: '', dev: '1317965065298640936' },
    'g01': { prod: '', dev: '1317965089109704804' },
    // cards
    'ca': { prod: '1317726303541006367', dev: '1317728258652901447' },
    'c2': { prod: '1317726214240206848', dev: '1317728181352009788' },
    'c3': { prod: '1317726223744630834', dev: '1317728189912711208' },
    'c4': { prod: '1317726232409800745', dev: '1317728197185634355' },
    'c5': { prod: '1317726240714784828', dev: '1317728203967692852' },
    'c6': { prod: '1317726251883958273', dev: '1317728211995459747' },
    'c7': { prod: '1317726264844353566', dev: '1317728221537501344' },
    'c8': { prod: '1317726276663906314', dev: '1317728233738731611' },
    'c9': { prod: '1317726285799227493', dev: '1317728241359917126' },
    'c10': { prod: '1317726293542047756', dev: '1317728249551388683' },
    'cr': { prod: '1317726312986837033', dev: '1317728273823698974' },
};
function GetEmoji(name) {
    return `<${EMOJI[name].animated ? 'a' : ''}:${name}:${EMOJI[name][__1.DEV ? 'dev' : 'prod']}>`;
}
exports.GetEmoji = GetEmoji;

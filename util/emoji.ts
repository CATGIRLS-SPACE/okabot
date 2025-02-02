import { DEV } from ".."

export enum EMOJI {
    OKASH = 'okash',
    NEKOHEART = 'nekoheart',
    CAT_RAISED_EYEBROWS = 'cat_raised',
    CAT_SUNGLASSES = 'cat_sunglasses',
    CAT_MONEY_EYES = 'cat_money',
    // coins
    COIN_DEFAULT_FLIPPING = 'cfw',
    COIN_DEFAULT_STATIONARY = 'cff',
    COIN_RED_FLIPPING = 'cfw_red',
    COIN_RED_STATIONARY = 'cff_red',
    COIN_BLUE_FLIPPING = 'cfw_blue',
    COIN_BLUE_STATIONARY = 'cff_blue',
    COIN_DARK_BLUE_FLIPPING = 'cfw_dblue',
    COIN_DARK_BLUE_STATIONARY = 'cff_dblue',
    WEIGHTED_COIN_FLIPPING = 'cfw_green',
    WEIGHTED_COIN_STATIONARY = 'cff_green',
    COIN_DARK_GREEN_FLIPPING = 'cfw_dgreen',
    COIN_DARK_GREEN_STATIONARY = 'cff_dgreen',
    COIN_PINK_FLIPPING = 'cfw_pink',
    COIN_PINK_STATIONARY = 'cff_pink',
    COIN_PURPLE_FLIPPING = 'cfw_purple',
    COIN_PURPLE_STATIONARY = 'cff_purple',
    COIN_RAINBOW_FLIPPING = 'cfw_rainbow',
    COIN_RAINBOW_STATIONARY = 'cff_rainbow',
    // --
    STREAK_RESTORE_GEM = 'g00',
    MYSTERY_GEM = 'g01',
    SHOP_VOUCHER= 'sv',
    // cards
    ACE = 'ca',
    TWO = 'c2',
    THREE = 'c3',
    FOUR = 'c4',
    FIVE = 'c5',
    SIX = 'c6',
    SEVEN = 'c7',
    EIGHT = 'c8',
    NINE = 'c9',
    TEN = 'c10',
    ROYALTY = 'cr',
    CARD_BACK = 'cb',
    // shindo
    SHINDO_1 = 'eq1',
    SHINDO_2 = 'eq2',
    SHINDO_3 = 'eq3',
    SHINDO_4 = 'eq4',
    SHINDO_5_LOWER = 'eq5l',
    SHINDO_5_UPPER = 'eq5u',
    SHINDO_6_LOWER = 'eq6l',
    SHINDO_6_UPPER = 'eq6u',
    SHINDO_7 = 'eq7',
    SHINDO_UNKNOWN = 'equ',
}

const EMOJI_KEYS: {
    [key: string]: {prod:string, dev:string, animated?: boolean}
} = {
    // main
    'okash':{prod:'1315058783889657928',dev:'1317965051650510858'},
    'nekoheart':{prod:'1316232330733682689',dev:'1317973098430988321'},
    // silly
    'cat_raised':{prod:'1315878043578925056',dev:'1317967299944255519'},
    'cat_sunglasses':{prod:'1315853022324326482',dev:'1317967329702842368'},
    'cat_money':{prod:'1315862405607067648',dev:'1317967417099423896'},
    // coins
    'cfw':{prod:'1314729112065282048',dev:'1317965338557550746', animated: true},
    'cff':{prod:'1314729249189400596',dev:'1317965348045193287'},
    'cfw_red':{prod:'1316187589413306379',dev:'1317965114111954954', animated: true},
    'cff_red':{prod:'1316187598791905280',dev:'1317965125751275662'},
    'cfw_blue':{prod:'1316187516319039508',dev:'1317965285311119391', animated: true},
    'cff_blue':{prod:'1316187504067739699',dev:'1317965300481916958'},
    'cfw_dblue':{prod:'1316187541417758811',dev:'1317965260593823794', animated: true},
    'cff_dblue':{prod:'1316187532349935728',dev:'1317965269133688882'},
    'cfw_green':{prod:'1315842708090392606',dev:'1317965218227425463', animated: true},
    'cff_green':{prod:'1315843280776462356',dev:'1317965226603188295'},
    'cfw_dgreen':{prod:'1316187567988801566',dev:'1317965243049054219', animated: true},
    'cff_dgreen':{prod:'1316187558375456859',dev:'1317965251718807584'},
    'cfw_pink':{prod:'1316173461118255145',dev:'1317965193250078760', animated: true},
    'cff_pink':{prod:'1316173446803226665',dev:'1317965202435739799'},
    'cfw_purple':{prod:'1316175061966782555',dev:'1317965168038252554', animated: true},
    'cff_purple':{prod:'1316175038042472491',dev:'1317965178993774692'},
    'cfw_rainbow':{prod:'1316224255511367710',dev:'1317965135540654090', animated: true},
    'cff_rainbow':{prod:'1316224243855261776',dev:'1317965155534901248', animated: true},
    // gems
    'g00':{prod:'1315084985589563492',dev:'1317965065298640936'},
    'g01':{prod:'1315098781477503128',dev:'1317965089109704804'},
    'sv': {prod: '1326718125215055934', dev: '1326716871797637160'},
    // cards
    'ca':{prod:'1317726303541006367',dev:'1317728258652901447'},
    'c2':{prod:'1317726214240206848',dev:'1317728181352009788'},
    'c3':{prod:'1317726223744630834',dev:'1317728189912711208'},
    'c4':{prod:'1317726232409800745',dev:'1317728197185634355'},
    'c5':{prod:'1317726240714784828',dev:'1317728203967692852'},
    'c6':{prod:'1317726251883958273',dev:'1317728211995459747'},
    'c7':{prod:'1317726264844353566',dev:'1317728221537501344'},
    'c8':{prod:'1317726276663906314',dev:'1317728233738731611'},
    'c9':{prod:'1317726285799227493',dev:'1317728241359917126'},
    'c10':{prod:'1317726293542047756',dev:'1317728249551388683'},
    'cr':{prod:'1317726312986837033',dev:'1317728273823698974'},
    'cb':{prod:'1324870295755952259',dev:'1324870922859053106'},
    // shindo
    'eq1':{prod:'1335463075809071252','dev':'1335475246710657077'},
    'eq2':{prod:'1335463119052603453','dev':'1335475262606803035'},
    'eq3':{prod:'1335463136547049584','dev':'1335475281003024517'},
    'eq4':{prod:'1335463152716087396','dev':'1335475298501660695'},
    'eq5l':{prod:'1335463183695089747','dev':'1335475320538792096'},
    'eq5u':{prod:'1335463206881198091','dev':'1335475345066950816'},
    'eq6l':{prod:'1335463241081557022','dev':'1335475371713499180'},
    'eq6u':{prod:'1335463269678452747','dev':'1335475398665965648'},
    'eq7':{prod:'1335463297079840871','dev':'1335475421600419902'},
    'equ':{prod:'1335463317325746187','dev':'1335475441930207263'},
}

export function GetEmoji(name: string): string {
    return `<${EMOJI_KEYS[name].animated?'a':''}:${name}:${EMOJI_KEYS[name][DEV?'dev':'prod']}>`;
}
export function GetEmojiID(name: string): string {
    return EMOJI_KEYS[name][DEV?'dev':'prod'];
}
// once these have been used you **CANNOT** change the order of them
// if you add an item, it MUST be at the end, otherwise you will BREAK a user file!

export enum ITEMS {
    LOOTBOX_COMMON,
    LOOTBOX_RARE,
    LOOTBOX_EX,
    WEIGHTED_COIN_ONE_USE,
    STREAK_RESTORE,
    TRACKED_CONVERTER,
    SHOP_VOUCHER,
    LOT_SCRATCH,
    LOOTBOX_INCREASE_15_MIN,
    LOOTBOX_INCREASE_30_MIN,
    CASINO_PASS_10_MIN,
    CASINO_PASS_30_MIN,
    CASINO_PASS_1_HOUR,
    SCRAP_TYPE_METAL,
    SCRAP_TYPE_PLASTIC,
    SCRAP_TYPE_WOOD,
    SCRAP_TYPE_RUBBER,
    SCRAP_TYPE_ELECTRICAL,
    STICKER_NOT_APPLIED,
}

export const ITEM_ID_NAMES: {[key: number]: string} = {
    0: 'Common Lootbox',
    1: 'Rare Lootbox',
    2: 'EX Lootbox',
    3: 'Weighted Coin',
    4: 'Streak Restore',
    5: 'Tracking Device',
    6: 'Shop Voucher',
    7: 'Scratch Ticket',
    8: 'Drop Boost (15 minutes)',
    9: 'Drop Boost (30 minutes)',
    10:'Casino Pass (10 minutes)',
    11:'Casino Pass (30 minutes)',
    12:'Casino Pass (60 minutes)',
    18:'Sticker Kit'
}

export enum CUSTOMIZATION_UNLOCKS {
    COIN_DEF,
    COIN_RED,
    COIN_DBLUE,
    COIN_BLUE, // considered light blue
    COIN_PINK,
    COIN_PURPLE,
    CV_LEVEL_BANNER_DEF,
    CV_LEVEL_BAR_RED,
    CV_LEVEL_BAR_GREEN,
    CV_LEVEL_BAR_BLUE,
    CV_LEVEL_BAR_PINK,
    CV_LEVEL_BAR_OKABOT,
    DECK_DEFAULT,
    DECK_TRANS,
    DECK_SAKURA,
    UNUSED_CUST_ID_15,
    COIN_DGREEN, // normal green = reserved for weighted coin
    COIN_RAINBOW,
    CV_LEVEL_BANNER_USER,
    CV_LEVEL_BAR_CUSTOM,
    CV_LEVEL_BAR_CUSTOM_PENDING
}

// only used for getting coinflip names atm
export const CUSTOMIZTAION_ID_NAMES: {[key: number]: string} = {
    0: 'Default Coin',
    1: 'Red Coin',
    2: 'Dark Blue Coin',
    3: 'Light Blue Coin',
    4: 'Pink Coin',
    5: 'Purple Coin',
    12:'Default Card Deck',
    13:'Trans Card Deck',
    16:'Dark Green Coin',
    17:'Rainbow Coin',
    18:'Cherry Blossom Card Deck'
}
export const TRACKABLE_ID_NAMES: {[key: string]: number} = {
    'red coin': 1,
    'rc': 1,
    'dark blue coin': 2,
    'dbc': 2,
    'light blue coin': 3,
    'lbc': 3,
    'pink coin': 4,
    'pc': 4,
    'purple coin': 5,
    'ppc': 5,
    'dark green coin': 16,
    'dgc': 16,
    'rainbow coin': 17,
    'rbc': 17,
    'trans card deck': 13,
    'tcd': 13,
    'scd': 14,
    'sakura card deck': 14,
    'cherry blossom card deck': 14,
    'cbcd': 14
}

export enum ITEM_TYPE {
    ITEM,
    GEM,
    CUSTOMIZATION
}
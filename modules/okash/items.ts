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
    12:'Casino Pass (60 minutes)'
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
    UNUSED_CUST_ID_12,
    UNUSED_CUST_ID_13,
    UNUSED_CUST_ID_14,
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
    16:'Dark Green Coin',
    17:'Rainbow Coin'
}

export enum ITEM_TYPE {
    ITEM,
    GEM,
    CUSTOMIZATION
}
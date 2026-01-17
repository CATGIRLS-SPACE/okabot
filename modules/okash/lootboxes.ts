import { Snowflake } from "discord.js";
import { ITEMS, CUSTOMIZATION_UNLOCKS } from "./items";

export enum LOOTBOX_REWARD_TYPE {
    OKASH = 'money',
    ITEM = 'item',
    CUSTOMIZATION = '',
    SCRAPS = 'scrap',
}

export interface LootboxRewardsOkash {
    type: LOOTBOX_REWARD_TYPE.OKASH,
    amount: number
}
export interface LootboxRewardsItem {
    type: LOOTBOX_REWARD_TYPE.ITEM,
    item_id: ITEMS
}
export interface LootboxRewardsScraps {
    type: LOOTBOX_REWARD_TYPE.SCRAPS,
    amount: {
        p: number,
        m: number,
        w: number,
        r: number,
        e: number,
    }
}

export const LootboxRecentlyDropped = new Map<Snowflake, {item:ITEMS,time:number}>();

// DUDE WHAT THE FUCK IS THIS

// Function that calculates Lootbox Rewards
export function lootboxRewardCommon(user_id: Snowflake): LootboxRewardsOkash | LootboxRewardsItem | LootboxRewardsScraps {
    const roll = Math.floor(Math.random() * 3) + 1; // roll 1-3

    switch (roll) {
        case 1: // 1 = okash
            { const okash_reward = Math.floor(Math.random()*400) + 100; // 100-500
            return {type: LOOTBOX_REWARD_TYPE.OKASH, amount:okash_reward}; }

        case 2:
            { const item = Math.random()<0.5?ITEMS.WEIGHTED_COIN_ONE_USE:ITEMS.STREAK_RESTORE;
            LootboxRecentlyDropped.set(user_id, {item:item, time:Math.floor((new Date()).getTime()/1000)});
            return {type:LOOTBOX_REWARD_TYPE.ITEM, item_id:item}; }

        case 3:
            { const rolled_scraps = {
                p: Math.floor(Math.random() * 50) + 1,
                m: Math.floor(Math.random() * 50) + 1,
                w: Math.floor(Math.random() * 50) + 1,
                r: Math.floor(Math.random() * 50) + 1,
                e: Math.floor(Math.random() * 50) + 1,
            };
            return {type:LOOTBOX_REWARD_TYPE.SCRAPS, amount:rolled_scraps} }

        default:
            // how did we get here?
            { const okash_reward_d = Math.floor(Math.random()*400) + 100; // 100-500
            return {type: LOOTBOX_REWARD_TYPE.OKASH, amount:okash_reward_d}; }
    }
}

export function rareLootboxReward(user_id: Snowflake): { type: LOOTBOX_REWARD_TYPE, value: number } {
    const roll = Math.floor(Math.random() * 1000);  // Roll between 0 and 999
    // console.log(`Reward Roll: ${roll}`);
    const time = Math.round(new Date().getTime() / 1000);
    
    if (roll >= 150) { // if the roll is greater than 150, give Okash (85% chance to get okash)
        const max = 2500;
        const min = 500;
        const moneyAmount = Math.floor(Math.random() * (max-min)) + min;  // Random between 500-2500

        return { 
            type: LOOTBOX_REWARD_TYPE.OKASH, 
            value: moneyAmount 
        };
    } else if (roll<=149 && roll>=20) {
        const drop = (Math.random()>0.5)?ITEMS.SHOP_VOUCHER:ITEMS.WEIGHTED_COIN_ONE_USE;
        LootboxRecentlyDropped.set(user_id, {item:drop, time});
        return { 
            type: LOOTBOX_REWARD_TYPE.ITEM, 
            value: drop 
        };
    } else {
        LootboxRecentlyDropped.set(user_id, {item:Math.random()>0.3?ITEMS.LOT_SCRATCH:ITEMS.TRACKED_CONVERTER, time});
        return {
            type: LOOTBOX_REWARD_TYPE.ITEM,
            value: ITEMS.LOT_SCRATCH
        };
    } 
}

export function exLootboxReward(user_id: Snowflake): {type: LOOTBOX_REWARD_TYPE, value: number} {
    const roll = Math.floor(Math.random() * 1000);
    const time = Math.round(new Date().getTime() / 1000);

    // between 5000-25000 okash
    if (roll < 500) {
        const okash = Math.floor(Math.random() * 20000) + 5000;
        return {type: LOOTBOX_REWARD_TYPE.OKASH, value: okash};
    }

    if (roll >= 500 && roll < 900) {
        const item = [ITEMS.TRACKED_CONVERTER, ITEMS.STICKER_NOT_APPLIED][Math.round(Math.random())];
        LootboxRecentlyDropped.set(user_id, {item, time})
        return {type: LOOTBOX_REWARD_TYPE.ITEM, value: item}
    }

    if (roll >= 900 && roll < 950) {
        const item = [
            ITEMS.CASINO_PASS_10_MIN,
            ITEMS.CASINO_PASS_30_MIN,
            ITEMS.CASINO_PASS_1_HOUR,
            ITEMS.LOOTBOX_INCREASE_15_MIN,
            ITEMS.LOOTBOX_INCREASE_30_MIN,
            ITEMS.TRACKED_CONVERTER,
            ITEMS.STICKER_NOT_APPLIED
        ][Math.round(Math.random() * 6)]; // get a random item

        LootboxRecentlyDropped.set(user_id, {item, time});
        return {type: LOOTBOX_REWARD_TYPE.ITEM, value: item};
    }

    if (roll >= 950) {
        return {type: LOOTBOX_REWARD_TYPE.CUSTOMIZATION, value: CUSTOMIZATION_UNLOCKS.COIN_RAINBOW};
    }

    // this should never trigger but its here to stop tsc from whining
    return {type:LOOTBOX_REWARD_TYPE.OKASH,value:0}
}
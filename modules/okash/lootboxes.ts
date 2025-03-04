import { ChatInputCommandInteraction, Snowflake } from "discord.js";
import { ITEM_TYPE, ITEMS, CUSTOMIZATION_UNLOCKS } from "./items";
import { GetUserProfile} from "../user/prefs";

export enum LOOTBOX_REWARD_TYPE {
    OKASH = 'money',
    ITEM = 'item',
    CUSTOMIZATION = ''
}

export const LootboxRecentlyDropped = new Map<Snowflake, {item:ITEMS,time:number}>();

// Function that calculates Lootbox Rewards
export function commonLootboxReward(user_id: Snowflake): { type: LOOTBOX_REWARD_TYPE, value: number } {
    const roll = Math.floor(Math.random() * 100);  // Roll between 0 and 99
    // console.log(`Reward Roll: ${roll}`);
    const time = Math.round(new Date().getTime() / 1000);
    
    if (roll > 15) { // if the roll is greater than 15, give Okash (85% chance to get okash)
        const moneyAmount = Math.floor(Math.random() * 400) + 100;  // Random between 100-500
        return { 
            type: LOOTBOX_REWARD_TYPE.OKASH, 
            value: moneyAmount 
        };
    } else { // get a weighted coin if the value is LOWER than 15
        LootboxRecentlyDropped.set(user_id, {item:ITEMS.WEIGHTED_COIN_ONE_USE, time});
        return { 
            type: LOOTBOX_REWARD_TYPE.ITEM, 
            value: ITEMS.WEIGHTED_COIN_ONE_USE 
        };
    }
}

export function rareLootboxReward(user_id: Snowflake): { type: LOOTBOX_REWARD_TYPE, value: number } {
    const roll = Math.floor(Math.random() * 1000);  // Roll between 0 and 999
    // console.log(`Reward Roll: ${roll}`);
    const time = Math.round(new Date().getTime() / 1000);
    
    if (roll >= 150) { // if the roll is greater than 150, give Okash (85% chance to get okash)
        let max = 2500;
        let min = 500;
        const moneyAmount = Math.floor(Math.random() * (max-min)) + min;  // Random between 500-2500

        return { 
            type: LOOTBOX_REWARD_TYPE.OKASH, 
            value: moneyAmount 
        };
    } else if (roll<=149 && roll>=20) {
        const drop = (Math.random()>0.5)?ITEMS.STREAK_RESTORE:ITEMS.WEIGHTED_COIN_ONE_USE;
        LootboxRecentlyDropped.set(user_id, {item:drop, time});
        return { 
            type: LOOTBOX_REWARD_TYPE.ITEM, 
            value: drop 
        };
    } else {
        LootboxRecentlyDropped.set(user_id, {item:ITEMS.SHOP_VOUCHER, time});
        return {
            type: LOOTBOX_REWARD_TYPE.ITEM,
            value: ITEMS.SHOP_VOUCHER
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
        const item = [ITEMS.TRACKED_CONVERTER, ITEMS.SHOP_VOUCHER][Math.round(Math.random())];
        LootboxRecentlyDropped.set(user_id, {item, time})
        return {type: LOOTBOX_REWARD_TYPE.ITEM, value: item}
    }

    if (roll >= 900 && roll != 999) {
        const item = [
            ITEMS.CASINO_PASS_10_MIN,
            ITEMS.CASINO_PASS_30_MIN,
            ITEMS.CASINO_PASS_1_HOUR,
            ITEMS.LOOTBOX_INCREASE_15_MIN,
            ITEMS.LOOTBOX_INCREASE_30_MIN,
            ITEMS.TRACKED_CONVERTER,
        ][Math.round(Math.random() * 5)]; // get a random item

        LootboxRecentlyDropped.set(user_id, {item, time});
        return {type: LOOTBOX_REWARD_TYPE.ITEM, value: item};
    }

    if (roll == 999) {
        return {type: LOOTBOX_REWARD_TYPE.CUSTOMIZATION, value: CUSTOMIZATION_UNLOCKS.COIN_RAINBOW};
    }

    // this should never trigger but its here to stop tsc from whining
    return {type:LOOTBOX_REWARD_TYPE.OKASH,value:0}
}
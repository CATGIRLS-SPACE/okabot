import { ChatInputCommandInteraction } from "discord.js";
import { ITEM_TYPE, ITEMS, CUSTOMIZATION_UNLOCKS } from "./items";
import { GetUserProfile} from "../user/prefs";

export enum LOOTBOX_REWARD_TYPE {
    OKASH = 'money',
    ITEM = 'item',
    CUSTOMIZATION = ''
}

// Function that calculates Lootbox Rewards
export function commonLootboxReward(): { type: LOOTBOX_REWARD_TYPE, value: number } {
    const roll = Math.floor(Math.random() * 100);  // Roll between 0 and 99
    // console.log(`Reward Roll: ${roll}`);
    
    if (roll > 15) { // if the roll is greater than 15, give Okash (85% chance to get okash)
        const moneyAmount = Math.floor(Math.random() * 400) + 100;  // Random between 100-500
        return { 
            type: LOOTBOX_REWARD_TYPE.OKASH, 
            value: moneyAmount 
        };
    } else { // get a weighted coin if the value is LOWER than 15
        return { 
            type: LOOTBOX_REWARD_TYPE.ITEM, 
            value: ITEMS.WEIGHTED_COIN_ONE_USE 
        };
    }
}

export function rareLootboxReward(): { type: LOOTBOX_REWARD_TYPE, value: number } {
    const roll = Math.floor(Math.random() * 1000);  // Roll between 0 and 999
    // console.log(`Reward Roll: ${roll}`);
    
    if (roll >= 150) { // if the roll is greater than 150, give Okash (85% chance to get okash)
        let max = 2500;
        let min = 500;
        const moneyAmount = Math.floor(Math.random() * (max-min)) + min;  // Random between 500-2500

        return { 
            type: LOOTBOX_REWARD_TYPE.OKASH, 
            value: moneyAmount 
        };
    } else if (roll<=149 && roll>=20) {
        return { 
            type: LOOTBOX_REWARD_TYPE.ITEM, 
            value: ITEMS.WEIGHTED_COIN_ONE_USE 
        };
    } else {
        return {
            type: LOOTBOX_REWARD_TYPE.ITEM,
            value: (Math.random()>0.5)?ITEMS.SHOP_VOUCHER:ITEMS.STREAK_RESTORE
        };
    } 
}
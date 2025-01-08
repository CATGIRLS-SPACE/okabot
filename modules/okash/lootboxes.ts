import { GEMS, ITEM_TYPE, ITEMS } from "../okash/items";

export enum LOOTBOX_REWARD_TYPE {
    OKASH = 'money',
    ITEM = 'item'
}

// Function that calculates Lootbox Rewards
export function calculateLootboxReward(): { type: LOOTBOX_REWARD_TYPE, value: number } {
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
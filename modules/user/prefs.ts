import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs"
import { CUSTOMIZATION_UNLOCKS } from "../okash/items"
import { join } from "path"
import { BASE_DIRNAME } from "../.."

export enum FLAG {
    WEIGHTED_COIN_EQUIPPED,
}

export enum COIN_COLOR {
    DEFAULT,
    RED,
    GREEN,
    BLUE,
    PINK,
    PURPLE,
}

export interface USER_PROFILE {
    flags: Array<FLAG>, // keeping this as an array so i dont have to painfully upgrade later on
    customization: {
        coin_color: COIN_COLOR,
        messages: {
            okash: string,
            coinflip_first: string,
            coinflip_win: string,
            coinflip_loss: string
        },
        unlocked: Array<CUSTOMIZATION_UNLOCKS>
    },
    okash_notifications: boolean
}

const DEFAULT_DATA: USER_PROFILE = {
    flags: [],
    customization: {
        coin_color: COIN_COLOR.DEFAULT,
        messages: {
            coinflip_first: `{user} flips a coin for {amount}...`,
            coinflip_win: `{user} flips a coin for {amount}... and wins the bet, doubling their money! :smile_cat:`,
            coinflip_loss: `{user} flips a coin for {amount}... and loses the bet and their OKA{amount}. :crying_cat_face:`,
            okash: `{user}, you've got {wallet} in your wallet and {bank} in your bank.`
        },
        unlocked: [
            CUSTOMIZATION_UNLOCKS.COIN_DEF,
            CUSTOMIZATION_UNLOCKS.CV_LEVEL_THEME_DEF,
        ]
    },
    okash_notifications: true
}

let PROFILES_DIR: string;
    

export function SetupPrefs(base_dirname: string) {
    PROFILES_DIR = join(base_dirname, 'profiles');
    
    // runs on startup to ensure the profiles directory exists
    if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR);
}


export function GetUserProfile(user_id: string): USER_PROFILE {
    const profile_path = join(PROFILES_DIR, `${user_id}.oka`);

    // check if it exists
    if (!existsSync(profile_path)) {
        // initialize default
        writeFileSync(profile_path, JSON.stringify(DEFAULT_DATA), 'utf-8');
        return DEFAULT_DATA; // just return the default cuz no profile changes yet
    }

    const data: USER_PROFILE = JSON.parse(readFileSync(profile_path, 'utf-8'));
    return data;
}


export function UpdateUserProfile(user_id: string, new_data: USER_PROFILE) {
    const profile_path = join(PROFILES_DIR, `${user_id}.oka`);
    writeFileSync(profile_path, JSON.stringify(new_data), 'utf-8');
}
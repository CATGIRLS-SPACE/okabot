import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "fs"
import { CUSTOMIZATION_UNLOCKS } from "../okash/items"
import { join } from "path"
import { BASE_DIRNAME } from "../.."
import { ChatInputCommandInteraction, Client, EmbedBuilder } from "discord.js"
import { Logger } from "okayulogger"

const L = new Logger('profiles');

export enum FLAG {
    WEIGHTED_COIN_EQUIPPED,
}

// probably never going to be used besides in here
export enum COIN_COLOR {
    DEFAULT,
    RED,
    GREEN,
    BLUE,
    PINK,
    PURPLE,
}

export interface USER_PROFILE {
    has_agreed_to_rules: boolean,
    okash_restriction?: {
        is_restricted: boolean,
        reason: string,
        until: number,
        abilities: string
    },
    flags: Array<FLAG>, // keeping this as an array so i dont have to painfully upgrade later on
    customization: {
        coin_color: COIN_COLOR | CUSTOMIZATION_UNLOCKS,
        messages: {
            okash: string,
            coinflip_first: string,
            coinflip_win: string,
            coinflip_loss: string
        },
        unlocked: Array<CUSTOMIZATION_UNLOCKS>,
        level_banner: {
            hex_bg: string,
            hex_fg: string,
            hex_num: string
        }
    },
    okash_notifications: boolean,
    level: {
        level: number,
        current_xp: number
    },
    owes: {[key: string]: number},
    pass?: {
        is_active: boolean, 
        valid_until: number,
    }
}

const DEFAULT_DATA: USER_PROFILE = {
    has_agreed_to_rules: false,
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
            CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF,
            CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_OKABOT,
        ],
        level_banner: {
            hex_bg: '#666',
            hex_fg: '#222',
            hex_num: '#fff'
        }
    },
    okash_notifications: true,
    level: {
        level: 1,
        current_xp: 0
    },
    owes: {},
    pass: {
        valid_until: 0,
        is_active: false
    }
}

let PROFILES_DIR: string;
    

export function SetupPrefs(base_dirname: string) {
    PROFILES_DIR = join(base_dirname, 'profiles');
    
    // runs on startup to ensure the profiles directory exists
    if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR);
}


export function GetUserProfile(user_id: string): USER_PROFILE {
    // only should trigger if you use the --wipe flag
    if (!PROFILES_DIR) PROFILES_DIR = join(BASE_DIRNAME, 'profiles');

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


export enum OKASH_ABILITY {
    GAMBLE = 'gamble',
    SHOP = 'shop',
    TRANSFER = 'transfer'
}

export async function CheckOkashRestriction(interaction: ChatInputCommandInteraction, ability: OKASH_ABILITY): Promise<boolean> {
    const profile = GetUserProfile(interaction.user.id);

    if (profile.okash_restriction?.is_restricted) {
        const d = new Date();
        const unrestrict_time = new Date(profile.okash_restriction.until);

        L.info(`user has a restriction that expires on ${unrestrict_time.toDateString() + ' at ' + unrestrict_time.toLocaleTimeString()}.`);
        L.info(`it is currently: ${d.toDateString() + ' at ' + d.toLocaleTimeString()}`);

        if (d.getTime() > profile.okash_restriction.until) {
            profile.okash_restriction = undefined;
            UpdateUserProfile(interaction.user.id, profile)
            return false;
        }

        // they are restricted in some way
        const abilities = profile.okash_restriction.abilities.includes(',')?profile.okash_restriction.abilities.split(','):profile.okash_restriction.abilities;

        if (abilities.indexOf(ability) != -1) {
            interaction.reply({
                content: `:x: Your account is restricted from using certain okash features.\nThis restriction affects: \`${profile.okash_restriction.abilities}\`\nThis restriction will be lifted on **${unrestrict_time.toDateString() + ' at ' + unrestrict_time.toLocaleTimeString()} CT** (<t:${Math.floor(unrestrict_time.getTime()/1000)}:R>)\n-# Please contact a bot administrator if you believe you have been wrongly punished.`
            });
        }

        return true;
    }

    return false;
}


export function CheckUserIdOkashRestriction(user_id: string, ability: string): boolean {
    const profile = GetUserProfile(user_id);

    if (profile.okash_restriction?.is_restricted) {
        const d = new Date();
        const unrestrict_time = new Date(profile.okash_restriction.until);

        L.info(`user has a restriction that expires on ${unrestrict_time.toDateString() + ' at ' + unrestrict_time.toLocaleTimeString()}.`);
        L.info(`it is currently: ${d.toDateString() + ' at ' + d.toLocaleTimeString()}`);

        if (d.getTime() > profile.okash_restriction.until) return false;

        // they are restricted in some way
        const abilities = profile.okash_restriction.abilities.includes(',')?profile.okash_restriction.abilities.split(','):profile.okash_restriction.abilities;

        if (abilities.indexOf(ability) != -1) {
            return true;
        }

        return false;
    }

    return false;
}


export async function GetAllLevels(): Promise<Array<{user_id: string, level: {level: number, current_xp: number}}>> {
    const all: Array<{user_id: string, level: {level: number, current_xp: number}}> = [];

    const profiles = readdirSync(PROFILES_DIR);
    
    profiles.forEach(profile => {
        let user_id = profile.split('.')[0];
        const p = GetUserProfile(user_id);
        all.push({user_id, level: p.level || {level: 0, current_xp: 0}});
    });

    return all;
}


export function RestrictUser(client: Client, user_id: string, until: string, abilities: string, reason: string) {
    const d = new Date(until);

    // update their account
    const profile = GetUserProfile(user_id);
    profile.okash_restriction = {
        is_restricted: true,
        until: d.getTime(),
        reason,
        abilities
    };
    
    UpdateUserProfile(user_id, profile);
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Important Account Update')
        .setDescription('You have received a restriction for your behavior with the bot. You are unable to use some okash features until the restriction is lifted.')
        .addFields(
            {name:'Reason', value:reason},
            {name:'Expires', value:d.toDateString() + ' at ' + d.toLocaleTimeString()}
        );

    try {
        client.users.cache.find((user) => user.id == user_id)!.send({embeds:[embed]});
    } catch (err) {
        L.error(`Couldn't send restriction info to ${user_id}`);
    }
}


export function ManageDebt(sender_id: string, receiver_id: string, amount: number) {
    const sender_profile = GetUserProfile(sender_id);
    const receiver_profile = GetUserProfile(receiver_id);

    if (!sender_profile.owes) sender_profile.owes = {};
    if (!receiver_profile.owes) receiver_profile.owes = {};

    // check if the sender is in debt to the receiver:
    if (!sender_profile.owes[receiver_id] || sender_profile.owes[receiver_id] == 0) {
        // the sender is not in any debt to the receiver
        let receiver_debt = receiver_profile.owes[sender_id] || 0;
        receiver_debt += amount;

        UpdateUserProfile(receiver_id, receiver_profile);
    } else {
        // the sender is in some sort of debt to the receiver
        const sender_debt = sender_profile.owes[receiver_id]; // positive, like 250
        const after_paid = sender_debt - amount; // if they paid 300, this would be -50
        const transferred_debt = Math.abs(after_paid); // this will become 50, which is how much we need to transfer to the receiver's debt
        
        receiver_profile.owes[sender_id] = receiver_profile.owes[sender_id]+transferred_debt || transferred_debt;

        UpdateUserProfile(receiver_id, receiver_profile);
        UpdateUserProfile(sender_id, sender_profile);
    }
}
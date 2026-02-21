/* eslint-disable @typescript-eslint/no-unused-vars */
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from "fs"
import {CUSTOMIZATION_UNLOCKS, ITEMS} from "../okash/items"
import {join} from "path"
import {BASE_DIRNAME, client} from "../../index"
import {ChatInputCommandInteraction, Client, EmbedBuilder, Snowflake} from "discord.js"
import {Logger} from "okayulogger"
import {Achievements} from "../passive/achievement"
// console.log('achievements is', Achievements)
import {UserPet} from "../pet/pet";
import { BannerSticker } from "../levels/levels"
import {Low} from "lowdb";
import {JSONFile, JSONFilePreset} from "lowdb/node";
import {KNOWN_AGREED_USER_IDS} from "./rules";

const L = new Logger('profiles');

export enum FLAG {
    WEIGHTED_COIN_EQUIPPED,
    CASINO_PASS,
    DROP_BOOST
}

export interface LEGACY_USER_PROFILE {
    has_agreed_to_rules: boolean,
    okash_restriction?: {
        is_restricted: boolean,
        reason: string,
        until: number,
        abilities: string
    },
    flags: Array<FLAG>, // keeping this as an array so i dont have to painfully upgrade later on <-- recent lily here what the fuck am i on about?
    customization: {
        coin_color: CUSTOMIZATION_UNLOCKS,
        unlocked: Array<CUSTOMIZATION_UNLOCKS>,
        level_banner: {
            hex_bg: string,
            hex_fg: string,
            hex_num: string
        },
        pronoun: {
            // she/he/they
            subjective: string,
            // her/him/them
            objective: string,
            // her/his/their
            possessive: string,
        }
    },
    okash_notifications: boolean,
    level: {
        level: number,
        current_xp: number,
        prestige?: number
    },
    achievements: Array<Achievements>,
}

export interface USER_PROFILE {
    version: number,
    accepted_rules: boolean,
    consents_to_statistics?: boolean,
    rules_accepted_version: string,
    flags: Array<FLAG>,
    customization: {
        unlocked: Array<CUSTOMIZATION_UNLOCKS>,
        global: {
            okash_notifications: boolean,
            pronouns: {
                subjective: string,
                possessive: string,
                objective: string,
            }
        },
        games: {
            coin_color: CUSTOMIZATION_UNLOCKS,
            equipped_trackable_coin: 'none' | string,
            card_deck_theme: CUSTOMIZATION_UNLOCKS,
            equipped_trackable_deck: 'none' | string,
        },
        level_banner: {
            hex_bg:  string,
            hex_fg:  string,
            hex_num: string,
            selected_title: string,
        },
        level_bg_override: string,
        stickers: Array<BannerSticker>
    },
    leveling: {
        level: number,
        current_xp: number,
    },
    okash: {
        wallet: number,
        bank:   number,
    },
    daily: {
        last_claimed: number,
        streak: number,
        restore_to: number,
        restored: boolean,
    },
    restriction: {
        active:     boolean,
        until:      number,
        reason:     string,
        abilities:  string
    }
    inventory: Array<ITEMS>,
    inventory_scraps: {
        metal: number,
        plastic: number,
        wood: number,
        rubber: number,
        electrical: number,
    },
    achievements: Array<Achievements>,
    trackedInventory: Array<string>,
    pet_data: {
        pets: Array<UserPet>,
        inventory: Array<number>,
    },
    cookies: number,
    ordr: {
        username: string,
        osu_username: string,
    }
}

const DEFAULT_DATA: USER_PROFILE = {
    version: 3,
    accepted_rules: false,
    rules_accepted_version: '',
    flags: [],
    customization: {
        unlocked: [CUSTOMIZATION_UNLOCKS.COIN_DEF, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_OKABOT, CUSTOMIZATION_UNLOCKS.DECK_DEFAULT],
        global: {
            okash_notifications: false,
            pronouns: {
                subjective: 'they',
                possessive: 'their',
                objective: 'them',
            }
        },
        games: {
            coin_color: CUSTOMIZATION_UNLOCKS.COIN_DEF,
            equipped_trackable_coin: 'none',
            card_deck_theme: CUSTOMIZATION_UNLOCKS.DECK_DEFAULT,
            equipped_trackable_deck: 'none',
        },
        level_banner: {
            hex_bg:  '#f00',
            hex_fg:  '#0f0',
            hex_num: '#00f',
            selected_title: Achievements.NONE,
        },
        level_bg_override: '',
        stickers: []
    },
    leveling: {
        level: 1,
        current_xp: 0,
    },
    okash: {
        wallet: 0,
        bank:   0,
    },
    daily: {
        last_claimed: 0,
        streak: 0,
        restore_to: 0,
        restored: false,
    },
    restriction: {
        active: false,
        reason: "",
        until: 0,
        abilities: ""
    },
    inventory: [],
    inventory_scraps: {
        metal: 0,
        plastic: 0,
        wood: 0,
        rubber: 0,
        electrical: 0,
    },
    achievements: [],
    trackedInventory: [],
    pet_data: {
        pets: [],
        inventory: [],
    },
    cookies: 0,
    ordr: {
        username: '',
        osu_username: '',
    }
}

let PROFILES_DIR: string | null = null;
let LOW_PROFILE_DB_PATH: string;

const ProfileCache = new Map<Snowflake, USER_PROFILE>();


interface ProfileDB {
    profiles: {
        [key: Snowflake]: USER_PROFILE
    }
}
let ProfilesDB: Low<ProfileDB>

export async function SetupPrefs(base_dirname: string) {
    PROFILES_DIR = join(base_dirname, 'profiles');
    LOW_PROFILE_DB_PATH = join(base_dirname, 'db', 'profiles.oka2');

    // runs on startup to ensure the profiles directory exists
    if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR);
    ProfilesDB = await JSONFilePreset(LOW_PROFILE_DB_PATH, {
        profiles: {} as {[key: Snowflake]: USER_PROFILE}
    });
}

function GetProfilesDir(): string {
    if (PROFILES_DIR == null) throw new Error("SetupPrefs() must be called before GetProfilesDir() can be used.");
    return PROFILES_DIR;
}

export function DumpProfileCache() {
    ProfileCache.clear();
}
export function ReloadProfile(user_id: Snowflake) {
    if (ProfileCache.has(user_id)) return ProfileCache.delete(user_id);
    GetUserProfile(user_id);
}

export function CheckForProfile(user_id: string): boolean {
    if (!PROFILES_DIR) PROFILES_DIR = join(BASE_DIRNAME, 'profiles');
    const profile_path = join(PROFILES_DIR, `${user_id}.oka`);

    // check if it exists
    if (!existsSync(profile_path)) return false;

    const profile = GetUserProfile(user_id);
    return !(profile.restriction.active && profile.restriction.until < new Date().getTime());
}

export function GetUserProfile(user_id: string): USER_PROFILE {
    // only should trigger if you use the --wipe flag
    if (!PROFILES_DIR) PROFILES_DIR = join(BASE_DIRNAME, 'profiles');

    if (ProfileCache.has(user_id)) return ProfileCache.get(user_id)!;

    const profile_path = join(PROFILES_DIR, `${user_id}.oka`);

    // check if it exists
    if (!existsSync(profile_path)) {
        // initialize default
        writeFileSync(profile_path, JSON.stringify(DEFAULT_DATA), 'utf-8');
        return DEFAULT_DATA; // just return the default cuz no profile changes yet
    }

    const data: USER_PROFILE = JSON.parse(readFileSync(profile_path, 'utf-8'));
    if (!data.trackedInventory) data.trackedInventory = [];
    if (!data.customization.games.card_deck_theme) data.customization.games.card_deck_theme = CUSTOMIZATION_UNLOCKS.DECK_DEFAULT;
    if (!data.customization.games.equipped_trackable_coin) data.customization.games.equipped_trackable_coin = 'none';
    if (!data.customization.games.equipped_trackable_deck) data.customization.games.equipped_trackable_deck = 'none';
    if (!data.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.DECK_DEFAULT)) data.customization.unlocked.push(CUSTOMIZATION_UNLOCKS.DECK_DEFAULT);
    if (!data.inventory_scraps) data.inventory_scraps = {metal: 0, plastic: 0, wood: 0, rubber: 0, electrical: 0 };
    if (!data.pet_data) data.pet_data = {pets: [], inventory: []};
    data.okash = {
        bank: Math.ceil(data.okash.bank),
        wallet: Math.ceil(data.okash.wallet)
    }
    if (!data.customization.level_bg_override) data.customization.level_bg_override = '';
    if (!data.customization.stickers) data.customization.stickers = [];
    if (!data.cookies) data.cookies = 0;
    if (!data.customization.level_banner) data.customization.level_banner = {hex_bg:'',hex_fg:'',hex_num:'',selected_title:'none'};
    if (!data.customization.level_banner.selected_title) data.customization.level_banner.selected_title = 'none';
    if (!data.ordr) data.ordr = {username:'',osu_username:''};
    if (data.consents_to_statistics) {
        data.consents_to_statistics = undefined;
        data.rules_accepted_version = 'none';
    }

    if (data.restriction.active && data.restriction.until < new Date().getTime()) data.restriction.active = false;

    ProfileCache.set(user_id, data);

    return data;
}


export function UpdateUserProfile(user_id: string, new_data: USER_PROFILE) {
    const profile_path = join(GetProfilesDir(), `${user_id}.oka`);
    writeFileSync(profile_path, JSON.stringify(new_data), 'utf-8');

    ProfileCache.set(user_id, new_data);
}


export enum OKASH_ABILITY {
    GAMBLE = 'gamble',
    SHOP = 'shop',
    TRANSFER = 'transfer'
}

export async function CheckOkashRestriction(interaction: ChatInputCommandInteraction, ability: OKASH_ABILITY): Promise<boolean> {
    const profile = GetUserProfile(interaction.user.id);

    if (profile.restriction.active) {
        const d = new Date();
        const unrestrict_time = new Date(profile.restriction.until);

        L.info(`user has a restriction that expires on ${unrestrict_time.toDateString() + ' at ' + unrestrict_time.toLocaleTimeString()}.`);
        L.info(`it is currently: ${d.toDateString() + ' at ' + d.toLocaleTimeString()}`);

        if (d.getTime() > unrestrict_time.getTime()) {
            profile.restriction.active = false;
            UpdateUserProfile(interaction.user.id, profile)
            return false;
        }

        // they are restricted in some way
        const abilities = profile.restriction.abilities.includes(',')?profile.restriction.abilities.split(','):profile.restriction.abilities;

        if (abilities.indexOf(ability) != -1) {
            interaction.reply({
                content: `:x: Your account is restricted from using certain okash features.\nThis restriction affects: \`${profile.restriction.abilities}\`\nThis restriction will be lifted on **${unrestrict_time.toDateString() + ' at ' + unrestrict_time.toLocaleTimeString()} CT** (<t:${Math.floor(unrestrict_time.getTime()/1000)}:R>)\n-# Please contact a bot administrator if you believe you have been wrongly punished.`
            });
        }

        return true;
    }

    return false;
}


export function CheckUserIdOkashRestriction(user_id: string, ability: string): boolean {
    const profile = GetUserProfile(user_id);

    if (profile.restriction.active) {
        const d = new Date();
        const unrestrict_time = new Date(profile.restriction.until);

        L.info(`user has a restriction that expires on ${unrestrict_time.toDateString() + ' at ' + unrestrict_time.toLocaleTimeString()}.`);
        L.info(`it is currently: ${d.toDateString() + ' at ' + d.toLocaleTimeString()}`);

        if (d.getTime() > profile.restriction.until) return false;

        // they are restricted in some way
        // abilities aren't relevant anymore
        // const abilities = profile.restriction.abilities.includes(',')?profile.restriction.abilities.split(','):profile.restriction.abilities;

        return true;
    }

    return false;
}


export async function GetAllLevels(): Promise<Array<{user_id: string, level: {level: number, current_xp: number}}>> {
    const all: Array<{user_id: string, level: {level: number, current_xp: number}}> = [];

    const profiles = readdirSync(GetProfilesDir());
    
    profiles.forEach(profile => {
        const user_id = profile.split('.')[0];
        const p = GetUserProfile(user_id);
        all.push({user_id, level: p.leveling || {level: 0, current_xp: 0}});
    });

    return all;
}


export function RestrictUser(client: Client, user_id: string, until: string, reason: string) {
    const d = new Date(until);

    // update their account
    const profile = GetUserProfile(user_id);
    profile.restriction = {
        active: true,
        until: d.getTime(),
        reason,
        abilities: 'all'
    };
    
    UpdateUserProfile(user_id, profile);
    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('Important Account Update')
        .setDescription('Your account has been restricted. You are unable to use okabot and its features until the restriction is lifted. Until then, you will not be able to use any okabot features, including but not limited to: interactions, gemini, chat rewards.')
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

export function DANGER_DeleteProfile(user_id: Snowflake) {
    L.info(`Deleting profile for ${user_id}`);
    RestrictUser(client, user_id, '2099-12-31', 'Account deletion in progress...')
    ProfileCache.delete(user_id);
    rmSync(join(GetProfilesDir(), `${user_id}.oka`));
    KNOWN_AGREED_USER_IDS.splice(KNOWN_AGREED_USER_IDS.indexOf(user_id), 1);
}
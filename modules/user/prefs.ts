import {existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from "fs"
import {CUSTOMIZATION_UNLOCKS, ITEMS} from "../okash/items"
import {join} from "path"
import {BASE_DIRNAME} from "../../index"
import {ChatInputCommandInteraction, Client, EmbedBuilder, Snowflake} from "discord.js"
import {Logger} from "okayulogger"
import {Achievements} from "../passive/achievement"
import {Wallet} from "../okash/wallet";

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
    achievements: Array<Achievements>
}

export interface USER_PROFILE {
    version: number,
    accepted_rules: boolean,
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
        }
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
    achievements: Array<Achievements>,
    trackedInventory: Array<string>
}

const DEFAULT_DATA: USER_PROFILE = {
    version: 3,
    accepted_rules: false,
    flags: [],
    customization: {
        unlocked: [CUSTOMIZATION_UNLOCKS.COIN_DEF, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_OKABOT, CUSTOMIZATION_UNLOCKS.DECK_DEFAULT],
        global: {
            okash_notifications: true,
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
        }
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
    achievements: [],
    trackedInventory: []
}

var PROFILES_DIR: string | null = null;

const ProfileCache = new Map<Snowflake, USER_PROFILE>();

export function SetupPrefs(base_dirname: string) {
    PROFILES_DIR = join(base_dirname, 'profiles');
    
    // runs on startup to ensure the profiles directory exists
    if (!existsSync(PROFILES_DIR)) mkdirSync(PROFILES_DIR);
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

        if (d.getTime() > profile.restriction.until) {
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
        const abilities = profile.restriction.abilities.includes(',')?profile.restriction.abilities.split(','):profile.restriction.abilities;

        return true;
    }

    return false;
}


export async function GetAllLevels(): Promise<Array<{user_id: string, level: {level: number, current_xp: number}}>> {
    const all: Array<{user_id: string, level: {level: number, current_xp: number}}> = [];

    const profiles = readdirSync(GetProfilesDir());
    
    profiles.forEach(profile => {
        let user_id = profile.split('.')[0];
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
        .setDescription('Your account has been restricted. You are unable to use some okabot and its features until the restriction is lifted. Until then, okabot will not respond to any of your commands, and you will receive an error stating "The application did not respond."')
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

// this will only be called if the --upgrade flag is used
export function UpgradeLegacyProfiles(dirname: string) {
    const ALL_PROFILES = readdirSync(join(dirname, 'profiles'));

    for (const profile of ALL_PROFILES) {
        const t_start = Date.now();
        const old_data: LEGACY_USER_PROFILE = JSON.parse(readFileSync(join(dirname, 'profiles', profile), 'utf-8'));
        const daily_data: {
            version: number,
            last_get: {
                time: number
            },
            streak: {
                count: number,
                last_count: number,
                restored: boolean,
                double_claimed: boolean
            }
        } = JSON.parse(readFileSync(join(dirname, 'money', 'daily', profile), 'utf-8'));
        const wallet_data: Wallet = JSON.parse(readFileSync(join(dirname, 'money', 'wallet', profile), 'utf-8'));

        const new_data: USER_PROFILE = {
            version: 3,
            accepted_rules: false,
            flags: old_data.flags,
            restriction: {
                active: false,
                until: 0,
                reason: '',
                abilities: ''
            },
            daily: {
                last_claimed: daily_data.last_get.time,
                restore_to: daily_data.streak.last_count,
                restored: daily_data.streak.restored,
                streak: daily_data.streak.count
            },
            okash: {
                wallet: wallet_data.wallet,
                bank: wallet_data.bank
            },
            customization: {
                games: {
                    coin_color: old_data.customization.coin_color,
                    equipped_trackable_coin: 'none',
                    card_deck_theme: CUSTOMIZATION_UNLOCKS.DECK_DEFAULT,
                    equipped_trackable_deck: 'none',
                },
                global: {
                    pronouns: {
                        subjective: (old_data.customization.pronoun || {subjective:'they'}).subjective,
                        possessive: (old_data.customization.pronoun || {possessive:'their'}).possessive,
                        objective: (old_data.customization.pronoun || {objective:'them'}).objective,
                    },
                    okash_notifications: old_data.okash_notifications
                },
                level_banner: old_data.customization.level_banner,
                unlocked: old_data.customization.unlocked
            },
            leveling: {
                level: old_data.level.level,
                current_xp: old_data.level.current_xp
            },
            achievements: old_data.achievements || [],
            inventory: wallet_data.inventory.other,
            trackedInventory: []
        }

        writeFileSync(join(dirname, 'profiles', profile), JSON.stringify(new_data), 'utf-8');

        console.log(`upgraded ${profile} in ${Date.now() - t_start}ms`);
    }
}
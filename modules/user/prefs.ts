import {existsSync, mkdirSync, readdirSync, readFileSync} from "fs"
import {CUSTOMIZATION_UNLOCKS, ITEMS} from "../okash/items"
import {join} from "path"
import {client} from "../../index"
import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Interaction,
    Snowflake
} from "discord.js"
import {Logger} from "okayulogger"
import {Achievements} from "../passive/achievement"
// console.log('achievements is', Achievements)
import {UserPet} from "../pet/pet";
import {BannerSticker} from "../levels/levels"
import {Low} from "lowdb";
import {JSONFilePreset} from "lowdb/node";
import {AUTO_TRANSLATE_LANGUAGES, t} from "../i18n/translation";

const L = new Logger('profiles');

export enum FLAG {
    WEIGHTED_COIN_EQUIPPED,
    CASINO_PASS,
    DROP_BOOST,
    TRANSLATION_NOTICE_SEEN,
    LEVELING_MODERNIZED,
    TRIGGER_SPLATOON_EASTER_EGG,
    NOT_ALLOWED_TO_UNLOCK_ACHIEVEMENTS
}

export interface ItemData {
    item_id: ITEMS,
    amount: number,
    item_specific_data?: never // reserved for items that might need extra data saved to them
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
            },
            allow_translation: boolean,
            preferred_locale: string,
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
        total_xp: number,
        legacy?: {
            level: number,
            xp: number
        }
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
    inventory: Array<ItemData>,
    inventory_scraps?: {
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
    flags: [
        FLAG.LEVELING_MODERNIZED,
    ],
    customization: {
        unlocked: [CUSTOMIZATION_UNLOCKS.COIN_DEF, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF, CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_OKABOT, CUSTOMIZATION_UNLOCKS.DECK_DEFAULT],
        global: {
            okash_notifications: false,
            pronouns: {
                subjective: 'they',
                possessive: 'their',
                objective: 'them',
            },
            allow_translation: true,
            preferred_locale: 'en-US'
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
        total_xp: 0
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
    ProfilesDB.write();
}

export function GetProfileLowDB(user_id: Snowflake): USER_PROFILE {
    return ProfilesDB.data.profiles[user_id];
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

/**
 * Check if a user ID exists in the current profile database
 * @param user_id The user ID to check
 * @param override_ban Generally, if the user is banned, this function will return false. If `override_ban` is set, then it will return true regardless of ban.
 * @returns true if exists and not banned, false otherwise
 */
export function CheckForProfile(user_id: string, override_ban: boolean = false): boolean {
    if (!ProfilesDB.data.profiles[user_id]) return false;

    const profile = GetUserProfile(user_id);
    return override_ban ? true : !(profile.restriction.active && profile.restriction.until < new Date().getTime());
}

/**
 * Get a user's profile. You should call `CheckForProfile(user_id)` before you call this.
 * @param user_id The ID of the user profile to get
 * @returns The user's profile if it exists, otherwise it returns the default profile data.
 */
export function GetUserProfile(user_id: string): USER_PROFILE {
    // check if it exists
    if (!ProfilesDB.data.profiles[user_id]) {
        ProfilesDB.data.profiles[user_id] = DEFAULT_DATA;
        ProfilesDB.write();
    }

    let profile = ProfilesDB.data.profiles[user_id];

    return profile;
}

/**
 * Replaces existing user profile data with new/updated profile data and syncs the database.
 * @param user_id The user ID to update
 * @param new_data The new profile data to replace the current data
 */
export function UpdateUserProfile(user_id: string, new_data: USER_PROFILE) {
    ProfilesDB.data.profiles[user_id] = new_data;
    ProfilesDB.write();
}

/**
 * Migrates old profile data files to the new LowDB scheme, as old profiles were
 * a unique file for each user. This will also check for missing properties and
 * add them if needed.
 */
export async function MigrateProfilesToLowDB() {
    console.log('\n\n\n');
    L.fatal('!!! THIS WILL DELETE THE CURRENT PROFILE DATABASE IF IT EXISTS !!!');
    L.fatal('Migration will start in 10 seconds. Press Ctrl+C to cancel.')

    await new Promise(resolve => setTimeout(resolve, 10_000));

    ProfilesDB.data.profiles = {};

    L.info('Migrating profiles to lowdb...');

    const profiles = readdirSync(GetProfilesDir());
    profiles.forEach(p => {
        L.info(`Migrating ${p} ...`);

        const data = JSON.parse(readFileSync(join(GetProfilesDir(), p), 'utf-8')) as USER_PROFILE;

        if (!data.trackedInventory) data.trackedInventory = [];
        if (!data.customization.games.card_deck_theme) data.customization.games.card_deck_theme = CUSTOMIZATION_UNLOCKS.DECK_DEFAULT;
        if (!data.customization.games.equipped_trackable_coin) data.customization.games.equipped_trackable_coin = 'none';
        if (!data.customization.games.equipped_trackable_deck) data.customization.games.equipped_trackable_deck = 'none';
        if (!data.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.DECK_DEFAULT)) data.customization.unlocked.push(CUSTOMIZATION_UNLOCKS.DECK_DEFAULT);
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

        // update inventory to new schema
        const new_inventory: Array<ItemData> = [];
        const counts: {[key: string]: number} = {};
        // @ts-expect-error migration requires us to cast this
        (data.inventory as Array<ITEMS>).forEach(item => {
            counts[item] = (counts[item] || 0) + 1;
        });

        Object.keys(counts).forEach(item => {
            new_inventory.push({
                item_id: parseInt(item) as ITEMS,
                amount: counts[item]
            });
        })

        data.inventory = new_inventory;

        ProfilesDB.data.profiles[p.split('.')[0]] = data;
    });

    L.info('Migration complete.')
    await ProfilesDB.write();
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


export function CheckUserIdOkashRestriction(user_id: string): boolean {
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


export async function CheckForTranslationFlag(interaction: ChatInputCommandInteraction) {
    if (!AUTO_TRANSLATE_LANGUAGES.includes(interaction.locale)) return true;
    const profile = GetUserProfile(interaction.user.id);
    if (profile.flags.includes(FLAG.TRANSLATION_NOTICE_SEEN)) return true;
    await interaction.deferReply();

    const yes_button = new ButtonBuilder().setEmoji('✅').setLabel(await t('system.translate_yes', interaction.locale)).setCustomId('yes').setStyle(ButtonStyle.Success);
    const no_button = new ButtonBuilder().setEmoji('❌').setLabel(await t('system.translate_no', 'en-US')).setCustomId('no').setStyle(ButtonStyle.Secondary);

    const reply = await interaction.editReply({
        content: await t('system.translate_notice', interaction.locale) + '\n\n' + await t('system.translate_notice', 'en-US'),
        components: [ new ActionRowBuilder().addComponents(yes_button, no_button) as never ]
    });

    const collectorFilter = (i: Interaction) => i.user.id === interaction.user.id;
    const collector = reply.createMessageComponentCollector({ filter: collectorFilter, time: 120_000 });

    collector.on('collect', async (i) => {
        const profile = GetUserProfile(interaction.user.id);

        if (i.customId == 'yes') {
            profile.customization.global.allow_translation = true;
            i.update({
                content: await t('system.translate_yes_final', interaction.locale),
                components: []
            });
        } else {
            profile.customization.global.allow_translation = false;
            i.update({
                content: await t('system.translate_no_final', 'en-US'),
                components: []
            });
        }

        profile.flags.push(FLAG.TRANSLATION_NOTICE_SEEN);
        UpdateUserProfile(interaction.user.id, profile);
    });
    collector.on('end', async (_c, reason) => {
        if (reason == 'time') await interaction.deleteReply();
    })

    return false;
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
    } catch {
        L.error(`Couldn't send restriction info to ${user_id}`);
    }
}

export function DANGER_DeleteProfile(user_id: Snowflake) {
    L.info(`Deleting profile for ${user_id}`);
    RestrictUser(client, user_id, '2099-12-31', 'Account deletion in progress...')
    delete ProfilesDB.data.profiles[user_id];
}
import {
    ChatInputCommandInteraction,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    TextChannel
} from "discord.js";
import {
    CheckOkashRestriction,
    FLAG,
    GetUserProfile,
    OKASH_ABILITY,
    RestrictUser,
    UpdateUserProfile
} from "../../user/prefs";
import {readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {AddXP} from "../../levels/onMessage";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import {Achievements, GrantAchievement} from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";
import {CUSTOMIZTAION_ID_NAMES} from "../items";
import {UpdateTrackedItem} from "../trackedItem";
import {CoinFloats} from "../../tasks/cfResetBonus";
import {DoRandomDrops} from "../../passive/onMessage";
import {CheckGambleLock} from "./_lock";
import {BASE_DIRNAME} from "../../../index";
import { RECENT_ROBS } from "./rob";
import {CheckFeatureAvailability, ServerFeature} from "../../system/serverPrefs";
import {
    CompleteDailyMission,
    CurrentMissions,
    DAILY_MISSIONS_EASY, DAILY_MISSIONS_HARD,
    DAILY_MISSIONS_INTERMEDIATE, TrackedItemCounters
} from "../../tasks/dailyMissions";

const ActiveFlips: Array<string> = [];
const UIDViolationTracker = new Map<string, number>();
const WIN_CHANCE = 0.5;
const WEIGHTED_WIN_CHANCE = 0.3;
const WEIGHTED_WIN_CHANCE_TAILS = 0.7;

const COIN_EMOJIS_FLIP: {
    [key: number]: string
} = {
    0:'cfw',
    1:'cfw_red',
    2:'cfw_dblue',
    3:'cfw_blue',
    4:'cfw_pink',
    5:'cfw_purple',
    16:'cfw_dgreen',
    17:'cfw_rainbow'
}
export const COIN_EMOJIS_DONE: {
    [key: number]: string
} = {
    0:'cff',
    1:'cff_red',
    2:'cff_dblue',
    3:'cff_blue',
    4:'cff_pink',
    5:'cff_purple',
    16:'cff_dgreen',
    17:'cff_rainbow'
}

const WinStreaks = new Map<Snowflake, number>();

// probably finish this sometime else
// current function is messy af, needs a makeover
export async function HandleCommandCoinflipV2(interaction: ChatInputCommandInteraction) {
    // interaction.deferReply();

    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.coinflip)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Maybe ask a server admin to enable it?'
    });

    if (ActiveFlips.indexOf(interaction.user.id) != -1 || CheckGambleLock(interaction.user.id)) {
        const violations = UIDViolationTracker.get(interaction.user.id)! + 1 || 1;

        console.log(`violations: ${violations}`);

        UIDViolationTracker.set(interaction.user.id, violations);
        
        if (violations == 5) {
            const d = new Date();
            const unrestrict_date = new Date(d.getTime()+600000);
            RestrictUser(interaction.client, interaction.user.id, `${unrestrict_date.toISOString()}`, 'Potential macro abuse (automatically issued by okabot)');
            UIDViolationTracker.set(interaction.user.id, 0);
            GrantAchievement(interaction.user, Achievements.COINFLIP_BAN, interaction.channel as TextChannel);
        } 
        
        return interaction.reply({
            content: `:bangbang: Woah there, **${interaction.user.displayName}**! You can only flip one coin at a time!`,
            flags: [MessageFlags.SuppressNotifications]
        });
    }
        
    // return interaction.reply({
    //     content: `:x: You can only flip one coin at a time, **${interaction.user.displayName}**!`,
    //     flags: [MessageFlags.SuppressNotifications]
    // });

    // get options and user profile
    const bet = Math.ceil(interaction.options.getNumber('amount', true));
    const side = interaction.options.getString('side') || 'heads';
    let profile = GetUserProfile(interaction.user.id);
    const weighted = profile.flags.includes(FLAG.WEIGHTED_COIN_EQUIPPED);

    // checking conditions
    if (await CheckOkashRestriction(interaction, OKASH_ABILITY.GAMBLE)) return;

    if (profile.okash.wallet < bet) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have enough okash for that!`,
    });

    // remove okash (and wc if applicable) from their profile
    profile.okash.wallet -= bet;
    if (weighted) profile.flags.splice(profile.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED), 1);
    // save it so they can't go and cheat
    UpdateUserProfile(interaction.user.id, profile);

    ActiveFlips.push(interaction.user.id);

    if (profile.customization.games.equipped_trackable_coin != 'none') {
        UpdateTrackedItem(profile.customization.games.equipped_trackable_coin, {property:'flips',amount:1}, interaction.channel as TextChannel);

        if (CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.USE_TRACKED_ITEM_10 || CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.USE_TRACKED_ITEM_30) {
            if (TrackedItemCounters.has(interaction.user.id) && TrackedItemCounters.get(interaction.user.id)!.some(t => t.uuid == profile.customization.games.equipped_trackable_coin)) {
                const current = TrackedItemCounters.get(interaction.user.id)!;
                current.find(t => t.uuid == profile.customization.games.equipped_trackable_coin)!.count++;
                TrackedItemCounters.set(interaction.user.id, current);
                console.log('new value:', current.find(t => t.uuid == profile.customization.games.equipped_trackable_coin));

                const count = current.find(t => t.uuid == profile.customization.games.equipped_trackable_coin)!.count;
                if (count >= 10 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.USE_TRACKED_ITEM_10)
                    CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);

                if (count >= 30 && CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.USE_TRACKED_ITEM_30)
                    CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
            } else {
                if (!TrackedItemCounters.has(interaction.user.id)) {
                    TrackedItemCounters.set(interaction.user.id, [{
                        count: 1,
                        type: 'coin',
                        uuid: profile.customization.games.equipped_trackable_coin
                    }]);
                } else {
                    const current = TrackedItemCounters.get(interaction.user.id)!;
                    current.push({
                        count: 1,
                        uuid: profile.customization.games.equipped_trackable_coin,
                        type: 'coin',
                    })
                    TrackedItemCounters.set(interaction.user.id, current);
                }
            }
        }
    }

    // initial reply
    const coin_flipping = weighted?GetEmoji(EMOJI.WEIGHTED_COIN_FLIPPING):GetEmoji(COIN_EMOJIS_FLIP[profile.customization.games.coin_color]);
    const coin_flipped = weighted?GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY):GetEmoji(COIN_EMOJIS_DONE[profile.customization.games.coin_color]);
    const reply = await interaction.reply({
        flags: [MessageFlags.SuppressNotifications],
        content:`${coin_flipping} **${interaction.user.displayName}** flips ${profile.customization.global.pronouns.possessive} ${weighted?'weighted coin':CUSTOMIZTAION_ID_NAMES[profile.customization.games.coin_color]} for ${GetEmoji(EMOJI.OKASH)} OKA**${bet}** on **${side}**...`
    });

    const reply_as_message = await reply.fetch();

    // immediately determine whether its a win or not
    const roll = Math.random();
    // const roll = 1;
    // const win = ((weighted?roll>=0.3:roll>=0.5)?'heads':'tails')==side;

    let win = false;

    if (weighted) win = side=='heads' ? (roll >= WEIGHTED_WIN_CHANCE) : (roll < WEIGHTED_WIN_CHANCE_TAILS);
    else win = side=='heads' ? (roll >= WIN_CHANCE) : (roll < WIN_CHANCE);

    // wait 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    // update message accordingly
    const final = win?`doubling ${profile.customization.global.pronouns.possessive} bet! ${GetEmoji(EMOJI.CAT_MONEY_EYES)} **(+15XP)**`:`losing ${profile.customization.global.pronouns.possessive} bet! :crying_cat_face: **(+5XP)**`

    // check if we need to show a new float message
    const nfm = CheckFloatRecords(roll, interaction);

    let streak = WinStreaks.get(interaction.user.id) || 0;
    if (win) streak++;
    console.log(`Coinflip winstreak is now ${streak}.`);

    const streak_bonus = Math.round((5 * Math.floor(streak)) ** (0.01 * Math.floor(streak) + 1));
    const streak_msg = streak>1 && win?'\n:fire: **Heck yea, ' + streak + ` in a row! (+${streak_bonus}XP)**`:'';

    interaction.editReply({
        content: `${coin_flipped} **${interaction.user.displayName}** flips ${profile.customization.global.pronouns.possessive} ${weighted?'weighted coin':CUSTOMIZTAION_ID_NAMES[profile.customization.games.coin_color]} for ${GetEmoji(EMOJI.OKASH)} OKA**${bet}** on **${side}**... and it lands on **${win ? side : {heads:'tails',tails:'heads'}[side]}**, ${final}${streak_msg}\n-# ${roll}${nfm}`
    });

    if (weighted && CurrentMissions.easy.selected == DAILY_MISSIONS_EASY.USE_WEIGHTED_COIN)
        CompleteDailyMission(interaction.user, 'e', interaction.channel as TextChannel);

    // reload their profile so we don't cause any desync issues and give reward
    profile = GetUserProfile(interaction.user.id);
    if (win) profile.okash.wallet += bet * 2;
    if (win && bet * 2 >= 2500 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.GAMBLE_WIN_2500)
        CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);

    UpdateUserProfile(interaction.user.id, profile);
    AddXP(interaction.user.id, interaction.channel as TextChannel, win?15:5);
    if (streak > 1) AddXP(interaction.user.id, interaction.channel as TextChannel, streak_bonus);

    if (win) AddCasinoWin(interaction.user.id, bet*2, 'coinflip'); else AddCasinoLoss(interaction.user.id, bet, 'coinflip');
    if (bet == 10000) {
        GrantAchievement(interaction.user, Achievements.MAX_WIN, interaction.channel as TextChannel);
        if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.GAMBLE_WIN_MAX)
            CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
    }

    if (win) {
        WinStreaks.set(interaction.user.id, streak);
        if (streak == 2) GrantAchievement(interaction.user, Achievements.STREAK_2, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
        if (streak == 5) GrantAchievement(interaction.user, Achievements.STREAK_5, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
        if (streak == 10) GrantAchievement(interaction.user, Achievements.STREAK_10, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
        if (streak == 25) GrantAchievement(interaction.user, Achievements.STREAK_25, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);

        // daily task
        if (streak == 3 && CurrentMissions.easy.selected == DAILY_MISSIONS_EASY.GAMBLE_STREAK_3) CompleteDailyMission(interaction.user, 'e', interaction.channel as TextChannel);
        if (streak == 5 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.GAMBLE_STREAK_5) CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);
        if (streak == 7 && CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.GAMBLE_STREAK_7) CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
    } else WinStreaks.set(interaction.user.id, 0);

    if (profile.okash.wallet + profile.okash.bank == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

    if (roll <= 0.01) {
        GrantAchievement(interaction.user, Achievements.LOW_COINFLIP, interaction.channel as TextChannel);
        if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.COINFLIP_TINY_FLOAT)
            CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
    }
    if (roll >= 0.99) {
        GrantAchievement(interaction.user, Achievements.HIGH_COINFLIP, interaction.channel as TextChannel);
        if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.COINFLIP_ABSURD_FLOAT)
            CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
    }

    if (roll <= 0.05 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.COINFLIP_SMALL_FLOAT)
        CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);
    if (roll >= 0.95 && CurrentMissions.intermediate.selected == DAILY_MISSIONS_INTERMEDIATE.COINFLIP_BIG_FLOAT)
        CompleteDailyMission(interaction.user, 'i', interaction.channel as TextChannel);

    if (!win && RECENT_ROBS.has(interaction.user.id)) {
        if (RECENT_ROBS.get(interaction.user.id)?.amount == bet && (RECENT_ROBS.get(interaction.user.id)?.when || 0) + 300 > (new Date()).getTime()/1000) 
            GrantAchievement(interaction.user, Achievements.USELESS_ROB, interaction.channel as TextChannel);
    }

    DoRandomDrops(reply_as_message, interaction.user);

    ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);
}

function CheckFloatRecords(float: number, interaction: ChatInputCommandInteraction) {
    const stats_file = join(BASE_DIRNAME, 'stats.oka');

    let message = '';
    const stats: CoinFloats = JSON.parse(readFileSync(stats_file, 'utf-8'));

    stats.coinflip.all_rolls.push(float);

    // daily
    if (float > stats.coinflip.daily!.high.value) {
        stats.coinflip.daily!.high = {value:float,user_id:interaction.user.id};
        message += `\n**New Daily Highest:** \`${float}\` is the highest float someone has rolled today!`
        GrantAchievement(interaction.user, Achievements.NEW_CF_DAILY, interaction.channel as TextChannel);

        if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.DAILY_FLOAT_MINMAX)
            CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
    }
    if (float < stats.coinflip.daily!.low.value) {
        stats.coinflip.daily!.low = {value:float,user_id:interaction.user.id};
        message += `\n**New Daily Lowest:** \`${float}\` is the lowest float someone has rolled today!`
        GrantAchievement(interaction.user, Achievements.NEW_CF_DAILY, interaction.channel as TextChannel);

        if (CurrentMissions.hard.selected == DAILY_MISSIONS_HARD.DAILY_FLOAT_MINMAX)
            CompleteDailyMission(interaction.user, 'h', interaction.channel as TextChannel);
    }

    // all-time
    if (float > stats.coinflip.high.value) {
        stats.coinflip.high = {value:float,user_id:interaction.user.id};
        message += `\n**New All-Time Highest:** \`${float}\` is the highest float someone has rolled on okabot!`
        // GrantAchievement(interaction.user, Achievements.NEW_CF_ALLTIME, interaction.channel as TextChannel);
    }
    if (float < stats.coinflip.low.value) {
        stats.coinflip.low = {value:float,user_id:interaction.user.id};
        message += `\n**New All-Time Lowest:** \`${float}\` is the lowest float someone has rolled on okabot!`
        // GrantAchievement(interaction.user, Achievements.NEW_CF_ALLTIME, interaction.channel as TextChannel);
    }

    writeFileSync(stats_file, JSON.stringify(stats), 'utf-8');

    return message;
}


export const CoinflipSlashCommand = 
    new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin with a chance to double your okash')
        .addNumberOption(option => 
            option
                .setName('amount')
                .setDescription('The amount of okash you want to bet')
                .setRequired(true).setMinValue(1).setMaxValue(10_000)
        )
        .addStringOption(option => 
            option
                .setName('side')
                .setDescription('Optionally, pick heads or tails')
                .addChoices(
                {name:'heads', value:'heads', name_localizations:{ja:'表'}},
                {name:'tails', value:'tails', name_localizations:{ja:'裏'}}
        ).setRequired(false))
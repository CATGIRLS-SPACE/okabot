import {
    ActivityType,
    ChatInputCommandInteraction,
    Locale,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    TextChannel, User
} from "discord.js";
import {AddToWallet, GetBank, GetWallet, RemoveFromWallet} from "../wallet";
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
import {format} from "util";
import {EventType, RecordMonitorEvent} from "../../../util/monitortool";
import {Achievements, GrantAchievement} from "../../passive/achievement";
import {AddCasinoLoss, AddCasinoWin} from "../casinodb";
import {CUSTOMIZTAION_ID_NAMES} from "../items";
import {UpdateTrackedItem} from "../trackedItem";
import {CoinFloats} from "../../tasks/cfResetBonus";
import {DoRandomDrops} from "../../passive/onMessage";
import {CheckGambleLock} from "./_lock";
import {BASE_DIRNAME} from "../../../index";

const ActiveFlips: Array<string> = [];
const UIDViolationTracker = new Map<string, number>();
const WIN_CHANCE = 0.5;
const WEIGHTED_WIN_CHANCE = 0.3;

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

const STRINGS: {[key: string]: {en:string,ja:string}} = {
    flipping: {
        en: '**%s** flips a coin for %s on **%s**...',
        ja: '**%s**さん%sをコイントスします、**%s**を求めります…'
    },
    flipped_win: {
        en: '**%s** flips a coin for %s on **%s**... and it lands on **%s**, doubling the bet!',
        ja: '**%s**さん%sをコイントスします、**%s**を求めります…とは**%s**を止めります、ベット倍増します！'
    },
    flipped_loss: {
        en: '**%s** flips a coin for %s on **%s**... and it lands on **%s**, losing the money!',
        ja: '**%s**さん%sをコイントスします、**%s**を求めります…とは**%s**を止めります、ベットなくした！'
    },
    heads: {
        en: 'heads',
        ja: '表'
    },
    tails: {
        en: 'tails',
        ja: '裏'
    }
}

export async function HandleCommandCoinflip(interaction: ChatInputCommandInteraction) {
    const has_restriction = await CheckOkashRestriction(interaction, OKASH_ABILITY.GAMBLE);
    if (has_restriction) return;

    const stats_file = join(BASE_DIRNAME, 'stats.oka');

    if (ActiveFlips.indexOf(interaction.user.id) != -1) {
        let violations = UIDViolationTracker.get(interaction.user.id)! + 1 || 1;

        console.log(`violations: ${violations}`);

        UIDViolationTracker.set(interaction.user.id, violations);
        
        if (violations == 5) {
            const d = new Date();
            const unrestrict_date = new Date(d.getTime()+600000);
            RestrictUser(interaction.client, interaction.user.id, `${unrestrict_date.toISOString()}`, 'Potential macro abuse (automatically issued by okabot)');
            UIDViolationTracker.set(interaction.user.id, 0);
        } 
        
        return interaction.reply({
            content: `:bangbang: Woah there, **${interaction.user.displayName}**! You can only flip one coin at a time!`,
            flags: [MessageFlags.SuppressNotifications]
        });
    }

    const locale = interaction.locale == Locale.Japanese?'ja':'en';

    const wallet = GetWallet(interaction.user.id);
    const bet = interaction.options.getNumber('amount')!;
    const side = interaction.options.getString('side');

    // terrible way of checking whether its a float or not lol
    if (bet.toString().includes('.')) return interaction.reply({
        content:`:x: **${interaction.user.displayName}**, I don't have change!`
    });

    // checks
    if (bet <= 0) return interaction.reply({content:`:x: **${interaction.user.displayName}**, you cannot flip that amount.`,
        flags: [MessageFlags.SuppressNotifications]});
    if (wallet < bet) return interaction.reply({content:`:crying_cat_face: **${interaction.user.displayName}**, you cannot flip more than you have in your wallet.`,
        flags: [MessageFlags.SuppressNotifications]});

    // don't let the user do multiple coinflips and take the money immediately
    ActiveFlips.push(interaction.user.id);
    RemoveFromWallet(interaction.user.id, bet);

    RecordMonitorEvent(EventType.GAMBLE, {user_id: interaction.user.id});
    RecordMonitorEvent(EventType.COINFLIP_START, {user_id: interaction.user.id, bet}, `${interaction.user.username} started a coinflip`);

    // check if user has weighted coin
    const prefs = GetUserProfile(interaction.user.id);
    const weighted_coin_equipped = (prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED) != -1);
    const emoji_waiting = weighted_coin_equipped?GetEmoji('cfw_green'):GetEmoji(COIN_EMOJIS_FLIP[prefs.customization.games.coin_color]);
    const emoji_finish = weighted_coin_equipped?GetEmoji('cff_green'):GetEmoji(COIN_EMOJIS_DONE[prefs.customization.games.coin_color]);
    
    // set probabilities and decide outcome
    const rolled = Math.random();
    // const rolled = 0.5;
    let win: boolean = false; 

    let picked_side: 'heads' | 'tails' = 'heads';
    if (side == 'heads' || !side) {
        win = rolled >= (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
        picked_side = win?'heads':'tails';
    }
    else if (side == 'tails') {
        win = rolled < (weighted_coin_equipped?WEIGHTED_WIN_CHANCE:WIN_CHANCE);
        picked_side = win?'tails':'heads';
    }
        
    let first_message = format(STRINGS['flipping'][locale], 
        interaction.user.displayName, 
        `${GetEmoji(EMOJI.OKASH)} OKA**${bet}**`, 
        STRINGS[side || 'heads'][locale]);

    let next_message = format(STRINGS[win?'flipped_win':'flipped_loss'][locale] + ` ${win?GetEmoji(EMOJI.CAT_MONEY_EYES)+' **(+15XP)**':' :crying_cat_face: **(+5XP)**'}\n-# ${rolled}`, 
        interaction.user.displayName, 
        `${GetEmoji(EMOJI.OKASH)} OKA**${bet}**`, 
        STRINGS[side || 'heads'][locale],
        STRINGS[picked_side][locale])


    await interaction.reply({
        content: `${emoji_waiting} ${first_message}`,
        flags: [MessageFlags.SuppressNotifications]
    });

    if (rolled >= 0.5 && rolled < 0.50001) {
        setTimeout(() => {
            // win regardless, it landed on the side!!!
            next_message = `${first_message} and it... lands on the side:interrobang: ${prefs.customization.global.pronouns.subjective} now get 5x ${prefs.customization.global.pronouns.possessive} bet, earning ${GetEmoji('okash')} OKA**${bet*5}**! **(+50XP)**\n-# Roll was ${rolled} | If a weighted coin was equipped, it has not been used.`;
            
            AddXP(interaction.user.id, interaction.channel as TextChannel, 50);

            ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);
            AddToWallet(interaction.user.id, bet*5);
            
            interaction.editReply({
                content: `${emoji_finish} ${next_message}`
            });

            AddCasinoWin(interaction.user.id, bet*5, 'coinflip');
        }, 3000);

        RecordMonitorEvent(EventType.COINFLIP_END, {user_id: interaction.user.id, bet}, `${interaction.user.username} ended a coinflip`);

        return;
    }

    // get rid of weighted coin after one use
    if (weighted_coin_equipped) {
        prefs.flags.splice(prefs.flags.indexOf(FLAG.WEIGHTED_COIN_EQUIPPED), 1);
        UpdateUserProfile(interaction.user.id, prefs);
        GrantAchievement(interaction.user, Achievements.WEIGHTED_COINFLIP, interaction.channel as TextChannel);
    }

    setTimeout(() => {
        const stats: CoinFloats = JSON.parse(readFileSync(stats_file, 'utf-8'));

        // ensure we dont blow up the bot somehow
        if (!stats.coinflip.daily) stats.coinflip.daily = {
            next: 0,
            high: {user_id: 'okabot',value: 0},
            low: {user_id: 'okabot',value: 1}
        }

        let new_float = '';
        const REWARD = 1000;

        if (stats.coinflip.high.value < rolled) { 
            new_float += `\n**NEW HIGHEST ROLL:** \`${rolled}\` is the highest float someone has rolled on okabot! ${GetEmoji('okash')} You have earned OKA**${Math.floor(rolled * REWARD)}**!`;
            stats.coinflip.high.value = rolled;
            stats.coinflip.high.user_id = interaction.user.id;
            AddToWallet(interaction.user.id, Math.abs(Math.floor(rolled * REWARD)));
            GrantAchievement(interaction.user, Achievements.NEW_CF_ALLTIME, interaction.channel as TextChannel);
        }
        if (stats.coinflip.low.value > rolled) {
            new_float += `\n**NEW LOWEST ROLL:** \`${rolled}\` is the lowest float someone has rolled on okabot! ${GetEmoji('okash')} You have earned OKA**${Math.abs(Math.floor(REWARD - (rolled*REWARD)))}**!`;
            stats.coinflip.low.value = rolled;
            stats.coinflip.low.user_id = interaction.user.id;
            AddToWallet(interaction.user.id, Math.abs(Math.floor(REWARD - (rolled*REWARD))));
            GrantAchievement(interaction.user, Achievements.NEW_CF_ALLTIME, interaction.channel as TextChannel);
        }
        
        // daily rolls
        if (stats.coinflip.daily.high.value < rolled) {
            new_float += `\n**NEW DAILY HIGHEST ROLL:** \`${rolled}\` is the highest float someone has rolled today!`;
            stats.coinflip.daily.high.value = rolled;
            stats.coinflip.daily.high.user_id = interaction.user.id;
            GrantAchievement(interaction.user, Achievements.NEW_CF_DAILY, interaction.channel as TextChannel);
        }
        if (stats.coinflip.daily.low.value > rolled) {
            new_float += `\n**NEW DAILY LOWEST ROLL:** \`${rolled}\` is the lowest float someone has rolled today!`;
            stats.coinflip.daily.low.value = rolled;
            stats.coinflip.daily.low.user_id = interaction.user.id;
            GrantAchievement(interaction.user, Achievements.NEW_CF_DAILY, interaction.channel as TextChannel);
        }

        // save coinflip for averaging
        if (!stats.coinflip.all_rolls) stats.coinflip.all_rolls = [];
        stats.coinflip.all_rolls.push(rolled);

        interaction.editReply({
            content: `${emoji_finish} ${next_message}${new_float}`
        });

        if (rolled <= 0.01) GrantAchievement(interaction.user, Achievements.LOW_COINFLIP, interaction.channel as TextChannel);
        if (rolled >= 0.99) GrantAchievement(interaction.user, Achievements.HIGH_COINFLIP, interaction.channel as TextChannel);

        writeFileSync(stats_file, JSON.stringify(stats), 'utf-8');

        ActiveFlips.splice(ActiveFlips.indexOf(interaction.user.id), 1);

        RecordMonitorEvent(EventType.COINFLIP_END, {user_id: interaction.user.id, bet}, `${interaction.user.username} ended a coinflip`);

        AddXP(interaction.user.id, interaction.channel as TextChannel, win?15:5);

        if (wallet == 0 && GetBank(interaction.user.id) == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

        if (win) {
            AddToWallet(interaction.user.id, bet*2);
            AddCasinoWin(interaction.user.id, bet*2, 'coinflip');
            if (bet == 10000) GrantAchievement(interaction.user, Achievements.MAX_WIN, interaction.channel as TextChannel);
        } else AddCasinoLoss(interaction.user.id, bet, 'coinflip');
    }, 3000);
}

const WinStreaks = new Map<Snowflake, number>();

// probably finish this sometime else
// current function is messy af, needs a makeover
export async function HandleCommandCoinflipV2(interaction: ChatInputCommandInteraction) {
    // interaction.deferReply();

    if (ActiveFlips.indexOf(interaction.user.id) != -1 || CheckGambleLock(interaction.user.id)) {
        let violations = UIDViolationTracker.get(interaction.user.id)! + 1 || 1;

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
        UpdateTrackedItem(profile.customization.games.equipped_trackable_coin, {property:'flips',amount:1});
    }

    // initial reply
    const coin_flipping = weighted?GetEmoji(EMOJI.WEIGHTED_COIN_FLIPPING):GetEmoji(COIN_EMOJIS_FLIP[profile.customization.games.coin_color]);
    const coin_flipped = weighted?GetEmoji(EMOJI.WEIGHTED_COIN_STATIONARY):GetEmoji(COIN_EMOJIS_DONE[profile.customization.games.coin_color]);
    const reply = await interaction.reply({
        flags: [MessageFlags.SuppressNotifications],
        // @ts-ignore
        content:`${coin_flipping} **${interaction.user.displayName}** flips ${profile.customization.global.pronouns.possessive} ${weighted?'weighted coin':CUSTOMIZTAION_ID_NAMES[profile.customization.games.coin_color]} for ${GetEmoji(EMOJI.OKASH)} OKA**${bet}** on **${side}**...`
    });

    const reply_as_message = await reply.fetch();

    // immediately determine whether its a win or not
    const roll = Math.random();
    const win = ((weighted?roll>=0.3:roll>=0.5)?'heads':'tails')==side;

    // wait 3 seconds
    await new Promise((resolve) => setTimeout(resolve, 3_000));

    // update message accordingly
    const final = win?`doubling ${profile.customization.global.pronouns.possessive} bet! ${GetEmoji(EMOJI.CAT_MONEY_EYES)} **(+15XP)**`:`losing ${profile.customization.global.pronouns.possessive} bet! :crying_cat_face: **(+5XP)**`

    // check if we need to show a new float message
    const nfm = CheckFloatRecords(roll, interaction);

    const streak = WinStreaks.get(interaction.user.id) || 0;

    interaction.editReply({
        content: `${coin_flipped} **${interaction.user.displayName}** flips ${profile.customization.global.pronouns.possessive} ${weighted?'weighted coin':CUSTOMIZTAION_ID_NAMES[profile.customization.games.coin_color]} for ${GetEmoji(EMOJI.OKASH)} OKA**${bet}** on **${side}**... and it lands on **${roll>=0.5?'heads':'tails'}**, ${final}${streak>1?'\n:fire: **Heck yea, ' + streak + ' in a row!**':''}\n-# ${roll}${nfm}`
    });

    // reload their profile so we don't cause any desync issues and give reward
    profile = GetUserProfile(interaction.user.id);
    if (win) profile.okash.wallet += bet * 2;
    UpdateUserProfile(interaction.user.id, profile);
    AddXP(interaction.user.id, interaction.channel as TextChannel, win?15:5);

    if (win) AddCasinoWin(interaction.user.id, bet*2, 'coinflip'); else AddCasinoLoss(interaction.user.id, bet, 'coinflip');

    if (win) {
        WinStreaks.set(interaction.user.id, streak + 1);
        if (streak+1 == 2) GrantAchievement(interaction.user, Achievements.STREAK_2, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
        if (streak+1 == 5) GrantAchievement(interaction.user, Achievements.STREAK_5, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
        if (streak+1 == 10) GrantAchievement(interaction.user, Achievements.STREAK_10, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
        if (streak+1 == 25) GrantAchievement(interaction.user, Achievements.STREAK_25, interaction.client.channels.cache.get(interaction.channelId) as TextChannel);
    } else WinStreaks.set(interaction.user.id, 0);

    if (profile.okash.wallet + profile.okash.bank == 0) GrantAchievement(interaction.user, Achievements.NO_MONEY, interaction.channel as TextChannel);

    if (roll <= 0.01) GrantAchievement(interaction.user, Achievements.LOW_COINFLIP, interaction.channel as TextChannel);
    if (roll >= 0.99) GrantAchievement(interaction.user, Achievements.HIGH_COINFLIP, interaction.channel as TextChannel);

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
        message += `\n**New Weekly Highest:** \`${float}\` is the highest float someone has rolled this week!`
        GrantAchievement(interaction.user, Achievements.NEW_CF_DAILY, interaction.channel as TextChannel);
    }
    if (float < stats.coinflip.daily!.low.value) {
        stats.coinflip.daily!.low = {value:float,user_id:interaction.user.id};
        message += `\n**New Weekly Lowest:** \`${float}\` is the lowest float someone has rolled this week!`
        GrantAchievement(interaction.user, Achievements.NEW_CF_DAILY, interaction.channel as TextChannel);
    }

    // all-time
    if (float > stats.coinflip.high.value) {
        stats.coinflip.high = {value:float,user_id:interaction.user.id};
        message += `\n**New All-Time Highest:** \`${float}\` is the highest float someone has rolled on okabot!`
        GrantAchievement(interaction.user, Achievements.NEW_CF_ALLTIME, interaction.channel as TextChannel);
    }
    if (float < stats.coinflip.low.value) {
        stats.coinflip.low = {value:float,user_id:interaction.user.id};
        message += `\n**New All-Time Lowest:** \`${float}\` is the lowest float someone has rolled on okabot!`
        GrantAchievement(interaction.user, Achievements.NEW_CF_ALLTIME, interaction.channel as TextChannel);
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
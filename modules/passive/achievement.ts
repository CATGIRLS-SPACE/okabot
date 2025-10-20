import { ApplicationIntegrationType, AttachmentBuilder, ChatInputCommandInteraction, SlashCommandBuilder, Snowflake, TextChannel, User } from "discord.js"
import { GetUserProfile, UpdateUserProfile } from "../user/prefs"
import { EMOJI, GetEmoji } from "../../util/emoji";
import { CanvasRenderingContext2D, createCanvas, loadImage } from "canvas";
import { BASE_DIRNAME, client } from "../../index";
import { fetchImage } from "../levels/levels";
import { CUSTOMIZATION_UNLOCKS } from "../okash/items";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";


interface Achievement {
    name: string,
    description: string,
    class: 'okabot' | 'gamble' | 'fun' | 'fun2' | 'okash' | 'noshow' | 'jlpt', // jlpt is not required to get complete badge
    diff: 'e' | 't' | 'h' | 'ex' | 'na' // easy, tricky, hard, extra hard, not applicable (eg. levels)
}

export enum Achievements {
    NONE = 'none', // used for defaults only
    LOW_COINFLIP = 'lowcf', //
    HIGH_COINFLIP = 'highcf', //
    WEIGHTED_COINFLIP = 'usewc', //
    BLACKJACK = 'get21', //
    NEW_CF_ALLTIME = 'newcf_alltime', //
    NEW_CF_DAILY = 'newcf_daily', //
    ROULETTE_ONE = 'land36', //
    ROULETTE_MULTI = 'landmulti', //
    CAPITALISM = 'capitalism', // in okash command
    NO_MONEY = 'gamble_gobroke', // in: coinflip, blackjack, roulette
    MAX_WIN = 'maxbetwin', // in: coinflip, blackjack, roulette
    DAILY = 'getdaily', //
    DAILY_7 = 'dailyweek', //
    DAILY_30 = 'dailymonth', //
    DAILY_61 = 'daily2month', //
    DAILY_100 = 'daily100', //
    DAILY_365 = 'dailyyear', //
    DAILY_SR = 'restorestreak', //
    ROB_HIGH = 'robmin25000', //
    ROB_FINED = 'robfined', //
    THANK_OKABOT = 'thankokabot', //
    OKABOT_CRY = 'okabotcry', //
    PAY_USER = 'begenerous', //
    OKASH_DROP = 'okashdrop', //
    LOOTBOX_DROP = 'lootboxdrop', //
    SHORTHAND_NO = 'notadmin', //
    VOICE_XP = 'voicemin300xp', //
    ANGER_OKABOT = 'remindmetwice', //
    FAST_CLAIM_REMINDER = 'quickclaim', //
    SLOTS_GEMS = 'slots10x', //
    ROB_BANK_HIGH = 'bankrob50000', //
    ROB_BANK_PUNY = 'bankrob5percent', //
    CASINO_PASS = 'casinopass', //
    DROP_BOOST = 'dropboost', //
    SELLDROPITEM = 'selldrop', //
    ACHIEVEMENT = 'achievement', //
    COINFLIP_BAN = 'autobanned', //
    STREAK_2 = 'streak2',
    STREAK_5 = 'streak5',
    STREAK_10 = 'streak10',
    STREAK_25 = 'streak25',
    DANGO = 'dango',
    STORY = 'story',
    STEAL_THEN_DEPOSIT = 'bankdep',
    BLUE = 'blue',
    ROBBED_CHAIN = 'robchain',
    STICKER = 'sticker',
    TWO_ACES = 'pocketaces',
    LEVELBAR = 'levelbar',
    USELESS_ROB = 'uselessrobbery',
    SHARED_21 = 'dealt21both',
    TWO_BY_FOUR = '2x4',
    TRACKED = 'stats',
    GIVE_COOKIE = 'givecookie',
    COOKIES_250 = '250cookies',
    PIXELGAME_5 = 'pixelstreak5',
    PIXELGAME_10 = 'pixelstreak10',
    PIXELGAME_25 = 'pixelstreak25',
}

export const ACHIEVEMENTS: {
    [key: string]: Achievement
} = {
    'lowcf': {name:'That\'s Low...',description:'Get a stupidly low coinflip float', class:'gamble', diff:'t'},
    'highcf': {name:'No Doubt',description:'Get a stupidly high coinflip float', class:'gamble', diff:'t'},
    'usewc': {name:'Backup Plan',description:'Equip a weighted coin', class:'gamble', diff:'e'},
    'get21': {name:'Blackjack!',description:'Win a game of blackjack by getting 21', class:'gamble', diff:'t'},
    'newcf_daily': {name:'Making History... temporarily',description:'Get a new highest/lowest coinflip of the day', class:'gamble', diff:'h'},
    'land36': {name:'I Just Knew',description:'Bet on a single number in roulette and win', class:'gamble', diff:'ex'},
    'landmulti': {name:'Lottery',description:'Bet on 2-7 numbers in roulette and win', class:'gamble', diff:'h'},
    'capitalism': {name:'Capitalism at its Finest',description:'Have 1,000,000 okash in your bank', class:'okash', diff:'ex'},
    'gamble_gobroke': {name:'Gamble Irresponsibly',description:'Go broke via a gambling game', class:'okash', diff:'t'},
    'maxbetwin': {name:'High Risk, High Reward',description:'Win a gambling game that you bet the max allowed amount of okash on', class:'gamble', diff:'t'},
    'getdaily': {name:'The Beginning',description:'Get your daily reward for the first time', class:'okabot', diff:'e'},
    'dailyweek': {name:'New Habit',description:'Get your daily reward for a week straight', class:'okabot', diff:'e'},
    'restorestreak': {name:'Deciduous Arborist',description:'Restore your daily streak with a streak restore', class:'okabot', diff:'e'},
    'robmin25000': {name:'Wallet Weight Loss',description:'Rob someone of at least 25000 okash', class:'fun', diff:'t'},
    'robfined': {name:'Uhhh... Oops?',description:'Get caught robbing someone and get fined', class:'fun', diff:'e'},
    'thankokabot': {name:'Nice List',description:'Thank okabot', class:'fun', diff:'e'},
    'okabotcry': {name:'Naughty List',description:'Make okabot cry', class:'fun', diff:'e'},
    'begenerous': {name:'Generosity',description:'Pay a user some okash', class:'okash', diff:'e'},
    'okashdrop': {name:'What\'s This?',description:'Get lucky and find some okash', class:'fun', diff:'t'},
    'lootboxdrop': {name:'Ow, My Foot!',description:'Get lucky and trip over a lootbox', class:'fun', diff:'t'},
    'notadmin': {name:'Get Outta Here!',description:'Try and use a management shorthand without permission',class:'fun', diff:'e'},
    // 'voicemin300xp': {name:'Talkative',description:'Earn at least 300 XP from VC XP rewards',class:'fun', diff:'t'},
    'remindmetwice': {name:'I Get It!',description:'Annoy okabot by asking him to remind you of your daily reward twice',class:'fun', diff:'e'},
    'quickclaim': {name:'Quick Draw',description:'Claim your daily reward within one minute of okabot reminding you.',class:'okabot', diff:'h'},
    'slots10x': {name:'Shiny!',description:'Win 10x your bet by getting all :gem: gems.',class:'gamble', diff:'ex'},
    'bankrob50000': {name:'I Hate Debt Collectors',description:'Rob at least 10000 okash from the bank',class:'fun', diff:'h'},
    'bankrob5percent': {name:'7-Eleven Big Gulp',description:'Rob the bank and get only 5% or less of the collected fines',class:'fun', diff:'h'},
    'casinopass': {name:'No Time To Waste',description:'Use a Casino Pass to bypass the blackjack cooldown',class:'fun', diff:'e'},
    'dropboost': {name:'Drop Please',description:'Use a Drop Chance Booster to increase your chances at gaining a lootbox',class:'fun', diff:'e'},
    'selldrop': {name:'Ungrateful',description:'Get an item from a lootbox and immediately sell it',class:'fun', diff:'h'},
    // 'achievement': {name:'Achievement',description:'It\'s an achievement',class:'fun', diff:'ex'},
    'streak2': {name:'Twice or it\'s Luck',description:'Win a (supported) gambling game twice in a row',class:'gamble',diff:'e'},
    'streak5': {name:'On a Roll',description:'Win a (supported) gambling game five times in a row',class:'gamble',diff:'t'},
    'streak10': {name:'Suspiciously Lucky',description:'Win a (supported) gambling game ten times in a row... then go to jail',class:'gamble',diff:'ex'},
    // 'streak25': {name:'Undoubtedly Cheating',description:'Win a (supported) gambling game 25 times in a row... then go to jail, and <@796201956255334452> needs to spend some money...',class:'gamble',diff:'ex'},
    'dango':{name:'Yum!',description:'Give okabot a yummy treat!',class:'fun',diff:'e'},
    'bankdep':{name:'A Visit From the IRS',description:'Rob the bank, then immediately deposit the earnings into your bank.',class:'fun',diff:'e'},
    // 'blue':{name:'Not Quite Gacha',description:'Open a lootbox while playing Blue Archive.',class:'fun',diff:'t'},
    'robchain':{name:'Convoluted Indirect Deposit',description:'Rob the bank and immediately get robbed by someone else.',class:'fun',diff:'e'},
    'sticker':{name:'Adhesive',description:'Put a sticker on your level banner.',class:'fun',diff:'t'},
    'pocketaces':{name:'Wait, this isn\'t Poker!',description:'Get dealt two aces in Blackjack.',class:'gamble',diff:'h'},
    'dealt21both':{name:'Competitive Teamwork',description:'Get dealt Blackjack cards with a combined total value of 21.',class:'gamble',diff:'ex'},
    'levelbar':{name:'Useless Exchange',description:'Buy "Reset Level Bar" when your bar is already set to the default color.',class:'fun2',diff:'e'},
    'uselessrobbery':{name:'Dealer\'s Intervention',description:'Rob someone/the bank, flip a coin worth the amount you just robbed, and lose.',class:'fun2',diff:'e'},
    '2x4':{name:'The House is Structurally Sound Now',description:'In Blackjack, double down and get dealt a 4.',class:'gamble',diff:'h'},
    'stats':{name:'Statistics Major',description:'Create a tracked item and get 100 of its respective statistic.',class:'gamble',diff:'t'},
    // 'givecookie':{name:'Baker',description:'Give a cookie to someone!',class:'fun2',diff:'e'},
    // '250cookies':{name:'Sweet Tooth',description:'Have a total of 250 cookies given to you',class:'fun2',diff:'t'},
    'pixelstreak5':{name:'Sensei',description:'Guess the correct student 5 times in a row.',class:'fun2',diff:'t'},
    'pixelstreak10':{name:'Addict Sensei',description:'Guess the correct student 10 times in a row.',class:'fun2',diff:'h'},
    'pixelstreak25':{name:'True Sensei',description:'Guess the correct student 25 times in a row.',class:'fun2',diff:'ex'},
}

export const TITLES: {
    [key: string]: string,
} = {
    'none':'new okabot user',
    'lowcf':'unlucky but still lucky',
    'highcf':'undoubtedly lucky',
    'usewc':'casino cheater',
    'get21':'perfectionist',
    'newcf_daily':'first come first served',
    'land36':'fortune teller',
    'landmulti':'lucky guesser',
    'capitalism':'filthy capitalist',
    'gamble_gobroke':'irresponsible gambler',
    'maxbetwin':'risk taker',
    'getdaily':'okabot beginner',
    'dailyweek':'committed',
    'restorestreak':'a little forgetful',
    'robmin25000':'kleptomaniac',
    'robfined':'convicted criminal',
    'thankokabot':'loved by okabot',
    'okabotcry':'hated by okabot',
    'begenerous':'generous',
    'okashdrop':'finders keepers',
    'lootboxdrop':'clumsy',
    'notadmin':'fake moderator',
    'voicemin300xp':'talkative',
    'remindmetwice':'annoying',
    'quickclaim':'never late',
    'slots10x':'lucky jeweler',
    'bankrob50000':'okash hoarder',
    'bankrob5percent':'all bark no bite',
    'casinopass':'impatient',
    'dropboost':'always attentive',
    'selldrop':'ungrateful',
    'streak2':'lucky gambler',
    'streak5':'super lucky gambler',
    'streak10':'hunted by the casino',
    'dango':'patissier',
    'bankdep':'tax evader',
    'blue':'ᓀ‸ᓂ',
    'robchain':'black market proxy',
    'sticker':'customization enjoyer',
    'pocketaces':'card counter',
    'dealt21both':'card magician',
    'levelbar':'experimenter',
    'uselessrobbery':'too cocky',
    '2x4':'construction worker',
    'stats':'statistics major',
    'givecookie':'just the sweetest',
    '250cookies':'mega sweet tooth',
    'pixelstreak5':'relationship lvl 5',
    'pixelstreak10':'relationship level 10',
    'pixelstreak25':'relationship level MAX',
}


/**
 * Check if the user has the achievement already, and if not, award it to them.
 * @param user User to give it to
 * @param achievement The achievement to give
 * @param channel The channel to send the announcement to
 */
export function GrantAchievement(user: User, achievement: Achievements | string, channel: TextChannel) {
    const profile = GetUserProfile(user.id);

    if (profile.achievements.indexOf(achievement as Achievements) != -1) {
        console.log(`user ${user.username} already has achievement ${achievement}`);
        return;
    }

    profile.achievements.push(achievement as Achievements);

    const a = ACHIEVEMENTS[achievement];
    const diff = {
        'e': GetEmoji(EMOJI.DIFF_EASY),
        't': GetEmoji(EMOJI.DIFF_TRICKY),
        'h': GetEmoji(EMOJI.DIFF_HARD),
        'ex': GetEmoji(EMOJI.DIFF_EXHARD),
        'na':''
    };

    channel.send({
        content: `<:trophy:0> Congrats, **${user.displayName}**! You've unlocked the achievement ${diff[a.diff]} **${a.name}**!\n-# ${a.description}`
    });

    UpdateUserProfile(user.id, profile);
}

export function CheckCompletionist(user_id: Snowflake) {
    const keys = Object.keys(ACHIEVEMENTS);
    let real_achievement_count = 0; // REALLY hacky way, do as i say not as i do
    for (const ach of GetUserProfile(user_id).achievements) 
        if (keys.includes(ach)) real_achievement_count++;

    return real_achievement_count == Object.keys(ACHIEVEMENTS).length;
}

export async function HandleCommandAchievements(interaction: ChatInputCommandInteraction) {
    // await interaction.deferReply();

    const profile = GetUserProfile(interaction.user.id);
    const sub = interaction.options.getString('page', true);
    const spoil = interaction.options.getBoolean('show-all', false) || false;

    // make sure that there aren't any lingering removed achievements
    const keys = Object.keys(ACHIEVEMENTS);
    let real_achievement_count = 0; // REALLY hacky way, do as i say not as i do
    for (const ach of profile.achievements) 
        if (keys.includes(ach)) real_achievement_count++;

    if (sub == 'bar') {
        await interaction.deferReply();

        await GenerateAchievementsBanner(interaction.user.id, real_achievement_count);

        return await interaction.editReply({
            files:[new AttachmentBuilder(readFileSync(join(BASE_DIRNAME, 'temp', 'achievement-banner.png')))]
        });

        // const bar = CreateProgressBar(real_achievement_count);
        
        // if (real_achievement_count == 0) return interaction.reply({
        //     content:`**${interaction.user.displayName}**, you haven't unlocked any achievements yet!`,
        //     flags: []
        // });

        // const extra = (real_achievement_count == Object.keys(ACHIEVEMENTS).length)?'**You have unlocked all achievements! Congratulations!**\n\n':'';
        
        // return interaction.reply({
        //     content:`${extra}**${interaction.user.displayName}**, you've got ${real_achievement_count} / ${Object.keys(ACHIEVEMENTS).length} achievements.\n${bar}\nMost recent achievement: **${(ACHIEVEMENTS[profile.achievements.at(-1)!] || {name:'Unknown Achievement'}).name}** - ${(ACHIEVEMENTS[profile.achievements.at(-1)!] || {description:'I don\'t know what this acheivement is, was it removed?'}).description}`,
        //     flags: []
        // });
    }

    let list = `## Achievements\n`;
    const selected_achievements = [];
    const difficulty = {
        'e': GetEmoji(EMOJI.DIFF_EASY),
        't': GetEmoji(EMOJI.DIFF_TRICKY),
        'h': GetEmoji(EMOJI.DIFF_HARD),
        'ex': GetEmoji(EMOJI.DIFF_EXHARD),
        'na':''
    }
    // filter out only the ones from that page
    for (const i in keys) {
        if (ACHIEVEMENTS[keys[i]].class == sub) selected_achievements.push({a:ACHIEVEMENTS[keys[i]],key:keys[i]});
    }

    for (const i in selected_achievements) {
        const locked = profile.achievements.indexOf(<Achievements> selected_achievements[i].key) == -1;
        let line = difficulty[selected_achievements[i].a.diff] + (locked?'🔒 ':'🔓 ');
    
        if (spoil) {
            line += (locked?selected_achievements[i].a.name:`**${selected_achievements[i].a.name}**`) + ` - ${selected_achievements[i].a.description}`; 
        } else {
            line += locked?`${selected_achievements[i].a.name} - ???`:`**${selected_achievements[i].a.name}** - ${selected_achievements[i].a.description}`;
        }
        
        list += `${line}\n`;
    }

    interaction.reply({
        content: list + `-# ${GetEmoji(EMOJI.DIFF_EASY)} Easy | ${GetEmoji(EMOJI.DIFF_TRICKY)} Tricky | ${GetEmoji(EMOJI.DIFF_HARD)} Hard | ${GetEmoji(EMOJI.DIFF_EXHARD)} Extra Hard`,
        flags: []
    });
}


async function GenerateAchievementsBanner(user_id: Snowflake, achievement_count: number) {
    const width = 600, height = 150;
    const canvas = createCanvas(width, height);
    const ctx    = canvas.getContext('2d');

    const profile = GetUserProfile(user_id);
    const bar_color = {bg:'#44384d',fg:'#9d60cc'};

    // Background color
    const gradient = ctx.createLinearGradient(0, height, 0, 0);
    gradient.addColorStop(0, '#271e2e');
    gradient.addColorStop(1, '#3c3245');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // why do we have to force fetch the user? idk, it's dumb
    let banner_url = await client.users.fetch(user_id, {force: true}).then(user => user.bannerURL({extension:'png', size:1024})); // 1024x361
    if (profile.customization.level_bg_override != '') {
        banner_url = profile.customization.level_bg_override;
        console.log(`profile banner override is selected: ${banner_url}`)
    }
    // if the user has a banner + unlocked the user banner ability
    if (banner_url && profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_USER)) {
        const banner_buffer = await fetchImage(banner_url);
        const banner_img = await loadImage(banner_buffer);
        // ctx.drawImage(banner_img, (600-1024)/2, (150-361)/2);
        console.log('before:', banner_img.width, banner_img.height);
        const new_width = 600;
        const new_height = banner_img.height * (600/banner_img.width); // i cant anymore
        console.log('after:', new_width, new_height);
        ctx.drawImage(banner_img, 0, Math.round((height-new_height)/2), new_width, Math.round(new_height));
        // darken with a slightly-transparent rectangle
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, width, height);
    }

    // pfp
    const pfp_url = client.users.cache.get(user_id)?.avatarURL({extension:'png', size:128});
    const pfp_buffer = await fetchImage(pfp_url || '');
    const pfp_img = await loadImage(pfp_buffer);
    ctx.save();
    ctx.beginPath();
    // level bar ends at x=580
    ctx.roundRect(580-90, 15, 90, 90, 12);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(pfp_img, 580-90, 15, 90, 90);
    ctx.restore();
    ctx.fillStyle = '#ffffff00';
    ctx.fill();

    // XP Bar Background
    const barX = 20;
    const barY = 110;
    const barWidth = 560;
    const barHeight = 25;
    ctx.fillStyle = bar_color.bg;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 8);
    ctx.fill();

    const last_achivement = profile.achievements.at(-1)!=undefined?ACHIEVEMENTS[profile.achievements.at(-1)!]:<Achievement>{name:'None yet',description:'You haven\'t unlocked any achievements yet!'};

    // name
    ctx.font = "28px azuki_font, Arial, 'Segoe UI Emoji'";
    // background
    ctx.fillStyle = '#3d3d3d';
    ctx.fillText(last_achivement.name, 23, 43);
    // foreground
    ctx.fillStyle = '#edf2f4';
    ctx.fillText(last_achivement.name, 21, 40);

    // desc
    ctx.font = "20px azuki_font, Arial, 'Segoe UI Emoji'";
    const offset = last_achivement.diff != undefined?'   ':'';
    // bg
    ctx.fillStyle = '#3d3d3d';
    ctx.fillText(offset+getLines(ctx, last_achivement.description, 440).join('\n'), 23, 68);
    // fg
    ctx.fillStyle = '#f0c4ff';
    ctx.fillText(offset+getLines(ctx, last_achivement.description, 440).join('\n'), 21, 65);

    if (last_achivement.diff) {
        const diff = await loadImage(readFileSync(join(BASE_DIRNAME, 'assets', 'art', `ad${last_achivement.diff}.png`)));
        ctx.drawImage(diff, 21, 48, 20, 20);
    }

    // XP Bar Progress
    const progressRatio = achievement_count / Object.keys(ACHIEVEMENTS).length;
    if (progressRatio * barWidth > 16) {
        ctx.fillStyle = bar_color.fg;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * progressRatio, barHeight, 8);
        ctx.fill();
    }

    // XP Text
    ctx.font = '16px azuki_font, bold Arial';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(`${achievement_count} unlocked`, barX + 10, barY + 19);
    ctx.textAlign = 'right';
    ctx.fillText(`${Object.keys(ACHIEVEMENTS).length} total`, barWidth + 10, barY + 19);

    // save
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'achievement-banner.png'), buffer);
}

// for word wrapping
function getLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
    const words = text.split(" ");
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
}


export const AchievementsSlashCommand = new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('See your achievement progress')
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall)
    .addStringOption(option => option
        .setName('page')
        .setDescription('Which page of achievements to show')
        .setChoices(
            {name:'Progress Bar', value:'bar'},
            // specific categories
            {name:'okabot', value:'okabot'},
            {name:'Gambling', value:'gamble'},
            {name:'Fun (1/2)', value:'fun'},
            {name:'Fun (2/2)', value:'fun2'},
            {name:'okash', value:'okash'},
        )
        .setRequired(true)
    )
    .addBooleanOption(option => option
        .setName('show-all')
        .setDescription('Show all achievement descriptions, even if locked')
        .setRequired(false)
    );
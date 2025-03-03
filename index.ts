import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    MessageFlags,
    Partials,
    TextChannel
} from 'discord.js';

import {WordleCheck} from './modules/extra/wordle';
import {HandleCommandCoinflipV2} from './modules/okash/games/coinflip';
import {HandleCommandDaily} from './modules/interactions/daily.js';
import {HandleCommandPay} from './modules/interactions/pay.js';
import {HandleCommandOkash} from './modules/interactions/okash.js';
import {DoRandomDrops} from './modules/passive/onMessage.js';

import * as config from './config.json';
export const DEV = config.extra.includes('use dev token'); // load this asap
import {dependencies as pj_dep, version} from './package.json';
import {Logger} from 'okayulogger';
import {GetMostRecent, StartEarthquakeMonitoring} from './modules/earthquakes/earthquakes';
import {HandleCommandLeaderboard} from './modules/interactions/leaderboard';
import {HandleCommandUse} from './modules/interactions/use';
import {HandleCommandShop} from './modules/interactions/shop';
import {HandleCommandBuy} from './modules/interactions/buy';
import {HandleCommandPockets} from './modules/interactions/pockets';
import {SetupPrefs, UpgradeLegacyProfiles} from './modules/user/prefs';
import {HandleCommandToggle} from './modules/interactions/toggle';
import {HandleCommandCustomize} from './modules/interactions/customize';
import {existsSync, readFileSync, rmSync, writeFileSync} from 'fs';
import {join} from 'path';
import {CheckForAgreementMessage, CheckRuleAgreement} from './modules/user/rules';
import {Dangerous_WipeAllLevels, HandleCommandLevel} from './modules/levels/levels';
import {DoLeveling} from './modules/levels/onMessage';
import {SetupBlackjackMessage} from './modules/okash/games/blackjack';
import {StartHTTPServer} from './modules/http/server';
import {Dangerous_WipeAllWallets} from './modules/okash/wallet';
import {HandleCommandSell} from './modules/interactions/sell';
import {HandleVoiceEvent, LoadVoiceData} from './modules/levels/voicexp';
import {ScheduleJob} from './modules/tasks/cfResetBonus';
import {GenerateCoinflipDataDisplay} from './modules/extra/datarenderer';
import {HandleCommandStock} from './modules/interactions/stock';
import {HandleCommandHelp} from './modules/interactions/help';
import {HandleCommandTransfer} from './modules/interactions/transfer';
import {DeployCommands} from './modules/deployment/commands';
import {HandleCommandRoulette, ListenForRouletteReply} from './modules/okash/games/roulette';
import {HandleCommandRob} from './modules/okash/games/rob';
import {LoadReminders} from './modules/tasks/dailyRemind';
import {Achievements, GrantAchievement, HandleCommandAchievements} from './modules/passive/achievement';
import {CheckForShorthand, RegisterAllShorthands} from "./modules/passive/adminShorthands";
import {HandleCommandSlots} from "./modules/okash/games/slots";
import {EMOJI, GetEmoji} from "./util/emoji";
import {HandleCommandPair} from "./modules/http/pairing";
import {HandleCommandCasino, LoadCasinoDB} from "./modules/okash/casinodb";
import {CreateTrackedItem, LoadSerialItemsDB} from "./modules/okash/trackedItem";
import {CUSTOMIZATION_UNLOCKS} from "./modules/okash/items";

export const DMDATA_API_KEY = config.dmdata_api_key;
export const CAN_USE_SHORTHANDS = config.permitted_to_use_shorthands;
export const BOT_MASTER = config.bot_master;

export const BASE_DIRNAME = __dirname;

export let LISTENING = true;
export function SetListening(listening: boolean) { LISTENING = listening }

const L = new Logger('main');
let dependencies: string = '';
Object.keys(pj_dep).forEach((key: string) => {
    dependencies += `${key}@${(pj_dep as any)[key]} `;
});

const NO_LAUNCH = process.argv.includes('--no-launch');
const DEPLOY = process.argv.includes('--deploy');
const UPGRADE = process.argv.includes('--upgrade');
const WIPE = process.argv.includes('--wipe');
const WIPE_TYPE = WIPE?process.argv[process.argv.indexOf('--wipe') + 1]:'none';

// bot code start
export const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ], partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

client.once(Events.ClientReady, (c: Client) => {
    RegisterAllShorthands();
    SetupPrefs(__dirname);
    LoadVoiceData();
    LoadReminders();
    ScheduleJob(c); // schedule the coinflip reset bonus
    LoadCasinoDB();
    LoadSerialItemsDB();
    L.info(`Successfully logged in as ${c.user!.tag}`);
    c.user!.setActivity(config.status.activity, {type: config.status.type});

    if (process.argv.includes('--create-test-serial')) {
        const serial = CreateTrackedItem('customization', CUSTOMIZATION_UNLOCKS.COIN_DBLUE, '1314398026315333692');
        serial.then(s => {
            L.debug(`Created new test serialed item: ${s}`);
        })
    }

    if (!DEV) {
        if (existsSync(join(__dirname, 'ERROR.LOG'))) {
            const error = readFileSync(join(__dirname, 'ERROR.LOG'), 'utf-8');

            try {
                rmSync(join(__dirname, 'ERROR.LOG'));

                const channel = client.channels.cache.get("1315805846910795846") as TextChannel;
                channel.send({content:':warning: okabot has crashed and restarted! here\'s the recorded error/stack:\n'+'```'+ error +'```'});
            } catch(err) {
                L.error('cannot find #okabot/cannot delete ERROR.LOG, not logging the error!');
            }
        }
    }

    StartHTTPServer(c);

    // StartDMDataWS(DMDATA_API_KEY);
    StartEarthquakeMonitoring(client, config.extra.includes('disable jma fetching'));
});

if (WIPE) {
    switch (WIPE_TYPE) {
        case 'okash':
            Dangerous_WipeAllWallets();
            break;

        case 'levels':
            Dangerous_WipeAllLevels();
            break;

        case 'all':
            Dangerous_WipeAllWallets();
            Dangerous_WipeAllLevels();
            break;
    
        default:
            L.error('Unknown wipe type specified in --wipe flag!');
            break;
    }
}


if (!NO_LAUNCH) client.login((config.extra && config.extra.includes('use dev token'))?config.devtoken:config.token);
if (DEPLOY) DeployCommands((config.extra && config.extra.includes('use dev token'))?config.devtoken:config.token, (config.extra && config.extra.includes('use dev token'))?config.devclientId:config.clientId);
if (UPGRADE) UpgradeLegacyProfiles(__dirname);

const HANDLERS: {[key:string]: CallableFunction} = {
    'info': async (interaction: ChatInputCommandInteraction) => {await interaction.deferReply(); await GetInfoEmbed(interaction);},
    'debug': async (interaction: ChatInputCommandInteraction) => {const d = new Date(); await interaction.reply({content:`okabot (tsrw) v${version}\nPackages: \`${dependencies}\`\Up since <t:${Math.floor(d.getTime()/1000 - process.uptime())}:R>`, flags:[MessageFlags.Ephemeral]})},
    'okash': HandleCommandOkash,
    'daily': HandleCommandDaily,
    'coinflip': HandleCommandCoinflipV2,
    'blackjack': SetupBlackjackMessage,
    'pay': (interaction: ChatInputCommandInteraction) => HandleCommandPay(interaction, client),
    'recent-eq': GetMostRecent,
    'leaderboard': HandleCommandLeaderboard,
    'use': HandleCommandUse,
    'shop': HandleCommandShop,
    'buy': HandleCommandBuy,
    'sell': HandleCommandSell,
    'pockets': HandleCommandPockets,
    'customize': HandleCommandCustomize,
    'toggle': HandleCommandToggle,
    'level': HandleCommandLevel,
    'render': GenerateCoinflipDataDisplay,
    'stock': HandleCommandStock,
    'help': HandleCommandHelp,
    'move': HandleCommandTransfer,
    'roulette': HandleCommandRoulette,
    'rob': HandleCommandRob,
    'achievements': HandleCommandAchievements,
    'slots': HandleCommandSlots,
    'pair': HandleCommandPair,
    'casino': HandleCommandCasino
}

// Handling slash commands:
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.channel?.isTextBased()) return;

    // this should never trigger but its a catch just in case it does happen somehow
    if (!interaction.channel || interaction.channel.isDMBased()) return interaction.reply({
        content:`:x: Sorry, **${interaction.user.displayName}**, but I'm not allowed to execute commands in DMs!`,
        flags: [MessageFlags.Ephemeral]
    });

    // disabling of okabot temporarily if a big issue is found
    if (!LISTENING) return interaction.reply({
        content: `:crying_cat_face: Sorry, **${interaction.user.displayName}**, but I've been instructed to hold off on commands for now!`,
        flags: [MessageFlags.Ephemeral]
    });

    const has_agreed = await CheckRuleAgreement(interaction);
    if (!has_agreed) return; // will automatically be replied to if no agreement

    if (!HANDLERS[interaction.commandName]) return interaction.reply('Something went wrong. This command has no handler specified in index.ts');

    HANDLERS[interaction.commandName](interaction);
});

const TYO_RESPONSE: Array<string> = [
    'of course!',
    'no problem!',
    '<3',
    `${GetEmoji(EMOJI.NEKOHEART)}`,
    'thank you too!',
    'i do my best!'
]

const TYOB_RESPONSE: Array<string> = [
    'my name is okabot!',
    'it is not okaboob!',
    'why do you bully me :crying_cat_face:',
    'it is okabot :pouting_cat:',
    'please call me okabot :crying_cat_face:',
    'https://bot.lilycatgirl.dev/gif/dekocry.gif'
]

// Handling message-based things:
client.on(Events.MessageCreate, async message => {
    if (message.author.id == client.user!.id) return; // don't listen to my own messages
    if (message.author.bot || message.webhookId) return;
    if (!(message.guild!.id == "1019089377705611294" || message.guild!.id == "748284249487966282")) return; // only listen to my approved guilds

    DoLeveling(message);
    CheckForAgreementMessage(message);
    WordleCheck(message);
    CheckForShorthand(message); // v2
    DoRandomDrops(message);
    ListenForRouletteReply(message);

    if (message.channel.id == "1321639990383476797") {
        let final_message = message.content;

        if (message.reference) {
            let reference = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!;
            final_message = `(replying to @${reference.author.username}, "${reference.content}") ${message.content}`;
        }

        // send the message to the minecraft server
        fetch('https://bot.lilycatgirl.dev/okabot/discord', {
            method: 'POST',
            body: JSON.stringify({
                username:`@${message.author.username}`,
                message:final_message
            })
        });
    }

    if (message.content.toLocaleLowerCase().startsWith('thank you okabot')) {
        message.reply({
            content:TYO_RESPONSE[Math.floor(Math.random() * TYO_RESPONSE.length)]
        });
        GrantAchievement(message.author, Achievements.THANK_OKABOT, message.channel as TextChannel); 
    }

    if (message.content.toLocaleLowerCase().startsWith('thank you okaboob')) {
        message.reply({
            content:TYOB_RESPONSE[Math.floor(Math.random() * TYOB_RESPONSE.length)]
        });
    }

    if ((message.content.toLocaleLowerCase().includes('fuck you') ||
        message.content.toLocaleLowerCase().includes('kys'))
        &&
        (message.content.toLocaleLowerCase().includes('okabot') ||
        message.content.toLocaleLowerCase().includes('okaboob') ||
        (message.reference && (await message.fetchReference()).author.id == client.user!.id)
    )) {
        await message.reply({
            content: 'https://bot.lilycatgirl.dev/gif/dekocry.gif'
        });
        GrantAchievement(message.author, Achievements.OKABOT_CRY, message.channel as TextChannel);
    }

    if (message.guild && message.guild.id == '1019089377705611294' && message.content.toLocaleLowerCase().includes('massive')) message.reply({
        content:'https://tenor.com/view/ninja-any-haircut-recommendations-low-taper-fade-you-know-what-else-is-massive-gif-3708438262570242561'
    });
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    HandleVoiceEvent(client, oldState, newState);
});

export interface CoinFloats {
    coinflip:{
        high: {
            value: number,
            user_id: string
        },
        low: {
            value: number,
            user_id: string
        },
        all_time: {
            high: {
                value: number,
                user_id: string
            },
            low: {
                value: number,
                user_id: string
            }
        },
        daily?: {
            next: number, // when the next day will start
            high: {
                value: number,
                user_id: string,
            },
            low: {
                value: number,
                user_id: string
            }
        },
        all_rolls: Array<number>
    }
}

if (!existsSync(join(__dirname, 'stats.oka'))) writeFileSync(join(__dirname, 'stats.oka'), '{"coinflip":{"high":{"value":0,"user_id":"1314398026315333692"},"low":{"value":1,"user_id":"1314398026315333692"}}}', 'utf-8');

async function GetInfoEmbed(interaction: ChatInputCommandInteraction) {
    const okawaffles = await client.users.fetch("796201956255334452");

    const stats: CoinFloats = JSON.parse(readFileSync(join(__dirname, 'stats.oka'), 'utf-8'));

    let all_flips = 0;
    stats.coinflip.all_rolls.forEach(roll => all_flips += roll);

    const info_embed = new EmbedBuilder()
    .setTitle(`${GetEmoji(EMOJI.NEKOHEART)} okabot v${version} ${GetEmoji(EMOJI.NEKOHEART)}`)
    .setColor(0x9d60cc)
    .setAuthor({
        name:okawaffles.displayName, iconURL:okawaffles.displayAvatarURL() 
    })
    .setDescription('A bot that "serves zero purpose" and exists "just because it can."')
    .addFields(
        {name:'Development', value: 'okawaffles, tacobella03', inline: true},
        {name:'Testing', value:'okawaffles, tacobella03', inline: true},
        {name:'Assets',value:'Twemoji, okawaffles, tacobella03, and whoever made that coinflip animation.', inline: false},
        {name:'Earthquake Information Sources', value:'Japan Meteorological Agency', inline: false},
        {name:'All-time Highest coinflip float',value:`${stats.coinflip.high.value} by <@${stats.coinflip.high.user_id}>`, inline:true},
        {name:'All-time Lowest coinflip float',value:`${stats.coinflip.low.value} by <@${stats.coinflip.low.user_id}>`, inline:true},
        {name:'All-time Average coinflip float',value:`${all_flips/stats.coinflip.all_rolls.length}`, inline:false},
        {name:'Today\'s Highest coinflip float',value:`${stats.coinflip.daily!.high.value} by <@${stats.coinflip.daily!.high.user_id}>`, inline:true},
        {name:'Today\'s Lowest coinflip float',value:`${stats.coinflip.daily!.low.value} by <@${stats.coinflip.daily!.low.user_id}>`, inline:true},
    )
    .setFooter({text: 'read if cute | thanks for using my bot <3'})
    .setThumbnail(client.user!.avatarURL())

    interaction.editReply({embeds:[info_embed]});
}

function logError(error: Error | string) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ${error instanceof Error ? error.stack || error.message : error}\n\n`;
    writeFileSync(join(__dirname, 'ERROR.LOG'), errorMessage, 'utf-8');
}

// Catch uncaught exceptions
process.on('uncaughtException', (error) => {
    L.error('okabot has encountered an uncaught exception!');
    console.error('Uncaught Exception:', error);
    logError(error);
    process.exit(1); // Exit the process safely
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
    L.error('okabot has encountered an uncaught rejection!');
    console.error('Unhandled Rejection:', reason);
    try {
        const channel = client.channels.cache.get("1315805846910795846") as TextChannel;
        channel.send({content:':warning: okabot has encountered an uncaught rejection! here\'s the recorded error/stack:\n'+'```'+ (reason instanceof reason ? reason.stack || reason.message : reason) +'```'});
    } catch {
        logError(reason);
    }
});

// Catch termination signals (e.g., CTRL+C, kill)
process.on('SIGINT', () => {
    // L.warn('unsafe shutdown!!!');
    // console.log('Process terminated (SIGINT).');
    process.exit(0);
});
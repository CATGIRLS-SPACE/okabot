import { ChatInputCommandInteraction, Client, DMChannel, EmbedBuilder, Events, GatewayIntentBits, MessageFlags, Partials, TextChannel } from 'discord.js';

import { WordleCheck } from './modules/extra/wordle';
import { HandleCommandCoinflip } from './modules/interactions/coinflip.js';
import { HandleCommandDaily } from './modules/interactions/daily.js';
import { HandleCommandPay } from './modules/interactions/pay.js';
import { HandleCommandOkash } from './modules/interactions/okash.js';
import { CheckAdminShorthands, DoRandomOkashRolls, DoRandomLootboxRolls } from './modules/passive/onMessage.js';

import * as config from './config.json';
export const DMDATA_API_KEY = config.dmdata_api_key;
export const DEV = config.extra.includes('use dev token'); // load this asap
import { version, dependencies as pj_dep } from './package.json';
import { Logger } from 'okayulogger';
import { GetMostRecent, StartEarthquakeMonitoring } from './modules/earthquakes/earthquakes';
import { HandleCommandLeaderboard } from './modules/interactions/leaderboard';
import { HandleCommandUse } from './modules/interactions/use';
import { HandleCommandShop } from './modules/interactions/shop';
import { HandleCommandBuy } from './modules/interactions/buy';
import { HandleCommandPockets } from './modules/interactions/pockets';
import {SetupPrefs} from './modules/user/prefs';
import { HandleCommandToggle } from './modules/interactions/toggle';
import { HandleCommandCustomize } from './modules/interactions/customize';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { CheckForAgreementMessage, CheckRuleAgreement } from './modules/user/rules';
import { Dangerous_WipeAllLevels, HandleCommandLevel } from './modules/levels/levels';
import { AddXP, DoLeveling } from './modules/levels/onMessage';
import { SetupBlackjackMessage } from './modules/okash/games/blackjack';
import { StartHTTPServer } from './modules/http/server';
import { Dangerous_WipeAllWallets } from './modules/okash/wallet';
import { HandleCommandSell } from './modules/interactions/sell';
import { HandleVoiceEvent, LoadVoiceData } from './modules/levels/voicexp';
import { ScheduleJob } from './modules/tasks/cfResetBonus';
import { GenerateCoinflipDataDisplay, RenderStockDisplay } from './modules/extra/datarenderer';
import { SetupStocks } from './modules/okash/stock';
import { HandleCommandStock } from './modules/interactions/stock';
import { ScheduleStocksTask } from './modules/tasks/updateStocks';
import { HandleCommandHelp } from './modules/interactions/help';
import { HandleCommandTransfer } from './modules/interactions/transfer';
import { ALLOWED_DM_COMMANDS, DeployCommands } from './modules/deployment/commands';
import { StartDMDataWS } from './modules/earthquakes/dmdata';
import { HandleCommandRoulette, ListenForRouletteReply } from './modules/okash/games/roulette';
import { GetMostRecentEvents } from './util/monitortool';
import { all } from 'axios';
import { HandleCommandRob } from './modules/okash/games/rob';
import { LoadReminders } from './modules/tasks/dailyRemind';

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
    SetupPrefs(__dirname);
    // SetupStocks(__dirname);
    LoadVoiceData();
    LoadReminders();
    ScheduleJob(c); // schedule the coinflip reset bonus
    // ScheduleStocksTask(c);
    L.info(`Successfully logged in as ${c.user!.tag}`);
    c.user!.setActivity(config.status.activity, {type: config.status.type});

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

// Handling slash commands:
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // this should never trigger but its a catch just in case it does happen somehow
    if (interaction.channel!.isDMBased()) {
        if ((interaction.channel! as DMChannel).id == interaction.user.dmChannel!.id) return interaction.reply({
            content:'Sorry, but okabot commands aren\'t available in my DMs. Please head to CATGIRL CENTRAL or a group DM to use okabot.'
        });

        if (ALLOWED_DM_COMMANDS.indexOf(interaction.commandName) == -1) return interaction.reply({
            content:`Sorry, but some okabot commands, including \`/${interaction.commandName}\`, aren't available in DMs.\nPlease head to CATGIRL CENTRAL or a group DM to use okabot.`
        });
    }

    // disabling of okabot temporarily if a big issue is found
    if (!LISTENING) return interaction.reply({
        content: `:crying_cat_face: Sorry, **${interaction.user.displayName}**, but I've been instructed to hold off on commands for now!`,
        ephemeral: true
    });

    // please stop using commands in #okabot
    if (interaction.channel!.id == "1315805846910795846") return interaction.reply({
        content:'Sorry, but this channel isn\'t for using commands.\nInstead, please use <#1019091099639361576> for commands.',
        flags: [MessageFlags.SuppressNotifications]
    });

    const has_agreed = await CheckRuleAgreement(interaction);
    if (!has_agreed) return; // will automatically be replied to if no agreement

    switch (interaction.commandName) {
        case 'info':
            await interaction.deferReply();
            await GetInfoEmbed(interaction);
            break;
        case 'debug':
            const d = new Date();
            const allEvents = GetMostRecentEvents();
            let recent_events = '';
            allEvents.forEach(evt => { recent_events = recent_events + `(${evt.event_id}) - ${JSON.stringify(evt.data)} - ${evt.readable_message}\n` })
            await interaction.reply({
                content:`okabot (tsrw) v${version}\nPackages: \`${dependencies}\`\Up since <t:${Math.floor(d.getTime()/1000 - process.uptime())}:R>\nRecent Events:` + '```' + recent_events + '```',
                ephemeral: true
            });
            break;
        case 'okash':
            await HandleCommandOkash(interaction);
            break;
        case 'daily':
            await HandleCommandDaily(interaction);
            break;
        case 'coinflip':
            await HandleCommandCoinflip(interaction);
            break;
        case 'blackjack':
            await SetupBlackjackMessage(interaction);
            break;
        case 'pay':
            await HandleCommandPay(interaction, client);
            break;
        case 'recent-eq':
            await interaction.deferReply();
            GetMostRecent(interaction);
            break;
        case 'leaderboard':
            await HandleCommandLeaderboard(interaction);
            break;
        case 'use':
            await HandleCommandUse(interaction);
            break;
        case 'shop':
            await HandleCommandShop(interaction);
            break;
        case 'buy':
            await HandleCommandBuy(interaction);
            break;
        case 'sell':
            await HandleCommandSell(interaction);
            break;
        case 'pockets':
            await HandleCommandPockets(interaction);
            break;
        case 'customize':
            await HandleCommandCustomize(interaction);
            break;
        case 'toggle':
            await HandleCommandToggle(interaction);
            break;
        case 'level':
            await HandleCommandLevel(interaction);
            break;
        case 'render':
            const sc = interaction.options.getSubcommand();
            if (sc == 'coinflip') await GenerateCoinflipDataDisplay(interaction);
            if (sc == 'stocks') await RenderStockDisplay(interaction);
            break;
        case 'stock':
            await HandleCommandStock(interaction);
            break;
        case 'help':
            await HandleCommandHelp(interaction);
            break;
        case 'move':
            await HandleCommandTransfer(interaction);
            break;
        case 'roulette':
            await HandleCommandRoulette(interaction);
            break;
        case 'rob':
            await HandleCommandRob(interaction);
            break;
    }
});

const TYO_RESPONSE: Array<string> = [
    'of course!',
    'no problem!',
    '<3',
    '<:nekoheart:1316232330733682689>',
    'thank you too!',
    'i do my best!'
]

// Handling message-based things:
client.on(Events.MessageCreate, async message => {
    if (message.author.id == client.user!.id) return; // don't listen to my own messages
    if (message.author.bot || message.webhookId) return;
    if (!(message.guild!.id == "1019089377705611294" || message.guild!.id == "748284249487966282")) return; // only listen to my approved guilds

    DoLeveling(message);
    CheckForAgreementMessage(message);
    WordleCheck(message);
    CheckAdminShorthands(message);
    DoRandomOkashRolls(message);
    DoRandomLootboxRolls(message);
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

    if (message.content.toLocaleLowerCase() == 'thank you okabot') message.reply({
        content:TYO_RESPONSE[Math.floor(Math.random() * TYO_RESPONSE.length)]
    });

    if (message.content.toLocaleLowerCase().includes('fuck you') && (
        message.content.toLocaleLowerCase().includes('okabot') ||
        message.content.toLocaleLowerCase().includes('okaboob') ||
        (message.reference && (await message.fetchReference()).author.id == client.user!.id)
    )) message.reply({
        content:'https://tenor.com/view/sanae-dekomori-crying-anime-gif-6076570'
    });

    if (message.content.toLocaleLowerCase().includes('massive')) message.reply({
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
    .setTitle(`<:nekoheart:1316232330733682689> okabot v${version} <:nekoheart:1316232330733682689>`)
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
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
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
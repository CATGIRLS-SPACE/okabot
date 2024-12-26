import { ChatInputCommandInteraction, Client, EmbedBuilder, Events, GatewayIntentBits, MessageFlags, Partials, TextChannel } from 'discord.js';

import { WordleCheck } from './modules/extra/wordle';
import { HandleCommandCoinflip } from './modules/interactions/coinflip.js';
import { HandleCommandDaily } from './modules/interactions/daily.js';
import { HandleCommandPay } from './modules/interactions/pay.js';
import { HandleCommandOkash } from './modules/interactions/okash.js';
import { CheckAdminShorthands, DoRandomOkashRolls } from './modules/passive/onMessage.js';

import * as config from './config.json';
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
import { HandleCommandLevel } from './modules/levels/levels';
import { DoLeveling } from './modules/levels/onMessage';
import { SetupBlackjackMessage } from './modules/okash/blackjack';
import { GetEmoji } from './util/emoji';
import { StartHTTPServer } from './modules/http/server';

export const BASE_DIRNAME = __dirname;

export let LISTENING = true;
export function SetListening(listening: boolean) { LISTENING = listening }

const L = new Logger('main');
let dependencies: string = '';
Object.keys(pj_dep).forEach((key: string) => {
    dependencies += `${key}@${(pj_dep as any)[key]} `;
});

// bot code start
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions
    ], partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

client.once(Events.ClientReady, (c: Client) => {
    SetupPrefs(__dirname);
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

    if (config.extra && config.extra.includes('disable jma fetching')) return;
    StartEarthquakeMonitoring(client);
});

client.login((config.extra && config.extra.includes('use dev token'))?config.devtoken:config.token);

// Handling slash commands:
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // this should never trigger but its a catch just in case it does happen somehow
    if (interaction.channel!.isDMBased()) return interaction.reply({
        content:'Sorry, but okabot commands aren\'t available in DMs. Please head to CATGIRL CENTRAL to use okabot.'
    });

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
            await interaction.reply({
                content:`okabot (tsrw) v${version}\nPackages: \`${dependencies}\`\nUptime: ${Math.round(process.uptime()/60*100)/100} min`,
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

    if (message.content.toLocaleLowerCase() == 'thank you okabot') message.reply({
        content:TYO_RESPONSE[Math.floor(Math.random() * TYO_RESPONSE.length)]
    })
});

interface coin_floats {
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
                user_id: number,
            },
            low: {
                value: number,
                user_id: number
            }
        }
    }
}

if (!existsSync(join(__dirname, 'stats.oka'))) writeFileSync(join(__dirname, 'stats.oka'), '{"coinflip":{"high":{"value":0,"user_id":"1314398026315333692"},"low":{"value":1,"user_id":"1314398026315333692"}}}', 'utf-8');

async function GetInfoEmbed(interaction: ChatInputCommandInteraction) {
    const okawaffles = await client.users.fetch("796201956255334452");

    const stats: coin_floats  = JSON.parse(readFileSync(join(__dirname, 'stats.oka'), 'utf-8'));
    const highest_holder = await client.users.fetch(stats.coinflip.high.user_id);
    const lowest_holder = await client.users.fetch(stats.coinflip.low.user_id);

    const info_embed = new EmbedBuilder()
    .setTitle(`<:nekoheart:1316232330733682689> okabot v${version} <:nekoheart:1316232330733682689>`)
    .setAuthor({
        name:okawaffles.displayName, iconURL:okawaffles.displayAvatarURL() 
    })
    .setDescription('A bot that "serves zero purpose" and exists "just because it can."')
    .addFields(
        {name:'Development', value: 'okawaffles', inline: true},
        {name:'Testing', value:'okawaffles, tacobella03', inline: true},
        {name:'Assets',value:'Twemoji, okawaffles, tacobella03, and whoever made that coinflip animation.', inline: false},
        {name:'Earthquake Information Sources', value:'Japan Meteorological Agency', inline: false},
        {name:'Highest coinflip float',value:`${stats.coinflip.high.value} by <@${highest_holder.id}>`, inline:true},
        {name:'Lowest coinflip float',value:`${stats.coinflip.low.value} by <@${lowest_holder.id}>`, inline:true},
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
    console.error('Uncaught Exception:', error);
    logError(error);
    process.exit(1); // Exit the process safely
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    console.error('Unhandled Rejection:', reason);
    logError(reason);
});

// Catch termination signals (e.g., CTRL+C, kill)
process.on('SIGINT', () => {
    console.log('Process terminated.');
    process.exit(0);
});
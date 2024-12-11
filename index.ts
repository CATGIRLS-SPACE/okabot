import { ChatInputCommandInteraction, Client, EmbedBuilder, Events, GatewayIntentBits, Partials } from 'discord.js';

import { WordleCheck } from './modules/extra/wordle';
import { HandleCommandCoinflip } from './modules/interactions/coinflip.js';
import { HandleCommandDaily } from './modules/interactions/daily.js';
import { HandleCommandPay } from './modules/interactions/pay.js';
import { HandleCommandOkash } from './modules/interactions/okash.js';
import { CheckAdminShorthands, DoRandomOkashRolls } from './modules/passive/onMessage.js';

import * as config from './config.json';
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
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const BASE_DIRNAME = __dirname;

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
    }
});


// Handling message-based things:
client.on(Events.MessageCreate, async message => {
    if (message.author.id == client.user!.id) return; // don't listen to my own messages
    if (message.author.bot || message.webhookId) return;
    if (!(message.guild!.id == "1019089377705611294" || message.guild!.id == "748284249487966282")) return; // only listen to my approved guilds

    WordleCheck(message);
    CheckAdminShorthands(message);
    DoRandomOkashRolls(message);
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
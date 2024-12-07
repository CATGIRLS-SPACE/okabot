import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';

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
    L.info(`Successfully logged in as ${c.user!.tag}`);
    c.user!.setActivity(config.status.activity, {type: config.status.type});

    if (config.extra && config.extra.includes('disable jma fetching')) return;
    StartEarthquakeMonitoring(client);
});

client.login((config.extra && config.extra.includes('use dev token'))?config.devtoken:config.token);

// Handling slash commands:
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    switch (interaction.commandName) {
        case 'ping':
            await interaction.reply({content: ':cat: Pong!', ephemeral: true});
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
        // case 'leaderboard':
        //     await HandleCommandLeaderboard(interaction);
        //     break;
    }
});


// Handling message-based things:
client.on(Events.MessageCreate, async message => {
    if (message.author.id == client.user!.id) return; // don't listen to my own messages
    if (!(message.guild!.id == "1019089377705611294" || message.guild!.id == "748284249487966282")) return; // only listen to my approved guilds

    WordleCheck(message);
    CheckAdminShorthands(message);
    DoRandomOkashRolls(message);
});
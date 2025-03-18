import {Logger} from "okayulogger";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {
    ChatInputCommandInteraction,
    Client, EmbedBuilder,
    Events,
    GatewayIntentBits, MessageFlags,
    Partials,
    Snowflake,
    TextChannel
} from "discord.js";
import {HandleCommandOkash} from "./modules/interactions/okash";
import {HandleCommandDaily} from "./modules/interactions/daily";
import {HandleCommandCoinflipV2} from "./modules/okash/games/coinflip";
import {SetupBlackjackMessage} from "./modules/okash/games/blackjack";
import {HandleCommandPay} from "./modules/interactions/pay";
import {GetMostRecent} from "./modules/earthquakes/earthquakes";
import {HandleCommandLeaderboard} from "./modules/interactions/leaderboard";
import {HandleCommandUse} from "./modules/interactions/use";
import {HandleCommandShop} from "./modules/interactions/shop";
import {HandleCommandBuy} from "./modules/interactions/buy";
import {HandleCommandSell} from "./modules/interactions/sell";
import {HandleCommandPockets} from "./modules/interactions/pockets";
import {HandleCommandCustomize} from "./modules/interactions/customize";
import {HandleCommandToggle} from "./modules/interactions/toggle";
import {HandleCommandLevel} from "./modules/levels/levels";
import {GenerateCoinflipDataDisplay} from "./modules/extra/datarenderer";
import {HandleCommandStock} from "./modules/interactions/stock";
import {HandleCommandHelp} from "./modules/interactions/help";
import {HandleCommandTransfer} from "./modules/interactions/transfer";
import {HandleCommandRoulette} from "./modules/okash/games/roulette";
import {HandleCommandRob} from "./modules/okash/games/rob";
import {HandleCommandAchievements} from "./modules/passive/achievement";
import {HandleCommandSlots} from "./modules/okash/games/slots";
import {HandleCommandPair} from "./modules/http/pairing";
import {HandleCommandCasino, LoadCasinoDB} from "./modules/okash/casinodb";
import {HandleCommandTrade} from "./modules/interactions/trade";
import {EMOJI, GetEmoji} from "./util/emoji";
import {StartHTTPServer} from "./modules/http/server";


const L = new Logger('main');
export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
    ]
});

// some constants
export const VERSION = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8')).version;
const RELEASE_NAME = ({
    '4.0.0':'tsrw', // 4.0.0 to 2.0.0 was just tsrw
    '4.1.0':'Éclair au Chocolat',
    '4.1.1':'Éclair aux Fraises',
    '4.1.2':'Éclar au Vanille',
    '4.2.0':'Madeleine'
} as {[key: string]: string})[VERSION];
export const BASE_DIRNAME = __dirname;
export let LISTENING = true;

/**
 * Toggle whether okabot should listen to commands or not.
 * @param active Whether it should be listening to commands or not
 */
export function SetListening(active: boolean) {LISTENING = active}

/**
 * Start the bot and log in
 */
async function StartBot() {
    await RunPreStartupTasks();

    await client.login(CONFIG.extra.includes('use dev token')?CONFIG.devtoken:CONFIG.token);

    client.once('ready', () => {
        RunPostStartupTasks();
    });
}

/**
 * Run all the tasks required for the bot to start
 */
async function RunPreStartupTasks() {
    L.info(`Starting okabot v${VERSION} ${RELEASE_NAME}`);

    LoadCasinoDB();
}

/**
 * Run all tasks which should be started after the bot is logged in
 */
async function RunPostStartupTasks() {
    L.info(`Successfully logged in as ${client.user?.tag}!`);

    StartHTTPServer(client);
}


// Execution starts here!
if (!existsSync(join(__dirname, 'config.json'))) { L.error('No configuration file found!'); process.exit(-1) }

// more constants that require config to be loaded
export const CONFIG: {
    token: string,
    devtoken: string,
    clientId: Snowflake,
    devclientId: Snowflake,
    status: {
        type: number,
        activity: string,
    },
    extra: Array<string>,
    dmdata_api_key: string,
    bot_master: Snowflake,
    permitted_to_use_shorthands: Array<Snowflake>
} = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8'));
export const DEV = CONFIG.extra.includes('use dev token');

StartBot();

// Command and message handlers

// Command handling functions map
const HANDLERS: {[key:string]: CallableFunction} = {
    'info': async (interaction: ChatInputCommandInteraction) => {await interaction.deferReply(); await GetInfoEmbed(interaction);},
    'debug': async (interaction: ChatInputCommandInteraction) => {const d = new Date(); await interaction.reply({content:`You are running okabot v${VERSION} "${RELEASE_NAME || 'generic'}"\nUp since <t:${Math.floor(d.getTime()/1000 - process.uptime())}:R>`, flags:[MessageFlags.Ephemeral]})},
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
    'casino': HandleCommandCasino,
    'trade': HandleCommandTrade
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.channel?.isTextBased()) return;

    if (!HANDLERS[interaction.commandName]) return interaction.reply('No registered handler for this command. This is a bug.');

    L.info(`Execute command "${interaction.commandName}"`);

    HANDLERS[interaction.commandName](interaction);
});

async function GetInfoEmbed(interaction: ChatInputCommandInteraction) {
    const okawaffles = await client.users.fetch("796201956255334452");

    // const stats: CoinFloats = JSON.parse(readFileSync(join(__dirname, 'stats.oka'), 'utf-8'));
    //
    // let all_flips = 0;
    // stats.coinflip.all_rolls.forEach(roll => all_flips += roll);

    const info_embed = new EmbedBuilder()
        .setTitle(`${GetEmoji(EMOJI.NEKOHEART)} okabot v${VERSION} "${RELEASE_NAME}" ${GetEmoji(EMOJI.NEKOHEART)}`)
        .setColor(0x9d60cc)
        .setAuthor({
            name:okawaffles.displayName, iconURL:okawaffles.displayAvatarURL()
        })
        .setDescription(`A bot that "serves zero purpose" and exists "just because it can."`)
        .addFields(
            {name:'Development', value: 'okawaffles, tacobella03', inline: true},
            {name:'Testing', value:'okawaffles, tacobella03, pankers2, kbgkaden', inline: true},
            {name:'Assets',value:'Twemoji, okawaffles, tacobella03, and whoever made that coinflip animation.', inline: false},
            {name:'Earthquake Information Sources', value:'Project DM-D.S.S', inline: false},
        )
        .setFooter({text: 'read if cute | thanks for using my bot <3'})
        .setThumbnail(client.user!.avatarURL())

    interaction.editReply({embeds:[info_embed]});
}

// Error Handlers

function logError(error: Error | string) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ${error instanceof Error ? error.stack || error.message : error}\n\n`;
    writeFileSync(join(__dirname, 'ERROR.LOG'), errorMessage, 'utf-8');
}

// Catch uncaught exceptions
process.on('uncaughtException', async (reason) => {
    L.error('okabot has encountered an uncaught exception!');
    console.error('Uncaught Exception:', reason);
    try {
        const channel = client.channels.cache.get(!DEV?"1315805846910795846":"858904835222667315") as TextChannel;
        await channel.send({content:':warning: okabot has encountered an uncaught exception! here\'s the recorded error/stack:\n'+'```'+ (reason) +'```\n-# This report was sent automatically before the bot shut down.\n-# Recurring issue? Open an issue [here](https://github.com/okawaffles/okabot/issues).'});
    } catch(err) {
        L.error('could not send report!!');
        console.log(err);
        logError(reason);
    }
    process.exit(1); // Exit the process safely
});

// Catch unhandled promise rejections
process.on('unhandledRejection', async (reason: any) => {
    L.error('okabot has encountered an uncaught rejection!');
    console.error('Unhandled Rejection:', reason);
    try {
        const channel = client.channels.cache.get(!DEV?"1315805846910795846":"858904835222667315") as TextChannel;
        await channel.send({content:':warning: okabot has encountered an uncaught rejection! here\'s the recorded error/stack:\n'+'```'+ (reason) +'```'});
    } catch(err) {
        L.error('could not send report!!');
        console.log(err);
        logError(reason);
    }
});
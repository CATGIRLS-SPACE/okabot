import {SetupStocks, UpdateMarkets} from "./modules/okash/stock";

const START_TIME_MS = (new Date()).getTime();

import {Logger} from "okayulogger";
import {existsSync, readFileSync, rmSync, writeFileSync} from "fs";
import { execSync } from "child_process";
import {join} from "path";
import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits, MessageContextMenuCommandInteraction,
    MessageFlags,
    Partials,
    Snowflake,
    TextChannel,
} from "discord.js";

// Load config BEFORE imports, otherwise devmode doesn't load emojis properly
const L = new Logger('main');
export const BASE_DIRNAME = __dirname;
L.debug(`__dirname is ${__dirname}`);

if (!existsSync(join(__dirname, 'config.json'))) { 
    L.fatal('No configuration file found!');
    writeFileSync(join(__dirname, 'config.json'), JSON.stringify({
        token: "<required>",
        devtoken: "<not required>",
        clientId: "<required>",
        devclientId: "<not required>",
        status: {
            type: 0,
            activity: 'Custom Instance',
        },
        extra: ['disable jma fetching'],
        dmdata_api_key: "<optional>",
        translate_api_key: "<not required, unused>",
        gemini: {
            enable: false,
            api_key: "<not required unless enabled>",
            azure_api_key: "<azure voice resource, not required unless enabled>",
            azure_region: "<not required unless enabled>",
        },
        aes_key: "<required to use prompts.mesy when gemini is enabled>",
        bot_master: "<not required, but recommended>",
        permitted_to_use_shorthands: [
            "<not required, but recommended: your user id here>"
        ],
        minecraft_relay_key: "<not required>",
        pose_as_user_token: "<not required, only used when gemini enabled to get user profile info>",
    }));
    L.fatal('A template configuration file has been created. Please modify it with your bot information before launching again.');
    process.exit(-1);
}
export let CONFIG: {
    token: string,
    devtoken: string,
    clientId: Snowflake,
    devclientId: Snowflake,
    status: Array<{
        type: number,
        activity: string,
    }>,
    extra: Array<string>,
    dmdata_api_key: string,
    translate_api_key: string,
    gemini: {
        enable: boolean,
        api_key: string,
        azure_api_key: string,
        azure_region: string,
    },
    aes_key: string,
    lilac: {
        aes_key: string,
        osu_key: string,
    }
    bot_master: Snowflake,
    permitted_to_use_shorthands: Array<Snowflake>,
    minecraft_relay_key: string,
    OPENAI_API_KEY: string,
    osu: {
        client_id: number,
        secret: string,
    },
    twitch: {
        client_id: string,
        secret: string,
    }
} = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8'));
// eslint-disable-next-line no-var
export var DEV: boolean = CONFIG.extra.includes('use dev token');
export function BotIsDevMode(): boolean { return DEV }
// some constants
export const VERSION = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8')).version;
export const COMMIT = execSync('git rev-parse HEAD').toString().trim().slice(0, 7);
export let LISTENING = true;
// non-exported
const NO_LAUNCH = process.argv.includes('--no-launch');
const DEPLOY_COMMANDS = process.argv.includes('--deploy');

import {HandleCommandOkash} from "./modules/interactions/okash";
import {HandleCommandDaily} from "./modules/interactions/daily";
import {HandleCommandCoinflipV2} from "./modules/okash/games/coinflip";
import {HandleCommandBlackjackV2} from "./modules/okash/games/blackjack";
import {HandleCommandPay} from "./modules/interactions/pay";
import {GetMostRecent, StartEarthquakeMonitoring} from "./modules/earthquakes/earthquakes";
import {HandleCommandLeaderboard} from "./modules/interactions/leaderboard";
import {HandleCommandUse} from "./modules/interactions/use";
import {HandleCommandShop} from "./modules/interactions/shop";
import {HandleCommandBuy} from "./modules/interactions/buy";
import {HandleCommandSell} from "./modules/interactions/sell";
import {HandleCommandPockets} from "./modules/interactions/pockets";
import {HandleCommandCustomize} from "./modules/interactions/customize";
import {HandleCommandToggle} from "./modules/interactions/toggle";
import {HandleCommandLevel} from "./modules/levels/levels";
import {HandleCommandRender} from "./modules/extra/datarenderer";
import {HandleCommandStock} from "./modules/interactions/stock";
import {HandleCommandHelp} from "./modules/interactions/help";
import {HandleCommandTransfer} from "./modules/interactions/transfer";
import {HandleCommandRoulette, ListenForRouletteReply} from "./modules/okash/games/roulette";
import {HandleCommandRob} from "./modules/okash/games/rob";
import {Achievements, GrantAchievement, HandleCommandAchievements} from "./modules/passive/achievement";
import {HandleCommandSlots} from "./modules/okash/games/slots";
import {HandleCommandPair} from "./modules/http/pairing";
import {HandleCommandCasino, LoadCasinoDB} from "./modules/okash/casinodb";
import {HandleCommandTrade} from "./modules/interactions/trade";
import {EMOJI, GetEmoji} from "./util/emoji";
import {StartHTTPServer} from "./modules/http/server";
import {CheckForFunMessages} from "./modules/passive/funResponses";
import {LoadVoiceData} from "./modules/levels/voicexp";
import {DoLeveling} from "./modules/levels/onMessage";
import {CheckForRuleReact, CheckForRulesSimple, CheckRuleAgreement, TextBasedRules} from "./modules/user/rules";
import {WordleCheck} from "./modules/extra/wordle";
import {CheckForShorthand, RegisterAllShorthands} from "./modules/passive/adminShorthands";
import {DoRandomDrops} from "./modules/passive/onMessage";
import {LoadSerialItemsDB} from "./modules/okash/trackedItem";
import {DeployCommands} from "./modules/deployment/commands";
import {CheckUserIdOkashRestriction, DumpProfileCache, GetUserProfile, SetupPrefs} from "./modules/user/prefs";
import {LoadReminders} from "./modules/tasks/dailyRemind";
import {ScheduleJob} from "./modules/tasks/cfResetBonus";
import {IsUserBanned} from "./modules/user/administrative";
import {HandleCommand8Ball} from "./modules/interactions/8ball";
import {CheckModerationShorthands, LoadWarnings} from "./modules/moderation/moderation";
import {GeminiDemoReplyToConversationChain, GeminiDemoRespondToInquiry, SetupGeminiDemo} from "./modules/passive/geminidemo";
import {ShowPatchnotes} from "./modules/textbased/patchnotes/patchnotes";
import { LoadUserReminders, RemindLater } from "./modules/textbased/remind/remind";
import {HandleCommandCatgirl} from "./modules/interactions/catgirl";
import {HandleCommandCraft} from "./modules/interactions/craft";
import {LoadSpecialUsers} from "./util/users";
import { SetupGoodluckle } from "./modules/http/goodluckle";
import { SetupTranslate } from "./util/translate";
import { CheckForTextCommands } from "./util/textCommandMappings";
import {HandleServerPrefsCommand} from "./modules/system/serverPrefs";
import {ConnectToN4Network} from "./modules/earthquakes/n4";
import {CheckRequiredPermissions} from "./util/permscheck";
import {CheckGuessGameMessage, GuessBlueArchive} from "./modules/interactions/guessgame";
import {PrivacyGuardCheckLinks} from "./modules/catgirlcentral/privacyguard";
import {MMFFile} from "./modules/catgirlcentral/mmf";
import {HandleCommandOsuConfig, HandleCommandOsuMulti} from "./modules/osu/render";
import {ParseAsTextFromInput} from "./modules/system/parseAsTextFromInput";
import {EnableHoneypots} from "./modules/thecattree/honeypot";
import {AddBookmark, HandleCommandBookmark, LoadBookmarkDB} from "./modules/contextmenu/bookmarks";


export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
    ]
});

/**
 * Toggle whether okabot should listen to commands or not.
 * @param active Whether it should be listening to commands or not
 */
export function SetListening(active: boolean) {LISTENING = active}

/**
 * Toggle a specific command listening.
 * @param command The command to toggle
 * @returns false if the command is now enabled, true if it is now disabled
 */
export function ToggleDisableOfCommand(command: string): boolean {
    if (TEMPORARILY_DISABLED_COMMANDS.includes(command)) TEMPORARILY_DISABLED_COMMANDS.splice(TEMPORARILY_DISABLED_COMMANDS.indexOf(command), 1);
    else TEMPORARILY_DISABLED_COMMANDS.push(command);

    return TEMPORARILY_DISABLED_COMMANDS.includes(command);
}

/**
 * Reload the config file, special users, profile cache. 
 */
export function ReloadConfig() {
    CONFIG = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8'));
    LoadSpecialUsers(__dirname);
    DumpProfileCache();
}

/**
 * Start the bot and log in
 */
async function StartBot() {
    await RunPreStartupTasks();

    client.once(Events.ClientReady, () => {
        RunPostStartupTasks();
    });

    if (!NO_LAUNCH) await client.login(CONFIG.extra.includes('use dev token')?CONFIG.devtoken:CONFIG.token);
}

/**
 * Run all the tasks required for the bot to start
 */
async function RunPreStartupTasks() {
    L.info(`Starting okabot v${VERSION}`);

    if (DEPLOY_COMMANDS) await DeployCommands(!DEV?CONFIG.token:CONFIG.devtoken, !DEV?CONFIG.clientId:CONFIG.devclientId);
    if (NO_LAUNCH) process.exit(0);

    LoadCasinoDB(); // load casino games stats
    RegisterAllShorthands(); // register all "oka [etc...]" shorthands
    SetupPrefs(__dirname); // setup user profiles
    LoadVoiceData(); // load voice data that might have been lost on restart
    LoadReminders(); // load daily reminders
    LoadUserReminders(); // o.remind reminders
    ScheduleJob(client); // schedule the coinflip reset bonus
    LoadSerialItemsDB(); // load the tracked item database
    LoadWarnings(); // load all user warnings from moderation database
    LoadSpecialUsers(__dirname); // loads all "special" users (donators, testers, devs...)
    SetupGoodluckle();
    SetupTranslate();
    SetupGeminiDemo();
    SetupStocks(__dirname);
    LoadBookmarkDB();

    setInterval(() => {
        UpdateMarkets(client);
    }, !DEV?10*60*1_000:30_000); // stocks update every 10 minutes (or 30 sec on dev)
}

let status_selected = 0;

/**
 * Run all tasks which should be started after the bot is logged in
 */
async function RunPostStartupTasks() {
    L.info(`Successfully logged in as ${client.user?.tag}!`);

    StartHTTPServer(client);
    StartEarthquakeMonitoring(client, CONFIG.extra.includes('disable jma fetching'));
    ConnectToN4Network();
    EnableHoneypots();


    client.user!.setActivity({
        name: CONFIG.status[status_selected].activity,
        type: CONFIG.status[status_selected].type
    });

    setInterval(() => {
        status_selected++;
        if (status_selected >= CONFIG.status.length) status_selected = 0;
        client.user!.setActivity({
            name: CONFIG.status[status_selected].activity,
            type: CONFIG.status[status_selected].type
        });
    }, !DEV ? 5*60_000 : 60_000);

    if (existsSync(join(__dirname, 'update_id'))) {
        const ids = readFileSync(join(__dirname, 'update_id'), 'utf-8').split(',');
        const message = await (<TextChannel> await client.channels.fetch(ids[0]))?.messages.fetch(ids[1]);
        message.edit({content:`Update to commit ${COMMIT} completed successfully.`});
        rmSync(join(__dirname, 'update_id'));
    }

    L.info(`Startup finished in ${(new Date()).getTime() - START_TIME_MS}ms!`);
}

export function SetActivity(name: string, type: number) {
    client.user!.setActivity({
        name,
        type
    });
}

// Command and message handlers

// Command handling functions map
const HANDLERS: {[key:string]: CallableFunction} = {
    'info': async (interaction: ChatInputCommandInteraction) => {await interaction.deferReply(); await GetInfoEmbed(interaction);},
    'debug': async (interaction: ChatInputCommandInteraction) => {
        const d = new Date();
        await interaction.reply({
            content:`You are running okabot v${VERSION} (commit [${COMMIT}](https://github.com/okawaffles/okabot/commit/${COMMIT}))\nUp since <t:${Math.floor(d.getTime()/1000 - process.uptime())}:R>\nLaunch command: \`${process.argv.join(' ')}\`\n${process.argv.join(' ').includes('bun')?"You're using Bun! This may not work 100% correctly!":"You're using NodeJS."}`,
            flags:[MessageFlags.Ephemeral]
        });
    },
    'okash': HandleCommandOkash,
    'daily': HandleCommandDaily,
    'coinflip': HandleCommandCoinflipV2,
    'blackjack': HandleCommandBlackjackV2,
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
    'profile': HandleCommandLevel,
    'render': HandleCommandRender,
    'stock': HandleCommandStock,
    'help': HandleCommandHelp,
    'move': HandleCommandTransfer,
    'roulette': HandleCommandRoulette,
    'rob': HandleCommandRob,
    'achievements': HandleCommandAchievements,
    'slots': HandleCommandSlots,
    'pair': HandleCommandPair,
    'casino': HandleCommandCasino,
    'trade': HandleCommandTrade,
    '8ball': HandleCommand8Ball,
    'catgirl': HandleCommandCatgirl,
    'craft': HandleCommandCraft,
    'server-preferences': HandleServerPrefsCommand,
    'recent-error':async (interaction: ChatInputCommandInteraction) => {
        if (last_errors.length == 0) return interaction.reply({content:'nope, no recently recorded errors...'});
        // yes
        interaction.reply({content:`yeah, last error was <t:${last_errors[last_errors.length - 1].time}:R>. reason:\n`+'```' + last_errors[last_errors.length - 1].error + '```'});
    },
    'guess': GuessBlueArchive,
    'osu-config': HandleCommandOsuConfig,
    'osu-multi': HandleCommandOsuMulti,
    'emulate-message': ParseAsTextFromInput,
    'bookmark': HandleCommandBookmark
}

const TEMPORARILY_DISABLED_COMMANDS: Array<string> = [

];

const LAST_USER_LOCALE = new Map<Snowflake, string>();
export function GetLastLocale(user_id: Snowflake) {
    return LAST_USER_LOCALE.get(user_id) || 'en';
}
export function SetLastLocale(user_id: Snowflake, locale: string) {
    LAST_USER_LOCALE.set(user_id, locale);
}

client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isContextMenuCommand()) {
        if (interaction.commandName == 'Bookmark This') AddBookmark(interaction as MessageContextMenuCommandInteraction);
        else console.log(interaction.commandName);
        return;
    }
    if (!interaction.isChatInputCommand()) return;

    // if (interaction.guild && !(interaction.guild.id == '1019089377705611294' || interaction.guild.id == '748284249487966282')) return;

    if (!interaction.channel?.isTextBased()) return;

    L.info(`Execute command "${interaction.commandName}"`);

    if (!(await CheckRequiredPermissions(interaction))) return;

    interaction.okabot = {
        locale: {ja:'ja','en-GB':'en','en-US':'en'}[interaction.locale as string] as 'en' | 'ja' || 'en',
        translateable_locale: interaction.locale
    };
    LAST_USER_LOCALE.set(interaction.user.id, interaction.locale);

    // if a user is super banned, okabot will stop here <--- hey past millie, what the hell does "super banned" even mean?
    if (IsUserBanned(interaction.user.id)) {
        const profile = GetUserProfile(interaction.user.id);
        await interaction.reply({
            content: `:x: You are currently **banned** from using okabot until <t:${Math.ceil(profile.restriction.until/1000)}>. Reason: \`${profile.restriction.reason}\`\nPlease contact a bot admin to appeal your ban.`
        });
        return;
    }

    if (!HANDLERS[interaction.commandName]) return interaction.reply('No registered handler for this command. This is a bug.');

    // emergency killswitch for commands and bugs
    if (!LISTENING) return interaction.reply(`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but I've been told to not respond to commands for now!\n-# this is likely due to updates, hold on a few minutes and try again!`);
    if (TEMPORARILY_DISABLED_COMMANDS.includes(interaction.commandName)) return interaction.reply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but I've been told to disable this command temporarily. This is probably due to a bug that could be exploited. Please try again later.`
    });

    const has_agreed = await CheckRuleAgreement(interaction);
    if (!has_agreed) return L.info('No rule agreement, halting'); // will automatically be replied to if no agreement

    HANDLERS[interaction.commandName](interaction);
});

async function GetInfoEmbed(interaction: ChatInputCommandInteraction) {
    const okawaffles = await client.users.fetch("796201956255334452");

    const info_embed = new EmbedBuilder()
        .setTitle(`${GetEmoji(EMOJI.NEKOHEART)} okabot v${VERSION} ${GetEmoji(EMOJI.NEKOHEART)}`)
        .setColor(0x9d60cc)
        .setAuthor({
            name:okawaffles.displayName, iconURL:okawaffles.displayAvatarURL()
        })
        .setDescription(`A bot that "serves zero purpose" and exists "just because it can."`)
        .addFields(
            {name:'Development', value: 'okawaffles, tacobella03', inline: true},
            {name:'Testing', value:'okawaffles, tacobella03, pampers2, kbgkaden', inline: true},
            {name:'Assets',value:'Twemoji, okawaffles, tacobella03, and whoever made that coinflip animation.', inline: false},
            {name:'Earthquake Information Sources', value:'Project DM-D.S.S', inline: false},
            {name:'Donators', value:'tacobella03, flyer.', inline: false},
        )
        .setFooter({text: 'read if cute | thanks for using my bot <3'})
        .setThumbnail(client.user!.avatarURL())

    interaction.editReply({
        content:['1387213389083709590','1019089377705611294','1348652647963561984'].includes(interaction.guildId || '0')?`This server has full access to okabot features! ${GetEmoji(EMOJI.NEKOHEART)}`:'This server is using basic okabot features.',
        embeds:[info_embed]
    });
}


// Message handlers

client.on(Events.MessageCreate, async message => {
    if (!LISTENING) return; // disabling commands will disable message handlers as well
    if (message.author.id == client.user!.id) return; // don't listen to my own messages
    if ((message.author.bot || message.webhookId)) return; // don't listen to bot or webhook messages
    // if (message.guild && !(message.guild.id == '1019089377705611294' || message.guild.id == '748284249487966282')) return;
    if (message.flags.any("IsCrosspost") || message.flags.any("HasThread") || message.flags.any('HasSnapshot')) return; // forwarded messages break shit
    
    const rules = await CheckForRulesSimple(message.author.id);
    if ((message.content.startsWith('okabot, ') || message.channel.isDMBased()) && !rules) {
        const reply = await message.reply({
            content: 'You appear to be trying to use okabot\'s Gemini features. You must agree to the okabot rules before doing so. Please run any okabot command before trying again.',
            flags: [MessageFlags.SuppressNotifications]
        });
        setTimeout(() => {
            try {
                if (reply.deletable) reply.delete();
            } catch {
                return;
            }
        }, 7_000);
        return;
    }

    if (message.content.startsWith('o.rules')) TextBasedRules(message);

    if (!rules) return; // don't listen to non-rule-agreeing users
    if (CheckUserIdOkashRestriction(message.author.id, '')) return; // dont worry about banned users

    // if (!(message.guild!.id == "1019089377705611294" || message.guild!.id == "748284249487966282")) return; // only listen to my approved guilds

    // various checks
    await CheckForShorthand(message); // checks for shorthands like "oka update" etc...
    CheckForFunMessages(message); // checks for things like "thank you okabot" etc...
    DoLeveling(message); // self-explanatory
    if (message.channel.id == "1310486655257411594") WordleCheck(message); // checks for wordle spoilers
    DoRandomDrops(message); // drops!
    ListenForRouletteReply(message); // checks for number in response to roulette game
    CheckGuessGameMessage(message);
    PrivacyGuardCheckLinks(message);
    CheckModerationShorthands(message);

    if (message.content.includes('okabottestmmfandprinttoconsole')) {
        new MMFFile(join(__dirname, 'assets', 'jlpt', 'n5.mmf'));
    }

    // text-based official commands
    if (message.content.startsWith('o.patchnotes')) ShowPatchnotes(message);
    if (message.content.startsWith('o.remind')) RemindLater(message);

    if (message.content.startsWith('o.')) CheckForTextCommands(message);

    if (message.content.includes('<@908895994027049021>')) {
        (await client.channels.fetch('1315805846910795846') as TextChannel).send(`User ${message.author.username} has pinged me with message:\n${message.content}`);
        await message.reply(`Heads up, **${message.author.displayName}**! Any message that pings me is relayed to Millie's private server. No other context can be seen, so if you are reporting a bug, please send as much context as possible.`);
    }

    if (message.content.toLowerCase().startsWith('okabot, ') && (message.guild?.id == '1019089377705611294' || message.guild?.id == '1348652647963561984' || message.guild?.id == '748284249487966282')) {
        if (!CONFIG.gemini.enable) return;
        if (message.guild.id != '1348652647963561984' && message.guild.id != '1019089377705611294' && message.guild.id != '748284249487966282') return;
        else GeminiDemoRespondToInquiry(message);
    }
    
    if (message.reference) {
        // let reference = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId);
        const reference = await (message.channel as TextChannel).messages.fetch(message.reference!.messageId!);
        if (!reference) return;
        if (reference.content.includes('-# GenAI') && (message.guild?.id == '1019089377705611294' || message.guild?.id == '1348652647963561984' || message.guild?.id == '748284249487966282')) GeminiDemoReplyToConversationChain(message);
    }

    // minecraft server
    if (message.channel.id == "1321639990383476797" || message.channel.id == '858904835222667315') { // #mc-live-chat
        let final_message = message.content;

        if (message.reference) {
            const reference = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!;
            final_message = `(replying to @${reference.author.username}, "${reference.content}") ${message.content}`;
        }

        // send the message to the minecraft server
        if (!DEV) fetch(`https://bot.millie.zone/okabot/discord?key=${CONFIG.minecraft_relay_key}`, {
            method: 'POST',
            body: JSON.stringify({
                event: 'message',
                username: message.author.username==message.author.displayName?`@${message.author.username}`:message.author.displayName,
                message: final_message
            })
        });
    }
});

// Server join handler to give role automatically as well as the handler for reactions
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id != '1019089377705611294') return;

    // give role
    await member.roles.add('1019094205756350527');

    // send a hello!
    await (member.guild.channels.cache.get('1019089378343137373')! as TextChannel).send({
        content: `## meow! hi there, <@${member.user.id}>\nwelcome to **CATGIRL CENTRAL**!\nplease read the rules before continuing!\nmake sure to check out what okabot has to offer in <#1019091099639361576> too!\nthanks for joining, and have fun!`
    });
});

client.on(Events.GuildCreate, async (guild) => {
    const channel = client.channels.cache.get(!DEV?"1318329592095703060":"858904835222667315")! as TextChannel;
    const owner = await guild.members.fetch(guild.ownerId);
    await channel.send({
        content:`# :tada: okabot was added to a new server!\n**Server name**: ${guild.name} (${guild.id})\n**Member count**: ${guild.memberCount}\n**Owner**: ${owner.user.displayName} (@${owner.user.username} <@${guild.ownerId}>)`,
    });

    if (!guild.systemChannelId) return;
    const syschannel = await guild.channels.fetch(guild.systemChannelId);
    try {
        (syschannel as TextChannel).send(`# hi there, thanks for inviting me in!\nplease note, i've just been made public, so some features might not work properly!\nif you find any bugs, please report them at the links found in /help!\ni hope you have fun! ${GetEmoji(EMOJI.NEKOHEART)}`);
    } catch {
        L.error("unable to send introduction message to system channel");
    }
});

client.on(Events.MessageReactionAdd, async (reaction, reactor) => {
    if (reaction.emoji.name == '🆗') return CheckForRuleReact(await reaction.fetch(), await reactor.fetch());
    if (reaction.emoji.name == '🍡') {
        const channel = await client.channels.fetch(reaction.message.channel.id) as TextChannel;
        const message = await channel.messages.fetch(reaction.message.id);
        if (message.author.id != client.user!.id) return;
        GrantAchievement(message.author, Achievements.DANGO, channel);
    }
});

// Error Handlers

const last_errors:Array<{time:number,error:string}> = [];

function logError(error: Error | string) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ${error instanceof Error ? error.stack || error.message : error}\n\n`;
    writeFileSync(join(__dirname, 'ERROR.LOG'), errorMessage, 'utf-8');
}

// Catch uncaught exceptions
process.on('uncaughtException', async (reason: Error) => {
    L.fatal('okabot has encountered an uncaught exception!');
    last_errors.push({
        time: Math.ceil((new Date()).getTime() / 1000),
        error: reason.stack || '?'
    });
    console.error('Uncaught Exception:', reason);
    try {
        const channel = client.channels.cache.get(!DEV?"1318329592095703060":"858904835222667315") as TextChannel;
        await channel.send({content:':warning: okabot has encountered an (possibly unrecoverable) uncaught exception! here\'s the recorded error/stack:\n'+'```'+ (reason.stack || reason) +'```\n-# This report was sent automatically before the bot shut down.\n-# Recurring issue? Open an issue [here](https://github.com/okawaffles/okabot/issues).'});
    } catch(err) {
        L.error('could not send report!!');
        console.log(err);
        console.log(reason);
        logError(reason);
    }
    // process.exit(1); // Exit the process safely
});

// Catch unhandled promise rejections
process.on('unhandledRejection', async (reason: Error) => {
    L.error('okabot has encountered an uncaught rejection!');
    last_errors.push({
        time: Math.ceil((new Date()).getTime() / 1000),
        error: reason.stack || '?'
    });
    console.error('Unhandled Rejection:', reason);
    try {
        const channel = client.channels.cache.get(!DEV?"1318329592095703060":"858904835222667315")! as TextChannel;
        await channel.send({content:':warning: okabot has encountered an uncaught rejection! here\'s the recorded error/stack:\n'+'```'+ (reason.stack || reason) +'```'});
        // await channel.send({content:`:warning: okabot encountered an uncaught rejection! `});
    } catch(err) {
        L.error('could not send report!!');
        console.log(err);
        logError(reason);
    }
});

export async function ManuallySendErrorReport(reason: string, silent: boolean) {
    L.error('okabot has encountered a manual error report!');
    console.error('reason:', reason);
    try {
        const channel = client.channels.cache.get(!DEV?"1318329592095703060":"858904835222667315")! as TextChannel;
        await channel.send({
            content:':warning: okabot has encountered a recoverable error! here\'s the recorded reason:\n'+'```'+ reason +'```\n' + new Error().stack!.split('\n')[2].trim(),
            flags:silent?[MessageFlags.SuppressNotifications]:[]
        });
    } catch(err) {
        L.error('could not send report!!');
        console.log(err);
        logError(reason);
    }
}


// Execution Starts here
declare global {
  // augment global This so TS stops complaining
  var __okabot_started: boolean | undefined;
}
if (!globalThis.__okabot_started) {
    globalThis.__okabot_started = true;
    StartBot();
}
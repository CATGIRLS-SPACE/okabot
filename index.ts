import {Logger} from "okayulogger";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder,
    Events,
    GatewayIntentBits,
    Locale,
    MessageFlags,
    Partials,
    Snowflake,
    TextChannel,
    ActivityType, User,
    PermissionsBitField,
    PermissionFlagsBits
} from "discord.js";

// Load config BEFORE imports, otherwise devmode doesn't load emojis properly
const L = new Logger('main');

if (!existsSync(join(__dirname, 'config.json'))) { L.fatal('No configuration file found!'); process.exit(-1) }
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
    translate_api_key: string,
    gemini: {
        enable: boolean,
        api_key: string,
    },
    story_key: string,
    bot_master: Snowflake,
    permitted_to_use_shorthands: Array<Snowflake>,
    minecraft_relay_key: string,
} = JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8'));
export var DEV: boolean = CONFIG.extra.includes('use dev token');
export function BotIsDevMode(): boolean { return DEV }

import {HandleCommandOkash} from "./modules/interactions/okash";
import {HandleCommandDaily} from "./modules/interactions/daily";
import {HandleCommandCoinflipV2} from "./modules/okash/games/coinflip";
import {CheckBlackjackSilly, HandleCommandBlackjackV2, SetupBlackjackMessage} from "./modules/okash/games/blackjack";
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
import {GenerateCoinflipDataDisplay, HandleCommandRender} from "./modules/extra/datarenderer";
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
import {CreateSharedMedia, StartHTTPServer} from "./modules/http/server";
import {CheckForFunMessages} from "./modules/passive/funResponses";
import {HandleVoiceEvent, LoadVoiceData} from "./modules/levels/voicexp";
import {DoLeveling} from "./modules/levels/onMessage";
import {CheckForAgreementMessage, CheckRuleAgreement} from "./modules/user/rules";
import {WordleCheck} from "./modules/extra/wordle";
import {CheckForShorthand, RegisterAllShorthands} from "./modules/passive/adminShorthands";
import {DoRandomDrops} from "./modules/passive/onMessage";
import {Check$Message, LoadSerialItemsDB} from "./modules/okash/trackedItem";
import {DeployCommands} from "./modules/deployment/commands";
import {GetUserProfile, SetupPrefs} from "./modules/user/prefs";
import {LoadReminders} from "./modules/tasks/dailyRemind";
import {ScheduleJob} from "./modules/tasks/cfResetBonus";
import {IsUserBanned} from "./modules/user/administrative";
// import language after dev check (emojis)
import {LANG_DEBUG, LangGetFormattedString} from "./util/language";
import {HandleCommand8Ball} from "./modules/interactions/8ball";
import {CheckModerationShorthands, CheckReactionFlag, LoadWarnings} from "./modules/moderation/moderation";
import {GeminiDemoReplyToConversationChain, GeminiDemoRespondToInquiry} from "./modules/passive/geminidemo";
import {ShowPatchnotes} from "./modules/textbased/patchnotes/patchnotes";
import {AutomodAccountCreationDate} from "./modules/moderation/automod";
import { LoadUserReminders, RemindLater } from "./modules/textbased/remind/remind";
import {HandleCommandCatgirl} from "./modules/interactions/catgirl";
import { GrantStoryAccess, ReadChapterData } from "./modules/story/lorebook";
import { HandleCommandStory } from "./modules/interactions/story";
import {HandleCommandCraft} from "./modules/interactions/craft";
import { SetupStocks } from "./modules/okash/stock";
import {PetParseTextCommand} from "./modules/pet/textCommands";
import {LoadSpecialUsers} from "./util/users";


export const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.GuildMember,
    ]
});

// some constants
export const VERSION = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8')).version;
export const BASE_DIRNAME = __dirname;
export let LISTENING = true;
// non-exported
const NO_LAUNCH = process.argv.includes('--no-launch');
const DEPLOY_COMMANDS = process.argv.includes('--deploy');

/**
 * Toggle whether okabot should listen to commands or not.
 * @param active Whether it should be listening to commands or not
 */
export function SetListening(active: boolean) {LISTENING = active}

export function ToggleDisableOfCommand(command: string): boolean {
    if (TEMPORARILY_DISABLED_COMMANDS.includes(command)) TEMPORARILY_DISABLED_COMMANDS.splice(TEMPORARILY_DISABLED_COMMANDS.indexOf(command), 1);
    else TEMPORARILY_DISABLED_COMMANDS.push(command);

    return TEMPORARILY_DISABLED_COMMANDS.includes(command);
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
    if (DEV) SetupStocks(__dirname);
}

/**
 * Run all tasks which should be started after the bot is logged in
 */
async function RunPostStartupTasks() {
    L.info(`Successfully logged in as ${client.user?.tag}!`);

    StartHTTPServer(client);
    StartEarthquakeMonitoring(client, CONFIG.extra.includes('disable jma fetching'));

    client.user!.setActivity({
        name: CONFIG.status.activity,
        type: CONFIG.status.type
    });
}


// Command and message handlers

// Command handling functions map
const HANDLERS: {[key:string]: CallableFunction} = {
    'info': async (interaction: ChatInputCommandInteraction) => {await interaction.deferReply(); await GetInfoEmbed(interaction);},
    'debug': async (interaction: ChatInputCommandInteraction) => {
        const d = new Date();
        await interaction.reply({
            content:`You are running okabot v${VERSION}\nUp since <t:${Math.floor(d.getTime()/1000 - process.uptime())}:R>\n${LangGetFormattedString(LANG_DEBUG.HELLO_WORLD, interaction.okabot.locale, interaction.okabot.translateable_locale)}`,
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
    // 'story': HandleCommandStory,
    'craft': HandleCommandCraft,
    'was-there-an-error':async (interaction: ChatInputCommandInteraction) => {
        if (last_errors.length == 0) return interaction.reply({content:'nope, no recently recorded errors...'});
        // yes
        interaction.reply({content:`yeah, last error was <t:${last_errors[last_errors.length - 1].time}:R>. reason:\n`+'```' + last_errors[last_errors.length - 1].error + '```'});
    }
}

const ALLOWED_COMMANDS_IN_DMS = [
    '8ball',
    'recent-eq',
    'catgirl'
];

const TEMPORARILY_DISABLED_COMMANDS: Array<string> = [

];

const LAST_USER_LOCALE = new Map<Snowflake, string>();
export function GetLastLocale(user_id: Snowflake) {
    return LAST_USER_LOCALE.get(user_id) || 'en';
}
export function SetLastLocale(user_id: Snowflake, locale: string) {
    LAST_USER_LOCALE.set(user_id, locale);
}

async function CheckRequiredPermissions(interaction: ChatInputCommandInteraction): Promise<boolean> {
    if (interaction.channel?.isDMBased()) return true;    

    const guild = await interaction.client.guilds.fetch(interaction.guildId!);
    if (!guild) return false;
    const me = guild.roles.botRoleFor(interaction.client.user);
    if (!me) return false;

    let has_perms = true;
    
    has_perms = me.permissions.has(PermissionFlagsBits.ReadMessageHistory);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.AddReactions);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.AttachFiles);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.EmbedLinks);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.ManageMessages);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.SendMessages);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.SendMessagesInThreads);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.UseApplicationCommands);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.UseExternalApps);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.UseExternalEmojis);
    has_perms = has_perms && me.permissions.has(PermissionFlagsBits.ViewChannel);
    // has_perms = has_perms && me.permissions.has(PermissionFlagsBits.);

    return has_perms;
}

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (!interaction.channel?.isTextBased()) try {
        return interaction.reply({
            content: 'Sorry, there\'s currently an issue with commands in guilds that don\'t have okabot!',
            flags: [MessageFlags.SuppressNotifications]
        });
    } catch (err) {
        return console.log('Not text based, could not reply.');
    }

    L.info(`Execute command "${interaction.commandName}"`);

    if (!(await CheckRequiredPermissions(interaction))) {
        try {
            interaction.reply({
                content:':crying_cat_face: I don\'t have the right permissions to function! Please update my permissions! I require:\nread message history, add reactions, attach files, embed links, manage messages, send messages (+in threads), use application commands, use external apps, use external emojis, view channel.\n\nAlternatively, you could just check Administrator. Only do this if you absolutely trust me!'
            });
        } catch (err) {
            L.error('failed to send wrong perms message');
        }
        return;
    }

    interaction.okabot = {
        locale: {ja:'ja','en-GB':'en','en-US':'en'}[interaction.locale as string] as 'en' | 'ja' || 'en',
        translateable_locale: interaction.locale
    };
    LAST_USER_LOCALE.set(interaction.user.id, interaction.locale);

    // if a user is super banned, okabot will stop here
    if (IsUserBanned(interaction.user.id)) {
        const profile = GetUserProfile(interaction.user.id);
        await interaction.reply({
            content: `:x: You are currently **banned** from using okabot until <t:${Math.ceil(profile.restriction.until/1000)}>. Reason: \`${profile.restriction.reason}\`\nPlease contact a bot admin to appeal your ban.`
        });
        return;
    }

    // this should never trigger but its a catch just in case it does happen somehow
    if ((!interaction.channel || interaction.channel.isDMBased()) && !ALLOWED_COMMANDS_IN_DMS.includes(interaction.commandName)) return interaction.reply({
        content:`:x: Sorry, **${interaction.user.displayName}**, but I'm not allowed to execute commands in DMs!`,
        flags: [MessageFlags.Ephemeral]
    });

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

    interaction.editReply({embeds:[info_embed]});
}


// Message handlers

client.on(Events.MessageCreate, async message => {
    if (message.author.id == client.user!.id) return; // don't listen to my own messages
    if ((message.author.bot || message.webhookId)) return; // don't listen to bot or webhook messages

    // if (!(message.guild!.id == "1019089377705611294" || message.guild!.id == "748284249487966282")) return; // only listen to my approved guilds

    // various checks
    await CheckForShorthand(message); // checks for shorthands like "oka update" etc...
    CheckForFunMessages(message); // checks for things like "thank you okabot" etc...
    DoLeveling(message); // self-explanatory
    CheckForAgreementMessage(message); // checks for "i agree..." message in response to rules
    if (message.channel.id == "1310486655257411594") WordleCheck(message); // checks for wordle spoilers
    DoRandomDrops(message); // drops!
    ListenForRouletteReply(message); // checks for number in response to roulette game
    Check$Message(message); // checks for $ messages, for serials on tracked items
    CheckBlackjackSilly(message); // checks for "should i hit" and responds if so
    // CheckModerationShorthands(message); // checks for stuff like "o.kick" etc...

    // text-based official commands
    if (message.content.startsWith('o.patchnotes')) ShowPatchnotes(message);
    if (message.content.startsWith('o.remind')) RemindLater(message);
    if (message.content.startsWith('o.pet ')) PetParseTextCommand(message);

    // if (message.content.toLowerCase().startsWith('okabot, ')) {
    //     if (!CONFIG.gemini.enable) return;
    //     GeminiDemoRespondToInquiry(message);
    // }
    //
    // if (message.reference) {
    //     let reference = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!;
    //     if (reference.content.includes('-# GenAI')) GeminiDemoReplyToConversationChain(message);
    // }

    // minecraft server
    if (message.channel.id == "1321639990383476797" || message.channel.id == '858904835222667315') { // #mc-live-chat
        let final_message = message.content;

        if (message.reference) {
            let reference = (message.channel as TextChannel).messages.cache.find((msg) => msg.id == message.reference?.messageId)!;
            final_message = `(replying to @${reference.author.username}, "${reference.content}") ${message.content}`;
        }

        let attachlink = '';

        if (message.attachments.size > 0) {
            const links: string[] = [];
            const iterator = message.attachments.keys();
            for (const attachment of iterator) {
                if (message.attachments.get(attachment)!.contentType?.startsWith('image/')) links.push(message.attachments.get(attachment)!.url!);
            }
            const id = CreateSharedMedia(links);

            attachlink = ` (attached ${message.attachments.size} item(s), view at https://b.whats.moe/s/${id})`;

            message.reply(`Your attachment(s) was/were sent to the server chat with ID \`${id}\`.`);
        }

        // send the message to the minecraft server
        if (!DEV) fetch(`https://bot.lilycatgirl.dev/okabot/discord?key=${CONFIG.minecraft_relay_key}`, {
            method: 'POST',
            body: JSON.stringify({
                event: 'message',
                username: message.author.username==message.author.displayName?`@${message.author.username}`:message.author.displayName,
                message: final_message + attachlink
            })
        });
    }
});


// Voice handlers

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    HandleVoiceEvent(client, oldState, newState);
});


// Server join handler to give role automatically as well as the handler for reactions
client.on(Events.GuildMemberAdd, async (member) => {
    if (member.guild.id != '1019089377705611294') return;

    AutomodAccountCreationDate(member.user);

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
    } catch (err) {
        L.error("unable to send introduction message to system channel");
    }
});


const DANGO_COUNT = new Map<Snowflake, number>();

client.on(Events.MessageReactionAdd, async (reaction, reactor) => {
    // CheckReactionFlag(reaction, reactor as User);

    // L.debug('new reaction ' + reaction.emoji.name);

    if (reaction.emoji.name == '🍡') {
        const channel = await client.channels.fetch(reaction.message.channel.id) as TextChannel;
        const message = await channel.messages.fetch(reaction.message.id);
        if (message.author.id != client.user!.id) return;

        if (DANGO_COUNT.has(reactor.id)) {
            DANGO_COUNT.set(reactor.id, DANGO_COUNT.get(reactor.id)! + 1);
            if (DANGO_COUNT.get(reactor.id)! == 3) {
                // GrantAchievement(reactor as User, Achievements.STORY, channel);
                // GrantStoryAccess(reactor as User, 1, channel);
            }
        } else {
            DANGO_COUNT.set(reactor.id, 1);
            GrantAchievement(reactor as User, Achievements.DANGO, channel);
        }
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
process.on('uncaughtException', async (reason: any) => {
    L.fatal('okabot has encountered an uncaught exception!');
    last_errors.push({
        time: Math.ceil((new Date()).getTime() / 1000),
        error: reason.stack || reason
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
process.on('unhandledRejection', async (reason: any) => {
    L.error('okabot has encountered an uncaught rejection!');
    last_errors.push({
        time: Math.ceil((new Date()).getTime() / 1000),
        error: reason.stack || reason
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

StartBot();
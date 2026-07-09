/**
 * boot3 is an attempt at reviving the old boot2 update.
 * The current index.ts file does not boot on Bun, and 
 * is extremely messy. boot3 aims to fix the mess and
 * Bun incompatibility (of boot, at least) while keeping
 * compatibility with the other files that rely on index.ts.
 */

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { GetBotConfig } from "./configLoader";
import { Logger } from "okayulogger";
import { execSync } from "child_process";
import { Client, Events, GatewayIntentBits, Partials } from "discord.js";
import { LoadCasinoDB } from "./modules/okash/casinodb";
import { RegisterAllShorthands } from "./modules/passive/adminShorthands";
import { SetupPrefs } from "./modules/user/prefs";
import { LoadVoiceData } from "./modules/levels/voicexp";
import { LoadUserReminders } from "./modules/textbased/remind/remind";
import { ScheduleFloatsReset } from "./modules/tasks/cfResetBonus";
import { LoadSerialItemsDB } from "./modules/okash/trackedItem";
import { LoadWarnings } from "./modules/moderation/moderation";
import { LoadSpecialUsers } from "./util/users";
import { SetupGoodluckle } from "./modules/http/goodluckle";
import { InitLanguage } from "./modules/i18n/translation";
import { SetupGeminiDemo } from "./modules/passive/geminidemo";
import { SetupStocks, UpdateMarkets } from "./modules/okash/stock";
import { LoadBookmarkDB } from "./modules/contextmenu/bookmarks";
import { LoadDailyMissions } from "./modules/tasks/dailyMissions";
import { DeployCommands } from "./modules/deployment/commands";

const START_TIME_MS = Date.now();
const L = new Logger('okabot (boot3)');

const PACKAGE_INFO = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf-8'));
export var CONFIG = GetBotConfig();
export var BASE_DIRNAME = __dirname;

// emoji.ts seems to need the function to work properly.
// try and remove it later?
export var DEV = CONFIG.extra.includes('use dev token');
export function BotIsDevMode(): boolean {return DEV};

export const VERSION = PACKAGE_INFO.version;
export const COMMIT = execSync('git rev-parse HEAD').toString().trim().slice(0, 7);

// Do we listen for commands?
export let LISTENING = true;

L.debug(`hello from boot3: okabot v${PACKAGE_INFO.version}`);

// ensure config is properly set up.
if (
    (!CONFIG.extra.includes('use dev token') && CONFIG.token == '<Production token goes here>') ||
    (CONFIG.extra.includes('use dev token') && CONFIG.devtoken == '<Development token goes here>')
) {
    let p = join(__dirname, 'config.json');
    if (!existsSync(p)) writeFileSync(p, JSON.stringify(CONFIG), 'utf-8'); 
    L.fatal(`Invalid configuration! Please modify the config file at [ ${p} ]!`);
    process.exit();
}

// boot flags
const NO_LAUNCH = process.argv.includes('--no-launch');
const DEPLOY_CMDS = process.argv.includes('--deploy');

if (NO_LAUNCH) L.info('--no-launch specified. okabot will not start Discord.js.');
if (DEPLOY_CMDS) L.info('--deploy specified. okabot will redeploy slash commands.');

L.debug('configurations loaded!');

//
// BEGIN BOT SETUP
//

let ROTATE_STATUS = true;
let STATUS_SELECTED = 0;

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

// These don't have to take arguments. 
// okabot will pass the dirname for legacy functions though.
const PreStartupTasks: Array<CallableFunction> = [
    // MOST ARE COMMENTED OUT WHILE WORKING ON THE NEW BOOT FILE
    // AS THEY REFERENCE INDEX.TS!!
    
    // LoadCasinoDB,
    // RegisterAllShorthands,
    () => SetupPrefs(__dirname),
    // LoadVoiceData,
    // LoadUserReminders,
    // ScheduleFloatsReset,
    // LoadSerialItemsDB,
    // LoadWarnings,
    () => LoadSpecialUsers(__dirname),
    // SetupGoodluckle,
    // InitLanguage,
    // SetupGeminiDemo,
    // () => SetupStocks(__dirname),
    // LoadBookmarkDB,
    // LoadDailyMissions,

    // () => setInterval(() => UpdateMarkets(client), 10*60*1_000),
]

async function StartOkabot() {
    if (DEPLOY_CMDS) await DeployCommands(!DEV ? CONFIG.token : CONFIG.devtoken, !DEV ? CONFIG.clientId : CONFIG.devclientId);
    if (NO_LAUNCH) process.exit(0);

    L.debug('Running pre-startup tasks, please wait...');
    for (const func of PreStartupTasks) await func();
    L.debug('Pre-startup tasks done, starting okabot...');

    client.once(Events.ClientReady, () => {
        L.info(`okabot is logged in as ${client.user?.tag}`);

        client.user!.setActivity({
            name: CONFIG.status[STATUS_SELECTED].activity,
            type: CONFIG.status[STATUS_SELECTED].type
        });

        setInterval(() => {
            STATUS_SELECTED++;
            if (STATUS_SELECTED >= CONFIG.status.length) STATUS_SELECTED = 0;
            client.user!.setActivity({
                name: CONFIG.status[STATUS_SELECTED].activity,
                type: CONFIG.status[STATUS_SELECTED].type
            });
        }, DEV ? 60_000 : 5 * 60_000); // 1 min on dev, 5 min on prod
    });
}







StartOkabot();
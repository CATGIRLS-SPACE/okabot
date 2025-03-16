import {Logger} from "okayulogger";
import {existsSync, readFileSync} from "fs";
import {join} from "path";
import {Client, GatewayIntentBits, Partials, Snowflake} from "discord.js";


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


/**
 * Start the bot and log in
 */
async function StartBot() {
    await RunPreStartupTasks();

    await client.login(CONFIG.extra.includes('use dev token')?CONFIG.devtoken:CONFIG.token);

    client.once('ready', () => {
        RunPostStartupTasks();
    })
}

/**
 * Run all the tasks required for the bot to start
 */
async function RunPreStartupTasks() {

}

/**
 * Run all tasks which should be started after the bot is logged in
 */
async function RunPostStartupTasks() {

}


// Execution starts here!
if (!existsSync(join(__dirname, 'config.json'))) { L.error('No configuration file found!'); process.exit(-1) }
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

StartBot();
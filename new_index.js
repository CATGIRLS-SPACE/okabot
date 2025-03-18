"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIG = exports.client = void 0;
const okayulogger_1 = require("okayulogger");
const fs_1 = require("fs");
const path_1 = require("path");
const discord_js_1 = require("discord.js");
const L = new okayulogger_1.Logger('main');
exports.client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.GuildMessageReactions,
        discord_js_1.GatewayIntentBits.GuildVoiceStates
    ],
    partials: [
        discord_js_1.Partials.Message,
        discord_js_1.Partials.Channel,
        discord_js_1.Partials.Reaction
    ]
});
/**
 * Start the bot and log in
 */
async function StartBot() {
    await RunPreStartupTasks();
    await exports.client.login(exports.CONFIG.extra.includes('use dev token') ? exports.CONFIG.devtoken : exports.CONFIG.token);
    exports.client.once('ready', () => {
        RunPostStartupTasks();
    });
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
if (!(0, fs_1.existsSync)((0, path_1.join)(__dirname, 'config.json'))) {
    L.error('No configuration file found!');
    process.exit(-1);
}
exports.CONFIG = JSON.parse((0, fs_1.readFileSync)((0, path_1.join)(__dirname, 'config.json'), 'utf-8'));
StartBot();

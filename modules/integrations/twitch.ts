import {RefreshingAuthProvider} from "@twurple/auth";
import {BASE_DIRNAME, CONFIG, DEV} from "../../index";
import {Bot, createBotCommand} from "@twurple/easy-bot";
import {Message, TextChannel} from "discord.js";
import {existsSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";

/*
    This integration is intended to be exclusive to meowlliie's twitch channel.
    It will likely take a lot of rewriting to get it to working on another channel.
    It contains heavily simplified okabot features for twitch chat.
*/

const TITS_API_URL = 'ws://192.168.1.10:42069/websocket';

interface TwitchDB {
    users: {[key: string]: TwitchProfile}
}

interface TwitchProfile {
    okash: number,
    last_get: number
}

let LOADED_TWITCH_DB: TwitchDB = {users: {}};
let TITS_WEBSOCKET: WebSocket;
let LOG_CHANNEL: TextChannel;

// profile functions?

function GetTwitchProfile(userId: string) {
    let profile = LOADED_TWITCH_DB.users[userId];
    if (!profile) {
        profile = {
            okash: 100,
            last_get: 0,
        }
        LOADED_TWITCH_DB.users[userId] = profile;
        writeFileSync(join(BASE_DIRNAME, 'db', 'twitch.oka'), JSON.stringify(LOADED_TWITCH_DB));
    }

    return profile;
}


// bot stuff

export async function ActivateTwitchIntegration(message: Message) {
    // Set up authentication
    const oauth_link = `https://id.twitch.tv/oauth2/authorize?client_id=${CONFIG.twitch.client_id}&redirect_uri=${!DEV?'https://bot.millie.zone/twitch/callback':'http://localhost:9256/twitch/callback'}&response_type=code&scope=chat:read+chat:edit`
    message.reply(`**${message.author.displayName}**, please go to this link.\n${oauth_link}`);

    if (!existsSync(join(BASE_DIRNAME, 'db', 'twitch.oka'))) {
        writeFileSync(join(BASE_DIRNAME, 'db', 'twitch.oka'), JSON.stringify({
            users: {}
        }));
    }

    LOADED_TWITCH_DB = JSON.parse(readFileSync(join(BASE_DIRNAME, 'db', 'twitch.oka'), 'utf-8'));
    LOG_CHANNEL = message.channel as TextChannel;
}

export async function TwitchSetOauthAndStartBot(token: string) {
    const result = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${CONFIG.twitch.client_id}` +
        `&client_secret=${CONFIG.twitch.secret}` +
        `&code=${token}` +
        `&grant_type=authorization_code` +
        `&redirect_uri=${!DEV?'https://bot.millie.zone/twitch/callback':'http://localhost:9256/twitch/callback'}`,
        {
            method: 'POST'
        });

    const result_json = await result.json();

    console.log(result_json);

    const authProvider = new RefreshingAuthProvider({
        clientId: CONFIG.twitch.client_id,
        clientSecret: CONFIG.twitch.secret
    });

    await authProvider.addUserForToken({
        expiresIn: result_json.expires_in,
        refreshToken: result_json.refresh_token,
        accessToken: result_json.access_token,
        obtainmentTimestamp: Math.floor(new Date().getTime() / 1000)
    }, ['chat']);

    try {
        TITS_WEBSOCKET = new WebSocket(TITS_API_URL);
        TITS_WEBSOCKET.onopen = () => {
            LOG_CHANNEL.send('TITS API connected.');
        }
    } catch {
        LOG_CHANNEL.send('TITS API failed to connect');
    }

    new Bot({
        authProvider,
        channel: 'meowlliie',
        commands:[
            createBotCommand('okabot', (params, {reply}) => {
                reply('okabot now has some limited integration with my Twitch chat. It sort of serves to bridge the gap for channel points while I am not affiliate. Try it out with !okash, !get, or !throw. More things are coming soon.');
            }),

            createBotCommand('okash', (params, {userName, userId, reply}) => {
                const profile = GetTwitchProfile(userId);
                reply(`${userName}, you have ${profile.okash} okash!`);
            }),

            createBotCommand('get', (params, {userName, userId, reply}) => {
                const profile = GetTwitchProfile(userId);
                const now = Math.ceil(new Date().getTime() / 1000);

                if (profile.last_get + 600 > now) return reply(`You have to wait 10 minutes between gets! You can !get again in ${(profile.last_get + 600) - now} seconds!`);

                const rolled_amount = Math.floor(Math.random() * 500);
                profile.okash += rolled_amount;
                profile.last_get = now;

                LOADED_TWITCH_DB.users[userId] = profile;
                writeFileSync(join(BASE_DIRNAME, 'db', 'twitch.oka'), JSON.stringify(LOADED_TWITCH_DB));

                reply(`${userName} got ${rolled_amount} added to their okash!`);
            }),

            createBotCommand('throw', (params, {userName, userId, reply}) => {
                if (TITS_WEBSOCKET.readyState != WebSocket.OPEN) return reply('Looks like TITS isn\'t working. Sorry');

                const profile = GetTwitchProfile(userId);

                let count = 1;
                if (params[0] && !isNaN(parseInt(params[0]))) count = Math.max(1, parseInt(params[0]));
                count = Math.min(count, 10);

                if (profile.okash < count * 125) return reply(`Not enough okash to throw! You need 125 okash per item!`);

                profile.okash -= count * 125;
                LOADED_TWITCH_DB.users[userId] = profile;
                writeFileSync(join(BASE_DIRNAME, 'db', 'twitch.oka'), JSON.stringify(LOADED_TWITCH_DB));

                for (let i = 0; i < count; i++)
                    TITS_WEBSOCKET.send(JSON.stringify(
                        {
                            apiName: "TITSPublicAPI",
                            apiVersion: "1.0",
                            requestId: `okabot${Math.floor(Math.random() * 1000000)}`,
                            messageType: "TITSTriggerActivateRequest",
                            data: {
                                triggerName: "okabot redeem throw"
                            }
                        }
                    ));


                if (count == 1) reply(`${userName} throws an item! Ouch!`);
                else reply(`${userName} throws ${count} items! Owee!`);
            })
        ]
    }).say('meowlliie', 'okabot is now active and listening for commands in this chat!');
}
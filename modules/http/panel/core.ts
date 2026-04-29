import express from 'express';
import {CONFIG, DEV} from "../../../index";
import {Logger} from "okayulogger";
import {RegisterOAuthPaths, SaveCodeAndGetSession} from "./oauth2";
import {RegisterUserConfigurationPaths} from "./configuration/user";

// Panel Server
export const ps = express();
const L = new Logger('panel server');

ps.get('/', (req, res) => {
    res.json({
        panel_api_version: '1.0.0',
        enable_subscriptions: false,
        free_props: [
            'basic.okash',
            'basic.daily',
            'basic.gambling',
            'leveling.msgxp',
            'leveling.voicexp',
            'passive.drops',
            'passive.eastereggs',
            'games.coinflip',
            'games.blackjack',
            'games.roulette',
            'games.slots',
            'games.8ball',
            'games.blue',
            'misc.catgirl',
            'misc.danbooru',
            'misc.danbooru_nsfw',
            'moderation.commands'
        ],
        subscribed_props: [
            'passive.ai',
            'liveservice.emergency',
            'liveservice.dmdata'
        ]
    });
});

export const REDIRECT_URI = DEV?'http://localhost:2775/auth/final':'https://panel.oka.bot/login';

ps.get('/auth', (req, res) => {
    res.redirect(`https://discord.com/oauth2/authorize?response_type=code&client_id=${DEV?CONFIG.devclientId:CONFIG.clientId}&scope=identify%20guilds%20guilds.members.read&state=abcdef&prompt=consent&redirect_uri=${REDIRECT_URI}`)
});
ps.get('/auth/final', async (req, res) => {
    const uuid = await SaveCodeAndGetSession(req.query.code as string);
    if (!uuid) return <never> res.json({success: false, reason: 'Failed to get OAuth2 token.'});
    res.json({success: true, session:uuid});
});

RegisterOAuthPaths();
RegisterUserConfigurationPaths();

ps.on('listening', () => {
    L.info('panel api server listening!');
});
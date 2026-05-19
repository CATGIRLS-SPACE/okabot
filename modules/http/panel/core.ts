import express from 'express';
import {CONFIG, DEV} from "../../../index";
import {Logger} from "okayulogger";
import {RegisterOAuthPaths, SaveCodeAndGetSession} from "./oauth2";
import {RegisterUserConfigurationPaths} from "./configuration/user";
import {RegisterServerConfigurationPaths} from "./configuration/guild";
import { CURRENT_RULES_VERSION } from '../../user/rules';
import { RegisterUserAdminRoutes } from './admin/userAdmin';

export const PANEL_API_VERSION = '1.0.0';

// Panel Server
export const ps = express();
const L = new Logger('panel server');

ps.use('*', (req, res, next) => {
    res.setHeader('X-Powered-By', 'okabot');
    next();
});

ps.get('/', (_req, res) => {
    res.json({
        panel_api_version: PANEL_API_VERSION,
        rules_version: CURRENT_RULES_VERSION,
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
            'okash.stockmarket',
            'passive.ai',
            'liveservice.emergency',
            'liveservice.dmdata'
        ]
    });
});

export const REDIRECT_URI = DEV?'http://localhost:2775/auth/final':'https://panel.oka.bot/login';

ps.get('/auth', (_req, res) => {
    res.redirect(`https://discord.com/oauth2/authorize?response_type=code&client_id=${DEV?CONFIG.devclientId:CONFIG.clientId}&scope=identify%20guilds%20guilds.members.read&state=abcdef&prompt=consent&redirect_uri=${REDIRECT_URI}`)
});
ps.get('/auth/final', async (req, res) => {
    const uuid = await SaveCodeAndGetSession(req.query.code as string, req.query.uri ? req.query.uri as string : undefined);
    if (!uuid) return <never> res.json({success: false, reason: 'Failed to get OAuth2 token.',code:'oauth2:1'});
    res.json({success: true, session:uuid});
});

RegisterOAuthPaths();
RegisterUserConfigurationPaths();
RegisterServerConfigurationPaths();
RegisterUserAdminRoutes();

ps.on('listening', () => {
    L.info('panel api server listening!');
});
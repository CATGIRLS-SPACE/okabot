import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';

import { getWordleOnDay, WordleCheck } from './modules/extra/wordle';
import { HandleCommandCoinflip } from './modules/interactions/coinflip.js';
import { HandleCommandDaily } from './modules/interactions/daily.js';
import { HandleCommandPay } from './modules/interactions/pay.js';
import { HandleCommandOkash } from './modules/interactions/okash.js';
import { CheckAdminShorthands, DoRandomOkashRolls } from './modules/passive/onMessage.js';

import * as config from './config.json';
import { Logger } from 'okayulogger';

export const BASE_DIRNAME = __dirname;

const L = new Logger('main');

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
})
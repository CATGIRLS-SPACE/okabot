import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { getWordleOnDay, WordleCheck } from './modules/extra/wordle';

const { token, devtoken, status } = require('config.json');
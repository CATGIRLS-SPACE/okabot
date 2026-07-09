import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface OkabotConfig {
    // General bot stuff
    token: string,
    devtoken: string,
    clientId: string,
    devclientId: string,
    client_secret: string,
    status: Array<{
        type: number,
        activity: string
    }>,
    extra: Array<'disable jma fetching' | 'use dev token'>,
    bot_master: string,
    permitted_to_use_shorthands: Array<string>,
    
    // extra features
    dmdata_api_key: string,
    translate_api_key: string,
    gemini: {
        enable: boolean,
        api_key: string,
    },
    aes_key: string,
    minecraft_relay_key: string,
    bluesky: {
        enable: boolean,
        username: string,
        password: string,
    },
    reolink?: {
        ip: string,
        username: string,
        password: string,
    }
}


const AUTO_FILL_CONFIG: OkabotConfig = {
    token: '<Production token goes here>',
    devtoken: '<Development token goes here>',
    clientId: '<Production client ID goes here>',
    devclientId: '<Development client ID goes here>',
    client_secret: '<Production client secret goes here>',
    status: [{
        type: 0,
        activity: 'Custom Instance'
    }],
    extra: ['disable jma fetching', 'use dev token'],
    bot_master: '<Your User ID>',
    permitted_to_use_shorthands: [
        '<Anyone else who can use admin commands goes here>',
        '<These users cannot use admin commands on the master>'
    ],

    dmdata_api_key: '<not required unless jma fetching is enabled>',
    translate_api_key: '<for i18n autotranslation>',
    gemini: {
        enable: false,
        api_key: ''
    },
    aes_key: '<Not public information>',
    minecraft_relay_key: '',
    bluesky: {
        enable: false,
        username: '',
        password: ''
    }
}


export function GetBotConfig(): OkabotConfig {
    if (!existsSync(join(__dirname, 'config.json'))) return AUTO_FILL_CONFIG;
    return JSON.parse(readFileSync(join(__dirname, 'config.json'), 'utf-8')) as OkabotConfig;
}
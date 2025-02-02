import { EmbedBuilder, ChatInputCommandInteraction, Client, TextChannel, SlashCommandBuilder } from 'discord.js';
import { join } from 'path';
import { BASE_DIRNAME, client, DEV, DMDATA_API_KEY } from '../..';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createCanvas } from 'canvas';
import { GetLatestEarthquake } from './dmdata';
import { Logger } from 'okayulogger';
import { DMDataWebSocket } from 'lily-dmdata/socket';
import { Classification, WebSocketEvent, EarthquakeInformationSchemaBody, EarthquakeComponent, EEWInformationSchemaBody } from 'lily-dmdata';
import { EMOJI, GetEmoji } from '../../util/emoji';
import { gzipSync } from 'zlib';

const URL = 'https://www.jma.go.jp/bosai/quake/data/list.json';
const INDV_URL = 'https://www.jma.go.jp/bosai/quake/data/';
const L = new Logger('earthquakes');

const locations_english: {[key: string]: string} = {};


export async function GetMostRecent(interaction: ChatInputCommandInteraction) {
    const earthquake = await GetLatestEarthquake(DMDATA_API_KEY);

    const OriginTime = new Date(earthquake.originTime);
    const Magnitude = earthquake.magnitude.value;
    const MaxInt = earthquake.maxInt;
    const HypocenterName = earthquake.hypocenter.name;
    const HypocenterDepth = earthquake.hypocenter.depth.value;

    const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterDepth, HypocenterName);
    interaction.editReply({embeds:[embed]});
}

const SHINDO_IMG: { [key: string]: string } = {
    '1':'1.png',
    '2':'2.png',
    '3':'3.png',
    '4':'4.png',
    '5-':'5-.png',
    '5+':'5+.png',
    '6-':'6-.png',
    '6+':'6+.png',
    '7':'7.png'
}

const SHINDO_EMOJI: { [key: string]: EMOJI } = {
    '1': EMOJI.SHINDO_1,
    '2': EMOJI.SHINDO_2,
    '3': EMOJI.SHINDO_3,
    '4': EMOJI.SHINDO_4,
    '5-':EMOJI.SHINDO_5_LOWER,
    '5+':EMOJI.SHINDO_5_UPPER,
    '6-':EMOJI.SHINDO_6_LOWER,
    '6+':EMOJI.SHINDO_6_UPPER,
    '7': EMOJI.SHINDO_7
}

export async function BuildEarthquakeEmbed(origin_time: Date, magnitude: string, max_intensity: string, depth: string, hypocenter_name: string, automatic = false) {
    const embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(automatic?'New entry in Japan earthquake data feed':'Most recent earthquake in Japan')
        .setTimestamp(origin_time)
        .setAuthor({name:'Project DM-D.S.S',url:`https://www.jma.go.jp/bosai/map.html`})
        .setThumbnail(`https://bot.lilycatgirl.dev/shindo/${SHINDO_IMG[max_intensity] || 'unknown.png'}`)
        .setFields(
            {name:"Maximum Intensity", value: `**${max_intensity}**`, inline: true},
            {name:'Magnitude', value: `**M${magnitude}**`, inline: true},
            {name:'Depth', value: `**${depth} km**`, inline: true},
            {name:'Location', value: locations_english[hypocenter_name]},
        );
        
    return embed;
}

const MONITORING_CHANNEL = !DEV?"1313343448354525214":"858904835222667315"; // #earthquakes (CC)
// const MONITORING_CHANNEL = "858904835222667315" // # bots (obp)
let last_known_quake = {};
export let SOCKET: DMDataWebSocket;

function open_socket(SOCKET: DMDataWebSocket) {
    SOCKET.OpenSocket({
        classifications: [
            Classification.EEW_FORECAST,
            Classification.EEW_WARNING,
            Classification.TELEGRAM_EARTHQUAKE
        ]
    });
}

const EXISTING_EARTHQUAKES = new Map<string, number>();

export async function StartEarthquakeMonitoring(client: Client, disable_fetching: boolean = false) {
    L.info('Loading all locations...');

    const data = readFileSync(join(BASE_DIRNAME, 'assets', 'earthquakes', 'Epicenters.txt'), 'utf-8');
    const lines = data.split('\n');
    lines.forEach(line => {
        const key = line.split(',')[1];
        const value = line.split(',')[2];

        locations_english[key] = value;
    });

    L.info('Loaded all locations!');

    if (disable_fetching) return L.warn('Earthquake monitoring is disabled. lily-dmdata won\'t run!');

    L.info('Starting Earthquake Monitoring...');

    // new
    SOCKET = new DMDataWebSocket(DMDATA_API_KEY);
    const channel = client.channels.cache.get('858904835222667315');
    
    // this will need massive changes!! lily-dmdata is broken!
    SOCKET.on(WebSocketEvent.EARTHQUAKE_REPORT, async (data: any) => {
        // make embed
        const embed = await BuildEarthquakeEmbed(
            new Date(data.reportDateTime), 
            data.body.earthquake.magnitude.value,
            data.body.intensity.maxInt,
            data.body.earthquake.hypocenter.depth.value, //this is actually depth 
            data.body.earthquake.hypocenter.name, 
            true);

        // send embed
        (channel as TextChannel)!.send({embeds:[embed]});
    });

    SOCKET.on(WebSocketEvent.PING, () => {
        L.debug('dmdata ping');
    });

    SOCKET.on(WebSocketEvent.OPENED, () => {
        L.debug('dmdata connection opened ok!');
        (channel as TextChannel)!.send({
            content:'lily-dmdata has successfully connected.',
            flags:'SuppressNotifications'
        });
    });

    SOCKET.on(WebSocketEvent.CLOSED, () => {
        L.debug('dmdata connection closed!');
        (channel as TextChannel)!.send({
            content:'lily-dmdata was disconnected from the websocket, I will try and reconnect...',
            flags:'SuppressNotifications'
        });

        setTimeout(() => {
            open_socket(SOCKET);
        }, 3000);
    });

    SOCKET.on(WebSocketEvent.EEW_FORECAST, (data: EEWInformationSchemaBody) => {

        let message = `:warning: **EEW Forecast** issued for ${locations_english[data.regions[0].name]}\nMax expected intensity of ${GetEmoji(SHINDO_EMOJI[data.intensity.forecastMaxInt.to])}!`;

        if (EXISTING_EARTHQUAKES.has(data._originalId)) {
            EXISTING_EARTHQUAKES.set(data._originalId, EXISTING_EARTHQUAKES.get(data._originalId)! + 1);
            message = `:asterisk: Update received for earthquake. Max expected intensity is ${GetEmoji(SHINDO_EMOJI[data.intensity.forecastMaxInt.to])}.`
        } else EXISTING_EARTHQUAKES.set(data._originalId, 0);

        try {
            (channel as TextChannel)!.send({
                content:message,
                flags:'SuppressNotifications'
            });
        } catch (err: any) {
            L.error(err);
        }
    });

    SOCKET.on(WebSocketEvent.EEW_WARNING, (data: EEWInformationSchemaBody) => {

        let message = `:sos: **EEW Warning** issued for ${locations_english[data.regions[0].name]}\nMax expected intensity of ${GetEmoji(SHINDO_EMOJI[data.intensity.forecastMaxInt.to])}!`;

        if (EXISTING_EARTHQUAKES.has(data._originalId)) {
            EXISTING_EARTHQUAKES.set(data._originalId, EXISTING_EARTHQUAKES.get(data._originalId)! + 1);
            message = `:bangbang: Update received for earthquake. Max expected intensity is ${GetEmoji(SHINDO_EMOJI[data.intensity.forecastMaxInt.to])}.`
        } else EXISTING_EARTHQUAKES.set(data._originalId, 0);

        try {
            (channel as TextChannel)!.send({
                content:message,
                flags:'SuppressNotifications'
            });
        } catch (err: any) {
            L.error(err);
        }
    });

    open_socket(SOCKET);
}

/**
 * Check if there is a new earthquake, and if so, send an update to the channel
 * @param {Client} client 
 */
async function RunEarthquakeFetch(client_2: Client) {
    console.log('fetching latest earthquake...');
    try {
        const feed = await fetch(URL);
        const list = await feed.json();
        let latest = list[0];
        
        // is it a new quake?
        if (latest.json == last_known_quake) return; // nope
        
        // if so:
        console.log('new quake!');
        last_known_quake = latest.json;

        // prep info
        const info = await fetch(`${INDV_URL}${latest.json}`);
        const earthquake = await info.json();

        // const earthquake = await GetLatestEarthquake(DMDATA_API_KEY);

        const OriginTime = new Date(earthquake.Body.Earthquake.OriginTime);
        const Magnitude = earthquake.Body.Earthquake.Magnitude;
        const MaxInt = earthquake.Body.Intensity.Observation.MaxInt;
        const HypocenterName = earthquake.Body.Earthquake.Hypocenter.Area.enName;
        const HypocenterCoords = earthquake.Body.Earthquake.Hypocenter.Area.Coordinate;

        // make embed
        const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterCoords, HypocenterName, true);

        // send embed
        const channel = client_2.channels.cache.get(MONITORING_CHANNEL);
        (channel as TextChannel)!.send({embeds:[embed]});
    } catch (err) {
        console.error(`RunEarthquakeFetch error: ${err}`);
    }
}

// lat_min 	    lat_max 	lon_min 	    lon_max
// 20.2145811 	45.7112046 	122.7141754 	154.205541

export function RenderNewEarthquakeImage() {
    const SAVE_LOCATION = join(BASE_DIRNAME, 'temp', 'earthquake.png');
    const canvas = createCanvas(500, 500);


    // save image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'render-stock.png'), buffer);
}


export async function SendNewReportNow(data: any) {
    // const earthquake = await GetLatestEarthquake(DMDATA_API_KEY);

    const eq = data.Report.Body.Earthquake;
    const obs = data.Report.Body.Intensity.Observation;

    const OriginTime = new Date(eq.OriginTime._text);
    const MaxInt = obs.MaxInt._text;
    const Magnitude = eq['jmx_eb:Magnitude']._text;
    const HypocenterName = obs.Pref.Area.Name._text;
    const HypocenterDepth = 'unknown';

    const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterDepth, HypocenterName, true);

    // send embed
    const channel = client.channels.cache.get(MONITORING_CHANNEL);
    (channel as TextChannel)!.send({embeds:[embed]});
}


export function DoEarthquakeTest() {
    const d = {
        "_originalId": "TELEGRAM_ID",
        "_schema": { "type": "eew-information", "version": "1.0.0" },
        "type": "緊急地震速報（予報）",
        "title": "緊急地震速報（警報）",
        "status": "通常",
        "infoType": "発表",
        "editorialOffice": "気象庁本庁",
        "publishingOffice": ["気象庁"],
        "pressDateTime": "2011-03-11T05:48:10Z",
        "reportDateTime": "2011-03-11T14:48:10+09:00",
        "targetDateTime": "2011-03-11T14:48:10+09:00",
        "eventId": "20110311144640",
        "serialNo": "5",
        "infoKind": "緊急地震速報",
        "infoKindVersion": "1.2_0",
        "headline": "三陸沖で地震　東北　関東　北陸　甲信　東海　北海道　伊豆諸島　近畿で強い揺れ",
        "body": {
            "isLastInfo": false,
            "isCanceled": false,
            "isWarning": true,
            "zones": [
                {
                    "code": "9920",
                    "name": "東北",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9931",
                    "name": "関東",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9934",
                    "name": "北陸",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9935",
                    "name": "甲信",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9910",
                    "name": "北海道",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9936",
                    "name": "東海",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "9932",
                    "name": "伊豆諸島",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "9941",
                    "name": "近畿",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                }
            ],
            "prefectures": [
                {
                    "code": "9040",
                    "name": "宮城",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9030",
                    "name": "岩手",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9070",
                    "name": "福島",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9060",
                    "name": "山形",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9050",
                    "name": "秋田",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9080",
                    "name": "茨城",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9020",
                    "name": "青森",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9090",
                    "name": "栃木",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9150",
                    "name": "新潟",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9120",
                    "name": "千葉",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9100",
                    "name": "群馬",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9110",
                    "name": "埼玉",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9131",
                    "name": "東京",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9200",
                    "name": "長野",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9140",
                    "name": "神奈川",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9012",
                    "name": "北海道道南",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9170",
                    "name": "石川",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "9190",
                    "name": "山梨",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "9220",
                    "name": "静岡",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "9132",
                    "name": "伊豆諸島",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "9011",
                    "name": "北海道道央",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "9270",
                    "name": "大阪",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                }
            ],
            "regions": [
                {
                    "code": "222",
                    "name": "宮城県中部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "220",
                    "name": "宮城県北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "221",
                    "name": "宮城県南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "211",
                    "name": "岩手県沿岸南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "213",
                    "name": "岩手県内陸南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "210",
                    "name": "岩手県沿岸北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "251",
                    "name": "福島県浜通り",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "240",
                    "name": "山形県庄内",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "242",
                    "name": "山形県村山",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "250",
                    "name": "福島県中通り",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "212",
                    "name": "岩手県内陸北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "243",
                    "name": "山形県置賜",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "252",
                    "name": "福島県会津",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "233",
                    "name": "秋田県内陸南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "300",
                    "name": "茨城県北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "231",
                    "name": "秋田県沿岸南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "202",
                    "name": "青森県三八上北",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "301",
                    "name": "茨城県南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "203",
                    "name": "青森県下北",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "241",
                    "name": "山形県最上",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "310",
                    "name": "栃木県北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "311",
                    "name": "栃木県南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "372",
                    "name": "新潟県下越",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "230",
                    "name": "秋田県沿岸北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "232",
                    "name": "秋田県内陸北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "340",
                    "name": "千葉県北東部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "341",
                    "name": "千葉県北西部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "201",
                    "name": "青森県津軽南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "200",
                    "name": "青森県津軽北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "320",
                    "name": "群馬県北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "330",
                    "name": "埼玉県北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "331",
                    "name": "埼玉県南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "321",
                    "name": "群馬県南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "350",
                    "name": "東京都２３区",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "342",
                    "name": "千葉県南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "371",
                    "name": "新潟県中越",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "375",
                    "name": "新潟県佐渡",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "420",
                    "name": "長野県北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "421",
                    "name": "長野県中部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "360",
                    "name": "神奈川県東部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "370",
                    "name": "新潟県上越",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "351",
                    "name": "東京都多摩東部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "106",
                    "name": "渡島地方東部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "107",
                    "name": "渡島地方西部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "151",
                    "name": "日高地方中部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "146",
                    "name": "胆振地方中東部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "390",
                    "name": "石川県能登",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "31", "name": "緊急地震速報（警報）" }
                    }
                },
                {
                    "code": "352",
                    "name": "東京都多摩西部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "411",
                    "name": "山梨県中・西部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "440",
                    "name": "静岡県伊豆",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "441",
                    "name": "静岡県東部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "110",
                    "name": "檜山地方",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "355",
                    "name": "伊豆大島",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "145",
                    "name": "胆振地方西部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "102",
                    "name": "石狩地方南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "356",
                    "name": "新島",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "100",
                    "name": "石狩地方北部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                },
                {
                    "code": "521",
                    "name": "大阪府南部",
                    "kind": {
                        "code": "31",
                        "name": "緊急地震速報（警報）",
                        "lastKind": { "code": "00", "name": "なし" }
                    }
                }
            ],
            "earthquake": {
                "originTime": "2011-03-11T14:46:16+09:00",
                "arrivalTime": "2011-03-11T14:46:40+09:00",
                "hypocenter": {
                    "code": "288",
                    "name": "三陸沖",
                    "coordinate": {
                        "latitude": { "text": "38.1˚N", "value": "38.1000" },
                        "longitude": { "text": "142.9˚E", "value": "142.9000" },
                        "height": {
                            "type": "高さ",
                            "unit": "m",
                            "value": "-10000"
                        },
                        "geodeticSystem": "日本測地系"
                    },
                    "depth": { "type": "深さ", "unit": "km", "value": "10" },
                    "reduce": { "code": "9738", "name": "三陸沖" },
                    "landOrSea": "海域",
                    "accuracy": {
                        "epicenters": ["4", "4"],
                        "depth": "4",
                        "magnitudeCalculation": "5",
                        "numberOfMagnitudeCalculation": "5"
                    }
                },
                "magnitude": {
                    "type": "マグニチュード",
                    "value": "8.4",
                    "unit": "Mj"
                }
            },
            "intensity": {
                "forecastMaxInt": { "from": "6+", "to": "6+" },
                "forecastMaxLgInt": { "from": "4", "to": "4" },
                "appendix": {
                    "maxIntChange": "0",
                    "maxLgIntChange": "0",
                    "maxIntChangeReason": "0"
                },
                "regions": [
                    {
                        "code": "220",
                        "name": "宮城県北部",
                        "forecastMaxInt": { "from": "6+", "to": "6+" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "11" },
                        "condition": "既に主要動到達と推測"
                    },
                    {
                        "code": "222",
                        "name": "宮城県中部",
                        "forecastMaxInt": { "from": "6+", "to": "6+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "11" },
                        "condition": "既に主要動到達と推測"
                    },
                    {
                        "code": "221",
                        "name": "宮城県南部",
                        "forecastMaxInt": { "from": "6+", "to": "6+" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": true,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "19" },
                        "arrivalTime": "2011-03-11T14:47:22+09:00"
                    },
                    {
                        "code": "211",
                        "name": "岩手県沿岸南部",
                        "forecastMaxInt": { "from": "6+", "to": "6+" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": true,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "19" },
                        "arrivalTime": "2011-03-11T14:47:25+09:00"
                    },
                    {
                        "code": "213",
                        "name": "岩手県内陸南部",
                        "forecastMaxInt": { "from": "6-", "to": "6-" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "11" },
                        "condition": "既に主要動到達と推測"
                    },
                    {
                        "code": "210",
                        "name": "岩手県沿岸北部",
                        "forecastMaxInt": { "from": "6-", "to": "6-" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": true,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "19" },
                        "arrivalTime": "2011-03-11T14:47:22+09:00"
                    },
                    {
                        "code": "251",
                        "name": "福島県浜通り",
                        "forecastMaxInt": { "from": "6-", "to": "6-" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "11" },
                        "condition": "既に主要動到達と推測"
                    },
                    {
                        "code": "242",
                        "name": "山形県村山",
                        "forecastMaxInt": { "from": "6-", "to": "6-" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": true,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "19" },
                        "arrivalTime": "2011-03-11T14:48:10+09:00"
                    },
                    {
                        "code": "250",
                        "name": "福島県中通り",
                        "forecastMaxInt": { "from": "6-", "to": "6-" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": true,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "19" },
                        "arrivalTime": "2011-03-11T14:48:05+09:00"
                    },
                    {
                        "code": "212",
                        "name": "岩手県内陸北部",
                        "forecastMaxInt": { "from": "6+", "to": "6+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": true,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "19" },
                        "arrivalTime": "2011-03-11T14:47:37+09:00"
                    },
                    {
                        "code": "243",
                        "name": "山形県置賜",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:21+09:00"
                    },
                    {
                        "code": "252",
                        "name": "福島県会津",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:22+09:00"
                    },
                    {
                        "code": "233",
                        "name": "秋田県内陸南部",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:23+09:00"
                    },
                    {
                        "code": "300",
                        "name": "茨城県北部",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:24+09:00"
                    },
                    {
                        "code": "240",
                        "name": "山形県庄内",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:27+09:00"
                    },
                    {
                        "code": "231",
                        "name": "秋田県沿岸南部",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:30+09:00"
                    },
                    {
                        "code": "202",
                        "name": "青森県三八上北",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:34+09:00"
                    },
                    {
                        "code": "301",
                        "name": "茨城県南部",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:34+09:00"
                    },
                    {
                        "code": "203",
                        "name": "青森県下北",
                        "forecastMaxInt": { "from": "5+", "to": "5+" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:49+09:00"
                    },
                    {
                        "code": "241",
                        "name": "山形県最上",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:15+09:00"
                    },
                    {
                        "code": "310",
                        "name": "栃木県北部",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:30+09:00"
                    },
                    {
                        "code": "311",
                        "name": "栃木県南部",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:34+09:00"
                    },
                    {
                        "code": "372",
                        "name": "新潟県下越",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:34+09:00"
                    },
                    {
                        "code": "230",
                        "name": "秋田県沿岸北部",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:37+09:00"
                    },
                    {
                        "code": "232",
                        "name": "秋田県内陸北部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:37+09:00"
                    },
                    {
                        "code": "340",
                        "name": "千葉県北東部",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "4", "to": "4" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:38+09:00"
                    },
                    {
                        "code": "341",
                        "name": "千葉県北西部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:43+09:00"
                    },
                    {
                        "code": "201",
                        "name": "青森県津軽南部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:44+09:00"
                    },
                    {
                        "code": "200",
                        "name": "青森県津軽北部",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:46+09:00"
                    },
                    {
                        "code": "320",
                        "name": "群馬県北部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:46+09:00"
                    },
                    {
                        "code": "330",
                        "name": "埼玉県北部",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:47+09:00"
                    },
                    {
                        "code": "331",
                        "name": "埼玉県南部",
                        "forecastMaxInt": { "from": "5-", "to": "5-" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:48+09:00"
                    },
                    {
                        "code": "321",
                        "name": "群馬県南部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:49+09:00"
                    },
                    {
                        "code": "350",
                        "name": "東京都２３区",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:51+09:00"
                    },
                    {
                        "code": "342",
                        "name": "千葉県南部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:52+09:00"
                    },
                    {
                        "code": "371",
                        "name": "新潟県中越",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:52+09:00"
                    },
                    {
                        "code": "375",
                        "name": "新潟県佐渡",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "1", "to": "1" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:56+09:00"
                    },
                    {
                        "code": "420",
                        "name": "長野県北部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:56+09:00"
                    },
                    {
                        "code": "360",
                        "name": "神奈川県東部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:57+09:00"
                    },
                    {
                        "code": "370",
                        "name": "新潟県上越",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:57+09:00"
                    },
                    {
                        "code": "352",
                        "name": "東京都多摩西部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "1", "to": "1" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:48:59+09:00"
                    },
                    {
                        "code": "351",
                        "name": "東京都多摩東部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:00+09:00"
                    },
                    {
                        "code": "106",
                        "name": "渡島地方東部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:05+09:00"
                    },
                    {
                        "code": "107",
                        "name": "渡島地方西部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:05+09:00"
                    },
                    {
                        "code": "151",
                        "name": "日高地方中部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:13+09:00"
                    },
                    {
                        "code": "110",
                        "name": "檜山地方",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:14+09:00"
                    },
                    {
                        "code": "411",
                        "name": "山梨県中・西部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:14+09:00"
                    },
                    {
                        "code": "146",
                        "name": "胆振地方中東部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:23+09:00"
                    },
                    {
                        "code": "145",
                        "name": "胆振地方西部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:25+09:00"
                    },
                    {
                        "code": "102",
                        "name": "石狩地方南部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:26+09:00"
                    },
                    {
                        "code": "356",
                        "name": "新島",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:26+09:00"
                    },
                    {
                        "code": "390",
                        "name": "石川県能登",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:26+09:00"
                    },
                    {
                        "code": "421",
                        "name": "長野県中部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:14+09:00"
                    },
                    {
                        "code": "355",
                        "name": "伊豆大島",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:16+09:00"
                    },
                    {
                        "code": "440",
                        "name": "静岡県伊豆",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:16+09:00"
                    },
                    {
                        "code": "441",
                        "name": "静岡県東部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:18+09:00"
                    },
                    {
                        "code": "100",
                        "name": "石狩地方北部",
                        "forecastMaxInt": { "from": "4", "to": "4" },
                        "forecastMaxLgInt": { "from": "2", "to": "2" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:49:36+09:00"
                    },
                    {
                        "code": "521",
                        "name": "大阪府南部",
                        "forecastMaxInt": { "from": "3", "to": "3" },
                        "forecastMaxLgInt": { "from": "3", "to": "3" },
                        "isPlum": false,
                        "isWarning": true,
                        "kind": { "name": "緊急地震速報（警報）", "code": "10" },
                        "arrivalTime": "2011-03-11T14:50:35+09:00"
                    }
                ]
            },
            "comments": {
                "warning": {
                    "text": "強い揺れに警戒してください。",
                    "codes": ["0201"]
                }
            }
        }
    };
    
    const compressed = gzipSync(JSON.stringify(d));
    SOCKET.EmulateMessageInternally(JSON.stringify(
        { "type": "data", "version": "2.0", "id": "44a7b424f0512f53edd94b66c4f5bedee8a490dae1d8cbdf154bc3d14609062b4c69f3d833dde73c7a95c752399e6d5d", "originalId": "7bae091f882328dd8064f29e62d444402f779a46e4dc06c8f964a52da61e4d04bc53f1317a777256b9ba1a02fe6e46ac", "classification": "eew.forecast", "passing": [{ "name": "socket-03", "time": "2025-01-25T23:12:12.976Z" }, { "name": "ires-13", "time": "2025-01-25T23:12:12.978Z" }, { "name": "json-03", "time": "2025-01-25T23:12:12.982Z" }, { "name": "ires-13", "time": "2025-01-25T23:12:12.984Z" }, { "name": "websocket-02", "time": "2025-01-25T23:12:13.002Z" }], "head": { "type": "VXSE44", "author": "JPOS", "time": "2025-01-25T23:12:00.000Z", "designation": null, "test": false }, "xmlReport": { "control": { "title": "緊急地震速報（予報）", "dateTime": "2025-01-25T23:12:12Z", "status": "通常", "editorialOffice": "大阪管区気象台", "publishingOffice": "気象庁" }, "head": { "title": "緊急地震速報（予報）", "reportDateTime": "2025-01-26T08:12:12+09:00", "targetDateTime": "2025-01-26T08:12:12+09:00", "eventId": "20250126081132", "serial": "4", "infoType": "発表", "infoKind": "緊急地震速報", "infoKindVersion": "1.0_0", "headline": null } }, "format": "json", "schema": { "type": "eew-information", "version": "1.0.0" }, "compression": "gzip", "encoding": "base64", "body": compressed.toString('base64') }
    ))
}






export const RecentEarthquakeSlashCommand = new SlashCommandBuilder()
    .setName('recent-eq').setNameLocalization('ja', '地震')
    .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency').setDescriptionLocalization('ja', '気象庁から最近の地震データを見る')
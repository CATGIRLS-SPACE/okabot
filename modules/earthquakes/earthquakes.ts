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
    SOCKET.on(WebSocketEvent.EARTHQUAKE_REPORT, async (data: EarthquakeInformationSchemaBody) => {
        // make embed
        const embed = await BuildEarthquakeEmbed(
            new Date(data.reportDateTime), 
            data.earthquake.magnitude.value,
            data.intensity.maxInt,
            data.earthquake.hypocenter.depth.value, //this is actually depth 
            data.earthquake.hypocenter.name, 
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

        let message = `:warning: **EEW Forecast** issued for ${locations_english[data.earthquake.hypocenter.name]}\nMax expected intensity of ${GetEmoji(SHINDO_EMOJI[data.intensity.forecastMaxInt.to])}!`;

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

        let message = `:sos: **EEW Warning** issued for ${locations_english[data.earthquake.hypocenter.name]}\nMax expected intensity of ${GetEmoji(SHINDO_EMOJI[data.intensity.forecastMaxInt.to])}!`;

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


export function DoEarthquakeTest(data: any) {
    // const d = {"_originalId":"a5ae7db672a013e06e594be8cf60dba87cbcfe64d4b4fbf1dba3253bd87272dd0d27b481c76e48bc3267369b548fc000","_schema":{"type":"eew-information","version":"1.0.0"},"type":"緊急地震速報（予報）","title":"緊急地震速報（予報）","status":"通常","infoType":"発表","editorialOffice":"気象庁本庁","publishingOffice":["気象庁"],"pressDateTime":"2025-02-02T08:13:26Z","reportDateTime":"2025-02-02T17:13:26+09:00","targetDateTime":"2025-02-02T17:13:26+09:00","eventId":"20250202171318","serialNo":"1","infoKind":"緊急地震速報","infoKindVersion":"1.0_0","headline":null,"body":{"isLastInfo":false,"isCanceled":false,"isWarning":false,"earthquake":{"originTime":"2025-02-02T17:13:09+09:00","arrivalTime":"2025-02-02T17:13:18+09:00","hypocenter":{"code":"289","name":"福島県沖","coordinate":{"latitude":{"text":"37.1˚N","value":"37.1000"},"longitude":{"text":"141.2˚E","value":"141.2000"},"height":{"type":"高さ","unit":"m","value":"-50000"},"geodeticSystem":"日本測地系"},"depth":{"type":"深さ","unit":"km","value":"50"},"reduce":{"code":"9739","name":"福島沖"},"landOrSea":"海域","accuracy":{"epicenters":["4","4"],"depth":"4","magnitudeCalculation":"5","numberOfMagnitudeCalculation":"1"}},"magnitude":{"type":"マグニチュード","value":"4.2","unit":"Mj"}},"intensity":{"forecastMaxInt":{"from":"3","to":"3"},"regions":[]}}};
    
    const compressed = gzipSync(JSON.stringify(data));
    SOCKET.EmulateMessageInternally(JSON.stringify(
        { "type": "data", "version": "2.0", "id": "44a7b424f0512f53edd94b66c4f5bedee8a490dae1d8cbdf154bc3d14609062b4c69f3d833dde73c7a95c752399e6d5d", "originalId": "7bae091f882328dd8064f29e62d444402f779a46e4dc06c8f964a52da61e4d04bc53f1317a777256b9ba1a02fe6e46ac", "classification": "eew.forecast", "passing": [{ "name": "socket-03", "time": "2025-01-25T23:12:12.976Z" }, { "name": "ires-13", "time": "2025-01-25T23:12:12.978Z" }, { "name": "json-03", "time": "2025-01-25T23:12:12.982Z" }, { "name": "ires-13", "time": "2025-01-25T23:12:12.984Z" }, { "name": "websocket-02", "time": "2025-01-25T23:12:13.002Z" }], "head": { "type": "VXSE44", "author": "JPOS", "time": "2025-01-25T23:12:00.000Z", "designation": null, "test": false }, "xmlReport": { "control": { "title": "緊急地震速報（予報）", "dateTime": "2025-01-25T23:12:12Z", "status": "通常", "editorialOffice": "大阪管区気象台", "publishingOffice": "気象庁" }, "head": { "title": "緊急地震速報（予報）", "reportDateTime": "2025-01-26T08:12:12+09:00", "targetDateTime": "2025-01-26T08:12:12+09:00", "eventId": "20250126081132", "serial": "4", "infoType": "発表", "infoKind": "緊急地震速報", "infoKindVersion": "1.0_0", "headline": null } }, "format": "json", "schema": { "type": "eew-information", "version": "1.0.0" }, "compression": "gzip", "encoding": "base64", "body": compressed.toString('base64') }
    ))
}






export const RecentEarthquakeSlashCommand = new SlashCommandBuilder()
    .setName('recent-eq').setNameLocalization('ja', '地震')
    .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency').setDescriptionLocalization('ja', '気象庁から最近の地震データを見る')
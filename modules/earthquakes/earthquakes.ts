/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    ApplicationIntegrationType,
    ChatInputCommandInteraction,
    Client,
    EmbedBuilder, InteractionContextType,
    Message,
    MessageFlags,
    SlashCommandBuilder,
    TextChannel
} from 'discord.js';
import {join} from 'path';
import {BASE_DIRNAME, client, DEV, CONFIG, ManuallySendErrorReport} from '../../index';
import {readFileSync} from 'fs';
import {GetLatestEarthquake} from './dmdata';
import {Logger} from 'okayulogger';
import {DMDataWebSocket} from 'lily-dmdata/socket';
import {Classification, EarthquakeInformationSchemaBody, EEWInformationSchemaBody, WebSocketEvent} from 'lily-dmdata';
import {EMOJI, GetEmoji} from '../../util/emoji';
import {gzipSync} from 'zlib';
import {UpdateDMDataStatus} from "../http/server";
import {LangGetAutoTranslatedStringRaw} from "../../util/language";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";

const L = new Logger('earthquakes');

const locations_english: {[key: string]: string} = {};


export async function GetMostRecent(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.earthquakes)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Mabye ask a server admin to enable it?'
    });

    await interaction.deferReply();
    if (CONFIG.extra.includes('disable jma fetching')) return interaction.editReply({
        content: 'err: jma fetch disabled'
    });

    const earthquake = await GetLatestEarthquake(CONFIG.dmdata_api_key);

    // console.log(earthquake);

    const OriginTime = new Date(earthquake.originTime);
    const Magnitude = earthquake.magnitude.value;
    const MaxInt = earthquake.maxInt;
    const HypocenterName = earthquake.hypocenter.name;
    const HypocenterDepth = earthquake.hypocenter.depth.value;

    const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterDepth, HypocenterName, false, interaction.okabot.translateable_locale);
    
    const reports_xml = await fetch('https://www3.nhk.or.jp/sokuho/jishin/data/JishinReport.xml');
    const report_url = (await reports_xml.text()).split('<item')[1].split('</item>')[0].split('url="')[1].split('"')[0];
    const specific_xml = await (await fetch(report_url)).text();
    const image_url = specific_xml.split('<Detail>')[1].split('</Detail>')[0];
    const embeds = [embed];
    if ('20'+image_url.split('JS00cwA0')[1].split('_')[0]==earthquake.eventId) embeds.push(new EmbedBuilder().setImage(`https://news.web.nhk/sokuho/jishin/${image_url}`));
    
    interaction.editReply({
        content: (('20'+image_url.split('JS00cwA0')[1].split('_')[0]==earthquake.eventId)?``:await LangGetAutoTranslatedStringRaw('No image rendered for this earthquake. Try again later.\n', interaction.okabot.translateable_locale))+await LangGetAutoTranslatedStringRaw('-# Earthquake image is unofficially provided by NHK.', interaction.okabot.translateable_locale),
        embeds
    });
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

export async function BuildEarthquakeEmbed(origin_time: Date, magnitude: string, max_intensity: string, depth: string, hypocenter_name: string, automatic = false, locale: string = 'en') {
    if (max_intensity == null || depth == null || magnitude == null) return new EmbedBuilder()
        .setColor(0xf76565)
        .setTitle(await LangGetAutoTranslatedStringRaw('The most recent earthquake occurred overseas', locale))
        .setAuthor({name: 'Project DM-D.S.S',iconURL:`https://bot.millie.zone/shindo/icon.png`})
        .setTimestamp(origin_time)
        .setDescription(await LangGetAutoTranslatedStringRaw('I\'m missing some information on this earthquake, so I can\'t display the full embed', locale))
        .setFields(
            {name: await LangGetAutoTranslatedStringRaw('Location', locale), value: locations_english[hypocenter_name] || await LangGetAutoTranslatedStringRaw(`No English localization for "${hypocenter_name}" found`, locale)}
        )
        .setThumbnail(`https://bot.millie.zone/shindo/unknown.png`);


    return new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(automatic ? `A Shindo ${max_intensity} earthquake occurred.` : await LangGetAutoTranslatedStringRaw('Most recent earthquake in Japan', locale))
        .setTimestamp(origin_time)
        .setAuthor({name: 'Project DM-D.S.S', url: `https://www.jma.go.jp/bosai/map.html`,iconURL:`https://bot.millie.zone/shindo/icon.png`})
        .setThumbnail(`https://bot.millie.zone/shindo/${SHINDO_IMG[max_intensity] || 'unknown.png'}`)
        .setFields(
            {name: "Maximum Measured Intensity", value: `**${max_intensity}**`, inline: true},
            {name: 'Magnitude', value: `**M${magnitude}**`, inline: true},
            {name: 'Depth', value: `**${depth} km**`, inline: true},
            {name: 'Location', value: locations_english[hypocenter_name] || hypocenter_name},
        );
}

function BuildEEWEmbed(origin_time: Date, magnitude: string, max_intensity: string, depth: string, hypocenter_name: string, event: {message: any, report_count: number, is_warning: boolean}) {
    return new EmbedBuilder()
        .setColor(event.is_warning ? 0xd61111 : 0xff8519)
        .setTitle((event.is_warning ? 'Earthquake Early Warning' : 'Earthquake Early Warning (Forecast)') + (event.report_count == 999 ? ' (Final Report)' : ` (Report ${event.report_count})`))
        .setTimestamp(origin_time)
        .setAuthor({name: 'Project DM-D.S.S', url: `https://www.jma.go.jp/bosai/map.html`,iconURL:`https://bot.millie.zone/shindo/icon.png`})
        .setThumbnail(`https://bot.millie.zone/shindo/${SHINDO_IMG[max_intensity] || 'unknown.png'}`)
        .setFields(
            {name: "Maximum Expected Intensity", value: `**${max_intensity}**`, inline: true},
            {name: 'Magnitude', value: `**M${magnitude}**`, inline: true},
            {name: 'Depth', value: `**${depth} km**`, inline: true},
            {name: 'Location', value: locations_english[hypocenter_name]},
        );
}


let MONITORING_CHANNEL = "1313343448354525214"; // #earthquakes (CC)
export let SOCKET: DMDataWebSocket;
const EXISTING_EARTHQUAKES = new Map<string, {message: Message, report_count: number, is_warning: boolean}>();
const EXISTING_EARTHQUAKES_BY_ORIGIN_TIME = new Map<string, Message>();
let reconnect_tries = 0;

export function open_socket(SOCKET: DMDataWebSocket, channel: TextChannel) {
    SOCKET.OpenSocket({
        classifications: [
            Classification.EEW_FORECAST,
            Classification.EEW_WARNING,
            Classification.TELEGRAM_EARTHQUAKE
        ]
    });

    setTimeout(() => {
        if (!SOCKET.is_active) {
            channel.send({
                content: ':x: dmdata connection failure. i will not retry, as this was the startup connection attempt. run "oka dmdata connect" to retry.'
            });
        }
    }, 10000);
}

function reopen_socket(SOCKET: DMDataWebSocket, channel: TextChannel) {
    SOCKET.OpenSocket({
        classifications: [
            Classification.EEW_FORECAST,
            Classification.EEW_WARNING,
            Classification.TELEGRAM_EARTHQUAKE
        ]
    });

    setTimeout(() => {
        if (!SOCKET.is_active) {
            L.debug('failed to reconnect!');
            reconnect_tries++;
            if (reconnect_tries < 6) {
                channel.send({
                    content: `attempt ${reconnect_tries} failed to reconnect after 10 seconds, retrying...`,
                    flags: [MessageFlags.SuppressNotifications]
                });
                reopen_socket(SOCKET, channel);
            } else {
                channel.send({
                    content: `attempt ${reconnect_tries} failed to reconnect after 10 seconds. i have given up reconnecting. manually run "oka dmdata connect" to retry`,
                    flags: [MessageFlags.SuppressNotifications]
                });
            }
        } else {
            channel.send({
                content: `ok, i reconnected after ${reconnect_tries} tries.`
            });
            reconnect_tries = 0;
        }
    }, 10000);
}

/**
 * This function will load all dmdata locations then connect to the DMData websocket.
 * It will listen for Earthquake Forecasts, Warnings, and Reports, and send them to the
 * proper channel upon delivery.
 * @param client Passed client variable from index.ts
 * @param disable_fetching Load earthquake locations but don't connect to websocket
 */
export async function StartEarthquakeMonitoring(client: Client, disable_fetching: boolean = false) {
    L.info('Loading all locations...');

    if (DEV) MONITORING_CHANNEL = "858904835222667315";

    const data = readFileSync(join(BASE_DIRNAME, 'assets', 'earthquakes', 'Epicenters.txt'), 'utf-8');
    const lines = data.split('\n');
    lines.forEach(line => {
        const key = line.split(',')[1];
        locations_english[key] = line.split(',')[2];
    });

    L.info('Loaded all locations!');

    if (disable_fetching) return L.warn('Earthquake monitoring is disabled. lily-dmdata won\'t run!');

    L.info('Starting Earthquake Monitoring...');

    // new
    SOCKET = new DMDataWebSocket(CONFIG.dmdata_api_key, 'okabot', false);
    MONITORING_CHANNEL = !DEV?"1313343448354525214":"858904835222667315"; // reassign because discordjs is stupid
    const channel = client.channels.cache.get(MONITORING_CHANNEL);
    
    // this will need massive changes!! lily-dmdata is broken!
    SOCKET.on(WebSocketEvent.EARTHQUAKE_REPORT, async (data: EarthquakeInformationSchemaBody) => {
        // make embed
        console.log(data);

        if (!data.intensity || !data.earthquake) return;

        const embed = await BuildEarthquakeEmbed(
            new Date((data.earthquake || {originTime:0}).originTime), 
            (data.earthquake || {magnitude:{value:'[unknown]'}}).magnitude.value,
            data.intensity.maxInt,
            data.earthquake.hypocenter.depth.value, //this is actually depth <-- no shit sherlock??
            data.earthquake.hypocenter.name, 
            true
        );

        if (EXISTING_EARTHQUAKES_BY_ORIGIN_TIME.has(data.earthquake.originTime)) {
            const event = EXISTING_EARTHQUAKES_BY_ORIGIN_TIME.get(data.earthquake.originTime);
            event!.reply({embeds:[embed], flags:data.intensity.maxInt=="1"||data.intensity.maxInt=="2"?[MessageFlags.SuppressNotifications]:[]});
            EXISTING_EARTHQUAKES_BY_ORIGIN_TIME.delete(data.earthquake.originTime);
            return;
        }

        // send embed
        (channel as TextChannel)!.send({embeds:[embed], flags:data.intensity.maxInt=="1"||data.intensity.maxInt=="2"?[MessageFlags.SuppressNotifications]:[]});
    });

    SOCKET.on(WebSocketEvent.PING, () => {
        // L.debug('dmdata ping');
    });

    SOCKET.on(WebSocketEvent.OPENED, () => {
        L.debug('dmdata connection opened ok!');
        (channel as TextChannel)!.send({
            content:`DMData socket opened successfully ᓀ‸ᓂ`,
            flags:[MessageFlags.SuppressNotifications]
        });
        UpdateDMDataStatus(true);
    });

    SOCKET.on(WebSocketEvent.CLOSED, () => {
        L.debug('dmdata connection closed!');
        (channel as TextChannel)!.send({
            content:'i was disconnected from dmdata, i will try to reconnect in 3 seconds...',
            flags:[MessageFlags.SuppressNotifications]
        });

        UpdateDMDataStatus(false);

        setTimeout(() => {
            reopen_socket(SOCKET, (channel as TextChannel)!);
            reconnect_tries++;
        }, 3000);
    });

    SOCKET.on(WebSocketEvent.EEW_FORECAST, async (data: EEWInformationSchemaBody) => {
        L.debug('WebSocketEvent.EEW_FORECAST');
        console.log(data);

        let forecastMaxInt = (data.intensity || {forecastMaxInt: {to: 'unknown'}}).forecastMaxInt.to;
        // @ts-expect-error this is an unknown issue with dmdata, i need to read up on the docs
        if (forecastMaxInt == 'over' && data.isLastInfo) forecastMaxInt = (data.intensity || {forecastMaxInt: {from: 'unknown'}}).forecastMaxInt.from;

        let embed = BuildEEWEmbed(
            new Date((data.earthquake || {originTime:'0'}).originTime),
            (data.earthquake || {magnitude:{value:'[unknown]'}}).magnitude.value,
            forecastMaxInt,
            data.earthquake.hypocenter.depth.value,
            data.earthquake.hypocenter.name,
            {message: undefined, report_count: parseInt(data.serialNo), is_warning: data.isWarning}
        );

        if (EXISTING_EARTHQUAKES.has(data.eventId)) {
            const event = EXISTING_EARTHQUAKES.get(data.eventId)!;
            event.report_count += 1;
            EXISTING_EARTHQUAKES.set(data.eventId, {message:event.message, report_count:data.isLastInfo?999:parseInt(data.serialNo), is_warning:data.isWarning});

            event.report_count = data.isLastInfo?999:parseInt(data.serialNo);

            embed = BuildEEWEmbed(
                new Date((data.earthquake || {originTime:'0'}).originTime),
                (data.earthquake || {magnitude:{value:'[unknown]'}}).magnitude.value,
                forecastMaxInt,
                data.earthquake.hypocenter.depth.value,
                data.earthquake.hypocenter.name,
                event
            );

            return await event.message.edit({
                embeds: [embed]
            });
        }

        try {
            const sent = await (channel as TextChannel)!.send({
                content:'',
                embeds: [embed]
            });
            EXISTING_EARTHQUAKES.set(data.eventId, {message:sent, is_warning: false, report_count: 1});
            EXISTING_EARTHQUAKES_BY_ORIGIN_TIME.set(data.earthquake.originTime, sent);
        } catch (err: any) {
            L.error(err);
        }
    });

    SOCKET.on(WebSocketEvent.EEW_WARNING, async (data: EEWInformationSchemaBody) => {
        console.log(data);

        let forecastMaxInt = (data.intensity || {forecastMaxInt: {to: 'unknown'}}).forecastMaxInt.to;
        // @ts-expect-error this is an unknown issue with dmdata, i need to read up on the docs
        if (forecastMaxInt == 'over' && data.isLastInfo) forecastMaxInt = (data.intensity || {forecastMaxInt: {from: 'unknown'}}).forecastMaxInt.from;

        let embed;

        try {
            embed = BuildEEWEmbed(
                new Date((data.earthquake || {originTime:'0'}).originTime),
                (data.earthquake || {magnitude:{value:'[unknown]'}}).magnitude.value,
                forecastMaxInt,
                data.earthquake.hypocenter.depth.value,
                data.earthquake.hypocenter.name,
                {message: undefined, report_count: parseInt(data.serialNo), is_warning: data.isWarning}
            );
        } catch (err) {
            L.error('Failed to build embed!');
            return ManuallySendErrorReport(`WebSocketEvent.EEW_WARNING: failed to build embed.\n${err}`, true);
        }

        if (EXISTING_EARTHQUAKES.has(data.eventId)) {
            const event = EXISTING_EARTHQUAKES.get(data.eventId)!;
            if (!event.is_warning) await event.message.reply({content:`${GetEmoji(EMOJI.EPICENTER)} EEW Forecast was upgraded to EEW Warning!`})
            event.report_count = data.isLastInfo?999:parseInt(data.serialNo);
            event.is_warning = true;

            EXISTING_EARTHQUAKES.set(data.eventId, event);

            embed = BuildEEWEmbed(
                new Date((data.earthquake || {originTime:'0'}).originTime),
                data.earthquake.magnitude.value,
                forecastMaxInt,
                data.earthquake.hypocenter.depth.value,
                data.earthquake.hypocenter.name,
                event
            );

            return event.message.edit({
                embeds: [embed]
            });
        }

        try {
            const sent = await (channel as TextChannel)!.send({
                content:'',
                embeds: [embed]
            });
            EXISTING_EARTHQUAKES.set(data.eventId, {message:sent, is_warning: true, report_count: 1});
            EXISTING_EARTHQUAKES_BY_ORIGIN_TIME.set(data.earthquake.originTime, sent);
        } catch (err: any) {
            L.error(err);
        }
    });

    open_socket(SOCKET, (channel as TextChannel)!);
}

// lat_min 	    lat_max 	lon_min 	    lon_max
// 20.2145811 	45.7112046 	122.7141754 	154.205541

// export function RenderNewEarthquakeImage() {
//     const SAVE_LOCATION = join(BASE_DIRNAME, 'temp', 'earthquake.png');
//     const canvas = createCanvas(500, 500);
//
//
//     // save image
//     const buffer = canvas.toBuffer('image/png');
//     if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
//     writeFileSync(join(BASE_DIRNAME, 'temp', 'render-stock.png'), buffer);
// }


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
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
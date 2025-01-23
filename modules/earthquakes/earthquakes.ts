import { EmbedBuilder, ChatInputCommandInteraction, Client, TextChannel, SlashCommandBuilder } from 'discord.js';
import { join } from 'path';
import { BASE_DIRNAME, client, DMDATA_API_KEY } from '../..';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { createCanvas } from 'canvas';
import { GetLatestEarthquake } from './dmdata';
import { Logger } from 'okayulogger';

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

export async function BuildEarthquakeEmbed(origin_time: Date, magnitude: string, max_intensity: string, depth: string, hypocenter_name: string, automatic = false) {
    const embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(automatic?'New entry in Japan earthquake data feed':'Most recent earthquake in Japan')
        .setTimestamp(origin_time)
        .setAuthor({name:'Japan Meteorological Agency',url:`https://www.jma.go.jp/bosai/map.html`})
        .setThumbnail(`https://bot.lilycatgirl.dev/shindo/${SHINDO_IMG[max_intensity] || 'unknown.png'}`)
        .setFields(
            {name:"Maximum Intensity", value: `**${max_intensity}**`, inline: true},
            {name:'Magnitude', value: `**M${magnitude}**`, inline: true},
            {name:'Depth', value: `**${depth} km**`, inline: true},
            {name:'Location', value: locations_english[hypocenter_name]},
        );
        
    return embed;
}

const MONITORING_CHANNEL = "1313343448354525214"; // #earthquakes (CC)
// const MONITORING_CHANNEL = "858904835222667315" // # bots (obp)
let last_known_quake = {};

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

    if (disable_fetching) return;

    L.info('Starting Earthquake Monitoring...');

    try {
        const feed = await fetch(URL);
        const list = await feed.json();
        last_known_quake = list[0].json;

        setInterval(() => RunEarthquakeFetch(client), 30*1000);
    } catch (err) {
        console.error();
    }
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


export async function SendNewReportNow() {
    const earthquake = await GetLatestEarthquake(DMDATA_API_KEY);

    const OriginTime = new Date(earthquake.originTime);
    const Magnitude = earthquake.magnitude.value;
    const MaxInt = earthquake.maxInt;
    const HypocenterName = earthquake.hypocenter.name;
    const HypocenterDepth = earthquake.hypocenter.depth.value;

    const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterDepth, HypocenterName, true);

    // send embed
    const channel = client.channels.cache.get(MONITORING_CHANNEL);
    (channel as TextChannel)!.send({embeds:[embed]});
}


export const RecentEarthquakeSlashCommand = new SlashCommandBuilder()
    .setName('recent-eq').setNameLocalization('ja', '地震')
    .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency').setDescriptionLocalization('ja', '気象庁から最近の地震データを見る')
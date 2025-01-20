import { EmbedBuilder, ChatInputCommandInteraction, Client, TextChannel, SlashCommandBuilder } from 'discord.js';

const URL = 'https://www.jma.go.jp/bosai/quake/data/list.json';
const INDV_URL = 'https://www.jma.go.jp/bosai/quake/data/'

const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
]


export async function GetMostRecent(interaction: ChatInputCommandInteraction) {
    const feed = await fetch(URL);
    const list = await feed.json();

    let item = list[0];

    const info = await fetch(`${INDV_URL}${item.json}`);
    const earthquake = await info.json();

    const OriginTime = new Date(earthquake.Body.Earthquake.OriginTime);
    const Magnitude = earthquake.Body.Earthquake.Magnitude;
    const MaxInt = earthquake.Body.Intensity.Observation.MaxInt;
    const HypocenterName = earthquake.Body.Earthquake.Hypocenter.Area.enName;
    const HypocenterCoords = earthquake.Body.Earthquake.Hypocenter.Area.Coordinate;

    const month = OriginTime.getMonth()+1<10?`0${OriginTime.getMonth()+1}`:OriginTime.getMonth()+1;
    const day = OriginTime.getDate()<10?`0${OriginTime.getDate()}`:OriginTime.getDate();
    const hour = OriginTime.getHours()<10?`0${OriginTime.getHours()}`:OriginTime.getHours();
    const minute = OriginTime.getMinutes()<10?`0${OriginTime.getMinutes()}`:OriginTime.getMinutes();
    const readableDate = `Most recent earthquake was **${DAYS_OF_WEEK[OriginTime.getDay()]}, ${OriginTime.getFullYear()}-${month}-${day}, ${hour}:${minute}**.`;

    const lat = HypocenterCoords.split('+')[1];
    const lon = HypocenterCoords.split('+')[2].split('-')[0];
    const depth = HypocenterCoords.split('-')[1].split('/')[0] / 1000; // in km, 10000 = 10km

    const readableMeta = `Maximum Intensity of Shindo ${MaxInt}, approx M${Magnitude}. Depth of ${depth} km`;
    const readableLoc = `Hypocenter location: ${HypocenterName} (${HypocenterCoords}).`

    const disclaimer = '-# Times are provided in UTC-6 format, relative to the DST condition of the hosting environment.';

    // interaction.editReply({
    //     content: `${readableDate}\n${readableMeta}\n${readableLoc}\n${disclaimer}`,
    //     ephemeral: false
    // });

    const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterCoords, HypocenterName);
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

async function BuildEarthquakeEmbed(origin_time: Date, magnitude: number, max_intensity: number, hypocenter_coords: string, hypocenter_name: string, automatic = false) {
    // example: +34.0+133.0-10000/
    const lat = hypocenter_coords.split('+')[1];
    const lon = hypocenter_coords.split('+')[2].split('-')[0];
    const depth = parseInt(hypocenter_coords.split('-')[1].split('/')[0]) / 1000; // in km, 10000 = 10km

    const embed = new EmbedBuilder()
        .setColor(0x42f5da)
        .setTitle(automatic?'New entry in Japan earthquake data feed':'Most recent earthquake in Japan')
        .setTimestamp(origin_time)
        .setAuthor({name:'Japan Meteorological Agency',url:`https://www.jma.go.jp/bosai/map.html#11/${lat}/${lon}/&elem=int&contents=earthquake_map`})
        .setThumbnail(`https://bot.lilycatgirl.dev/shindo/${SHINDO_IMG[max_intensity] || 'unknown.png'}`)
        .setFields(
            {name:"Maximum Intensity", value: `**${max_intensity}**`, inline: true},
            {name:'Magnitude', value: `**M${magnitude}**`, inline: true},
            {name:'Depth', value: `**${depth} km**`, inline: true},
            {name:'Location', value: hypocenter_name},
        );
        
    return embed;
}

const MONITORING_CHANNEL = "1313343448354525214"; // #earthquakes (CC)
// const MONITORING_CHANNEL = "858904835222667315" // # bots (obp)
let last_known_quake = {};

export async function StartEarthquakeMonitoring(client: Client) {
    console.log('Starting Earthquake Monitoring...')
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
async function RunEarthquakeFetch(client: Client) {
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

        const OriginTime = new Date(earthquake.Body.Earthquake.OriginTime);
        const Magnitude = earthquake.Body.Earthquake.Magnitude;
        const MaxInt = earthquake.Body.Intensity.Observation.MaxInt;
        const HypocenterName = earthquake.Body.Earthquake.Hypocenter.Area.enName;
        const HypocenterCoords = earthquake.Body.Earthquake.Hypocenter.Area.Coordinate;

        // make embed
        const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterCoords, HypocenterName, true);

        // send embed
        const channel = client.channels.cache.get(MONITORING_CHANNEL);
        (channel as TextChannel)!.send({embeds:[embed]});
    } catch (err) {
        console.error(`RunEarthquakeFetch error: ${err}`);
    }
}


export const RecentEarthquakeSlashCommand = new SlashCommandBuilder()
    .setName('recent-eq').setNameLocalization('ja', '地震')
    .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency').setDescriptionLocalization('ja', '気象庁から最近の地震データを見る')
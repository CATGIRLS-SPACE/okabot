const rssParser = require('rss-parser');
const xmlParser = require('xml-parser');
const parser = new rssParser();
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs')

const URL = 'https://www.data.jma.go.jp/developer/xml/feed/eqvol.xml';
const JSON_URL = 'https://www.jma.go.jp/bosai/quake/data/';

const DAYS_OF_WEEK = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
]

/**
 * 
 * @param {import("discord.js").Interaction<import("discord.js").CacheType>} interaction 
 */
async function GetMostRecent(interaction) {
    const feed = await parser.parseURL(URL);
    
    let item = '';
    feed.items.forEach(entry => {
        if (item != '') return;

        if (entry.content.includes('地震') && !entry.title.includes('火山')) {
            console.log(`chose ${entry.id}`);
            item = entry.id.split('https://www.data.jma.go.jp/developer/xml/data/')[1].split('.xml')[0];
        }
    });


    const info = await fetch(JSON_URL + item);

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
    const depth = HypocenterCoords.split('-')[1] / 1000; // in km, 10000 = 10km

    const readableMeta = `Maximum Intensity of Shindo ${MaxInt}, approx M${Magnitude}. Depth of ${depth} km`;
    const readableLoc = `Hypocenter location: ${HypocenterName} (${HypocenterCoords}).`

    const disclaimer = '-# Times are provided in UTC-6 format, relative to the DST condition of the hosting environment.';

    interaction.editReply({
        content: `${readableDate}\n${readableMeta}\n${readableLoc}\n${disclaimer}`,
        ephemeral: false
    });

    // const embed = await BuildEarthquakeEmbed(OriginTime, Magnitude, MaxInt, HypocenterCoords, HypocenterName);
    // interaction.editReply({embeds:[embed]})
}


async function BuildEarthquakeEmbed(origin_time, magnitude, max_intensity, hypocenter_coords, hypocenter_name) {
    // example: +34.0+133.0-10000/
    const lat = hypocenter_coords.split('+')[1];
    const lon = hypocenter_coords.split('+')[2].split('-')[0];
    const depth = hypocenter_coords.split('-')[1] / 1000; // in km, 10000 = 10km

    const imageBuffer = await BuildEpicenterImage(lat, lon);
    fs.writeFileSync('./temp/earthquake.png', imageBuffer);
}

async function BuildEpicenterImage(latitude, longitude) {
    const width = 1397;
    const height = 1593;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const map = await loadImage('./assets/earthquakes/Japan_large_trans.png');
    ctx.drawImage(map, 0, 0, width, height);

    // Convert lat/lon to x/y (use a mapping library for precise projection)
    const x = ((longitude - lonMin) / (lonMax - lonMin)) * width;
    const y = ((latMax - latitude) / (latMax - latMin)) * height;

    // Draw a red X at the hypocenter
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 10);
    ctx.lineTo(x + 10, y + 10);
    ctx.moveTo(x - 10, y + 10);
    ctx.lineTo(x + 10, y - 10);
    ctx.stroke();

    return canvas.toBuffer();
}

module.exports = { GetMostRecent }
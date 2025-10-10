import sharp from "sharp";
import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Message,
    MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    TextChannel
} from "discord.js";
import {existsSync, readdirSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
// import {Achievements, GrantAchievement} from "../passive/achievement";
import {BASE_DIRNAME} from "../../index";
import {GetUserSupportStatus} from "../../util/users";
import {CheckFeatureAvailability, ServerFeature} from "../system/serverPrefs";

async function pixelateImage(input: Buffer, pixelSize = 10): Promise<Buffer> {
    const img = sharp(input).ensureAlpha(); // force RGBA
    const { width, height } = await img.metadata();
    if (!width || !height) throw new Error("Invalid image");

    const raw = await img.raw().toBuffer(); // get raw RGBA data
    const channels = 4; // RGBA
    const data = Buffer.from(raw); // copy

    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            // pick top-left pixel as block color
            const idx = (y * width + x) * channels;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const a = data[idx + 3];

            // fill block
            for (let dy = 0; dy < pixelSize; dy++) {
                for (let dx = 0; dx < pixelSize; dx++) {
                    const px = x + dx;
                    const py = y + dy;
                    if (px < width && py < height) {
                        const pidx = (py * width + px) * channels;
                        data[pidx] = r;
                        data[pidx + 1] = g;
                        data[pidx + 2] = b;
                        data[pidx + 3] = a;
                    }
                }
            }
        }
    }

    return sharp(data, { raw: { width, height, channels } }).resize(width, height, {kernel:'nearest'}).png().toBuffer();
}

let has_loaded_db = false;
const current_games = new Map<Snowflake, { message: Snowflake, answer: string, rid: number, post_id: number }>();
const current_streaks = new Map<Snowflake, number>();

export async function GuessBlueArchive(interaction: ChatInputCommandInteraction) {
    if (!CheckFeatureAvailability(interaction.guild!.id, ServerFeature.pixelguess)) return interaction.reply({
        content: 'This feature isn\'t available in this server. Mabye ask a server admin to enable it?'
    });

    if (!has_loaded_db) {
        const db_path = join(BASE_DIRNAME, 'db', 'pixel.oka');
        if (!existsSync(db_path)) writeFileSync(db_path, '{"scores":{}}')
        const db: {[key: string]: number} = JSON.parse(readFileSync(db_path, 'utf-8')).scores;
        for (const key of Object.keys(db)) current_streaks.set(key, db[key]);
        has_loaded_db = true;
    }

    if (interaction.guild && interaction.guild.id == '1348652647963561984' && GetUserSupportStatus(interaction.user.id) == 'none') return interaction.reply({content:':warning: Something went wrong while starting the game:\n```(OkabotAccessError) This guild is not eligible for this interaction when used in the default user context.```'});
    if (current_games.has(interaction.user.id)) return interaction.reply({content:'You\'ve already got a guessing game going!',flags:[MessageFlags.Ephemeral]});

    await interaction.deferReply();

    const allowed_students = readdirSync(join(BASE_DIRNAME, 'assets', 'ggba')).map(entry => entry.split('.png')[0]);
    let picked = allowed_students[Math.floor(Math.random() * allowed_students.length)];
    if (picked.includes(' (')) picked = picked.slice(0, picked.indexOf(' ('));
    // console.log(picked);
    const danbooru_response = await fetch(`https://safebooru.donmai.us/posts.json?tags=rating:g+${picked}_(blue_archive)+1girl&page=${Math.floor(Math.random() * 5) + 1}&limit=10`);
    const listing = await danbooru_response.json();
    if (listing.length == 0) return interaction.editReply({
        content: ':warning: Something went wrong while starting the game:\n```Danbooru response was length of 0```'
    });
    const chosen = listing[Math.floor(Math.random() * listing.length)];
    // console.log(picked, chosen);
    const image_asset_res = (await fetch(chosen.media_asset.variants.at(-1).url));
    const arrayBuffer = await image_asset_res.arrayBuffer();

    let pixelated;

    try {
        pixelated = await pixelateImage(Buffer.from(arrayBuffer), 50);
    } catch (err) {
        return interaction.editReply({
            content: `:warning: An error occurred while starting the game. Your streak hasn't been affected.\n\`\`\`${err}\`\`\``
        });
    }
    const attachment = new AttachmentBuilder(pixelated, {name:'pixelated.png'});
    interaction.editReply({
        content:`Who is this Blue Archive student?`,
        files: [attachment]
    });
    const rid = Math.random();
    current_games.set(interaction.user.id, {message: interaction.id, answer: picked, rid, post_id: chosen.id});

    setTimeout(async () => {
        if (!current_games.has(interaction.user.id)) return console.debug('game doesnt exist anymore');
        if (current_games.get(interaction.user.id)!.rid != rid) return console.debug(`rid of ${current_games.get(interaction.user.id)!.rid} does not equal my ${rid}`);

        // game still exists
        current_games.delete(interaction.user.id);
        current_streaks.set(interaction.user.id, 0);
        (await interaction.client.channels.fetch(interaction.channelId) as TextChannel).send({
            content: `<@${interaction.user.id}> Too bad! It was \`${picked}\`!`
        });
        interaction.editReply({
            content: `Who is this Blue Archive student?\nIt was: ` + picked + `\n[Source](<https://safebooru.donmai.us/posts/${chosen.id}>)`,
            files: [new AttachmentBuilder(Buffer.from(arrayBuffer), {name:'true.png'})]
        });
        UpdateStreakDB();
    }, 15_000); // 15 seconds
}

export async function CheckGuessGameMessage(message: Message) {
    if (!current_games.has(message.author.id)) return;

    const game = current_games.get(message.author.id);

    if (message.content.toLowerCase() == game?.answer) {
        current_games.delete(message.author.id);
        if (!current_streaks.has(message.author.id)) current_streaks.set(message.author.id, 1);
        else current_streaks.set(message.author.id, current_streaks.get(message.author.id)! + 1);
        message.react('✅');
        message.reply(`Yup! Your streak is now **${current_streaks.get(message.author.id)}** in a row!\n[Image Source](<https://safebooru.donmai.us/posts/${game.post_id}>)`);
        // must lazy-load because circular dependencies fuck my stupid baka life bro
        const { Achievements, GrantAchievement } = await import("../passive/achievement.js");
        if (current_streaks.get(message.author.id)! == 5) GrantAchievement(message.author, Achievements.PIXELGAME_5, message.channel as TextChannel);
        if (current_streaks.get(message.author.id)! == 10) GrantAchievement(message.author, Achievements.PIXELGAME_10, message.channel as TextChannel);
        if (current_streaks.get(message.author.id)! == 25) GrantAchievement(message.author, Achievements.PIXELGAME_25, message.channel as TextChannel);

        UpdateStreakDB();
    }
}

async function UpdateStreakDB() {
    const db_path = join(BASE_DIRNAME, 'db', 'pixel.oka');
    if (!existsSync(db_path)) writeFileSync(db_path, '{scores:[]}');
    const new_db: {[key: string]: number} = {};
    for (const key of current_streaks.keys()) {
        new_db[key] = current_streaks.get(key) || 0
    }
    writeFileSync(db_path, JSON.stringify({scores:new_db}));
}


export const GuessGameSlashCommand = new SlashCommandBuilder()
    .setName('guess')
    .setDescription('Guess a character based off a pixelated image and go for the highest streak!')
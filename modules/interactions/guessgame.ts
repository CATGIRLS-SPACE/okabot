import sharp from "sharp";
import {
    AttachmentBuilder,
    ChatInputCommandInteraction,
    Message, MessageFlags,
    SlashCommandBuilder,
    Snowflake,
    TextChannel
} from "discord.js";
import {readdirSync, readFileSync, writeFileSync} from "fs";
import {join} from "path";
import {BASE_DIRNAME} from "../../index";
import {GetUserSupportStatus} from "../../util/users";

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

    return sharp(data, { raw: { width, height, channels } }).resize(width * 2, height * 2, {kernel:'nearest'}).png().toBuffer();
}

const current_games = new Map<Snowflake, { message: Snowflake, answer: string, rid: number }>();
const current_streaks = new Map<Snowflake, number>();

export async function GuessBlueArchive(interaction: ChatInputCommandInteraction) {
    if (interaction.guild && interaction.guild.id == '1348652647963561984' && GetUserSupportStatus(interaction.user.id) == 'none') return interaction.reply({content:':warning: Something went wrong while starting the game:\n```(OkabotAccessError) This guild is not eligible for this interaction when used in the default user context.```'});
    if (current_games.has(interaction.user.id)) return interaction.reply({content:'You\'ve already got a guessing game going!',flags:[MessageFlags.Ephemeral]});

    await interaction.deferReply();

    const allowed_students = readdirSync(join(BASE_DIRNAME, 'assets', 'ggba')).map(entry => entry.split('.png')[0]);
    const picked = allowed_students[Math.floor(Math.random() * allowed_students.length)];
    // console.log(picked);
    const pixelated = await pixelateImage(readFileSync(join(BASE_DIRNAME, 'assets', 'ggba', picked + '.png')), 5);
    const attachment = new AttachmentBuilder(pixelated, {name:'pixelated.png'});
    interaction.editReply({
        content:'Who is this Blue Archive student?',
        files: [attachment]
    });
    const rid = Math.random();
    current_games.set(interaction.user.id, {message: interaction.id, answer: picked, rid});

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
            content: `Who is this Blue Archive student?\nIt was: ` + picked,
            files: [new AttachmentBuilder(readFileSync(join(BASE_DIRNAME, 'assets', 'ggba', picked + '.png')), {name:'true.png'})]
        });
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
        message.reply(`Yup! Your streak is now **${current_streaks.get(message.author.id)}** in a row!`);
    }
}


export const GuessGameSlashCommand = new SlashCommandBuilder()
    .setName('guess')
    .setDescription('Guess a character based off a pixelated image and go for the highest streak!')
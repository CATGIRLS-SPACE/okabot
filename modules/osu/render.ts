import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, TextChannel} from "discord.js";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import * as osu from 'osu-api-v2-js';
import {BASE_DIRNAME, CONFIG} from "../../index";
import {existsSync, mkdirSync, writeFileSync} from "fs";
import {join} from "path";
import {createWriteStream} from "node:fs";
import {finished} from "node:stream/promises";
import {Readable} from "stream";

/* Commands */

export async function HandleCommandOsuConfig(interaction: ChatInputCommandInteraction) {
    const profile = GetUserProfile(interaction.user.id);
    profile.ordr.osu_username = interaction.options.getString('osu', true);
    UpdateUserProfile(interaction.user.id, profile);
    await interaction.reply({
        content: '✅ Updated your osu! configuration.',
        flags: [MessageFlags.Ephemeral]
    });
}

let RENDER_IN_PROGRESS = false;

export async function HandleCommandOsuMulti(interaction: ChatInputCommandInteraction) {
    if (RENDER_IN_PROGRESS) return interaction.reply(":x: There's already a render in progress. Please wait a little while! (my laptop client literally cannot support more than 1 render at a time because I am lazy)")
    await interaction.deferReply();

    const score_ids = interaction.options.getString('scores', true).split(',').map(score => parseInt(score.trim()));
    if (score_ids.length == 0) return await interaction.editReply(':x: No valid scores provided.');
    if (score_ids.length > 6) return await interaction.reply(':x: Too many scores provided, you can provide at max 6.');

    const api = await osu.API.createAsync(CONFIG.osu.client_id, CONFIG.osu.secret);
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    if (!existsSync(join(BASE_DIRNAME, 'temp', 'osr'))) mkdirSync(join(BASE_DIRNAME, 'temp', 'osr'));
    if (!existsSync(join(BASE_DIRNAME, 'temp', 'osz'))) mkdirSync(join(BASE_DIRNAME, 'temp', 'osz'));

    RENDER_IN_PROGRESS = true;

    const song_id = (await api.getScore(score_ids[0])).beatmapset.id;
    const diff_id = (await api.getScore(score_ids[0])).beatmap.id; // this is sloppy
    if (!existsSync(join(BASE_DIRNAME, 'temp', 'osz', `${song_id}.osz`))) {
        const outstream = createWriteStream(join(BASE_DIRNAME, 'temp', 'osz', `${song_id}.osz`));
        const {body} = await fetch(`https://catboy.best/d/${song_id}`);
        if (!body) {
            RENDER_IN_PROGRESS = false;
            return interaction.editReply(`:x: Failed to download beatmapset \`${song_id}\``);
        }
        // @ts-expect-error i dont give a fuck
        await finished(Readable.fromWeb(body).pipe(outstream));
    }

    for (const score_id of score_ids) {
        if (!existsSync(join(BASE_DIRNAME, 'temp', 'osr', `${score_id}.osr`)))
            writeFileSync(join(BASE_DIRNAME, 'temp', 'osr', `${score_id}.osr`), await api.getReplay(score_id), 'binary');
    }

    const replays_list: string[] = score_ids.map(id => `${id}.osr`);

    try {
        const response = await fetch('http://192.168.1.118:3210/startrender', {
            method: 'POST',
            headers: {
                'Authorization': CONFIG.aes_key,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                replays: replays_list,
                song_id: diff_id
            })
        });
        if (!response.ok) {
            RENDER_IN_PROGRESS = false;
            return interaction.editReply(`:x: Failed to commission render (${response.statusText})`);
        }
    } catch (e: unknown) {
        RENDER_IN_PROGRESS = false;
        return interaction.editReply(`:x: Failed to commission render (${(e as Error).message})`);
    }

    interaction.editReply(`okaaaay, i've commissioned millie's laptop to render those replays together! (expected wait: ${.5 + ((score_ids.length - 1) * .5)}min) i'll ping you here when the render is ready! ᓀ‸ᓂ`);

    const check_render = async () => {
        const r = await fetch('http://192.168.1.118:3210/renderstatus');
        const j = await r.json();
        if (j.RENDER_STATUS == 'in-progress') {
            return setTimeout(check_render, 5_000);
        }
        if (j.RENDER_STATUS == 'failed') {
            RENDER_IN_PROGRESS = false;
            return (interaction.channel as TextChannel).send(`<@${interaction.user.id}>, the render failed, sorry... here's what millie's laptop told me:\n\`${j.RENDER_FAIL_REASON}\``)
        }
        if (j.RENDER_STATUS == 'done') {
            RENDER_IN_PROGRESS = false;
            return (interaction.channel as TextChannel).send(`<@${interaction.user.id}>, the render is done! https://momoi.millie.zone/${j.LAST_RENDER_NAME}`)
        }
    }

    setTimeout(check_render, 5_000);
}



export const OsuConfigSlashCommand = new SlashCommandBuilder()
    .setName('osu-config')
    .setDescription('Configure your osu! settings')
    .addStringOption(option => option
        .setName('username')
        .setDescription('Your osu! username')
        .setRequired(true)
    );

export const OsuMultiSlashCommand = new SlashCommandBuilder()
    .setName('osu-multi')
    .setDescription('Render one or multiple scores (max 6) at once with danser\'s knockout mode')
    .addStringOption(option => option
        .setName('scores')
        .setDescription('A comma separated list of scores (ex: "12345,67890")')
        .setRequired(true)
    );
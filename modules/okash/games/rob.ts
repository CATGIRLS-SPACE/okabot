import {AttachmentBuilder, ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder, Snowflake, TextChannel} from "discord.js";
import {AddToWallet, GetBank, GetWallet, RemoveFromBank, RemoveFromWallet} from "../wallet";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import {Achievements, GrantAchievement} from "../../passive/achievement";
import {join} from "node:path";
import {BASE_DIRNAME} from "../../../index";
import {existsSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";
import {GetUserProfile} from "../../user/prefs";
import { createCanvas, loadImage } from "canvas";
import axios from "axios";


const MESSAGES = [
    '**#USER1** robs <@#USER2> of #OKASH! Ouch!',
    '**#USER1** steals #OKASH from <@#USER2>! Yikes!',
    'Holy beans, **#USER1** takes a fat #OKASH from <@#USER2>!',
    '<@#USER2> is robbed of #OKASH by **#USER1**! I wouldn\'t let that slide!',
    'Well, <@#USER2> can say goodbye to #PRO #OKASH after being robbed by **#USER1**!'
];

const BANK_MESSAGES = [
    '**#USER** sneaks into the bank and steals #OKASH from the collected fines!',
    '**#USER** takes a fat #OKASH from the collected fines at the bank!',
    'Police are in hot pursuit after **#USER** takes #OKASH from the collected fines at the bank!'
];

const COOLDOWNS = new Map<string, number>();
export const BANK_ROBS = new Map<Snowflake, {when:number,amount:number}>();
let BANK_LAST_ROBBED = 0;

export function GetCurrentFines(): number {
    const ROB_DB_LOCATION = join(BASE_DIRNAME, 'db', 'rob.oka');
    if (!existsSync(ROB_DB_LOCATION)) writeFileSync(ROB_DB_LOCATION, '{"fined":0}');
    return JSON.parse(readFileSync(ROB_DB_LOCATION, 'utf-8')).fined;
}

export function HandleCommandRob(interaction: ChatInputCommandInteraction) {
    // if (interaction.guild?.id != "1019089377705611294") return interaction.reply({
    //     content: `:x: Sorry, but robbing isn't available yet, as we're still migrating banks to be individual servers instead of global.`,
    //     flags: [MessageFlags.Ephemeral]
    // });

    // return DrawWantedPoster(interaction);

    const d = new Date();
    if (COOLDOWNS.has(interaction.user.id) && COOLDOWNS.get(interaction.user.id)! > Math.floor(d.getTime()/1000)) return interaction.reply({
        content: `:hourglass: **${interaction.user.displayName}**, you need to wait a bit before trying to rob! Come back in <t:${COOLDOWNS.get(interaction.user.id)}:R>`,
        flags: [MessageFlags.Ephemeral]
    });

    if (interaction.options.getSubcommand(true) == 'bank') {
        const ROB_DB_LOCATION = join(BASE_DIRNAME, 'db', 'rob.oka');
        if (!existsSync(ROB_DB_LOCATION)) writeFileSync(ROB_DB_LOCATION, '{"fined":0}');

        if (BANK_LAST_ROBBED + 3_600_000 > d.getTime()) return interaction.reply({
            content: `:crying_cat_face: The bank is heavily guarded right now, come back later!`,
            flags: [MessageFlags.Ephemeral]
        });

        const bank_fine_balance = JSON.parse(readFileSync(ROB_DB_LOCATION, 'utf-8')).fined;

        if (bank_fine_balance == 0) return interaction.reply({
            content:`:crying_cat_face: There's no collected fines right now! Come back later!`,
            flags: [MessageFlags.Ephemeral] 
        });

        BANK_LAST_ROBBED = d.getTime();

        COOLDOWNS.set(interaction.user.id, Math.floor(d.getTime() / 1000) + 3600);

        const robbed_amount = Math.floor(Math.random() * bank_fine_balance) + 1; // min of 1 okash, max of all collected fines
        if (robbed_amount >= 10_000) GrantAchievement(interaction.user, Achievements.ROB_BANK_HIGH, interaction.channel as TextChannel);
        if (robbed_amount <= bank_fine_balance*0.05) GrantAchievement(interaction.user, Achievements.ROB_BANK_PUNY, interaction.channel as TextChannel);

        AddToWallet(interaction.user.id, robbed_amount);

        writeFileSync(ROB_DB_LOCATION, `{"fined":${bank_fine_balance - robbed_amount}}`);

        BANK_ROBS.set(interaction.user.id, {when:Math.ceil(d.getTime()/1000),amount:robbed_amount});

        interaction.reply({
            content: BANK_MESSAGES[Math.floor(Math.random() * BANK_MESSAGES.length)]
                .replace('#USER', interaction.user.displayName)
                .replace('#OKASH', `${GetEmoji(EMOJI.OKASH)} OKA**${robbed_amount}**`)
        });
        
        return;
    } 

    const robbed_user = interaction.options.getUser('user', true);
    const robbed_user_profile = GetUserProfile(robbed_user.id);

    if (robbed_user.id == interaction.user.id) return interaction.reply({
        content: `:x: **${interaction.user.displayName}**, you can't rob yourself!`,
        flags: [MessageFlags.Ephemeral]
    });

    if (robbed_user.bot) return interaction.reply({
        content: `:x: **${interaction.user.displayName}**, you can't rob ${robbed_user_profile.customization.global.pronouns.objective}!`,
        flags: [MessageFlags.Ephemeral]
    });

    const robbed_user_balance = GetWallet(robbed_user.id);

    if (robbed_user_balance < 250) {
        return interaction.reply({
            content: `:crying_cat_face: **${robbed_user.displayName}** has too little okash in ${robbed_user_profile.customization.global.pronouns.possessive} pockets to rob!`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    const wallet = GetWallet(interaction.user.id);
    const bank = GetBank(interaction.user.id);
    const total = wallet + bank;

    if (total < 2500) {
        return interaction.reply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you have too little okash to your name to rob! You need at least ${GetEmoji(EMOJI.OKASH)} OKA**2500**!\n-# This threshold is in place so that you can be fined in the event your robbery fails.`,
            flags: [MessageFlags.Ephemeral]
        });
    }

    // set cooldown
    COOLDOWNS.set(interaction.user.id, Math.floor(d.getTime() / 1000) + 3600);

    // chance to fail the rob
    if (Math.random() < 0.25) {
        const fine = Math.floor(Math.random() * ((total<robbed_user_balance)?total:robbed_user_balance) - 2500) + 2500;
        
        // calculate how much can be removed from wallet
        if (wallet >= fine) {
            // only need to remove from wallet
            RemoveFromWallet(interaction.user.id, fine);
        } else if (wallet > 0) {
            // can remove some from wallet but not all
            RemoveFromWallet(interaction.user.id, wallet);
            const remaining = fine - wallet;
            RemoveFromBank(interaction.user.id, remaining);
        } else {
            // nothing in wallet, must use the bank
            RemoveFromBank(interaction.user.id, fine);
        }

        const ROB_DB_LOCATION = join(BASE_DIRNAME, 'db', 'rob.oka');
        if (!existsSync(ROB_DB_LOCATION)) writeFileSync(ROB_DB_LOCATION, `{"fined":0}`);
        const bank_fine_balance = JSON.parse(readFileSync(ROB_DB_LOCATION, 'utf-8')).fined;
        writeFileSync(ROB_DB_LOCATION, `{"fined":${bank_fine_balance + fine}}`);


        interaction.reply({
            content: `:scream_cat: **${interaction.user.displayName}** tries to rob <@${robbed_user.id}>, but fails and is fined ${GetEmoji(EMOJI.OKASH)} OKA**${fine}**!\n-# If your pockets weren't enough to pay your fine, the remainder was automatically removed from your bank.`
        });
        return GrantAchievement(interaction.user, Achievements.ROB_FINED, interaction.channel as TextChannel); 
    }

    const robbed_amount = Math.floor(Math.random() * (robbed_user_balance * 0.85)) + 15; // min of 15 okash, max of 85% balance

    if (robbed_amount >= 25_000) GrantAchievement(interaction.user, Achievements.ROB_HIGH, interaction.channel as TextChannel); 

    RemoveFromWallet(robbed_user.id, robbed_amount);
    AddToWallet(interaction.user.id, robbed_amount);

    const msg = MESSAGES[Math.floor(Math.random() * MESSAGES.length)]
        .replace('#USER1', interaction.user.displayName)
        .replace('#USER2', robbed_user.id)
        .replace('#OKASH', `${GetEmoji(EMOJI.OKASH)} OKA**${robbed_amount}**`)
        .replace('#PRO', robbed_user_profile.customization.global.pronouns.possessive);
    
    interaction.reply({
        content: `:bangbang: ${msg}`
    });

    if (BANK_ROBS.has(robbed_user.id)) {
        if (BANK_ROBS.get(robbed_user.id)!.when + 180 >= (new Date()).getTime()/1000) GrantAchievement(robbed_user, Achievements.ROBBED_CHAIN, interaction.channel as TextChannel);
    }
}


async function DrawWantedPoster(interaction: ChatInputCommandInteraction) {
    if (!interaction.deferred) await interaction.deferReply();

    const width = 600;
    const height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = '#1f1d1bff'
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.font = '80px azuki_font';
    ctx.fillText('have you seen?', width/2, 10);
    ctx.font = '40px azuki_font';
    ctx.fillText(interaction.user.displayName, width/2, 95);

    const pfp_url = interaction.user.avatarURL({extension:'png', size:512})!;
    const pfp_buffer = await fetchImage(pfp_url);
    const pfp_img = await loadImage(pfp_buffer);

    ctx.drawImage(pfp_img, 44, 150, 512, 512);

    // Save the image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'wanted.png'), buffer);

    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'wanted.png'));
    interaction.editReply({
        files: [image]
    });
}

async function fetchImage(url: string) {
    const response = await axios.get(url, {responseType: 'arraybuffer'});
    return Buffer.from(response.data, 'binary');   
}



export const RobSlashCommand = new SlashCommandBuilder()
    .setName('rob')
    .setDescription('Try and rob someone for some okash')
    .addSubcommand(sc => sc
        .setName('user')
        .setDescription('Rob a user of the okash in their wallet')
        .addUserOption(o => o
            .setName('user')
            .setDescription('who you want to rob')
            .setRequired(true)
        )
    )
    .addSubcommand(sc => sc
        .setName('bank')
        .setDescription('Rob the bank of the fines from failed robberies')
    )
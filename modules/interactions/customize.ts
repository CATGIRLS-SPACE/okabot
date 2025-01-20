import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { CUSTOMIZATION_UNLOCKS } from "../okash/items";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";


export async function HandleCommandCustomize(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();

    switch (sub) {
        case 'coinflip':
            CustomizeCoinflip(interaction);
            break;

        case 'levelbar':
            CustomizeLevelBar(interaction);
            break;
    }
}


const VALID_COIN_TYPES: {
    [key: string]: CUSTOMIZATION_UNLOCKS
} = {
    'default coin':CUSTOMIZATION_UNLOCKS.COIN_DEF,
    'red coin':CUSTOMIZATION_UNLOCKS.COIN_RED,
    'dark blue coin':CUSTOMIZATION_UNLOCKS.COIN_DBLUE,
    'light blue coin':CUSTOMIZATION_UNLOCKS.COIN_BLUE,
    'purple coin':CUSTOMIZATION_UNLOCKS.COIN_PURPLE,
    'pink coin':CUSTOMIZATION_UNLOCKS.COIN_PINK,
    'dark green coin':CUSTOMIZATION_UNLOCKS.COIN_DGREEN,
    'rainbow coin':CUSTOMIZATION_UNLOCKS.COIN_RAINBOW
};
async function CustomizeCoinflip(interaction: ChatInputCommandInteraction) {
    const customization = interaction.options.getString('coin', true).toLowerCase();

    if (VALID_COIN_TYPES[customization] == undefined) return interaction.editReply({
        content:`:crying_cat_face: **${interaction.user.displayName}**, that's not a valid coin!`
    });

    const profile = GetUserProfile(interaction.user.id);

    if (profile.customization.unlocked.indexOf(VALID_COIN_TYPES[customization]) == -1) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but it looks like you don't own that coin!`
    });

    profile.customization.coin_color = VALID_COIN_TYPES[customization];
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content:`<:cat_sunglasses:1315853022324326482> **${interaction.user.displayName}**, I've switched your coin out for a \`${customization}\`. Have fun flipping!`
    });
}


async function CustomizeLevelBar(interaction: ChatInputCommandInteraction) {
    const bg = interaction.options.getString('background', true);
    const fg = interaction.options.getString('foreground', true);
    const text = interaction.options.getString('xptext', true);

    const profile = GetUserProfile(interaction.user.id);
    profile.customization.level_banner = {
        hex_bg: bg,
        hex_fg: fg,
        hex_num: text
    };
    profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM_PENDING), 1);
    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content: `:cat: **${interaction.user.displayName}**, I've updated your custom level bar colors.\nIn order to change them again, you must purchase another Custom Level Bar Color from the shop.`
    });
}


export const CustomizeSlashCommand = new SlashCommandBuilder()
    .setName('customize').setNameLocalization('ja', 'カスタマイズ')
    .setDescription('Customize your experience with your unlocked customizations').setDescriptionLocalization('ja', 'okabotをカスタマイズするであなたのカスタマイズ化')
    .addSubcommand(subcommand => 
        subcommand
            .setName('coinflip').setNameLocalization('ja', 'コイントス')
            .setDescription('Customize your coinflip experience').setDescriptionLocalization('ja', 'コイントスをカスタマイズ')
            .addStringOption(option => option
                .setName('coin').setNameLocalization('ja', 'コイン')
                .setDescription('The coin you want to use when flipping').setDescriptionLocalization('ja', 'コイントスのコインをカスタマイズ')
                .setRequired(true))
            )
    .addSubcommand(subcommand =>
        subcommand
            .setName('levelbar').setNameLocalization('ja', 'レベルバー')
            .setDescription('Customize the colors of your level banner\'s XP bar').setDescriptionLocalization('ja', 'あなたのレベルバーの色をカスタマイズ')
            .addStringOption(option => 
                option
                    .setName('background')
                    .setDescription('The background color of the bar. Must be a valid hex code, like #abcdef')
                    .setRequired(true))
            .addStringOption(option => 
                option
                    .setName('foreground')
                    .setDescription('The foreground color of the bar. Must be a valid hex code, like #abcdef')
                    .setRequired(true))
            .addStringOption(option => 
                option
                    .setName('xptext')
                    .setDescription('The text color of the bar (100 XP, 500 XP). Must be a valid hex code, like #abcdef')
                    .setRequired(true))
    )
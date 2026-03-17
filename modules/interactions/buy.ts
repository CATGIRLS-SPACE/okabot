import {ChatInputCommandInteraction, SlashCommandBuilder, TextChannel} from "discord.js";
import {RemoveFromWallet} from "../okash/wallet";
import {CUSTOMIZATION_UNLOCKS} from "../okash/items";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {CalculateTargetXP} from "../levels/levels";
import {AddXP} from "../levels/onMessage";
import {EMOJI, GetEmoji} from "../../util/emoji";
import { Achievements, GrantAchievement } from "../passive/achievement";


const LastBoughtLevel = new Map<string, number>();

export function UnlockOneTimeCustomization(interaction: ChatInputCommandInteraction, unlock: CUSTOMIZATION_UNLOCKS) {
    const profile = GetUserProfile(interaction.user.id);

    if (
        profile.customization.unlocked.indexOf(unlock) != -1 && 
        unlock != CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM &&
        unlock != CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF
    ) return interaction.editReply({
        content:`:cat: **${interaction.user.displayName}**, you've already got this customization option!`
    });

    if (unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM && profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM_PENDING)) return interaction.editReply({
        content:`:bangbang: **${interaction.user.displayName}**, you've already got a pending custom bar! Use /customize to change your colors!`
    });

    if (unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF) {
        if (
            !profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM) &&
            !profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED) &&
            !profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN) &&
            !profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE) &&
            !profile.customization.unlocked.includes(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK)
        ) GrantAchievement(interaction.user, Achievements.LEVELBAR, interaction.channel as TextChannel);

        interaction.editReply({
            content: `:cat: Kaaaay **${interaction.user.displayName}**! I've reset your level bar to the default colors!`
        });
    }


    switch (unlock) {
        // based on the unlock, we may need to get rid of old unlocks
        case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM: case CUSTOMIZATION_UNLOCKS.CV_LEVEL_BANNER_DEF:
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_RED), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_BLUE), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_GREEN), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_PINK), 1);
            if (profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM) != -1) profile.customization.unlocked.splice(profile.customization.unlocked.indexOf(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM), 1);
            break;
    }

    profile.customization.unlocked.push(unlock);
    if (unlock == CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM) profile.customization.unlocked.push(CUSTOMIZATION_UNLOCKS.CV_LEVEL_BAR_CUSTOM_PENDING); 
    UpdateUserProfile(interaction.user.id, profile);
}

function AddXPLevel(interaction: ChatInputCommandInteraction) {
    const last_bought_level = LastBoughtLevel.get(interaction.user.id) || 0;
    const d = new Date();
    if (last_bought_level + 10800 > d.getTime() / 1000) return interaction.editReply({
        content:`:crying_cat_face: Sorry, **${interaction.user.displayName}**, but you can only buy an XP level once every 3 hours! Come back <t:${last_bought_level + 10800}:R>!`
    });

    LastBoughtLevel.set(interaction.user.id, Math.floor(d.getTime() / 1000));

    const profile = GetUserProfile(interaction.user.id);
    
    RemoveFromWallet(interaction.user.id, 10000+(profile.leveling.level * 2500), true);
    interaction.editReply({content:`:cat: **${interaction.user.displayName}**, you purchased one XP Level for ${GetEmoji(EMOJI.OKASH)} OKA**${10000+(profile.leveling.level * 2500)}**!`});
    
    AddXP(interaction.user.id, interaction.channel as TextChannel, CalculateTargetXP(profile.leveling.level));
}


export const BuySlashCommand = new SlashCommandBuilder()
    .setName('buy').setNameLocalization('ja', '買い')
    .setDescription('Buy an item from the shop').setDescriptionLocalization('ja', 'アイテムを買います')
    .addStringOption(option => option
        .setName('item').setNameLocalization('ja', 'アイテム')
        .setDescription('The item to buy').setDescriptionLocalization('ja', 'ja localization')
        .setRequired(true)
    )
    .addStringOption(option => option
        .setName('voucher').setNameLocalization('ja', '引換券')
        .setDescription('Use a shop voucher (if you have one)?').setDescriptionLocalization('ja', '引換券を使う？')
        .setRequired(false)
        .addChoices(
            {name: 'Heck yeah!!', value: 'true', name_localizations:{ja:'うん！'}},
            {name: 'No thanks', value: 'false', name_localizations:{ja:'いや'}},
        )
    )
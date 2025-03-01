import { APIEmbedField, ChatInputCommandInteraction, EmbedBuilder, Locale, SlashCommandBuilder } from "discord.js";
import { GetAllWallets } from "../okash/wallet";
import { Logger } from "okayulogger";
import { GetAllLevels } from "../user/prefs";
import { GetEmoji } from "../../util/emoji";

const L = new Logger('leaderboard');

const PLACE_EMOJI = [
    ':first_place:',
    ':second_place:',
    ':third_place:',
    ':medal:',
    ':medal:'
];

export async function HandleCommandLeaderboard(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    switch (interaction.options.getString('category')) {
        case 'okash':
            OkashLeaderboard(interaction);
            break;

        case 'levels':
            LevelsLeaderboard(interaction);
            break;
    }    
}


async function OkashLeaderboard(interaction: ChatInputCommandInteraction, only_server: boolean = false) {
    // get all users+balances
    const balances = GetAllWallets();

    balances.sort((a, b) => {
        if (a.amount > b.amount) return -1;
        if (a.amount < b.amount) return 1;
        return 0;
    });

    // create the embed
    const embed = new EmbedBuilder()
        .setTitle(interaction.locale==Locale.Japanese?`**${interaction.guild!.name}** okashのランキング`:`okash Leaderboard for **${interaction.guild?.name}**`)
        .setAuthor({name:interaction.guild!.name, iconURL:interaction.guild!.iconURL()!})
        .setColor(0x9d60cc);

    
    let i = 0;
    let fields: Array<APIEmbedField> = [];

    for (const balance of balances) {
        if (i == 5) break;
        
        try {
            const user = await interaction.client.users.fetch(balance.user_id);
            const isMember = only_server?await interaction.guild?.members.fetch(user.id).then(() => true).catch(() => false):true;
            
            if (isMember) {
                fields.push({
                    name: (interaction.locale == Locale.Japanese)?`${PLACE_EMOJI[i]} **${i+1}.** ${user.displayName + 'さん' || '（不明のユーザ）'}`:`${PLACE_EMOJI[i]} **${i+1}.** ${user.displayName || '(user not in server)'}`, 
                    value: (interaction.locale == Locale.Japanese)?`${GetEmoji('okash')} OKA**${balance.amount}**持ちです`:`has ${GetEmoji('okash')} OKA**${balance.amount}**!`, 
                    inline: false});   
                i++;
            }
        } catch (err) {
            L.error(err as string);
        }
    }

    embed.setFields(fields);

    interaction.editReply({embeds:[embed]});
}


async function LevelsLeaderboard(interaction: ChatInputCommandInteraction, only_server: boolean = false) {
    const time_start = new Date().getTime();

    // get all levels
    const levels = await GetAllLevels();
    levels.sort((a, b) => {
        if (a.level.level > b.level.level) return -1;
        if (a.level.level < b.level.level) return 1;
        else {
            // funny functions!
            if (a.level.current_xp > b.level.current_xp) return -1;
            if (a.level.current_xp < b.level.current_xp) return 1;
            return 0;
        }
    });

    // create the embed
    const embed = new EmbedBuilder()
        .setTitle(only_server?`XP Level Leaderboard for __${interaction.guild?.name}__`:'Global XP Level Leaderboard')
        .setAuthor({name:interaction.guild!.name, iconURL:interaction.guild!.iconURL()!})
        .setColor(0x9d60cc);

    
    let i = 0;
    let fields: Array<APIEmbedField> = [];

    for (const entry of levels) {
        if (i == 5) break;

        L.debug(`fetch user ${entry.user_id}`);

        try {
            const user = await interaction.client.users.fetch(entry.user_id);
            const isMember = only_server?await interaction.guild?.members.fetch(user.id).then(() => true).catch(() => false):true;
            
            if (isMember) {
                fields.push({name: `${PLACE_EMOJI[i]} **${i+1}.** ${user.displayName || '(user not in server)'}`, value: `<@${entry.user_id}> is level **${entry.level.level}** with **${entry.level.current_xp}XP**!`, inline: false});   
                i++;
            }
        } catch (err) {
            L.error(err as string);
        }
    }

    embed.setFields(fields);

    const time_end = new Date().getTime();

    interaction.editReply({content:`-# finished in ${time_end-time_start}ms`,embeds:[embed]});
}


export const LeaderboardSlashCommand = 
new SlashCommandBuilder()
    .setName('leaderboard').setNameLocalization('ja', 'ランキング')
    .setDescription('Get the leaderboard of a set category').setDescriptionLocalization('ja', 'カテゴリーのランキングを見る')
    .addStringOption(option => 
        option
            .setName('category').setNameLocalization('ja', 'カテゴリー')
            .setDescription('Which leaderboard category to display').setDescriptionLocalization('ja', '何がカテゴリーをランキング見て')
            .setRequired(true)
            .addChoices(
                {name:'okash', value:'okash'},
                {name:'XP Levels', value:'levels', name_localizations:{ja:'XPのレベル'}}
            )
        )
import {ChatInputCommandInteraction, Locale, MessageFlags, SlashCommandBuilder} from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";


export async function HandleCommandToggle(interaction: ChatInputCommandInteraction) {
    const prefs = GetUserProfile(interaction.user.id);

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
        case 'okash-notification':
            const active = interaction.options.getString('active') == 'on';
            interaction.reply({
                content: active?`${GetEmoji(EMOJI.CAT_SUNGLASSES)} okaaay! i'll send you notifications every time you receive/transfer okash on your account.`:'${GetEmoji(EMOJI.CAT_SUNGLASSES)} too many notifications? i get that, i\'ll chill out with the notifications',
                flags:[MessageFlags.Ephemeral]
            
            });
            prefs.customization.global.okash_notifications = active;
            UpdateUserProfile(interaction.user.id, prefs);
            break;

        case 'preferred-pronouns':
            if (interaction.locale != Locale.EnglishUS && interaction.locale != Locale.EnglishGB) {
                let message = 'Sorry, but this feature is not supported on your selected language. Change your Discord language to English to use this feature.';
                if (interaction.locale == Locale.Japanese) message = '申し訳ありませんが、okawafflesは日本語の代名詞を理解しないため、この機能は日本語ではサポートされていません。この機能を使用するには、Discordの言語を英語に変更してください。';
                if (interaction.locale == Locale.Russian) message = 'Извините, но эта функция не поддерживается, если выбран русский язык. Чтобы воспользоваться этой функцией, измените язык Discord на английский.';
                return interaction.reply(message);
            }
            const preferred = interaction.options.getString('pronouns', true);
            prefs.customization.global.pronouns.subjective = preferred.split('/')[0];
            prefs.customization.global.pronouns.objective = preferred.split('/')[1];
            prefs.customization.global.pronouns.possessive = preferred.split('/')[2];
            UpdateUserProfile(interaction.user.id, prefs);
            interaction.reply({
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} okaaay! your pronouns are now set to "${preferred}!"`,
                flags:[MessageFlags.Ephemeral]
            });
            break;
    
        default:
            break;
    }
}


export const ToggleSlashCommand = new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Change a toggleable okabot setting!')
    .addSubcommand(sc => sc
        .setName('okash-notification')
        .setDescription('Get a notification when okash is transferred in/out of your account?')
        .addStringOption(option => option
            .setName('active')
            .setDescription('whether you want the option on or off')
            .setRequired(true)
            .addChoices(
                {name:'Yeah!', value:'on'},
                {name:'Nah', value:'off'}
            ))
    )
    .addSubcommand(sc => sc
        .setName('preferred-pronouns')
        .setDescription('Set your preferred pronouns okabot will use')
        .addStringOption(option => option
            .setName('pronouns')
            .setDescription('which pronouns you want to use')
            .setRequired(true)
            .addChoices(
                // the value is only she/her etc because we don't use pronouns such as "him" or "them"
                {name:'She/her/her', value:'she/her/her'},
                {name:'He/him/his', value:'he/him/his'},
                {name:'They/them/their', value:'they/them/their'},
            ))
    )

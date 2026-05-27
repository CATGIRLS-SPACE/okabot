import {ChatInputCommandInteraction, MessageFlags, SlashCommandBuilder} from "discord.js";
import { GetUserProfile, UpdateUserProfile } from "../user/prefs";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {t} from "../i18n/translation";


export async function HandleCommandToggle(interaction: ChatInputCommandInteraction) {
    const prefs = GetUserProfile(interaction.user.id);

    const subcommand = interaction.options.getSubcommand(true);

    switch (subcommand) {
        case 'preferred-pronouns':
            { if (!['en','en-US','en-GB'].includes(interaction.okabot.translateable_locale)) {
                const message = await t('system.errors.language.eng_only', interaction.okabot.translateable_locale);
                return interaction.reply(message);
            }
            const preferred = interaction.options.getString('pronouns', true);
            prefs.customization.global.pronouns.subjective = preferred.split('/')[0];
            prefs.customization.global.pronouns.objective = preferred.split('/')[1];
            prefs.customization.global.pronouns.possessive = preferred.split('/')[2];
            UpdateUserProfile(interaction.user.id, prefs);
            interaction.reply({
                content: await t('interactions.toggle.on_pronouns_set', interaction.okabot.translateable_locale, {
                    cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES),
                    pronouns: preferred
                }),
                flags:[MessageFlags.Ephemeral]
            });
            break; }

        case 'language': {
            await interaction.deferReply();
            const language = interaction.options.getString('language', true)
            if (language == 'auto') {
                prefs.customization.global.allow_translation = true;
                prefs.customization.global.preferred_locale = 'en-US';
                UpdateUserProfile(interaction.user.id, prefs);
                interaction.editReply({
                    content: await t('interactions.toggle.on_lang_set_follow', interaction.locale, {
                        cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES)
                    })
                });
                return;
            }
            prefs.customization.global.preferred_locale = language;
            prefs.customization.global.allow_translation = false;
            UpdateUserProfile(interaction.user.id, prefs);
            interaction.editReply({
                content: await t('interactions.toggle.on_lang_set', language, {
                    cat_sunglasses: GetEmoji(EMOJI.CAT_SUNGLASSES)
                })
            });
            break; }
    
        default:
            break;
    }
}


export const ToggleSlashCommand = new SlashCommandBuilder()
    .setName('toggle')
    .setDescription('Change a toggleable okabot setting!')
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
    .addSubcommand(sc => sc
        .setName('language')
        .setNameLocalizations({
            "en-US": "language",
            "es-ES": 'idioma',
            "es-419": 'idioma',
            de: 'sprache',
            ru: 'язык',
            fr: 'langue',
            el: 'γλώσσα',
            pl: 'język',
            ja: '言語',
            "zh-CN": '语言',
            "zh-TW": '語言'
        })
        .setDescription('Choose the language okabot will use with you')
        .addStringOption(option => option
            .setName('language')
            .setDescription('the language to use')
            .setRequired(true)
            .addChoices(
                {name: 'Automatic', value: 'auto'},
                {name: 'English (All)', value: 'en-US'},
                {name: 'Español (España)', value: 'es-ES'},
                {name: 'Español (LATAM)', value: 'es-419'},
                {name: 'Deutsch', value: 'de'},
                {name: 'Русский', value: 'ru'},
                {name: 'Français', value: 'fr'},
                {name: 'ελληνικά', value: 'el'},
                {name: 'Polski', value: 'pl'},
                {name: '日本語', value: 'ja'},
                {name: '中文', value: 'zh-CN'},
                {name: '繁體中文', value: 'zh-TW'}
            )
        )
    )

import {
    ChatInputCommandInteraction,
    GuildMember,
    MessageFlags,
    SlashCommandBuilder,
    InteractionContextType,
    ApplicationIntegrationType
} from "discord.js";
import {LANG_GAMES, LangGetFormattedString} from "../../util/language";


const POSSIBLE_ANSWERS: Array<LANG_GAMES> = [
    LANG_GAMES.MAGIC_AFFIRMATIVE_A,
    LANG_GAMES.MAGIC_AFFIRMATIVE_B,
    LANG_GAMES.MAGIC_AFFIRMATIVE_C,
    LANG_GAMES.MAGIC_AFFIRMATIVE_D,
    LANG_GAMES.MAGIC_AFFIRMATIVE_E,
    LANG_GAMES.MAGIC_AFFIRMATIVE_F,
    LANG_GAMES.MAGIC_AFFIRMATIVE_G,
    LANG_GAMES.MAGIC_AFFIRMATIVE_H,
    LANG_GAMES.MAGIC_AFFIRMATIVE_I,
    LANG_GAMES.MAGIC_AFFIRMATIVE_J,
    LANG_GAMES.MAGIC_NEGATIVE_A,
    LANG_GAMES.MAGIC_NEGATIVE_B,
    LANG_GAMES.MAGIC_NEGATIVE_C,
    LANG_GAMES.MAGIC_NEGATIVE_D,
    LANG_GAMES.MAGIC_NEGATIVE_E,
    LANG_GAMES.MAGIC_UNSURE_A,
    LANG_GAMES.MAGIC_UNSURE_B,
    LANG_GAMES.MAGIC_UNSURE_C,
    LANG_GAMES.MAGIC_UNSURE_D,
    LANG_GAMES.MAGIC_UNSURE_E,
];

export async function HandleCommand8Ball(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('question', true);

    const answer = POSSIBLE_ANSWERS[Math.round(Math.random() * POSSIBLE_ANSWERS.length)];
    const answer_string = LangGetFormattedString(answer, interaction.okabot.locale);

    await interaction.reply({
        content: LangGetFormattedString(LANG_GAMES.MAGIC_MESSAGE_INITIAL, interaction.okabot.locale, (interaction.member as GuildMember || interaction.user).displayName, question),
        flags: [MessageFlags.SuppressNotifications]
    });

    await new Promise((resolve) => {setTimeout(resolve, 5000)});

    await interaction.editReply({
        content: LangGetFormattedString(LANG_GAMES.MAGIC_MESSAGE_FINAL, interaction.okabot.locale, (interaction.member as GuildMember || interaction.user).displayName, question, answer_string)
    });
}


export const FortuneBallSlashCommand = new SlashCommandBuilder()
    .setName('8ball').setNameLocalizations({'ja':'マジック8ボール'})
    .setDescription('Have the Magic 8 Ball answer a question!').setDescriptionLocalizations({'ja':'マジック8ボールはあなたの問題を答える'})
    .addStringOption(option => option
        .setName('question').setNameLocalizations({'ja':'問題'})
        .setDescription('the question to be asked').setDescriptionLocalizations({'ja':'あなたの問題'})
        .setRequired(true)
    )
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall);
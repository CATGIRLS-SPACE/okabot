import {ChatInputCommandInteraction, MessageFlags} from "discord.js";

export async function ESLGetPronunciation(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral]
    });

    const word = interaction.options.getString('word', true);

    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (r.status == 404) return interaction.editReply({
        content: ":crying_cat_face: Looks like there's no pronunciation for this word!"
    });
    if (!r.ok) return interaction.editReply({
        content: ":crying_cat_face: Something went wrong trying to look up this word, sorry..."
    });

    const data = await r.json();

}
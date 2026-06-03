import {ChatInputCommandInteraction, MessageFlags} from "discord.js";

interface Meaning {
    partOfSpeech: 'noun' | 'verb' | 'adjective' | 'pronoun',
    definitions: Array<Definition>,
    synonyms: Array<string>,
    antonyms: Array<string>,
}

interface Definition {
    definition: string,
    synonyms: Array<string>,
    antonyms: Array<string>,
    example?: string,
}

export async function ESLGetDictionary(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({
        flags: [MessageFlags.Ephemeral]
    });

    const word = interaction.options.getString('word', true);

    const r = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`);
    if (r.status == 404) return interaction.editReply({
        content: ":crying_cat_face: Looks like there's no definition for this word!"
    });
    if (!r.ok) return interaction.editReply({
        content: ":crying_cat_face: Something went wrong trying to look up this word, sorry..."
    });

    const data = await r.json();
    const definition = data[0];

    const nouns = (definition.meanings as Array<Meaning>).filter(item => item.partOfSpeech == 'noun');
    const pronouns = (definition.meanings as Array<Meaning>).filter(item => item.partOfSpeech == 'pronoun');
    const verbs = (definition.meanings as Array<Meaning>).filter(item => item.partOfSpeech == 'verb');
    const adjectives = (definition.meanings as Array<Meaning>).filter(item => item.partOfSpeech == 'adjective');

    let content = `# ${definition.word}\n`;

    let noun_part = '';
    for (const meaning of nouns.slice(0, 3)) {
        for (const d of meaning.definitions.slice(0, 3)) {
            noun_part += `- ${d.definition}\n`;
            if (d.example) noun_part += `-# "${d.example}"\n`;
        }
    }
    if (nouns.length > 0) content += `## as a noun\n${noun_part}`;

    let pronoun_part = '';
    for (const meaning of pronouns.slice(0, 3)) {
        for (const d of meaning.definitions.slice(0, 3)) {
            pronoun_part += `- ${d.definition}\n`;
            if (d.example) pronoun_part += `-# "${d.example}"\n`;
        }
    }
    if (pronouns.length > 0) content += `## as a pronoun\n${pronoun_part}`;

    let verb_part = '';
    for (const meaning of verbs.slice(0, 3)) {
        for (const d of meaning.definitions.slice(0, 3)) {
            verb_part += `- ${d.definition}\n`;
            if (d.example) verb_part += `-# "${d.example}"\n`;
        }
    }
    if (verbs.length > 0) content += `## as a verb\n${verb_part}`;

    let adjective_part = '';
    for (const meaning of adjectives.slice(0, 3)) {
        for (const d of meaning.definitions.slice(0, 3)) {
            adjective_part += `- ${d.definition}\n`;
            if (d.example) adjective_part += `-# "${d.example}"\n`;
        }
    }
    if (adjectives.length > 0) content += `## as an adjective\n${adjective_part}`;

    interaction.editReply({
        content,
    });
}
import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.8.2')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- Auto-translator in language.ts now caches strings, hopefully reducing some time between command usage and responses in non-EN/JP locales",
            "- Updated Gemini to `gemini-2.5-pro-preview-05-06` (previously `gemini-2.5-pro-preview-03-25`)"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- o.remind now gives feedback when setting a reminder",
            "- modified wack word of the day definition listener because i changed my name",
            "- limited the number of reminders a user can have",
            "- fixed an issue where `/rob`'s user option was not required and could crash okabot"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 5.0.0')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- A NEW MAJOR VERSION!?? okabot now runs on Bun instead of NodeJS. Expect faster performance, and maybe a few bugs here and there.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Too many to list. Read commits [here](https://github.com/okawaffles/okabot/commits/main/) if you're curious.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
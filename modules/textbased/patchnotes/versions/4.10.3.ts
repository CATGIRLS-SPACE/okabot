import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.10.3 (Testing Release)')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    // .addTextDisplayComponents(
    //     new TextDisplayBuilder().setContent([
    //         "## What's new?",
    //         "- You can now get scraps from Common Lootboxes. This makes them worth actually opening.",
    //     ].join('\n'))
    // )
    // .addSeparatorComponents(
    //     new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    // )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Start work on allowing okabot to be used in other servers.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
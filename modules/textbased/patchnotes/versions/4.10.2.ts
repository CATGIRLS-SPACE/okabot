import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.10.2 (Bugfix Release)')
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
            "- Updated dependencies to fix vulnerabilities.",
            "- Started reimplementation of stock functionality for testing.",
            "- Profile schema changes to support pet data.",
            "- Replaced some potentially AI-generated code by a contributor with different code.",
            "- Fixed minor invisible bugs."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
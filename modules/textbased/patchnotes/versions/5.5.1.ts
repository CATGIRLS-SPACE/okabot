import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 5.5.1')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    // .addTextDisplayComponents(
    //     new TextDisplayBuilder().setContent([
    //         "## What's new?",
    //         "- Removed the limitation of one streak restore per streak due to the instability of it and also just annoyance.",
    //         "- The ability to delete all account data was added."
    //     ].join('\n'))
    // )
    // .addSeparatorComponents(
    //     new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    // )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Reimplimented voice channel XP bonuses (CATGIRL CENTRAL-exclusive).",
            "- Brewed Hot Cockolate <3"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
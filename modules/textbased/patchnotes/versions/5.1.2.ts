import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 5.1.2')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    // .addTextDisplayComponents(
    //     new TextDisplayBuilder().setContent([
    //         "## What's new?",
    //         "- New okabot AI features (welcome back lilac those who know)\n-# only available for some servers",
    //         "- Supporters can now DM okabot to use AI features whenever they want, privately."
    //     ].join('\n'))
    // )
    // .addSeparatorComponents(
    //     new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    // )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Fixed broken links after domain expiration.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
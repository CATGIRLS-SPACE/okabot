import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.10.4')
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
            "- Fixed bugs that would occur when using okabot in non-CGC servers.",
            "- Renamed achievement `An Anime Whose First Episode Date was October 21, 2007` to `Naughty List`.",
            "- Disabled robbing outside of CATGIRL CENTRAL due to centralized bank.",
            "- Disabled achievement `Get Outta Here!` temporarily.",
            "- Disabled okabot-updates toggle outside of CATGIRL CENTRAL.",
            "- Added a message to inform reviewers that okabot does in fact NOT use prefixes for commands and rather uses slash commands. I don't understand how reviewers didn't get that but I guess it was necessary!"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
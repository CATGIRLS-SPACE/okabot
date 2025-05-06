import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.8.1')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- Blackjack V2 is no longer restricted to just English locales",
            "- See something you wanna look at again later? Try replying to it with 'o.remind 1h' to be reminded in an hour!"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Made it so only members with `PermissionsBitField.Flags.MentionEveryone` can use the announce function in patchnotes",
            "- Fixed /8ball returning broken language strings",
            "- Fixed coinflip wins adding 2 to your streak instead of just 1",
            "- Fixed some games incorrectly giving out achievements",
            "- Slightly modified the welcome message",
            "- Various invisible automod changes",
            "- Nerfed level rewards to be 3/5 of what they were before",
            "- Fixed a bug where using a tracking device would not remove it from your pockets"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
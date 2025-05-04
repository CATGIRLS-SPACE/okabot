import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.8.0')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- Blackjack has been rewritten to use Discord's new Components v2! The classic text-based mode is still available. Those using languages other than English must set `classic: False` in the command to use the updated version.",
            "- This. You can now say 'o.patchnotes' anywhere to see the latest okabot patch notes (if available)!",
            "- Streaks in Blackjack, Coinflip, and Slots!",
            "- Some new gambling achievements! 👀",
            "- 'okabot, xyz...' can be used to ask okabot questions and receive answers. Server Boosters will have access to chains, which allow you to reply to the reply and continue the conversation will all the preexisting context!"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Fixed a longstanding issue where achievement unlock message had a typo",
            "- Fixed issues causing false mistranslation errors",
            "- Upgraded discord.js to v14.19.0",
            "- Fixed card themes not rendering properly in blackjack"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 4.8.3')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- Attachments are now forwarded when in <#1321639990383476797> using a special easy-to-type link (ex https://b.whats.moe/s/rikka-dekomori).",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Blackjack V2 actually locks your game now. Go ahead, try and play two games and get a special message from yours truly!",
            "- <#1321639990383476797> no longer forwards your username, rather your display name. This is because I almost outed myself to my sister.",
            "- The <#1310486655257411594> check no longer deletes your message and rather works on a trust system."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
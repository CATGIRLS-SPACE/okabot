import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('There\'s a new okabot update!\n# okabot 6.1.1\n')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- You can now open up to ten lootboxes at a time!",
            "- Modified the rewards you can get from the EX lootbox.",
            "- Channel whitelisting can now be set up by bot admins while in beta.",
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Minor Changes/Bugfixes",
            "- Fixed more i18n bugs.",
            "- Fixed a bug where using the Custom Level Bar would not apply properly.",
            "- Fixed a bug where rendering another user's banner would not show the user's UBLB if a URL override was set.",
            "- Begin implementation of server subscription tiering and feature limiting.",
            "- Voice XP is no longer free; the server must have an active tier to use the feature.",
            "- Removed /guess and its corresponding achievements.",
            "- Fixed a vulnerability that could cause bad actors to cause mass memory usage via /profile level."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
import {ContainerBuilder, SeparatorBuilder, SeparatorSpacingSize, TextDisplayBuilder} from "discord.js";


export const PATCHNOTES_COMPONENT = new ContainerBuilder()
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('# okabot 5.4.9')
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## What's new?",
            "- **Weighted coins in coinflip now affect the tails range instead of simply changing the heads range.**",
            "-# Originally, when tails was selected with a weighted coin, the range to win would be 0.0f to 0.3f. This update changes it to be 0.0f to 0.7f, while keeping heads to be 0.3f to 1.0f.",
            "- New users no longer need to use a server to agree to rules (unless using the text-based rules command) due to the message components agreement method."
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Large)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent([
            "## Changes/Bugfixes",
            "- Package security updates.",
            "- Various bugfixes.",
            "- Brewed Hot Cockolate <3"
        ].join('\n'))
    )
    .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small)
    )
    .addTextDisplayComponents(
        new TextDisplayBuilder().setContent('-# thanks for using my bot!')
    );
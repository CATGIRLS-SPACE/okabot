import {
    ContainerBuilder,
    Message,
    MessageFlags,
    PermissionsBitField,
    TextChannel,
    TextDisplayBuilder
} from "discord.js";
import {VERSION} from "../../../index";
import {join} from "path";


export function ShowPatchnotes(message: Message) {
    let PATCHNOTES_COMPONENT: ContainerBuilder;
    try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        PATCHNOTES_COMPONENT = require(join(__dirname, 'versions', VERSION)).PATCHNOTES_COMPONENT;
    } catch {
        return message.reply({
            content: `sorry, i couldn't find \`${VERSION}.js\` in the patch notes versions folder :crying_cat_face:`
        });
    }

    const announce = message.content.includes('announce');
    if (announce) {
        const guild = message.client.guilds.cache.get(message.guildId!)!;
        const author = guild.members.cache.get(message.author.id)!;
        const can_use_command = author.permissions.has(PermissionsBitField.Flags.MentionEveryone) || author.roles.cache.some(role => role.name === 'okabot mod');

        if (!can_use_command) return message.reply({
            content:':x: hey!!! you don\'t have permission to do that!!',
        });

        PATCHNOTES_COMPONENT.addTextDisplayComponents(new TextDisplayBuilder().setContent('-# <@&1316166360312713330>'));
        (message.client.channels.cache.get(message.channel.id) as TextChannel).send({
            components: [PATCHNOTES_COMPONENT],
            flags: [MessageFlags.IsComponentsV2]
        }).then(() => {
            message.delete();
        });
    } else {
        message.reply({
            components: [PATCHNOTES_COMPONENT],
            flags: [MessageFlags.IsComponentsV2]
        });
    }
}
import {ContainerBuilder, Message, MessageFlags, TextChannel, TextDisplayBuilder} from "discord.js";
import {VERSION} from "../../../index";
import {join} from "path";


export function ShowPatchnotes(message: Message) {
    let PATCHNOTES_COMPONENT: ContainerBuilder;
    try {
        PATCHNOTES_COMPONENT = require(join(__dirname, 'versions', VERSION)).PATCHNOTES_COMPONENT;
    } catch (err) {
        return message.reply({
            content: `sorry, i couldn't find \`${VERSION}.js\` in the patch notes versions folder :crying_cat_face:`
        });
    }

    const announce = message.content.includes('announce');
    if (announce) {
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
import {JSONFilePreset} from "lowdb/node";
import {BASE_DIRNAME} from "../../index";
import {
    ApplicationIntegrationType,
    ApplicationCommandType,
    ChatInputCommandInteraction, ContextMenuCommandBuilder, InteractionContextType,
    MessageContextMenuCommandInteraction,
    MessageFlags, SlashCommandBuilder, Snowflake
} from "discord.js";
import {randomUUID} from "node:crypto";
import {join} from "path";
import {Low} from "lowdb";


interface Bookmark {
    id: string;
    originalUrl: string;
    content: string;
    savedAt: number;
}

interface BookmarkDB {
    bookmarks: {
        [key: Snowflake]: Array<Bookmark>
    }
}

let db: Low<BookmarkDB>

export async function LoadBookmarkDB() {
    db = await JSONFilePreset(join(BASE_DIRNAME, "db", "bookmark.oka"), {
        bookmarks: {} as {[key: Snowflake]: Array<Bookmark>}
    });
}


export async function GetBookmarkList(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const my_bookmarks = db.data.bookmarks[interaction.user.id];

    if (!my_bookmarks || my_bookmarks.length == 0) return interaction.editReply({
        content: '# Bookmarks\nYou have no bookmarks yet! Add okabot to your personal apps, and then right click a message to bookmark the message with okabot!'
    });

    let message = '# Bookmarks';

    for (const bookmark of my_bookmarks) {
        message += `\n## Saved at <t:${Math.round(bookmark.savedAt/1000)}>\n${bookmark.content}\n-# \`${bookmark.id}\`${bookmark.originalUrl}\n\n`;
    }

    if (message.length >= 2000) return interaction.editReply({
        content: 'Message is too long, this will be handled later, sorry.'
    });

    interaction.editReply({
        content: message
    });
}


export async function AddBookmark(interaction: MessageContextMenuCommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const bookmark: Bookmark = {
        id: randomUUID(),
        content: interaction.targetMessage.content,
        savedAt: new Date().getTime(),
        originalUrl: interaction.targetMessage.url
    }

    if (!db.data.bookmarks[interaction.user.id]) db.data.bookmarks[interaction.user.id] = [];
    db.data.bookmarks[interaction.user.id].push(bookmark);
    await db.write();

    interaction.editReply({
        content: ':bookmark: Bookmark saved!'
    });
}


export async function DeleteBookmark(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply({flags: [MessageFlags.Ephemeral]});

    const id = interaction.options.getString("id", true);

    const index = db.data.bookmarks[interaction.user.id].findIndex((bookmark) => bookmark.id === id);
    if (index == -1) return interaction.editReply({
        content: `:x: Bookmark ID \`${id}\` not found.`
    });
    db.data.bookmarks[interaction.user.id].splice(index, 1);
    await db.write();

    await interaction.editReply({content: `:white_check_mark: Bookmark ID \`${id}\` deleted.`})
}

export async function HandleCommandBookmark(interaction: ChatInputCommandInteraction) {
    const sub = interaction.options.getSubcommand();
    if (sub == 'delete') DeleteBookmark(interaction);
    if (sub == 'list') GetBookmarkList(interaction);
}

export const BookmarkSlashCommand = new SlashCommandBuilder()
    .setName('bookmark')
    .setDescription('See or delete your bookmarks')
    .addSubcommand(sc => sc
        .setName('delete')
        .setDescription('Delete a bookmark')
        .addStringOption(option => option
            .setName('id')
            .setDescription('The bookmark ID to delete')
            .setRequired(true)
        )
    )
    .addSubcommand(sc => sc
        .setName('list')
        .setDescription('List your bookmarks')
    )
    .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM, InteractionContextType.PrivateChannel)
    .setIntegrationTypes(ApplicationIntegrationType.GuildInstall, ApplicationIntegrationType.UserInstall);


export const BookmarkContextMenuOption = new ContextMenuCommandBuilder()
    .setName('Bookmark This')
    .setType(ApplicationCommandType.Message);
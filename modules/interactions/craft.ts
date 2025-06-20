import {ITEMS} from "../okash/items";
import {ChatInputCommandInteraction, EmbedBuilder, InteractionContextType, SlashCommandBuilder} from "discord.js";
import {EMOJI, GetEmoji} from "../../util/emoji";
import {ITEM_NAMES} from "./pockets";
import {GetUserProfile, UpdateUserProfile} from "../user/prefs";
import {AddOneToInventory} from "../okash/wallet";


interface Craftable {
    item_id: ITEMS,
    cost: {
        p: number,
        m: number,
        w: number,
        r: number,
        e: number,
    },
    count: number
}

const CRAFTABLES: {[key: string]: Craftable} = {
    'weighted coin':{item_id:ITEMS.WEIGHTED_COIN_ONE_USE, cost:{p:25,m:50,w:0,r:0,e:0},count:1},
    'tracking device':{item_id:ITEMS.TRACKED_CONVERTER, cost:{p:100,m:100,w:0,r:50,e:100},count:1},
    'common lootbox':{item_id:ITEMS.LOOTBOX_COMMON, cost:{p:100,m:100,w:100,r:100,e:100},count:1},
    'rare lootbox':{item_id:ITEMS.LOOTBOX_RARE, cost:{p:250,m:250,w:250,r:250,e:250},count:1},
    'ex lootbox':{item_id:ITEMS.LOOTBOX_EX, cost:{p:500,m:500,w:500,r:500,e:500},count:1},
    'streak restore':{item_id:ITEMS.STREAK_RESTORE, cost:{p:25,m:25,w:0,r:0,e:50},count:1},
    'casino pass 10 minute':{item_id:ITEMS.CASINO_PASS_10_MIN, cost:{p:100,m:25,w:0,r:0,e:50},count:1},
    'casino pass 30 minute':{item_id:ITEMS.CASINO_PASS_30_MIN, cost:{p:100,m:25,w:0,r:0,e:120},count:1},
    'casino pass 60 minute':{item_id:ITEMS.CASINO_PASS_1_HOUR, cost:{p:100,m:25,w:0,r:0,e:250},count:1},
}


export async function HandleCommandCraft(interaction: ChatInputCommandInteraction) {
    const item = interaction.options.getString('item');

    if (!item) {
        // display all the craftable items
        const embed = new EmbedBuilder()
            .setTitle('Craftable Items with Scraps')
            .setColor(0x9d60cc);


        for (const key of Object.keys(CRAFTABLES)) {
            const craftable = CRAFTABLES[key];
            const required = `${GetEmoji(EMOJI.SCRAP_METAL)}${craftable.cost.m} ${GetEmoji(EMOJI.SCRAP_PLASTIC)}${craftable.cost.p} ${GetEmoji(EMOJI.SCRAP_WOOD)}${craftable.cost.w} ${GetEmoji(EMOJI.SCRAP_RUBBER)}${craftable.cost.r} ${GetEmoji(EMOJI.SCRAP_ELECTRICAL)}${craftable.cost.e}`
            embed.addFields({
                name: `${ITEM_NAMES[CRAFTABLES[key].item_id].name} (\`${key}\`)`,
                value: required
            });
        }

        return interaction.reply({
            content: '',
            embeds: [embed]
        });
    }

    // craft an item
    if (!Object.keys(CRAFTABLES).includes(item)) return interaction.reply({content:':crying_cat_face: Not a valid craftable item!'});
    await interaction.deferReply();

    const craftable = CRAFTABLES[item];

    // check if we can craft said item
    const profile = GetUserProfile(interaction.user.id);
    const ps: {[key: string]: number} = {
        m: profile.inventory_scraps.metal,
        p: profile.inventory_scraps.plastic,
        w: profile.inventory_scraps.wood,
        r: profile.inventory_scraps.rubber,
        e: profile.inventory_scraps.electrical
    };

    if (ps.m < craftable.cost.m || ps.p < craftable.cost.p || ps.w < craftable.cost.w || ps.r < craftable.cost.r || ps.e < craftable.cost.e) {
        const required = `${GetEmoji(EMOJI.SCRAP_METAL)}${craftable.cost.m} ${GetEmoji(EMOJI.SCRAP_PLASTIC)}${craftable.cost.p} ${GetEmoji(EMOJI.SCRAP_WOOD)}${craftable.cost.w} ${GetEmoji(EMOJI.SCRAP_RUBBER)}${craftable.cost.r} ${GetEmoji(EMOJI.SCRAP_ELECTRICAL)}${craftable.cost.e}`;
        const have = `${GetEmoji(EMOJI.SCRAP_METAL)}${ps.m} ${GetEmoji(EMOJI.SCRAP_PLASTIC)}${ps.p} ${GetEmoji(EMOJI.SCRAP_WOOD)}${ps.w} ${GetEmoji(EMOJI.SCRAP_RUBBER)}${ps.r} ${GetEmoji(EMOJI.SCRAP_ELECTRICAL)}${ps.e}`;

        return interaction.editReply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have enough scraps to craft that!\nRequired: ${required}\n You have: ${have}`
        });
    }

    // we have enough to craft
    profile.inventory_scraps.metal -= craftable.cost.m;
    profile.inventory_scraps.plastic -= craftable.cost.p;
    profile.inventory_scraps.wood -= craftable.cost.w;
    profile.inventory_scraps.rubber -= craftable.cost.r;
    profile.inventory_scraps.electrical -= craftable.cost.e;

    UpdateUserProfile(interaction.user.id, profile);

    interaction.editReply({
        content: `:tools: **${interaction.user.displayName}** gets to work...`
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    AddOneToInventory(interaction.user.id, craftable.item_id);
    interaction.editReply({
        content: `:tools: **${interaction.user.displayName}** gets to work... and crafts a(n) **${ITEM_NAMES[craftable.item_id].name}**!`
    });
}


export const CraftSlashCommand = new SlashCommandBuilder()
    .setName('craft')
    .setDescription('Craft an item using scraps!')
    .addStringOption(option => option.setName('item').setDescription('Which item to craft. Leave blank for a list of craftable items.'))
    .setContexts(InteractionContextType.Guild)
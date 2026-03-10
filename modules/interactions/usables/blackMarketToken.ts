import {
    ChatInputCommandInteraction, LabelBuilder,
    ModalBuilder, ModalSubmitInteraction,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, TextChannel
} from "discord.js";
import {GetUserProfile} from "../../user/prefs";
import {ITEMS} from "../../okash/items";
import {EMOJI, GetEmoji} from "../../../util/emoji";
import {AddOneToInventory, RemoveOneFromInventory} from "../../okash/wallet";
import {AddXP} from "../../levels/onMessage";
import {CalculateTargetXP} from "../../levels/levels";

const ITEM_SELECT_COMPONENT = new StringSelectMenuBuilder()
    .setCustomId('blackMarketTokenItemSelect')
    .setPlaceholder('Pick an Item!')
    .setRequired(true)
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('Tracking Device')
            .setDescription('Turns a customization into a Tracked customization, making the item unique and tracks a statistic.')
            .setValue('td'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Bank Robbery Tool')
            .setDescription('A totally illegal bank robbery tool to steal a chunk of okash from someone\'s bank!')
            .setValue('brk'),

        new StringSelectMenuOptionBuilder()
            .setLabel('XP Exchange')
            .setDescription('Somehow, they\'ve figured out how to give you 2500 XP for these tokens!')
            .setValue('xpe'),

        new StringSelectMenuOptionBuilder()
            .setLabel('XP Level Up')
            .setDescription('Even crazier, they\'ve figured out how to level you up for two of these tokens!')
            .setValue('xpl'),
    );

const ITEM_SELECT_LABEL_COMPONENT = new LabelBuilder()
    .setLabel('Pick an item to buy with your token!')
    .setStringSelectMenuComponent(ITEM_SELECT_COMPONENT);

export async function item_bmToken(interaction: ChatInputCommandInteraction) {
    const profile = GetUserProfile(interaction.user.id);
    if (!profile.inventory.some(i => i.item_id == ITEMS.BLACKMARKET_TOKEN)) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any ${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} **Black Market Tokens**!`
    });

    const modal = new ModalBuilder().setCustomId('blackMarketTokenModal').setTitle('Black Market Shop');
    modal.addLabelComponents(ITEM_SELECT_LABEL_COMPONENT);

    await interaction.showModal(modal);
}

export async function item_bmToken_modal(interaction: ModalSubmitInteraction) {
    const profile = GetUserProfile(interaction.user.id);

    if (!profile.inventory.some(i => i.item_id == ITEMS.BLACKMARKET_TOKEN)) return interaction.reply({
        content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have any ${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} **Black Market Tokens**!`
    });

    const selection = interaction.fields.getStringSelectValues('blackMarketTokenItemSelect')[0];

    if (selection == 'xpl') {

        if (!profile.inventory.some(i => i.item_id == ITEMS.BLACKMARKET_TOKEN) || profile.inventory.find(i => i.item_id == ITEMS.BLACKMARKET_TOKEN)!.amount < 2) return interaction.reply({
            content: `:crying_cat_face: **${interaction.user.displayName}**, you don't have enough (2x) ${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} **Black Market Tokens**!`
        });

        RemoveOneFromInventory(interaction.user.id, ITEMS.BLACKMARKET_TOKEN);
        RemoveOneFromInventory(interaction.user.id, ITEMS.BLACKMARKET_TOKEN);
    } else {
        RemoveOneFromInventory(interaction.user.id, ITEMS.BLACKMARKET_TOKEN);
    }

    // wait here for a sec because i think this was causing XP issues?
    await new Promise((resolve) => {setTimeout(resolve, 1000)});

    switch (selection) {
        case 'td':
            AddOneToInventory(interaction.user.id, ITEMS.TRACKED_CONVERTER);
            interaction.reply({
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, you exchanged a ${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} **Black Market Token** for a **Tracking Device**!`
            });
            break;

        case 'brk':
            AddOneToInventory(interaction.user.id, ITEMS.BANK_ROBBERY_KIT);
            interaction.reply({
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, you exchanged a ${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} **Black Market Token** for a ${GetEmoji(EMOJI.BANK_ROBBERY_TOOL)} **Bank Robbery Tool**!`
            });
            break;

        case 'xpe':
            AddXP(interaction.user.id, interaction.channel as TextChannel, 2500);
            interaction.reply({
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, you exchanged a ${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} **Black Market Token** for a :nazar_amulet: **2500 XP Exchange**! **(+2500XP)**`
            });
            break;

        case 'xpl':
            AddXP(interaction.user.id, interaction.channel as TextChannel, CalculateTargetXP(profile.leveling.level));
            interaction.reply({
                content: `${GetEmoji(EMOJI.CAT_SUNGLASSES)} **${interaction.user.displayName}**, you exchanged a ${GetEmoji(EMOJI.BLACK_MARKET_TOKEN)} **Black Market Token** for an :nazar_amulet: **XP Level Up**!`
            });
            break;

        default:
            AddOneToInventory(interaction.user.id, ITEMS.BLACKMARKET_TOKEN);
            interaction.reply({
                content: `:x: Something went wrong (switch statement defaulted). Please report this as a bug.`
            });
            break;
    }
}
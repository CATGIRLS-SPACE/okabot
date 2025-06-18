import { ActionRowBuilder, AttachmentBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, Locale, SlashCommandBuilder } from "discord.js";
import { EMOJI, GetEmoji } from "../../util/emoji";
import { BuyShares, CheckUserShares, GetLastPrices, GetSharePrice, SellShares, Stocks } from "../okash/stock";
import { AddToBank, AddToWallet, GetBank, GetWallet, RemoveFromBank, RemoveFromWallet } from "../okash/wallet";
import { format } from "util";
// import { HandleCommandLink } from "./link";
import { createCanvas, loadImage } from "canvas";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { BASE_DIRNAME } from "../../index";


const STRINGS: { [key: string]: { en: string, ja: string } } = {
    current: {
        en: 'Current Stock Information',
        ja: '**現在の株式市場値段**'
    },
    psst: {
        en: '-# psst, view this online at <https://bot.lilycatgirl.dev/stocks>!',
        ja: '-# ねえねえ！オンラインで見ては<https://bot.lilycatgirl.dev/stocks>！'
    },
    shares_owned: {
        en: '-- You own %s shares totaling %s',
        ja: '-- あなたは%s株式持ちです、総計は%sです',
    },
    insufficient_balance: {
        en: `Sorry, **%s**, but you don't have enough okash for that!`,
        ja: 'ごめんね**%s**さん、でも株式を買うに十分なokash持ちません'
    },
    insufficient_shares: {
        en: `Sorry, **%s**, but you don't have enough shares for that!`,
        ja: 'ごめんね**%s**さん、でも株式を売るに十分な株式持ちません'
    },
    buy_ok: {
        en: `You bought **%s shares of %s** for %s!`,
        ja: '%s株%sの株式を買いました、総計は%sだった'
    },
    sell_ok: {
        en: `You sold **%s shares of %s** for %s!\n-# To prevent abuse, a small fee of %s was applied to your transaction.`,
        ja: '%s株%sの株式を売りました、総計は%sです\n-# 乱用を戦うから、料金の%sを付けります'
    },
    shares: {
        en: '-- You own %s shares, totaling %s',
        ja: '-- %s株持っています、総計は%sです'
    }
}


async function RenderImage(interaction: ChatInputCommandInteraction, user_shares: { neko: number, dogy: number, fxgl: number }, prices: { neko: number, dogy: number, fxgl: number }) {
    const last_prices = GetLastPrices();
    
    const width = 500, height = 250;
    const locale: 'en' | 'ja' = interaction.locale==Locale.Japanese?'ja':'en';

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    const sticker = await loadImage(readFileSync(join(BASE_DIRNAME, 'assets', 'art', 'okash.png')));
    // ctx.drawImage(sticker, width-150, height-100, 64, 64);

    // bg
    ctx.fillStyle = '#2c2630';
    ctx.beginPath();
    ctx.roundRect(5, 5, width - 10, height - 10, 12);
    ctx.fill();
    ctx.strokeStyle = '#9e8bad';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(5, 5, width - 10, height - 10, 12);
    ctx.stroke();

    // watermark
    ctx.font = '100px azuki_font';
    ctx.textBaseline = 'top';
    ctx.textAlign = 'center'
    ctx.fillStyle = '#9d60cc33';
    ctx.fillText('okabot', width / 2, height / 2 - 50);

    // revert
    ctx.font = '30px azuki_font';
    ctx.textBaseline = 'alphabetic';
    
    // title
    ctx.fillStyle = '#fff';
    ctx.fillText(STRINGS.current[locale], width / 2, 38);


    ctx.font = '25px azuki_font';
    // stocks
    ctx.textAlign = 'left';
    ctx.fillText('Catgirl - NEKO', 10, 74);
    ctx.fillText('Doggirl - DOGY', 10, 139);
    ctx.fillText('Foxgirl - FXGL', 10, 199);
    // price changes
    console.log(prices, last_prices)
    ctx.textAlign = 'right';
    ctx.fillStyle = last_prices.neko<=prices.neko?'#54d672':'#f76571';
    ctx.fillText((last_prices.neko<=prices.neko?'+':'-') + Math.abs(prices.neko - last_prices.neko), width - 12, 74);
    ctx.fillStyle = last_prices.dogy<=prices.dogy?'#54d672':'#f76571';
    ctx.fillText((last_prices.dogy<=prices.dogy?'+':'-') + Math.abs(prices.dogy - last_prices.dogy), width - 12, 139);
    ctx.fillStyle = last_prices.fxgl<=prices.fxgl?'#54d672':'#f76571';
    ctx.fillText((last_prices.fxgl<=prices.fxgl?'+':'-') + Math.abs(prices.fxgl - last_prices.fxgl), width - 12, 199);
    // prices + shares
    ctx.textAlign = 'left';
    ctx.font = '16px azuki_font';
    ctx.fillStyle = '#fff';
    // catgirl
    ctx.drawImage(sticker, 10, 82, 30, 30);
    if (user_shares.neko != 0) {
        ctx.font = '16px azuki_font';
        ctx.fillText(`OKA${prices.neko} per share`, 45, 97);
        ctx.fillText(`You have ${user_shares.neko} shares, worth OKA${user_shares.neko * prices.neko}`, 45, 113);
    } else {
        ctx.font = '24px azuki_font';
        ctx.fillText(`OKA${prices.neko} per share`, 55, 99);
    }
    // doggirl
    ctx.drawImage(sticker, 10, 142, 30, 30);
    if (user_shares.dogy != 0) {
        ctx.font = '16px azuki_font';
        ctx.fillText(`OKA${prices.dogy} per share`, 45, 157);
        ctx.fillText(`You have ${user_shares.dogy} shares, worth OKA${user_shares.dogy * prices.dogy}`, 45, 173);
    } else {
        ctx.font = '24px azuki_font';
        ctx.fillText(`OKA${prices.dogy} per share`, 45, 169);
    }
    // foxgirl
    ctx.drawImage(sticker, 10, 202, 30, 30);
    if (user_shares.fxgl != 0) {
        ctx.font = '16px azuki_font';
        ctx.fillText(`OKA${prices.fxgl} per share`, 45, 217);
        ctx.fillText(`You have ${user_shares.fxgl} shares, worth OKA${user_shares.fxgl * prices.fxgl}`, 45, 233);
    } else {
        ctx.font = '24px azuki_font';
        ctx.fillText(`OKA${prices.fxgl} per share`, 45, 229);
    }

    // save image
    const buffer = canvas.toBuffer('image/png');
    if (!existsSync(join(BASE_DIRNAME, 'temp'))) mkdirSync(join(BASE_DIRNAME, 'temp'));
    writeFileSync(join(BASE_DIRNAME, 'temp', 'render-stock-list.png'), buffer);

    const image = new AttachmentBuilder(join(BASE_DIRNAME, 'temp', 'render-stock-list.png'));
    interaction.editReply({
        content: STRINGS.psst[locale],
        files: [image]
    });
}


export async function HandleCommandStock(interaction: ChatInputCommandInteraction) {
    const command = interaction.options.getSubcommand();
    const locale = interaction.locale == Locale.Japanese ? 'ja' : 'en';

    if (command == 'show') {
        await interaction.deferReply();

        const use_new = !interaction.options.getBoolean('classic', false);

        try {
            // get all the user's shares
            const user_shares = {
                neko: CheckUserShares(interaction.user.id, Stocks.NEKO),
                dogy: CheckUserShares(interaction.user.id, Stocks.DOGY),
                fxgl: CheckUserShares(interaction.user.id, Stocks.FXGL),
            }
            // get all prices
            const prices = {
                neko: GetSharePrice(Stocks.CATGIRL),
                dogy: GetSharePrice(Stocks.DOGGIRL),
                fxgl: GetSharePrice(Stocks.FOXGIRL),
            }

            if (use_new) return RenderImage(interaction, user_shares, prices);

            const neko = `**${locale == 'ja' ? 'ネコ' : 'Catgirl'} - NEKO** : ${GetEmoji(EMOJI.OKASH)} OKA**${prices.neko}** ${user_shares.neko != 0 ? format(STRINGS.shares[locale], user_shares.neko, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(user_shares.neko * prices.neko)}**`) : ''}`;
            const dogy = `**${locale == 'ja' ? '子犬' : 'Doggirl'} - DOGY** : ${GetEmoji(EMOJI.OKASH)} OKA**${prices.dogy}** ${user_shares.dogy != 0 ? format(STRINGS.shares[locale], user_shares.dogy, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(user_shares.dogy * prices.dogy)}**`) : ''}`
            const fxgl = `**${locale == 'ja' ? '狐少女' : 'Foxgirl'} - FXGL** : ${GetEmoji(EMOJI.OKASH)} OKA**${prices.fxgl}** ${user_shares.fxgl != 0 ? format(STRINGS.shares[locale], user_shares.fxgl, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(user_shares.fxgl * prices.fxgl)}**`) : ''}`;

            // okey
            interaction.editReply({
                content: `### ${STRINGS.current[locale]}\n${STRINGS.psst[locale]}\n${neko}\n${dogy}\n${fxgl}`
            });
        } catch {
            interaction.editReply({
                content: `:warning: The database may be corrupted/damaged. It is recommended you do not use stocks until the issue is fixed.`
            });
        }
    }

    if (command == 'purchase') {
        await interaction.deferReply();

        const stock = interaction.options.getString('stock', true);
        const amount = interaction.options.getNumber('amount', true);
        const share_price = GetSharePrice(stock as Stocks);

        const bank = GetWallet(interaction.user.id);
        if (amount * share_price > bank) return interaction.editReply({
            content: `:crying_cat_face: ${format(STRINGS.insufficient_balance[locale], interaction.user.displayName)}`
        });

        // remove from bank first
        RemoveFromWallet(interaction.user.id, Math.round(amount * share_price));
        BuyShares(interaction.user.id, stock as Stocks, amount);

        interaction.editReply({
            content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} ${format(STRINGS.buy_ok[locale], amount, stock == 'catgirl' ? 'NEKO' : stock == 'doggirl' ? 'DOGY' : 'FXGL', `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(amount * share_price)}**`)}`
        });
    }

    if (command == 'sell') {
        await interaction.deferReply();

        HandleSellConfirmation(interaction, locale);
    }

    if (command == 'link') {
        // HandleCommandLink(interaction);
    }
}


const CONFIRM_BUTTON = new ButtonBuilder()
    .setCustomId('accept')
    .setStyle(ButtonStyle.Success)
    .setLabel('Complete Transaction');

const CANCEL_BUTTON = new ButtonBuilder()
    .setCustomId('decline')
    .setStyle(ButtonStyle.Danger)
    .setLabel('Cancel Transaction');

const CONFIRMATION_BAR = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
        CONFIRM_BUTTON,
        CANCEL_BUTTON
    );


async function HandleSellConfirmation(interaction: ChatInputCommandInteraction, locale: 'en' | 'ja') {
    const stock = interaction.options.getString('stock', true) as Stocks;
    const amount = interaction.options.getNumber('amount', true);
    const share_price = GetSharePrice(stock);
    const owned_shares = CheckUserShares(interaction.user.id, stock);

    if (owned_shares < amount) return interaction.editReply({
        content: `:crying_cat_face: ${format(STRINGS.insufficient_shares[locale], interaction.user.displayName)}`
    });

    const total_sell_price = Math.round(amount * share_price);
    const stock_name = stock == 'catgirl' ? 'NEKO' : stock == 'doggirl' ? 'DOGY' : 'FXGL';

    const response = await interaction.editReply({
        content: `Would you like to sell **${amount} shares of ${stock_name}** for ${GetEmoji(EMOJI.OKASH)} OKA**${total_sell_price}**?\nAfter sell fees, your total gain will be ${GetEmoji(EMOJI.OKASH)} OKA**${total_sell_price - Math.round(total_sell_price * 0.035)}**.`,
        components: [CONFIRMATION_BAR]
    })

    const collectorFilter = (i: any) => i.user.id === interaction.user.id;
    const collector = response.createMessageComponentCollector({ filter: collectorFilter, time: 30_000 });

    collector.on('collect', async i => {
        if (i.customId == 'decline') {
            i.update({
                content: `:x: Transaction cancelled.`,
                components: []
            });
            return;
        }

        if (GetSharePrice(stock) != share_price) {
            i.update({
                content: `:x: Transaction was cancelled because prices changed between the time of command and confirmation.`,
                components: []
            });
            return;
        }

        SellShares(interaction.user.id, stock, amount);
        AddToWallet(interaction.user.id, total_sell_price - Math.round(total_sell_price * 0.035));

        i.update({
            content: `${GetEmoji(EMOJI.CAT_MONEY_EYES)} ${format(STRINGS.sell_ok[locale], amount, stock_name, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(amount * share_price)}**`, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(total_sell_price * 0.035)}**`)}`,
            components: []
        });
    });
}


export const StockSlashCommand = new SlashCommandBuilder()
    .setName('stock')
    .setDescription('Manage stocks')
    // .addSubcommand(sc => sc
    //     .setName('purchase')
    //     .setDescription('Purchase shares of a stock')
    //     .addStringOption(option => option
    //         .setName('stock')
    //         .setDescription('which stock to buy')
    //         .addChoices(
    //             { name: 'Foxgirl - FXGL', value: 'foxgirl' },
    //             { name: 'Doggirl - DOGY', value: 'doggirl' },
    //             { name: 'Catgirl - NEKO', value: 'catgirl' },
    //         )
    //         .setRequired(true)
    //     )
    //     .addNumberOption(option => option
    //         .setName('amount')
    //         .setDescription('amount of shares to buy')
    //         .setRequired(true)
    //         .setMinValue(0.00000000000000000000001)
    //     )
    // )
    // .addSubcommand(sc => sc
    //     .setName('sell')
    //     .setDescription('Sell shares of a stock')
    //     .addStringOption(option => option
    //         .setName('stock')
    //         .setDescription('which stock to sell')
    //         .addChoices(
    //             { name: 'Foxgirl - FXGL', value: 'foxgirl' },
    //             { name: 'Doggirl - DOGY', value: 'doggirl' },
    //             { name: 'Catgirl - NEKO', value: 'catgirl' },
    //         )
    //         .setRequired(true)
    //     )
    //     .addNumberOption(option => option
    //         .setName('amount')
    //         .setDescription('amount of shares to sell')
    //         .setRequired(true)
    //         .setMinValue(0.00000000000000000000001)
    //     )
    // )
    // .addSubcommand(sc => sc
    //     .setName('show')
    //     .setDescription('Show stock prices and how many shares you own')
    //     .addBooleanOption(option => option
    //         .setName('classic')
    //         .setDescription('Use the classic text-based renderer instead of the new image-based renderer')
    //         .setRequired(false)
    //     )
    // )
    .addSubcommand(sc => sc
        .setName('link')
        .setDescription('Link a browser session to your account')
        .addStringOption(option => option
            .setName('code')
            .setDescription('the code shown in the browser')
            .setRequired(true)
        )
    );
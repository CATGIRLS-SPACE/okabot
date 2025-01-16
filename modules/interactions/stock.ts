import { ChatInputCommandInteraction, Locale } from "discord.js";
import { EMOJI, GetEmoji } from "../../util/emoji";
import { BuyShares, CheckUserShares, GetSharePrice, SellShares, Stocks } from "../okash/stock";
import { AddToBank, GetBank, RemoveFromBank } from "../okash/wallet";
import { format } from "util";
import { HandleCommandLink } from "./link";


const STRINGS: {[key:string]: {en:string,ja:string}} = {
    current: {
        en: '### Current Stock Information\n-# psst, view this online at <https://bot.lilycatgirl.dev/stocks>!',
        ja: '**現在の株式市場値段**\n-# ねえねえ！オンラインで見ては<https://bot.lilycatgirl.dev/stocks>！'
    },
    shares_owned: {
        en:'-- You own %s shares totaling %s',
        ja:'-- あなたは%s株式持ちです、総計は%sです',
    },
    insufficient_balance: {
        en:`Sorry, **%s**, but you don't have enough okash for that!`,
        ja:'ごめんね**%s**さん、でも株式を買うに十分なokash持ちません'
    },
    insufficient_shares: {
        en:`Sorry, **%s**, but you don't have enough shares for that!`,
        ja:'ごめんね**%s**さん、でも株式を売るに十分な株式持ちません'
    },
    buy_ok: {
        en:`You bought **%s shares of %s** for %s!`,
        ja:'%s株%sの株式を買いました、総計は%sだった'
    },
    sell_ok: {
        en:`You sold **%s shares of %s** for %s!\n-# To prevent abuse, a small fee of %s was applied to your transaction.`,
        ja:'%s株%sの株式を売りました、総計は%sです\n-# 乱用を戦うから、料金の%sを付けります'
    },
    shares: {
        en:'-- You own %s shares, totaling %s',
        ja:'-- %s株持っています、総計は%sです'
    }
}


export async function HandleCommandStock(interaction: ChatInputCommandInteraction) {
    const command = interaction.options.getSubcommand();
    const locale = interaction.locale == Locale.Japanese?'ja':'en';

    if (command == 'show') {
        await interaction.deferReply();
        
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

            const neko = `**${locale=='ja'?'ネコ':'Catgirl'} - NEKO** : ${GetEmoji(EMOJI.OKASH)} OKA**${prices.neko}** ${user_shares.neko!=0?format(STRINGS.shares[locale], user_shares.neko, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(user_shares.neko*prices.neko)}**`):''}`;
            const dogy = `**${locale=='ja'?'子犬':'Doggirl'} - DOGY** : ${GetEmoji(EMOJI.OKASH)} OKA**${prices.dogy}** ${user_shares.dogy!=0?format(STRINGS.shares[locale], user_shares.dogy, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(user_shares.dogy*prices.dogy)}**`):''}`
            const fxgl = `**${locale=='ja'?'狐少女':'Foxgirl'} - FXGL** : ${GetEmoji(EMOJI.OKASH)} OKA**${prices.fxgl}** ${user_shares.fxgl!=0?format(STRINGS.shares[locale], user_shares.fxgl, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(user_shares.fxgl*prices.fxgl)}**`):''}`;

            // okey
            interaction.editReply({
                content:`${STRINGS.current[locale]}\n${neko}\n${dogy}\n${fxgl}`
            });
        } catch {
            interaction.editReply({
                content:`:warning: The database may be corrupted/damaged. It is recommended you do not use stocks until the issue is fixed.`
            });
        }
    }

    if (command == 'purchase') {
        await interaction.deferReply();
    
        const stock = interaction.options.getString('stock', true);
        const amount = interaction.options.getNumber('amount', true);
        const share_price = GetSharePrice(stock as Stocks);

        const bank = GetBank(interaction.user.id);
        if (amount * share_price > bank) return interaction.editReply({
            content:`:crying_cat_face: ${format(STRINGS.insufficient_balance[locale], interaction.user.displayName)}`
        });

        // remove from bank first
        RemoveFromBank(interaction.user.id, Math.round(amount * share_price));
        BuyShares(interaction.user.id, stock as Stocks, amount);

        interaction.editReply({
            content:`${GetEmoji(EMOJI.CAT_MONEY_EYES)} ${format(STRINGS.buy_ok[locale], amount, stock=='catgirl'?'NEKO':stock=='doggirl'?'DOGY':'FXGL', `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(amount * share_price)}**`)}`
        });
    }

    if (command == 'sell') {
        await interaction.deferReply();

        const stock = interaction.options.getString('stock', true) as Stocks;
        const amount = interaction.options.getNumber('amount', true);
        const share_price = GetSharePrice(stock);
        const owned_shares = CheckUserShares(interaction.user.id, stock);

        if (owned_shares < amount) return interaction.editReply({
            content: `:crying_cat_face: ${format(STRINGS.insufficient_shares[locale], interaction.user.displayName)}`
        });

        SellShares(interaction.user.id, stock, amount);

        const total_sell_price = Math.round(amount*share_price);

        AddToBank(interaction.user.id, total_sell_price - Math.round(total_sell_price * 0.035));

        interaction.editReply({
            content:`${GetEmoji(EMOJI.CAT_MONEY_EYES)} ${format(STRINGS.sell_ok[locale], amount, stock=='catgirl'?'NEKO':stock=='doggirl'?'DOGY':'FXGL', `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(amount * share_price)}**`, `${GetEmoji(EMOJI.OKASH)} OKA**${Math.round(total_sell_price * 0.035)}**`)}`
        })
    }

    if (command == 'link') {
        HandleCommandLink(interaction);
    }
}
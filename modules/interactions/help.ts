import { ActionRowBuilder, ChatInputCommandInteraction, ComponentType, EmbedBuilder, MessageFlags, SelectMenuBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";
import { EMOJI, GetEmoji, GetEmojiID } from "../../util/emoji";


const STRINGS: {[key: string]: {en:string,ja:string}} = {

};


const FirstPage = 
`
# Welcome to okabot!
Choose a menu below to see information!
`

const CurrencyPage =
`
# The okash Currency
okash is okabot's currency. It can be earned by playing games,
leveling up, claiming your daily rewards, and more!

You can use okash in the shop to buy items or cosmetics.
`

const GamesPage =
`
# okash Games (page 1)
## Coinflip
Bet some okash and flip a coin for a 50/50 chance at doubling your money.
You can earn a one-time-use weighted coin from claiming your daily, 
which gives you a 70/30 chance of landing on heads!
## Blackjack
Bet some okash on a game of Blackjack for a chance at doubling or tripling your money.
In Blackjack, you and okabot start with two cards each. Your goal is to get to 21.
But be careful! If you go over 21, you lose! 
okabot must draw to at least 17 and then stand. You have these options:
- Hit: Get another card (unavailable if you have a Blackjack).
- Stand: Finish drawing and show the game results.
- Double Down: Only available on the first hit, you double your money and draw one card, then you must stand.
Winning will double your bet, winning with a Blackjack hand will give you 3x your bet, and tying will refund you.
-# requires a Discord client which supports message components
`

const GamesPage2 = 
`
# okash Games (page 2)
## Roulette
Bet some okash on a roulette spin.
You can bet on numbers, sections, or a color.
The lower the chance of winning, the higher the reward!
-# requires a Discord client which supports message components
## Slots
Bet some okash on a slots game.
This is by far the most profitable gambling game.
You can win up to a 50x your bet if you get lucky!
`

const StockPage =
`
# okash Stocks
You can invest your okash into the stock market, too!
You don't have to purchase a whole-number amount of shares, 
so you can buy half a share, quarter of a share, however much you want!

The okabot stock market consists of three stocks:
- Catgirl: The most expensive, but the highest change in cost per update.
- Doggirl: A middle-ground that's not too expensive, but still worth investment.
- Foxgirl: A low-priced stock that has the highest chance of spiking, but less movement in price.

Stocks update every 5 minutes, and you can only invest with money in your bank.
There's a chance that an event might happen, too! Keep an eye out for these events,
they could really help your investment portfolio!

As of okabot 3.0.3, there is a small fee when selling. This is only to prevent abuse.
`

const DailyRewardPage =
`
# Daily Rewards
Every 24 hours, you can claim your daily reward.
In your daily reward, you are guaranteed OKA**1500** and a weighted coin.
For each day in your daily reward streak, you gain 5% more okash, up to 200%.
`

const LevelPage = 
`
# The okabot Level System
Talking in the server and playing games all give you XP.
This XP will help you level up.
Levels 1-100 have unlockable titles which show on your /level banner.
When you level up, you will get a small okash reward and a lootbox, increasing with each level.
Levels such as 1, 2, 3... give a :package: **Common Lootbox**
Levels such as 5, 15, 25... give a :package: **Rare Lootbox**
Levels such as 10, 20, 30... give a :package: :sparkle: **EX Lootbox** :sparkle:
`

const DropsPage = 
`
# Drops
Each message you send in the server has a chance of gaining you a random drop.
These drops include:
- Lootboxes
- okash Drops
Lootboxes include okash rewards, customizations, and Shop Vouchers, which can be used to get a free customization\*
okash Drops are either small or large. Small drops are less okash but more common, 
whereas large drops are more okash but less common.
-# \*Some rarer customizations cannot be unlocked via Shop Vouchers.
`


const EarthquakePage = 
`
# Earthquakes
okabot is connected to [Project DM-D.S.S](<https://dmdata.jp>) to get live earthquake information.
When a new one is detected, a message is sent in <#1313343448354525214>
## Magnitude vs Shindo
okabot shows both the earthquake magnitude and Shindo level. So what's the difference?
The magnitude of an earthquake is the educated estimation of the intensity at the epicenter.
The Shindo level is a recorded intensity felt at a station (listed as "Maximum Intensity").
okabot will show the maxmimum recorded Shindo intensity on the embed. Shindo is the most
common method of showing intensity in Japanese earthquake research.

You see the difference between the levels [here](<https://www.data.jma.go.jp/multi/quake/quake_advisory.html>).
`


const ExtraPage =
`
# Extra info
okabot is created with the intent to be free and fun. If you want to support, you can do so [here](<https://ko-fi.com/okawaffles>).

okabot is available in English and Japanese. It will reflect your Discord language. 
Not all features are 100% translated, and some translations may be inaccurate.
If you would like to help translate okabot into another language, please contact okawaffles.

okabot is only available in CATGIRL CENTRAL. Any bots outside of CATGIRL CENTRAL named okabot are not official.

Thanks for using okabot, it means a lot to me ${GetEmoji(EMOJI.NEKOHEART)}
`


const select_menu = new StringSelectMenuBuilder()
    .setCustomId('page')
    .setPlaceholder('Select a page')
    .addOptions(
        new StringSelectMenuOptionBuilder()
            .setLabel('okash')
            .setDescription('Get information on okash')
            .setValue('okash')
            .setEmoji(GetEmojiID(EMOJI.OKASH)),

        new StringSelectMenuOptionBuilder()
            .setLabel('Earthquakes')
            .setDescription('Get information on the earthquake information system')
            .setValue('earthquakes')
            .setEmoji('🌏'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Games (1/2)')
            .setDescription('Get information on okabot games')
            .setValue('games')
            .setEmoji('🎲'),
        new StringSelectMenuOptionBuilder()
            .setLabel('Games (2/2)')
            .setDescription('Get information on okabot games')
            .setValue('games2')
            .setEmoji('🎲'),
        
        new StringSelectMenuOptionBuilder()
            .setLabel('Daily Rewards')
            .setDescription('Get information on the daily reward')
            .setValue('daily')
            .setEmoji('📅'),
        
        new StringSelectMenuOptionBuilder()
            .setLabel('Leveling')
            .setDescription('Get information on the leveling system')
            .setValue('level')
            .setEmoji('⬆️'),
        
        new StringSelectMenuOptionBuilder()
            .setLabel('Drops')
            .setDescription('Get information on drops')
            .setValue('drops')
            .setEmoji('📦'),

        new StringSelectMenuOptionBuilder()
            .setLabel('Extra')
            .setDescription('See some extra information')
            .setValue('extra')
            .setEmoji('❓'),
    )

export async function HandleCommandHelp(interaction: ChatInputCommandInteraction) {
    const row = new ActionRowBuilder<SelectMenuBuilder>()
        .addComponents(select_menu);

    const response = await interaction.reply({
        content: FirstPage,
        components: [row]
    });

    const collector = response.createMessageComponentCollector({componentType: ComponentType.StringSelect, time: 300_000});
    collector.on('collect', async i => {
        const selection = i.values[0];
        switch (selection) { 
            case 'okash':
                await i.update({
                    content: CurrencyPage,
                    components: [row]
                });
                break;
            case 'earthquakes':
                await i.update({
                    content: EarthquakePage,
                    components: [row]
                });
                break;
            case 'games':
                await i.update({
                    content: GamesPage,
                    components: [row]
                });
                break;
            case 'games2':
                await i.update({
                    content: GamesPage2,
                    components: [row]
                });
                break;
            case 'stocks':
                await i.update({
                    content: StockPage,
                    components: [row]
                });
                break;
            case 'daily':
                await i.update({
                    content: DailyRewardPage,
                    components: [row]
                });
                break;
            
            case 'level':
                await i.update({
                    content: LevelPage,
                    components: [row]
                });
                break;
                
            case 'drops':
                await i.update({
                    content: DropsPage,
                    components: [row]
                });
                break;

            case 'extra':
                await i.update({
                    content: ExtraPage,
                    components: [row]
                });
                break;
        }
    });  
}


export const HelpSlashCommand = new SlashCommandBuilder()
    .setName('help')
    .setDescription('Get information on everything okabot');
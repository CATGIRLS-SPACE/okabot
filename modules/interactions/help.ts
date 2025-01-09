import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";


const STRINGS: {[key: string]: {en:string,ja:string}} = {

};


const FirstPage = 
`
## Welcome to okabot!
Choose a menu below to see information!
`

const CurrencyPage =
`
## The okash Currency
okash is okabot's currency. It can be earned by playing games,
leveling up, claiming your daily rewards, and more!

You can use okash in the shop to buy items or cosmetics.
`

const GamesPage =
`
## okash Games
### Coinflip
Bet some okash and flip a coin for a 50/50 chance at doubling your money.
You can earn a one-time-use weighted coin from claiming your daily, 
which gives you a 70/30 chance of landing on heads!
### Blackjack
Bet some okash on a game of Blackjack for a chance at doubling or tripling your money.
In Blackjack, you and okabot start with two cards each. Your goal is to get to 21.
But be careful! If you go over 21, you lose! 
okabot must draw to at least 17 and then stand. You have these options:
- Hit: Get another card (unavailable if you have a Blackjack).
- Stand: Finish drawing and show the game results.
- Double Down: Only available on the first hit, you double your money and draw one card, then you must stand.
Winning will double your bet, winning with a Blackjack hand will give you 3x your bet, and tying will refund you.
`

export async function HandleCommandHelp(interaction: ChatInputCommandInteraction) {
    
}
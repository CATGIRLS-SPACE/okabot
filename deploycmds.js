const { SlashCommandBuilder, Routes } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { clientId, token, devtoken, devclientId } = require('./config.json');
const config = require('./config.json');

const commands = [
	new SlashCommandBuilder()
        .setName('info').setNameLocalization('ja', 'インフォ')
        .setDescription('Get some info on the bot!').setDescriptionLocalization('ja', 'okabotのインフォを見る'),

	new SlashCommandBuilder().setName('debug').setDescription('Replies with debug info'),

	new SlashCommandBuilder()
        .setName('daily').setNameLocalization('ja', '日常の褒美')
        .setDescription('Get your daily okash reward').setDescriptionLocalization('ja', '日常の褒美をゲットする'),

	new SlashCommandBuilder()
        .setName('okash').setNameLocalization('ja', 'okash')
        .setDescription('See how much okash you have on you').setDescriptionLocalization('ja', 'ポケットにと銀行にokash持ち見ます'),

    new SlashCommandBuilder()
        .setName('pay').setNameLocalization('ja', '払う')
        .setDescription('Pay someone some okash')
        .addUserOption(option => 
            option.setName('user').setNameLocalization('ja', 'ユーザ')
            .setDescription('The person to pay').setDescriptionLocalization('ja', '誰を払う')
            .setRequired(true)
        )
        .addNumberOption(option => 
            option.setName('amount').setNameLocalization('ja', '高')
            .setDescription('The amount to pay them').setDescriptionLocalization('ja', 'okashの分量を払う')
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('transfer').setNameLocalization('ja', '動く')
        .setDescription('Transfer between your wallet and bank').setDescriptionLocalization('ja', 'okashポケットから銀行へのokash動かします')
        .addNumberOption(option => option
            .setName('amount').setNameLocalization('ja', '高')
            .setDescription('How much to transfer').setDescriptionLocalization('ja', 'okashの分量を動く')
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption(option => option
            .setName('source').setDescriptionLocalization('ja', '行き先')
            .setDescription('Which way to transfer').setDescriptionLocalization('ja', 'どこからどこへのokash動く')
            .setRequired(true)
            .addChoices(
                {name:'Wallet -> Bank', value:'wallet', name_localizations:{ja:'ポケット ➞ 銀行'}},
                {name:'Bank -> Wallet', value:'bank', name_localizations:{ja:'銀行 ➞ ポケット'}},
            )
        ),
    
    new SlashCommandBuilder()
        .setName('leaderboard').setNameLocalization('ja', 'ランキング')
        .setDescription('Get the leaderboard of a set category').setDescriptionLocalization('ja', 'カテゴリーのランキングを見る')
        .addStringOption(option => 
            option
                .setName('category').setNameLocalization('ja', 'カテゴリー')
                .setDescription('Which leaderboard category to display').setDescriptionLocalization('ja', '何がカテゴリーをランキング見て')
                .setRequired(true)
                .addChoices(
                    {name:'okash', value:'okash'},
                    {name:'XP Levels', value:'levels', name_localizations:{ja:'XPのレベル'}}
                )),

	new SlashCommandBuilder().setName('coinflip').setNameLocalization('ja', 'コイントス')
        .setDescription('Flip a coin with a chance to double your okash').setDescriptionLocalization('ja', 'コインを裏返すと、賭け金が2倍になります')
        .addNumberOption(option => 
            option
                .setName('amount').setNameLocalization('ja', '高')
                .setDescription('The amount of okash you want to bet').setDescriptionLocalization('ja', 'okashの分量がベットします')
                .setRequired(true).setMinValue(1).setMaxValue(10_000)
        )
        .addStringOption(option => 
            option
                .setName('side').setNameLocalization('ja','裏か表か')
                .setDescription('Optionally, pick heads or tails').setDescription('裏か表かを選ぶ')
                .addChoices(
                {name:'heads', value:'heads', name_localizations:{ja:'表'}},
                {name:'tails', value:'tails', name_localizations:{ja:'裏'}}
        ).setRequired(false)),

    new SlashCommandBuilder()
        .setName('recent-eq').setNameLocalization('ja', '地震')
        .setDescription('Get the most recent earthquake data from the Japan Meteorological Agency').setDescriptionLocalization('ja', '気象庁から最近の地震データを見る'),

    new SlashCommandBuilder()
        .setName('use').setNameLocalization('ja', '使う')
        .setDescription('Use an item from your pockets!').setDescriptionLocalization('ja', 'ポケットでアイテムを使う')
        .addStringOption(option => 
            option.setName('item').setNameLocalization('ja', 'アイテム')
            .setDescription('The item to use').setDescriptionLocalization('ja', 'どのアイテムを使う')
            .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName('buy').setNameLocalization('ja', '買い')
        .setDescription('Buy an item from the shop').setDescriptionLocalization('ja', 'アイテムを買います')
        .addStringOption(option => option
            .setName('item').setNameLocalization('ja', 'アイテム')
            .setDescription('The item to buy').setDescriptionLocalization('ja', 'ja localization')
            .setRequired(true)
        )
        .addStringOption(option => option
            .setName('voucher').setNameLocalization('ja', '引換券')
            .setDescription('Use a shop voucher (if you have one)?').setDescriptionLocalization('ja', '引換券を使う？')
            .setRequired(false)
            .addChoices(
                {name: 'Heck yeah!!', value: 'true', name_localizations:{ja:'うん！'}},
                {name: 'No thanks', value: 'false', name_localizations:{ja:'いや'}},
            )
        ),

    new SlashCommandBuilder()
        .setName('sell').setNameLocalization('ja', '売り')
        .setDescription('Sell an item from your pockets').setDescriptionLocalization('ja', 'ポケットでアイテムを売り')
        .addStringOption(option => option.setName('item').setDescription('The item to sell').setRequired(true)),

    new SlashCommandBuilder()
        .setName('shop').setNameLocalization('ja', 'カタログ')
        .setDescription('Get the shop item and price listings').setDescriptionLocalization('ja', 'アイテムのカタログを見る')
        .addStringOption(option => option.setName('page').setDescription('The shop category to display').addChoices(
            {name:'Items', value: 'gems', name_localizations:{ja:'アイテム'}},
            {name:'Customization - Coinflip', value:'customization.coin', name_localizations:{ja:'コイントスのカスタマイズ'}},
            {name:'Customization - Profile', value:'customization.profile', name_localizations:{ja:'プロフィールのカスタマイズ'}},
        ).setRequired(true)),

    new SlashCommandBuilder()
        .setName('pockets').setNameLocalization('ja', 'ポケット')
        .setDescription('See what you\'ve got on you!').setDescriptionLocalization('ja', 'ポケットにアイテムとカスタマイズ化を見る')
        .addStringOption(option => option
            .setName('page').setNameLocalization('ja', 'カテゴリー')
            .setDescription('The pockets category to display').setDescriptionLocalization('ja', 'ポケットのカテゴリー')
            .addChoices(
                {name:'Items', value:'items', name_localizations:{ja:'アイテム'}},
                {name:'Customization Unlocks', value:'customize', name_localizations:{ja:'カスタマイズ化'}}
        ).setRequired(true)),

    new SlashCommandBuilder()
        .setName('customize').setNameLocalization('ja', 'カスタマイズ')
        .setDescription('Customize your experience with your unlocked customizations').setDescriptionLocalization('ja', 'okabotをカスタマイズするであなたのカスタマイズ化')
        .addSubcommand(subcommand => 
            subcommand
                .setName('coinflip').setNameLocalization('ja', 'コイントス')
                .setDescription('Customize your coinflip experience').setDescriptionLocalization('ja', 'コイントスをカスタマイズ')
                .addStringOption(option => option
                    .setName('coin').setNameLocalization('ja', 'コイン')
                    .setDescription('The coin you want to use when flipping').setDescriptionLocalization('ja', 'コイントスのコインをカスタマイズ')
                    .setRequired(true))
                )
        .addSubcommand(subcommand =>
            subcommand
                .setName('levelbar').setNameLocalization('ja', 'レベルバー')
                .setDescription('Customize the colors of your level banner\'s XP bar').setDescriptionLocalization('ja', 'あなたのレベルバーの色をカスタマイズ')
                .addStringOption(option => 
                    option
                        .setName('background')
                        .setDescription('The background color of the bar. Must be a valid hex code, like #abcdef')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('foreground')
                        .setDescription('The foreground color of the bar. Must be a valid hex code, like #abcdef')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('xptext')
                        .setDescription('The text color of the bar (100 XP, 500 XP). Must be a valid hex code, like #abcdef')
                        .setRequired(true))
        ),

    new SlashCommandBuilder()
        .setName('toggle')
        .setDescription('Change a toggleable okabot setting!')
        .addStringOption(option => option.setName('setting')
            .setDescription('The toggle to change')
            .setRequired(true)
            .addChoices(
                { name:'okash notifications when money is transferred/received on your account', value: 'okash_notifications' }
            ))
        .addStringOption(option => option.setName('active')
            .setDescription('whether you want the option on or off')
            .setRequired(true)
            .addChoices(
                {name:'ON', value:'on'},
                {name:'OFF', value:'off'}
            )),
        

    new SlashCommandBuilder()
        .setName('level').setNameLocalization('ja', 'レベル')
        .setDescription('Get information on your current level!').setDescriptionLocalization('ja', 'レベルを見て')
        .addUserOption(option => option
            .setName('user').setNameLocalization('ja', 'ユーザ')
            .setDescription('Get another user\'s level info').setDescriptionLocalization('ja', '誰のレベルを見て')
            .setRequired(false)),


    new SlashCommandBuilder()
        .setName('blackjack')
        .setDescription('Play a game of blackjack for a chance at increasing your money!')
        .addNumberOption(option => option
            .setName('bet')
            .setRequired(true)
            .setDescription('The amount of okash to bet')
            .setMaxValue(5_000).setMinValue(1)),

    new SlashCommandBuilder()
        .setName('render')
        .setDescription('Render data')
        .addSubcommand(sc => sc
            .setName('coinflip')
            .setDescription('Render coinflip data')
            .addNumberOption(option => option.setName('length').setDescription('how many of the last coinflips to render').setRequired(false)),
        )
        .addSubcommand(sc => sc
            .setName('stocks')
            .setDescription('Render stocks graphs')
            .addStringOption(option => option
                .setName('stock')
                .setDescription('the stock to render')
                .addChoices(
                    {name:'Catgirl - NEKO', value:'catgirl'},
                    {name:'Doggirl - DOGY', value:'doggirl'},
                    {name:'Foxgirl - FXGL', value:'foxgirl'},
                )
                .setRequired(true)
            )
        ),


    new SlashCommandBuilder().setName('stock')
        .setDescription('Manage stocks')
        .addSubcommand(sc => sc
            .setName('purchase')
            .setDescription('Purchase shares of a stock')
            .addStringOption(option => option
                .setName('stock')
                .setDescription('which stock to buy')
                .addChoices(
                    {name:'Foxgirl - FXGL', value:'foxgirl'},
                    {name:'Doggirl - DOGY', value:'doggirl'},
                    {name:'Catgirl - NEKO', value:'catgirl'},
                )
                .setRequired(true)
            )
            .addNumberOption(option => option
                .setName('amount')
                .setDescription('amount of shares to buy')
                .setRequired(true)
                .setMinValue(0.01)
                .setMaxValue(100)
            )
        )
        .addSubcommand(sc => sc
            .setName('sell')
            .setDescription('Sell shares of a stock')
            .addStringOption(option => option
                .setName('stock')
                .setDescription('which stock to sell')
                .addChoices(
                    {name:'Foxgirl - FXGL', value:'foxgirl'},
                    {name:'Doggirl - DOGY', value:'doggirl'},
                    {name:'Catgirl - NEKO', value:'catgirl'},
                )
                .setRequired(true)
            )
            .addNumberOption(option => option
                .setName('amount')
                .setDescription('amount of shares to sell')
                .setRequired(true)
                .setMinValue(0.01)
                .setMaxValue(100)
            )
        )
        .addSubcommand(sc => sc
            .setName('show')
            .setDescription('Show stock prices and how many shares you own')
        ),

    new SlashCommandBuilder()
        .setName('help')
        .setDescription('Get information on everything okabot')

].map(command => command.toJSON());
 
const rest = new REST({ version: '10' }).setToken((config['extra'] && config['extra'].includes('use dev token'))?devtoken:token);

rest.put(Routes.applicationCommands((config['extra'] && config['extra'].includes('use dev token'))?devclientId:clientId), { body: commands })
	.then(() => console.log('Successfully registered application commands.'))
	.catch(console.error);

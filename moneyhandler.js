const { ChatInputCommandInteraction, Client, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const { readFileSync, writeFile, writeFileSync } = require('node:fs');
require('discord.js');
const wait = require('node:timers/promises').setTimeout;

function getRandomInt(max) {
	return Math.floor(Math.random() * max);
}


function initMoney(userID, message) {
	if (!fs.existsSync(`./money/wallet/${userID}.oka`)) {
		fs.writeFileSync(`./money/wallet/${userID}.oka`, "1500");
		fs.writeFileSync(`./money/daily/${userID}.oka`, "0");
	}
}

function getWallet(userID) {
	initMoney(userID);
	return ":yen: Your Wallet : OKA" + fs.readFileSync(`./money/wallet/${userID}.oka`, "utf8") + " :yen:";
}

function dailyReward(userID) {
	initMoney(userID);
	let lastGet = parseInt(fs.readFileSync(`./money/daily/${userID}.oka`));
	let cMoney = parseInt(fs.readFileSync(`./money/wallet/${userID}.oka`))
	let d = new Date();
	let now = d.getTime();
	if (lastGet + 86400000 <= now) {
		fs.writeFileSync(`./money/daily/${userID}.oka`, "" + now);
		let newA = parseInt(cMoney) + parseInt(750);
		fs.writeFileSync(`./money/wallet/${userID}.oka`, "" + newA);
		return ":white_check_mark: Got your daily reward of OKA750!";
	} else {
		return `:x: You can only get your daily reward once every 24 hours! You can get your next reward <t:${Math.floor((lastGet + 86400000)/1000)}:R>`
	}
}

function setWallet(userID, amount) {
	fs.writeFileSync(`./money/wallet/${userID}.oka`, "" + amount);
}

async function coinFlipV14(interaction) {
	try {
		const userID = interaction.user.id;
		initMoney(userID);
		let current_user_money = parseInt(fs.readFileSync(`./money/wallet/${userID}.oka`, "utf8"));
		let win = getRandomInt(2);
		let bet_amount = parseInt(interaction.options.getNumber('amount'));

		if (bet_amount > 0) {
			if (bet_amount <= current_user_money) {
				interaction.reply({ content: `:coin: You flip a coin for OKA ${bet_amount}...`, ephemeral: false });

				await wait(3000);

				if (win == 1) interaction.editReply(`:coin: You flip a coin for OKA ${bet_amount.toString()}... and you won, doubling your money! :smile_cat:`);
				else interaction.editReply(`:coin: You flip a coin for OKA ${bet_amount.toString()}... but you lost, causing you to lose your money. :crying_cat_face:`);

				let newAmt;
				if (win == 1) newAmt = current_user_money + bet_amount;
				else newAmt = current_user_money - bet_amount;

				fs.writeFileSync(`./money/wallet/${userID}.oka`, newAmt.toString());
			} else {
				interaction.reply({ content: ':crying_cat_face: Sorry to break it to you, but you\'ll need more money for that amount!', ephemeral: false });
			}
		} else {
			interaction.reply({ content: ':crying_cat_face: I can\'t flip that number!', ephemeral: false });
		}
	} catch (e) {
		interaction.reply(`:x: ${e}`);
	}
}

/**
 * Send money from one user's bank to the other's
 * @param {Client} client
 * @param {ChatInputCommandInteraction} interaction
 * @param {string} sender_id The user ID of the sender
 * @param {string} receiver_id The user ID of the receiver
 */
async function payUser(client, interaction, sender_id, receiver_id) {
    if (receiver_id == client.user.id) {
        return interaction.editReply({
            content: `:bangbang: <@!${sender_id}>... I'm flattered, but I don't accept payments...`,
        });
    }

    if (sender_id == receiver_id) {
        return interaction.editReply({
            content: `:crying_cat_face: <@!${sender_id}>, do you need a friend..?`,
        });
    }

    if (interaction.options.getUser('user').bot) {
        return interaction.editReply({
            content: `:rotating_light: <@!${sender_id}>, what do you think you're doing?!`,
        });
    }

    initMoney(sender_id);
    let sender_bank_amount = parseInt(readFileSync(`./money/wallet/${sender_id}.oka`, 'utf8'));
    initMoney(receiver_id);
    let receiver_bank_amount = parseInt(readFileSync(`./money/wallet/${receiver_id}.oka`, 'utf8'));
    
    let pay_amount = Math.floor(interaction.options.getNumber('amount'));

    if (pay_amount < 0) {
        return interaction.editReply({
            content: ':broken_heart:',
        });
    }

    if (pay_amount == 0) {
        return interaction.editReply({
            content: `:interrobang: <@!${sender_id}>! That's just plain mean!`,
        });
    }
    
    if (sender_bank_amount < pay_amount) {
        return interaction.editReply({
            content: ':crying_cat_face: You don\'t have that much money!',
        });
    }

    sender_bank_amount -= pay_amount;
    receiver_bank_amount += pay_amount;

    writeFileSync(`./money/wallet/${sender_id}.oka`, ''+sender_bank_amount);
    writeFileSync(`./money/wallet/${receiver_id}.oka`, ''+receiver_bank_amount);

    const interaction_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`okash Transfer of OKA${pay_amount}`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:interaction.options.getUser('user').username, inline: true},
        )
        .setDescription('The payment has been successful and the funds were transferred.');

    interaction.editReply({
        embeds:[interaction_embed]
    });

    const receiver_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`You received some okash!`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:interaction.options.getUser('user').username, inline: true},
        )
        .setDescription(`okash Transfer of OKA${pay_amount} | Your new balance is OKA${receiver_bank_amount}.`);


    const sender_embed = new EmbedBuilder()
        .setColor(0x9d60cc)
        .setTitle(`You sent some okash!`)
        .addFields(
            {name:'⬆️ Sender', value:interaction.user.username, inline: true},
            {name:'⬇️ Receiver', value:interaction.options.getUser('user').username, inline: true},
        )
        .setDescription(`okash Transfer of OKA${pay_amount} | Your new balance is OKA${sender_bank_amount}.`);

    interaction.options.getUser('user').send({
        embeds:[receiver_embed]
    }).catch(() => {
        interaction.channel.send({content:`:crying_cat_face: <@!${receiver_id}>, your DMs are closed, so I have to send your receipt here!`, embeds:[receiver_embed]});
    });
    
    interaction.user.send({
        embeds:[sender_embed]
    }).catch(() => {
        interaction.channel.send({content:`:crying_cat_face: <@!${sender_id}>, your DMs are closed, so I have to send your receipt here!`, embeds:[sender_embed]});
    });
}

module.exports = { getWallet, dailyReward, setWallet, coinFlipV14, payUser }
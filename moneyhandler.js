const fs = require('fs');
const json = require('json');
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

function coinFlip(userID, msg) {
	initMoney(userID);
	let amt = msg.content.split(' ')[2];
	let curUsm = fs.readFileSync(`./money/wallet/${userID}.oka`, "utf8");
	let win = getRandomInt(2);

	if(!isNaN(amt) && amt) {
		if(parseInt(amt) <= parseInt(curUsm) && parseInt(amt) > 0) {
			msg.channel.send("You flip a coin for OKA" + amt + "...");
			msg.channel.startTyping();
			setTimeout(() => {
				if (win === 1) {
					msg.channel.send("... and you won, doubling your amount!");
					let newAmt = parseInt(curUsm)+parseInt(amt);
					fs.writeFileSync(`./money/wallet/${userID}.oka`, "" + newAmt);
				} else {
					msg.channel.send("... and you lost, causing you to lose your money.");
					let newAmt = parseInt(curUsm)-parseInt(amt);
					fs.writeFileSync(`./money/wallet/${userID}.oka`, "" + newAmt);
				}
			}, 3000);
			msg.channel.stopTyping();
		} else {
			msg.channel.send(":crying_cat_face: That's either too much money or a negative number!");
		}
	} else {
		msg.channel.send(":crying_cat_face: That's not a valid number!");
	}
}

function dailyRwd(userID) {
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
		return ":x: You can only get your daily reward once every 24 hours!"
	}
}



module.exports = { getWallet, coinFlip, dailyRwd }
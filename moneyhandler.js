const fs = require('fs');
const json = require('json');

function initMoney(userID, message) {
	if (!fs.existsSync(`./money/wallet/${userID}.oka`)) {
		fs.writeFileSync(`./money/wallet/${userID}.oka`, "1500");
	}
}

function initCrypto(userID) {
	if (!fs.existsSync(`./money/crypto/${userID}.oka`)) {
		fs.writeFileSync(`./money/crypto/${userID}.oka`, "1500");
	}
}

function getWallet(userID) {
	initMoney(userID);
	console.log(fs.readFileSync(`./money/wallet/${userID}.oka`));
	return fs.readFileSync(`./money/wallet/${userID}.oka`);
}

function getCrypto(userID) {
	initCrypto(userID);
	return fs.readFileSync(`./money/crypto/${userID}.oka`);
}

function calculateOkashPerCoin() {
	let info = json.parse(fs.readFileSync(`./money/crypto/crypto.json`));
	let valuePerCoin = info.total * (info.buyers / 21);
	return valuePerCoin;
}

function buyCrypto(userID, amount) {
	initMoney(userID);
	if (getWallet(userID) >= calculateOkashPerCoin()) {
		let newAmt = getWallet(userID) - (calculateOkashPerCoin() * amount);
		fs.writeFileSync(`./money/wallet/${userID}.oka`, `${newAmt}`);
		let newCrypAmt = getCrypto(userID) + amount;
		fs.writeFileSync(`./money/crypto/${userID}.oka`, `${newCrypAmt}`);
	} else {
		return -1;
	}
}



module.exports = { getWallet, getCrypto }
const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
const isUrl = require('is-url');
const yts = require('yt-search');
const client = new Discord.Client();
const ytdl = require('ytdl-core');

const moneyhandler = require('./moneyhandler.js')

client.once('ready', () => {
	console.log('Ready!');
});

let msg;
let loop = false;
let queue = [undefined];
let qnum = 0;

client.on('message', message => {
	if (message.content === "purple" && !conversation) {
		message.channel.send("the man behind the slaughter.");
	} else if (message.content.startsWith("oka ")) {
		cmd = message.content.split("oka ")[1];
		ch = message.channel;

		if (cmd === "loop") {
			ch.send("one of those days where you wanna listen on loop, huh? fine by me!");
			loop = true;
		}
		if (cmd === "loop off") {
			ch.send("ok. done looping.");
			loop = false;
		}
		if (cmd.startsWith("listen ")) {
			playMusic(message, 1);
		}
		if (cmd === "queue") {
			sendQueue(message)
		}
		if (cmd === "skip") {
			playMusic(message, 0)
		}

		if (cmd === "okash" || cmd === "money") {
			ch.send(moneyhandler.getWallet(message.author.id));
		}
		if (cmd === "mycrypto") {
			ch.send(moneyhandler.getCrypto(message.author.id));
		}
		if (cmd.startsWith("crypto buy ")) {
			let nep = cmd.split(' ')[2];
			if (!nep) {
				ch.send("usage: **oka crypto buy <amount>**");
			} else {
				if(moneyhandler.buyCrypto(nep)) {
					ch.send(`bought ${nep} okoin. view your wallet with **oka mycrypto**`);
				} else {
					ch.send(`not enough okash`);
				}
			}
		}
	}
});

//music functions


async function playMusic(message, MODE) {
	if (MODE === 0) {
		voice = message.member.voice.channel;

		if(!loop)
			queue.shift();

		voice.join().then(connection => {
			const stream = ytdl(queue[0], { filter: 'audioonly' });
			ch.send(`now playing **${queue[0]}**`);
			if(stream) {
				let dispatcher = connection.play(stream);
				dispatcher.on('finish', () => {
					if (queue[0] === undefined) {
						voice.leave();
					} else {
						playMusic(message, 0);
					}
				});
			} else {
				ch.send(`sorry, something went wrong`);
			}
		})
	} else if (MODE === 1 && message.member.voice.channelID) {
		voice = message.member.voice.channel;
		link = message.content.split("oka listen ")[1];

		if(isUrl(link)) {
			ch.send(`adding that to the queue...`);
		} else {
			ch.send(`that doesn't look like a link, finding the closest video to "**${link}**"`);
			let res = await yts(link);
			vid = res.videos.slice(0, 3);
			link = `https://youtube.com/watch?v=${vid[0].videoId}`;
			ch.send(`adding "**${vid[0].title}**" to the queue...`);
		}

		queue[qnum + 1] = link;

		if(queue[0] === undefined) {
			queue.shift();

			voice.join().then(connection => {
				const stream = ytdl(queue[0], { filter: 'audioonly' });
				ch.send(`now playing **${queue[0]}**`);
				if(stream) {
					let dispatcher = connection.play(stream);
					dispatcher.on('finish', () => {
						if (queue[0] === undefined) {
							voice.leave();
						} else {
							playMusic(message, 0);
						}
					});
				} else {
					ch.send(`sorry, something went wrong`);
				}
			})
		}
	} else {
		ch.send("hop on vc then we can listen to some tunes together.");
	}
}

async function sendQueue(message) {
	let ch = message.channel;
	if (queue[0] !== undefined) {
		let qmsg = "";
		for (let i = 1; i < queue.length; i++) {
			let video = await yts( { videoId: queue[i].split('=')[1] } )
			qmsg = qmsg + video.title + "\n";
		}

		let current = await yts( { videoId: queue[0].split('=')[1] } )
		ch.send(`currently playing: **${current.title}** \nupcoming:\`\`\`${qmsg}\`\`\``);
	} else {
		ch.send('there\'s no queue rn sorry');
	}
}

client.login(token);
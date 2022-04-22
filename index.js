// okabot
// written by okawaffles
// 2021 | do not use for commercial purposes

const Discord = require('discord.js');
const { prefix, token } = require('./config.json');
// CONFIG FILE LOOKS LIKE THIS:
//
//{
//	"token": "REPLACE WITH YOUR BOT TOKEN"
//}
const isUrl = require('is-url');
const yts = require('yt-search');
const client = new Discord.Client();
const ytdl = require('ytdl-core');
const fs = require('fs');
const path = require('path');

//test
const express = require('express');
const app = express();
app.set('views', path.join(__dirname, '/views'));
const port = 3000;

const moneyhandler = require('./moneyhandler.js')

client.once('ready', () => {
	console.log('Ready!');
	client.user.setActivity('with experimental commands');
});

let msg;
let loop = false;
let queue = [undefined];
let userqueue = [undefined];
let qnum = 0;
let globaldispatcher;
let errorCount = 0;
let currentPlaying;

function msToMin(millis) {
	var minutes = Math.floor(millis / 60000);
	var seconds = ((millis % 60000) / 1000).toFixed(0);
	return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

client.on('message', message => {
	if (message.content.startsWith("oka ")) {
		cmd = message.content.split("oka ")[1];
		ch = message.channel;

		if (cmd === "help") {
			let thisEmbed = new Discord.MessageEmbed()
				.setTitle("okabot commands")
				.addFields(
					{name:"Music", value:"listen, loop, loop off, queue, skip, stop, clearqueue"},
				)

			ch.send(thisEmbed);
		}

		if (cmd === "loop") {
			ch.send(":repeat::white_check_mark: looping the current song. queue will not be visible while using loop. use **oka loop off** to disable.");
			loop = true;
		}
		if (cmd === "loop off") {
			ch.send(":repeat::x: ok. done looping.");
			loop = false;
		}
		if (cmd.startsWith("listen ")) {
			playMusic(message, 1);
		}
		if (cmd === "queue") {
			sendQueue(message);
		}
		if (cmd === "skip") {
			playMusic(message, 2);
		}
		if (cmd === "stop" || cmd === "leave") {
			playMusic(message, 3);
		}
		if (cmd === "clearqueue") {
			queue = [undefined];
			userqueue = [undefined];
		}

		if (cmd === "okash" || cmd === "money") {
			ch.send(moneyhandler.getWallet(message.author.id));
		}
		

		if (cmd === "shorten") {
			ch.send(`:x: okayuCDN is either offline or not responding to POST.`);
		}


		if(cmd === "kick") {
			let mention = cmd.split(' ')[1];
			if (mention.startsWith('<@!')) {
				let mentionId = mention.split('!')[1];
			} else {
				ch.send(`:x: <@!${message.author.id}>, that not a mention!`);
			}
		}


		if (cmd === "debug") {
			ch.send(`:information_source: Debug info\n\n:signal_strength: Uptime: ${process.uptime()}\n:infinity: Shard uptime: Unsharded\n:x: Errors: ${errorCount}\n:sos: Caught critical errors: 0`);
		}
	}
});

//music functions

async function playMusic(message, MODE) {
	if (MODE === 0) {
		voice = message.member.voice.channel;
		let current;

		if(!loop && queue[1] != undefined) {
			queue.shift();
			userqueue.shift();
			current = await yts( { videoId: queue[0].split('=')[1] } );
			currentPlaying = current.title;
		}

		voice.join().then(connection => {
			const stream = ytdl(queue[0], { filter: 'audioonly' });

			if(!loop) {
				let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':arrow_forward: Now Playing')
				.addFields(
					{name: ":information_source: Title", value: `${current.title}`, inline:true},
					{name: ":clock3: Time", value: `**${current.timestamp}**`, inline:true},
				)

				ch.send(thisEmbed);
			}

			if(stream) {
				let dispatcher = connection.play(stream);
				globaldispatcher = dispatcher;
				dispatcher.on('finish', () => {
					if (queue[1] === undefined && !loop) {
						voice.leave();
						queue = [undefined];
						userqueue = [undefined];
						loop = false;
					} else {
						queue.shift();
						playMusic(message, 0);
					}
				});
			} else {
				ch.send(`:x: sorry, something went wrong`);
				errorCount++;
			}
		})
	} else if (MODE === 1 && message.member.voice.channelID) {
		voice = message.member.voice.channel;
		link = message.content.split("oka listen ")[1];

		if(isUrl(link)) {
			ch.send(`:twisted_rightwards_arrows: adding that to the queue...`);
		} else {
			ch.startTyping();
			ch.send(`:information_source: that doesn't look like a link, finding the closest video to "**${link}**"`);
			let res = await yts(link);
			vid = res.videos.slice(0, 3);
			link = `https://youtube.com/watch?v=${vid[0].videoId}`;
			ch.send(`:twisted_rightwards_arrows: adding "**${vid[0].title}**" to the queue...`);
			ch.stopTyping();
		}

		queue[queue.length] = link;
		userqueue[userqueue.length] = message.author.id;

		if(queue[0] === undefined) {
			queue.shift();
			userqueue.shift();
			let current = await yts( { videoId: queue[0].split('=')[1] } );
			currentPlaying = current.title;

			voice.join().then(connection => {
				const stream = ytdl(queue[0], { filter: 'audioonly' });
				
				let thisEmbed = new Discord.MessageEmbed()
					.setColor('#3461eb')
					.setTitle(':arrow_forward: Now Playing')
					.addFields(
						{name: ":information_source: Title", value: `${current.title}`, inline:true},
						{name: ":clock3: Time", value: `**${current.timestamp}**`, inline:true},
					)

				ch.send(thisEmbed);
				if(stream) {
					let dispatcher = connection.play(stream);
					globaldispatcher = dispatcher;
					dispatcher.on('finish', () => {
						if (queue[1] === undefined && !loop) {
							voice.leave();
							queue = [undefined];
							userqueue = [undefined];
							loop = false;
						} else {
							playMusic(message, 0);
						}
					});
				} else {
					ch.send(`:x: sorry, something went wrong. please try again`);
					queue = [undefined];
					userqueue = [undefined];
					loop = false;
					errorCount++;
				}
			})
		}
	} else if (MODE === 2) {
		voice = message.member.voice.channel;

		queue.shift();
		userqueue.shift();


		if (queue[0] != undefined) {
			let current = await yts( { videoId: queue[0].split('=')[1] } );
			currentPlaying = current.title;
		}

		voice.join().then(connection => {
			const stream = ytdl(queue[0], { filter: 'audioonly' });

			try {
				let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':arrow_forward: Now Playing')
				.addFields(
					{name: ":information_source: Title", value: `${current.title}`, inline:true},
					{name: ":clock3: Time", value: `**${current.timestamp}**`, inline:true},
				)
				ch.send(thisEmbed);
			} catch (error) {
				errorCount++;
				ch.send("something went wrong. please run `oka stop` and then retry if nothing happens.");
			}

			if(stream) {
				let dispatcher = connection.play(stream);
				globaldispatcher = dispatcher;
				dispatcher.on('finish', () => {
					if (queue[1] === undefined && !loop) {
						voice.leave();
					} else {
						playMusic(message, 0);
					}
				});
			} else {
				ch.send(`:x: sorry, something went wrong`);
				errorCount++;
			}
		})
	} else if (MODE === 3) {
		voice = message.member.voice.channel;
		voice.join().then(connection => {
			voice.leave();
			queue = [undefined];
			userqueue = [undefined];
			loop = false;
		});
	} else if (MODE === 4) {
		if(isUrl(message)) {
			queue[queue.length] = message;
			userqueue[userqueue.length] = "WEB USER";
		}
	} else {
		ch.send(":loud_sound::x: hop on vc then we can listen to some tunes together.");
	}
}

async function sendQueue(message) {
	let ch = message.channel;
	ch.startTyping();
	if (queue[0] !== undefined) {
		let qmsg = "- ";
		for (let i = 1; i < queue.length; i++) {
			let video = await yts( { videoId: queue[i].split('=')[1] } )
			qmsg = qmsg + video.title + ` ・ queued by <@!${userqueue[i]}>` + "\n- ";
		}

		let current = await yts( { videoId: queue[0].split('=')[1] } )
		if (qmsg === "- ")
			qmsg = `No upcoming songs. Use "oka listen <video name/link> to queue."`


		if (!loop) {
			let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':musical_note: Queue')
				.addFields(
					{name: ":arrow_forward: Currently Playing", value: `${current.title} ・ queued by **<@!${userqueue[0]}>**`, inline:true},
					{name: ":clock3: Time", value: `**${msToMin(globaldispatcher.streamTime)}** / **${current.timestamp}**`, inline:true},
					{name: ":next_track: Next up:", value: qmsg},
				)

			ch.send(thisEmbed);
			//ch.send(`:arrow_forward: currently playing: **${current.title}** | **${msToMin(globaldispatcher.streamTime)}** / **${current.timestamp}** \n:next_track: upcoming:\`\`\`${qmsg}\`\`\``);
		} else {
			let thisEmbed = new Discord.MessageEmbed()
				.setColor('#3461eb')
				.setTitle(':musical_note: Queue')
				.addFields(
					{name: ":repeat: Currently Looping", value: `${current.title} ・ queued by **<@!${userqueue[0]}>**`, inline:true},
					{name: ":clock3: Time", value: `**${msToMin(globaldispatcher.streamTime)}** / **${current.timestamp}**`, inline:true},
				)

			ch.send(thisEmbed);
			//ch.send(`:arrow_forward: currently playing: **${current.title}** \n:next_track::x: song is looping. turn off loop to use queue`);
		}
	} else {
		ch.send(':information_source: there\'s no queue rn sorry');
	}
	ch.stopTyping();
}

client.login(token);

// web dashboard test stuff
app.post('/music/loop/true', (req, res) => {
	loop = true;
});
app.post('/music/loop/false', (req, res) => {
	loop = false;
});
app.get('/', (req, res) => {
	res.render('home.ejs', {current: currentPlaying});
});
app.listen(port);
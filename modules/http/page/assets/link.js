const url = `${window.location.toString().startsWith('https')?'wss://bot.lilycatgirl.dev':'ws://localhost:9256'}`;

let socket = new WebSocket(url);

let fRunOnCode;
let fRunOnLink;

let my_code = '1a2b3c';
let my_username = '';
let my_userid = '';

socket.onmessage = function(msg) {
    if (msg.data.startsWith('woof! ')) {
        my_code = msg.data.split('woof! ')[1];
        fRunOnCode(my_code);
        return;
    }

    if (msg.data.startsWith(`LINK ${my_code} `)) {
        const args = msg.data.split(' ');
        my_username = args[2];
        my_userid = args[3];

        socket.send(`ACCEPT ${my_code}`);
    }

    if (msg.data == `LINK GOOD ${my_code} READY`) {
        fRunOnLink();
    }
}

let socket_open = false;
socket.onopen = () => socket_open = true;

function Start(fOnCode, fOnLink) {
    fRunOnCode = fOnCode;
    fRunOnLink = fOnLink;

    if (socket_open) {
        socket.send('nya~');
    } else setTimeout(() => {
        Start(fOnCode, fOnLink);
    }, 1000);
}
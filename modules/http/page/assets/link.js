const url = `${window.location.toString().startsWith('https')?'wss://bot.lilycatgirl.dev':'ws://localhost:9256'}`;

let socket = new WebSocket(url);

const alpha = 'ABCDEF1234567890';
function generate_session() {
    let code = '';
    for (let i = 0; i < 32; i++) code += alpha[Math.floor(Math.random() * alpha.length)];
    return code;
}
let my_session;

if (window.localStorage.getItem('okabot_session')) {
    my_session = window.localStorage.getItem('okabot_session');
} else {
    my_session = generate_session();
    window.localStorage.setItem('okabot_session', my_session);
}

let my_user = '';

socket.onmessage = function(msg) {
    let message = msg.data;
    console.log(message);

    if (message === `SESSION ${my_session} REAUTH`) {
        document.getElementById('link_code').innerText = 'Requesting Authentication';
        document.getElementById('sub_link_code').innerText = 'Please wait...';
        socket.send(`SESSION ${my_session} REQUEST LOGIN ${my_user}`);
    }
    if (message === `SESSION ${my_session} SUCCESS AWAITING RESPONSE`) {
        document.getElementById('link_code').innerText = 'Authentication Requested';
        document.getElementById('sub_link_code').innerText = 'Please check your DMs with okabot';
    }
    if (message === `SESSION ${my_session} ERROR CANNOT DM`) {
        document.getElementById('link_code').innerText = 'Authentication Cannot Continue';
        document.getElementById('sub_link_code').innerText = 'Please allow okabot to DM you. If you have not run a command recently, please run any command before trying again.';
    }
    if (message === `SESSION ${my_session} PRIVILIGED`) {
        LoadMainContent();
    }
    if (message === `SESSION ${my_session} NOT PRIVILIGED`) {
        document.getElementById('link_code').innerText = 'Not Priviliged';
        document.getElementById('sub_link_code').innerText = 'Not in "permitted_to_use_shorthands" array.';
    }
    if (message === `SESSION ${my_session} DENY`) {
        document.getElementById('link_code').innerText = 'Authentication Failed';
        document.getElementById('sub_link_code').innerText = 'Authentication request was denied.';
    }
}

let socket_open = false;
socket.onopen = () => socket_open = true;

function Start() {
    my_user = prompt('Please enter your Discord username');

    if (socket_open) {
        document.getElementById('link_code').innerText = 'Login';
        document.getElementById('sub_link_code').innerText = 'Querying session...';
        socket.send(`SESSION ${my_session} QUERY`);
    } else setTimeout(() => {
        Start();
    }, 1000);
}

// --- main stuff ---

function LoadMainContent() {
    alert('You are priviliged!');
}
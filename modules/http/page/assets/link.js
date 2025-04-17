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
        document.getElementById('link_code').innerText = 'Login';
        document.getElementById('sub_link_code').innerText = 'Please enter your username';
        my_user = window.localStorage.getItem('okabot_username') || prompt('Please enter your Discord username');
        window.localStorage.setItem('okabot_username', my_user);
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
        document.getElementById('sub_link_code').innerHTML = 'Please allow okabot to DM you. Additionally, please run /debug before trying again.<br>okabot\'s cache may not have your user yet, which is why you must run a command.';
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
        window.localStorage.removeItem('okabot_username');
        window.localStorage.removeItem('okabot_session');
    }
    if (message === 'KEEPALIVE') {
        socket.send(`SESSION ${my_session} ALIVE`);
    }

    // data

    if (message === `SESSION ${my_session} DMDATA CONNECTED`) {
        document.getElementById('dmdata-status').innerHTML = 'Status: <span style="color: green;">CONNECTED</span>';
    }
    if (message === `SESSION ${my_session} DMDATA DISCONNECTED`) {
        document.getElementById('dmdata-status').innerHTML = 'Status: <span style="color: red;">DISCONNECTED</span>';
    }
}

let socket_open = false;
socket.onopen = () => socket_open = true;

function Start() {
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
    document.getElementById('login').style.opacity = '0';
    document.getElementById('main_page').style.display = 'revert';

    setTimeout(() => {
        document.getElementById('login').style.display = 'none';
        document.getElementById('main_page').style.opacity = '1';

        document.getElementById('username').innerText = `Logged in (${my_session})`;
    }, 1000);

    const dmdata_trip_button = document.getElementById('dmdata-disconnect');

    dmdata_trip_button.onclick = () => {
        dmdata_trip_button.disabled = true;
        dmdata_trip_button.innerText = 'Please Wait...';
    };
}
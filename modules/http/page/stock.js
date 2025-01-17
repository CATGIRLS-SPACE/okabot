const custom_url = prompt('use custom url? (leave blank for no)');
const url = custom_url!=''?custom_url:`${window.location.toString().startsWith('https')?'wss://bot.lilycatgirl.dev':'ws://localhost:9256'}`;

const socket = new WebSocket(url);

let CURRENT_PRICES = {
    neko: 0,
    dogy: 0,
    fxgl: 0
}
let LAST_PRICES = {
    neko: '?',
    dogy: '?',
    fxgl: '?'
}

let link_code = '';
let linked_user = '';
let linked_user_id = '';

socket.onopen = function(ws) {
    socket.send('nya~');
    socket.send('stocks latest');
}

socket.onmessage = function(message) {
    console.log(message);

    if (message.data.startsWith('woof! ')) {
        link_code = message.data.split('woof! ')[1];
        document.getElementById('footer').innerHTML = `2025 lilycatgirl | link code: ${link_code}`;
        return;
    }
    if (message.data.startsWith('LINK')) {
        if (message.data.startsWith(`LINK ${link_code}`)) {
            socket.send(`ACCEPT ${link_code}`);
            linked_user = message.data.split(' ')[2];
            linked_user_id = message.data.split(' ')[3];
            document.getElementById('footer').innerHTML = `2025 lilycatgirl | awaiting link...`;
        }

        if (message.data == `LINK GOOD ${link_code} READY`) {
            socket.send(`balance ${linked_user_id}`);
            document.getElementById('footer').innerHTML = `2025 lilycatgirl | linked to ${linked_user}`;
            sfx_LINK.play();
        }

        if (message.data == `LINK ERROR ${link_code} NOT VALID`) {
            document.getElementById('footer').innerHTML = `2025 lilycatgirl | linking failed, reload page`;
        }
        return;
    }

    const data = JSON.parse(message.data);

    switch (data._type) {
        case 'stocks':
            UpdatePriceDisplay(data, false, data._type);
            break;

        case 'user_positive': case 'user_negative':
            ManualPriceUpdate(data.stock, data.value);
            break;

        case 'event_positive': case 'event_negative':
            UpdatePriceDisplay(data, true, data._type);
            break;
        
        case 'link balance':
            UpdateUserPrices(data);
    }
};


function UpdatePriceDisplay(data, is_event, _type) {
    if (linked_user != '') socket.send(`balance ${linked_user_id}`);
    
    document.querySelector('#neko-price').innerHTML = 'OKA' + data.neko;
    document.querySelector('#dogy-price').innerHTML = 'OKA' + data.dogy;
    document.querySelector('#fxgl-price').innerHTML = 'OKA' + data.fxgl;

    document.title = `${data.neko} | ${data.dogy} | ${data.fxgl} | okabot live stock view`

    // check for spikes
    if (
        Math.abs(LAST_PRICES.neko - data.neko) >= 21 ||
        Math.abs(LAST_PRICES.dogy - data.dogy) >= 11 ||
        Math.abs(LAST_PRICES.fxgl - data.fxgl) >= 2 &&
        !is_event
    ) {
        // it is a spike in some way, which way?
        // any spike should play the noise
        const positive =
            LAST_PRICES.neko - data.neko >= 0 ||
            LAST_PRICES.dogy - data.dogy >= 0 ||
            LAST_PRICES.fxgl - data.fxgl >= 0;
            
        if (!is_event) {
            console.log(`spike is ${positive?'posi':'nega'}tive`);
            if (positive) sfx_SSU.play(); else sfx_SSD.play();
        }
    } else {
        // calculate whether its a negative or positive change
        const positive_neko = LAST_PRICES.neko - data.neko >= 0;
        const positive_dogy = LAST_PRICES.dogy - data.dogy >= 0;
        const positive_fxgl = LAST_PRICES.fxgl - data.fxgl >= 0;

        const positive = positive_neko + positive_dogy + positive_fxgl >= 2;
        if (!is_event) {
            console.log(`change is ${positive?'posi':'nega'}tive`);
            if (positive) sfx_SNU.play(); else sfx_SND.play();
        }
    }

    if (is_event) {
        const positive = _type == 'event_positive';
        console.log(`event is ${positive?'posi':'nega'}tive`);
        if (positive) sfx_SEP.play(); else sfx_SEN.play();

        new Notification(`${positive?'📈':'📉'} STOCK MARKET NEWS`, {body:data.event,icon:''});
    }

    document.querySelector('#neko-prev-price').innerHTML = 'was OKA' + LAST_PRICES.neko;
    document.querySelector('#dogy-prev-price').innerHTML = 'was OKA' + LAST_PRICES.dogy;
    document.querySelector('#fxgl-prev-price').innerHTML = 'was OKA' + LAST_PRICES.fxgl;

    LAST_PRICES = {
        neko: data.neko,
        dogy: data.dogy,
        fxgl: data.fxgl
    };
}

function ManualPriceUpdate(stock, price) {
    if (stock == 'catgirl') stock = 'neko';
    if (stock == 'doggirl') stock = 'dogy';
    if (stock == 'foxgirl') stock = 'fxgl';

    LAST_PRICES[stock] = parseInt(document.querySelector(`#${stock}-price`).innerHTML);
    document.querySelector(`#${stock}-prev-price`).innerHTML = 'was ' + LAST_PRICES[stock];
    document.querySelector(`#${stock}-price`).innerHTML = price;

    if (price - LAST_PRICES[stock] > 0) {
        if (price - LAST_PRICES[stock] > 25) sfx_SUUL.play(); else sfx_SUUS.play(); 
    } else {
        if (LAST_PRICES[stock] - price > 25) sfx_SUDL.play(); else sfx_SUDS.play(); 
    }

    if (linked_user != '')  socket.send(`balance ${linked_user_id}`);
}

function UpdateUserPrices(data) {
    document.getElementById('user-share-amount-neko').innerText = 'OKA' + data.neko;
    document.getElementById('user-share-amount-dogy').innerText = 'OKA' + data.dogy;
    document.getElementById('user-share-amount-fxgl').innerText = 'OKA' + data.fxgl;
}

const sfx_SUUS = new Audio('/asset/stock-user-up-small.wav');
const sfx_SUUL = new Audio('/asset/stock-user-up-large.wav');
const sfx_SUDS = new Audio('/asset/stock-user-down-small.wav');
const sfx_SUDL = new Audio('/asset/stock-user-down-large.wav');
const sfx_SNU = new Audio('/asset/stock-natural-up.wav');
const sfx_SND = new Audio('/asset/stock-natural-down.wav');
const sfx_SSU = new Audio('/asset/stock-spike-up.wav');
const sfx_SSD = new Audio('/asset/stock-spike-down.wav');
const sfx_SEP = new Audio('/asset/stock-event-positive.wav');
const sfx_SEN = new Audio('/asset/stock-event-negative.wav');
const sfx_LINK = new Audio('/asset/link.wav');

if (Notification.permission == 'default') {
    Notification.requestPermission();
}
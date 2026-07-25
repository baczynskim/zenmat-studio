// SYGNAŁ - Game Logic v2
// Vanilla JS Horror/Mystery Game

const SAVE_KEY = 'sygnal_save_v2';

const ROOMS = {
    entrance: {
        label: '[ WEJŚCIE ]',
        locked: () => false,
        onFirstEnter: () => {
            grantItem('latarka');
            addJournal('note_entrance', 'Notatka przy drzwiach: "Nie wchodźcie do piwnicy sami."');
            return 'Opuszczona, ciemna. Zapach rdzy i starego plastiku. Na podłodze leży latarka. 🔦 ZNALEZIONO: Latarka';
        },
        onEnter: () => 'Wejście. Cicho. Tylko wiatr w rozbitych oknach.'
    },
    control: {
        label: '[ SALA KONTROLI ]',
        locked: () => false,
        onFirstEnter: () => {
            grantItem('klucz');
            addJournal('note_control', 'Log operatora, 1971: "Sygnał przyszedł znikąd. Odpowiedzieliśmy."');
            return 'Pulpit kontroli. Urządzenia z lat 70-ych. Na biurku leży klucz. 🔑 ZNALEZIONO: Klucz do piwnicy';
        },
        onEnter: () => 'Zakurzone konsole. Wskaźniki dawno martwe.'
    },
    archive: {
        label: '[ ARCHIWUM ]',
        locked: () => false,
        onFirstEnter: () => {
            grantItem('tasma');
            addJournal('note_archive', 'Etykieta na taśmie: "NAGRANIE #3 – NIE ODTWARZAĆ W NOCY"');
            return 'Regały pełne teczek. W jednej z nich szpula taśmy. 📼 ZNALEZIONO: Taśma szpulowa';
        },
        onEnter: () => 'Papiery gniją na półkach. Ktoś tu kiedyś pracował.'
    },
    basement: {
        label: '[ PIWNICA ]',
        locked: () => !state.inventory.klucz,
        lockedHint: '🔒 potrzebny klucz',
        onFirstEnter: () => {
            addJournal('note_basement', 'Piwnica: kable prowadzą do nadajnika. Ktoś nigdy go nie wyłączył.');
            return '📻 ZNALEŹLIŚCIE GO. Transmitter tutaj — wciąż aktywny.';
        },
        onEnter: () => 'Nadajnik cicho buczy w ciemności.'
    },
    tower: {
        label: '[ WIEŻA NADAWCZA ]',
        locked: () => !(state.inventory.klucz && state.inventory.latarka && state.inventory.tasma),
        lockedHint: '🔒 zbierz wszystkie przedmioty',
        onFirstEnter: () => {
            addJournal('note_tower', 'Na szczycie wieży: stary magnetofon. Pasuje do taśmy.');
            return 'Wiatr wyje między antenami. Jest tu magnetofon — pasuje do Twojej taśmy.';
        },
        onEnter: () => 'Antena skrzypi na wietrze. Magnetofon czeka.'
    }
};

const RADIO_MESSAGES = [
    '... sygnał aktywny od 27 lat ...',
    '... nie powinieneś tutaj być ...',
    '... coś tu się stało ...',
    '... naukowcy ... eksperymenty ...',
    '... coś się uczyło ...',
    '... odpowiedź nadchodziła zanim pytaliśmy ...',
    '... słyszysz nas? ...',
    '... zostań z nami ...'
];

function defaultState() {
    return {
        radioOn: false,
        transmitterDestroyed: false,
        currentRoom: null,
        inventory: { latarka: false, klucz: false, tasma: false },
        visited: {},
        journal: [],
        messageIndex: 0
    };
}

let state = defaultState();

// ---------- SAVE / LOAD ----------
function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            inventory: state.inventory,
            visited: state.visited,
            journal: state.journal,
            messageIndex: state.messageIndex
        }));
    } catch (e) { /* storage unavailable, ignore */ }
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// ---------- AUDIO (procedural, no external files) ----------
let audioCtx = null;
let ambientNodes = null;

function getAudioCtx() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function playBeep(freq, duration, type) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

function playClick() { playBeep(500, 0.05, 'square'); }
function playPickup() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    playBeep(400, 0.08, 'square');
    setTimeout(() => playBeep(700, 0.12, 'square'), 90);
}
function playStatic(duration) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
}

function startAmbientHum() {
    const ctx = getAudioCtx();
    if (!ctx || ambientNodes) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const gain = ctx.createGain();
    gain.gain.value = 0.02;

    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.04;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0.05;

    osc.connect(gain).connect(ctx.destination);
    noise.connect(noiseGain).connect(ctx.destination);
    osc.start();
    noise.start();

    ambientNodes = { osc, noise, gain, noiseGain };
}

function stopAmbientHum() {
    if (!ambientNodes) return;
    try {
        ambientNodes.osc.stop();
        ambientNodes.noise.stop();
    } catch (e) {}
    ambientNodes = null;
}

// ---------- SCREEN FLICKER ----------
function scheduleFlicker() {
    const delay = 6000 + Math.random() * 9000;
    setTimeout(() => {
        const gameEl = document.getElementById('game');
        if (document.getElementById('gameScreen').classList.contains('active')) {
            gameEl.classList.add('flicker');
            setTimeout(() => gameEl.classList.remove('flicker'), 120 + Math.random() * 150);
        }
        scheduleFlicker();
    }, delay);
}

// ---------- MESSAGE / TYPEWRITER ----------
let typeTimer = null;
let clearTimer = null;

function setMessage(text, opts) {
    opts = opts || {};
    const el = document.getElementById('message');
    clearTimeout(typeTimer);
    clearTimeout(clearTimer);
    el.textContent = '';
    el.classList.add('typewriter-cursor');
    el.classList.remove('blink');

    let i = 0;
    function typeChar() {
        if (i <= text.length) {
            el.textContent = text.slice(0, i);
            i++;
            typeTimer = setTimeout(typeChar, 18);
        } else {
            el.classList.remove('typewriter-cursor');
            if (opts.blink) el.classList.add('blink');
            if (!opts.sticky) {
                clearTimer = setTimeout(() => { el.textContent = ''; el.classList.remove('blink'); }, opts.duration || 3000);
            }
        }
    }
    typeChar();
}

function clearMessageNow() {
    clearTimeout(typeTimer);
    clearTimeout(clearTimer);
    const el = document.getElementById('message');
    el.textContent = '';
    el.classList.remove('typewriter-cursor', 'blink');
}

// ---------- JOURNAL ----------
function addJournal(id, text) {
    if (state.journal.find(j => j.id === id)) return;
    state.journal.push({ id, text });
    saveGame();
}

function renderJournal() {
    const container = document.getElementById('journalEntries');
    container.innerHTML = '';
    if (state.journal.length === 0) {
        container.innerHTML = '<div class="journal-empty">Brak zapisków. Eksploruj stację.</div>';
        return;
    }
    state.journal.forEach(entry => {
        const div = document.createElement('div');
        div.className = 'journal-entry';
        div.textContent = entry.text;
        container.appendChild(div);
    });
}

// ---------- INVENTORY ----------
function grantItem(key) {
    if (state.inventory[key]) return;
    state.inventory[key] = true;
    playPickup();
    saveGame();
}

const ITEM_LABELS = { latarka: '🔦 Latarka', klucz: '🔑 Klucz', tasma: '📼 Taśma' };

function renderInventory() {
    const bar = document.getElementById('inventoryBar');
    bar.innerHTML = '';
    Object.keys(ITEM_LABELS).forEach(key => {
        const div = document.createElement('div');
        div.className = 'inv-item' + (state.inventory[key] ? ' owned' : '');
        div.textContent = ITEM_LABELS[key];
        bar.appendChild(div);
    });
}

// ---------- ROOMS ----------
function renderStation() {
    const station = document.getElementById('station');
    station.innerHTML = '';
    Object.keys(ROOMS).forEach(key => {
        const room = ROOMS[key];
        const locked = room.locked();
        const div = document.createElement('div');
        div.className = 'room' + (locked ? ' locked' : '') + (state.visited[key] ? ' visited' : '');
        div.innerHTML = `<span>${room.label}</span>` + (locked ? `<span class="room-hint">${room.lockedHint}</span>` : '');
        div.addEventListener('click', () => enterRoom(key));
        station.appendChild(div);
    });
}

function enterRoom(key) {
    const room = ROOMS[key];
    if (room.locked()) {
        playClick();
        setMessage('⚠ Zamknięte. ' + (room.lockedHint || ''), { duration: 2200 });
        return;
    }
    playClick();
    state.currentRoom = key;
    let text;
    if (!state.visited[key]) {
        state.visited[key] = true;
        text = room.onFirstEnter ? room.onFirstEnter() : room.onEnter();
    } else {
        text = room.onEnter();
    }
    setMessage(text, { duration: 4000 });
    renderStation();
    renderInventory();
    saveGame();
}

// ---------- RADIO ----------
function toggleRadio() {
    playClick();
    state.radioOn = !state.radioOn;
    updateRadioStatus();

    if (state.radioOn) {
        if (state.currentRoom === 'basement') {
            playMessage();
            startAmbientHum();
        } else {
            playStatic(1.2);
            setMessage('📻 Szum. Szumy. Nic poza szumem...', { duration: 3000 });
        }
    } else {
        stopAmbientHum();
        clearMessageNow();
    }
}

function playMessage() {
    const msg = RADIO_MESSAGES[state.messageIndex % RADIO_MESSAGES.length];
    addJournal('transmission_' + (state.messageIndex % RADIO_MESSAGES.length), '📻 Transmisja: "' + msg.replace(/\.\.\./g, '').trim() + '"');
    state.messageIndex++;
    setMessage('📻 ' + msg, { duration: 4000, blink: true });
    saveGame();
}

function respondSignal() {
    playClick();
    if (!state.radioOn || state.currentRoom !== 'basement') {
        setMessage('⚠ Radio musi być włączone, w piwnicy!', { duration: 2200 });
        return;
    }
    stopAmbientHum();
    showScreen('ending2');
}

function destroyRadio() {
    playClick();
    if (state.currentRoom !== 'basement') {
        setMessage('⚠ Transmitter jest w piwnicy!', { duration: 2200 });
        return;
    }
    state.transmitterDestroyed = true;
    stopAmbientHum();
    showScreen('ending1');
}

function playTape() {
    playClick();
    if (state.currentRoom !== 'tower') {
        setMessage('⚠ Brak magnetofonu tutaj.', { duration: 2200 });
        return;
    }
    if (!state.inventory.tasma) {
        setMessage('⚠ Nie masz taśmy do odtworzenia.', { duration: 2200 });
        return;
    }
    playStatic(1.5);
    stopAmbientHum();
    setTimeout(() => showScreen('ending4'), 900);
}

function updateRadioStatus() {
    const status = document.getElementById('radioStatus');
    if (state.radioOn) {
        status.textContent = 'RADIO: ON 📻';
        status.style.textShadow = '0 0 10px #ff0000';
    } else {
        status.textContent = 'RADIO: OFF';
        status.style.textShadow = 'none';
    }
}

// ---------- SCREENS ----------
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
}

function startGame(fromSave) {
    getAudioCtx();
    if (fromSave) {
        const saved = loadGame();
        state = defaultState();
        if (saved) {
            state.inventory = Object.assign(state.inventory, saved.inventory);
            state.visited = saved.visited || {};
            state.journal = saved.journal || [];
            state.messageIndex = saved.messageIndex || 0;
        }
    } else {
        state = defaultState();
        clearSave();
    }
    showScreen('gameScreen');
    updateRadioStatus();
    clearMessageNow();
    renderStation();
    renderInventory();
    saveGame();
}

function backToMenu() {
    stopAmbientHum();
    showScreen('menu');
    state.currentRoom = null;
    renderMenu();
}

function renderMenu() {
    const container = document.getElementById('continueBtnContainer');
    container.innerHTML = '';
    if (loadGame()) {
        const btn = document.createElement('button');
        btn.className = 'btn small ghost';
        btn.textContent = 'WCZYTAJ ZAPIS';
        btn.addEventListener('click', () => startGame(true));
        container.appendChild(btn);
    }
}

// ---------- EVENT WIRING ----------
document.getElementById('newGameBtn').addEventListener('click', () => startGame(false));
document.getElementById('radioBtn').addEventListener('click', toggleRadio);
document.getElementById('respondBtn').addEventListener('click', respondSignal);
document.getElementById('destroyBtn').addEventListener('click', destroyRadio);
document.getElementById('playTapeBtn').addEventListener('click', playTape);
document.getElementById('backBtn').addEventListener('click', backToMenu);
document.querySelectorAll('.back-menu').forEach(btn => btn.addEventListener('click', backToMenu));

document.getElementById('journalBtn').addEventListener('click', () => {
    playClick();
    renderJournal();
    document.getElementById('journalModal').classList.add('active');
});
document.getElementById('closeJournalBtn').addEventListener('click', () => {
    playClick();
    document.getElementById('journalModal').classList.remove('active');
});

document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.screen.active').id;
    if (activeScreen !== 'gameScreen') return;
    const key = e.key.toLowerCase();
    if (key === 'r') toggleRadio();
    if (key === 'e') respondSignal();
    if (key === 'q') destroyRadio();
    if (key === 'p') playTape();
    if (key === 'escape') backToMenu();
});

// EASTER EGG - alternative path to KONTYNUACJA ending
let easterEggCounter = 0;
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') easterEggCounter++;
    else easterEggCounter = 0;

    if (easterEggCounter === 5) {
        const activeScreen = document.querySelector('.screen.active').id;
        if (activeScreen === 'gameScreen' && state.currentRoom === 'basement' && state.radioOn) {
            easterEggCounter = 0;
            setMessage('⚡ TRANSMITTER ZAPALA SIĘ...', { sticky: true });
            setTimeout(() => {
                stopAmbientHum();
                showScreen('ending3');
            }, 2000);
        }
    }
});

// ---------- INIT ----------
renderMenu();
scheduleFlicker();

console.log('🎮 SYGNAŁ Game Ready (v2)');
console.log('Kontrola: R-Radio | E-Odpowiedz | Q-Zniszcz | P-Taśma | ESC-Menu');
console.log('Znajdź latarkę, klucz i taśmę, by odblokować Wieżę Nadawczą i prawdziwe zakończenie.');
console.log('Easter Egg: Naciśnij ↑ 5x w piwnicy z radiem włączonym');

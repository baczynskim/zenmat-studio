// SYGNAŁ - Game Logic v3 (2D Canvas + Jumpscares)

const SAVE_KEY = 'sygnal_save_v3';
const W = 900, H = 600;

// ---------- WORLD LAYOUT ----------
const ZONES = {
    entrance: { x: 20, y: 400, w: 220, h: 180, color: '#1a1a2e', label: 'WEJŚCIE' },
    control:  { x: 20, y: 20,  w: 220, h: 220, color: '#1a2e2e', label: 'SALA KONTROLI' },
    archive:  { x: 660, y: 20, w: 220, h: 220, color: '#2e1a2e', label: 'ARCHIWUM' },
    basement: { x: 340, y: 400, w: 220, h: 180, color: '#2e1a1a', label: 'PIWNICA' },
    tower:    { x: 660, y: 400, w: 220, h: 180, color: '#2e2a1a', label: 'WIEŻA NADAWCZA' }
};

const OUTER_WALLS = [
    { x: 0, y: 0, w: W, h: 20 },
    { x: 0, y: H - 20, w: W, h: 20 },
    { x: 0, y: 0, w: 20, h: H },
    { x: W - 20, y: 0, w: 20, h: H }
];

const BASEMENT_DOOR = { x: 430, y: 376, w: 60, h: 24 };
const TOWER_DOOR = { x: 750, y: 376, w: 60, h: 24 };

const ITEM_DEFS = {
    latarka: { x: 120, y: 430, label: '🔦', zone: 'entrance' },
    klucz:   { x: 120, y: 120, label: '🔑', zone: 'control' },
    tasma:   { x: 770, y: 120, label: '📼', zone: 'archive' }
};

const RADIO_POS = { x: 450, y: 470, r: 26 };
const TAPE_POS = { x: 770, y: 470, r: 26 };

const RADIO_MESSAGES = [
    'sygnał aktywny od 27 lat',
    'nie powinieneś tutaj być',
    'coś tu się stało',
    'naukowcy... eksperymenty',
    'coś się uczyło',
    'odpowiedź nadchodziła zanim pytaliśmy',
    'słyszysz nas?',
    'zostań z nami'
];

const NOTES = {
    latarka: 'Notatka przy drzwiach: "Nie wchodźcie do piwnicy sami."',
    klucz: 'Log operatora, 1971: "Sygnał przyszedł znikąd. Odpowiedzieliśmy."',
    tasma: 'Etykieta na taśmie: "NAGRANIE #3 – NIE ODTWARZAĆ W NOCY"',
    basement: 'Piwnica: kable prowadzą do nadajnika. Ktoś nigdy go nie wyłączył.',
    tower: 'Na szczycie wieży: stary magnetofon. Pasuje do taśmy.'
};

// ---------- STATE ----------
function defaultState() {
    return {
        radioOn: false,
        currentRoom: 'entrance',
        inventory: { latarka: false, klucz: false, tasma: false },
        visited: {},
        journal: [],
        messageIndex: 0
    };
}

let state = defaultState();

let player = { x: 120, y: 470, r: 12, speed: 3.4 };
let keys = { up: false, down: false, left: false, right: false };
let animId = null;
let scare = { active: false, type: null, until: 0 };
let flashFrames = 0;
let shakeUntil = 0;
let lastAmbientTime = 0;

// ---------- SAVE / LOAD ----------
function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            inventory: state.inventory,
            visited: state.visited,
            journal: state.journal,
            messageIndex: state.messageIndex
        }));
    } catch (e) {}
}

function loadGame() {
    try {
        const raw = localStorage.getItem(SAVE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
}

function clearSave() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
}

// ---------- AUDIO ----------
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
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
}

function playClick() { playBeep(500, 0.05, 'square'); }
function playPickup() {
    playBeep(400, 0.08, 'square');
    setTimeout(() => playBeep(700, 0.12, 'square'), 90);
}

function playStatic(duration) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain).connect(ctx.destination);
    source.start();
}

function playShriek(intensity) {
    const ctx = getAudioCtx();
    if (!ctx) return;
    const dur = intensity === 'big' ? 0.5 : 0.25;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(intensity === 'big' ? 1400 : 900, ctx.currentTime + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(intensity === 'big' ? 0.22 : 0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
    playStatic(dur);
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

    ambientNodes = { osc, noise };
}

function stopAmbientHum() {
    if (!ambientNodes) return;
    try { ambientNodes.osc.stop(); ambientNodes.noise.stop(); } catch (e) {}
    ambientNodes = null;
}

// ---------- MESSAGE ----------
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
            typeTimer = setTimeout(typeChar, 16);
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
const ITEM_LABELS = { latarka: '🔦 Latarka', klucz: '🔑 Klucz', tasma: '📼 Taśma' };

function grantItem(key) {
    if (state.inventory[key]) return;
    state.inventory[key] = true;
    playPickup();
    saveGame();
}

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

// ---------- COLLISION / WORLD HELPERS ----------
function getWalls() {
    const walls = OUTER_WALLS.slice();
    if (!state.inventory.klucz) walls.push(BASEMENT_DOOR);
    const allItems = state.inventory.klucz && state.inventory.latarka && state.inventory.tasma;
    if (!allItems) walls.push(TOWER_DOOR);
    return walls;
}

function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function canMoveTo(x, y) {
    const box = { x: x - player.r, y: y - player.r, w: player.r * 2, h: player.r * 2 };
    const walls = getWalls();
    for (let i = 0; i < walls.length; i++) {
        if (rectsOverlap(box, walls[i])) return false;
    }
    return true;
}

function pointInZone(x, y, zone) {
    return x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h;
}

function getCurrentZone(x, y) {
    for (const key in ZONES) {
        if (pointInZone(x, y, ZONES[key])) return key;
    }
    return 'korytarz';
}

function dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
}

// ---------- JUMPSCARES ----------
function triggerScare(type) {
    if (scare.active) return;
    const big = type === 'basement_first' || type === 'tower_first';
    scare.active = true;
    scare.type = type;
    scare.until = performance.now() + (big ? 550 : 320);
    flashFrames = big ? 5 : 3;
    shakeUntil = performance.now() + (big ? 500 : 300);
    playShriek(big ? 'big' : 'small');
    setTimeout(() => {
        scare.active = false;
        setMessage(big ? 'Coś tu było...' : 'Kątem oka... coś się poruszyło.', { duration: 2200 });
    }, big ? 560 : 330);
}

function maybeAmbientScare(now) {
    const itemsOwned = Object.values(state.inventory).filter(Boolean).length;
    if (itemsOwned === 0) return;
    if (scare.active) return;
    if (now - lastAmbientTime < 11000) return;
    lastAmbientTime = now + Math.random() * 6000;
    if (Math.random() < 0.55) triggerScare('ambient');
}

// ---------- UPDATE ----------
function update(now) {
    let dx = 0, dy = 0;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    const nx = player.x + dx * player.speed;
    const ny = player.y + dy * player.speed;
    if (dx !== 0 && canMoveTo(nx, player.y)) player.x = nx;
    if (dy !== 0 && canMoveTo(player.x, ny)) player.y = ny;

    const zone = getCurrentZone(player.x, player.y);
    if (zone !== state.currentRoom) {
        state.currentRoom = zone;
        onEnterZone(zone);
    }

    Object.keys(ITEM_DEFS).forEach(key => {
        if (state.inventory[key]) return;
        const def = ITEM_DEFS[key];
        if (dist(player.x, player.y, def.x, def.y) < player.r + 16) {
            grantItem(key);
            addJournal(key, NOTES[key]);
            setMessage(def.label + ' ZNALEZIONO: ' + ITEM_LABELS[key].split(' ').slice(1).join(' '), { duration: 3000 });
            renderInventory();
        }
    });

    maybeAmbientScare(now);
    saveGame();
}

function onEnterZone(zone) {
    if (zone === 'basement' && !state.visited.basement) {
        state.visited.basement = true;
        addJournal('basement', NOTES.basement);
        setTimeout(() => triggerScare('basement_first'), 350);
    }
    if (zone === 'tower' && !state.visited.tower) {
        state.visited.tower = true;
        addJournal('tower', NOTES.tower);
        setTimeout(() => triggerScare('tower_first'), 350);
    }
}

// ---------- DRAW ----------
function draw(now) {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    ctx.save();
    if (now < shakeUntil) {
        const mag = 6;
        ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    ctx.fillStyle = '#050505';
    ctx.fillRect(-20, -20, W + 40, H + 40);

    Object.keys(ZONES).forEach(key => {
        const z = ZONES[key];
        ctx.fillStyle = z.color;
        ctx.fillRect(z.x, z.y, z.w, z.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.strokeRect(z.x, z.y, z.w, z.h);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '13px monospace';
        ctx.fillText(z.label, z.x + 10, z.y + 18);
    });

    ctx.fillStyle = '#3a3a3a';
    OUTER_WALLS.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    if (!state.inventory.klucz) drawLockedDoor(ctx, BASEMENT_DOOR);
    if (!(state.inventory.klucz && state.inventory.latarka && state.inventory.tasma)) drawLockedDoor(ctx, TOWER_DOOR);

    Object.keys(ITEM_DEFS).forEach(key => {
        if (state.inventory[key]) return;
        const def = ITEM_DEFS[key];
        ctx.font = '22px serif';
        ctx.fillText(def.label, def.x - 11, def.y + 8);
    });

    drawConsole(ctx, RADIO_POS.x, RADIO_POS.y, state.radioOn);
    drawConsole(ctx, TAPE_POS.x, TAPE_POS.y, false);

    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
    ctx.fillStyle = '#00ff66';
    ctx.shadowColor = '#00ff66';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    const radius = state.inventory.latarka ? 170 : 85;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.90)';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    const grad = ctx.createRadialGradient(player.x, player.y, radius * 0.15, player.x, player.y, radius);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    if (scare.active) drawMonster(ctx, scare.type === 'ambient');

    if (flashFrames > 0) {
        ctx.fillStyle = 'rgba(255,0,0,' + (0.35 * flashFrames / 5) + ')';
        ctx.fillRect(0, 0, W, H);
        flashFrames--;
    }
}

function drawLockedDoor(ctx, d) {
    ctx.fillStyle = 'rgba(255,0,0,0.35)';
    ctx.fillRect(d.x, d.y, d.w, d.h);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(d.x, d.y, d.w, d.h);
}

function drawConsole(ctx, x, y, active) {
    ctx.fillStyle = active ? '#003300' : '#111';
    ctx.fillRect(x - 24, y - 18, 48, 36);
    ctx.strokeStyle = active ? '#00ff00' : '#555';
    ctx.strokeRect(x - 24, y - 18, 48, 36);
    if (active) {
        ctx.fillStyle = '#00ff00';
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 8;
        ctx.fillRect(x - 16, y - 6, 8, 8);
        ctx.shadowBlur = 0;
    }
}

function drawMonster(ctx, small) {
    const cx = W / 2, cy = small ? H / 2 - 40 : H / 2;
    const scale = small ? 0.55 : 1.4;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#0a0000';
    ctx.beginPath();
    ctx.ellipse(0, 30, 60, 90, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -50, 45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff0000';
    ctx.shadowColor = '#ff0000';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(-16, -55, 7, 0, Math.PI * 2);
    ctx.arc(16, -55, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

// ---------- LOOP ----------
function loop(ts) {
    update(ts || performance.now());
    draw(ts || performance.now());
    animId = requestAnimationFrame(loop);
}

function startLoop() {
    if (animId) cancelAnimationFrame(animId);
    animId = requestAnimationFrame(loop);
}

function stopLoop() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
}

// ---------- RADIO / ACTIONS ----------
function nearRadio() { return dist(player.x, player.y, RADIO_POS.x, RADIO_POS.y) < player.r + RADIO_POS.r; }
function nearTape() { return dist(player.x, player.y, TAPE_POS.x, TAPE_POS.y) < player.r + TAPE_POS.r; }

function toggleRadio() {
    playClick();
    if (!nearRadio()) {
        setMessage('⚠ Musisz stać przy nadajniku, w piwnicy.', { duration: 2200 });
        return;
    }
    state.radioOn = !state.radioOn;
    if (state.radioOn) {
        playMessage();
        startAmbientHum();
    } else {
        stopAmbientHum();
        clearMessageNow();
    }
}

function playMessage() {
    const msg = RADIO_MESSAGES[state.messageIndex % RADIO_MESSAGES.length];
    addJournal('transmission_' + (state.messageIndex % RADIO_MESSAGES.length), '📻 Transmisja: "' + msg + '"');
    state.messageIndex++;
    setMessage('📻 ' + msg, { duration: 4000, blink: true });
    saveGame();
}

function respondSignal() {
    playClick();
    if (!nearRadio() || !state.radioOn) {
        setMessage('⚠ Radio musi być włączone, przy nadajniku!', { duration: 2200 });
        return;
    }
    stopAmbientHum();
    stopLoop();
    showScreen('ending2');
}

function destroyRadio() {
    playClick();
    if (!nearRadio()) {
        setMessage('⚠ Nadajnik jest w piwnicy!', { duration: 2200 });
        return;
    }
    stopAmbientHum();
    stopLoop();
    showScreen('ending1');
}

function playTape() {
    playClick();
    if (!nearTape()) {
        setMessage('⚠ Brak magnetofonu tutaj.', { duration: 2200 });
        return;
    }
    if (!state.inventory.tasma) {
        setMessage('⚠ Nie masz taśmy do odtworzenia.', { duration: 2200 });
        return;
    }
    playStatic(1.5);
    stopAmbientHum();
    setTimeout(() => { stopLoop(); showScreen('ending4'); }, 900);
}

// ---------- EASTER EGG ----------
let easterEggCounter = 0;
function checkEasterEgg(e) {
    if (e.key === 'ArrowUp') easterEggCounter++;
    else easterEggCounter = 0;

    if (easterEggCounter === 5) {
        easterEggCounter = 0;
        if (document.getElementById('gameScreen').classList.contains('active') && nearRadio() && state.radioOn) {
            setMessage('⚡ TRANSMITTER ZAPALA SIĘ...', { sticky: true });
            setTimeout(() => { stopAmbientHum(); stopLoop(); showScreen('ending3'); }, 2000);
        }
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
    player = { x: 120, y: 470, r: 12, speed: 3.4 };
    scare = { active: false, type: null, until: 0 };
    flashFrames = 0;
    shakeUntil = 0;
    lastAmbientTime = performance.now() + 6000;

    showScreen('gameScreen');
    clearMessageNow();
    renderInventory();
    saveGame();
    startLoop();
}

function backToMenu() {
    stopAmbientHum();
    stopLoop();
    showScreen('menu');
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

function setKey(key, val) {
    if (key === 'w' || key === 'arrowup') keys.up = val;
    if (key === 's' || key === 'arrowdown') keys.down = val;
    if (key === 'a' || key === 'arrowleft') keys.left = val;
    if (key === 'd' || key === 'arrowright') keys.right = val;
}

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('gameScreen').classList.contains('active')) return;
    const key = e.key.toLowerCase();
    setKey(key, true);
    if (key === 'r') toggleRadio();
    if (key === 'e') respondSignal();
    if (key === 'q') destroyRadio();
    if (key === 'p') playTape();
    if (key === 'escape') backToMenu();
    checkEasterEgg(e);
});

document.addEventListener('keyup', (e) => {
    setKey(e.key.toLowerCase(), false);
});

// touch controls
function bindHold(id, onDown, onUp) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = (ev) => { ev.preventDefault(); onDown(); };
    const end = (ev) => { ev.preventDefault(); onUp(); };
    el.addEventListener('touchstart', start);
    el.addEventListener('touchend', end);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
}

bindHold('tUp', () => keys.up = true, () => keys.up = false);
bindHold('tDown', () => keys.down = true, () => keys.down = false);
bindHold('tLeft', () => keys.left = true, () => keys.left = false);
bindHold('tRight', () => keys.right = true, () => keys.right = false);

const tR = document.getElementById('tR');
if (tR) tR.addEventListener('click', toggleRadio);
const tE = document.getElementById('tE');
if (tE) tE.addEventListener('click', respondSignal);
const tQ = document.getElementById('tQ');
if (tQ) tQ.addEventListener('click', destroyRadio);
const tP = document.getElementById('tP');
if (tP) tP.addEventListener('click', playTape);

// ---------- INIT ----------
renderMenu();

console.log('🎮 SYGNAŁ Game Ready (v3 - 2D + Jumpscares)');
console.log('Ruch: WASD / Strzałki | R-Radio | E-Odpowiedz | Q-Zniszcz | P-Taśma | ESC-Menu');
console.log('Znajdź latarkę, klucz i taśmę, by odblokować Wieżę Nadawczą i prawdziwe zakończenie.');
console.log('Uwaga: nagłe wydarzenia mogą wystąpić losowo w ciemności.');

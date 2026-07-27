// SYGNAŁ - Game Logic v5 (Bigger Map + Hiding + Lever Puzzle + Rebalanced Entity)

const SAVE_KEY = 'sygnal_save_v5';
const W = 1800, H = 1100;

// ---------- WORLD LAYOUT ----------
const ZONES = {
    control:   { x: 50,   y: 20,  w: 260, h: 240, color: '#1a2e2e', label: 'SALA KONTROLI' },
    strych:    { x: 770,  y: 20,  w: 260, h: 240, color: '#22261a', label: 'STRYCH' },
    archive:   { x: 1490, y: 20,  w: 260, h: 240, color: '#2e1a2e', label: 'ARCHIWUM' },

    kotlownia: { x: 50,   y: 340, w: 260, h: 220, color: '#242424', label: 'KOTŁOWNIA' },
    biuro:     { x: 1490, y: 340, w: 260, h: 220, color: '#1a1a1a', label: 'BIURO DYREKTORA' },

    entrance:  { x: 50,   y: 760, w: 240, h: 240, color: '#1a1a2e', label: 'WEJŚCIE' },
    basement:  { x: 580,  y: 760, w: 240, h: 240, color: '#2e1a1a', label: 'PIWNICA' },
    generator: { x: 1080, y: 760, w: 240, h: 240, color: '#242424', label: 'GENERATOR' },
    tower:     { x: 1520, y: 760, w: 240, h: 240, color: '#2e2a1a', label: 'WIEŻA NADAWCZA' },

    schowek1:  { x: 350,  y: 640, w: 110, h: 110, color: '#101010', label: 'SCHOWEK' },
    schowek2:  { x: 820,  y: 640, w: 110, h: 110, color: '#101010', label: 'SCHOWEK' },
    schowek3:  { x: 1300, y: 640, w: 110, h: 110, color: '#101010', label: 'SCHOWEK' },

    wyjscie:   { x: 1370, y: 800, w: 120, h: 150, color: '#0a1a0a', label: 'WYJŚCIE EWAKUACYJNE' }
};

const EVAC_DOOR = { x: 1405, y: 792, w: 50, h: 24 };

const OUTER_WALLS = [
    { x: 0, y: 0, w: W, h: 20 },
    { x: 0, y: H - 20, w: W, h: 20 },
    { x: 0, y: 0, w: 20, h: H },
    { x: W - 20, y: 0, w: 20, h: H }
];

const BASEMENT_DOOR = { x: 670, y: 752, w: 60, h: 24 };
const TOWER_DOOR = { x: 1610, y: 752, w: 60, h: 24 };
const STRYCH_DOOR = { x: 870, y: 252, w: 60, h: 24 };
const OFFICE_DOOR = { x: 1482, y: 420, w: 24, h: 60 };

const ITEM_DEFS = {
    latarka: { x: 170, y: 920, label: '🔦' },
    klucz:   { x: 180, y: 140, label: '🔑' },
    tasma:   { x: 1620, y: 140, label: '📼' }
};

const RADIO_POS = { x: 700, y: 880, r: 26 };
const TAPE_POS = { x: 1640, y: 880, r: 26 };
const GENERATOR_POS = { x: 1200, y: 880, r: 26 };
const LEVER_POS = { x: 180, y: 450, r: 26 };

const LORE_DEFS = {
    lore1: { x: 400, y: 300, label: '📄' },
    lore2: { x: 900, y: 300, label: '📄' },
    lore3: { x: 1400, y: 300, label: '📄' }
};

const CODE = '472';
const LEVER_TARGET = [true, false, true];

const NOTES = {
    latarka: 'Notatka przy drzwiach: "Nie wchodźcie do piwnicy sami." Fragment kodu (1): 4',
    klucz: 'Log operatora, 1971: "Sygnał przyszedł znikąd. Odpowiedzieliśmy." Fragment kodu (2): 7',
    tasma: 'Etykieta na taśmie: "NAGRANIE #3 – NIE ODTWARZAĆ W NOCY" Fragment kodu (3): 2',
    basement: 'Piwnica: kable prowadzą do nadajnika. Ktoś nigdy go nie wyłączył.',
    tower: 'Na szczycie wieży: stary magnetofon. Pasuje do taśmy.',
    generator: 'Generator huczy do życia. Zamek biura i strychu reagują na prąd.',
    strych: 'Strych: skrzynia pełna zdjęć. Wszyscy operatorzy mają ten sam pusty wzrok na oczach.',
    kotlownia: 'Instrukcja na ścianie kotłowni: "GÓRA - DÓŁ - GÓRA"',
    kotlownia_solved: 'Dźwignie ustawione poprawnie. Coś w Biurze Dyrektora się odblokowało.',
    biuro: 'Biuro Dyrektora: teczka "PROJEKT ECHO". Ostatni wpis: "Ono nie nadaje. Ono nasłuchuje."',
    completionist: 'Odkryto wszystkie tajemnice stacji SYGNAŁ. Nie zostało już nic do znalezienia.',
    lore1: 'Luźna kartka: "Dzień 4. Słyszę kroki w korytarzu, kiedy radio milczy."',
    lore2: 'Luźna kartka: "Dzień 9. Nie jesteśmy pierwsi, którzy tu przyszli. Nie będziemy ostatni."',
    lore3: 'Luźna kartka: "Dzień 12. Jeśli to czytasz — wyłącz radio i idź do wyjścia. Nie czekaj."'
};

const RADIO_MESSAGES = [
    'sygnał aktywny od 27 lat',
    'nie powinieneś tutaj być',
    'coś tu się stało',
    'naukowcy... eksperymenty',
    'coś się uczyło',
    'odpowiedź nadchodziła zanim pytaliśmy',
    'słyszysz nas?',
    'zostań z nami',
    'ono też Cię słyszy',
    'nie chowaj się za długo',
    'projekt echo... wciąż aktywny',
    'byliśmy tacy jak ty'
];

// ---------- STATE ----------
function defaultState() {
    return {
        radioOn: false,
        currentRoom: 'entrance',
        inventory: { latarka: false, klucz: false, tasma: false },
        visited: {},
        journal: [],
        messageIndex: 0,
        generatorSolved: false,
        kotlowniaSolved: false,
        deathCount: 0,
        hiding: false
    };
}

let state = defaultState();
let sessionStart = 0;
let scaresTriggered = 0;

const SPAWN = { x: 130, y: 920 };
let player = { x: SPAWN.x, y: SPAWN.y, r: 12, speed: 3.4 };
let keys = { up: false, down: false, left: false, right: false };
let animId = null;
let scare = { active: false, type: null };
let flashFrames = 0;
let shakeUntil = 0;
let lastAmbientTime = 0;
let lastStepTime = 0;
let lastHeartbeat = 0;
let keypadInput = '';
let leverStates = [false, false, false];

// ---------- ENTITY (Cień - patrols, chases when close) ----------
const ENTITY_WAYPOINTS = [
    { x: 200, y: 700 }, { x: 1600, y: 700 }, { x: 1600, y: 650 }, { x: 200, y: 650 }
];
let entity = { x: 150, y: 560, r: 14, speed: 1.7, chaseSpeed: 2.7, wpIndex: 0, mode: 'patrol', active: false };

function resetEntity() {
    entity = { x: ENTITY_WAYPOINTS[0].x, y: ENTITY_WAYPOINTS[0].y, r: 14, speed: 1.7, chaseSpeed: 2.7, wpIndex: 0, mode: 'patrol', active: false };
}

// ---------- ENTITY 2 (Cichy - drawn toward an active radio) ----------
const CICHY_HOME = { x: 1750, y: 1050 };
let entity2 = { x: CICHY_HOME.x, y: CICHY_HOME.y, r: 13, speed: 1.9, homeSpeed: 1.0, active: false, warned: false };

function resetEntity2() {
    entity2 = { x: CICHY_HOME.x, y: CICHY_HOME.y, r: 13, speed: 1.9, homeSpeed: 1.0, active: false, warned: false };
}

// ---------- SAVE / LOAD ----------
function saveGame() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
            inventory: state.inventory,
            visited: state.visited,
            journal: state.journal,
            messageIndex: state.messageIndex,
            generatorSolved: state.generatorSolved,
            kotlowniaSolved: state.kotlowniaSolved,
            deathCount: state.deathCount
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
let muted = false;

function getAudioCtx() {
    if (muted) return null;
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function toggleMute() {
    muted = !muted;
    const btn = document.getElementById('muteBtn');
    btn.textContent = muted ? '🔇' : '🔊';
    if (muted) stopAmbientHum();
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
function playError() { playBeep(150, 0.25, 'sawtooth'); }
function playSuccessChime() {
    playBeep(500, 0.1, 'square');
    setTimeout(() => playBeep(700, 0.1, 'square'), 100);
    setTimeout(() => playBeep(900, 0.18, 'square'), 200);
}
function playStep() { playBeep(90, 0.04, 'square'); }
function playDetect() { playBeep(300, 0.3, 'sawtooth'); }
function playHeartbeat(strength) {
    playBeep(70, 0.09, 'sine');
    setTimeout(() => playBeep(60, 0.11, 'sine'), 120 + (1 - strength) * 60);
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

function renderStats(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const elapsedSec = Math.max(0, Math.floor((performance.now() - sessionStart) / 1000));
    const mins = Math.floor(elapsedSec / 60);
    const secs = elapsedSec % 60;
    const timeStr = mins + ':' + String(secs).padStart(2, '0');
    const itemsCount = Object.values(state.inventory).filter(Boolean).length;
    const journalCount = state.journal.length;
    let line = '⏱ Czas: ' + timeStr + ' | 🎒 Przedmioty: ' + itemsCount + '/3 | 📓 Wpisy: ' + journalCount + ' | 👻 Wydarzenia: ' + scaresTriggered;
    if (state.deathCount > 0) line += ' | 💀 Złapań: ' + state.deathCount;
    el.textContent = line;
}

// ---------- OBJECTIVE HUD ----------
function updateObjective() {
    const el = document.getElementById('objective');
    if (!el) return;
    const hasAll = state.inventory.latarka && state.inventory.klucz && state.inventory.tasma;
    let text;
    if (!hasAll) {
        text = '🎯 Cel: znajdź latarkę, klucz i taśmę w stacji.';
    } else if (!state.generatorSolved) {
        text = '🎯 Cel: znajdź fragmenty kodu (Dziennik) i uruchom Generator (F).';
    } else if (!state.kotlowniaSolved) {
        text = '🎯 Cel: w Kotłowni ustaw dźwignie wg instrukcji (F), by otworzyć Biuro.';
    } else if (!state.visited.biuro) {
        text = '🎯 Cel: Biuro Dyrektora jest już otwarte — sprawdź je.';
    } else if (!state.visited.strych) {
        text = '🎯 Cel: Strych jest odblokowany — sprawdź, co tam jest.';
    } else if (!isFullyComplete()) {
        text = '🎯 Cel: zdecyduj, co zrobisz z sygnałem (Piwnica: R/E/Q, Wieża: P).';
    } else {
        text = '🎯 Wszystko odkryte! Wyjście ewakuacyjne jest otwarte.';
    }
    el.textContent = text;
}

function checkCompletion() {
    if (isFullyComplete()) addJournal('completionist', NOTES.completionist);
}

// ---------- COLLISION / WORLD HELPERS ----------
function isFullyComplete() {
    return state.inventory.latarka && state.inventory.klucz && state.inventory.tasma &&
        state.generatorSolved && state.kotlowniaSolved &&
        state.visited.basement && state.visited.tower && state.visited.strych && state.visited.biuro;
}

function getWalls() {
    const walls = OUTER_WALLS.slice();
    if (!state.inventory.klucz) walls.push(BASEMENT_DOOR);
    const allItems = state.inventory.klucz && state.inventory.latarka && state.inventory.tasma;
    if (!allItems) walls.push(TOWER_DOOR);
    if (!state.generatorSolved) walls.push(STRYCH_DOOR);
    if (!state.kotlowniaSolved) walls.push(OFFICE_DOOR);
    if (!isFullyComplete()) walls.push(EVAC_DOOR);
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

function isSchowek(zone) {
    return zone === 'schowek1' || zone === 'schowek2' || zone === 'schowek3';
}

function dist(x1, y1, x2, y2) {
    return Math.hypot(x1 - x2, y1 - y2);
}

function anyModalOpen() {
    return document.querySelector('.modal.active') !== null;
}

// ---------- JUMPSCARES ----------
function triggerScare(type) {
    if (scare.active) return;
    scaresTriggered++;
    const big = type === 'basement_first' || type === 'tower_first' || type === 'strych_first' || type === 'biuro_first';
    scare.active = true;
    scare.type = type;
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
    if (scare.active || state.hiding) return;
    if (now - lastAmbientTime < 15000) return;
    lastAmbientTime = now + Math.random() * 6000;
    if (Math.random() < 0.5) triggerScare('ambient');
}

// ---------- ENTITY AI ----------
function moveEntityToward(tx, ty, speed) {
    const ang = Math.atan2(ty - entity.y, tx - entity.x);
    entity.x += Math.cos(ang) * speed;
    entity.y += Math.sin(ang) * speed;
}

function updateEntity(now) {
    const itemsOwned = Object.values(state.inventory).filter(Boolean).length;
    if (!entity.active) {
        if (itemsOwned >= 1) entity.active = true;
        else return;
    }

    if (state.hiding && entity.mode === 'chase') {
        entity.mode = 'patrol';
    }

    const wp = ENTITY_WAYPOINTS[entity.wpIndex];

    if (state.hiding) {
        const d = dist(entity.x, entity.y, wp.x, wp.y);
        if (d < 6) entity.wpIndex = (entity.wpIndex + 1) % ENTITY_WAYPOINTS.length;
        else moveEntityToward(wp.x, wp.y, entity.speed);
        return;
    }

    const dToPlayer = dist(entity.x, entity.y, player.x, player.y);

    if (entity.mode === 'patrol') {
        if (dToPlayer < 230) {
            entity.mode = 'chase';
            playDetect();
        } else {
            const d = dist(entity.x, entity.y, wp.x, wp.y);
            if (d < 6) entity.wpIndex = (entity.wpIndex + 1) % ENTITY_WAYPOINTS.length;
            else moveEntityToward(wp.x, wp.y, entity.speed);
        }
    } else if (entity.mode === 'chase') {
        if (dToPlayer > 400) {
            entity.mode = 'patrol';
        } else {
            moveEntityToward(player.x, player.y, entity.chaseSpeed);
        }
    }

    entity.x = Math.max(30, Math.min(W - 30, entity.x));
    entity.y = Math.max(30, Math.min(H - 30, entity.y));

    if (dToPlayer < player.r + entity.r) {
        getCaught();
    }
}

function updateEntity2(now) {
    if (!entity2.active) return;
    if (state.hiding) return;

    if (state.radioOn) {
        moveEntityLike(entity2, RADIO_POS.x, RADIO_POS.y, entity2.speed);
        if (!entity2.warned && dist(entity2.x, entity2.y, RADIO_POS.x, RADIO_POS.y) < 220) {
            entity2.warned = true;
            setMessage('👂 Coś zbliża się do sygnału...', { duration: 2600 });
        }
    } else {
        moveEntityLike(entity2, CICHY_HOME.x, CICHY_HOME.y, entity2.homeSpeed);
    }

    const dToPlayer = dist(entity2.x, entity2.y, player.x, player.y);
    if (dToPlayer < player.r + entity2.r) {
        getCaught();
    }
}

function moveEntityLike(e, tx, ty, speed) {
    const d = dist(e.x, e.y, tx, ty);
    if (d < 6) return;
    const ang = Math.atan2(ty - e.y, tx - e.x);
    e.x += Math.cos(ang) * speed;
    e.y += Math.sin(ang) * speed;
}

function getCaught() {
    if (window.__gameOverTriggered) return;
    window.__gameOverTriggered = true;
    state.deathCount++;
    saveGame();
    stopAmbientHum();
    flashFrames = 6;
    shakeUntil = performance.now() + 500;
    playShriek('big');
    setTimeout(() => {
        stopLoop();
        renderStats('statsGameOver');
        showScreen('gameOverScreen');
        window.__gameOverTriggered = false;
    }, 500);
}

// ---------- HIDING ----------
function toggleHiding() {
    const zone = getCurrentZone(player.x, player.y);
    if (!isSchowek(zone) && !state.hiding) {
        setMessage('⚠ Brak kryjówki w pobliżu.', { duration: 1800 });
        return;
    }
    state.hiding = !state.hiding;
    playClick();
    if (state.hiding) {
        setMessage('🙈 Ukryty. Nie widzi Cię. (H - wyjdź)', { sticky: true });
    } else {
        clearMessageNow();
    }
}

// ---------- UPDATE ----------
function update(now) {
    if (anyModalOpen()) return;

    if (!state.hiding) {
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

        if ((dx !== 0 || dy !== 0) && now - lastStepTime > 380) {
            lastStepTime = now;
            playStep();
        }

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
                updateObjective();
            }
        });

        Object.keys(LORE_DEFS).forEach(key => {
            if (state.visited[key]) return;
            const def = LORE_DEFS[key];
            if (dist(player.x, player.y, def.x, def.y) < player.r + 16) {
                state.visited[key] = true;
                addJournal(key, NOTES[key]);
                setMessage(def.label + ' Znaleziono kartkę.', { duration: 2500 });
                saveGame();
            }
        });
    }

    maybeAmbientScare(now);
    if (!scare.active) { updateEntity(now); updateEntity2(now); }
    updateHeartbeat(now);
    saveGame();
}

function updateHeartbeat(now) {
    if (state.hiding) return;
    const d = nearestThreatDist();
    const RANGE = 380;
    if (d >= RANGE) return;
    const proximity = 1 - d / RANGE;
    const interval = 950 - proximity * 650;
    if (now - lastHeartbeat > interval) {
        lastHeartbeat = now;
        playHeartbeat(proximity);
    }
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
    if (zone === 'strych' && !state.visited.strych) {
        state.visited.strych = true;
        addJournal('strych', NOTES.strych);
        setTimeout(() => triggerScare('strych_first'), 350);
    }
    if (zone === 'kotlownia' && !state.visited.kotlownia) {
        state.visited.kotlownia = true;
        addJournal('kotlownia', NOTES.kotlownia);
        setMessage('📋 Znaleziono instrukcję na ścianie.', { duration: 2500 });
    }
    if (zone === 'biuro' && !state.visited.biuro) {
        state.visited.biuro = true;
        addJournal('biuro', NOTES.biuro);
        setTimeout(() => triggerScare('biuro_first'), 350);
    }
    if (zone === 'wyjscie' && isFullyComplete() && !window.__endingTriggered) {
        window.__endingTriggered = true;
        setMessage('🚪 Drzwi się otwierają...', { sticky: true });
        setTimeout(() => {
            stopAmbientHum();
            stopLoop();
            playSuccessChime();
            renderStats('statsEnding5');
            showScreen('ending5');
            window.__endingTriggered = false;
        }, 1400);
    }
    updateObjective();
    checkCompletion();
}

// ---------- DRAW ----------
function activeThreats() {
    const list = [];
    if (entity.active) list.push({ x: entity.x, y: entity.y, color: '#ff3333', kind: 'cien' });
    if (entity2.active) list.push({ x: entity2.x, y: entity2.y, color: '#99ccff', kind: 'cichy' });
    return list;
}

function nearestThreatDist() {
    let min = Infinity;
    activeThreats().forEach(t => {
        const d = dist(player.x, player.y, t.x, t.y);
        if (d < min) min = d;
    });
    return min;
}

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
        ctx.fillText(z.label, z.x + 8, z.y + 16);
    });

    ctx.fillStyle = '#3a3a3a';
    OUTER_WALLS.forEach(w => ctx.fillRect(w.x, w.y, w.w, w.h));

    if (!state.inventory.klucz) drawLockedDoor(ctx, BASEMENT_DOOR);
    if (!(state.inventory.klucz && state.inventory.latarka && state.inventory.tasma)) drawLockedDoor(ctx, TOWER_DOOR);
    if (!state.generatorSolved) drawLockedDoor(ctx, STRYCH_DOOR);
    if (!state.kotlowniaSolved) drawLockedDoor(ctx, OFFICE_DOOR);
    if (!isFullyComplete()) drawLockedDoor(ctx, EVAC_DOOR);

    Object.keys(ITEM_DEFS).forEach(key => {
        if (state.inventory[key]) return;
        const def = ITEM_DEFS[key];
        const pulse = 0.75 + Math.sin(now / 260) * 0.25;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = '22px serif';
        ctx.fillText(def.label, def.x - 11, def.y + 8);
        ctx.restore();
    });

    Object.keys(LORE_DEFS).forEach(key => {
        if (state.visited[key]) return;
        const def = LORE_DEFS[key];
        const pulse = 0.7 + Math.sin(now / 300 + 2) * 0.3;
        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.font = '18px serif';
        ctx.fillText(def.label, def.x - 9, def.y + 6);
        ctx.restore();
    });

    drawConsole(ctx, RADIO_POS.x, RADIO_POS.y, state.radioOn);
    drawConsole(ctx, TAPE_POS.x, TAPE_POS.y, false);
    drawConsole(ctx, GENERATOR_POS.x, GENERATOR_POS.y, state.generatorSolved);
    drawConsole(ctx, LEVER_POS.x, LEVER_POS.y, state.kotlowniaSolved);

    if (entity.active) drawEntity(ctx, now);
    if (entity2.active) drawCichy(ctx, now);

    if (!state.hiding) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff66';
        ctx.shadowColor = '#00ff66';
        ctx.shadowBlur = 14;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }

    const baseRadius = state.hiding ? 40 : (state.inventory.latarka ? 190 : 120);
    const flicker = state.hiding ? 0 : Math.sin(now / 130) * 6 + Math.sin(now / 47) * 3;
    const radius = Math.max(30, baseRadius + flicker);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = 'rgba(0,0,0,0.88)';
    ctx.fillRect(-20, -20, W + 40, H + 40);
    const grad = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, radius);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.75, 'rgba(0,0,0,0.4)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.restore();

    // vignette (base + red danger pulse when a threat is close)
    const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);

    const nearest = nearestThreatDist();
    const DANGER_RANGE = 350;
    if (nearest < DANGER_RANGE && !state.hiding) {
        const proximity = 1 - nearest / DANGER_RANGE;
        const pulse = 0.5 + Math.sin(now / 180) * 0.5;
        const dangerAlpha = proximity * 0.35 * (0.6 + 0.4 * pulse);
        ctx.fillStyle = 'rgba(180,0,0,' + dangerAlpha.toFixed(3) + ')';
        ctx.fillRect(0, 0, W, H);
    }

    // proximity glow - lets a threat "poke through" darkness as it gets close
    const GLOW_RANGE = 280;
    if (!state.hiding) {
        activeThreats().forEach(t => {
            const d = dist(player.x, player.y, t.x, t.y);
            if (d < GLOW_RANGE) {
                const alpha = (1 - d / GLOW_RANGE) * 0.8;
                const g = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, 34);
                g.addColorStop(0, hexToRgba(t.color, alpha));
                g.addColorStop(1, hexToRgba(t.color, 0));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(t.x, t.y, 34, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }

    if (!state.hiding) {
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.r * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = '#aaffcc';
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    if (scare.active) drawMonster(ctx, scare.type === 'ambient');

    if (flashFrames > 0) {
        ctx.fillStyle = 'rgba(255,0,0,' + (0.35 * flashFrames / 5) + ')';
        ctx.fillRect(0, 0, W, H);
        flashFrames--;
    }

    drawRadar(ctx, now);
}

function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha.toFixed(3) + ')';
}

function drawRadar(ctx, now) {
    const cx = W - 90, cy = 90, r = 60;
    const RADAR_RANGE = 550;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fill();
    ctx.strokeStyle = state.hiding ? '#444' : '#00ff00';
    ctx.lineWidth = 2;
    ctx.stroke();

    if (!state.hiding) {
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff66';
        ctx.fill();

        activeThreats().forEach(t => {
            const d = dist(player.x, player.y, t.x, t.y);
            if (d > RADAR_RANGE) return;
            const ang = Math.atan2(t.y - player.y, t.x - player.x);
            const scaled = Math.min(d / RADAR_RANGE, 1) * (r - 8);
            const bx = cx + Math.cos(ang) * scaled;
            const by = cy + Math.sin(ang) * scaled;
            const pulse = 0.6 + Math.sin(now / 150) * 0.4;
            const blipSize = 3 + (1 - d / RADAR_RANGE) * 4 * pulse;
            ctx.beginPath();
            ctx.arc(bx, by, blipSize, 0, Math.PI * 2);
            ctx.fillStyle = t.color;
            ctx.shadowColor = t.color;
            ctx.shadowBlur = 8;
            ctx.fill();
            ctx.shadowBlur = 0;
        });
    } else {
        ctx.fillStyle = 'rgba(150,150,150,0.6)';
        ctx.font = '11px monospace';
        ctx.fillText('UKRYTY', cx - 24, cy + 4);
    }
    ctx.restore();
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

function drawEntity(ctx, now) {
    const bob = Math.sin(now / 200) * 3;
    ctx.save();
    ctx.translate(entity.x, entity.y + bob);
    ctx.fillStyle = 'rgba(10,0,0,0.85)';
    ctx.beginPath();
    ctx.ellipse(0, 6, 13, 20, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -14, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff2222';
    ctx.shadowColor = '#ff2222';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(-4, -15, 2, 0, Math.PI * 2);
    ctx.arc(4, -15, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawCichy(ctx, now) {
    const bob = Math.sin(now / 260 + 1) * 4;
    ctx.save();
    ctx.translate(entity2.x, entity2.y + bob);
    ctx.fillStyle = 'rgba(20,25,30,0.8)';
    ctx.beginPath();
    ctx.ellipse(0, 8, 11, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -20, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#dfefff';
    ctx.shadowColor = '#dfefff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(-3, -21, 1.6, 0, Math.PI * 2);
    ctx.arc(3, -21, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
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
function nearGenerator() { return dist(player.x, player.y, GENERATOR_POS.x, GENERATOR_POS.y) < player.r + GENERATOR_POS.r; }
function nearLevers() { return dist(player.x, player.y, LEVER_POS.x, LEVER_POS.y) < player.r + LEVER_POS.r; }

function toggleRadio() {
    playClick();
    if (!nearRadio()) {
        setMessage('⚠ Musisz stać przy nadajniku, w piwnicy.', { duration: 2200 });
        return;
    }
    state.radioOn = !state.radioOn;
    if (state.radioOn) {
        entity2.active = true;
        entity2.warned = false;
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
    renderStats('statsEnding2');
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
    renderStats('statsEnding1');
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
    setTimeout(() => { stopLoop(); renderStats('statsEnding4'); showScreen('ending4'); }, 900);
}

// ---------- KEYPAD / GENERATOR ----------
function openKeypad() {
    if (state.generatorSolved) {
        setMessage('Generator już działa.', { duration: 2000 });
        return;
    }
    keypadInput = '';
    updateKeypadDisplay();
    document.getElementById('keypadModal').classList.add('active');
}

function closeKeypad() {
    document.getElementById('keypadModal').classList.remove('active');
}

function updateKeypadDisplay() {
    const el = document.getElementById('keypadDisplay');
    const chars = keypadInput.padEnd(3, '_').split('').join(' ');
    el.textContent = chars;
    el.classList.remove('error');
}

function keypadDigit(d) {
    if (keypadInput.length >= 3) return;
    keypadInput += d;
    updateKeypadDisplay();
}

function keypadClear() {
    keypadInput = '';
    updateKeypadDisplay();
}

function keypadSubmit() {
    if (keypadInput === CODE) {
        state.generatorSolved = true;
        playSuccessChime();
        addJournal('generator', NOTES.generator);
        saveGame();
        closeKeypad();
        setMessage('⚡ Generator uruchomiony. Strych odblokowany.', { duration: 3000 });
        updateObjective();
        checkCompletion();
    } else {
        playError();
        const el = document.getElementById('keypadDisplay');
        el.classList.add('error');
        setTimeout(() => { keypadInput = ''; updateKeypadDisplay(); }, 500);
    }
}

// ---------- LEVER PUZZLE ----------
function openLeverModal() {
    if (state.kotlowniaSolved) {
        setMessage('Dźwignie już ustawione poprawnie.', { duration: 2000 });
        return;
    }
    leverStates = [false, false, false];
    renderLevers();
    document.getElementById('leverModal').classList.add('active');
}

function closeLeverModal() {
    document.getElementById('leverModal').classList.remove('active');
}

function renderLevers() {
    document.querySelectorAll('.lever-btn').forEach((btn, i) => {
        btn.textContent = leverStates[i] ? '⬆ GÓRA' : '⬇ DÓŁ';
        btn.classList.toggle('up', leverStates[i]);
    });
}

function toggleLever(i) {
    leverStates[i] = !leverStates[i];
    renderLevers();
}

function submitLevers() {
    const correct = leverStates.every((v, i) => v === LEVER_TARGET[i]);
    if (correct) {
        state.kotlowniaSolved = true;
        playSuccessChime();
        addJournal('kotlownia_solved', NOTES.kotlownia_solved);
        saveGame();
        closeLeverModal();
        setMessage('🔧 Dźwignie ustawione. Biuro odblokowane.', { duration: 3000 });
        updateObjective();
        checkCompletion();
    } else {
        playError();
        const box = document.querySelector('#leverModal .modal-box');
        box.style.animation = 'none';
        void box.offsetWidth;
        box.style.animation = 'shakeX 0.3s';
    }
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
            setTimeout(() => { stopAmbientHum(); stopLoop(); renderStats('statsEnding3'); showScreen('ending3'); }, 2000);
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
            state.generatorSolved = saved.generatorSolved || false;
            state.kotlowniaSolved = saved.kotlowniaSolved || false;
            state.deathCount = saved.deathCount || 0;
        }
    } else {
        state = defaultState();
        clearSave();
    }
    respawnPlayer();
    showScreen('gameScreen');
    clearMessageNow();
    renderInventory();
    updateObjective();
    sessionStart = performance.now();
    scaresTriggered = 0;
    saveGame();
    startLoop();
}

function respawnPlayer() {
    player = { x: SPAWN.x, y: SPAWN.y, r: 12, speed: 3.4 };
    resetEntity();
    resetEntity2();
    state.hiding = false;
    scare = { active: false, type: null };
    flashFrames = 0;
    shakeUntil = 0;
    lastAmbientTime = performance.now() + 6000;
    lastStepTime = 0;
    lastHeartbeat = 0;
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
document.getElementById('muteBtn').addEventListener('click', toggleMute);
document.getElementById('closeJournalBtn').addEventListener('click', () => {
    playClick();
    document.getElementById('journalModal').classList.remove('active');
});

document.getElementById('closeKeypadBtn').addEventListener('click', () => { playClick(); closeKeypad(); });
document.getElementById('kClear').addEventListener('click', () => { playClick(); keypadClear(); });
document.getElementById('kSubmit').addEventListener('click', () => { playClick(); keypadSubmit(); });
document.querySelectorAll('.kbtn[data-d]').forEach(btn => {
    btn.addEventListener('click', () => { playClick(); keypadDigit(btn.dataset.d); });
});

document.getElementById('closeLeverBtn').addEventListener('click', () => { playClick(); closeLeverModal(); });
document.getElementById('leverSubmit').addEventListener('click', () => { playClick(); submitLevers(); });
document.querySelectorAll('.lever-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => { playClick(); toggleLever(i); });
});

document.getElementById('retryBtn').addEventListener('click', () => {
    respawnPlayer();
    showScreen('gameScreen');
    clearMessageNow();
    renderInventory();
    updateObjective();
    startLoop();
});

function setKey(key, val) {
    if (key === 'w' || key === 'arrowup') keys.up = val;
    if (key === 's' || key === 'arrowdown') keys.down = val;
    if (key === 'a' || key === 'arrowleft') keys.left = val;
    if (key === 'd' || key === 'arrowright') keys.right = val;
}

function handlePanelKey() {
    if (nearGenerator()) openKeypad();
    else if (nearLevers()) openLeverModal();
    else setMessage('⚠ Brak panelu tutaj.', { duration: 1800 });
}

document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();

    if (document.getElementById('keypadModal').classList.contains('active')) {
        if (key >= '0' && key <= '9') keypadDigit(key);
        if (key === 'backspace') keypadClear();
        if (key === 'enter') keypadSubmit();
        if (key === 'escape') closeKeypad();
        return;
    }
    if (document.getElementById('leverModal').classList.contains('active')) {
        if (key === 'enter') submitLevers();
        if (key === 'escape') closeLeverModal();
        return;
    }
    if (document.getElementById('journalModal').classList.contains('active')) {
        if (key === 'escape') document.getElementById('journalModal').classList.remove('active');
        return;
    }

    if (!document.getElementById('gameScreen').classList.contains('active')) return;
    setKey(key, true);
    if (key === 'r') toggleRadio();
    if (key === 'e') respondSignal();
    if (key === 'q') destroyRadio();
    if (key === 'p') playTape();
    if (key === 'f') handlePanelKey();
    if (key === 'h') toggleHiding();
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
const tF = document.getElementById('tF');
if (tF) tF.addEventListener('click', handlePanelKey);
const tH = document.getElementById('tH');
if (tH) tH.addEventListener('click', toggleHiding);

// ---------- INIT ----------
renderMenu();

console.log('🎮 SYGNAŁ Game Ready (v5 - Bigger Map + Hiding + Lever Puzzle)');
console.log('Ruch: WASD / Strzałki | R-Radio | E-Odpowiedz | Q-Zniszcz | P-Taśma | F-Panel | H-Schowaj | ESC-Menu');
console.log('Nowość: schowki (H), Kotłownia z zagadką dźwigni, zamknięte Biuro Dyrektora.');
console.log('Wróg jest teraz wolniejszy niż gracz — da się przed nim uciec.');

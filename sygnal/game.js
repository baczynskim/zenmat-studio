// SYGNAŁ - Game Logic v4 (Bigger map + Puzzle + Patrolling Entity)

const SAVE_KEY = 'sygnal_save_v4';
const W = 1200, H = 700;

// ---------- WORLD LAYOUT ----------
const ZONES = {
    entrance:  { x: 20,  y: 460, w: 200, h: 200, color: '#1a1a2e', label: 'WEJŚCIE' },
    control:   { x: 20,  y: 20,  w: 220, h: 220, color: '#1a2e2e', label: 'SALA KONTROLI' },
    archive:   { x: 960, y: 20,  w: 220, h: 220, color: '#2e1a2e', label: 'ARCHIWUM' },
    basement:  { x: 320, y: 460, w: 200, h: 200, color: '#2e1a1a', label: 'PIWNICA' },
    generator: { x: 620, y: 460, w: 200, h: 200, color: '#242424', label: 'GENERATOR' },
    tower:     { x: 920, y: 460, w: 200, h: 200, color: '#2e2a1a', label: 'WIEŻA NADAWCZA' },
    strych:    { x: 490, y: 20,  w: 220, h: 220, color: '#22261a', label: 'STRYCH' }
};

const OUTER_WALLS = [
    { x: 0, y: 0, w: W, h: 20 },
    { x: 0, y: H - 20, w: W, h: 20 },
    { x: 0, y: 0, w: 20, h: H },
    { x: W - 20, y: 0, w: 20, h: H }
];

const BASEMENT_DOOR = { x: 390, y: 452, w: 60, h: 24 };
const TOWER_DOOR = { x: 990, y: 452, w: 60, h: 24 };
const STRYCH_DOOR = { x: 570, y: 232, w: 60, h: 24 };

const ITEM_DEFS = {
    latarka: { x: 150, y: 600, label: '🔦' },
    klucz:   { x: 130, y: 120, label: '🔑' },
    tasma:   { x: 1070, y: 120, label: '📼' }
};

const RADIO_POS = { x: 420, y: 560, r: 26 };
const TAPE_POS = { x: 1020, y: 560, r: 26 };
const GENERATOR_POS = { x: 720, y: 560, r: 26 };

const CODE = '472';
const NOTES = {
    latarka: 'Notatka przy drzwiach: "Nie wchodźcie do piwnicy sami." Fragment kodu (1): 4',
    klucz: 'Log operatora, 1971: "Sygnał przyszedł znikąd. Odpowiedzieliśmy." Fragment kodu (2): 7',
    tasma: 'Etykieta na taśmie: "NAGRANIE #3 – NIE ODTWARZAĆ W NOCY" Fragment kodu (3): 2',
    basement: 'Piwnica: kable prowadzą do nadajnika. Ktoś nigdy go nie wyłączył.',
    tower: 'Na szczycie wieży: stary magnetofon. Pasuje do taśmy.',
    generator: 'Generator huczy do życia. Zamek strychu się odblokował.',
    strych: 'Strych: skrzynia pełna zdjęć. Wszyscy operatorzy mają ten sam pusty wzrok na oczach.'
};

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
        deathCount: 0
    };
}

let state = defaultState();
let sessionStart = 0;
let scaresTriggered = 0;

const SPAWN = { x: 110, y: 560 };
let player = { x: SPAWN.x, y: SPAWN.y, r: 12, speed: 3.4 };
let keys = { up: false, down: false, left: false, right: false };
let animId = null;
let scare = { active: false, type: null };
let flashFrames = 0;
let shakeUntil = 0;
let lastAmbientTime = 0;
let lastStepTime = 0;
let keypadInput = '';

// ---------- ENTITY ----------
const ENTITY_WAYPOINTS = [
    { x: 150, y: 350 }, { x: 1050, y: 350 }, { x: 1050, y: 280 }, { x: 150, y: 280 }
];
let entity = {
    x: 150, y: 350, r: 14, speed: 2.1, chaseSpeed: 3.5,
    wpIndex: 0, mode: 'patrol', active: false
};

function resetEntity() {
    entity = { x: ENTITY_WAYPOINTS[0].x, y: ENTITY_WAYPOINTS[0].y, r: 14, speed: 2.1, chaseSpeed: 3.5, wpIndex: 0, mode: 'patrol', active: false };
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
        text = '🎯 Cel: znajdź fragmenty kodu (sprawdź Dziennik) i uruchom Generator (F).';
    } else if (!state.visited.strych) {
        text = '🎯 Cel: strych jest teraz odblokowany — sprawdź, co tam jest.';
    } else {
        text = '🎯 Cel: zdecyduj, co zrobisz z sygnałem w Piwnicy (R/E/Q) lub w Wieży (P).';
    }
    el.textContent = text;
}

// ---------- COLLISION / WORLD HELPERS ----------
function getWalls() {
    const walls = OUTER_WALLS.slice();
    if (!state.inventory.klucz) walls.push(BASEMENT_DOOR);
    const allItems = state.inventory.klucz && state.inventory.latarka && state.inventory.tasma;
    if (!allItems) walls.push(TOWER_DOOR);
    if (!state.generatorSolved) walls.push(STRYCH_DOOR);
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

function anyModalOpen() {
    return document.querySelector('.modal.active') !== null;
}

// ---------- JUMPSCARES ----------
function triggerScare(type) {
    if (scare.active) return;
    scaresTriggered++;
    const big = type === 'basement_first' || type === 'tower_first' || type === 'strych_first';
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
    if (scare.active) return;
    if (now - lastAmbientTime < 15000) return;
    lastAmbientTime = now + Math.random() * 6000;
    if (Math.random() < 0.5) triggerScare('ambient');
}

// ---------- ENTITY AI ----------
function updateEntity(now) {
    const itemsOwned = Object.values(state.inventory).filter(Boolean).length;
    if (!entity.active) {
        if (itemsOwned >= 1) entity.active = true;
        else return;
    }

    const dToPlayer = dist(entity.x, entity.y, player.x, player.y);

    if (entity.mode === 'patrol') {
        if (dToPlayer < 260) {
            entity.mode = 'chase';
        } else {
            const wp = ENTITY_WAYPOINTS[entity.wpIndex];
            const d = dist(entity.x, entity.y, wp.x, wp.y);
            if (d < 6) {
                entity.wpIndex = (entity.wpIndex + 1) % ENTITY_WAYPOINTS.length;
            } else {
                const ang = Math.atan2(wp.y - entity.y, wp.x - entity.x);
                entity.x += Math.cos(ang) * entity.speed;
                entity.y += Math.sin(ang) * entity.speed;
            }
        }
    } else if (entity.mode === 'chase') {
        if (dToPlayer > 430) {
            entity.mode = 'patrol';
        } else {
            const ang = Math.atan2(player.y - entity.y, player.x - entity.x);
            entity.x += Math.cos(ang) * entity.chaseSpeed;
            entity.y += Math.sin(ang) * entity.chaseSpeed;
        }
    }

    entity.x = Math.max(30, Math.min(W - 30, entity.x));
    entity.y = Math.max(30, Math.min(H - 30, entity.y));

    if (dToPlayer < player.r + entity.r) {
        getCaught();
    }
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
        renderStats('statsGameOver', true);
        showScreen('gameOverScreen');
        window.__gameOverTriggered = false;
    }, 500);
}

// ---------- UPDATE ----------
function update(now) {
    if (anyModalOpen()) return;

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

    maybeAmbientScare(now);
    if (!scare.active) updateEntity(now);
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
    if (zone === 'strych' && !state.visited.strych) {
        state.visited.strych = true;
        addJournal('strych', NOTES.strych);
        setTimeout(() => triggerScare('strych_first'), 350);
    }
    updateObjective();
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
    if (!state.generatorSolved) drawLockedDoor(ctx, STRYCH_DOOR);

    Object.keys(ITEM_DEFS).forEach(key => {
        if (state.inventory[key]) return;
        const def = ITEM_DEFS[key];
        ctx.font = '22px serif';
        ctx.fillText(def.label, def.x - 11, def.y + 8);
    });

    drawConsole(ctx, RADIO_POS.x, RADIO_POS.y, state.radioOn);
    drawConsole(ctx, TAPE_POS.x, TAPE_POS.y, false);
    drawConsole(ctx, GENERATOR_POS.x, GENERATOR_POS.y, state.generatorSolved);

    if (entity.active) drawEntity(ctx);

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

    const radius = state.inventory.latarka ? 190 : 120;
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

    // safety net: player marker always drawn on top, guaranteed visible regardless of overlay
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = '#aaffcc';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 16;
    ctx.fill();
    ctx.shadowBlur = 0;

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

function drawEntity(ctx) {
    ctx.save();
    ctx.translate(entity.x, entity.y);
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
    } else {
        playError();
        const el = document.getElementById('keypadDisplay');
        el.classList.add('error');
        setTimeout(() => { keypadInput = ''; updateKeypadDisplay(); }, 500);
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
    scare = { active: false, type: null };
    flashFrames = 0;
    shakeUntil = 0;
    lastAmbientTime = performance.now() + 6000;
    lastStepTime = 0;
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

document.getElementById('retryBtn').addEventListener('click', () => {
    respawnPlayer();
    showScreen('gameScreen');
    clearMessageNow();
    renderInventory();
    startLoop();
});

function setKey(key, val) {
    if (key === 'w' || key === 'arrowup') keys.up = val;
    if (key === 's' || key === 'arrowdown') keys.down = val;
    if (key === 'a' || key === 'arrowleft') keys.left = val;
    if (key === 'd' || key === 'arrowright') keys.right = val;
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
    if (key === 'f') { if (nearGenerator()) openKeypad(); else setMessage('⚠ Brak panelu tutaj.', { duration: 1800 }); }
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
if (tF) tF.addEventListener('click', () => { if (nearGenerator()) openKeypad(); else setMessage('⚠ Brak panelu tutaj.', { duration: 1800 }); });

// ---------- INIT ----------
renderMenu();

console.log('🎮 SYGNAŁ Game Ready (v4 - Bigger Map + Puzzle + Entity)');
console.log('Ruch: WASD / Strzałki | R-Radio | E-Odpowiedz | Q-Zniszcz | P-Taśma | F-Panel | ESC-Menu');
console.log('Znajdź fragmenty kodu, rozwiąż zagadkę generatora, i uważaj na to, co patroluje korytarze.');

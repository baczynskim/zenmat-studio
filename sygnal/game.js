// SYGNAŁ - Game Logic
// Vanilla JS Horror/Mystery Game

let gameState = {
    radioOn: false,
    inBasement: false,
    transmitterDestroyed: false,
    currentRoom: null,
    messages: [
        '... sygnał aktywny od 27 lat ...',
        '... nie powinieneś tutaj być ...',
        '... coś tu się stało ...',
        '... naukowcy ... eksperymenty ...',
        '... coś się uczyło ...',
        '... odpowiedź nadchodził zanim pytaliśmy ...',
        '... słyszysz nas? ...',
        '... zostań z nami ...'
    ],
    messageIndex: 0
};

// Show/Hide screens
function showScreen(screenId) {
    console.log('showScreen called with:', screenId);
    const screens = document.querySelectorAll('.screen');
    console.log('Found screens:', screens.length);
    screens.forEach(s => s.classList.remove('active'));
    const targetScreen = document.getElementById(screenId);
    console.log('Target screen:', targetScreen);
    if (targetScreen) {
        targetScreen.classList.add('active');
        console.log('Added active class to:', screenId);
    } else {
        console.error('Screen not found:', screenId);
    }
}

// START GAME
function startGame() {
    console.log('startGame called');
    gameState = {
        radioOn: false,
        inBasement: false,
        transmitterDestroyed: false,
        currentRoom: null,
        messages: [
            '... sygnał aktywny od 27 lat ...',
            '... nie powinieneś tutaj być ...',
            '... coś tu się stało ...',
            '... naukowcy ... eksperymenty ...',
            '... coś się uczyło ...',
            '... odpowiedź nadchodził zanim pytaliśmy ...',
            '... słyszysz nas? ...',
            '... zostań z nami ...'
        ],
        messageIndex: 0
    };
    console.log('Showing gameScreen');
    showScreen('gameScreen');
    updateRadioStatus();
    clearMessage();
}

// BACK TO MENU
function backToMenu() {
    showScreen('menu');
    gameState.currentRoom = null;
}

// ENTER ROOM
function enterRoom(room) {
    gameState.currentRoom = room;
    const messageEl = document.getElementById('message');

    if (room === 'basement') {
        gameState.inBasement = true;
        messageEl.textContent = '📻 ZNALEŹLIŚMY CIĘ. TRANSMITTER TUTAJ.';
        setTimeout(() => {
            messageEl.textContent = '';
        }, 4000);
    } else if (room === 'entrance') {
        messageEl.textContent = 'Opuszczona, ciemna. Zapach rdzy i starego plastiku.';
        setTimeout(() => {
            messageEl.textContent = '';
        }, 3000);
    } else if (room === 'control') {
        messageEl.textContent = 'Pulpit kontroli. Urządzenia z lat 70-ych. Wszystko zakurzone.';
        setTimeout(() => {
            messageEl.textContent = '';
        }, 3000);
    }
}

// TOGGLE RADIO
function toggleRadio() {
    gameState.radioOn = !gameState.radioOn;
    updateRadioStatus();

    const messageEl = document.getElementById('message');

    if (gameState.radioOn) {
        if (gameState.inBasement) {
            playMessage();
        } else {
            messageEl.textContent = '📻 Szum. Szumy. Nic poza szumem...';
            setTimeout(() => {
                messageEl.textContent = '';
            }, 3000);
        }
    } else {
        messageEl.textContent = '';
    }
}

// PLAY MESSAGE
function playMessage() {
    const msg = gameState.messages[gameState.messageIndex % gameState.messages.length];
    gameState.messageIndex++;
    document.getElementById('message').textContent = '📻 ' + msg;
    
    setTimeout(() => {
        document.getElementById('message').textContent = '';
    }, 4000);
}

// RESPOND TO SIGNAL
function respondSignal() {
    if (!gameState.radioOn || !gameState.inBasement) {
        document.getElementById('message').textContent = '⚠ Radio musi być włączone w piwnicy!';
        setTimeout(() => {
            document.getElementById('message').textContent = '';
        }, 2000);
        return;
    }

    // ENDING 2
    showScreen('ending2');
}

// DESTROY TRANSMITTER
function destroyRadio() {
    if (!gameState.inBasement) {
        document.getElementById('message').textContent = '⚠ Transmitter jest w piwnicy!';
        setTimeout(() => {
            document.getElementById('message').textContent = '';
        }, 2000);
        return;
    }

    gameState.transmitterDestroyed = true;
    
    // ENDING 1
    showScreen('ending1');
}

// UPDATE RADIO STATUS
function updateRadioStatus() {
    const status = document.getElementById('radioStatus');
    if (gameState.radioOn) {
        status.textContent = 'RADIO: ON 📻';
        status.style.textShadow = '0 0 10px #ff0000';
    } else {
        status.textContent = 'RADIO: OFF';
        status.style.textShadow = 'none';
    }
}

// CLEAR MESSAGE
function clearMessage() {
    document.getElementById('message').textContent = '';
}

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
    const activeScreen = document.querySelector('.screen.active').id;

    if (activeScreen === 'gameScreen') {
        if (e.key.toLowerCase() === 'r') toggleRadio();
        if (e.key.toLowerCase() === 'e') respondSignal();
        if (e.key.toLowerCase() === 'q') destroyRadio();
        if (e.key.toLowerCase() === 'escape') backToMenu();
    }
});

// EASTER EGG - SECRET ENDING 3
let easterEggCounter = 0;
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp') easterEggCounter++;
    else easterEggCounter = 0;

    if (easterEggCounter === 5) {
        const activeScreen = document.querySelector('.screen.active').id;
        if (activeScreen === 'gameScreen' && gameState.inBasement && gameState.radioOn) {
            easterEggCounter = 0;
            // ENDING 3 - Secret ending (nie niszczysz, nie odpowiadasz, zostawiasz działać)
            document.getElementById('message').textContent = '⚡ TRANSMITTER ZAPALA SIĘ...';
            setTimeout(() => {
                showScreen('ending3');
            }, 2000);
        }
    }
});

console.log('🎮 SYGNAŁ Game Ready');
console.log('Kontrola: R-Radio | E-Odpowiedz | Q-Zniszcz | ESC-Menu');
console.log('Easter Egg: Naciśnij ↑ 5x w piwnicy z radiiem włączonym');

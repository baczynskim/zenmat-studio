// SYGNAŁ - Gra 2D Horror/Mystery
// Phaser 3 Engine

let game;
let currentScene;

// Konfiguracja Phasera
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [StationScene, ExplorateScene, EndingScene],
    backgroundColor: '#0a0a0a'
};

// ============================================
// SCENA 1: INTRO - WEJŚCIE DO STACJI
// ============================================
class StationScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StationScene' });
    }

    preload() {
        // Tutaj będą assets
    }

    create() {
        // Tło - opuszczona stacja
        const bg = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x1a1a2e
        );

        // Animacja fade-in
        this.cameras.main.fadeIn(1000);

        // Tekst intro
        const title = this.add.text(
            this.cameras.main.centerX,
            100,
            'STACJA RADIOWA',
            {
                fontSize: '48px',
                fill: '#ff0000',
                fontFamily: 'Courier New',
                align: 'center'
            }
        ).setOrigin(0.5);

        const date = this.add.text(
            this.cameras.main.centerX,
            180,
            '1998 • CZERWIEC • 03:17',
            {
                fontSize: '20px',
                fill: '#888',
                fontFamily: 'Courier New',
                align: 'center'
            }
        ).setOrigin(0.5);

        // ASCII art budynku
        const ascii = `
        ╔══════════════════╗
        ║ 📻 STACJA 📻    ║
        ║                  ║
        ║  [ ] [ ] [ ]     ║
        ║  [ ] [ ] [ ]     ║
        ║  [ ] [ ] [ ]     ║
        ║                  ║
        ║  [ WEJŚCIE ]     ║
        ╚══════════════════╝
        `;

        const building = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.centerY - 50,
            ascii,
            {
                fontSize: '16px',
                fill: '#00ff00',
                fontFamily: 'Courier New',
                align: 'center'
            }
        ).setOrigin(0.5);

        // Przyciski
        const enterBtn = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.height - 150,
            'WEJDŹ - SPACJA',
            {
                fontSize: '18px',
                fill: '#ff0000',
                fontFamily: 'Courier New',
                align: 'center',
                backgroundColor: '#0a0a0a',
                padding: { x: 20, y: 10 }
            }
        ).setOrigin(0.5)
         .setInteractive()
         .on('pointerdown', () => this.scene.start('ExploreScene'));

        // Keyboard
        this.input.keyboard.on('keydown-SPACE', () => {
            this.scene.start('ExploreScene');
        });

        // Efekt filmowy - szum
        this.cameras.main.setBounds(0, 0, this.cameras.main.width, this.cameras.main.height);
    }

    update() {}
}

// ============================================
// SCENA 2: EKSPLORACJA STACJI
// ============================================
class ExploreScene extends Phaser.Scene {
    constructor() {
        super({ key: 'ExploreScene' });
        this.playerX = 0;
        this.playerY = 0;
        this.radioOn = false;
        this.currentRoom = 'entrance';
        this.signals = [];
        this.endingChosen = null;
    }

    create() {
        // Ukryj menu
        document.getElementById('main-menu').classList.remove('active');

        // Tło - ciemna stacja
        this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x0a0a0a
        );

        // Gracz (prosty kwadrat)
        this.player = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            40,
            60,
            0xffffff
        );
        this.physics.add.existing(this.player);

        // Pokoje jako prostokąty
        this.rooms = {
            entrance: { x: 400, y: 300, w: 200, h: 150, name: 'WEJŚCIE' },
            control: { x: 750, y: 300, w: 200, h: 150, name: 'SALA KONTROLI' },
            server: { x: 400, y: 550, w: 200, h: 150, name: 'SERWEROWNIA' },
            basement: { x: 750, y: 550, w: 200, h: 150, name: 'PIWNICA' }
        };

        // Rysuj pokoje
        Object.entries(this.rooms).forEach(([key, room]) => {
            const rect = this.add.rectangle(room.x, room.y, room.w, room.h, 0x222244);
            rect.setStrokeStyle(2, 0x444466);
            rect.setData('roomKey', key);

            const text = this.add.text(room.x, room.y - 50, room.name, {
                fontSize: '14px',
                fill: '#888',
                fontFamily: 'Courier New'
            }).setOrigin(0.5);
        });

        // HUD
        this.hudText = this.add.text(20, 20, '', {
            fontSize: '12px',
            fill: '#00ff00',
            fontFamily: 'Courier New'
        });

        // Radio interface
        this.radioUI = this.add.text(
            this.cameras.main.centerX,
            this.cameras.main.height - 100,
            '[ RADIO OFF ] PRESS R TO TOGGLE | PRESS Q TO DESTROY | PRESS E TO RESPOND',
            {
                fontSize: '14px',
                fill: '#ff0000',
                fontFamily: 'Courier New',
                align: 'center',
                backgroundColor: '#0a0a0a',
                padding: { x: 10, y: 10 }
            }
        ).setOrigin(0.5);

        // Keyboard controls
        this.input.keyboard.on('keydown-W', () => this.player.y -= 30);
        this.input.keyboard.on('keydown-A', () => this.player.x -= 30);
        this.input.keyboard.on('keydown-S', () => this.player.y += 30);
        this.input.keyboard.on('keydown-D', () => this.player.x += 30);

        this.input.keyboard.on('keydown-R', () => this.toggleRadio());
        this.input.keyboard.on('keydown-Q', () => this.destroyTransmitter());
        this.input.keyboard.on('keydown-E', () => this.respondToSignal());

        // Transmitter location
        this.transmitterHP = 100;
        this.transmitterActive = false;

        // Sygnały radiowe
        this.messages = [
            '... sygnał aktywny od 27 lat ...',
            '... nie powinieneś tutaj być ...',
            '... coś tu się stało ...',
            '... naukowcy ... eksperymenty ...',
            '... coś się uczyło ...',
            '... odpowiedź nadchodził zanim pytaliśmy ...'
        ];
        this.messageIndex = 0;
    }

    toggleRadio() {
        this.radioOn = !this.radioOn;
        this.radioUI.setText(
            `[ RADIO ${this.radioOn ? 'ON' : 'OFF'} ] PRESS R TO TOGGLE | PRESS Q TO DESTROY | PRESS E TO RESPOND`
        );

        if (this.radioOn && this.transmitterActive) {
            this.playRandomMessage();
        }
    }

    playRandomMessage() {
        const msg = this.messages[Math.floor(Math.random() * this.messages.length)];
        const popup = this.add.text(
            this.cameras.main.centerX,
            100,
            `📻 ${msg}`,
            {
                fontSize: '16px',
                fill: '#ff0000',
                fontFamily: 'Courier New',
                wordWrap: { width: 400 },
                align: 'center'
            }
        ).setOrigin(0.5);

        this.time.delayedCall(3000, () => popup.destroy());
    }

    destroyTransmitter() {
        if (this.transmitterActive) {
            this.transmitterHP -= 50;
            if (this.transmitterHP <= 0) {
                this.scene.start('EndingScene', { ending: 1 });
            }
        }
    }

    respondToSignal() {
        if (this.radioOn && this.transmitterActive) {
            this.scene.start('EndingScene', { ending: 2 });
        }
    }

    update() {
        // Jeśli gracz dotarł do piwnicy - znalazł transmitter
        if (
            this.player.x > this.rooms.basement.x - 100 &&
            this.player.x < this.rooms.basement.x + 100 &&
            this.player.y > this.rooms.basement.y - 75 &&
            this.player.y < this.rooms.basement.y + 75
        ) {
            this.transmitterActive = true;
            this.radioUI.setText('[ 📻 TRANSMITTER FOUND ] PRESS R | PRESS Q TO DESTROY | PRESS E TO RESPOND');
        }

        // Update HUD
        this.hudText.setText(
            `POS: ${Math.floor(this.player.x)},${Math.floor(this.player.y)}\n` +
            `RADIO: ${this.radioOn ? 'ON' : 'OFF'}\n` +
            `TRANSMITTER: ${this.transmitterActive ? 'FOUND' : 'SEARCHING'}`
        );

        // Limity ruchu
        this.player.x = Phaser.Math.Clamp(this.player.x, 200, this.cameras.main.width - 200);
        this.player.y = Phaser.Math.Clamp(this.player.y, 200, this.cameras.main.height - 200);
    }
}

// ============================================
// SCENA 3: ENDINGS
// ============================================
class EndingScene extends Phaser.Scene {
    constructor() {
        super({ key: 'EndingScene' });
    }

    init(data) {
        this.endingType = data.ending || 1;
    }

    create() {
        const bg = this.add.rectangle(
            this.cameras.main.centerX,
            this.cameras.main.centerY,
            this.cameras.main.width,
            this.cameras.main.height,
            0x0a0a0a
        );

        this.cameras.main.fadeIn(1000);

        if (this.endingType === 1) {
            document.getElementById('ending-1').classList.add('active');
        } else if (this.endingType === 2) {
            document.getElementById('ending-2').classList.add('active');
        } else {
            document.getElementById('ending-3').classList.add('active');
        }
    }
}

// ============================================
// FUNKCJE MENU
// ============================================
function startGame() {
    document.getElementById('main-menu').classList.remove('active');
    game = new Phaser.Game(config);
    currentScene = game.scene.get('StationScene');
}

function resetGame() {
    document.getElementById('ending-1').classList.remove('active');
    document.getElementById('ending-2').classList.remove('active');
    document.getElementById('ending-3').classList.remove('active');
    document.getElementById('death-screen').classList.remove('active');
    
    game.scene.stop('ExploreScene');
    game.scene.start('StationScene');
}

function backToMenu() {
    document.getElementById('ending-1').classList.remove('active');
    document.getElementById('ending-2').classList.remove('active');
    document.getElementById('ending-3').classList.remove('active');
    document.getElementById('death-screen').classList.remove('active');
    document.getElementById('main-menu').classList.add('active');

    if (game) {
        game.destroy(true);
        game = null;
    }
}

// Responsive
window.addEventListener('resize', () => {
    if (game) {
        game.scale.resize(window.innerWidth, window.innerHeight);
    }
});

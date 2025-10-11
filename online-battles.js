/**
 * 👥 СИСТЕМА ОНЛАЙН-БОЁВ
 * Полная логика онлайн-боёв по коду комнаты через Firebase
 */

class OnlineBattlesSystem {
    constructor(gameData) {
        this.gameData = gameData;
        this.currentRoom = null;
        this.isHost = false;
        this.roomListener = null;
    }

    async init() {
        console.log('👥 Инициализация системы онлайн-боёв...');
        try {
            this.setupEventListeners();
            console.log('✅ Обработчики онлайн-боёв настроены');
        } catch (error) {
            console.error('❌ Ошибка инициализации онлайн-боёв:', error);
        }
    }

    setupEventListeners() {
        console.log('🔧 Настройка обработчиков онлайн-боёв...');
        
        // Открытие модального окна
        const onlineBtn = document.getElementById('online-battle-btn');
        if (onlineBtn) {
            console.log('✅ Кнопка онлайн-боя найдена в online-battles.js');
            onlineBtn.addEventListener('click', () => {
                console.log('🔵 Клик на онлайн-бой (из online-battles.js)');
                this.openOnlineBattleModal();
            });
        } else {
            console.error('❌ Кнопка online-battle-btn НЕ найдена в online-battles.js!');
        }
        
        document.getElementById('close-online-battle')?.addEventListener('click', () => this.closeOnlineBattleModal());
        
        // Переключение табов
        document.querySelectorAll('#online-battle-modal .tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Создание/вход в комнату
        document.getElementById('create-room-btn')?.addEventListener('click', () => this.createRoom());
        document.getElementById('join-room-btn')?.addEventListener('click', () => this.joinRoom());
        document.getElementById('cancel-room-btn')?.addEventListener('click', () => this.cancelRoom());
        document.getElementById('copy-room-code-btn')?.addEventListener('click', () => this.copyRoomCode());
    }

    openOnlineBattleModal() {
        console.log('🎮 Открытие модального окна онлайн-боя');
        
        // Проверяем есть ли колода
        const user = this.gameData.getUser();
        console.log('Колода пользователя:', user.deck);
        
        if (!user.deck || user.deck.length !== 3) {
            alert('Сначала соберите колоду из 3 карт!');
            return;
        }
        
        const modal = document.getElementById('online-battle-modal');
        if (modal) {
            console.log('✅ Модальное окно найдено, открываем');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
        } else {
            console.error('❌ Модальное окно online-battle-modal НЕ найдено!');
        }
    }

    closeOnlineBattleModal() {
        document.getElementById('online-battle-modal').style.display = 'none';
        if (this.roomListener) {
            this.roomListener.off();
            this.roomListener = null;
        }
    }

    switchTab(tabName) {
        // Переключение между создать/войти
        document.querySelectorAll('#online-battle-modal .tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        document.querySelectorAll('#online-battle-modal .online-tab').forEach(tab => {
            tab.classList.toggle('active', tab.id === `${tabName}-tab`);
        });
    }

    generateRoomCode() {
        // Генерируем 6-значный код
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    async createRoom() {
        const user = this.gameData.getUser();
        const roomCode = this.generateRoomCode();
        
        const roomData = {
            code: roomCode,
            host: this.gameData.currentUser,
            hostNick: user.nickname || user.username,
            guest: null,
            guestNick: null,
            status: 'waiting',
            hostDeck: user.deck,
            guestDeck: null,
            turn: 0,
            round: 1,
            isHostTurn: true,
            createdAt: Date.now()
        };
        
        try {
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`rooms/${roomCode}`).set(roomData);
            } else {
                // localStorage для тестирования
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                rooms[roomCode] = roomData;
                localStorage.setItem('onlineRooms', JSON.stringify(rooms));
            }
            
            this.currentRoom = roomData;
            this.isHost = true;
            
            // Показываем код комнаты
            document.getElementById('create-room-btn').style.display = 'none';
            document.getElementById('room-created').style.display = 'block';
            document.getElementById('room-code-display').textContent = roomCode;
            
            // Начинаем слушать изменения
            this.listenToRoom(roomCode);
            
        } catch (error) {
            console.error('Ошибка создания комнаты:', error);
            alert('Ошибка создания комнаты: ' + error.message);
        }
    }

    async joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        
        if (!roomCode) {
            alert('Введите код комнаты!');
            return;
        }
        
        try {
            let roomData;
            
            if (this.gameData.useFirebase) {
                const snapshot = await firebase.database().ref(`rooms/${roomCode}`).once('value');
                roomData = snapshot.val();
            } else {
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                roomData = rooms[roomCode];
            }
            
            if (!roomData) {
                alert('Комната не найдена!');
                return;
            }
            
            if (roomData.guest) {
                alert('Комната уже занята!');
                return;
            }
            
            const user = this.gameData.getUser();
            
            // Присоединяемся как guest
            const updates = {
                guest: this.gameData.currentUser,
                guestNick: user.nickname || user.username,
                guestDeck: user.deck,
                status: 'ready'
            };
            
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`rooms/${roomCode}`).update(updates);
            } else {
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                Object.assign(rooms[roomCode], updates);
                localStorage.setItem('onlineRooms', JSON.stringify(rooms));
            }
            
            this.currentRoom = { ...roomData, ...updates };
            this.isHost = false;
            
            this.closeOnlineBattleModal();
            this.startOnlineBattle(roomCode);
            
        } catch (error) {
            console.error('Ошибка входа в комнату:', error);
            alert('Ошибка входа: ' + error.message);
        }
    }

    listenToRoom(roomCode) {
        if (!this.gameData.useFirebase) {
            // Для localStorage проверяем раз в секунду
            const interval = setInterval(async () => {
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                const room = rooms[roomCode];
                
                if (!room) {
                    clearInterval(interval);
                    return;
                }
                
                if (room.status === 'ready' && this.isHost) {
                    clearInterval(interval);
                    this.closeOnlineBattleModal();
                    this.startOnlineBattle(roomCode);
                }
            }, 1000);
            return;
        }
        
        // Firebase real-time listener
        this.roomListener = firebase.database().ref(`rooms/${roomCode}`);
        this.roomListener.on('value', (snapshot) => {
            const room = snapshot.val();
            
            if (!room) {
                console.log('Комната удалена');
                this.closeOnlineBattleModal();
                return;
            }
            
            if (room.status === 'ready' && this.isHost && !this.gameData.battleState) {
                console.log('Противник присоединился! Начинаем бой...');
                this.closeOnlineBattleModal();
                this.startOnlineBattle(roomCode);
            }
            
            // Обновляем текущую комнату
            this.currentRoom = room;
            
            // Если бой идёт, синхронизируем состояние
            if (room.status === 'playing' && this.gameData.battleState) {
                this.syncBattleState(room);
            }
        });
    }

    async startOnlineBattle(roomCode) {
        console.log('=== Начало онлайн-боя ===', roomCode);
        
        try {
            const roomData = await this.getRoomData(roomCode);
            
            if (!roomData || !roomData.hostDeck || !roomData.guestDeck) {
                alert('Ошибка: не все данные загружены');
                return;
            }
            
            // Создаём полные колоды с данными карт
            const playerDeck = this.isHost ? 
                this.createBattleDeck(roomData.hostDeck) :
                this.createBattleDeck(roomData.guestDeck);
                
            const opponentDeck = this.isHost ?
                this.createBattleDeck(roomData.guestDeck) :
                this.createBattleDeck(roomData.hostDeck);
            
            // Переходим на экран боя
            document.getElementById('main-menu').classList.remove('active');
            document.getElementById('battle-screen').classList.add('active');
            
            // Создаём состояние боя
            this.gameData.battleState = {
                playerDeck,
                botDeck: opponentDeck, // используем то же поле для совместимости
                turn: 0,
                round: 1,
                isPlayerTurn: this.isHost, // хост ходит первым
                playerName: this.isHost ? roomData.hostNick : roomData.guestNick,
                botName: this.isHost ? roomData.guestNick : roomData.hostNick,
                inProgress: true,
                isOnline: true,
                roomCode: roomCode
            };
            
            // Обновляем статус комнаты
            await this.updateRoomStatus(roomCode, 'playing');
            
            // Рендерим бой
            this.gameData.renderBattle();
            
            // Запускаем онлайн-логику вместо обычной
            this.startOnlineBattleLogic(roomCode);
            
        } catch (error) {
            console.error('Ошибка запуска онлайн-боя:', error);
            alert('Ошибка запуска боя: ' + error.message);
        }
    }

    createBattleDeck(deckCardNames) {
        return deckCardNames.map(cardName => {
            const cardData = this.gameData.cards[cardName];
            if (!cardData) {
                console.error('Карта не найдена:', cardName);
                return null;
            }
            return {
                ...cardData,
                currentHealth: cardData.health,
                isDead: false
            };
        }).filter(card => card !== null);
    }

    startOnlineBattleLogic(roomCode) {
        // Проверяем чей ход
        if (this.gameData.battleState.isPlayerTurn) {
            // Наш ход
            this.gameData.startPlayerTurn();
        } else {
            // Ход противника - ждём
            this.gameData.showBattleHint('Ход противника... Ожидайте');
            
            // Слушаем изменения в комнате
            this.listenToRoomUpdates(roomCode);
        }
    }

    listenToRoomUpdates(roomCode) {
        // Подписываемся на изменения хода
        if (this.gameData.useFirebase) {
            const roomRef = firebase.database().ref(`rooms/${roomCode}`);
            roomRef.on('value', (snapshot) => {
                const room = snapshot.val();
                if (!room) return;
                
                // Если ход сменился на наш
                const isOurTurn = this.isHost ? room.isHostTurn : !room.isHostTurn;
                
                if (isOurTurn && !this.gameData.battleState.isPlayerTurn) {
                    // Теперь наш ход
                    this.gameData.battleState.isPlayerTurn = true;
                    this.gameData.hideBattleHint();
                    this.gameData.startPlayerTurn();
                }
                
                // Синхронизируем состояние колод
                if (room.hostDeck && room.guestDeck) {
                    this.syncDecksFromRoom(room);
                }
            });
        }
    }

    syncDecksFromRoom(room) {
        // Обновляем HP карт из комнаты
        if (this.isHost) {
            this.updateDeckHP(this.gameData.battleState.playerDeck, room.hostDeck);
            this.updateDeckHP(this.gameData.battleState.botDeck, room.guestDeck);
        } else {
            this.updateDeckHP(this.gameData.battleState.playerDeck, room.guestDeck);
            this.updateDeckHP(this.gameData.battleState.botDeck, room.hostDeck);
        }
        
        this.gameData.renderBattle();
    }

    updateDeckHP(deck, deckData) {
        deck.forEach((card, index) => {
            if (deckData[index]) {
                card.currentHealth = deckData[index].currentHealth || deckData[index].health;
                card.isDead = deckData[index].isDead || false;
            }
        });
    }

    async updateRoomStatus(roomCode, status) {
        if (this.gameData.useFirebase) {
            await firebase.database().ref(`rooms/${roomCode}/status`).set(status);
        } else {
            const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
            if (rooms[roomCode]) {
                rooms[roomCode].status = status;
                localStorage.setItem('onlineRooms', JSON.stringify(rooms));
            }
        }
    }

    async getRoomData(roomCode) {
        if (this.gameData.useFirebase) {
            const snapshot = await firebase.database().ref(`rooms/${roomCode}`).once('value');
            return snapshot.val();
        } else {
            const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
            return rooms[roomCode];
        }
    }

    async cancelRoom() {
        if (!this.currentRoom) return;
        
        try {
            const roomCode = this.currentRoom.code;
            
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`rooms/${roomCode}`).remove();
            } else {
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                delete rooms[roomCode];
                localStorage.setItem('onlineRooms', JSON.stringify(rooms));
            }
            
            if (this.roomListener) {
                this.roomListener.off();
                this.roomListener = null;
            }
            
            this.currentRoom = null;
            this.closeOnlineBattleModal();
            
        } catch (error) {
            console.error('Ошибка отмены комнаты:', error);
        }
    }

    copyRoomCode() {
        const code = document.getElementById('room-code-display').textContent;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(code).then(() => {
                alert('Код скопирован: ' + code);
            });
        } else {
            // Fallback
            const input = document.createElement('input');
            input.value = code;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            alert('Код скопирован: ' + code);
        }
    }

    syncBattleState(roomData) {
        // Синхронизация состояния боя из Firebase
        if (!this.gameData.battleState) return;
        
        this.gameData.battleState.turn = roomData.turn || 0;
        this.gameData.battleState.round = roomData.round || 1;
        
        // Обновляем отображение раунда
        this.gameData.updateRoundDisplay();
    }

    async endOnlineBattle(playerWon) {
        console.log('=== Конец онлайн-боя ===', playerWon);
        
        // НЕ даём награды в онлайн-боях
        const resultOverlay = document.createElement('div');
        resultOverlay.className = 'battle-result-overlay';
        resultOverlay.style.display = 'flex';
        resultOverlay.style.opacity = '0';
        
        if (playerWon) {
            resultOverlay.innerHTML = `
                <div class="battle-result victory">
                    <div class="result-icon">👑</div>
                    <div class="result-title">ПОБЕДА!</div>
                    <div class="result-message">Вы победили в онлайн-бою!</div>
                    <div class="online-note">⚠️ В онлайн-боях нет наград</div>
                    <div class="result-buttons">
                        <button class="btn primary" onclick="onlineBattlesSystem.backToMenuOnline()">📋 В меню</button>
                    </div>
                </div>
            `;
        } else {
            resultOverlay.innerHTML = `
                <div class="battle-result defeat">
                    <div class="result-icon">💀</div>
                    <div class="result-title">ПОРАЖЕНИЕ</div>
                    <div class="result-message">Вы проиграли онлайн-бой!</div>
                    <div class="online-note">⚠️ В онлайн-боях нет наград</div>
                    <div class="result-buttons">
                        <button class="btn primary" onclick="onlineBattlesSystem.backToMenuOnline()">📋 В меню</button>
                    </div>
                </div>
            `;
        }
        
        document.body.appendChild(resultOverlay);
        
        setTimeout(() => {
            resultOverlay.style.opacity = '1';
            resultOverlay.classList.add('active');
        }, 100);
        
        // Удаляем комнату
        if (this.currentRoom) {
            await this.cancelRoom();
        }
    }

    backToMenuOnline() {
        const resultOverlay = document.querySelector('.battle-result-overlay');
        if (resultOverlay && document.body.contains(resultOverlay)) {
            document.body.removeChild(resultOverlay);
        }
        
        document.getElementById('battle-screen').classList.remove('active');
        document.getElementById('main-menu').classList.add('active');
        
        this.gameData.battleState = null;
        this.gameData.clearBattleState();
        this.gameData.updateUserInfo();
    }
}

// Глобальная переменная
window.onlineBattlesSystem = null;

// Инициализация
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOnlineBattlesSystem);
} else {
    initOnlineBattlesSystem();
}

function initOnlineBattlesSystem() {
    console.log('👥 Инициализация системы онлайн-боёв...');
    const interval = setInterval(() => {
        if (window.gameData) {
            console.log('✅ gameData найден, создаём OnlineBattlesSystem');
            window.onlineBattlesSystem = new OnlineBattlesSystem(window.gameData);
            window.onlineBattlesSystem.init();
            clearInterval(interval);
        }
    }, 100);
}


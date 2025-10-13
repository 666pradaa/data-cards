/**
 * 👥 СИСТЕМА ОНЛАЙН-БОЁВ
 * Полная логика онлайн-боёв по коду комнаты через Firebase
 */

console.log('🟢 online-battles.js ЗАГРУЖЕН');

class OnlineBattlesSystem {
    constructor(gameData) {
        this.gameData = gameData;
        this.currentRoom = null;
        this.isHost = false;
        this.roomListener = null;
        this.lastActionTimestamp = null; // Для отслеживания действий противника
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
        
        const closeBtn = document.getElementById('close-online-battle');
        if (closeBtn) {
            console.log('✅ Кнопка закрытия найдена');
            closeBtn.addEventListener('click', () => this.closeOnlineBattleModal());
        } else {
            console.error('❌ Кнопка close-online-battle НЕ найдена!');
        }
        
        // Переключение табов
        const tabBtns = document.querySelectorAll('#online-battle-modal .tab-btn');
        console.log('📑 Найдено табов:', tabBtns.length);
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });
        
        // Создание/вход в комнату - добавляем обработчики сейчас
        this.setupRoomButtons();
    }
    
    setupRoomButtons() {
        console.log('🎲 Настройка кнопок комнат...');
        
        const createBtn = document.getElementById('create-room-btn');
        const joinBtn = document.getElementById('join-room-btn');
        const cancelBtn = document.getElementById('cancel-room-btn');
        const copyBtn = document.getElementById('copy-room-code-btn');
        
        console.log('Кнопка создания:', createBtn ? '✅ найдена' : '❌ НЕ найдена');
        console.log('Кнопка входа:', joinBtn ? '✅ найдена' : '❌ НЕ найдена');
        console.log('Кнопка отмены:', cancelBtn ? '✅ найдена' : '❌ НЕ найдена');
        console.log('Кнопка копирования:', copyBtn ? '✅ найдена' : '❌ НЕ найдена');
        
        if (createBtn && !createBtn.dataset.listenerAdded) {
            console.log('➕ Добавляем обработчик на кнопку создания комнаты');
            createBtn.addEventListener('click', () => {
                console.log('🔵 КЛИК НА СОЗДАНИЕ КОМНАТЫ');
                this.createRoom();
            });
            createBtn.dataset.listenerAdded = 'true';
        }
        
        if (joinBtn && !joinBtn.dataset.listenerAdded) {
            console.log('➕ Добавляем обработчик на кнопку входа в комнату');
            joinBtn.addEventListener('click', () => {
                console.log('🔵 КЛИК НА ВХОД В КОМНАТУ');
                this.joinRoom();
            });
            joinBtn.dataset.listenerAdded = 'true';
        }
        
        if (cancelBtn && !cancelBtn.dataset.listenerAdded) {
            console.log('➕ Добавляем обработчик на кнопку отмены');
            cancelBtn.addEventListener('click', () => {
                console.log('🔵 КЛИК НА ОТМЕНУ');
                this.cancelRoom();
            });
            cancelBtn.dataset.listenerAdded = 'true';
        }
        
        if (copyBtn && !copyBtn.dataset.listenerAdded) {
            console.log('➕ Добавляем обработчик на кнопку копирования');
            copyBtn.addEventListener('click', () => {
                console.log('🔵 КЛИК НА КОПИРОВАНИЕ');
                this.copyRoomCode();
            });
            copyBtn.dataset.listenerAdded = 'true';
        }
    }

    async openOnlineBattleModal() {
        console.log('🎮 Открытие модального окна онлайн-боя');
        
        // Проверяем есть ли колода
        const user = this.gameData.getUser();
        console.log('Колода пользователя:', user.deck);
        
        if (!user.deck || user.deck.length !== 3) {
            await this.gameData.showAlert('Сначала соберите колоду из 3 карт!', '⚠️', 'Ошибка');
            return;
        }
        
        const modal = document.getElementById('online-battle-modal');
        if (modal) {
            console.log('✅ Модальное окно найдено, открываем');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            
            // Переустанавливаем обработчики после открытия модального окна
            setTimeout(() => {
                console.log('🔄 Переустановка обработчиков кнопок комнат...');
                this.setupRoomButtons();
            }, 100);
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
        console.log('🎮🎮🎮 СОЗДАНИЕ ОНЛАЙН-КОМНАТЫ 🎮🎮🎮');
        
        const user = this.gameData.getUser();
        const deck = user.deck;
        
        console.log('👤 Хост:', user.nickname || user.username);
        console.log('🃏 Колода хоста:', deck);
        
        if (!deck || deck.length !== 3) {
            await this.gameData.showAlert('Вы должны иметь ровно 3 карты в колоде!', '⚠️', 'Ошибка');
            console.error('❌ Неверная колода. Длина:', deck?.length);
            return;
        }
        
        // Генерируем 4-значный код комнаты
        const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
        console.log('🔑 Код комнаты сгенерирован:', roomCode);
        
        this.isHost = true;
        this.currentRoom = roomCode;
        
        // Получаем ID пользователя
        const currentUserId = this.gameData.useFirebase ? 
            (firebase.auth().currentUser?.uid || this.gameData.currentUser) :
            this.gameData.currentUser;
        
        console.log('👤 ID хоста:', currentUserId);
        
        // Создаём данные комнаты
        const roomData = {
            code: roomCode,
            host: currentUserId,
            hostNickname: user.nickname || user.username,
            hostDeck: deck, // Сохраняем только названия карт
            guest: null,
            guestNickname: null,
            guestDeck: null,
            status: 'waiting',
            turn: 0,
            round: 1,
            isHostTurn: true,
            createdAt: Date.now()
        };
        
        console.log('📦 Данные комнаты для Firebase:', roomData);
        
        try {
            if (this.gameData.useFirebase) {
                console.log('☁️ Отправка комнаты в Firebase...');
                await firebase.database().ref(`rooms/${roomCode}`).set(roomData);
                console.log('✅✅✅ Комната успешно создана в Firebase!');
            } else {
                // localStorage для тестирования
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                rooms[roomCode] = roomData;
                localStorage.setItem('onlineRooms', JSON.stringify(rooms));
                console.log('✅ Комната создана в localStorage');
            }
            
            this.currentRoom = roomCode;
            this.isHost = true;
            
            // Сразу закрываем модалку и возвращаем в меню
            const onlineModal = document.getElementById('online-battle-modal');
            const mainMenu = document.getElementById('main-menu');
            
            if (onlineModal) {
                onlineModal.style.display = 'none';
                console.log('✅ Модалка закрыта');
            }
            
            if (mainMenu) {
                mainMenu.style.display = 'flex';
                mainMenu.classList.add('active');
                console.log('✅ Возврат в главное меню');
            }
            
            console.log('🎉 Комната создана! Код:', roomCode);
            console.log('⏳ Ожидание гостя в фоне...');
            
            // Начинаем слушать изменения (ожидание в фоне)
            this.listenToRoom(roomCode);
            
            // Показываем красивое окно с кодом комнаты и кнопкой копирования
            this.showRoomCodeWindow(roomCode);
            
        } catch (error) {
            console.error('❌ Ошибка создания комнаты:', error);
            await this.gameData.showAlert('Ошибка создания комнаты: ' + error.message, '❌', 'Ошибка');
        }
    }

    async joinRoom() {
        const roomCode = document.getElementById('room-code-input').value.trim();
        
        if (!roomCode) {
            await this.gameData.showAlert('Введите код комнаты!', '⚠️', 'Ошибка');
            return;
        }
        
        console.log('🔍 Попытка войти в комнату:', roomCode);
        
        try {
            let roomData;
            
            if (this.gameData.useFirebase) {
                const snapshot = await firebase.database().ref(`rooms/${roomCode}`).once('value');
                roomData = snapshot.val();
                console.log('📦 Данные комнаты из Firebase:', roomData);
            } else {
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                roomData = rooms[roomCode];
                console.log('📦 Данные комнаты из localStorage:', roomData);
            }
            
            if (!roomData) {
                await this.gameData.showAlert('Комната не найдена! Проверьте код.', '❌', 'Ошибка');
                console.error('❌ Комната не найдена');
                return;
            }
            
            if (roomData.guest) {
                await this.gameData.showAlert('Комната уже занята!', '⚠️', 'Занято');
                console.error('❌ Комната занята');
                return;
            }
            
            const user = this.gameData.getUser();
            console.log('👤 Пользователь заходит:', user.nickname || user.username);
            
            // Проверяем колоду
            if (!user.deck || user.deck.length !== 3) {
                await this.gameData.showAlert('Сначала соберите колоду из 3 карт!', '⚠️', 'Ошибка');
                return;
            }
            
            console.log('🃏 Колода гостя:', user.deck);
            
            // Получаем правильный ID гостя
            const currentUserId = this.gameData.useFirebase ? 
                (firebase.auth().currentUser?.uid || this.gameData.currentUser) :
                this.gameData.currentUser;
            
            console.log('👤 ID гостя:', currentUserId);
            
            // Присоединяемся как guest
            const updates = {
                guest: currentUserId,
                guestNick: user.nickname || user.username,
                guestDeck: user.deck,
                status: 'ready'
            };
            
            console.log('💾 Обновляем комнату данными гостя:', updates);
            
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`rooms/${roomCode}`).update(updates);
                console.log('✅ Комната обновлена в Firebase');
            } else {
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                Object.assign(rooms[roomCode], updates);
                localStorage.setItem('onlineRooms', JSON.stringify(rooms));
                console.log('✅ Комната обновлена в localStorage');
            }
            
            this.currentRoom = { ...roomData, ...updates };
            this.isHost = false;
            
            console.log('🚀 МОМЕНТАЛЬНЫЙ ЗАПУСК БОЯ!');
            
            // Закрываем модалку
            const onlineModal = document.getElementById('online-battle-modal');
            if (onlineModal) {
                onlineModal.style.display = 'none';
                console.log('✅ Модалка закрыта');
            }
            
            // СРАЗУ запускаем бой без задержек
            this.startOnlineBattle(roomCode);
            
        } catch (error) {
            console.error('❌ Ошибка входа в комнату:', error);
            await this.gameData.showAlert('Ошибка входа: ' + error.message, '❌', 'Ошибка');
        }
    }

    listenToRoom(roomCode) {
        console.log('👂 Начинаем слушать комнату:', roomCode);
        
        if (!this.gameData.useFirebase) {
            // Для localStorage проверяем раз в секунду
            const interval = setInterval(async () => {
                const rooms = JSON.parse(localStorage.getItem('onlineRooms') || '{}');
                const room = rooms[roomCode];
                
                if (!room) {
                    console.log('❌ Комната удалена');
                    clearInterval(interval);
                    return;
                }
                
                console.log('🔄 Проверка комнаты (localStorage):', room.status);
                
                if (room.status === 'ready' && this.isHost) {
                    console.log('✅ Гость присоединился! Запускаем бой...');
                    clearInterval(interval);
                    this.closeOnlineBattleModal();
                    this.startOnlineBattle(roomCode);
                }
            }, 1000);
            return;
        }
        
        // Firebase real-time listener
        console.log('🔥 Создаем Firebase listener для комнаты');
        this.roomListener = firebase.database().ref(`rooms/${roomCode}`);
        this.roomListener.on('value', (snapshot) => {
            const room = snapshot.val();
            
            if (!room) {
                console.log('❌ Комната удалена или не найдена');
                this.closeOnlineBattleModal();
                if (this.roomListener) {
                    this.roomListener.off();
                    this.roomListener = null;
                }
                return;
            }
            
            console.log('🔔 Обновление комнаты:', {
                status: room.status,
                isHost: this.isHost,
                hasGuest: !!room.guest,
                hasBattleState: !!this.gameData.battleState
            });
            
            if (room.status === 'ready' && this.isHost && !this.gameData.battleState) {
                console.log('🎉 Гость присоединился! Начинаем бой НЕМЕДЛЕННО...');
                
                // Отключаем слушатель для избежания повторного запуска
                if (this.roomListener) {
                    this.roomListener.off();
                    this.roomListener = null;
                }
                
                // Закрываем окно с кодом комнаты (если открыто)
                const roomCodeOverlay = document.querySelector('.custom-modal-overlay');
                if (roomCodeOverlay && document.body.contains(roomCodeOverlay)) {
                    roomCodeOverlay.style.opacity = '0';
                    setTimeout(() => {
                        if (document.body.contains(roomCodeOverlay)) {
                            document.body.removeChild(roomCodeOverlay);
                        }
                    }, 300);
                    console.log('✅ Окно с кодом комнаты закрыто автоматически');
                }
                
                // Закрываем все модалки
                const onlineModal = document.getElementById('online-battle-modal');
                if (onlineModal) {
                    onlineModal.style.display = 'none';
                }
                
                // СРАЗУ запускаем бой без задержки
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
        console.log('=== 🎮 Начало онлайн-боя ===');
        console.log('Код комнаты:', roomCode);
        console.log('Роль игрока:', this.isHost ? 'ХОСТ' : 'ГОСТЬ');
        
        try {
            const roomData = await this.getRoomData(roomCode);
            console.log('📦 Данные комнаты:', roomData);
            
            if (!roomData) {
                await this.gameData.showAlert('Ошибка: комната не найдена', '❌', 'Ошибка');
                console.error('❌ roomData is null');
                return;
            }
            
            if (!roomData.hostDeck || !roomData.guestDeck) {
                await this.gameData.showAlert('Ошибка: не все колоды загружены. Ожидайте противника.', '⏳', 'Ожидание');
                console.error('❌ Отсутствуют колоды:', {
                    hostDeck: roomData.hostDeck,
                    guestDeck: roomData.guestDeck
                });
                return;
            }
            
            console.log('🃏 Колода хоста:', roomData.hostDeck);
            console.log('🃏 Колода гостя:', roomData.guestDeck);
            
            // Создаём полные колоды с данными карт
            console.log('⚙️ Создание боевых колод...');
            const playerDeck = this.isHost ? 
                await this.createBattleDeck(roomData.hostDeck, roomData.host) :
                await this.createBattleDeck(roomData.guestDeck, roomData.guest);
                
            const opponentDeck = this.isHost ?
                await this.createBattleDeck(roomData.guestDeck, roomData.guest) :
                await this.createBattleDeck(roomData.hostDeck, roomData.host);
            
            console.log('✅ Колода игрока создана:', playerDeck.length, 'карт');
            console.log('✅ Колода противника создана:', opponentDeck.length, 'карт');
            
            // КРИТИЧНО: Переключаем экраны
            console.log('🔄 Переключение экранов на battle-screen...');
            
            const mainMenu = document.getElementById('main-menu');
            const onlineModal = document.getElementById('online-battle-modal');
            const battleScreen = document.getElementById('battle-screen');
            
            if (mainMenu) {
                mainMenu.classList.remove('active');
                mainMenu.style.display = 'none';
                console.log('✅ main-menu скрыт');
            }
            
            if (onlineModal) {
                onlineModal.style.display = 'none';
                console.log('✅ online-modal закрыт');
            }
            
            if (battleScreen) {
                battleScreen.classList.add('active');
                battleScreen.style.display = 'flex';
                console.log('✅ battle-screen показан');
            } else {
                console.error('❌ battle-screen НЕ НАЙДЕН!');
            }
            
            // Создаём состояние боя
            this.gameData.battleState = {
                playerDeck,
                botDeck: opponentDeck, // используем то же поле для совместимости
                turn: 0,
                round: 1,
                isPlayerTurn: this.isHost, // хост ходит первым
                playerName: this.isHost ? (roomData.hostNickname || roomData.hostNick) : (roomData.guestNickname || roomData.guestNick),
                botName: this.isHost ? (roomData.guestNickname || roomData.guestNick) : (roomData.hostNickname || roomData.hostNick),
                inProgress: true,
                isOnline: true,
                roomCode: roomCode,
                lastPlayerCard: null,  // Карта которой ходил игрок в прошлом раунде
                lastBotCard: null,      // Карта которой ходил бот в прошлом раунде
                // 🔮 Система рун
                playerRune: this.gameData.generateRune(),
                botRune: this.gameData.generateRune(),
                runeUsedThisTurn: false,
                invisibleCards: [],
                shieldedCards: [],
                // ⚡ Система скиллов
                skillCooldowns: {},
                frozenCards: [],
                fearedCards: []
            };
            
            console.log('🎯 Состояние боя создано:', this.gameData.battleState);
            
            // Обновляем статус комнаты
            await this.updateRoomStatus(roomCode, 'playing');
            console.log('✅ Статус комнаты обновлен на "playing"');
            
            // Рендерим бой
            this.gameData.renderBattle();
            console.log('✅ Бой отрендерен');
            
            // Обновляем отображение имен
            this.gameData.updateBattleNames();
            this.gameData.updateRoundDisplay();
            
            // Запускаем онлайн-логику вместо обычной
            this.startOnlineBattleLogic(roomCode);
            console.log('✅ Онлайн-логика запущена');
            
        } catch (error) {
            console.error('❌ Ошибка запуска онлайн-боя:', error);
            await this.gameData.showAlert('Ошибка запуска боя: ' + error.message, '❌', 'Ошибка');
        }
    }

    async createBattleDeck(deckCardNames, userId = null) {
        console.log('🔨 Создание боевой колоды из:', deckCardNames);
        console.log('👤 Для пользователя:', userId || 'текущий');
        
        if (!deckCardNames || !Array.isArray(deckCardNames)) {
            console.error('❌ deckCardNames не массив:', deckCardNames);
            return [];
        }
        
        // Получаем данные нужного пользователя
        let userData;
        if (userId && this.gameData.useFirebase) {
            // Для Firebase получаем данные другого пользователя
            console.log('🔍 Загрузка данных пользователя из Firebase:', userId);
            userData = await this.gameData.getUserById(userId);
            console.log('📦 Данные пользователя загружены:', userData ? 'OK' : 'NULL');
        } else if (userId) {
            // localStorage - получаем другого пользователя
            console.log('🔍 Загрузка данных пользователя из localStorage:', userId);
            const allUsers = JSON.parse(localStorage.getItem('dotaCardsUsers') || '{}');
            userData = allUsers[userId];
            console.log('📦 Данные пользователя загружены:', userData ? 'OK' : 'NULL');
        } else {
            // Для текущего пользователя
            console.log('🔍 Получение данных текущего пользователя');
            userData = this.gameData.getUser();
            console.log('📦 Данные пользователя:', userData ? 'OK' : 'NULL');
        }
        
        if (!userData) {
            console.error('❌ userData is null! userId:', userId);
            return [];
        }
        
        const userCards = userData.cards || {};
        console.log('📦 Карты пользователя:', Object.keys(userCards).length);
        console.log('📋 Список карт:', Object.keys(userCards));
        
        const battleDeck = deckCardNames.map(cardName => {
            const cardData = this.gameData.cards[cardName];
            if (!cardData) {
                console.error('❌ Карта не найдена в базе:', cardName);
                return null;
            }
            
            console.log('📋 Базовые данные карты:', cardName, {
                name: cardData.name,
                damage: cardData.damage,
                health: cardData.health,
                defense: cardData.defense,
                speed: cardData.speed
            });
            
            if (!cardData.health || !cardData.damage) {
                console.error('❌ У карты отсутствуют базовые статы!', cardName, cardData);
            }
            
            // Получаем улучшения карты пользователя
            const userCard = userCards[cardName] || { upgrades: [] };
            const upgrades = userCard.upgrades || [];
            
            console.log('🎯 Улучшения карты:', upgrades);
            
            const damageBonus = this.gameData.getUpgradeBonus(upgrades, 'damage');
            const healthBonus = this.gameData.getUpgradeBonus(upgrades, 'health');
            const defenseBonus = this.gameData.getUpgradeBonus(upgrades, 'defense');
            const speedBonus = this.gameData.getUpgradeBonus(upgrades, 'speed');
            
            console.log('💪 Бонусы от улучшений:', { damageBonus, healthBonus, defenseBonus, speedBonus });
            
            const finalDamage = (cardData.damage || 50) + damageBonus;
            const finalHealth = (cardData.health || 100) + healthBonus;
            const finalDefense = (cardData.defense || 10) + defenseBonus;
            const finalSpeed = (cardData.speed || 10) + speedBonus;
            
            console.log('📊 Финальные статы:', {
                damage: finalDamage,
                health: finalHealth,
                defense: finalDefense,
                speed: finalSpeed
            });
            
            const card = {
                name: cardData.name,
                damage: finalDamage,
                health: finalHealth,
                maxHealth: finalHealth,
                defense: finalDefense,
                speed: finalSpeed,
                image: cardData.image,
                rarity: cardData.rarity,
                upgrades: upgrades,
                isDead: false,
                skill: cardData.skill || null, // ⚡ Скилл карты
                skillCooldown: 0 // Кулдаун скилла
            };
            
            console.log(`✅ Карта создана: ${card.name} (DMG ${card.damage}, HP ${card.health}/${card.maxHealth}, DEF ${card.defense}%, SPD ${card.speed})`);
            
            // Проверка валидности
            if (!card.health || !card.maxHealth) {
                console.error('❌ Некорректные HP у карты:', card);
            }
            
            return card;
        }).filter(card => card !== null);
        
        console.log('✅ Боевая колода создана:', battleDeck.length, 'карт');
        
        return battleDeck;
    }

    startOnlineBattleLogic(roomCode) {
        console.log('🎯 Запуск онлайн-логики, isPlayerTurn:', this.gameData.battleState.isPlayerTurn);
        
        // Инициализируем переменные для онлайн-боя
        if (!this.gameData.battleState.lastPlayerCard) {
            this.gameData.battleState.lastPlayerCard = null;
        }
        if (!this.gameData.battleState.lastBotCard) {
            this.gameData.battleState.lastBotCard = null;
        }
        
        // Подписываемся на изменения в комнате
        this.listenToRoomUpdates(roomCode);
        
        // Проверяем чей ход
        if (this.gameData.battleState.isPlayerTurn) {
            // Наш ход
            console.log('✅ Наш ход - запускаем startPlayerTurn');
            this.gameData.startPlayerTurn();
        } else {
            // Ход противника - ждём
            console.log('⏳ Ход противника - ожидаем');
            this.gameData.showBattleHint('Ход противника... Ожидайте');
        }
    }

    listenToRoomUpdates(roomCode) {
        console.log('👂 Подписываемся на изменения комнаты:', roomCode);
        
        if (this.gameData.useFirebase) {
            const roomRef = firebase.database().ref(`rooms/${roomCode}`);
            
            this.roomListener = roomRef.on('value', (snapshot) => {
                const room = snapshot.val();
                if (!room) return;
                
                console.log('📡 Обновление комнаты:', {
                    isHostTurn: room.isHostTurn,
                    weAreHost: this.isHost,
                    currentAction: room.currentAction
                });
                
                // Если ход сменился на наш
                const isOurTurn = this.isHost ? room.isHostTurn : !room.isHostTurn;
                
                if (isOurTurn && !this.gameData.battleState.isPlayerTurn) {
                    // Теперь наш ход
                    console.log('✅ Теперь наш ход!');
                    this.gameData.battleState.isPlayerTurn = true;
                    
                    // Синхронизируем колоды перед нашим ходом
                    if (room.hostDeck && room.guestDeck) {
                        this.syncDecksFromRoom(room);
                    }
                    
                    this.gameData.hideBattleHint();
                    
                    // Запускаем ХОД ИГРОКА (а не бота!)
                    this.gameData.startPlayerTurn();
                    return;
                }
                
                // Если ход противника и есть действие
                if (!isOurTurn && room.currentAction && room.currentAction.timestamp !== this.lastActionTimestamp) {
                    console.log('⚔️ Противник совершил действие:', room.currentAction);
                    this.lastActionTimestamp = room.currentAction.timestamp;
                    this.playOpponentAction(room.currentAction);
                }
                
                // Синхронизируем состояние колод (только если это обновления HP после хода)
                if (room.hostDeck && room.guestDeck && room.lastActionTime) {
                    this.syncDecksFromRoom(room);
                }
            });
        }
    }

    async endPlayerTurn() {
        console.log('🔄 Завершаем свой ход, передаём ход противнику');
        
        const roomCode = this.gameData.battleState.roomCode;
        if (!roomCode) {
            console.error('❌ Нет кода комнаты!');
            return;
        }
        
        try {
            // Подготавливаем данные колод с полной информацией
            const myDeckData = this.gameData.battleState.playerDeck.map(card => ({
                name: card.name,
                health: card.health,
                maxHealth: card.maxHealth,
                isDead: card.isDead || card.health <= 0,
                damage: card.damage,
                defense: card.defense,
                speed: card.speed,
                skillCooldown: card.skillCooldown || 0
            }));
            
            const enemyDeckData = this.gameData.battleState.botDeck.map(card => ({
                name: card.name,
                health: card.health,
                maxHealth: card.maxHealth,
                isDead: card.isDead || card.health <= 0,
                damage: card.damage,
                defense: card.defense,
                speed: card.speed,
                skillCooldown: card.skillCooldown || 0
            }));
            
            // Обновляем данные в Firebase
            if (this.gameData.useFirebase) {
                const roomRef = firebase.database().ref(`rooms/${roomCode}`);
                
                const updateData = {
                    lastActionTime: Date.now(),
                    round: this.gameData.battleState.round || 1,
                    lastPlayerCard: this.gameData.battleState.lastPlayerCard,
                    lastBotCard: this.gameData.battleState.lastBotCard
                };
                
                if (this.isHost) {
                    updateData.hostDeck = myDeckData;
                    updateData.guestDeck = enemyDeckData;
                    updateData.isHostTurn = false; // Передаём ход гостю
                } else {
                    updateData.guestDeck = myDeckData;
                    updateData.hostDeck = enemyDeckData;
                    updateData.isHostTurn = true; // Передаём ход хосту
                }
                
                await roomRef.update(updateData);
                console.log('✅ Ход передан противнику, данные обновлены');
            }
            
            // Помечаем что сейчас не наш ход
            this.gameData.battleState.isPlayerTurn = false;
            this.gameData.showBattleHint('Ход противника... Ожидайте');
            
            console.log('⏳ Ожидаем хода противника (НЕ бота!)');
            
            // Проверяем окончание боя
            if (this.gameData.checkBattleEnd()) {
                console.log('🏁 Бой завершён');
            }
            
        } catch (error) {
            console.error('❌ Ошибка передачи хода:', error);
        }
    }
    
    playOpponentAction(action) {
        console.log('🎬 Воспроизводим действие противника:', action);
        
        // Показываем визуальный эффект атаки
        if (action.type === 'attack') {
            const attackerCard = this.gameData.battleState.botDeck.find(c => c.name === action.attacker);
            const targetCard = this.gameData.battleState.playerDeck.find(c => c.name === action.target);
            
            if (attackerCard && targetCard) {
                // Подсвечиваем атакующую карту
                const attackerEl = document.querySelector(`.enemy-battle-side .battle-card-new[data-card-name="${attackerCard.name}"]`);
                if (attackerEl) {
                    attackerEl.classList.add('selected');
                    setTimeout(() => attackerEl.classList.remove('selected'), 800);
                }
                
                // Подсвечиваем цель
                const targetEl = document.querySelector(`.player-battle-side .battle-card-new[data-card-name="${targetCard.name}"]`);
                if (targetEl) {
                    targetEl.classList.add('target-available');
                    setTimeout(() => targetEl.classList.remove('target-available'), 800);
                }
                
                // Показываем подсказку
                this.gameData.showBattleHint(`${attackerCard.name} атакует ${targetCard.name}!`);
            }
        }
    }

    syncDecksFromRoom(room) {
        console.log('🔄 syncDecksFromRoom вызван, isHost:', this.isHost);
        console.log('📦 room.hostDeck:', room.hostDeck);
        console.log('📦 room.guestDeck:', room.guestDeck);
        
        // НЕ обновляем HP если данные в Firebase - это просто названия карт (начало боя)
        const isStartOfBattle = !room.lastActionTime;
        
        if (isStartOfBattle) {
            console.log('⚠️ Начало боя - НЕ синхронизируем HP (данные только названия)');
            return;
        }
        
        // Обновляем HP карт из комнаты (только после первого хода)
        if (this.isHost) {
            if (Array.isArray(room.hostDeck) && room.hostDeck[0]?.health !== undefined) {
                this.updateDeckHP(this.gameData.battleState.playerDeck, room.hostDeck);
            }
            if (Array.isArray(room.guestDeck) && room.guestDeck[0]?.health !== undefined) {
                this.updateDeckHP(this.gameData.battleState.botDeck, room.guestDeck);
            }
        } else {
            if (Array.isArray(room.guestDeck) && room.guestDeck[0]?.health !== undefined) {
                this.updateDeckHP(this.gameData.battleState.playerDeck, room.guestDeck);
            }
            if (Array.isArray(room.hostDeck) && room.hostDeck[0]?.health !== undefined) {
                this.updateDeckHP(this.gameData.battleState.botDeck, room.hostDeck);
            }
        }
        
        this.gameData.renderBattle();
    }

    updateDeckHP(deck, deckData) {
        if (!Array.isArray(deckData)) {
            console.warn('⚠️ deckData не массив:', deckData);
            return;
        }
        
        console.log('🔄 Синхронизация колоды, deckData:', deckData.map(c => ({name: c?.name, hp: c?.health})));
        
        deck.forEach((card, index) => {
            if (deckData[index]) {
                const newHealth = deckData[index].health;
                const newIsDead = deckData[index].isDead;
                
                console.log(`🔄 Обновление ${card.name}: ${card.health} → ${newHealth}, isDead: ${card.isDead} → ${newIsDead}`);
                
                // Обновляем только если данные валидны
                if (newHealth !== undefined && newHealth !== null) {
                    card.health = newHealth;
                }
                
                if (newIsDead !== undefined && newIsDead !== null) {
                    card.isDead = newIsDead;
                } else {
                    // Если isDead не передан, определяем по HP
                    card.isDead = card.health <= 0;
                }
                
                // Синхронизируем кулдауны скиллов
                if (deckData[index].skillCooldown !== undefined) {
                    card.skillCooldown = deckData[index].skillCooldown;
                }
            }
        });
        
        console.log('✅ HP и кулдауны синхронизированы');
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

    async copyRoomCode() {
        const code = document.getElementById('room-code-display').textContent;
        
        if (navigator.clipboard) {
            try {
                await navigator.clipboard.writeText(code);
                await this.gameData.showAlert(`Код скопирован: ${code}`, '✅', 'Успех');
            } catch (error) {
                console.error('❌ Ошибка копирования:', error);
                await this.gameData.showAlert('Ошибка копирования в буфер обмена', '❌', 'Ошибка');
            }
        } else {
            // Fallback для старых браузеров
            const input = document.createElement('input');
            input.value = code;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
            await this.gameData.showAlert(`Код скопирован: ${code}`, '✅', 'Успех');
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
    
    showRoomCodeWindow(roomCode) {
        console.log('📋 Показываем окно с кодом комнаты:', roomCode);
        
        // Создаем красивое модальное окно с кодом
        const overlay = document.createElement('div');
        overlay.className = 'custom-modal-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 100000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: linear-gradient(145deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            padding: 2.5rem;
            max-width: 500px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            text-align: center;
            transform: scale(0.9);
            transition: transform 0.3s ease;
        `;
        
        modal.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem;">🎮</div>
            <h2 style="margin: 0 0 1rem 0; color: #fff; font-size: 1.8rem;">Комната создана!</h2>
            <p style="margin: 0 0 1.5rem 0; color: rgba(255,255,255,0.7); font-size: 1rem;">
                Передайте этот код второму игроку:
            </p>
            <div style="
                background: rgba(255, 255, 255, 0.05);
                border: 2px solid rgba(255, 255, 255, 0.2);
                border-radius: 15px;
                padding: 1.5rem;
                margin: 1.5rem 0;
                font-size: 3rem;
                font-weight: 900;
                color: #ffd700;
                letter-spacing: 0.3rem;
                text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
            ">${roomCode}</div>
            <p style="margin: 1rem 0 1.5rem 0; color: rgba(255,255,255,0.5); font-size: 0.9rem;">
                ⏳ Ожидание второго игрока...<br>
                <span style="font-size: 0.8rem;">Бой запустится автоматически когда игрок присоединится</span>
            </p>
            <div style="display: flex; gap: 1rem; justify-content: center;">
                <button id="copy-room-code-modal" style="
                    background: linear-gradient(145deg, #4a4a4a 0%, #2d2d2d 100%);
                    color: #fff;
                    border: 2px solid rgba(255, 255, 255, 0.2);
                    padding: 0.8rem 2rem;
                    border-radius: 10px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 600;
                " onmouseover="this.style.background='linear-gradient(145deg, #5a5a5a 0%, #3d3d3d 100%)'; this.style.borderColor='rgba(255,255,255,0.4)';" 
                   onmouseout="this.style.background='linear-gradient(145deg, #4a4a4a 0%, #2d2d2d 100%)'; this.style.borderColor='rgba(255,255,255,0.2)';">
                    📋 Скопировать код
                </button>
                <button id="close-room-code-modal" style="
                    background: linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%);
                    color: #fff;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    padding: 0.8rem 2rem;
                    border-radius: 10px;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    font-weight: 600;
                " onmouseover="this.style.background='linear-gradient(145deg, #3d3d3d 0%, #2a2a2a 100%)'; this.style.borderColor='rgba(255,255,255,0.3)';" 
                   onmouseout="this.style.background='linear-gradient(145deg, #2d2d2d 0%, #1a1a1a 100%)'; this.style.borderColor='rgba(255,255,255,0.1)';">
                    Закрыть
                </button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        // Анимация появления
        setTimeout(() => {
            overlay.style.opacity = '1';
            modal.style.transform = 'scale(1)';
        }, 10);
        
        // Обработчики кнопок
        document.getElementById('copy-room-code-modal').onclick = async () => {
            try {
                await navigator.clipboard.writeText(roomCode);
                await this.gameData.showAlert(`Код ${roomCode} скопирован!`, '✅', 'Успех');
            } catch (error) {
                console.error('Ошибка копирования:', error);
            }
        };
        
        document.getElementById('close-room-code-modal').onclick = () => {
            overlay.style.opacity = '0';
            modal.style.transform = 'scale(0.9)';
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        };
        
        // Закрытие по клику на фон
        overlay.onclick = (e) => {
            if (e.target === overlay) {
                document.getElementById('close-room-code-modal').click();
            }
        };
    }
}

// Глобальная переменная
console.log('🟡 Устанавливаем window.onlineBattlesSystem = null');
window.onlineBattlesSystem = null;

// Инициализация
function initOnlineBattlesSystem() {
    console.log('👥👥👥 НАЧАЛО ИНИЦИАЛИЗАЦИИ СИСТЕМЫ ОНЛАЙН-БОЁВ 👥👥👥');
    console.log('   window.gameData существует:', !!window.gameData);
    console.log('   typeof gameData:', typeof window.gameData);
    
    let intervalCount = 0;
    const interval = setInterval(() => {
        intervalCount++;
        console.log(`⏰ Попытка #${intervalCount} - gameData:`, !!window.gameData);
        
        if (window.gameData) {
            console.log('✅✅✅ gameData НАЙДЕН! Создаём OnlineBattlesSystem...');
            
            try {
                window.onlineBattlesSystem = new OnlineBattlesSystem(window.gameData);
                console.log('✅ onlineBattlesSystem создан:', !!window.onlineBattlesSystem);
                console.log('   typeof:', typeof window.onlineBattlesSystem);
                
                window.onlineBattlesSystem.init();
                console.log('✅ onlineBattlesSystem.init() завершен');
                
                clearInterval(interval);
                console.log('🎉🎉🎉 ИНИЦИАЛИЗАЦИЯ ЗАВЕРШЕНА УСПЕШНО!');
            } catch (error) {
                console.error('❌❌❌ ОШИБКА ПРИ СОЗДАНИИ onlineBattlesSystem:', error);
                clearInterval(interval);
            }
        } else {
            console.log('⏳ gameData еще не существует, ждем...');
        }
        
        // Останавливаем после 100 попыток
        if (intervalCount >= 100) {
            console.error('❌ Превышен лимит ожидания gameData (10 секунд)');
            clearInterval(interval);
        }
    }, 100);
}

// Запускаем инициализацию
console.log('🟢 Проверка readyState:', document.readyState);

if (document.readyState === 'loading') {
    console.log('📄 DOM загружается, ждем DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOMContentLoaded сработал!');
        initOnlineBattlesSystem();
    });
} else {
    console.log('📄 DOM уже загружен, запускаем инициализацию НЕМЕДЛЕННО');
    initOnlineBattlesSystem();
}


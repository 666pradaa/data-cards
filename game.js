// Система звуков с локальными файлами
class SoundSystem {
    constructor() {
        this.masterVolume = 0.3;
        this.soundEnabled = localStorage.getItem('soundEnabled') !== 'false';
        this.musicEnabled = localStorage.getItem('musicEnabled') !== 'false';
        this.currentBgMusic = null;
        
        // Пути к звуковым файлам
        this.soundPaths = {
            'whoosh': 'sounds/whoosh.mp3',
            'attack': 'sounds/attack.mp3',
            'critAttack': 'sounds/crit_attack.mp3',
            'damage': 'sounds/damage.mp3',
            'death': 'sounds/death.mp3',
            'openCase': 'sounds/open_case.mp3',
            'victory': 'sounds/victory.mp3',
            'defeat': 'sounds/defeat.mp3',
            'upgrade': 'sounds/upgrade.mp3',
            'backgroundMusic': 'sounds/background_music.mp3'
        };
    }

    playSound(type, volume = 1) {
        if (!this.soundEnabled) return;
        
        const soundPath = this.soundPaths[type];
        if (soundPath) {
            try {
                const audio = new Audio(soundPath);
                audio.volume = this.masterVolume * volume;
                audio.play().catch(() => {}); // Игнорируем ошибки если файл не найден
            } catch (e) {
                // Файл не найден - просто игнорируем
            }
        }
    }

    startBackgroundMusic() {
        if (!this.musicEnabled) {
            console.log('Music is disabled');
            return;
        }
        
        // Если музыка уже играет - не перезапускаем
        if (this.currentBgMusic && !this.currentBgMusic.paused) {
            console.log('Music is already playing');
            return;
        }
        
        try {
            console.log('Attempting to start background music from:', this.soundPaths['backgroundMusic']);
            this.currentBgMusic = new Audio(this.soundPaths['backgroundMusic']);
            this.currentBgMusic.volume = this.masterVolume * 0.3;
            this.currentBgMusic.loop = true;
            this.currentBgMusic.play()
                .then(() => console.log('✅ Background music started successfully!'))
                .catch(err => console.error('❌ Failed to play music:', err.message));
        } catch (e) {
            console.error('❌ Error creating audio:', e.message);
        }
    }

    startBattleMusic() {
        // Используем ту же музыку что и в меню - просто продолжаем играть
    }

    stopBackgroundMusic() {
        if (this.currentBgMusic) {
            this.currentBgMusic.pause();
            this.currentBgMusic = null;
        }
    }

    stopBattleMusic() {
        // Ничего не делаем, музыка продолжает играть
    }

    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('soundEnabled', this.soundEnabled);
        return this.soundEnabled;
    }

    toggleMusic() {
        this.musicEnabled = !this.musicEnabled;
        localStorage.setItem('musicEnabled', this.musicEnabled);
        
        if (this.musicEnabled) {
            this.startBackgroundMusic();
        } else {
            this.stopBackgroundMusic();
        }
        
        return this.musicEnabled;
    }
}

// Игровые данные
class GameData {
    constructor() {
        this.currentUser = null;
        this.currentUserData = null;
        this.allUsersCache = {}; // Кеш всех пользователей для поиска
        this.useFirebase = typeof firebase !== 'undefined' && typeof firebaseAdapter !== 'undefined';
        
        // Создаём умный прокси для автоматической совместимости
        this.users = this.createUsersProxy();
        
        this.currentTheme = localStorage.getItem('dotaCardsTheme') || 'dark';
        this.soundSystem = new SoundSystem();
        
        // Сохраняем текущие фильтры для колоды
        this.deckRarityFilter = 'all';
        this.deckStarsFilter = 'all';
        
        // Доступные аватары (должны быть доступны сразу)
        this.avatars = [
            'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/pudge.png',
            'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/invoker.png',
            'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/nevermore.png',
            'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/crystal_maiden.png',
            'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/queenofpain.png',
            'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/lion.png'
        ];
        
        console.log('🎮 Режим работы:', this.useFirebase ? '☁️ Firebase' : '💾 localStorage');
        
        this.initData();
        this.initUI();
    }

    createUsersProxy() {
        if (!this.useFirebase) {
            // Обычный объект для localStorage
            return JSON.parse(localStorage.getItem('dotaCardsUsers') || '{}');
        }
        
        // Прокси для Firebase - перехватывает обращения к this.users[this.currentUser]
        return new Proxy({}, {
            get: (target, prop) => {
                if (prop === this.currentUser) {
                    // Возвращаем текущие данные пользователя
                    return this.currentUserData;
                }
                // Для других пользователей возвращаем из кеша
                return this.allUsersCache[prop];
            },
            set: (target, prop, value) => {
                // Автоматически сохраняем в Firebase при изменении
                if (prop === this.currentUser && this.useFirebase) {
                    this.currentUserData = value;
                    // Сохранение будет через saveUser()
                }
                return true;
            }
        });
    }

    initData() {
        // Сбалансированные карты (общая сила ~100-120 для обычных, +20-30 за редкость)
        this.cards = {
            // Обычные карты (сила ~100-120)
            'Shadow Shaman': {
                name: 'Shadow Shaman',
                rarity: 'common',
                damage: 30,
                health: 80,
                defense: 15,
                speed: 18,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/shadow_shaman.png'
            },
            'Chen': {
                name: 'Chen',
                rarity: 'common',
                damage: 25,
                health: 90,
                defense: 20,
                speed: 15,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/chen.png'
            },
            'Lycan': {
                name: 'Lycan',
                rarity: 'common',
                damage: 35,
                health: 70,
                defense: 10,
                speed: 25,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/lycan.png'
            },
            // Редкие карты (сила ~130-150)
            'Lion': {
                name: 'Lion',
                rarity: 'rare',
                damage: 40,
                health: 85,
                defense: 18,
                speed: 22,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/lion.png'
            },
            'Sven': {
                name: 'Sven',
                rarity: 'rare',
                damage: 45,
                health: 100,
                defense: 15,
                speed: 18,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/sven.png'
            },
            'Queen Of Pain': {
                name: 'Queen Of Pain',
                rarity: 'rare',
                damage: 42,
                health: 80,
                defense: 12,
                speed: 30,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/queenofpain.png'
            },
            // Эпические карты (сила ~160-180)
            'Terrorblade': {
                name: 'Terrorblade',
                rarity: 'epic',
                damage: 55,
                health: 110,
                defense: 20,
                speed: 20,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/terrorblade.png'
            },
            'Crystal Maiden': {
                name: 'Crystal Maiden',
                rarity: 'epic',
                damage: 50,
                health: 100,
                defense: 25,
                speed: 18,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/crystal_maiden.png'
            },
            'Spirit Breaker': {
                name: 'Spirit Breaker',
                rarity: 'epic',
                damage: 60,
                health: 120,
                defense: 15,
                speed: 16,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/spirit_breaker.png'
            },
            // Легендарные карты (сила ~190-220)
            'Shadow Fiend': {
                name: 'Shadow Fiend',
                rarity: 'legendary',
                damage: 75,
                health: 130,
                defense: 22,
                speed: 26,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/nevermore.png'
            },
            'Pudge': {
                name: 'Pudge',
                rarity: 'legendary',
                damage: 65,
                health: 160,
                defense: 30,
                speed: 12,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/pudge.png'
            },
            'Invoker': {
                name: 'Invoker',
                rarity: 'legendary',
                damage: 70,
                health: 120,
                defense: 18,
                speed: 32,
                image: 'https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/invoker.png'
            }
        };

        // Улучшения
        this.upgrades = {
            'Moon Shard': { name: 'Moon Shard', effect: 'speed', value: 20, description: '+20 скорости' },
            'Divine Rapier': { name: 'Divine Rapier', effect: 'damage', value: 50, description: '+50 урона' },
            'Heart of Tarrasque': { name: 'Heart of Tarrasque', effect: 'health', value: 100, description: '+100 здоровья' },
            'Black King Bar': { name: 'Black King Bar', effect: 'defense', value: 20, description: '+20% защиты' }
        };

        // Кейсы
        this.cases = {
            normal: { name: 'Обычный кейс', cost: 100, currency: 'gold', rewards: {} },
            mega: { name: 'Мега бокс', cost: 10, currency: 'gems', rewards: {} },
            upgrades: { name: 'Улучшения', cost: 250, currency: 'gold', rewards: { upgrades: 1 } }
        };
    }

    initUI() {
        console.log('🔧 initUI() вызван - настраиваем интерфейс');
        this.applyTheme();
        this.setupEventListeners();
        this.checkAuth();
    }

    applyTheme() {
        document.body.classList.toggle('light-theme', this.currentTheme === 'light');
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('dotaCardsTheme', this.currentTheme);
        this.applyTheme();
        this.updateThemeButton();
        this.soundSystem.playSound('click');
    }

    updateThemeButton() {
        const button = document.getElementById('theme-toggle');
        button.textContent = this.currentTheme === 'dark' ? '🌙' : '☀️';
    }

    toggleSound() {
        const enabled = this.soundSystem.toggleSound();
        const button = document.getElementById('sound-toggle');
        button.textContent = enabled ? '🔊' : '🔇';
        if (enabled) {
            this.soundSystem.playSound('click');
        }
    }

    updateSoundButton() {
        const button = document.getElementById('sound-toggle');
        button.textContent = this.soundSystem.soundEnabled ? '🔊' : '🔇';
    }

    toggleMusic() {
        const enabled = this.soundSystem.toggleMusic();
        const button = document.getElementById('music-toggle');
        button.textContent = enabled ? '🎵' : '🔇';
    }

    updateMusicButton() {
        const button = document.getElementById('music-toggle');
        if (button) {
            button.textContent = this.soundSystem.musicEnabled ? '🎵' : '🔇';
        }
    }

    setupEventListeners() {
        console.log('🔧 setupEventListeners() вызван');
        
        // Запускаем музыку после первого клика пользователя
        let musicStarted = false;
        document.addEventListener('click', () => {
            if (!musicStarted) {
                musicStarted = true;
                this.soundSystem.startBackgroundMusic();
                console.log('Background music started after user interaction');
            }
        }, { once: true });
        
        // Добавляем whoosh только к кнопкам фильтров (категории)
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.soundSystem.playSound('whoosh', 0.5);
            }
        });

        // Навигация друзей
        document.querySelectorAll('.friends-nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchFriendsTab(btn.dataset.friendsTab));
        });

        // Поиск друзей
        document.getElementById('friend-search-btn').addEventListener('click', () => this.searchPlayers());
        document.getElementById('friend-search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchPlayers();
        });

        // Авторизация
        const loginBtn = document.getElementById('login-btn');
        const registerBtn = document.getElementById('register-btn');
        const logoutBtn = document.getElementById('logout-btn');
        
        if (loginBtn) {
            console.log('✅ Кнопка входа найдена, устанавливаем обработчик');
            loginBtn.addEventListener('click', async () => {
                console.log('🔵 Клик по кнопке входа!');
                try {
                    await this.login();
                } catch (error) {
                    console.error('Ошибка входа:', error);
                    alert('Ошибка входа: ' + error.message);
                }
            });
        } else {
            console.error('❌ Кнопка login-btn не найдена!');
        }
        
        if (registerBtn) {
            console.log('✅ Кнопка регистрации найдена, устанавливаем обработчик');
            registerBtn.addEventListener('click', async () => {
                console.log('🔵 Клик по кнопке регистрации!');
                try {
                    await this.register();
                } catch (error) {
                    console.error('Ошибка регистрации:', error);
                    alert('Ошибка регистрации: ' + error.message);
                }
            });
        } else {
            console.error('❌ Кнопка register-btn не найдена!');
        }
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await this.logout();
                } catch (error) {
                    console.error('Ошибка выхода:', error);
                    alert('Ошибка выхода: ' + error.message);
                }
            });
        }

        // Навигация
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Кейсы
        document.querySelectorAll('.buy-case').forEach(btn => {
            btn.addEventListener('click', (e) => this.buyCase(e.target.dataset.case));
        });
        
        document.querySelectorAll('.case-info-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.showCaseInfo(e.target.dataset.case));
        });
        
        document.getElementById('close-case-info-modal').addEventListener('click', () => this.closeCaseInfoModal());

        // Бои
        const botBtn = document.getElementById('bot-battle-btn');
        if (botBtn) {
            console.log('✅ Кнопка бота найдена');
            botBtn.addEventListener('click', () => {
                console.log('🔵 Клик на бой с ботом');
                this.startBotBattle();
            });
        }
        
        const onlineBtn = document.getElementById('online-battle-btn');
        if (onlineBtn) {
            console.log('✅ Кнопка онлайн-боя найдена');
            onlineBtn.addEventListener('click', () => {
                console.log('🔵 Клик на онлайн-бой');
                console.log('window.onlineBattlesSystem:', window.onlineBattlesSystem);
                if (window.onlineBattlesSystem) {
                    window.onlineBattlesSystem.openOnlineBattleModal();
                } else {
                    alert('Система онлайн-боёв загружается...');
                }
            });
        } else {
            console.error('❌ Кнопка онлайн-боя НЕ найдена!');
        }
        
        // Информация о режимах
        setTimeout(() => {
            document.querySelectorAll('.mode-info-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    this.showBattleInfo(btn.dataset.info);
                });
            });
        }, 500);

        // Промо-коды
        document.getElementById('use-code-btn').addEventListener('click', () => this.usePromoCode());

        // Переключение темы
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Переключение музыки
        const musicToggleBtn = document.getElementById('music-toggle');
        if (musicToggleBtn) {
            musicToggleBtn.addEventListener('click', () => this.toggleMusic());
            this.updateMusicButton();
        }

        // Переключение звука
        document.getElementById('sound-toggle').addEventListener('click', () => this.toggleSound());

        // Админ панель
        document.getElementById('close-admin').addEventListener('click', () => this.closeAdminPanel());
        document.getElementById('admin-search').addEventListener('input', (e) => this.searchUsers(e.target.value));

        // Профиль
        document.getElementById('change-avatar-btn').addEventListener('click', () => this.openAvatarModal());
        document.getElementById('close-avatar-modal').addEventListener('click', () => this.closeAvatarModal());
        document.getElementById('close-edit-modal').addEventListener('click', () => this.closeEditModal());
        document.getElementById('save-edit-btn').addEventListener('click', () => this.saveEdit());
        document.getElementById('upload-avatar-btn').addEventListener('click', () => document.getElementById('avatar-file-input').click());
        document.getElementById('avatar-file-input').addEventListener('change', (e) => this.handleAvatarUpload(e));
        
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openEditModal(e.target.dataset.field));
        });
    }

    handleAvatarUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Проверяем что это изображение
        if (!file.type.startsWith('image/')) {
            alert('Пожалуйста, выберите изображение!');
            return;
        }
        
        // Читаем файл как Data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const avatarUrl = e.target.result;
            this.selectAvatar(avatarUrl);
        };
        reader.readAsDataURL(file);
    }

    async generateUserId() {
        // Генерируем ID только из цифр (6 цифр по умолчанию)
        let id;
        const allUsers = await this.getAllUsers();
        do {
            id = Math.floor(100000 + Math.random() * 900000).toString();
        } while (Object.values(allUsers).some(u => u.userid === id || u.userId === id));
        return id;
    }

    generateRandomNickname() {
        const adjectives = [
            'Могучий', 'Тёмный', 'Светлый', 'Быстрый', 'Мудрый', 
            'Храбрый', 'Дикий', 'Хитрый', 'Древний', 'Легендарный',
            'Великий', 'Грозный', 'Таинственный', 'Призрачный', 'Вечный'
        ];
        const nouns = [
            'Воин', 'Маг', 'Охотник', 'Странник', 'Хранитель',
            'Герой', 'Лучник', 'Рыцарь', 'Ассасин', 'Чемпион',
            'Повелитель', 'Защитник', 'Завоеватель', 'Мститель', 'Страж'
        ];
        
        const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const num = Math.floor(Math.random() * 999) + 1;
        
        return `${adj}${noun}${num}`;
    }

    checkAuth() {
        const currentUser = localStorage.getItem('dotaCardsCurrentUser');
        if (currentUser && this.users[currentUser]) {
            this.currentUser = currentUser;
            this.showMainMenu();
        } else {
            this.showAuthScreen();
        }
    }

    showAuthScreen() {
        document.getElementById('auth-screen').classList.add('active');
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('battle-screen').classList.remove('active');
        document.getElementById('admin-panel').classList.remove('active');
    }

    showMainMenu() {
        // Проверяем сохраненный бой
        const battleRestored = this.loadBattleState();
        if (battleRestored) {
            console.log('✅ Бой восстановлен');
            return; // Не показываем главное меню, остаемся в бою
        }
        
        document.getElementById('auth-screen').classList.remove('active');
        document.getElementById('main-menu').classList.add('active');
        document.getElementById('battle-screen').classList.remove('active');
        document.getElementById('admin-panel').classList.remove('active');
        this.updateUserInfo();
        this.updateThemeButton();
        this.updateSoundButton();
        this.updateMusicButton();
        this.loadCards();
        this.loadUpgrades();
        this.loadDeck();
        this.loadProfile();
        
        // Проверяем админ права
        const user = this.getUser();
        if (user && user.isAdmin) {
            this.createAdminButton();
        }
        
        // Проверяем нужно ли показать обучение
        if (user && !user.tutorialCompleted) {
            console.log('🎓 Показываем обучение для нового игрока');
            setTimeout(() => this.startTutorial(), 500);
        }
    }

    async loadProfile() {
        const user = this.getUser();
        if (!user) return;
        
        // Инициализируем новые поля для старых пользователей
        if (!user.nickname) {
            user.nickname = this.generateRandomNickname();
            await this.saveUser({ nickname: user.nickname });
        }
        if (!user.userId && !user.userid) {
            user.userid = await this.generateUserId();
            await this.saveUser({ userid: user.userid });
        }
        if (!user.avatar) {
            user.avatar = this.avatars[0];
            await this.saveUser({ avatar: user.avatar });
        }
        
        // Обновляем UI
        document.getElementById('user-avatar').src = user.avatar;
        document.getElementById('display-nickname').textContent = user.nickname;
        document.getElementById('display-userid').textContent = user.userid || user.userId;
        document.getElementById('profile-level').textContent = user.level;
        document.getElementById('profile-gold').textContent = user.gold;
        document.getElementById('profile-gems').textContent = user.gems;
        
        // Считаем количество уникальных карт
        const cardCount = Object.keys(user.cards || {}).length;
        document.getElementById('profile-cards').textContent = cardCount;
    }

    openAvatarModal() {
        const modal = document.getElementById('avatar-modal');
        const grid = document.getElementById('avatar-grid');
        grid.innerHTML = '';
        
        this.avatars.forEach(avatarUrl => {
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'avatar-option';
            avatarDiv.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
            avatarDiv.addEventListener('click', () => this.selectAvatar(avatarUrl));
            grid.appendChild(avatarDiv);
        });
        
        modal.classList.add('active');
    }

    closeAvatarModal() {
        document.getElementById('avatar-modal').classList.remove('active');
    }

    async selectAvatar(avatarUrl) {
        await this.saveUser({ avatar: avatarUrl });
        this.loadProfile();
        this.closeAvatarModal();
    }

    openEditModal(field) {
        this.editingField = field;
        const modal = document.getElementById('edit-modal');
        const title = document.getElementById('edit-modal-title');
        const input = document.getElementById('edit-field-input');
        const user = this.getUser();
        
        if (field === 'nickname') {
            title.textContent = 'Изменить никнейм';
            input.value = user.nickname;
        } else if (field === 'userid') {
            title.textContent = 'Изменить ID';
            input.value = user.userId;
        }
        
        modal.classList.add('active');
    }

    closeEditModal() {
        document.getElementById('edit-modal').classList.remove('active');
    }

    async saveEdit() {
        const user = this.getUser();
        const input = document.getElementById('edit-field-input');
        const value = input.value.trim();
        
        if (!value) {
            alert('Поле не может быть пустым!');
            return;
        }
        
        const updates = {};
        
        if (this.editingField === 'nickname') {
            updates.nickname = value;
        } else if (this.editingField === 'userid') {
            // Проверяем что ID содержит только цифры
            if (!/^\d+$/.test(value)) {
                alert('ID должен содержать только цифры!');
                return;
            }
            
            if (value.length < 3 || value.length > 9) {
                alert('ID должен быть от 3 до 9 цифр!');
                return;
            }
            
            // Проверяем уникальность ID
            const allUsers = await this.getAllUsers();
            const idExists = Object.values(allUsers).some(u => {
                if (this.useFirebase) {
                    return u.userid === value && Object.keys(allUsers).find(k => allUsers[k] === u) !== this.currentUser;
                } else {
                    return u !== user && u.userid === value;
                }
            });
            
            if (idExists) {
                alert('Этот ID уже занят!');
                return;
            }
            
            updates.userid = value;
        }
        
        await this.saveUser(updates);
        this.loadProfile();
        this.closeEditModal();
    }

    showCaseInfo(caseType) {
        const modal = document.getElementById('case-info-modal');
        const content = document.getElementById('case-info-content');
        const title = document.getElementById('case-info-title');
        
        let infoHtml = '';
        
        if (caseType === 'normal') {
            title.textContent = 'Обычный кейс - Информация';
            infoHtml = `
                <div class="case-info-section">
                    <h3>Стоимость: 100 🪙</h3>
                    <div class="info-divider"></div>
                    <h4>Шансы выпадения карт:</h4>
                    <div class="chance-item">
                        <span class="rarity-label rarity-common">Обычная карта</span>
                        <span class="chance-value">50%</span>
                    </div>
                    <div class="chance-item">
                        <span class="rarity-label rarity-rare">Редкая карта</span>
                        <span class="chance-value">50%</span>
                    </div>
                    <div class="info-note">
                        ℹ️ Первые 3 кейса без дубликатов<br>
                        💰 Дубликат = возврат половины стоимости
                    </div>
                </div>
            `;
        } else if (caseType === 'mega') {
            title.textContent = 'Мега бокс - Информация';
            infoHtml = `
                <div class="case-info-section">
                    <h3>Стоимость: 10 💎</h3>
                    <div class="info-divider"></div>
                    <h4>Шансы выпадения карт:</h4>
                    <div class="chance-item">
                        <span class="rarity-label rarity-legendary">Легендарная карта</span>
                        <span class="chance-value">15%</span>
                    </div>
                    <div class="chance-item">
                        <span class="rarity-label rarity-epic">Эпическая карта</span>
                        <span class="chance-value">30%</span>
                    </div>
                    <div class="chance-item">
                        <span class="rarity-label rarity-rare">Редкая карта</span>
                        <span class="chance-value">55%</span>
                    </div>
                    <div class="info-note">
                        ⭐ Только редкие и выше<br>
                        💰 Дубликат = возврат половины стоимости (5 гемов)
                    </div>
                </div>
            `;
        } else if (caseType === 'upgrades') {
            title.textContent = 'Кейс улучшений - Информация';
            infoHtml = `
                <div class="case-info-section">
                    <h3>Стоимость: 250 🪙</h3>
                    <div class="info-divider"></div>
                    <h4>Шансы выпадения:</h4>
                    <div class="chance-item">
                        <span class="rarity-label">Случайное улучшение</span>
                        <span class="chance-value">60%</span>
                    </div>
                    <div class="chance-item chance-bad">
                        <span class="rarity-label">Ничего</span>
                        <span class="chance-value">40%</span>
                    </div>
                    <div class="info-divider"></div>
                    <h4>Доступные улучшения:</h4>
                    <div class="upgrade-list-info">
                        <div>🌙 Moon Shard (+20 скорости)</div>
                        <div>⚔️ Divine Rapier (+50 урона)</div>
                        <div>❤️ Heart of Tarrasque (+100 здоровья)</div>
                        <div>🛡️ Black King Bar (+20% защиты)</div>
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = infoHtml;
        modal.classList.add('active');
    }

    closeCaseInfoModal() {
        document.getElementById('case-info-modal').classList.remove('active');
    }

    async login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const loginBtn = document.getElementById('login-btn');

        if (!username || !password) {
            alert('Заполните все поля');
            return;
        }

        // Блокируем кнопку
        loginBtn.disabled = true;
        loginBtn.textContent = 'Вход...';
        
        console.log('🔵 Начинаем вход:', username);
        console.log('🔵 Используем Firebase:', this.useFirebase);

        try {
            if (this.useFirebase) {
                console.log('🔵 Вызываем firebaseAdapter.login...');
                // Firebase авторизация
                const result = await firebaseAdapter.login(username, password);
                console.log('🔵 Результат входа:', result);
            
            if (result.success) {
                this.currentUser = result.userId;
                this.currentUserData = result.userData;
                
                // Подписываемся на изменения данных в реальном времени
                firebaseAdapter.listenToUserData(result.userId, (data) => {
                    this.currentUserData = data;
                    this.updateUserInfo();
                });
                
                // Загружаем кеш пользователей для поиска друзей
                this.allUsersCache = await firebaseAdapter.getAllUsers();
                
                console.log('✅ Вход через Firebase:', username);
                this.showMainMenu();
            } else {
                alert(result.error || 'Неверные данные');
            }
        } else {
            // localStorage авторизация (старый метод)
        if (this.users[username] && this.users[username].password === password) {
            this.currentUser = username;
                this.currentUserData = this.users[username];
            localStorage.setItem('dotaCardsCurrentUser', username);
            this.showMainMenu();
        } else {
            alert('Неверные данные');
            }
        }
        } finally {
            // Разблокируем кнопку
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
        }
    }

    async register() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const registerBtn = document.getElementById('register-btn');

        if (!username || !password) {
            alert('Заполните все поля');
            return;
        }

        if (password.length < 6) {
            alert('Пароль должен быть минимум 6 символов');
            return;
        }

        // Блокируем кнопку
        registerBtn.disabled = true;
        registerBtn.textContent = 'Регистрация...';
        
        console.log('🔵 Начинаем регистрацию:', username);
        console.log('🔵 Используем Firebase:', this.useFirebase);

        try {
            if (this.useFirebase) {
                console.log('🔵 Вызываем firebaseAdapter.register...');
                // Firebase регистрация
                const result = await firebaseAdapter.register(username, password);
                console.log('🔵 Результат регистрации:', result);
            
            if (result.success) {
                this.currentUser = result.userId;
                this.currentUserData = result.userData;
                
                // Добавляем начальные данные
                const randomNickname = this.generateRandomNickname();
                const userid = await this.generateUserId();
                await firebaseAdapter.updateUserData(result.userId, {
                    username: username,
                    gold: 300,
                    gems: 5,
                    nickname: randomNickname,
                    userid: userid,
                    avatar: this.avatars[0],
                    clanInvites: [],
                    tutorialCompleted: false
                });
                
                // Перезагружаем данные
                this.currentUserData = await firebaseAdapter.getUserData(result.userId);
                
                // Подписываемся на изменения
                firebaseAdapter.listenToUserData(result.userId, (data) => {
                    this.currentUserData = data;
                    this.updateUserInfo();
                });
                
                // Загружаем кеш пользователей
                this.allUsersCache = await firebaseAdapter.getAllUsers();
                
                console.log('✅ Регистрация через Firebase:', username);
                alert('Регистрация успешна!');
                this.showMainMenu();
            } else {
                alert(result.error || 'Ошибка регистрации');
            }
        } else {
            // localStorage регистрация (старый метод)
        if (this.users[username]) {
            alert('Пользователь уже существует');
            return;
        }

        const userid = await this.generateUserId();
        const randomNickname = this.generateRandomNickname();

        this.users[username] = {
            username: username,
            password: password,
            gold: 300,
            gems: 5,
            level: 1,
            experience: 0,
            cards: {},
            upgrades: {},
            usedCodes: [],
            casesOpened: 0,
            normalCasesOpened: 0,
            deck: [],
            isAdmin: false,
            nickname: randomNickname,
            userid: userid,
            avatar: this.avatars[0],
            friends: [],
            friendRequests: { incoming: [], outgoing: [] },
            clanInvites: [],
            tutorialCompleted: false
        };

        localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        this.currentUser = username;
            this.currentUserData = this.users[username];
        localStorage.setItem('dotaCardsCurrentUser', username);
        this.showMainMenu();
        }
        } finally {
            // Разблокируем кнопку
            registerBtn.disabled = false;
            registerBtn.textContent = 'Регистрация';
        }
    }

    async logout() {
        if (this.useFirebase) {
            // Firebase выход
            firebaseAdapter.unlistenToUserData(this.currentUser);
            await firebaseAdapter.logout();
            console.log('✅ Выход из Firebase');
        } else {
            // localStorage выход
        localStorage.removeItem('dotaCardsCurrentUser');
        }
        
        this.currentUser = null;
        this.currentUserData = null;
        this.allUsersCache = {};
        this.showAuthScreen();
    }

    // ========== УНИВЕРСАЛЬНЫЕ МЕТОДЫ РАБОТЫ С ДАННЫМИ ==========

    getUser() {
        // Получить текущего пользователя
        if (this.useFirebase) {
            return this.currentUserData;
        } else {
            return this.users[this.currentUser];
        }
    }

    async saveUser(updates) {
        // Сохранить изменения пользователя
        if (this.useFirebase) {
            // Применяем изменения локально сразу для отзывчивости UI
            this.applyUpdatesToCurrentUser(updates);
            // Сохраняем в Firebase
            await firebaseAdapter.updateUserData(this.currentUser, updates);
            // currentUserData обновится через listener с сервера
        } else {
            // localStorage
            Object.assign(this.users[this.currentUser], updates);
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
            this.currentUserData = this.users[this.currentUser];
        }
    }
    
    applyUpdatesToCurrentUser(updates) {
        // Применяет обновления к currentUserData с поддержкой вложенных путей
        for (const [key, value] of Object.entries(updates)) {
            if (key.includes('/')) {
                // Обработка вложенных путей типа "cards/Pudge/count"
                const parts = key.split('/');
                let obj = this.currentUserData;
                for (let i = 0; i < parts.length - 1; i++) {
                    if (!obj[parts[i]]) obj[parts[i]] = {};
                    obj = obj[parts[i]];
                }
                obj[parts[parts.length - 1]] = value;
            } else {
                this.currentUserData[key] = value;
            }
        }
    }
    
    // Обёртка для синхронного сохранения (для совместимости со старым кодом)
    saveUserSync(updates) {
        if (this.useFirebase) {
            // Применяем локально сразу
            this.applyUpdatesToCurrentUser(updates);
            // Сохраняем в фоне
            firebaseAdapter.updateUserData(this.currentUser, updates).catch(err => {
                console.error('Ошибка сохранения:', err);
            });
        } else {
            Object.assign(this.users[this.currentUser], updates);
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        }
    }

    async getUserById(userId) {
        // Получить данные любого пользователя по ID
        if (this.useFirebase) {
            return this.allUsersCache[userId] || await firebaseAdapter.getUserData(userId);
        } else {
            return this.users[userId];
        }
    }

    async getAllUsers() {
        // Получить всех пользователей
        if (this.useFirebase) {
            if (Object.keys(this.allUsersCache).length === 0) {
                this.allUsersCache = await firebaseAdapter.getAllUsers();
            }
            return this.allUsersCache;
        } else {
            return this.users;
        }
    }

    async usePromoCode() {
        const code = document.getElementById('promo-code').value;
        if (!code) return;

        const user = this.getUser();
        
        if (user.usedCodes && user.usedCodes.includes(code)) {
            alert('Код уже использован');
            return;
        }

        const updates = {
            usedCodes: [...(user.usedCodes || []), code]
        };

        if (code === 'FREE50') {
            updates.gold = (user.gold || 0) + 50;
            updates.gems = (user.gems || 0) + 5;
            alert('Получено: 50 золота и 5 гемов!');
        } else if (code === 'ADMINPANEL666') {
            updates.isAdmin = true;
            this.createAdminButton();
            alert('Админ доступ получен!');
        } else {
            alert('Неверный код');
            return;
        }

        await this.saveUser(updates);
        this.updateUserInfo();
        document.getElementById('promo-code').value = '';
    }

    createAdminButton() {
        // Удаляем старую кнопку если есть
        const oldBtn = document.getElementById('admin-btn');
        if (oldBtn) oldBtn.remove();

        // Создаем новую кнопку
        const adminBtn = document.createElement('button');
        adminBtn.id = 'admin-btn';
        adminBtn.className = 'btn small admin-btn';
        adminBtn.textContent = '⚙️ Админ';
        adminBtn.addEventListener('click', () => this.showAdminPanel());
        
        const userInfo = document.querySelector('.user-info');
        userInfo.insertBefore(adminBtn, document.getElementById('logout-btn'));
    }

    async showAdminPanel() {
        // Проверка прав администратора по промокоду
        const user = this.getUser();
        
        if (!user.isAdmin) {
            alert('❌ Доступ запрещен!\n\nАдмин-панель доступна только после активации специального промокода.\n\n💡 Подсказка: промокод начинается с "ADMIN"');
            return;
        }
        
        const panel = document.getElementById('admin-panel');
        
        // Создаем эффектную анимацию появления
        const overlay = document.createElement('div');
        overlay.className = 'admin-overlay-animation';
        
        // Добавляем частицы
        for (let i = 0; i < 30; i++) {
            const particle = document.createElement('div');
            particle.className = 'admin-particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            overlay.appendChild(particle);
        }
        
        document.body.appendChild(overlay);
        
        setTimeout(() => overlay.classList.add('active'), 10);
        
        setTimeout(() => {
            panel.classList.add('active');
        this.loadUsersList();
        }, 600);
        
        setTimeout(() => {
            if (document.body.contains(overlay)) {
                document.body.removeChild(overlay);
            }
        }, 1000);
    }

    closeAdminPanel() {
        document.getElementById('admin-panel').classList.remove('active');
    }

    async loadUsersList(searchQuery = '') {
        const container = document.getElementById('users-container');
        container.innerHTML = '<div style="text-align: center; padding: 2rem;">Загрузка...</div>';

        // Обновляем аватар и ник админа
        const currentUser = this.getUser();
        if (currentUser) {
            document.getElementById('admin-avatar').src = currentUser.avatar || this.avatars[0];
            const displayText = `${currentUser.nickname || currentUser.username} • ${currentUser.userid || 'ID не задан'}`;
            document.getElementById('admin-user-name').textContent = displayText;
        }

        // Получаем всех пользователей
        const allUsers = await this.getAllUsers();
        container.innerHTML = '';

        // Фильтруем пользователей по поисковому запросу
        const filteredUsers = Object.entries(allUsers).filter(([userId, user]) => {
            if (!searchQuery) return true;
            
            const query = searchQuery.toLowerCase();
            const usernameMatch = (user.username || '').toLowerCase().includes(query);
            const idMatch = (user.userid || '').toLowerCase().includes(query);
            const nickMatch = (user.nickname || '').toLowerCase().includes(query);
            
            return usernameMatch || idMatch || nickMatch;
        });

        if (filteredUsers.length === 0) {
            container.innerHTML = '<div class="no-users-found">Пользователи не найдены</div>';
            return;
        }

        filteredUsers.forEach(([userId, user]) => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-item';
            userDiv.innerHTML = `
                <div class="user-info-admin">
                    <strong>${user.username || userId.substr(0,8)}</strong>
                    <div class="user-meta">
                        <span class="user-nick">👤 ${user.nickname || 'Не задан'}</span>
                        <span class="user-id">🆔 ${user.userid || 'Не задан'}</span>
                    </div>
                    <div>Уровень: ${user.level || 1} | Золото: ${user.gold || 0} | Гемы: ${user.gems || 0}</div>
                </div>
                <div class="user-controls">
                    <input type="number" placeholder="Золото" value="${user.gold || 0}" class="admin-input">
                    <input type="number" placeholder="Гемы" value="${user.gems || 0}" class="admin-input">
                    <button class="btn small admin-btn-update" onclick="gameData.updateUserBalance('${userId}', this)">💰 Обновить</button>
                    <button class="btn small admin-btn-reset" onclick="gameData.resetUserProgress('${userId}')">🔄 Сбросить</button>
                </div>
            `;
            container.appendChild(userDiv);
        });
    }

    async searchUsers(query) {
        await this.loadUsersList(query);
    }

    async updateUserBalance(userId, button) {
        const inputs = button.parentElement.querySelectorAll('.admin-input');
        const gold = parseInt(inputs[0].value) || 0;
        const gems = parseInt(inputs[1].value) || 0;
        
        if (this.useFirebase) {
            await firebaseAdapter.updateUserData(userId, { gold, gems });
        } else {
            this.users[userId].gold = gold;
            this.users[userId].gems = gems;
        localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        }
        
        await this.loadUsersList();
        alert(`✅ Баланс обновлен!`);
    }


    async resetUserProgress(userId) {
        const user = await this.getUserById(userId);
        const username = user.username || user.nickname || userId.substr(0, 8);
        
        if (confirm(`⚠️ СБРОС ПРОГРЕССА ${username}!\n\n• Уровень, карты, улучшения → 0\n• Использованные промокоды → очистятся\n\nСОХРАНЯТСЯ:\n✅ ID и аватар\n✅ Друзья и запросы\n\nПродолжить?`)) {
            const resetData = {
                gold: 300,
                gems: 5,
                level: 1,
                experience: 0,
                cards: {},
                upgrades: {},
                usedCodes: [],  // Очищаем промокоды - можно использовать снова
                casesOpened: 0,
                normalCasesOpened: 0,
                battlesPlayed: 0,
                battlesWon: 0,
                deck: []
                // НЕ трогаем: userid, avatar, friends, friendRequests, nickname, clan
            };
            
            // Применяем сброс к самому пользователю
            if (this.useFirebase) {
                await firebaseAdapter.updateUserData(userId, resetData);
            } else {
                Object.assign(this.users[userId], resetData);
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
            }
            
            await this.loadUsersList();
            alert(`✅ Прогресс ${username} сброшен!\n\n• Баланс: 300 🪙 + 5 💎\n• Промокоды можно применить снова\n• ID, аватар и друзья сохранены`);
        }
    }

    async updateUserInfo() {
        const user = this.getUser();
        if (!user) return;
        document.getElementById('gold-amount').textContent = user.gold || 0;
        document.getElementById('gems-amount').textContent = user.gems || 0;
        this.updateExperienceBar(user);
        
        // Обновляем отображение ника с тегом клана
        await this.updateNicknameWithClanTag(user);
    }
    
    async updateNicknameWithClanTag(user) {
        const nicknameElement = document.getElementById('display-nickname');
        if (!nicknameElement) return;
        
        let displayText = user.nickname || user.username;
        
        // Загружаем тег клана если есть
        if (user.clanId) {
            try {
                let clan;
                if (this.useFirebase) {
                    const snapshot = await firebase.database().ref(`clans/${user.clanId}`).once('value');
                    clan = snapshot.val();
                } else {
                    const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                    clan = clans[user.clanId];
                }
                
                if (clan && clan.tag) {
                    displayText = `[${clan.tag}] ${displayText}`;
                }
            } catch (error) {
                console.error('Ошибка загрузки тега клана:', error);
            }
        }
        
        nicknameElement.textContent = displayText;
    }

    updateExperienceBar(user) {
        const expNeeded = user.level <= 5 ? 30 : 30 + (Math.floor((user.level - 1) / 5) * 50);
        const currentExp = user.experience;
        const percentage = Math.min(100, (currentExp / expNeeded) * 100);
        
        document.getElementById('exp-fill').style.width = `${percentage}%`;
        document.getElementById('exp-text').textContent = `${currentExp}/${expNeeded}`;
        document.getElementById('exp-level-badge').textContent = user.level;
    }

    switchTab(tabName) {
        // Звук клика
        this.soundSystem.playSound('click');
        
        // Креативная анимация перехода
        this.animateTabTransition();
        
        // Удаляем активный класс со всех вкладок
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        
        // Если переключились на вкладку кланов - загружаем приглашения
        if (tabName === 'clans' && window.clansSystem) {
            setTimeout(() => {
                window.clansSystem.loadClanInvites();
            }, 100);
        }

        // Активируем выбранную вкладку
        document.getElementById(`${tabName}-tab`).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        
        // Настраиваем фильтры для вкладок с картами
        if (tabName === 'cards') {
            this.setupCardFilters('cards-tab');
        } else if (tabName === 'deck') {
            this.setupCardFilters('deck-tab', true);
        } else if (tabName === 'friends') {
            this.loadFriendsList();
        } else if (tabName === 'clans') {
            // Инициализация кланов
            if (window.clansSystem) {
                window.clansSystem.updateClanUI();
            }
        }
    }

    setupCardFilters(tabId, isDeck = false) {
        const tab = document.getElementById(tabId);
        const rarityBtns = tab.querySelectorAll('[data-rarity]');
        const starsBtns = tab.querySelectorAll('[data-stars]');
        
        let currentRarity = isDeck ? this.deckRarityFilter : 'all';
        let currentStars = isDeck ? this.deckStarsFilter : 'all';
        
        // Удаляем старые обработчики
        rarityBtns.forEach(btn => btn.replaceWith(btn.cloneNode(true)));
        starsBtns.forEach(btn => btn.replaceWith(btn.cloneNode(true)));
        
        // Настраиваем фильтры по редкости
        tab.querySelectorAll('[data-rarity]').forEach(btn => {
            // Убираем все активные классы
            btn.classList.remove('active');
            
            // Восстанавливаем активный фильтр
            if (isDeck && btn.dataset.rarity === this.deckRarityFilter) {
                btn.classList.add('active');
            } else if (!isDeck && btn.dataset.rarity === 'all') {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                tab.querySelectorAll('[data-rarity]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRarity = btn.dataset.rarity;
                
                if (isDeck) {
                    this.deckRarityFilter = currentRarity;
                    this.renderDeckAvailableCards(currentRarity, currentStars);
                } else {
                    this.loadCards(currentRarity, currentStars);
                }
            });
        });
        
        // Настраиваем фильтры по звездам
        tab.querySelectorAll('[data-stars]').forEach(btn => {
            // Убираем все активные классы
            btn.classList.remove('active');
            
            // Восстанавливаем активный фильтр
            if (isDeck && btn.dataset.stars === this.deckStarsFilter) {
                btn.classList.add('active');
            } else if (!isDeck && btn.dataset.stars === 'all') {
                btn.classList.add('active');
            }
            
            btn.addEventListener('click', () => {
                tab.querySelectorAll('[data-stars]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStars = btn.dataset.stars;
                
                if (isDeck) {
                    this.deckStarsFilter = currentStars;
                    this.renderDeckAvailableCards(currentRarity, currentStars);
                } else {
                    this.loadCards(currentRarity, currentStars);
                }
            });
        });
    }

    animateTabTransition() {
        // Создаем креативную анимацию с частицами
        this.createParticleTransition();
    }

    createParticleTransition() {
        // Создаем волновой эффект
        this.createWaveEffect();
        
        // Добавляем частицы
        setTimeout(() => {
            this.createFloatingParticles();
        }, 200);
    }

    createWaveEffect() {
        const wave = document.createElement('div');
        wave.className = 'wave-transition';
        wave.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${this.currentTheme === 'dark' ? 
                'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' : 
                'radial-gradient(circle, rgba(0,0,0,0.1) 0%, transparent 70%)'};
            z-index: 999;
            opacity: 0;
            transform: scale(0.8);
            transition: all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            pointer-events: none;
        `;
        
        document.body.appendChild(wave);
        
        // Анимация волны
        setTimeout(() => {
            wave.style.opacity = '1';
            wave.style.transform = 'scale(1)';
        }, 10);
        
        setTimeout(() => {
            wave.style.opacity = '0';
            wave.style.transform = 'scale(1.2)';
        }, 300);
        
        setTimeout(() => {
            if (document.body.contains(wave)) {
                document.body.removeChild(wave);
            }
        }, 900);
    }

    createFloatingParticles() {
        const colors = this.currentTheme === 'dark' ? 
            ['#fff', '#ccc', '#999'] : 
            ['#000', '#333', '#666'];
        
        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            const color = colors[Math.floor(Math.random() * colors.length)];
            const size = Math.random() * 6 + 3;
            const startX = Math.random() * window.innerWidth;
            const startY = window.innerHeight + 50;
            const endX = startX + (Math.random() - 0.5) * 200;
            const endY = -50;
            
            particle.style.cssText = `
                position: fixed;
                width: ${size}px;
                height: ${size}px;
                background: ${color};
                border-radius: 50%;
                left: ${startX}px;
                top: ${startY}px;
                z-index: 1000;
                opacity: 0.8;
                box-shadow: 0 0 15px ${color}40;
                pointer-events: none;
                transition: all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            `;
            
            document.body.appendChild(particle);
            
            // Анимация движения
            setTimeout(() => {
                particle.style.left = `${endX}px`;
                particle.style.top = `${endY}px`;
                particle.style.opacity = '0';
                particle.style.transform = 'scale(0.5) rotate(180deg)';
            }, 50);
            
            // Удаление
            setTimeout(() => {
                if (document.body.contains(particle)) {
                    document.body.removeChild(particle);
                }
            }, 1300);
        }
    }

    animateThemeTransition() {
        const transition = document.createElement('div');
        transition.className = 'theme-transition';
        document.body.appendChild(transition);

        // Показываем анимацию
        setTimeout(() => {
            transition.classList.add('active');
        }, 10);

        // Убираем анимацию
        setTimeout(() => {
            transition.classList.remove('active');
        }, 300);

        // Удаляем элемент
        setTimeout(() => {
            if (document.body.contains(transition)) {
                document.body.removeChild(transition);
            }
        }, 900);
    }

    loadCards(rarityFilter = 'all', starsFilter = 'all') {
        const container = document.getElementById('cards-grid');
        container.innerHTML = '';

        const user = this.getUser();
        const userCards = user.cards || {};

        Object.keys(this.cards).forEach(cardName => {
            const card = this.cards[cardName];
            const userCard = userCards[cardName] || { count: 0, upgrades: [] };
            
            // Фильтруем по редкости
            if (rarityFilter !== 'all' && card.rarity !== rarityFilter) {
                return;
            }
            
            // Фильтруем по количеству звезд
            const upgradeCount = userCard.upgrades ? userCard.upgrades.length : 0;
            if (starsFilter !== 'all' && upgradeCount !== parseInt(starsFilter)) {
                return;
            }
            
            if (userCard.count > 0) {
                const cardDiv = document.createElement('div');
                cardDiv.className = `card rarity-border-${card.rarity}`;
                const starsHtml = Array(3).fill(0).map((_, i) => 
                    `<span class="star ${i < upgradeCount ? 'filled' : ''}">★</span>`
                ).join('');
                
                cardDiv.innerHTML = `
                    <div class="card-image" style="background-image: url('${card.image}'); background-size: cover; background-position: center; width: 100%; height: 80px; border-radius: 10px; margin-bottom: 10px;"></div>
                    <div class="card-rarity rarity-${card.rarity}">${this.getRarityName(card.rarity)}</div>
                    <div class="card-stars">${starsHtml}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-stats">
                        <div>⚔️ ${card.damage + this.getUpgradeBonus(userCard.upgrades, 'damage')}</div>
                        <div>❤️ ${card.health + this.getUpgradeBonus(userCard.upgrades, 'health')}</div>
                        <div>🛡️ ${card.defense + this.getUpgradeBonus(userCard.upgrades, 'defense')}%</div>
                        <div>⚡ ${card.speed + this.getUpgradeBonus(userCard.upgrades, 'speed')}</div>
                    </div>
                    <div class="card-count">x${userCard.count}</div>
                `;
                container.appendChild(cardDiv);
            }
        });
    }

    loadDeck() {
        const user = this.getUser();
        if (!user.deck) user.deck = [];
        
        this.renderDeckSlots();
        // Используем сохраненные фильтры
        this.renderDeckAvailableCards(this.deckRarityFilter, this.deckStarsFilter);
    }

    renderDeckSlots() {
        const container = document.getElementById('deck-slots');
        container.innerHTML = '';
        const user = this.getUser();
        const deck = user.deck || [];
        
        // Создаем 3 слота
        for (let i = 0; i < 3; i++) {
            const slot = document.createElement('div');
            slot.className = 'deck-slot';
            
            if (deck[i]) {
                const card = this.cards[deck[i]];
                const userCard = user.cards[deck[i]];
                const upgradeCount = userCard.upgrades ? userCard.upgrades.length : 0;
                const starsHtml = Array(3).fill(0).map((_, idx) => 
                    `<span class="star ${idx < upgradeCount ? 'filled' : ''}">★</span>`
                ).join('');
                
                slot.classList.add('filled');
                slot.innerHTML = `
                    <div class="deck-card rarity-border-${card.rarity}">
                        <div class="card-image" style="background-image: url('${card.image}'); background-size: cover; background-position: center; width: 100%; height: 80px; border-radius: 10px; margin-bottom: 5px;"></div>
                        <div class="card-stars">${starsHtml}</div>
                        <div class="card-name">${card.name}</div>
                        <div class="card-stats-mini">
                            <span>⚔️${card.damage}</span>
                            <span>❤️${card.health}</span>
                            <span>🛡️${card.defense}%</span>
                            <span>⚡${card.speed}</span>
                        </div>
                        <button class="remove-from-deck-btn" data-index="${i}">✕</button>
                    </div>
                `;
            } else {
                slot.innerHTML = '<div class="deck-slot-empty">Пустой слот</div>';
            }
            
            container.appendChild(slot);
        }
        
        // Обработчики удаления
        container.querySelectorAll('.remove-from-deck-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                this.removeFromDeck(index);
            });
        });
    }

    renderDeckAvailableCards(rarityFilter = 'all', starsFilter = 'all') {
        const container = document.getElementById('deck-available-cards');
        container.innerHTML = '';
        const user = this.getUser();
        const userCards = user.cards || {};
        const deck = user.deck || [];
        
        Object.keys(this.cards).forEach(cardName => {
            const card = this.cards[cardName];
            const userCard = userCards[cardName] || { count: 0, upgrades: [] };
            
            // Фильтруем по редкости
            if (rarityFilter !== 'all' && card.rarity !== rarityFilter) {
                return;
            }
            
            // Фильтруем по количеству звезд
            const upgradeCount = userCard.upgrades ? userCard.upgrades.length : 0;
            if (starsFilter !== 'all' && upgradeCount !== parseInt(starsFilter)) {
                return;
            }
            
            // Показываем только карты которые есть у игрока
            if (userCard.count > 0) {
                const cardDiv = document.createElement('div');
                cardDiv.className = `card rarity-border-${card.rarity} deck-card-item`;
                
                // Проверяем, есть ли карта в колоде
                const inDeck = deck.includes(cardName);
                if (inDeck) {
                    cardDiv.classList.add('in-deck');
                }
                
                const upgradeCount = userCard.upgrades ? userCard.upgrades.length : 0;
                const starsHtml = Array(3).fill(0).map((_, idx) => 
                    `<span class="star ${idx < upgradeCount ? 'filled' : ''}">★</span>`
                ).join('');
                
                cardDiv.innerHTML = `
                    <div class="card-image" style="background-image: url('${card.image}'); background-size: cover; background-position: center; width: 100%; height: 80px; border-radius: 10px; margin-bottom: 10px;"></div>
                    <div class="card-rarity rarity-${card.rarity}">${this.getRarityName(card.rarity)}</div>
                    <div class="card-stars">${starsHtml}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-stats">
                        <div>⚔️ ${card.damage}</div>
                        <div>❤️ ${card.health}</div>
                        <div>🛡️ ${card.defense}%</div>
                        <div>⚡ ${card.speed}</div>
                    </div>
                    ${inDeck ? '<div class="in-deck-badge">В колоде</div>' : `<button class="add-to-deck-btn" data-card="${cardName}">Добавить</button>`}
                `;
                
                container.appendChild(cardDiv);
            }
        });
        
        // Обработчики добавления
        container.querySelectorAll('.add-to-deck-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardName = e.target.dataset.card;
                this.addToDeck(cardName);
            });
        });
    }

    async addToDeck(cardName) {
        const user = this.getUser();
        const deck = user.deck || [];
        
        if (deck.length >= 3) {
            alert('Колода заполнена! Максимум 3 карты.');
            return;
        }
        
        if (deck.includes(cardName)) {
            alert('Эта карта уже в колоде!');
            return;
        }
        
        await this.saveUser({ deck: [...deck, cardName] });
        this.loadDeck();
    }

    async removeFromDeck(index) {
        const user = this.getUser();
        const deck = [...(user.deck || [])];
        deck.splice(index, 1);
        
        await this.saveUser({ deck });
        this.loadDeck();
    }

    getRarityName(rarity) {
        const names = {
            common: 'Обычная',
            rare: 'Редкая',
            epic: 'Эпическая',
            legendary: 'Легендарная'
        };
        return names[rarity] || rarity;
    }

    getUpgradeBonus(upgrades, stat) {
        let bonus = 0;
        if (upgrades && Array.isArray(upgrades)) {
        upgrades.forEach(upgradeName => {
            const upgrade = this.upgrades[upgradeName];
            if (upgrade && upgrade.effect === stat) {
                bonus += upgrade.value;
            }
        });
        }
        return bonus;
    }

    loadUpgrades() {
        const user = this.getUser();
        if (!user) return;
        
        const userUpgrades = user.upgrades || {};

        this.selectedUpgrade = null;
        this.renderUpgrades();
        this.renderCardsForUpgrade();
    }

    renderUpgrades() {
        const container = document.getElementById('upgrades-container');
        container.innerHTML = '';
        const user = this.getUser();
        if (!user) return;
        
        const userUpgrades = user.upgrades || {};
        
        Object.keys(this.upgrades).forEach(upgradeName => {
            const upgrade = this.upgrades[upgradeName];
            const count = userUpgrades[upgradeName] || 0;
            
            const upgradeDiv = document.createElement('div');
            upgradeDiv.className = `upgrade-item ${this.selectedUpgrade === upgradeName ? 'selected' : ''}`;
            upgradeDiv.innerHTML = `
                <h3>${upgrade.name}</h3>
                <p>${upgrade.description}</p>
                <div class="upgrade-count-badge">${count}</div>
                ${count > 0 ? `<button class="select-upgrade-btn" data-upgrade="${upgradeName}">Выбрать</button>` : '<div class="no-upgrades">Нет в наличии</div>'}
            `;
            container.appendChild(upgradeDiv);
        });
        
        // Обработчики выбора улучшения
        container.querySelectorAll('.select-upgrade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const upgradeName = e.target.dataset.upgrade;
                this.selectUpgrade(upgradeName);
            });
        });
    }

    selectUpgrade(upgradeName) {
        this.selectedUpgrade = upgradeName;
        this.renderUpgrades();
        this.renderCardsForUpgrade();
    }

    renderCardsForUpgrade() {
        const container = document.getElementById('upgrade-cards-grid');
        container.innerHTML = '';
        
        if (!this.selectedUpgrade) {
            container.innerHTML = '<div class="no-selection">Сначала выберите улучшение слева</div>';
            return;
        }
        
        const user = this.getUser();
        const userCards = user.cards || {};
        
        Object.keys(this.cards).forEach(cardName => {
            const card = this.cards[cardName];
            const userCard = userCards[cardName] || { count: 0, upgrades: [] };
            
            if (userCard.count > 0) {
                const cardDiv = document.createElement('div');
                cardDiv.className = `card rarity-border-${card.rarity}`;
                
                // Проверяем сколько улучшений уже применено (максимум 3)
                const upgradeCount = userCard.upgrades ? userCard.upgrades.length : 0;
                const canUpgrade = upgradeCount < 3;
                const starsHtml = Array(3).fill(0).map((_, idx) => 
                    `<span class="star ${idx < upgradeCount ? 'filled' : ''}">★</span>`
                ).join('');
                
                cardDiv.innerHTML = `
                    <div class="card-image" style="background-image: url('${card.image}'); background-size: cover; background-position: center; width: 100%; height: 80px; border-radius: 10px; margin-bottom: 10px;"></div>
                    <div class="card-rarity rarity-${card.rarity}">${this.getRarityName(card.rarity)}</div>
                    <div class="card-stars">${starsHtml}</div>
                    <div class="card-name">${card.name}</div>
                    <div class="card-stats">
                        <div>⚔️ ${card.damage + this.getUpgradeBonus(userCard.upgrades, 'damage')}</div>
                        <div>❤️ ${card.health + this.getUpgradeBonus(userCard.upgrades, 'health')}</div>
                        <div>🛡️ ${card.defense + this.getUpgradeBonus(userCard.upgrades, 'defense')}%</div>
                        <div>⚡ ${card.speed + this.getUpgradeBonus(userCard.upgrades, 'speed')}</div>
                    </div>
                    ${canUpgrade ? `<button class="apply-upgrade-btn" data-card="${cardName}">Применить улучшение</button>` : '<div class="max-upgrades">Макс. улучшений</div>'}
                `;
                container.appendChild(cardDiv);
            }
        });
        
        // Обработчики применения улучшений
        container.querySelectorAll('.apply-upgrade-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const cardName = e.target.dataset.card;
                this.applyUpgrade(cardName);
            });
        });
    }

    async applyUpgrade(cardName) {
        const user = this.getUser();
        if (!user) {
            alert('❌ Пользователь не найден!');
            return;
        }
        
        if (!user.cards || !user.cards[cardName]) {
            alert('❌ Карта не найдена!');
            return;
        }
        
        if (!this.selectedUpgrade) {
            alert('❌ Выберите улучшение!');
            return;
        }
        
        const userUpgrades = user.upgrades || {};
        const upgradeCount = userUpgrades[this.selectedUpgrade] || 0;
        
        if (upgradeCount <= 0) {
            alert('У вас нет этого улучшения!');
            return;
        }
        
        const userCard = user.cards[cardName];
        if (!userCard.upgrades) userCard.upgrades = [];
        
        if (userCard.upgrades.length >= 3) {
            alert('На карту можно применить максимум 3 улучшения!');
            return;
        }
        
        // Применяем улучшение
        const newCardUpgrades = [...userCard.upgrades, this.selectedUpgrade];
        const newUpgradeCount = upgradeCount - 1;
        
        // Создаем копию всех улучшений
        const allUpgrades = { ...userUpgrades };
        allUpgrades[this.selectedUpgrade] = newUpgradeCount;
        
        const updates = {
            [`cards/${cardName}/upgrades`]: newCardUpgrades,
            upgrades: allUpgrades
        };
        
        await this.saveUser(updates);
        
        // Звук улучшения
        this.soundSystem.playSound('upgrade');
        
        alert(`Улучшение ${this.selectedUpgrade} применено к ${cardName}!`);
        
        this.loadUpgrades();
        this.loadCards();
    }

    async buyCase(caseType) {
        try {
            const user = this.getUser();
            if (!user) {
                alert('❌ Пользователь не найден!');
                return;
            }
            
            const caseData = this.cases[caseType];
            if (!caseData) {
                alert('❌ Кейс не найден!');
                return;
            }
            
            if (caseData.currency === 'gold' && user.gold < caseData.cost) {
                alert('Недостаточно золота');
                return;
            }
            
            if (caseData.currency === 'gems' && user.gems < caseData.cost) {
                alert('Недостаточно гемов');
                return;
            }

            // Звук открытия кейса
            this.soundSystem.playSound('openCase');

            const updates = {};

            // Списываем валюту
            if (caseData.currency === 'gold') {
                updates.gold = user.gold - caseData.cost;
            } else {
                updates.gems = user.gems - caseData.cost;
            }

            // Даем улучшения с анимацией (кейс "upgrades")
            if (caseType === 'upgrades') {
                // 40% шанс что ничего не выпадет
                const dropChance = Math.random();
                
                if (dropChance < 0.4) {
                    // Ничего не выпало - только списываем валюту
                    await this.saveUser(updates);
                    this.showNothingDropAnimation();
                    this.updateUserInfo();
                    return;
                }
                
                // Выпало улучшение (60% шанс)
                console.log('🎁 Начинаем выдачу улучшения');
                console.log('📦 Доступные улучшения:', this.upgrades);
                
                const upgradeNames = Object.keys(this.upgrades);
                console.log('📋 Список имен улучшений:', upgradeNames);
                
                if (upgradeNames.length === 0) {
                    console.error('❌ Нет доступных улучшений!');
                    await this.saveUser(updates);
                    this.updateUserInfo();
                    return;
                }
                
                const randomUpgrade = upgradeNames[Math.floor(Math.random() * upgradeNames.length)];
                console.log('🎲 Выбрано улучшение:', randomUpgrade);
                
                const upgradeData = this.upgrades[randomUpgrade];
                console.log('📊 Данные улучшения:', upgradeData);
                
                if (!upgradeData) {
                    console.error('❌ Улучшение не найдено:', randomUpgrade);
                    await this.saveUser(updates);
                    this.updateUserInfo();
                    return;
                }
                
                // Создаем копию улучшений или пустой объект
                const currentUpgrades = user.upgrades ? { ...user.upgrades } : {};
                currentUpgrades[randomUpgrade] = (currentUpgrades[randomUpgrade] || 0) + 1;
                updates.upgrades = currentUpgrades;
                
                console.log('💾 Сохраняем улучшения:', updates.upgrades);
                
                await this.saveUser(updates);
                this.updateUserInfo();
                
                console.log('🎬 Вызываем анимацию с данными:', { upgradeName: randomUpgrade, upgradeData });
                
                // Показываем анимацию выпадения улучшения
                this.showUpgradeDropAnimation(randomUpgrade, upgradeData);
                
                // Обновляем список улучшений после закрытия анимации (не сразу)
                setTimeout(() => {
                    this.loadUpgrades();
                }, 500);
                
                return;
            }

            // Даем карты с анимацией (кейсы normal и mega)
            if (caseType === 'normal' || caseType === 'mega') {
                const cardResult = await this.giveRandomCard(user, caseType);
                updates.casesOpened = (user.casesOpened || 0) + 1;
                
                // Сохраняем изменения
                await this.saveUser(updates);
                
                // Показываем анимацию выпадения карты
                this.showCardDropAnimation(cardResult, caseData);

                this.updateUserInfo();
                this.loadCards();
                this.loadUpgrades();
            }
        } catch (error) {
            console.error('❌ Ошибка в buyCase:', error);
            alert(`❌ Ошибка при открытии кейса: ${error.message}`);
        }
    }

    showNothingDropAnimation() {
        // Создаем оверлей для анимации
        const overlay = document.createElement('div');
        overlay.className = 'card-drop-overlay';
        
        overlay.innerHTML = `
            <div class="card-drop-container">
                <div class="nothing-drop-animation">
                    <div class="nothing-icon">💨</div>
                    <div class="nothing-message">
                        <div class="nothing-title">НЕ ПОВЕЗЛО!</div>
                        <div class="nothing-desc">В этот раз ничего не выпало</div>
                        <div class="nothing-hint">Попробуйте еще раз!</div>
                    </div>
                    <button class="btn primary close-drop-btn">Закрыть</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Анимация появления
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // Обработчик закрытия
        overlay.querySelector('.close-drop-btn').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                // Обновляем интерфейс после закрытия
                this.updateUserInfo();
            }, 300);
        });
    }

    showUpgradeDropAnimation(upgradeName, upgradeData) {
        // Проверяем что данные улучшения переданы
        if (!upgradeData) {
            console.error('❌ upgradeData не передан!', upgradeName);
            // Получаем данные из this.upgrades
            upgradeData = this.upgrades[upgradeName];
            
            if (!upgradeData) {
                console.error('❌ Улучшение не найдено в this.upgrades:', upgradeName);
                alert('Ошибка: данные улучшения не найдены');
                return;
            }
        }
        
        // Создаем оверлей для анимации
        const overlay = document.createElement('div');
        overlay.className = 'card-drop-overlay';
        
        // Иконки для улучшений
        const upgradeIcons = {
            'Moon Shard': '🌙',
            'Divine Rapier': '⚔️',
            'Heart of Tarrasque': '❤️',
            'Black King Bar': '🛡️'
        };
        
        const icon = upgradeIcons[upgradeName] || '✨';
        
        // Безопасное получение данных
        const description = upgradeData.description || 'Улучшение';
        const effect = upgradeData.effect || '';
        const value = upgradeData.value || 0;
        
        overlay.innerHTML = `
            <div class="card-drop-container">
                <div class="upgrade-drop-animation">
                    <div class="upgrade-icon-large">${icon}</div>
                    <div class="dropped-upgrade">
                        <div class="upgrade-glow"></div>
                        <div class="upgrade-name-big">${upgradeName}</div>
                        <div class="upgrade-desc">${description}</div>
                        <div class="upgrade-effect-badge">
                            ${effect === 'damage' ? '⚔️ Урон' : ''}
                            ${effect === 'health' ? '❤️ Здоровье' : ''}
                            ${effect === 'defense' ? '🛡️ Защита' : ''}
                            ${effect === 'speed' ? '⚡ Скорость' : ''}
                            +${value}
                        </div>
                    </div>
                    <button class="btn primary close-drop-btn">Закрыть</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Анимация появления
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // Обработчик закрытия
        overlay.querySelector('.close-drop-btn').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                // Обновляем интерфейс после закрытия
                this.updateUserInfo();
                this.loadUpgrades();
            }, 300);
        });
    }

    showCardDropAnimation(cardResult, caseData) {
        // Создаем оверлей для анимации
        const overlay = document.createElement('div');
        overlay.className = 'card-drop-overlay';
        
        // Определяем нужны ли искры (для epic и legendary)
        const needsSparks = cardResult.card.rarity === 'epic' || cardResult.card.rarity === 'legendary';
        const sparksColor = cardResult.card.rarity === 'epic' ? '#a335ee' : '#ff8000';
        
        overlay.innerHTML = `
            <div class="card-drop-container">
                <div class="card-drop-animation">
                    ${cardResult.isDuplicate ? 
                        `<div class="duplicate-badge">ДУБЛИКАТ!</div>
                         <div class="duplicate-reward">+${Math.floor(caseData.cost / 2)} ${caseData.currency === 'gold' ? '🪙' : '💎'}</div>` 
                        : ''}
                    <div class="dropped-card rarity-border-${cardResult.card.rarity}">
                        <div class="card-glow"></div>
                        ${needsSparks ? this.generateSparks(sparksColor) : ''}
                        <div class="card-image" style="background-image: url('${cardResult.card.image}'); background-size: cover; background-position: center; width: 100%; height: 150px; border-radius: 10px; margin-bottom: 10px;"></div>
                        <div class="card-rarity rarity-${cardResult.card.rarity}">${this.getRarityName(cardResult.card.rarity)}</div>
                        <div class="card-name">${cardResult.card.name}</div>
                        <div class="card-stats">
                            <div>⚔️ ${cardResult.card.damage}</div>
                            <div>❤️ ${cardResult.card.health}</div>
                            <div>🛡️ ${cardResult.card.defense}%</div>
                            <div>⚡ ${cardResult.card.speed}</div>
                        </div>
                    </div>
                    <button class="btn primary close-drop-btn">Закрыть</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Анимация появления
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // Обработчик закрытия
        overlay.querySelector('.close-drop-btn').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
                // Обновляем интерфейс после закрытия
                this.updateUserInfo();
                this.loadCards();
                this.loadDeck();
            }, 300);
        });
    }

    generateSparks(color) {
        let sparksHTML = '<div class="sparks-container">';
        for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * 360;
            const delay = Math.random() * 0.5;
            sparksHTML += `<div class="spark" style="--angle: ${angle}deg; --delay: ${delay}s; background: ${color};"></div>`;
        }
        sparksHTML += '</div>';
        return sparksHTML;
    }

    async giveRandomCard(user, caseType) {
        const userCards = user.cards || {};
        
        // Инициализация casesOpened если нет
        if (!user.casesOpened) user.casesOpened = 0;
        if (!user.normalCasesOpened) user.normalCasesOpened = 0;
        
        let selectedCardName;
        let isDuplicate = false;
        let availableCardPool = [];
        
        // Определяем пул карт в зависимости от типа кейса
        if (caseType === 'normal') {
            // Обычный кейс - только обычные и редкие
            availableCardPool = Object.keys(this.cards).filter(name => {
                const card = this.cards[name];
                return card.rarity === 'common' || card.rarity === 'rare';
            });
            
            // Первые 3 ОБЫЧНЫХ кейса - без дубликатов
            if (user.normalCasesOpened < 3) {
                // Получаем карты которых еще нет из доступного пула
                const newCards = availableCardPool.filter(name => !userCards[name] || userCards[name].count === 0);
                
                if (newCards.length > 0) {
                    selectedCardName = newCards[Math.floor(Math.random() * newCards.length)];
                } else {
                    // Если все карты из пула уже есть
                    selectedCardName = availableCardPool[Math.floor(Math.random() * availableCardPool.length)];
                    isDuplicate = true;
                }
                user.normalCasesOpened++;
            } else {
                // После 3 кейсов - обычная механика с дубликатами
                selectedCardName = availableCardPool[Math.floor(Math.random() * availableCardPool.length)];
                
                // Проверяем, является ли это дубликатом
                if (userCards[selectedCardName] && userCards[selectedCardName].count > 0) {
                    isDuplicate = true;
                    
                    // Даем половину стоимости кейса вместо дубликата
                    const caseData = this.cases[caseType];
                    const refund = Math.floor(caseData.cost / 2);
                    await this.saveUser({ gold: user.gold + refund });
                }
                
                await this.saveUser({ normalCasesOpened: user.normalCasesOpened + 1 });
            }
        } else if (caseType === 'mega') {
            // Мега бокс - редкие, эпические и легендарные с шансами
            // БЕЗ защиты от дубликатов
            const rand = Math.random();
            
            if (rand < 0.15) {
                // 15% шанс легендарной
                availableCardPool = Object.keys(this.cards).filter(name => 
                    this.cards[name].rarity === 'legendary'
                );
            } else if (rand < 0.45) {
                // 30% шанс эпической
                availableCardPool = Object.keys(this.cards).filter(name => 
                    this.cards[name].rarity === 'epic'
                );
            } else {
                // 55% шанс редкой
                availableCardPool = Object.keys(this.cards).filter(name => 
                    this.cards[name].rarity === 'rare'
                );
            }
            
            selectedCardName = availableCardPool[Math.floor(Math.random() * availableCardPool.length)];
            
            // Проверяем, является ли это дубликатом
            if (userCards[selectedCardName] && userCards[selectedCardName].count > 0) {
                isDuplicate = true;
                
                // Даем половину стоимости кейса вместо дубликата
                const caseData = this.cases[caseType];
                const refund = Math.floor(caseData.cost / 2);
                await this.saveUser({ gems: user.gems + refund });
            }
        }
        
        // Если не дубликат - добавляем карту
        if (!isDuplicate) {
            const currentCard = userCards[selectedCardName] || { count: 0, upgrades: [] };
            await this.saveUser({
                [`cards/${selectedCardName}/count`]: currentCard.count + 1,
                [`cards/${selectedCardName}/upgrades`]: currentCard.upgrades || []
            });
        }
        
        return {
            card: this.cards[selectedCardName],
            cardName: selectedCardName,
            isDuplicate: isDuplicate
        };
    }

    startBotBattle() {
        console.log('=== startBotBattle called ===');
        
        try {
        const user = this.getUser();
        const userCards = user.cards || {};
            const deck = user.deck || [];
            
            console.log('User deck:', deck);
            console.log('User cards:', Object.keys(userCards));
            
            // Проверяем наличие колоды
            if (deck.length === 0) {
                alert('Сначала соберите колоду во вкладке "Колода"!');
            return;
        }

            // Создаем колоду игрока из выбранных карт
        const playerDeck = [];
            deck.forEach(cardName => {
                console.log('Processing card:', cardName);
                console.log('Card exists in userCards:', !!userCards[cardName]);
                console.log('Card exists in this.cards:', !!this.cards[cardName]);
                
                if (userCards[cardName] && userCards[cardName].count > 0) {
                    try {
                        const battleCard = this.createBattleCard(cardName, userCards[cardName]);
                        playerDeck.push(battleCard);
                        console.log('Card added to deck:', cardName);
                    } catch (error) {
                        console.error('Error creating battle card:', cardName, error);
                        alert(`Ошибка с картой "${cardName}": ${error.message}\n\nПопробуйте очистить колоду и собрать заново.`);
                    }
                }
            });

            console.log('Player deck created:', playerDeck.length, 'cards');

            if (playerDeck.length === 0) {
                alert('У вас нет карт из вашей колоды!');
                return;
            }

            // Инициализируем счетчик боёв если его нет
            if (!user.battlesPlayed) user.battlesPlayed = 0;
            
            // Создаем колоду бота (без дубликатов)
            const botDeck = this.createBotDeck(playerDeck);
            
            console.log('Bot deck created:', botDeck.length, 'cards');
            console.log('Starting battle...');

            this.startBattle(playerDeck, botDeck);
        } catch (error) {
            console.error('Error starting battle:', error);
            alert('Ошибка при запуске боя: ' + error.message);
        }
    }

    createBattleCard(cardName, userCard) {
        const card = this.cards[cardName];
        
        if (!card) {
            console.error('Card not found:', cardName);
            console.log('Available cards:', Object.keys(this.cards));
            throw new Error(`Карта "${cardName}" не найдена в базе данных`);
        }
        
        const upgrades = userCard.upgrades || [];
        
        return {
            name: card.name,
            damage: card.damage + this.getUpgradeBonus(upgrades, 'damage'),
            health: card.health + this.getUpgradeBonus(upgrades, 'health'),
            maxHealth: card.health + this.getUpgradeBonus(upgrades, 'health'),
            defense: card.defense + this.getUpgradeBonus(upgrades, 'defense'),
            speed: card.speed + this.getUpgradeBonus(upgrades, 'speed'),
            image: card.image,
            rarity: card.rarity,
            upgrades: upgrades,
            isDead: false
        };
    }

    generateBotName() {
        const botNames = [
            'Destroyer', 'Slayer', 'Hunter', 'Killer', 'Warrior',
            'Shadow', 'Phantom', 'Demon', 'Beast', 'Dragon',
            'Thunder', 'Storm', 'Chaos', 'Blade', 'Reaper',
            'Viper', 'Raven', 'Wolf', 'Tiger', 'Falcon',
            'Scorpion', 'Cobra', 'Hawk', 'Eagle', 'Panther',
            'Samurai', 'Ninja', 'Ronin', 'Shogun', 'Daimyo',
            'Knight', 'Paladin', 'Crusader', 'Champion', 'Gladiator',
            'Titan', 'Colossus', 'Behemoth', 'Leviathan', 'Kraken'
        ];
        
        const randomName = botNames[Math.floor(Math.random() * botNames.length)];
        const randomNumber = Math.floor(Math.random() * 9999) + 1;
        
        return `БОТ ${randomName}${randomNumber}`;
    }

    createBotDeck(playerDeck = []) {
        console.log('Creating bot deck...');
        console.log('Available upgrades:', Object.keys(this.upgrades));
        
        const user = this.getUser();
        const isFirstBattle = !user.battlesPlayed || user.battlesPlayed === 0;
        
        console.log('Is first battle:', isFirstBattle);
        
        const allCards = Object.keys(this.cards);
        const botDeck = [];
        const usedCards = new Set();
        
        // Добавляем карты игрока в использованные, чтобы бот их не взял
        playerDeck.forEach(card => usedCards.add(card.name));
        
        // Выбираем 3 уникальные карты для бота
        while (botDeck.length < 3 && usedCards.size < allCards.length) {
            const randomCard = allCards[Math.floor(Math.random() * allCards.length)];
            
            if (!usedCards.has(randomCard)) {
                usedCards.add(randomCard);
            const card = this.cards[randomCard];
            
                // Проверяем что карта существует
                if (!card) {
                    console.error('Bot card not found:', randomCard);
                    continue; // Пропускаем эту карту
                }
            
                // Создаем карту бота
                const botCard = {
                name: card.name,
                    damage: card.damage,
                    health: card.health,
                    maxHealth: card.health,
                    defense: card.defense,
                    speed: card.speed,
                image: card.image,
                    rarity: card.rarity,
                    upgrades: [],
                isDead: false
                };
                
                // Если первый бой - делаем бота очень слабым (100% победа игрока)
                if (isFirstBattle) {
                    console.log('First battle - making bot weak');
                    botCard.damage = Math.floor(botCard.damage * 0.3);
                    botCard.health = Math.floor(botCard.health * 0.3);
                    botCard.maxHealth = Math.floor(botCard.maxHealth * 0.3);
                    botCard.defense = Math.floor(botCard.defense * 0.5);
                } else {
                    // После первого боя бот усиливается для ~50% шанса победы
                    console.log('Regular battle - making bot strong');
                    
                    // Случайный множитель силы от 1.5 до 2.2 для баланса
                    const strengthMultiplier = 1.5 + Math.random() * 0.7;
                    
                    botCard.damage = Math.floor(botCard.damage * strengthMultiplier);
                    botCard.health = Math.floor(botCard.health * strengthMultiplier);
                    botCard.maxHealth = Math.floor(botCard.maxHealth * strengthMultiplier);
                    botCard.defense = Math.min(80, Math.floor(botCard.defense * (1 + Math.random() * 0.5))); // до 80% защиты
                    
                    // Добавляем случайные улучшения боту (4-7 штук)
                    const upgradesCount = 4 + Math.floor(Math.random() * 4); // 4, 5, 6 или 7
                    const availableUpgrades = Object.keys(this.upgrades);
                    
                    console.log(`Adding ${upgradesCount} upgrades to bot`);
                    
                    // Проверяем что есть доступные улучшения
                    if (availableUpgrades.length === 0) {
                        console.warn('No upgrades available for bot');
                    }
                    
                    for (let i = 0; i < upgradesCount && availableUpgrades.length > 0; i++) {
                        const randomUpgrade = availableUpgrades[Math.floor(Math.random() * availableUpgrades.length)];
                        
                        // Применяем бонусы улучшения
                        const upgrade = this.upgrades[randomUpgrade];
                        
                        // Проверяем что улучшение существует
                        if (!upgrade || !upgrade.bonus) {
                            console.error('Invalid upgrade:', randomUpgrade);
                            continue;
                        }
                        
                        botCard.upgrades.push(randomUpgrade);
                        
                        if (upgrade.bonus.damage) botCard.damage += upgrade.bonus.damage;
                        if (upgrade.bonus.health) {
                            botCard.health += upgrade.bonus.health;
                            botCard.maxHealth += upgrade.bonus.health;
                        }
                        if (upgrade.bonus.defense) botCard.defense = Math.min(80, botCard.defense + upgrade.bonus.defense);
                        if (upgrade.bonus.speed) botCard.speed += upgrade.bonus.speed;
                    }
                    
                    console.log(`Bot card ${botCard.name}: DMG ${botCard.damage}, HP ${botCard.health}, DEF ${botCard.defense}%, SPD ${botCard.speed}`);
                }
                
                botDeck.push(botCard);
            }
        }
        
        return botDeck;
    }

    startBattle(playerDeck, botDeck) {
        console.log('=== startBattle called ===');
        console.log('Player deck:', playerDeck);
        console.log('Bot deck:', botDeck);
        
        try {
            // Увеличиваем счетчик боёв
            const user = this.getUser();
            if (!user.battlesPlayed) user.battlesPlayed = 0;
            const newBattlesPlayed = user.battlesPlayed + 1;
            this.saveUserSync({ battlesPlayed: newBattlesPlayed });
            
        document.getElementById('main-menu').classList.remove('active');
        document.getElementById('battle-screen').classList.add('active');

        // Генерируем случайное имя для бота
        const botName = this.generateBotName();

        this.battleState = {
            playerDeck,
            botDeck,
            turn: 0,
            round: 1,
            isPlayerTurn: true,
            playerName: user.nickname || user.username,
            botName: botName,
            inProgress: true,
            lastPlayerCard: null,  // Карта которой ходил игрок в прошлом раунде
            lastBotCard: null       // Карта которой ходил бот в прошлом раунде
        };

            console.log('Battle state set, rendering battle...');

            // Сохраняем состояние боя чтобы нельзя было выйти обновлением
            this.saveBattleState();

            // Музыка продолжает играть без прерывания

        this.renderBattle();
            console.log('Battle rendered, starting interactive battle...');
        this.startInteractiveBattle();
        } catch (error) {
            console.error('Error in startBattle:', error);
            alert('Ошибка в бою: ' + error.message);
        }
    }

    saveBattleState() {
        if (this.battleState) {
            localStorage.setItem('currentBattle', JSON.stringify(this.battleState));
        }
    }

    loadBattleState() {
        const saved = localStorage.getItem('currentBattle');
        if (saved) {
            try {
                this.battleState = JSON.parse(saved);
                if (this.battleState && this.battleState.inProgress) {
                    console.log('🔄 Восстанавливаем бой...');
                    document.getElementById('main-menu').classList.remove('active');
                    document.getElementById('battle-screen').classList.add('active');
                    this.renderBattle();
                    this.startInteractiveBattle();
                    return true;
                }
            } catch (e) {
                console.error('Ошибка загрузки боя:', e);
                localStorage.removeItem('currentBattle');
            }
        }
        return false;
    }

    clearBattleState() {
        localStorage.removeItem('currentBattle');
        if (this.battleState) {
            this.battleState.inProgress = false;
        }
    }

    updateRoundDisplay() {
        const roundEl = document.querySelector('.battle-info h3');
        if (roundEl && this.battleState) {
            roundEl.textContent = `Раунд ${this.battleState.round}`;
        }
    }

    renderBattle() {
        // Обновляем имена игроков
        this.updateBattleNames();
        
        // Обновляем номер раунда
        this.updateRoundDisplay();
        
        this.renderDeck('player-cards', this.battleState.playerDeck, true);
        this.renderDeck('enemy-cards', this.battleState.botDeck, false);
    }

    updateBattleNames() {
        const playerLabel = document.querySelector('.player-battle-side .side-label');
        const enemyLabel = document.querySelector('.enemy-battle-side .side-label');
        
        if (playerLabel) {
            playerLabel.textContent = this.battleState.playerName;
        }
        
        if (enemyLabel) {
            enemyLabel.textContent = this.battleState.botName;
        }
    }

    renderDeck(containerId, deck, isPlayer) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';

        deck.forEach((card, index) => {
            // Проверяем что карта валидна
            if (!card || !card.name || card.damage === undefined) {
                console.error('Invalid card in deck:', card);
                return;
            }
            
            const cardDiv = document.createElement('div');
            const healthPercentage = Math.max(0, (card.health / card.maxHealth) * 100);
            const isDead = card.isDead || card.health <= 0;
            const upgradeCount = card.upgrades ? card.upgrades.length : 0;
            
            // Генерируем звезды для улучшений (всегда показываем все 3)
            const starsHtml = `<div class="battle-card-stars">
                ${Array(3).fill(0).map((_, i) => 
                    `<span class="star ${i < upgradeCount ? 'filled' : 'empty'}">★</span>`
                ).join('')}
            </div>`;
            
            cardDiv.className = `battle-card-new rarity-border-${card.rarity} ${isDead ? 'dead' : ''}`;
            cardDiv.dataset.cardName = card.name;
            cardDiv.innerHTML = `
                <div class="battle-card-image" style="background-image: url('${card.image}')"></div>
                <div class="battle-card-info">
                    <div class="battle-card-name">${card.name}</div>
                    ${starsHtml}
                    <div class="battle-card-stats">
                        <div class="stat-mini"><span class="stat-icon">⚔️</span>${card.damage}</div>
                        <div class="stat-mini"><span class="stat-icon">❤️</span>${card.maxHealth}</div>
                        <div class="stat-mini"><span class="stat-icon">🛡️</span>${card.defense}%</div>
                        <div class="stat-mini"><span class="stat-icon">⚡</span>${card.speed}</div>
                </div>
                    <div class="battle-health-bar">
                        <div class="battle-health-fill" style="width: ${healthPercentage}%"></div>
                        <div class="battle-health-text">${Math.max(0, Math.floor(card.health))}/${card.maxHealth}</div>
                </div>
                </div>
                ${isDead ? '<div class="battle-dead-overlay"><div class="skull">💀</div></div>' : ''}
            `;
            container.appendChild(cardDiv);
        });
    }

    startInteractiveBattle() {
        this.battleTurn = 0;
        this.currentPlayerAttacker = 0; // Индекс текущей атакующей карты игрока
        this.isPlayerTurn = true;
        this.battleEnded = false;
        this.selectedEnemyCard = null;
        
        // Обновляем счетчик раундов
        document.getElementById('battle-round-num').textContent = 1;
        
        // Добавляем обработчики кликов на карты
        this.setupBattleCardListeners();
        
        // Начинаем ход игрока
        this.startPlayerTurn();
    }

    setupBattleCardListeners() {
        // Обработчики только для карт противника (целей)
        document.querySelectorAll('.enemy-battle-side .battle-card-new').forEach(card => {
            card.addEventListener('click', () => {
                if (!this.isPlayerTurn || this.battleEnded) return;
                
                const cardName = card.getAttribute('data-card-name');
                const cardData = this.battleState.botDeck.find(c => c.name === cardName);
                
                if (cardData && !cardData.isDead && cardData.health > 0) {
                    this.selectTarget(cardData);
                }
            });
        });
    }

    startPlayerTurn() {
        if (this.battleEnded) return;
        
        this.isPlayerTurn = true;
        this.selectedEnemyCard = null;
        
        // Получаем живые карты игрока
        const alivePlayerCards = this.battleState.playerDeck.filter(card => !card.isDead && card.health > 0);
        
        // Фильтруем карты - убираем ту которой ходили в прошлом раунде
        const availableCards = alivePlayerCards.filter(card => {
            return !this.battleState.lastPlayerCard || card.name !== this.battleState.lastPlayerCard.name;
        });
        
        // Если нет доступных карт (все отдыхают) - снимаем ограничение
        const cardsToChoose = availableCards.length > 0 ? availableCards : alivePlayerCards;
        
        if (cardsToChoose.length === 0) {
            // Все карты мертвы - конец боя
            this.checkBattleEnd();
            return;
        }
        
        // Убираем все подсветки
        document.querySelectorAll('.battle-card-new').forEach(c => {
            c.classList.remove('selected', 'target-available', 'hint-glow', 'used-last-round');
        });
        
        // Помечаем карты которые не могут атаковать
        if (this.battleState.lastPlayerCard) {
            const usedCardElement = document.querySelector(`.player-battle-side .battle-card-new[data-card-name="${this.battleState.lastPlayerCard.name}"]`);
            if (usedCardElement && availableCards.length > 0) {
                usedCardElement.classList.add('used-last-round');
            }
        }
        
        // Показываем выбор карты игроку
        this.showCardSelection(cardsToChoose);
    }
    
    showCardSelection(availableCards) {
        // Показываем подсказку
        this.showBattleHint('Выберите карту для атаки');
        
        // Подсвечиваем доступные карты игрока
        availableCards.forEach(card => {
            const cardElement = document.querySelector(`.player-battle-side .battle-card-new[data-card-name="${card.name}"]`);
            if (cardElement) {
                cardElement.classList.add('hint-glow');
                cardElement.style.pointerEvents = 'auto';
                cardElement.style.cursor = 'pointer';
                
                // Добавляем обработчик выбора карты
                cardElement.onclick = () => {
                    this.selectPlayerAttacker(card);
                };
            }
        });
    }
    
    selectPlayerAttacker(selectedCard) {
        // Запоминаем выбранную карту
        this.currentAttacker = selectedCard;
        
        // Убираем подсветку с карт игрока
        document.querySelectorAll('.player-battle-side .battle-card-new').forEach(c => {
            c.classList.remove('hint-glow');
            c.style.pointerEvents = 'none';
            c.onclick = null;
        });
        
        // Подсвечиваем выбранную карту
        const attackerElement = document.querySelector(`.player-battle-side .battle-card-new[data-card-name="${selectedCard.name}"]`);
        if (attackerElement) {
            attackerElement.classList.add('selected');
        }
        
        // Показываем цели
        this.showTargetSelection(selectedCard);
    }
    
    showTargetSelection(attackerCard) {
        // Подсвечиваем доступные цели
        const aliveEnemyCards = this.battleState.botDeck.filter(card => !card.isDead && card.health > 0);
        
        // Показываем подсказку с учетом количества атак
        const attacksCount = Math.max(1, Math.floor(attackerCard.speed / 10));
        const attackText = attacksCount > 1 ? ` (${attacksCount} атаки)` : '';
        this.showBattleHint(`${attackerCard.name}${attackText} атакует! Выберите цель.`);
        
        aliveEnemyCards.forEach(enemyCard => {
            const enemyElement = document.querySelector(`.enemy-battle-side .battle-card-new[data-card-name="${enemyCard.name}"]`);
            if (enemyElement) {
                enemyElement.classList.add('target-available');
            }
        });
    }

    // СТАРАЯ ФУНКЦИЯ - больше не используется, удалить можно
    selectNextPlayerCard_OLD() {
        if (this.battleEnded) return;
        
        // Если все атаки игрока выполнены - переходим к ходу бота
        if (this.currentPlayerAttacker >= this.playerAttacks.length) {
            this.startBotTurn();
            return;
        }
        
        // Получаем текущую атакующую карту
        const currentAttacker = this.playerAttacks[this.currentPlayerAttacker];
        
        // Проверяем что карта ещё жива
        if (currentAttacker.isDead || currentAttacker.health <= 0) {
            this.currentPlayerAttacker++;
            this.selectNextPlayerCard();
            return;
        }
        
        // Убираем предыдущие подсветки
        document.querySelectorAll('.battle-card-new').forEach(c => {
            c.classList.remove('selected', 'target-available', 'hint-glow');
        });
        
        // Подсвечиваем текущую атакующую карту
        const attackerElement = document.querySelector(`.player-battle-side .battle-card-new[data-card-name="${currentAttacker.name}"]`);
        if (attackerElement) {
            attackerElement.classList.add('hint-glow');
        }
        
        // Показываем подсказку
        this.showBattleHint(`${currentAttacker.name} атакует! Выберите цель.`);
        
        // Подсвечиваем доступные цели
        const aliveEnemyCards = this.battleState.botDeck.filter(card => !card.isDead && card.health > 0);
        aliveEnemyCards.forEach(enemyCard => {
            const enemyElement = document.querySelector(`.enemy-battle-side .battle-card-new[data-card-name="${enemyCard.name}"]`);
            if (enemyElement) {
                enemyElement.classList.add('target-available');
            }
        });
    }

    selectTarget(targetCard) {
        if (!this.currentAttacker) return;
        
        // Звук выбора цели
        this.soundSystem.playSound('whoosh', 0.5);
        
        // Убираем подсветку целей
        document.querySelectorAll('.battle-card-new').forEach(c => {
            c.classList.remove('target-available', 'hint-glow', 'selected');
        });
        
        // Убираем подсказку
        this.hideBattleHint();
        
        // Выполняем все атаки выбранной картой с учетом скорости
        const attacksCount = Math.max(1, Math.floor(this.currentAttacker.speed / 10));
        
        this.performMultipleAttacks(this.currentAttacker, targetCard, attacksCount);
    }
    
    performMultipleAttacks(attacker, initialTarget, attacksCount) {
        let attackIndex = 0;
        let currentTarget = initialTarget;
        
        const performNextAttack = () => {
            if (attackIndex >= attacksCount) {
                // Все атаки выполнены
                // Сохраняем карту которой ходили
                this.battleState.lastPlayerCard = { name: attacker.name };
                
                // Сохраняем состояние боя
                this.saveBattleState();
                
                // Переходим к ходу бота
                setTimeout(() => {
                    if (!this.checkBattleEnd()) {
                        this.startBotTurn();
                    }
                }, 1000);
                return;
            }
            
            // Проверяем что цель еще жива, если нет - выбираем другую
            if (currentTarget.isDead || currentTarget.health <= 0) {
                const aliveEnemies = this.battleState.botDeck.filter(c => !c.isDead && c.health > 0);
                if (aliveEnemies.length === 0) {
                    // Все враги мертвы
                    this.checkBattleEnd();
                    return;
                }
                currentTarget = aliveEnemies[0]; // Выбираем первого живого
            }
            
            // Выполняем атаку
            this.performAttack(attacker, currentTarget, false);
            
            attackIndex++;
            
            // Следующая атака через 1 секунду
            setTimeout(() => {
                if (!this.checkBattleEnd()) {
                    performNextAttack();
                }
            }, 1000);
        };
        
        performNextAttack();
    }

    startBotTurn() {
        if (this.battleEnded) return;
        
        this.isPlayerTurn = false;
        
        // Показываем подсказку
        this.showBattleHint('Ход противника...');
        
        // Убираем все подсветки
        document.querySelectorAll('.battle-card-new').forEach(c => {
            c.classList.remove('selected', 'target-available', 'hint-glow', 'used-last-round');
        });
        
        // Помечаем карту которой ходили в прошлом раунде
        if (this.battleState.lastBotCard) {
            const usedCardElement = document.querySelector(`.enemy-battle-side .battle-card-new[data-card-name="${this.battleState.lastBotCard.name}"]`);
            if (usedCardElement) {
                usedCardElement.classList.add('used-last-round');
            }
        }
        
        // Выполняем атаку бота
        setTimeout(() => {
            this.performBotAttack();
        }, 500);
    }

    performBotAttack() {
        const alivePlayerCards = this.battleState.playerDeck.filter(card => !card.isDead && card.health > 0);
        const aliveBotCards = this.battleState.botDeck.filter(card => !card.isDead && card.health > 0);
        
        if (aliveBotCards.length === 0 || alivePlayerCards.length === 0) {
            this.checkBattleEnd();
            return;
        }
        
        // Выбираем карту для атаки (не ту которой ходили в прошлом раунде)
        let availableBotCards = aliveBotCards.filter(card => {
            return !this.battleState.lastBotCard || card.name !== this.battleState.lastBotCard.name;
        });
        
        // Если нет доступных карт (все отдыхают) - снимаем ограничение
        if (availableBotCards.length === 0) {
            availableBotCards = aliveBotCards;
        }
        
        // Выбираем случайную карту
        const attackerCard = availableBotCards[Math.floor(Math.random() * availableBotCards.length)];
        
        // Выбираем случайную цель
        const targetCard = alivePlayerCards[Math.floor(Math.random() * alivePlayerCards.length)];
        
        // Количество атак зависит от скорости
        const attacksCount = Math.max(1, Math.floor(attackerCard.speed / 10));
        
        // Выполняем все атаки выбранной картой
        this.performBotMultipleAttacks(attackerCard, targetCard, attacksCount);
    }
    
    performBotMultipleAttacks(attacker, initialTarget, attacksCount) {
        let attackIndex = 0;
        let currentTarget = initialTarget;
        
        const performNextAttack = () => {
            if (this.battleEnded) return;
            
            if (attackIndex >= attacksCount) {
                // Все атаки выполнены
                // Сохраняем карту которой ходили
                this.battleState.lastBotCard = { name: attacker.name };
                
                // Увеличиваем раунд после хода бота
                if (this.battleState) {
                    this.battleState.round++;
                    this.updateRoundDisplay();
                    this.saveBattleState();
                }
                
                // Возвращаем ход игроку
                setTimeout(() => {
                    if (!this.checkBattleEnd()) {
                        this.startPlayerTurn();
                    }
                }, 500);
                return;
            }
            
            const currentAlivePlayerCards = this.battleState.playerDeck.filter(card => !card.isDead && card.health > 0);
            
            if (currentAlivePlayerCards.length === 0) {
                this.checkBattleEnd();
                return;
            }
            
            // Проверяем что цель еще жива, если нет - выбираем другую
            if (currentTarget.isDead || currentTarget.health <= 0) {
                currentTarget = currentAlivePlayerCards[Math.floor(Math.random() * currentAlivePlayerCards.length)];
            }
            
            // Выполняем атаку
            this.performAttack(attacker, currentTarget, true);
            
            attackIndex++;
            
            // Следующая атака через 1.2 секунды
            setTimeout(() => {
                if (!this.checkBattleEnd()) {
                    performNextAttack();
                }
            }, 1200);
        };
        
        performNextAttack();
    }

    showBattleHint(text) {
        let hintElement = document.querySelector('.battle-hint');
        
        if (!hintElement) {
            hintElement = document.createElement('div');
            hintElement.className = 'battle-hint';
            document.querySelector('.battle-arena').appendChild(hintElement);
        }
        
        hintElement.textContent = text;
        hintElement.classList.add('active');
    }

    hideBattleHint() {
        const hintElement = document.querySelector('.battle-hint');
        if (hintElement) {
            hintElement.classList.remove('active');
        }
    }

    checkBattleEnd() {
        if (this.battleEnded) return true;
        
        const { playerDeck, botDeck } = this.battleState;
        
        const alivePlayerCards = playerDeck.filter(card => !card.isDead && card.health > 0);
        const aliveBotCards = botDeck.filter(card => !card.isDead && card.health > 0);
        
        console.log('Checking battle end:', { alivePlayerCards: alivePlayerCards.length, aliveBotCards: aliveBotCards.length });
        
        if (alivePlayerCards.length === 0) {
            this.battleEnded = true;
            console.log('Player lost - showing defeat screen');
            setTimeout(() => {
            this.endBattle(false);
            }, 1000);
            return true;
        }
        
        if (aliveBotCards.length === 0) {
            this.battleEnded = true;
            console.log('Player won - showing victory screen');
            setTimeout(() => {
            this.endBattle(true);
            }, 1000);
            return true;
        }
        
        return false;
    }

    performAttack(attacker, target, isEnemyAttacking = false) {
        if (attacker.isDead || target.isDead) return;

        // Рассчитываем урон
        let damage = attacker.damage;
        let isBlocked = false;
        let isCrit = false;
        
        // Критический удар (15% шанс)
        if (Math.random() < 0.15) {
            damage = Math.floor(damage * 1.5);
            isCrit = true;
            this.soundSystem.playSound('critAttack');
        } else {
            this.soundSystem.playSound('attack');
        }
        
        // Проверяем защиту
        if (Math.random() * 100 < target.defense) {
            damage = Math.floor(damage * 0.3); // Защита снижает урон на 70%
            isBlocked = true;
        } else {
            this.soundSystem.playSound('damage');
        }

        const oldHealth = target.health;
        target.health = Math.max(0, target.health - damage);
        
        // Проверяем смерть
        const justDied = target.health <= 0 && !target.isDead;
        if (justDied) {
            target.isDead = true;
            this.createDeathEffect();
            this.soundSystem.playSound('death');
            
            // Проверяем, не закончился ли бой
            setTimeout(() => {
                this.checkBattleEnd();
            }, 500);
        }

        // Добавляем визуальные эффекты
        this.addAttackEffect(attacker, target, damage, isBlocked, isCrit, isEnemyAttacking);
    }

    createDeathEffect() {
        // Красное свечение при смерти
        const flash = document.createElement('div');
        flash.className = 'death-flash';
        document.body.appendChild(flash);
        
        setTimeout(() => flash.classList.add('active'), 10);
        
        setTimeout(() => {
            flash.classList.remove('active');
            setTimeout(() => {
                if (document.body.contains(flash)) {
                    document.body.removeChild(flash);
                }
            }, 500);
        }, 300);
    }

    addAttackEffect(attacker, target, damage, isBlocked, isCrit, isEnemyAttacking) {
        // Находим элементы карт на поле боя
        const attackerElement = document.querySelector(`.battle-card-new[data-card-name="${attacker.name}"]`);
        const targetElement = document.querySelector(`.battle-card-new[data-card-name="${target.name}"]`);
        
        if (!attackerElement || !targetElement) return;
        
        // Анимация атакующей карты
        attackerElement.classList.add('battle-attacking');
        setTimeout(() => attackerElement.classList.remove('battle-attacking'), 600);
        
        // Создаем линию атаки
        this.createAttackLine(attackerElement, targetElement, isCrit);
        
        // Анимация получения урона
        setTimeout(() => {
            targetElement.classList.add('battle-taking-damage');
            setTimeout(() => targetElement.classList.remove('battle-taking-damage'), 500);
            
            // Добавляем хитмаркер
            this.createHitMarker(targetElement, damage, isBlocked, isCrit);
            
            // Обновляем ТОЛЬКО здоровье целевой карты без перерисовки всех
            this.updateCardHealth(targetElement, target);
        }, 300);
    }

    updateCardHealth(cardElement, cardData) {
        const healthBar = cardElement.querySelector('.battle-health-fill');
        const healthText = cardElement.querySelector('.battle-health-text');
        
        if (healthBar && healthText) {
            const healthPercentage = Math.max(0, (cardData.health / cardData.maxHealth) * 100);
            healthBar.style.width = `${healthPercentage}%`;
            healthText.textContent = `${Math.max(0, Math.floor(cardData.health))}/${cardData.maxHealth}`;
        }
        
        // Проверяем смерть
        if (cardData.health <= 0 && !cardElement.classList.contains('dead')) {
            cardElement.classList.add('dead');
            
            // Добавляем оверлей смерти если его еще нет
            if (!cardElement.querySelector('.battle-dead-overlay')) {
                const deathOverlay = document.createElement('div');
                deathOverlay.className = 'battle-dead-overlay';
                deathOverlay.innerHTML = '<div class="skull">💀</div>';
                cardElement.appendChild(deathOverlay);
            }
        }
    }

    createAttackLine(fromElement, toElement, isCrit) {
        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        
        const fromX = fromRect.left + fromRect.width / 2;
        const fromY = fromRect.top + fromRect.height / 2;
        const toX = toRect.left + toRect.width / 2;
        const toY = toRect.top + toRect.height / 2;
        
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        // Вычисляем промежуточную точку для изогнутой траектории
        const midX = (fromX + toX) / 2;
        const midY = (fromY + toY) / 2;
        // Смещение вверх для дуги
        const arcHeight = -80;
        const controlX = midX;
        const controlY = midY + arcHeight;
        
        // Создаем меч
        const sword = document.createElement('div');
        sword.className = `flying-sword ${isCrit ? 'critical' : ''}`;
        sword.innerHTML = '⚔️';
        sword.style.left = fromX + 'px';
        sword.style.top = fromY + 'px';
        sword.style.setProperty('--from-x', fromX + 'px');
        sword.style.setProperty('--from-y', fromY + 'px');
        sword.style.setProperty('--control-x', controlX + 'px');
        sword.style.setProperty('--control-y', controlY + 'px');
        sword.style.setProperty('--to-x', toX + 'px');
        sword.style.setProperty('--to-y', toY + 'px');
        sword.style.transform = `rotate(${angle}rad)`;
        
        document.body.appendChild(sword);
        
        // Анимация полета меча по дуге
        setTimeout(() => {
            sword.classList.add('flying');
        }, 10);
        
        // Удаляем элементы
        setTimeout(() => {
            if (document.body.contains(sword)) {
                document.body.removeChild(sword);
            }
        }, 600);
    }

    createHitMarker(element, damage, isBlocked, isCrit) {
        const hitMarker = document.createElement('div');
        hitMarker.className = 'hit-marker';
        
        if (isCrit) {
            hitMarker.classList.add('critical');
            hitMarker.innerHTML = `<span class="damage-number">${damage}</span><span class="damage-label">КРИТ!</span>`;
        } else if (isBlocked) {
            hitMarker.classList.add('blocked');
            hitMarker.innerHTML = `<span class="damage-number">${damage}</span><span class="damage-label">БЛОК</span>`;
        } else {
            hitMarker.innerHTML = `<span class="damage-number">-${damage}</span>`;
        }
        
        const rect = element.getBoundingClientRect();
        hitMarker.style.left = rect.left + rect.width / 2 + 'px';
        hitMarker.style.top = rect.top + rect.height / 2 + 'px';
        
        // Случайное смещение влево/вправо
        const randomOffset = (Math.random() - 0.5) * 40;
        hitMarker.style.setProperty('--random-x', randomOffset + 'px');
        
        document.body.appendChild(hitMarker);
        
        setTimeout(() => hitMarker.classList.add('active'), 10);
        
        setTimeout(() => {
            if (document.body.contains(hitMarker)) {
                document.body.removeChild(hitMarker);
            }
        }, 1500);
    }

    async endBattle(playerWon) {
        console.log('=== endBattle called ===', { playerWon });
        
        // Проверяем онлайн-бой
        if (this.battleState && this.battleState.isOnline && window.onlineBattlesSystem) {
            await window.onlineBattlesSystem.endOnlineBattle(playerWon);
            return;
        }
        
        // Очищаем сохраненное состояние боя
        this.clearBattleState();
        
        // Показываем результат
        const resultOverlay = document.createElement('div');
        resultOverlay.className = 'battle-result-overlay';
        resultOverlay.style.display = 'flex'; // Явно показываем
        resultOverlay.style.opacity = '0'; // Начинаем с прозрачности
        
        if (playerWon) {
            // Звук победы
            this.soundSystem.playSound('victory');
            
            // Даем награды
            const user = this.getUser();
            const newGold = user.gold + 25;
            const newGems = user.gems + 1;
            const newExp = user.experience + 10;
            
            // Сохраняем награды
            await this.saveUser({
                gold: newGold,
                gems: newGems,
                experience: newExp
            });
            
            // Обновляем локальную копию
            user.gold = newGold;
            user.gems = newGems;
            user.experience = newExp;
            
            // Проверяем повышение уровня
            await this.checkLevelUp(user);
            
            // Опыт клану (если есть)
            if (window.clansSystem && window.clansSystem.currentClan) {
                await window.clansSystem.addClanExp(10);
            }
            
            resultOverlay.innerHTML = `
                <div class="battle-result victory">
                    <div class="result-icon">👑</div>
                    <div class="result-title">ПОБЕДА!</div>
                    <div class="result-rewards">
                        <div class="reward-item">+25 🪙</div>
                        <div class="reward-item">+1 💎</div>
                        <div class="reward-item">+10 EXP</div>
                    </div>
                    <div class="result-buttons">
                        <button class="btn primary" onclick="gameData.backToMenu()">📋 В меню</button>
                        <button class="btn secondary" onclick="gameData.playAgain()">🔄 Играть еще</button>
                    </div>
                </div>
            `;
        } else {
            // Звук поражения
            this.soundSystem.playSound('defeat');
            
            resultOverlay.innerHTML = `
                <div class="battle-result defeat">
                    <div class="result-icon">💀</div>
                    <div class="result-title">ПОРАЖЕНИЕ</div>
                    <div class="result-message">Не сдавайся! Попробуй еще раз!</div>
                    <div class="result-buttons">
                        <button class="btn primary" onclick="gameData.backToMenu()">📋 В меню</button>
                        <button class="btn secondary" onclick="gameData.playAgain()">🔄 Попробовать снова</button>
                    </div>
                </div>
            `;
        }
        
        console.log('Adding result overlay to body');
        document.body.appendChild(resultOverlay);
        
        // Плавное появление
        setTimeout(() => {
            resultOverlay.style.opacity = '1';
            resultOverlay.classList.add('active');
            console.log('Result overlay should be visible now');
        }, 100);
    }

    playAgain() {
        // Удаляем оверлей результата
        const resultOverlay = document.querySelector('.battle-result-overlay');
        if (resultOverlay && document.body.contains(resultOverlay)) {
            document.body.removeChild(resultOverlay);
        }
        
        // Очищаем сохраненное состояние боя (на всякий случай)
        this.clearBattleState();
        
        // Запускаем новый бой
        this.startBotBattle();
    }

    async checkLevelUp(user) {
        const expNeeded = user.level <= 5 ? 30 : 30 + (Math.floor((user.level - 1) / 5) * 50);
        
        if (user.experience >= expNeeded) {
            const newLevel = user.level + 1;
            const newExp = user.experience - expNeeded;
            const newGold = user.gold + 100;
            const newGems = user.gems + 5;
            
            // Сохраняем все изменения
            await this.saveUser({
                level: newLevel,
                experience: newExp,
                gold: newGold,
                gems: newGems
            });
            
            // Обновляем локальную копию
            user.level = newLevel;
            user.experience = newExp;
            user.gold = newGold;
            user.gems = newGems;
            
            // Показываем красивое модальное окно повышения уровня
            this.showLevelUpModal(newLevel);
            
            // Обновляем шкалу опыта после повышения уровня
            setTimeout(() => {
                this.updateExperienceBar(user);
                this.updateUserInfo();
            }, 100);
        }
    }

    showLevelUpModal(newLevel) {
        // Создаем оверлей для модального окна
        const overlay = document.createElement('div');
        overlay.className = 'level-up-overlay';
        overlay.innerHTML = `
            <div class="level-up-modal">
                <div class="level-up-glow"></div>
                <div class="level-up-sparkles">
                    <div class="sparkle" style="top: 10%; left: 20%; animation-delay: 0s;">✨</div>
                    <div class="sparkle" style="top: 80%; left: 15%; animation-delay: 0.3s;">✨</div>
                    <div class="sparkle" style="top: 15%; left: 80%; animation-delay: 0.6s;">✨</div>
                    <div class="sparkle" style="top: 85%; left: 75%; animation-delay: 0.9s;">✨</div>
                    <div class="sparkle" style="top: 50%; left: 10%; animation-delay: 0.2s;">⭐</div>
                    <div class="sparkle" style="top: 50%; left: 90%; animation-delay: 0.5s;">⭐</div>
                </div>
                <div class="level-up-icon">🎉</div>
                <div class="level-up-title">ПОВЫШЕНИЕ УРОВНЯ!</div>
                <div class="level-up-level">Уровень ${newLevel}</div>
                <div class="level-up-rewards">
                    <div class="level-up-reward-item">
                        <div class="reward-icon">🪙</div>
                        <div class="reward-text">+100 Золота</div>
                    </div>
                    <div class="level-up-reward-item">
                        <div class="reward-icon">💎</div>
                        <div class="reward-text">+5 Гемов</div>
                    </div>
                </div>
                <button class="btn primary close-level-up-btn">Продолжить</button>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // Воспроизводим звук победы
        this.soundSystem.playSound('victory');
        
        // Анимация появления
        setTimeout(() => overlay.classList.add('active'), 10);
        
        // Обработчик закрытия
        overlay.querySelector('.close-level-up-btn').addEventListener('click', () => {
            overlay.classList.remove('active');
            setTimeout(() => {
                if (document.body.contains(overlay)) {
                    document.body.removeChild(overlay);
                }
            }, 300);
        });
    }

    backToMenu() {
        // Удаляем оверлей результата если есть
        const resultOverlay = document.querySelector('.battle-result-overlay');
        if (resultOverlay && document.body.contains(resultOverlay)) {
            document.body.removeChild(resultOverlay);
        }
        
        // Очищаем сохраненное состояние боя (на всякий случай)
        this.clearBattleState();
        
        document.getElementById('battle-screen').classList.remove('active');
        document.getElementById('main-menu').classList.add('active');
        this.updateUserInfo();
        this.loadProfile();
    }

    showBattleInfo(mode) {
        const modal = document.getElementById('battle-mode-info-modal');
        const content = document.getElementById('battle-mode-info-content');
        const title = document.getElementById('battle-mode-info-title');
        
        let infoHtml = '';
        
        if (mode === 'bot') {
            title.textContent = '🤖 Бой с ботом - Информация';
            infoHtml = `
                <div class="case-info-section">
                    <h3>💰 Награды за победу</h3>
                    <div class="info-divider"></div>
                    <div class="chance-item">
                        <span class="rarity-label">🪙 Золото</span>
                        <span class="chance-value">+25</span>
                    </div>
                    <div class="chance-item">
                        <span class="rarity-label">💎 Гемы</span>
                        <span class="chance-value">+1</span>
                    </div>
                    <div class="chance-item">
                        <span class="rarity-label">⭐ Опыт</span>
                        <span class="chance-value">+10</span>
                    </div>
                    <div class="info-divider"></div>
                    <h4>⚔️ Опыт клана:</h4>
                    <div class="info-note">
                        ℹ️ Если вы в клане, он получает +10 опыта<br>
                        📊 Для повышения уровня: Уровень × 100 опыта
                    </div>
                    <div class="info-divider"></div>
                    <h4>🎯 Сложность:</h4>
                    <div class="info-note">
                        ⭐ Первый бой: гарантированная победа!<br>
                        ⚔️ Следующие бои: шанс ~50%
                    </div>
                </div>
            `;
        } else if (mode === 'online') {
            title.textContent = '👥 Онлайн бой - Информация';
            infoHtml = `
                <div class="case-info-section">
                    <h3>🎮 Как играть</h3>
                    <div class="info-divider"></div>
                    <h4>Шаги для игры:</h4>
                    <div class="upgrade-list-info">
                        <div>1️⃣ Создайте комнату (код 6 цифр)</div>
                        <div>2️⃣ Поделитесь кодом с другом</div>
                        <div>3️⃣ Друг вводит код и присоединяется</div>
                        <div>4️⃣ Бой начинается автоматически!</div>
                    </div>
                    <div class="info-divider"></div>
                    <h4>⚠️ Важно:</h4>
                    <div class="info-note">
                        ❌ Награды НЕ даются (золото, гемы, опыт)<br>
                        ❌ Опыт клану НЕ начисляется<br>
                        ✅ Честная игра с друзьями
                    </div>
                    <div class="info-divider"></div>
                    <h4>✨ Особенности:</h4>
                    <div class="upgrade-list-info">
                        <div>🔄 Real-time синхронизация</div>
                        <div>🌐 Игра через Firebase</div>
                        <div>🎯 Без прогресса</div>
                    </div>
                </div>
            `;
        } else if (mode === 'ranked') {
            title.textContent = '🏆 Ранговые бои - Информация';
            infoHtml = `
                <div class="case-info-section">
                    <h3>📊 Система ELO</h3>
                    <div class="info-divider"></div>
                    <h4>Правила рейтинга:</h4>
                    <div class="chance-item">
                        <span class="rarity-label">👑 Победа</span>
                        <span class="chance-value">+10 ELO</span>
                    </div>
                    <div class="chance-item chance-bad">
                        <span class="rarity-label">💀 Поражение</span>
                        <span class="chance-value">-5 ELO</span>
                    </div>
                    <div class="chance-item">
                        <span class="rarity-label rarity-legendary">⭐ Все карты выжили</span>
                        <span class="chance-value">+5 ELO</span>
                    </div>
                    <div class="info-divider"></div>
                    <h4>🎖️ Звания:</h4>
                    <div class="upgrade-list-info">
                        <div>🥉 Новичок (0-999)</div>
                        <div>🥉 Бронза (1000-1499)</div>
                        <div>🥈 Серебро (1500-1999)</div>
                        <div>🥇 Золото (2000-2499)</div>
                        <div>💎 Платина (2500-2999)</div>
                        <div>💠 Алмаз (3000+)</div>
                    </div>
                    <div class="info-divider"></div>
                    <div class="info-note">
                        📅 Ранговые бои скоро будут добавлены!<br>
                        🎯 Следите за обновлениями
                    </div>
                </div>
            `;
        }
        
        content.innerHTML = infoHtml;
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
        
        // Обработчик закрытия
        document.getElementById('close-battle-mode-info').onclick = () => {
            modal.style.display = 'none';
            modal.classList.remove('active');
        };
        
        window.onclick = (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                modal.classList.remove('active');
            }
        };
    }

    // ========== СИСТЕМА ОБУЧЕНИЯ ==========

    startTutorial() {
        this.tutorialStep = 0;
        this.tutorialSteps = [
            {
                text: `Приветствую тебя, новый воин! Я — Shadow Fiend, и я помогу тебе освоиться в мире DOTA CARDS.\n\nДавай начнём с основ!`,
                allowedElements: []
            },
            {
                text: `Первым делом, используй промокод <strong>FREE50</strong> чтобы получить стартовый капитал:\n\n💰 +50 Золота\n💎 +5 Гемов\n\nВведи его в поле выше и нажми "Использовать"!`,
                allowedElements: ['#promo-code', '#use-code-btn'],
                highlightElements: ['.code-input-section']
            },
            {
                text: `Отлично! Теперь перейди во вкладку <strong>"Кейсы"</strong> и открой <strong>Обычный кейс</strong> за 100 золота.\n\nВ кейсах выпадают карты разной редкости!`,
                allowedElements: ['[data-tab="cases"]', '.buy-case[data-case="normal"]'],
                highlightElements: ['[data-tab="cases"]']
            },
            {
                text: `У каждой карты есть 4 важных характеристики:\n\n⚔️ <strong>Урон</strong> - сколько урона наносит\n❤️ <strong>Здоровье</strong> - сколько урона выдерживает\n🛡️ <strong>Защита</strong> - шанс блока урона\n⚡ <strong>Скорость</strong> - атак за ход\n\n0-19 скорости = 1 атака\n20-29 = 2 атаки, 30+ = 3 атаки!`,
                allowedElements: ['[data-tab="cards"]'],
                highlightElements: ['[data-tab="cards"]']
            },
            {
                text: `Собери колоду из 3 карт во вкладке <strong>"Колода"</strong>, затем перейди в <strong>"Бои"</strong> и нажми <strong>"Начать бой"</strong>!\n\n⭐ Первый бой - гарантированная победа!\n\nУдачи, воин!`,
                allowedElements: ['[data-tab="deck"]', '[data-tab="battle"]', '#bot-battle-btn'],
                highlightElements: ['[data-tab="deck"]', '[data-tab="battle"]']
            }
        ];
        
        const overlay = document.getElementById('tutorial-overlay');
        overlay.style.display = 'flex';
        setTimeout(() => overlay.classList.add('active'), 10);
        
        this.setupTutorialHandlers();
        this.showTutorialStep(0);
    }

    setupTutorialHandlers() {
        document.getElementById('tutorial-next-btn').onclick = () => this.nextTutorialStep();
        document.getElementById('tutorial-prev-btn').onclick = () => this.prevTutorialStep();
        document.getElementById('skip-tutorial-btn').onclick = () => this.skipTutorial();
    }

    showTutorialStep(step) {
        const stepData = this.tutorialSteps[step];
        const textElement = document.getElementById('tutorial-text');
        const prevBtn = document.getElementById('tutorial-prev-btn');
        const nextBtn = document.getElementById('tutorial-next-btn');
        const counter = document.getElementById('tutorial-step-counter');
        
        // Анимация смены текста
        textElement.style.opacity = '0';
        setTimeout(() => {
            textElement.innerHTML = stepData.text;
            textElement.style.opacity = '1';
        }, 200);
        
        // Обновляем счётчик
        counter.textContent = `${step + 1} / ${this.tutorialSteps.length}`;
        
        // Управление кнопками
        prevBtn.style.display = step > 0 ? 'block' : 'none';
        nextBtn.textContent = step === this.tutorialSteps.length - 1 ? 'Начать играть! 🎮' : 'Далее →';
        
        // Блокируем/разблокируем элементы
        this.updateTutorialBlocking(stepData);
        
        this.tutorialStep = step;
    }
    
    updateTutorialBlocking(stepData) {
        // Убираем все подсветки и стрелки
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        document.querySelectorAll('.tutorial-arrow').forEach(el => {
            el.remove();
        });
        
        // Убираем блокировку со всех элементов
        document.querySelectorAll('.tutorial-blocked').forEach(el => {
            el.classList.remove('tutorial-blocked');
            el.style.pointerEvents = '';
        });
        
        // Блокируем все кнопки и вкладки кроме разрешенных
        const allInteractiveElements = document.querySelectorAll('.nav-btn, .btn, button, input, textarea');
        
        allInteractiveElements.forEach(el => {
            // Пропускаем элементы обучения
            if (el.id === 'tutorial-next-btn' || el.id === 'tutorial-prev-btn' || el.id === 'skip-tutorial-btn') {
                return;
            }
            
            let isAllowed = false;
            
            if (stepData.allowedElements && stepData.allowedElements.length > 0) {
                stepData.allowedElements.forEach(selector => {
                    try {
                        if (el.matches(selector) || el.closest(selector)) {
                            isAllowed = true;
                        }
                    } catch (e) {}
                });
            }
            
            if (!isAllowed) {
                el.classList.add('tutorial-blocked');
                el.style.pointerEvents = 'none';
            }
        });
        
        // Подсвечиваем нужные элементы
        if (stepData.highlightElements) {
            stepData.highlightElements.forEach(selector => {
                const element = document.querySelector(selector);
                if (element) {
                    element.classList.add('tutorial-highlight');
                    
                    // Добавляем анимированную стрелку
                    const arrow = document.createElement('div');
                    arrow.className = 'tutorial-arrow';
                    arrow.innerHTML = '👇';
                    element.appendChild(arrow);
                }
            });
        }
    }

    nextTutorialStep() {
        if (this.tutorialStep >= this.tutorialSteps.length - 1) {
            this.completeTutorial();
        } else {
            this.showTutorialStep(this.tutorialStep + 1);
        }
    }

    prevTutorialStep() {
        if (this.tutorialStep > 0) {
            this.showTutorialStep(this.tutorialStep - 1);
        }
    }

    async skipTutorial() {
        if (confirm('Вы уверены что хотите пропустить обучение?')) {
            await this.completeTutorial();
        }
    }

    async completeTutorial() {
        await this.saveUser({ tutorialCompleted: true });
        
        // Убираем оверлей обучения
        const overlay = document.getElementById('tutorial-overlay');
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
        
        // Убираем все блокировки и подсветки
        document.querySelectorAll('.tutorial-blocked').forEach(el => {
            el.classList.remove('tutorial-blocked');
            el.style.pointerEvents = '';
        });
        
        document.querySelectorAll('.tutorial-highlight').forEach(el => {
            el.classList.remove('tutorial-highlight');
        });
        
        this.updateUserInfo();
    }

    // ========== СИСТЕМА ДРУЗЕЙ ==========

    switchFriendsTab(tabName) {
        // Убираем active у всех кнопок
        document.querySelectorAll('.friends-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Убираем active у всех подвкладок
        document.querySelectorAll('.friends-content-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Активируем выбранную кнопку
        document.querySelector(`[data-friends-tab="${tabName}"]`).classList.add('active');
        
        // Активируем выбранную подвкладку
        document.getElementById(`${tabName}-tab`).classList.add('active');
        
        // Загружаем контент в зависимости от вкладки
        if (tabName === 'my-friends') {
            this.loadFriendsList();
        } else if (tabName === 'requests') {
            this.loadFriendRequests();
        }
    }

    initializeFriendsData(user) {
        if (!user.friends) user.friends = [];
        if (!user.friendRequests) user.friendRequests = { incoming: [], outgoing: [] };
    }

    async loadFriendsList() {
        const user = this.getUser();
        this.initializeFriendsData(user);
        
        const container = document.getElementById('friends-list');
        const countElement = document.getElementById('friends-count');
        
        const friends = user.friends || [];
        countElement.textContent = friends.length;
        container.innerHTML = '';
        
        if (friends.length === 0) {
            container.innerHTML = '<div class="no-friends">У вас пока нет друзей. Найдите друзей во вкладке "Поиск"!</div>';
            return;
        }
        
        for (const friendUserId of friends) {
            const friend = await this.getUserById(friendUserId);
            if (!friend) continue;
            
            const friendDiv = document.createElement('div');
            friendDiv.className = 'friend-item';
            
            const avatarSrc = friend.avatar || this.avatars[0];
            
            friendDiv.innerHTML = `
                <div class="friend-avatar">
                    <img src="${avatarSrc}" alt="${friend.nickname || friend.username}">
                </div>
                <div class="friend-info">
                    <div class="friend-name">${friend.nickname || friend.username}</div>
                    <div class="friend-id">ID: ${friend.userid || 'Н/Д'}</div>
                    <div class="friend-stats">
                        <span>Уровень: ${friend.level || 1}</span>
                        <span>Карт: ${Object.keys(friend.cards || {}).length}</span>
                    </div>
                </div>
                <div class="friend-actions">
                    <button class="btn small" onclick="gameData.removeFriend('${friendUserId}')">Удалить</button>
                </div>
            `;
            
            container.appendChild(friendDiv);
        }
    }

    async searchPlayers() {
        const query = document.getElementById('friend-search-input').value.trim();
        const resultsContainer = document.getElementById('search-results');
        
        if (!query) {
            resultsContainer.innerHTML = '<div class="no-results">Введите никнейм или ID для поиска</div>';
            return;
        }
        
        const currentUser = this.getUser();
        this.initializeFriendsData(currentUser);
        
        resultsContainer.innerHTML = '';
        
        const allUsers = await this.getAllUsers();
        const queryLower = query.toLowerCase();
        
        const results = Object.entries(allUsers).filter(([userId, user]) => {
            if (userId === this.currentUser) return false;
            
            const username = user.username || '';
            const nickname = user.nickname || '';
            const userid = user.userid || '';
            
            return username.toLowerCase().includes(queryLower) ||
                   nickname.toLowerCase().includes(queryLower) ||
                   userid.toLowerCase().includes(queryLower);
        });
        
        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">Игроки не найдены</div>';
            return;
        }
        
        results.forEach(([userId, user]) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'search-result-item';
            
            const avatarSrc = user.avatar || this.avatars[0];
            const isFriend = (currentUser.friends || []).includes(userId);
            const hasSentRequest = (currentUser.friendRequests?.outgoing || []).includes(userId);
            const hasIncomingRequest = (currentUser.friendRequests?.incoming || []).includes(userId);
            
            let buttonHTML;
            if (isFriend) {
                buttonHTML = '<span class="already-friends">✓ Уже друзья</span>';
            } else if (hasSentRequest) {
                buttonHTML = '<span class="request-sent">Запрос отправлен</span>';
            } else if (hasIncomingRequest) {
                buttonHTML = `<button class="btn primary small" onclick="gameData.acceptFriendRequest('${userId}')">Принять запрос</button>`;
            } else {
                buttonHTML = `<button class="btn primary small" onclick="gameData.sendFriendRequest('${userId}')">Добавить</button>`;
            }
            
            resultDiv.innerHTML = `
                <div class="search-result-avatar">
                    <img src="${avatarSrc}" alt="${user.nickname || user.username}">
                </div>
                <div class="search-result-info">
                    <div class="search-result-name">${user.nickname || user.username}</div>
                    <div class="search-result-id">ID: ${user.userid || 'Н/Д'}</div>
                    <div class="search-result-stats">
                        Уровень: ${user.level || 1} | Карт: ${Object.keys(user.cards || {}).length}
                    </div>
                </div>
                <div class="search-result-actions">
                    ${buttonHTML}
                </div>
            `;
            
            resultsContainer.appendChild(resultDiv);
        });
    }

    async sendFriendRequest(targetUserId) {
        const currentUser = this.getUser();
        const targetUser = await this.getUserById(targetUserId);
        
        if (!targetUser) {
            alert('Пользователь не найден');
            return;
        }
        
        this.initializeFriendsData(currentUser);
        this.initializeFriendsData(targetUser);
        
        // Проверки
        if (currentUser.friends && currentUser.friends.includes(targetUserId)) {
            alert('Этот игрок уже ваш друг!');
            return;
        }
        
        if (currentUser.friendRequests && currentUser.friendRequests.outgoing && currentUser.friendRequests.outgoing.includes(targetUserId)) {
            alert('Вы уже отправили запрос этому игроку!');
            return;
        }
        
        // Отправляем запрос
        const newOutgoing = [...(currentUser.friendRequests?.outgoing || []), targetUserId];
        const newIncoming = [...(targetUser.friendRequests?.incoming || []), this.currentUser];
        
        await this.saveUser({ 'friendRequests/outgoing': newOutgoing });
        
        if (this.useFirebase) {
            await firebaseAdapter.updateUserData(targetUserId, { 'friendRequests/incoming': newIncoming });
        } else {
            targetUser.friendRequests.incoming = newIncoming;
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        }
        
        this.soundSystem.playSound('whoosh');
        alert(`Запрос в друзья отправлен игроку ${targetUser.nickname || targetUser.username}!`);
        this.searchPlayers(); // Обновляем результаты поиска
    }

    async acceptFriendRequest(senderUserId) {
        const currentUser = this.getUser();
        const sender = await this.getUserById(senderUserId);
        
        if (!sender) return;
        
        this.initializeFriendsData(currentUser);
        this.initializeFriendsData(sender);
        
        // Удаляем из запросов и добавляем в друзья
        const newIncoming = (currentUser.friendRequests?.incoming || []).filter(u => u !== senderUserId);
        const newFriends = [...(currentUser.friends || []), senderUserId];
        
        const senderOutgoing = (sender.friendRequests?.outgoing || []).filter(u => u !== this.currentUser);
        const senderFriends = [...(sender.friends || []), this.currentUser];
        
        await this.saveUser({
            'friendRequests/incoming': newIncoming,
            'friends': newFriends
        });
        
        if (this.useFirebase) {
            await firebaseAdapter.updateUserData(senderUserId, {
                'friendRequests/outgoing': senderOutgoing,
                'friends': senderFriends
            });
        } else {
            sender.friendRequests.outgoing = senderOutgoing;
            sender.friends = senderFriends;
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        }
        
        this.soundSystem.playSound('upgrade');
        alert(`Теперь вы друзья с ${sender.nickname || sender.username}!`);
        this.loadFriendRequests();
    }

    async rejectFriendRequest(senderUserId) {
        const currentUser = this.getUser();
        const sender = await this.getUserById(senderUserId);
        
        if (!sender) return;
        
        this.initializeFriendsData(currentUser);
        this.initializeFriendsData(sender);
        
        // Удаляем из запросов
        const newIncoming = (currentUser.friendRequests?.incoming || []).filter(u => u !== senderUserId);
        const senderOutgoing = (sender.friendRequests?.outgoing || []).filter(u => u !== this.currentUser);
        
        await this.saveUser({ 'friendRequests/incoming': newIncoming });
        
        if (this.useFirebase) {
            await firebaseAdapter.updateUserData(senderUserId, { 'friendRequests/outgoing': senderOutgoing });
        } else {
            sender.friendRequests.outgoing = senderOutgoing;
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        }
        
        this.soundSystem.playSound('whoosh');
        this.loadFriendRequests();
    }

    async cancelFriendRequest(targetUserId) {
        const currentUser = this.getUser();
        const target = await this.getUserById(targetUserId);
        
        if (!target) return;
        
        this.initializeFriendsData(currentUser);
        this.initializeFriendsData(target);
        
        // Удаляем из запросов
        const newOutgoing = (currentUser.friendRequests?.outgoing || []).filter(u => u !== targetUserId);
        const targetIncoming = (target.friendRequests?.incoming || []).filter(u => u !== this.currentUser);
        
        await this.saveUser({ 'friendRequests/outgoing': newOutgoing });
        
        if (this.useFirebase) {
            await firebaseAdapter.updateUserData(targetUserId, { 'friendRequests/incoming': targetIncoming });
        } else {
            target.friendRequests.incoming = targetIncoming;
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        }
        
        this.soundSystem.playSound('whoosh');
        this.loadFriendRequests();
    }

    async removeFriend(friendUserId) {
        if (!confirm('Вы уверены, что хотите удалить этого друга?')) return;
        
        const currentUser = this.getUser();
        const friend = await this.getUserById(friendUserId);
        
        if (!friend) return;
        
        this.initializeFriendsData(currentUser);
        this.initializeFriendsData(friend);
        
        // Удаляем из друзей
        const newFriends = (currentUser.friends || []).filter(u => u !== friendUserId);
        const friendNewFriends = (friend.friends || []).filter(u => u !== this.currentUser);
        
        await this.saveUser({ friends: newFriends });
        
        if (this.useFirebase) {
            await firebaseAdapter.updateUserData(friendUserId, { friends: friendNewFriends });
        } else {
            friend.friends = friendNewFriends;
            localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
        }
        
        this.soundSystem.playSound('whoosh');
        this.loadFriendsList();
    }

    async loadFriendRequests() {
        const user = this.getUser();
        this.initializeFriendsData(user);
        
        const incomingContainer = document.getElementById('incoming-requests');
        const outgoingContainer = document.getElementById('outgoing-requests');
        const incomingCount = document.getElementById('incoming-count');
        const outgoingCount = document.getElementById('outgoing-count');
        
        const incoming = user.friendRequests?.incoming || [];
        const outgoing = user.friendRequests?.outgoing || [];
        
        incomingCount.textContent = incoming.length;
        outgoingCount.textContent = outgoing.length;
        
        // Входящие запросы
        incomingContainer.innerHTML = '';
        if (incoming.length === 0) {
            incomingContainer.innerHTML = '<div class="no-requests">Нет входящих запросов</div>';
        } else {
            for (const senderUserId of incoming) {
                const sender = await this.getUserById(senderUserId);
                if (!sender) continue;
                
                const requestDiv = document.createElement('div');
                requestDiv.className = 'request-item';
                
                const avatarSrc = sender.avatar || this.avatars[0];
                
                requestDiv.innerHTML = `
                    <div class="request-avatar">
                        <img src="${avatarSrc}" alt="${sender.nickname || sender.username}">
                    </div>
                    <div class="request-info">
                        <div class="request-name">${sender.nickname || sender.username}</div>
                        <div class="request-id">ID: ${sender.userid || 'Н/Д'}</div>
                    </div>
                    <div class="request-actions">
                        <button class="btn primary small" onclick="gameData.acceptFriendRequest('${senderUserId}')">Принять</button>
                        <button class="btn secondary small" onclick="gameData.rejectFriendRequest('${senderUserId}')">Отклонить</button>
                    </div>
                `;
                
                incomingContainer.appendChild(requestDiv);
            }
        }
        
        // Исходящие запросы
        outgoingContainer.innerHTML = '';
        if (outgoing.length === 0) {
            outgoingContainer.innerHTML = '<div class="no-requests">Нет отправленных запросов</div>';
        } else {
            for (const targetUserId of outgoing) {
                const target = await this.getUserById(targetUserId);
                if (!target) continue;
                
                const requestDiv = document.createElement('div');
                requestDiv.className = 'request-item';
                
                const avatarSrc = target.avatar || this.avatars[0];
                
                requestDiv.innerHTML = `
                    <div class="request-avatar">
                        <img src="${avatarSrc}" alt="${target.nickname || target.username}">
                    </div>
                    <div class="request-info">
                        <div class="request-name">${target.nickname || target.username}</div>
                        <div class="request-id">ID: ${target.userid || 'Н/Д'}</div>
                    </div>
                    <div class="request-actions">
                        <button class="btn secondary small" onclick="gameData.cancelFriendRequest('${targetUserId}')">Отменить</button>
                    </div>
                `;
                
                outgoingContainer.appendChild(requestDiv);
            }
        }
    }
}

// Глобальный перехватчик localStorage для автоматической синхронизации с Firebase
if (typeof firebaseAdapter !== 'undefined') {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    
    localStorage.setItem = function(key, value) {
        // Сохраняем в localStorage как обычно
        originalSetItem(key, value);
        
        // Если это данные пользователей и есть активная сессия
        if (key === 'dotaCardsUsers' && gameData && gameData.currentUser && gameData.useFirebase) {
            const users = JSON.parse(value);
            const currentUserData = users[gameData.currentUser];
            
            if (currentUserData) {
                // Автоматически синхронизируем с Firebase
                firebaseAdapter.updateUserData(gameData.currentUser, currentUserData)
                    .catch(err => console.error('Auto-sync error:', err));
            }
        }
    };
    
    console.log('🔄 Автоматическая синхронизация localStorage → Firebase активирована');
}

// Инициализация игры после загрузки DOM
let gameData;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM загружен, инициализируем игру...');
        gameData = new GameData();
        window.gameData = gameData; // Делаем доступным глобально для Firebase
    });
} else {
    console.log('📄 DOM уже загружен, инициализируем игру...');
    gameData = new GameData();
    window.gameData = gameData; // Делаем доступным глобально для Firebase
}


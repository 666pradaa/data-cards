// ========================================
// FIREBASE ВЕРСИЯ GAME.JS
// ========================================
// Этот файл содержит адаптированную версию GameData для работы с Firebase
// 
// КАК ИСПОЛЬЗОВАТЬ:
// 1. Настройте firebase-config.js (добавьте свои ключи из Firebase Console)
// 2. Замените game.js на этот файл (переименуйте game.js в game-local.js для резервной копии)
// 3. Переименуйте game-firebase.js в game.js
//
// ========================================

// ПРИМЕР: Как переделать методы для работы с Firebase

class GameDataFirebase {
    constructor() {
        this.currentUser = null;
        this.currentUserData = null;
        this.firebase = firebaseAdapter;
        this.soundSystem = new SoundSystem();
        
        // ... остальные поля из оригинального GameData
    }

    // Пример: Регистрация с Firebase
    async register() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            alert('Заполните все поля!');
            return;
        }
        
        if (password.length < 6) {
            alert('Пароль должен быть минимум 6 символов!');
            return;
        }
        
        const result = await this.firebase.register(username, password);
        
        if (result.success) {
            alert('Регистрация успешна!');
            this.currentUser = result.userId;
            this.currentUserData = result.userData;
            
            // Подписываемся на изменения
            this.firebase.listenToUserData(result.userId, (data) => {
                this.currentUserData = data;
                this.updateUserInfo();
            });
            
            this.showMainMenu();
        } else {
            alert(result.error);
        }
    }

    // Пример: Вход с Firebase
    async login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        if (!username || !password) {
            alert('Заполните все поля!');
            return;
        }
        
        const result = await this.firebase.login(username, password);
        
        if (result.success) {
            this.currentUser = result.userId;
            this.currentUserData = result.userData;
            
            // Подписываемся на изменения
            this.firebase.listenToUserData(result.userId, (data) => {
                this.currentUserData = data;
                this.updateUserInfo();
            });
            
            this.showMainMenu();
        } else {
            alert(result.error);
        }
    }

    // Пример: Обновление данных
    async saveUserData(updates) {
        if (!this.currentUser) return;
        
        await this.firebase.updateUserData(this.currentUser, updates);
        
        // Локальные данные обновятся через listener
    }

    // Пример: Добавление золота
    async addGold(amount) {
        if (!this.currentUserData) return;
        
        const newGold = (this.currentUserData.gold || 0) + amount;
        await this.saveUserData({ gold: newGold });
    }

    // Пример: Поиск друзей
    async searchPlayers() {
        const query = document.getElementById('friend-search-input').value.trim();
        
        if (!query) {
            document.getElementById('search-results').innerHTML = 
                '<div class="no-results">Введите никнейм или ID для поиска</div>';
            return;
        }
        
        const results = await this.firebase.searchUsers(query);
        
        // Отображаем результаты
        this.displaySearchResults(results);
    }

    // Пример: Отправка запроса в друзья
    async sendFriendRequest(targetUserId) {
        if (!this.currentUser || !this.currentUserData) return;
        
        try {
            // Получаем данные целевого пользователя
            const targetUser = await this.firebase.getUserData(targetUserId);
            
            if (!targetUser) {
                alert('Пользователь не найден');
                return;
            }
            
            // Проверки
            const currentFriends = this.currentUserData.friends || [];
            const currentOutgoing = this.currentUserData.friendRequests?.outgoing || [];
            
            if (currentFriends.includes(targetUserId)) {
                alert('Этот игрок уже ваш друг!');
                return;
            }
            
            if (currentOutgoing.includes(targetUserId)) {
                alert('Вы уже отправили запрос этому игроку!');
                return;
            }
            
            // Обновляем оба профиля
            const targetIncoming = targetUser.friendRequests?.incoming || [];
            
            await Promise.all([
                this.firebase.updateUserData(this.currentUser, {
                    'friendRequests/outgoing': [...currentOutgoing, targetUserId]
                }),
                this.firebase.updateUserData(targetUserId, {
                    'friendRequests/incoming': [...targetIncoming, this.currentUser]
                })
            ]);
            
            alert('Запрос в друзья отправлен!');
        } catch (error) {
            console.error('❌ Ошибка отправки запроса:', error);
            alert('Ошибка при отправке запроса');
        }
    }
}

// ========================================
// ИНСТРУКЦИЯ ПО МИГРАЦИИ
// ========================================
/*

ШАГИ ПО ПЕРЕХОДУ НА FIREBASE:

1. НАСТРОЙКА FIREBASE CONSOLE:
   - Создайте проект на https://console.firebase.google.com/
   - Включите Email/Password авторизацию в Authentication
   - Включите Realtime Database
   - Настройте правила безопасности (см. ниже)

2. ПРАВИЛА БЕЗОПАСНОСТИ (Database Rules):
   {
     "rules": {
       "users": {
         "$uid": {
           ".read": "auth != null",
           ".write": "$uid === auth.uid"
         }
       }
     }
   }

3. ЗАМЕНА КОДА:
   - Скопируйте весь код из game.js
   - Замените все localStorage.getItem/setItem на Firebase методы
   - Замените this.users[username] на await firebase.getUserData(userId)
   - Добавьте async/await к методам работы с данными

4. ОСНОВНЫЕ ИЗМЕНЕНИЯ:
   
   БЫЛО (localStorage):
   this.users[this.currentUser].gold += 100;
   localStorage.setItem('dotaCardsUsers', JSON.stringify(this.users));
   
   СТАЛО (Firebase):
   await this.saveUserData({ 
       gold: this.currentUserData.gold + 100 
   });

5. ПРЕИМУЩЕСТВА:
   ✅ Данные хранятся в облаке
   ✅ Синхронизация между устройствами
   ✅ Настоящая система друзей
   ✅ Защита от читов
   ✅ Возможность онлайн боев

6. ПОЛЕЗНЫЕ ССЫЛКИ:
   - Firebase Console: https://console.firebase.google.com/
   - Документация: https://firebase.google.com/docs/web/setup
   - Realtime Database: https://firebase.google.com/docs/database/web/start

*/


// ========================================
// FIREBASE КОНФИГУРАЦИЯ
// ========================================

// ВАЖНО: Замените эти значения на свои из Firebase Console
// Инструкция:
// 1. Откройте https://console.firebase.google.com/
// 2. Выберите свой проект
// 3. Зайдите в Project Settings (⚙️)
// 4. Прокрутите вниз до "Your apps" → выберите Web app
// 5. Скопируйте конфигурацию

const firebaseConfig = {
    apiKey: "AIzaSyAtptVv5Gm2Qxd7uCvnKhxZArqzd_94kz0",
    authDomain: "dota-cards.firebaseapp.com",
    databaseURL: "https://dota-cards-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dota-cards",
    storageBucket: "dota-cards.firebasestorage.app",
    messagingSenderId: "913111804525",
    appId: "1:913111804525:web:807541d80f17e72fc3ad64"
  };
// Инициализация Firebase
let app;
let auth;
let database;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    database = firebase.database();
    console.log('✅ Firebase успешно инициализирован!');
} catch (error) {
    console.error('❌ Ошибка инициализации Firebase:', error);
    alert('Ошибка подключения к серверу. Проверьте конфигурацию Firebase.');
}

// ========================================
// FIREBASE DATABASE ADAPTER
// ========================================

class FirebaseAdapter {
    constructor() {
        this.auth = auth;
        this.database = database;
        this.currentUser = null;
        this.listeners = {};
    }

    // ===== АВТОРИЗАЦИЯ =====

    async register(username, password) {
        try {
            // Создаем пользователя
            const email = `${username}@dotacards.local`; // Используем псевдо-email
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            // Создаем профиль в базе данных
            const userData = {
                username: username,
                nickname: username,
                userid: this.generateUserId(),
                level: 1,
                experience: 0,
                gold: 0,
                gems: 0,
                cards: {},
                deck: [],
                upgrades: {},
                avatar: null,
                friends: [],
                friendRequests: {
                    incoming: [],
                    outgoing: []
                },
                battlesPlayed: 0,
                casesOpened: 0,
                createdAt: Date.now()
            };

            await this.database.ref(`users/${userId}`).set(userData);

            console.log('✅ Пользователь зарегистрирован:', username);
            return { success: true, userId, userData };
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            
            let errorMessage = 'Ошибка регистрации';
            
            if (error.code === 'auth/email-already-in-use') {
                errorMessage = 'Это имя пользователя уже занято!';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'Пароль слишком короткий (минимум 6 символов)';
            } else if (error.code === 'auth/invalid-email') {
                errorMessage = 'Некорректное имя пользователя';
            } else {
                errorMessage = error.message;
            }
            
            console.log('📛 Ошибка для пользователя:', errorMessage);
            return { success: false, error: errorMessage };
        }
    }

    async login(username, password) {
        try {
            const email = `${username}@dotacards.local`;
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            // Получаем данные пользователя
            const snapshot = await this.database.ref(`users/${userId}`).once('value');
            const userData = snapshot.val();

            if (!userData) {
                throw new Error('Данные пользователя не найдены');
            }

            this.currentUser = userId;
            console.log('✅ Вход выполнен:', username);
            
            return { success: true, userId, userData };
        } catch (error) {
            console.error('❌ Ошибка входа:', error);
            
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                return { success: false, error: 'Неверный логин или пароль!' };
            }
            
            return { success: false, error: error.message };
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            console.log('✅ Выход выполнен');
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка выхода:', error);
            return { success: false, error: error.message };
        }
    }

    // ===== РАБОТА С ДАННЫМИ =====

    async getUserData(userId = null) {
        try {
            const uid = userId || this.currentUser;
            if (!uid) throw new Error('Пользователь не авторизован');

            const snapshot = await this.database.ref(`users/${uid}`).once('value');
            return snapshot.val();
        } catch (error) {
            console.error('❌ Ошибка получения данных:', error);
            return null;
        }
    }

    async updateUserData(userId, data) {
        try {
            const uid = userId || this.currentUser;
            if (!uid) throw new Error('Пользователь не авторизован');

            await this.database.ref(`users/${uid}`).update(data);
            console.log('✅ Данные обновлены');
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка обновления данных:', error);
            return { success: false, error: error.message };
        }
    }

    // Получить всех пользователей (для поиска друзей)
    async getAllUsers() {
        try {
            const snapshot = await this.database.ref('users').once('value');
            const users = {};
            
            snapshot.forEach((childSnapshot) => {
                users[childSnapshot.key] = childSnapshot.val();
            });
            
            return users;
        } catch (error) {
            console.error('❌ Ошибка получения пользователей:', error);
            return {};
        }
    }

    // Поиск пользователей
    async searchUsers(query) {
        try {
            const allUsers = await this.getAllUsers();
            const queryLower = query.toLowerCase();
            
            const results = Object.entries(allUsers)
                .filter(([userId, userData]) => {
                    if (userId === this.currentUser) return false;
                    
                    const username = (userData.username || '').toLowerCase();
                    const nickname = (userData.nickname || '').toLowerCase();
                    const userid = (userData.userid || '').toLowerCase();
                    
                    return username.includes(queryLower) ||
                           nickname.includes(queryLower) ||
                           userid.includes(queryLower);
                })
                .map(([userId, userData]) => ({ userId, ...userData }));
            
            return results;
        } catch (error) {
            console.error('❌ Ошибка поиска:', error);
            return [];
        }
    }

    // ===== REAL-TIME LISTENERS =====

    // Подписка на изменения данных пользователя
    listenToUserData(userId, callback) {
        const uid = userId || this.currentUser;
        if (!uid) return;

        const ref = this.database.ref(`users/${uid}`);
        
        const listener = ref.on('value', (snapshot) => {
            callback(snapshot.val());
        });

        this.listeners[uid] = { ref, listener };
    }

    // Отписка от изменений
    unlistenToUserData(userId) {
        const uid = userId || this.currentUser;
        if (this.listeners[uid]) {
            this.listeners[uid].ref.off('value', this.listeners[uid].listener);
            delete this.listeners[uid];
        }
    }

    // ===== УТИЛИТЫ =====

    generateUserId() {
        return 'ID' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    getCurrentUserId() {
        return this.currentUser;
    }

    isAuthenticated() {
        return this.auth.currentUser !== null;
    }
}

// Создаем глобальный экземпляр
const firebaseAdapter = new FirebaseAdapter();

// Отслеживаем состояние авторизации
auth.onAuthStateChanged(async (user) => {
    if (user) {
        firebaseAdapter.currentUser = user.uid;
        console.log('👤 Пользователь авторизован:', user.uid);
        
        // Автоматический вход при обновлении страницы
        if (window.gameData && !window.gameData.currentUser) {
            console.log('🔄 Восстанавливаем сессию...');
            try {
                const userData = await firebaseAdapter.getUserData(user.uid);
                if (userData) {
                    window.gameData.currentUser = user.uid;
                    window.gameData.currentUserData = userData;
                    
                    // Подписываемся на изменения
                    firebaseAdapter.listenToUserData(user.uid, (data) => {
                        window.gameData.currentUserData = data;
                        window.gameData.updateUserInfo();
                    });
                    
                    // Загружаем кеш пользователей
                    window.gameData.allUsersCache = await firebaseAdapter.getAllUsers();
                    
                    console.log('✅ Сессия восстановлена');
                    window.gameData.showMainMenu();
                }
            } catch (error) {
                console.error('❌ Ошибка восстановления сессии:', error);
            }
        }
    } else {
        firebaseAdapter.currentUser = null;
        console.log('👤 Пользователь не авторизован');
    }
});


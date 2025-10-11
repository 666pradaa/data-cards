// ========================================
// FIREBASE КОНФИГУРАЦИЯ - ПРИМЕР
// ========================================
// 
// ⚠️ ЭТО ПРИМЕР! НЕ ИСПОЛЬЗУЙТЕ ЭТИ ЗНАЧЕНИЯ!
// 
// ИНСТРУКЦИЯ:
// 1. Скопируйте этот файл как firebase-config.js
// 2. Замените значения на свои из Firebase Console
// 3. НЕ коммитьте firebase-config.js в Git!
//
// ========================================

const firebaseConfig = {
    // 🔑 Получите эти значения из Firebase Console:
    // Project Settings → General → Your apps → Web app
    
    apiKey: "ВАШ_API_KEY_ЗДЕСЬ",
    authDomain: "ВАШ_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://ВАШ_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "ВАШ_PROJECT_ID",
    storageBucket: "ВАШ_PROJECT_ID.appspot.com",
    messagingSenderId: "ВАШ_MESSAGING_SENDER_ID",
    appId: "ВАШ_APP_ID"
};

// ========================================
// КАК ПОЛУЧИТЬ КОНФИГУРАЦИЮ:
// ========================================
//
// 1. Откройте https://console.firebase.google.com/
// 2. Выберите ваш проект
// 3. Нажмите на иконку шестеренки ⚙️
// 4. "Project settings"
// 5. Прокрутите вниз до "Your apps"
// 6. Если нет Web app - нажмите кнопку Web (</>)
// 7. Скопируйте значения из firebaseConfig
// 8. Вставьте их выше
// ========================================

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
    console.error('📝 Проверьте правильность конфигурации выше');
}

// FirebaseAdapter - класс для работы с базой данных
class FirebaseAdapter {
    constructor() {
        this.auth = auth;
        this.database = database;
        this.currentUser = null;
        this.listeners = {};
    }

    async register(username, password) {
        try {
            const email = `${username}@dotacards.local`;
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

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
                friendRequests: { incoming: [], outgoing: [] },
                battlesPlayed: 0,
                casesOpened: 0,
                createdAt: Date.now()
            };

            await this.database.ref(`users/${userId}`).set(userData);
            console.log('✅ Пользователь зарегистрирован:', username);
            return { success: true, userId, userData };
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error);
            if (error.code === 'auth/email-already-in-use') {
                return { success: false, error: 'Это имя пользователя уже занято!' };
            }
            return { success: false, error: error.message };
        }
    }

    async login(username, password) {
        try {
            const email = `${username}@dotacards.local`;
            const userCredential = await this.auth.signInWithEmailAndPassword(email, password);
            const userId = userCredential.user.uid;

            const snapshot = await this.database.ref(`users/${userId}`).once('value');
            const userData = snapshot.val();

            if (!userData) throw new Error('Данные пользователя не найдены');

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
            return { success: true };
        } catch (error) {
            console.error('❌ Ошибка обновления данных:', error);
            return { success: false, error: error.message };
        }
    }

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

    listenToUserData(userId, callback) {
        const uid = userId || this.currentUser;
        if (!uid) return;
        const ref = this.database.ref(`users/${uid}`);
        const listener = ref.on('value', (snapshot) => callback(snapshot.val()));
        this.listeners[uid] = { ref, listener };
    }

    unlistenToUserData(userId) {
        const uid = userId || this.currentUser;
        if (this.listeners[uid]) {
            this.listeners[uid].ref.off('value', this.listeners[uid].listener);
            delete this.listeners[uid];
        }
    }

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

const firebaseAdapter = new FirebaseAdapter();

auth.onAuthStateChanged((user) => {
    if (user) {
        firebaseAdapter.currentUser = user.uid;
        console.log('👤 Пользователь авторизован:', user.uid);
    } else {
        firebaseAdapter.currentUser = null;
        console.log('👤 Пользователь не авторизован');
    }
});


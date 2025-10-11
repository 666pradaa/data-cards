// ========================================
// СКРИПТ МИГРАЦИИ ДАННЫХ
// localStorage → Firebase
// ========================================

// КАК ИСПОЛЬЗОВАТЬ:
// 1. Настройте Firebase (см. FIREBASE_ИНСТРУКЦИЯ.md)
// 2. Откройте index.html в браузере
// 3. Откройте Console (F12)
// 4. Скопируйте и вставьте этот код в Console
// 5. Нажмите Enter

async function migrateToFirebase() {
    console.log('🚀 Начинаем миграцию данных в Firebase...');
    
    // Проверяем наличие Firebase
    if (typeof firebase === 'undefined' || !firebaseAdapter) {
        console.error('❌ Firebase не подключен! Настройте firebase-config.js сначала.');
        return;
    }
    
    // Получаем данные из localStorage
    const localUsers = JSON.parse(localStorage.getItem('dotaCardsUsers') || '{}');
    
    if (Object.keys(localUsers).length === 0) {
        console.log('ℹ️ Нет данных для миграции в localStorage');
        return;
    }
    
    console.log(`📦 Найдено ${Object.keys(localUsers).length} пользователей в localStorage`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const [username, userData] of Object.entries(localUsers)) {
        try {
            console.log(`📤 Миграция пользователя: ${username}...`);
            
            // Регистрируем пользователя в Firebase
            // ВНИМАНИЕ: Используем дефолтный пароль, пользователь должен будет сменить его
            const defaultPassword = 'password123';
            
            const result = await firebaseAdapter.register(username, defaultPassword);
            
            if (result.success) {
                // Обновляем данные пользователя
                await firebaseAdapter.updateUserData(result.userId, {
                    ...userData,
                    // Важно: сохраняем старый прогресс
                    migratedFromLocalStorage: true,
                    migrationDate: Date.now()
                });
                
                console.log(`   ✅ ${username} успешно мигрирован`);
                successCount++;
            } else {
                console.error(`   ❌ Ошибка: ${result.error}`);
                errorCount++;
            }
            
        } catch (error) {
            console.error(`   ❌ Ошибка миграции ${username}:`, error);
            errorCount++;
        }
        
        // Небольшая задержка между запросами
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 РЕЗУЛЬТАТЫ МИГРАЦИИ:');
    console.log(`   ✅ Успешно: ${successCount}`);
    console.log(`   ❌ Ошибки: ${errorCount}`);
    console.log('='.repeat(60));
    
    if (successCount > 0) {
        console.log('\n⚠️ ВАЖНО:');
        console.log('   Все пользователи мигрированы с паролем: password123');
        console.log('   Попросите пользователей сменить пароль!');
        console.log('\n✅ Миграция завершена! Можете удалить данные из localStorage:');
        console.log('   localStorage.removeItem("dotaCardsUsers");');
    }
}

// Автоматический запуск при вставке в консоль
migrateToFirebase();


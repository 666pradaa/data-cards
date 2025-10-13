/**
 * ⚔️ СИСТЕМА КЛАНОВ
 * Полная логика создания, управления и отображения кланов
 */

class ClansSystem {
    constructor(gameData) {
        this.gameData = gameData;
        this.currentClan = null;
        this.clanAvatarParts = {
            backgrounds: ['⬛', '🟥', '🟦', '🟩', '🟨', '🟪', '🟧'],
            symbols: ['⚔️', '🛡️', '👑', '🔥', '⚡', '💀', '🐉', '🦅', '🌟', '💎'],
            colors: ['#fff', '#000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
        };
        this.selectedParts = {
            background: 0,
            symbol: 0,
            color: 0
        };
    }

    async init() {
        console.log('🏰 Инициализация системы кланов...');
        
        try {
            // Настраиваем обработчики
            this.setupEventListeners();
            
            console.log('✅ Обработчики кланов настроены');
        } catch (error) {
            console.error('❌ Ошибка инициализации кланов:', error);
        }
    }

    setupEventListeners() {
        console.log('🔧 Настройка обработчиков кланов...');
        
        // Создание клана
        const createBtn = document.getElementById('create-clan-btn');
        if (createBtn) {
            console.log('✅ Кнопка создания клана найдена');
            createBtn.addEventListener('click', () => {
                console.log('🔵 Клик на создание клана');
                this.openCreateClanModal();
            });
        } else {
            console.error('❌ Кнопка create-clan-btn НЕ найдена!');
        }
        
        document.getElementById('confirm-create-clan-btn')?.addEventListener('click', () => this.createClan());
        document.getElementById('close-create-clan')?.addEventListener('click', () => this.closeCreateClanModal());
        
        // Поиск кланов
        const findBtn = document.getElementById('find-clan-btn');
        if (findBtn) {
            console.log('✅ Кнопка поиска клана найдена');
            findBtn.addEventListener('click', () => {
                console.log('🔵 Клик на поиск клана');
                this.openFindClans();
            });
        } else {
            console.error('❌ Кнопка find-clan-btn НЕ найдена!');
        }
        
        document.getElementById('back-from-search-btn')?.addEventListener('click', () => this.closeFindClans());
        document.getElementById('clan-search-btn')?.addEventListener('click', () => this.searchClans());
        
        // Поиск при нажатии Enter
        document.getElementById('clan-search')?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchClans();
        });
        
        // Управление кланом
        const addMemberBtn = document.getElementById('add-member-btn');
        if (addMemberBtn) {
            console.log('✅ Кнопка добавления участника найдена');
            addMemberBtn.addEventListener('click', () => {
                console.log('🔵 Клик на добавление участника');
                this.openAddMemberModal();
            });
        } else {
            console.log('⚠️ Кнопка add-member-btn пока не найдена (появится при открытии клана)');
        }
        
        document.getElementById('leave-clan-btn')?.addEventListener('click', () => this.leaveClan());
        document.getElementById('search-member-btn')?.addEventListener('click', () => this.searchMember());
        document.getElementById('close-add-member')?.addEventListener('click', () => this.closeAddMemberModal());
        
        // Конструктор аватарки
        this.setupAvatarConstructor();
    }

    setupAvatarConstructor() {
        // Фоны
        const bgOptions = document.getElementById('bg-options');
        if (bgOptions) {
            bgOptions.innerHTML = this.clanAvatarParts.backgrounds.map((bg, i) => 
                `<div class="avatar-option" data-part="background" data-index="${i}">${bg}</div>`
            ).join('');
        }
        
        // Символы
        const symbolOptions = document.getElementById('symbol-options');
        if (symbolOptions) {
            symbolOptions.innerHTML = this.clanAvatarParts.symbols.map((symbol, i) => 
                `<div class="avatar-option" data-part="symbol" data-index="${i}">${symbol}</div>`
            ).join('');
        }
        
        // ЦВЕТА УБРАНЫ - не используются и ничего не меняют
        
        // Обработчики выбора
        document.querySelectorAll('.avatar-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const part = e.target.dataset.part;
                const index = parseInt(e.target.dataset.index);
                this.selectedParts[part] = index;
                this.updateAvatarPreview();
                
                // Подсветка выбранного
                e.target.parentElement.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
                e.target.classList.add('selected');
            });
        });
        
        this.updateAvatarPreview();
    }

    updateAvatarPreview() {
        const preview = document.getElementById('clan-avatar-preview');
        if (!preview) return;
        
        const bg = this.clanAvatarParts.backgrounds[this.selectedParts.background];
        const symbol = this.clanAvatarParts.symbols[this.selectedParts.symbol];
        const color = this.clanAvatarParts.colors[this.selectedParts.color];
        
        preview.innerHTML = `
            <div class="clan-avatar-display">
                <div class="avatar-bg">${bg}</div>
                <div class="avatar-symbol" style="color: ${color}">${symbol}</div>
            </div>
        `;
    }

    async loadUserClan() {
        const user = this.gameData.getUser();
        
        // Всегда загружаем приглашения
        await this.loadClanInvites();
        
        if (!user || !user.clanId) {
            this.showNoClanView();
            return;
        }
        
        try {
            const clan = await this.getClanById(user.clanId);
            if (clan) {
                this.currentClan = clan;
                this.showClanView(clan);
            } else {
                this.showNoClanView();
            }
        } catch (error) {
            console.error('Ошибка загрузки клана:', error);
            this.showNoClanView();
        }
    }

    showNoClanView() {
        document.getElementById('no-clan-view').style.display = 'block';
        document.getElementById('clan-view').style.display = 'none';
        document.getElementById('find-clan-view').style.display = 'none';
    }

    showClanView(clan) {
        document.getElementById('no-clan-view').style.display = 'none';
        document.getElementById('clan-view').style.display = 'block';
        document.getElementById('find-clan-view').style.display = 'none';
        
        // Отображаем информацию о клане
        document.getElementById('clan-tag-display').textContent = `[${clan.tag}]`;
        document.getElementById('clan-name-display').textContent = clan.name;
        document.getElementById('clan-description-display').textContent = clan.description || 'Нет описания';
        document.getElementById('clan-level').textContent = clan.level || 1;
        document.getElementById('clan-exp').textContent = `${clan.exp || 0} / ${(clan.level || 1) * 100}`;
        document.getElementById('clan-members-count').textContent = clan.members ? clan.members.length : 0;
        
        // Аватарка клана
        this.displayClanAvatar('clan-avatar-display', clan.avatar);
        
        // Список участников
        this.loadClanMembers(clan);
        
        // Загружаем запросы на вступление (если лидер)
        this.loadJoinRequests();
        
        // Подключаем обработчик кнопки добавления участника
        setTimeout(() => {
            const addBtn = document.getElementById('add-member-btn');
            if (addBtn && !addBtn.dataset.listenerAdded) {
                console.log('✅ Подключаем обработчик к кнопке добавления участника');
                addBtn.addEventListener('click', () => {
                    console.log('🔵 Клик на добавление участника');
                    this.openAddMemberModal();
                });
                addBtn.dataset.listenerAdded = 'true';
            }
        }, 100);
    }

    displayClanAvatar(elementId, avatar) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.innerHTML = `
            <div class="clan-avatar-display">
                <div class="avatar-bg">${this.clanAvatarParts.backgrounds[avatar.background || 0]}</div>
                <div class="avatar-symbol" style="color: ${this.clanAvatarParts.colors[avatar.color || 0]}">${this.clanAvatarParts.symbols[avatar.symbol || 0]}</div>
            </div>
        `;
    }

    async loadClanMembers(clan) {
        const container = document.getElementById('clan-members-container');
        if (!container) return;
        
        container.innerHTML = '<p>Загрузка участников...</p>';
        
        try {
            const allUsers = await this.gameData.getAllUsers();
            const members = (clan.members || []).map(userId => {
                const user = allUsers[userId];
                if (!user) return null;
                
                const isLeader = userId === clan.leader;
                return {
                    userId,
                    nickname: user.nickname || 'Неизвестный',
                    level: user.level || 1,
                    isLeader
                };
            }).filter(m => m);
            
            if (members.length === 0) {
                container.innerHTML = '<p>Нет участников</p>';
                return;
            }
            
            container.innerHTML = members.map(member => `
                <div class="clan-member-item">
                    <div class="member-info">
                        <span class="member-name">${member.nickname} ${member.isLeader ? '👑' : ''}</span>
                        <span class="member-level">Ур. ${member.level}</span>
                    </div>
                    ${!member.isLeader && clan.leader === this.gameData.currentUser ? 
                        `<button class="btn small remove-member-btn" onclick="window.clansSystem.removeMember('${member.userId}')">❌</button>` : 
                        ''}
                </div>
            `).join('');
        } catch (error) {
            console.error('Ошибка загрузки участников:', error);
            container.innerHTML = '<p>Ошибка загрузки</p>';
        }
    }

    openCreateClanModal() {
        console.log('🎨 Открытие модального окна создания клана');
        
        const user = this.gameData.getUser();
        console.log('Гемы пользователя:', user.gems);
        
        if (user.gems < 25) {
            alert('Недостаточно гемов! Нужно 25 💎');
            return;
        }
        
        const modal = document.getElementById('create-clan-modal');
        if (modal) {
            console.log('✅ Модальное окно найдено, открываем');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            this.setupAvatarConstructor();
            this.updateAvatarPreview();
        } else {
            console.error('❌ Модальное окно create-clan-modal НЕ найдено!');
        }
    }

    closeCreateClanModal() {
        document.getElementById('create-clan-modal').style.display = 'none';
    }

    async createClan() {
        const tag = document.getElementById('clan-tag-input').value.trim().toUpperCase();
        const name = document.getElementById('clan-name-input').value.trim();
        const description = document.getElementById('clan-description-input').value.trim();
        
        // Валидация
        if (!tag || tag.length < 2 || tag.length > 5) {
            await this.gameData.showAlert('Тег должен быть от 2 до 5 символов!', '⚠️', 'Ошибка');
            return;
        }
        
        if (!name || name.length < 3) {
            await this.gameData.showAlert('Название должно быть минимум 3 символа!', '⚠️', 'Ошибка');
            return;
        }
        
        const user = this.gameData.getUser();
        if (user.gems < 25) {
            await this.gameData.showAlert('Недостаточно гемов! Нужно: 25 💎', '⚠️', 'Ошибка');
            return;
        }
        
        // Красивое подтверждение
        const confirmed = await this.gameData.showConfirm(
            `Создать клан "${name}" [${tag}] за 25 гемов?`, 
            '🏰', 
            'Создание клана'
        );
        
        if (!confirmed) {
            return;
        }
        
        try {
            // Генерируем ID клана
            const clanId = 'clan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const clanData = {
                id: clanId,
                tag,
                name,
                description,
                leader: this.gameData.currentUser,
                members: [this.gameData.currentUser],
                level: 1,
                exp: 0,
                avatar: {
                    background: this.selectedParts.background,
                    symbol: this.selectedParts.symbol,
                    color: this.selectedParts.color
                },
                createdAt: Date.now()
            };
            
            // Сохраняем клан
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`clans/${clanId}`).set(clanData);
            } else {
                // localStorage
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                clans[clanId] = clanData;
                localStorage.setItem('clans', JSON.stringify(clans));
            }
            
            // Списываем гемы и привязываем клан к пользователю
            await this.gameData.saveUser({
                gems: user.gems - 25,
                clanId: clanId
            });
            
            alert(`✅ Клан [${tag}] "${name}" создан!`);
            this.closeCreateClanModal();
            await this.loadUserClan();
            
        } catch (error) {
            console.error('Ошибка создания клана:', error);
            alert('Ошибка создания клана: ' + error.message);
        }
    }

    async getClanById(clanId) {
        if (this.gameData.useFirebase) {
            const snapshot = await firebase.database().ref(`clans/${clanId}`).once('value');
            return snapshot.val();
        } else {
            const clans = JSON.parse(localStorage.getItem('clans') || '{}');
            return clans[clanId];
        }
    }

    async leaveClan() {
        if (!this.currentClan) return;
        
        if (!confirm('Вы уверены, что хотите покинуть клан?')) return;
        
        try {
            const user = this.gameData.getUser();
            
            // Нельзя покинуть если лидер
            if (this.currentClan.leader === this.gameData.currentUser) {
                alert('Лидер не может покинуть клан! Передайте лидерство или распустите клан.');
                return;
            }
            
            // Удаляем из списка участников
            const updatedMembers = (this.currentClan.members || []).filter(id => id !== this.gameData.currentUser);
            
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`clans/${this.currentClan.id}/members`).set(updatedMembers);
            } else {
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                if (clans[this.currentClan.id]) {
                    clans[this.currentClan.id].members = updatedMembers;
                    localStorage.setItem('clans', JSON.stringify(clans));
                }
            }
            
            // Убираем клан у пользователя
            await this.gameData.saveUser({ clanId: null });
            
            alert('Вы покинули клан');
            this.currentClan = null;
            this.showNoClanView();
            
        } catch (error) {
            console.error('Ошибка выхода из клана:', error);
            alert('Ошибка: ' + error.message);
        }
    }

    openAddMemberModal() {
        console.log('🎯 Открытие модального окна добавления участника');
        const modal = document.getElementById('add-member-modal');
        if (modal) {
            console.log('✅ Модальное окно найдено');
            modal.style.display = 'flex';
            setTimeout(() => modal.classList.add('active'), 10);
            
            // Подключаем обработчик поиска
            const searchBtn = document.getElementById('search-member-btn');
            if (searchBtn && !searchBtn.dataset.listenerAdded) {
                console.log('✅ Подключаем обработчик поиска участника');
                searchBtn.addEventListener('click', () => {
                    console.log('🔵 Клик на поиск участника');
                    this.searchMember();
                });
                searchBtn.dataset.listenerAdded = 'true';
            }
            
            // Поиск по Enter
            const searchInput = document.getElementById('member-search-input');
            if (searchInput && !searchInput.dataset.listenerAdded) {
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        console.log('🔵 Enter в поиске участника');
                        this.searchMember();
                    }
                });
                searchInput.dataset.listenerAdded = 'true';
            }
        } else {
            console.error('❌ Модальное окно add-member-modal НЕ найдено!');
        }
    }

    closeAddMemberModal() {
        const modal = document.getElementById('add-member-modal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
        }
        // Очищаем результаты поиска
        document.getElementById('member-search-results').innerHTML = '';
        document.getElementById('member-search-input').value = '';
    }

    async searchMember() {
        const query = document.getElementById('member-search-input').value.trim();
        if (!query) {
            alert('Введите ID или никнейм');
            return;
        }
        
        const resultsContainer = document.getElementById('member-search-results');
        resultsContainer.innerHTML = '<p>Поиск...</p>';
        
        try {
            const allUsers = await this.gameData.getAllUsers();
            const results = Object.entries(allUsers).filter(([userId, user]) => {
                const matchId = (user.userid || '').includes(query);
                const matchNick = (user.nickname || '').toLowerCase().includes(query.toLowerCase());
                return matchId || matchNick;
            });
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<p>Никто не найден</p>';
                return;
            }
            
            resultsContainer.innerHTML = results.slice(0, 10).map(([userId, user]) => `
                <div class="search-result-item">
                    <div>
                        <strong>${user.nickname || 'Без ника'}</strong>
                        <br>
                        <small>ID: ${user.userid}</small>
                    </div>
                    <button class="btn small" onclick="window.clansSystem.inviteMember('${userId}')">Пригласить</button>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Ошибка поиска:', error);
            resultsContainer.innerHTML = '<p>Ошибка поиска</p>';
        }
    }

    async inviteMember(userId) {
        if (!this.currentClan) return;
        
        if (this.currentClan.members.includes(userId)) {
            alert('Этот игрок уже в клане!');
            return;
        }
        
        try {
            // Проверяем что у игрока нет клана
            const targetUser = await this.gameData.getUserById(userId);
            if (targetUser.clanId) {
                alert('Этот игрок уже состоит в клане!');
                return;
            }
            
            // Проверяем нет ли уже приглашения
            const existingInvites = targetUser.clanInvites || [];
            if (existingInvites.some(inv => inv.clanId === this.currentClan.id)) {
                alert('Приглашение уже отправлено!');
                return;
            }
            
            // Создаем приглашение
            const invite = {
                clanId: this.currentClan.id,
                clanTag: this.currentClan.tag,
                clanName: this.currentClan.name,
                invitedBy: this.gameData.currentUser,
                inviterNick: this.gameData.getUser().nickname || this.gameData.getUser().username,
                timestamp: Date.now()
            };
            
            const updatedInvites = [...existingInvites, invite];
            
            // Сохраняем приглашение у пользователя
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`users/${userId}/clanInvites`).set(updatedInvites);
            } else {
                const users = JSON.parse(localStorage.getItem('dotaCardsUsers') || '{}');
                if (users[userId]) {
                    users[userId].clanInvites = updatedInvites;
                    localStorage.setItem('dotaCardsUsers', JSON.stringify(users));
                }
            }
            
            alert(`✅ Приглашение отправлено игроку!`);
            this.closeAddMemberModal();
            
        } catch (error) {
            console.error('Ошибка отправки приглашения:', error);
            alert('Ошибка: ' + error.message);
        }
    }
    
    async loadClanInvites() {
        const user = this.gameData.getUser();
        if (!user) return;
        
        const invites = user.clanInvites || [];
        
        // Показываем уведомление если есть приглашения
        const invitesContainer = document.getElementById('clan-invites-container');
        if (invitesContainer) {
            if (invites.length === 0) {
                invitesContainer.style.display = 'none';
                return;
            }
            
            invitesContainer.style.display = 'block';
            invitesContainer.innerHTML = `
                <div class="clan-invites-header">
                    <h3>📬 Приглашения в кланы (${invites.length})</h3>
                </div>
                ${invites.map((invite, index) => `
                    <div class="clan-invite-item">
                        <div class="invite-info">
                            <strong>[${invite.clanTag}] ${invite.clanName}</strong>
                            <br>
                            <small>От: ${invite.inviterNick}</small>
                        </div>
                        <div class="invite-actions">
                            <button class="btn small primary" onclick="window.clansSystem.acceptClanInvite(${index})">✅ Принять</button>
                            <button class="btn small secondary" onclick="window.clansSystem.rejectClanInvite(${index})">❌ Отказать</button>
                        </div>
                    </div>
                `).join('')}
            `;
        }
    }
    
    async acceptClanInvite(inviteIndex) {
        const user = this.gameData.getUser();
        const invites = user.clanInvites || [];
        
        if (!invites[inviteIndex]) {
            alert('Приглашение не найдено');
            return;
        }
        
        const invite = invites[inviteIndex];
        
        try {
            // Проверяем что клан еще существует
            const clan = await this.getClanById(invite.clanId);
            if (!clan) {
                alert('Клан больше не существует');
                // Удаляем приглашение
                await this.rejectClanInvite(inviteIndex);
                return;
            }
            
            // Проверяем лимит клана (максимум 5 человек)
            const currentMembers = clan.members || [];
            if (currentMembers.length >= 5) {
                await this.gameData.showAlert('Клан переполнен! Максимум 5 участников.', '⚠️', 'Ограничение');
                return;
            }
            
            // Добавляем в клан
            const updatedMembers = [...currentMembers, this.gameData.currentUser];
            
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`clans/${invite.clanId}/members`).set(updatedMembers);
            } else {
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                if (clans[invite.clanId]) {
                    clans[invite.clanId].members = updatedMembers;
                    localStorage.setItem('clans', JSON.stringify(clans));
                }
            }
            
            // Удаляем приглашение и сохраняем clanId
            const remainingInvites = invites.filter((_, i) => i !== inviteIndex);
            await this.gameData.saveUser({
                clanId: invite.clanId,
                clanInvites: remainingInvites
            });
            
            alert(`✅ Вы вступили в клан [${invite.clanTag}] ${invite.clanName}!`);
            await this.loadUserClan();
            await this.gameData.updateNicknameWithClanTag(user);
            
        } catch (error) {
            console.error('Ошибка принятия приглашения:', error);
            alert('Ошибка: ' + error.message);
        }
    }
    
    async rejectClanInvite(inviteIndex) {
        const user = this.gameData.getUser();
        const invites = user.clanInvites || [];
        
        if (!invites[inviteIndex]) {
            alert('Приглашение не найдено');
            return;
        }
        
        // Удаляем приглашение
        const remainingInvites = invites.filter((_, i) => i !== inviteIndex);
        await this.gameData.saveUser({ clanInvites: remainingInvites });
        
        alert('Приглашение отклонено');
        await this.loadClanInvites();
    }

    async removeMember(userId) {
        if (!this.currentClan) return;
        if (!confirm('Удалить этого участника из клана?')) return;
        
        try {
            const updatedMembers = this.currentClan.members.filter(id => id !== userId);
            
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`clans/${this.currentClan.id}/members`).set(updatedMembers);
                await firebase.database().ref(`users/${userId}/clanId`).set(null);
            } else {
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                if (clans[this.currentClan.id]) {
                    clans[this.currentClan.id].members = updatedMembers;
                    localStorage.setItem('clans', JSON.stringify(clans));
                }
            }
            
            alert('Участник удалён из клана');
            await this.loadUserClan();
            
        } catch (error) {
            console.error('Ошибка удаления участника:', error);
            alert('Ошибка: ' + error.message);
        }
    }

    openFindClans() {
        document.getElementById('no-clan-view').style.display = 'none';
        document.getElementById('find-clan-view').style.display = 'block';
    }

    closeFindClans() {
        document.getElementById('find-clan-view').style.display = 'none';
        document.getElementById('no-clan-view').style.display = 'block';
    }

    async searchClans() {
        const query = document.getElementById('clan-search').value.trim().toLowerCase();
        const resultsContainer = document.getElementById('clans-search-results');
        
        if (!query) {
            resultsContainer.innerHTML = '<p>Введите тег или название клана для поиска</p>';
            return;
        }
        
        resultsContainer.innerHTML = '<p>Поиск...</p>';
        
        try {
            let allClans = {};
            
            if (this.gameData.useFirebase) {
                const snapshot = await firebase.database().ref('clans').once('value');
                allClans = snapshot.val() || {};
            } else {
                allClans = JSON.parse(localStorage.getItem('clans') || '{}');
            }
            
            const results = Object.entries(allClans).filter(([clanId, clan]) => {
                const matchTag = (clan.tag || '').toLowerCase().includes(query);
                const matchName = (clan.name || '').toLowerCase().includes(query);
                return matchTag || matchName;
            });
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="no-results">Кланы не найдены</div>';
                return;
            }
            
            resultsContainer.innerHTML = results.map(([clanId, clan]) => `
                <div class="search-result-item">
                    <div class="clan-search-avatar">
                        ${this.renderClanAvatarString(clan.avatar)}
                    </div>
                    <div class="clan-search-info">
                        <strong>[${clan.tag}] ${clan.name}</strong>
                        <br>
                        <small>Уровень: ${clan.level || 1} • Членов: ${(clan.members || []).length}</small>
                        <br>
                        <small class="clan-desc">${clan.description || 'Нет описания'}</small>
                    </div>
                    <button class="btn small" onclick="window.clansSystem.requestJoinClan('${clanId}')">Вступить</button>
                </div>
            `).join('');
            
        } catch (error) {
            console.error('Ошибка поиска кланов:', error);
            resultsContainer.innerHTML = '<p>Ошибка поиска</p>';
        }
    }

    renderClanAvatarString(avatar) {
        if (!avatar) return '';
        const bg = this.clanAvatarParts.backgrounds[avatar.background || 0];
        const symbol = this.clanAvatarParts.symbols[avatar.symbol || 0];
        const color = this.clanAvatarParts.colors[avatar.color || 0];
        
        return `
            <div class="clan-avatar-mini">
                <div class="avatar-bg-mini">${bg}</div>
                <div class="avatar-symbol-mini" style="color: ${color}">${symbol}</div>
            </div>
        `;
    }

    async requestJoinClan(clanId) {
        try {
            const clan = await this.getClanById(clanId);
            if (!clan) {
                alert('Клан не найден');
                return;
            }
            
            const user = this.gameData.getUser();
            
            // Проверяем что у игрока нет клана
            if (user.clanId) {
                alert('Вы уже состоите в клане!');
                return;
            }
            
            // Проверяем нет ли уже запроса
            const existingRequests = clan.joinRequests || [];
            if (existingRequests.some(req => req.userId === this.gameData.currentUser)) {
                alert('Запрос уже отправлен!');
                return;
            }
            
            // Создаем запрос
            const request = {
                userId: this.gameData.currentUser,
                userNick: user.nickname || user.username,
                userLevel: user.level || 1,
                userId_display: user.userid,
                timestamp: Date.now()
            };
            
            const updatedRequests = [...existingRequests, request];
            
            // Сохраняем запрос в клане
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`clans/${clanId}/joinRequests`).set(updatedRequests);
            } else {
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                if (clans[clanId]) {
                    clans[clanId].joinRequests = updatedRequests;
                    localStorage.setItem('clans', JSON.stringify(clans));
                }
            }
            
            alert(`✅ Запрос на вступление в [${clan.tag}] ${clan.name} отправлен!`);
            this.closeFindClans();
            
        } catch (error) {
            console.error('Ошибка отправки запроса:', error);
            alert('Ошибка: ' + error.message);
        }
    }
    
    async loadJoinRequests() {
        if (!this.currentClan) return;
        
        // Проверяем что мы лидер
        const user = this.gameData.getUser();
        if (this.currentClan.leader !== this.gameData.currentUser) {
            return; // Только лидер видит запросы
        }
        
        const requests = this.currentClan.joinRequests || [];
        const requestsContainer = document.getElementById('clan-join-requests');
        
        if (!requestsContainer) return;
        
        if (requests.length === 0) {
            requestsContainer.style.display = 'none';
            return;
        }
        
        requestsContainer.style.display = 'block';
        requestsContainer.innerHTML = `
            <div class="join-requests-header">
                <h3>📝 Запросы на вступление (${requests.length})</h3>
            </div>
            ${requests.map((request, index) => `
                <div class="join-request-item">
                    <div class="request-info">
                        <strong>${request.userNick}</strong>
                        <br>
                        <small>ID: ${request.userId_display} • Уровень: ${request.userLevel}</small>
                    </div>
                    <div class="request-actions">
                        <button class="btn small primary" onclick="window.clansSystem.acceptJoinRequest(${index})">✅ Принять</button>
                        <button class="btn small secondary" onclick="window.clansSystem.rejectJoinRequest(${index})">❌ Отклонить</button>
                    </div>
                </div>
            `).join('')}
        `;
    }
    
    async acceptJoinRequest(requestIndex) {
        if (!this.currentClan) return;
        
        const requests = this.currentClan.joinRequests || [];
        if (!requests[requestIndex]) {
            alert('Запрос не найден');
            return;
        }
        
        const request = requests[requestIndex];
        
        try {
            // Проверяем что игрок еще не в клане
            const targetUser = await this.gameData.getUserById(request.userId);
            if (targetUser.clanId) {
                alert('Этот игрок уже вступил в другой клан');
                await this.rejectJoinRequest(requestIndex);
                return;
            }
            
            // Добавляем в клан
            const updatedMembers = [...(this.currentClan.members || []), request.userId];
            const remainingRequests = requests.filter((_, i) => i !== requestIndex);
            
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`clans/${this.currentClan.id}/members`).set(updatedMembers);
                await firebase.database().ref(`clans/${this.currentClan.id}/joinRequests`).set(remainingRequests);
                await firebase.database().ref(`users/${request.userId}/clanId`).set(this.currentClan.id);
            } else {
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                if (clans[this.currentClan.id]) {
                    clans[this.currentClan.id].members = updatedMembers;
                    clans[this.currentClan.id].joinRequests = remainingRequests;
                    localStorage.setItem('clans', JSON.stringify(clans));
                }
                
                const users = JSON.parse(localStorage.getItem('dotaCardsUsers') || '{}');
                if (users[request.userId]) {
                    users[request.userId].clanId = this.currentClan.id;
                    localStorage.setItem('dotaCardsUsers', JSON.stringify(users));
                }
            }
            
            alert(`✅ Игрок ${request.userNick} принят в клан!`);
            await this.loadUserClan();
            
        } catch (error) {
            console.error('Ошибка принятия запроса:', error);
            alert('Ошибка: ' + error.message);
        }
    }
    
    async rejectJoinRequest(requestIndex) {
        if (!this.currentClan) return;
        
        const requests = this.currentClan.joinRequests || [];
        if (!requests[requestIndex]) return;
        
        const remainingRequests = requests.filter((_, i) => i !== requestIndex);
        
        try {
            if (this.gameData.useFirebase) {
                await firebase.database().ref(`clans/${this.currentClan.id}/joinRequests`).set(remainingRequests);
            } else {
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                if (clans[this.currentClan.id]) {
                    clans[this.currentClan.id].joinRequests = remainingRequests;
                    localStorage.setItem('clans', JSON.stringify(clans));
                }
            }
            
            alert('Запрос отклонен');
            await this.loadUserClan();
            
        } catch (error) {
            console.error('Ошибка отклонения запроса:', error);
        }
    }

    async updateClanUI() {
        console.log('🔄 Обновление UI кланов...');
        try {
            // Загружаем клан пользователя и приглашения
            await this.loadUserClan();
        } catch (error) {
            console.error('❌ Ошибка обновления UI кланов:', error);
            this.showNoClanView();
        }
    }

    async addClanExp(amount) {
        console.log('🏰 addClanExp вызван, amount:', amount);
        console.log('   - currentClan:', this.currentClan);
        
        if (!this.currentClan) {
            console.log('⚠️ currentClan не установлен');
            return;
        }
        
        try {
            const oldExp = this.currentClan.exp || 0;
            const newExp = oldExp + amount;
            const expNeeded = (this.currentClan.level || 1) * 100;
            
            console.log('📊 Опыт клана:');
            console.log('   - Было:', oldExp);
            console.log('   - Добавляем:', amount);
            console.log('   - Станет:', newExp);
            console.log('   - Нужно для lvl up:', expNeeded);
            
            let newLevel = this.currentClan.level || 1;
            let finalExp = newExp;
            
            if (newExp >= expNeeded) {
                newLevel++;
                finalExp = 0;
                console.log(`🎉 Клан повысил уровень до ${newLevel}!`);
            }
            
            if (this.gameData.useFirebase) {
                console.log('☁️ Обновляем опыт клана в Firebase...');
                await firebase.database().ref(`clans/${this.currentClan.id}`).update({
                    level: newLevel,
                    exp: finalExp
                });
                console.log('✅ Опыт клана обновлен в Firebase');
            } else {
                console.log('💾 Обновляем опыт клана в localStorage...');
                const clans = JSON.parse(localStorage.getItem('clans') || '{}');
                if (clans[this.currentClan.id]) {
                    clans[this.currentClan.id].level = newLevel;
                    clans[this.currentClan.id].exp = finalExp;
                    localStorage.setItem('clans', JSON.stringify(clans));
                    console.log('✅ Опыт клана обновлен в localStorage');
                } else {
                    console.error('❌ Клан не найден в localStorage!');
                }
            }
            
            // Обновляем локальный объект
            this.currentClan.level = newLevel;
            this.currentClan.exp = finalExp;
            
            console.log('🔄 Перезагружаем информацию о клане...');
            await this.loadUserClan();
            console.log('✅ Информация о клане обновлена');
            
        } catch (error) {
            console.error('Ошибка добавления опыта клану:', error);
        }
    }
}

// Глобальная переменная для доступа из HTML
window.clansSystem = null;

// Инициализация при загрузке
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initClansSystem);
} else {
    initClansSystem();
}

function initClansSystem() {
    console.log('🏰 Инициализация системы кланов...');
    // Ждём пока gameData будет готов
    const interval = setInterval(() => {
        if (window.gameData) {
            console.log('✅ gameData найден, создаём ClansSystem');
            window.clansSystem = new ClansSystem(window.gameData);
            window.clansSystem.init();
            clearInterval(interval);
        }
    }, 100);
}


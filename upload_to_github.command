#!/bin/bash

# Скрипт загрузки игры на GitHub
# Двойной клик для запуска

echo "═══════════════════════════════════════════════════════════════"
echo "  📤 ЗАГРУЗКА DOTA CARDS НА GITHUB"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Переход в директорию проекта
cd "$(dirname "$0")"
echo "📁 Текущая директория: $(pwd)"
echo ""

# Проверка наличия git
if ! command -v git &> /dev/null; then
    echo "❌ Git не установлен!"
    echo "Установите git: https://git-scm.com/download/mac"
    echo ""
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

# Проверка инициализации git
if [ ! -d ".git" ]; then
    echo "🔧 Инициализация git репозитория..."
    git init
    echo "✅ Git репозиторий создан"
    echo ""
fi

# Запрос ссылки на репозиторий
echo "📝 Введите ссылку на ваш GitHub репозиторий:"
echo "Пример: https://github.com/username/dota-cards.git"
echo ""
read -p "Ссылка: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Ссылка не введена!"
    echo ""
    read -p "Нажмите Enter для выхода..."
    exit 1
fi

# Проверка наличия remote
if git remote | grep -q origin; then
    echo "🔄 Remote 'origin' уже существует, обновляем..."
    git remote set-url origin "$REPO_URL"
else
    echo "🔗 Добавление remote репозитория..."
    git remote add origin "$REPO_URL"
fi

echo "✅ Remote добавлен: $REPO_URL"
echo ""

# Добавление файлов
echo "📦 Добавление файлов..."
git add .
echo "✅ Файлы добавлены"
echo ""

# Запрос описания коммита
echo "📝 Введите описание изменений:"
read -p "Описание: " COMMIT_MSG

if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update DOTA CARDS Game"
fi

# Коммит
echo "💾 Создание коммита: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"
echo ""

# Переименование ветки в main
echo "🔀 Переименование ветки в main..."
git branch -M main
echo ""

# Загрузка на GitHub
echo "📤 Загрузка на GitHub..."
echo "⏳ Пожалуйста, подождите..."
echo ""

git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ✅ УСПЕШНО ЗАГРУЖЕНО НА GITHUB!"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "🌐 Ваш репозиторий: $REPO_URL"
    echo ""
    echo "🎯 Что дальше:"
    echo "   1. Откройте репозиторий на GitHub"
    echo "   2. Проверьте что все файлы загружены"
    echo "   3. (Опционально) Включите GitHub Pages в Settings → Pages"
    echo ""
else
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ❌ ОШИБКА ЗАГРУЗКИ"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    echo "Возможные причины:"
    echo "   1. Неверная ссылка на репозиторий"
    echo "   2. Требуется авторизация"
    echo "   3. Нет прав доступа к репозиторию"
    echo ""
    echo "Решение:"
    echo "   1. Проверьте ссылку на репозиторий"
    echo "   2. Используйте Personal Access Token"
    echo "   3. См. файл КАК_ВЫЛОЖИТЬ_НА_GITHUB.txt"
    echo ""
fi

echo "═══════════════════════════════════════════════════════════════"
read -p "Нажмите Enter для выхода..."


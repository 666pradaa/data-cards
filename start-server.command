#!/bin/bash
cd "$(dirname "$0")"
echo "🎮 Запуск DOTA CARDS сервера..."
echo ""
echo "Сервер запущен! Откройте в браузере:"
echo "👉 http://localhost:8000"
echo ""
echo "Для остановки нажмите Ctrl+C"
echo ""
python3 -m http.server 8000


@echo off
chcp 65001 >nul
echo ========================================
echo    文件管理系統 - 啟動中...
echo ========================================
echo.

echo [1/2] 啟動後端伺服器 (Port 3001)...
start "文件管理-後端" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 2 /nobreak >nul

echo [2/2] 啟動前端應用程式 (Port 3000)...
start "文件管理-前端" cmd /k "cd /d %~dp0frontend && npm start"

echo.
echo ========================================
echo  啟動完成！請稍候瀏覽器自動開啟
echo  前端: http://localhost:3000
echo  後端: http://localhost:3001
echo ========================================
pause

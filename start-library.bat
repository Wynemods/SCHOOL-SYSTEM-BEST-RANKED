@echo off
echo 🏫 Starting School Library System...
echo.

echo 📊 Checking if system is already running...
netstat -an | find "3000" > nul
if %errorlevel% equ 0 (
    echo ❌ Port 3000 is already in use!
    echo 💡 The library system might already be running.
    echo 🌐 Try accessing: http://localhost:3000
    pause
    exit /b 1
)

echo ✅ Port 3000 is available
echo.

echo 🚀 Starting library system...
echo 📖 This will open the system in your default browser
echo.

npm start

echo.
echo 🎉 Library system started successfully!
echo 🌐 Access at: http://localhost:3000
echo.
echo 💡 To stop the system, press Ctrl+C in the terminal
echo.
pause 
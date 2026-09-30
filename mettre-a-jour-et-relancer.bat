@echo off
cd /d "%~dp0"
echo === Mise a jour du schema de la base de donnees ===
call npx prisma db push --accept-data-loss
if errorlevel 1 (
  echo Erreur pendant la mise a jour du schema Prisma - verifiez DATABASE_URL dans .env
  pause
  exit /b 1
)
echo.
echo === Generation du client Prisma ===
call npx prisma generate
echo.
echo === Arret de l'ancien serveur sur le port 3000, si present ===
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
echo.
echo === Redemarrage du site sur http://localhost:3000 ===
echo Laissez cette fenetre ouverte tant que vous utilisez le site.
call npm run dev
pause

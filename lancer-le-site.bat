@echo off
cd /d "%~dp0"
echo === Verification de Node.js ===
node -v
if errorlevel 1 (
  echo Node.js n'est pas installe ou pas dans le PATH.
  echo Installez node-v24.20.0-x64.msi dans vos Telechargements puis relancez ce script.
  pause
  exit /b 1
)
echo.
echo === Installation des dependances (1-2 minutes) ===
call npm install
if errorlevel 1 (
  echo Erreur pendant npm install.
  pause
  exit /b 1
)
echo.
echo === Creation des tables dans la base de donnees ===
call npx prisma migrate dev --name init
if errorlevel 1 (
  echo Erreur pendant la migration Prisma - verifiez DATABASE_URL dans .env
  pause
  exit /b 1
)
echo.
echo === Creation des donnees de demonstration ===
call npm run prisma:seed
if errorlevel 1 (
  echo Erreur pendant le seed.
  pause
  exit /b 1
)
echo.
echo === Demarrage du site sur http://localhost:3000 ===
echo Laissez cette fenetre ouverte tant que vous utilisez le site.
call npm run dev
pause
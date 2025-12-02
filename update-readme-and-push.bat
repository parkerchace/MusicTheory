@echo off
echo.
echo ========================================
echo   Update README + Push to GitHub
echo ========================================
echo.

echo [1/3] Updating README module table...
node tools\update_readme.js

echo.
echo [2/3] Staging changes...
git add README.md

echo.
echo [3/3] Committing and pushing...
git commit -m "docs: auto-update README module table"
git push

echo.
echo ========================================
echo   Complete!
echo ========================================
echo.
pause

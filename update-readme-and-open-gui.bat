@echo off
echo.
echo ========================================
echo   Update README + Open Git GUI
echo ========================================
echo.

echo Updating README module table...
node tools\update_readme.js

echo.
echo Opening Git Push GUI...
python git_push_gui.py

exit

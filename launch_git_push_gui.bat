@echo off
REM Launch the MusicTheory Git Push GUI from this folder
REM This batch file can be double-clicked in Explorer.

pushd "%~dp0"
python "%~dp0git_push_gui.py"
popd

exit /b %ERRORLEVEL%

# MusicTheory Git Push GUI

Simple Tkinter GUI to help stage, commit, and push changes to the repository.

Usage (Windows PowerShell):

1. Ensure Python 3.8+ is installed and `git` is on PATH. Tkinter is required (usually bundled with standard Windows Python installers).

2. Launch from the repository root (this file is in the repo root):

   python .\git_push_gui.py

3. The GUI shows changed files, allows staging, committing with a message, and pushing the current branch to `origin`.

Notes and troubleshooting:
- The script runs `git` commands via subprocess and assumes the repo is already initialized and that your SSH key is configured for `git@github.com:parkerchace/MusicTheory.git`.
- If you do not have SSH set up, either configure SSH or change the remote URL (HTTPS) in the Remote URL field and click "Set Remote".
- If `git` is not found, install Git for Windows and ensure it is on your PATH.
- If tkinter import fails, install a Python build that includes tkinter or install the Windows Tk package.

Security: this tool runs shell commands locally; do not run untrusted code.

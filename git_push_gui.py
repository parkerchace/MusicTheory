import os
import subprocess
import sys
import threading
import webbrowser
try:
    import tkinter as tk
    from tkinter import ttk, messagebox
except Exception:
    print("tkinter is required to run this GUI. On Windows install the 'tk' package for your Python.")
    raise


REPO_ROOT = os.path.abspath(os.path.dirname(__file__))


def run_git(args):
    """Run a git command in the repo root and return (returncode, stdout, stderr)."""
    try:
        p = subprocess.run(["git"] + args, cwd=REPO_ROOT, capture_output=True, text=True)
        return p.returncode, p.stdout.strip(), p.stderr.strip()
    except FileNotFoundError:
        return 127, "", "git not found on PATH"


class GitPushGUI:
    def __init__(self, root):
        self.root = root
        root.title("MusicTheory Git Push Tool")
        root.geometry("900x600")

        self.files = []  # list of filenames from git status

        top = ttk.Frame(root)
        top.pack(fill=tk.X, padx=8, pady=6)

        ttk.Label(top, text="Repository:").pack(side=tk.LEFT)
        ttk.Label(top, text=REPO_ROOT).pack(side=tk.LEFT, padx=6)

        branch = self.get_branch()
        self.branch_var = tk.StringVar(value=branch)
        ttk.Label(top, text="Branch:").pack(side=tk.LEFT, padx=(12, 0))
        ttk.Label(top, textvariable=self.branch_var).pack(side=tk.LEFT, padx=6)

    # Status / repo initialization area
        self.status_frame = ttk.Frame(root)
        self.status_frame.pack(fill=tk.X, padx=8, pady=(0,6))
        self.status_label = ttk.Label(self.status_frame, text="")
        self.status_label.pack(side=tk.LEFT)
        ttk.Button(self.status_frame, text="Initialize repo here", command=self.init_repo).pack(side=tk.RIGHT)
        # small remote initializer
        self.init_remote_var = tk.StringVar(value=self.get_remote_url() or "git@github.com:parkerchace/MusicTheory.git")
        init_remote_entry = ttk.Entry(self.status_frame, textvariable=self.init_remote_var, width=48)
        init_remote_entry.pack(side=tk.RIGHT, padx=(6,6))
        ttk.Button(self.status_frame, text="Init + set origin", command=self.init_and_set_remote).pack(side=tk.RIGHT)
        ttk.Button(self.status_frame, text="Connect Wizard", command=self.open_wizard).pack(side=tk.RIGHT, padx=(6,0))

        # Middle pane: file list and controls
        mid = ttk.Frame(root)
        mid.pack(fill=tk.BOTH, expand=True, padx=8, pady=6)

        left = ttk.Frame(mid)
        left.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        ttk.Label(left, text="Changed files (select to stage)").pack(anchor=tk.W)

        self.file_listbox = tk.Listbox(left, selectmode=tk.EXTENDED)
        self.file_listbox.pack(fill=tk.BOTH, expand=True)

        btn_row = ttk.Frame(left)
        btn_row.pack(fill=tk.X, pady=6)

        ttk.Button(btn_row, text="Stage Selected", command=self.stage_selected).pack(side=tk.LEFT)
        ttk.Button(btn_row, text="Stage All", command=self.stage_all).pack(side=tk.LEFT, padx=6)
        ttk.Button(btn_row, text="Refresh", command=self.refresh_status).pack(side=tk.LEFT, padx=6)

        right = ttk.Frame(mid)
        right.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(12,0))

        ttk.Label(right, text="Commit message").pack(anchor=tk.W)
        self.msg_entry = tk.Text(right, height=4)
        self.msg_entry.pack(fill=tk.X)

        cbtn_row = ttk.Frame(right)
        cbtn_row.pack(fill=tk.X, pady=6)
        ttk.Button(cbtn_row, text="Commit", command=self.commit).pack(side=tk.LEFT)
        ttk.Button(cbtn_row, text="Pull", command=self.pull).pack(side=tk.LEFT, padx=6)
        ttk.Button(cbtn_row, text="Push", command=self.push).pack(side=tk.LEFT, padx=6)

        # Remote controls
        ttk.Label(right, text="Remote URL (origin)").pack(anchor=tk.W, pady=(8,0))
        self.remote_var = tk.StringVar(value=self.get_remote_url() or "git@github.com:parkerchace/MusicTheory.git")
        rframe = ttk.Frame(right)
        rframe.pack(fill=tk.X)
        ttk.Entry(rframe, textvariable=self.remote_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(rframe, text="Set Remote", command=self.set_remote).pack(side=tk.LEFT, padx=6)
        ttk.Button(rframe, text="Open origin", command=self.open_origin_in_browser).pack(side=tk.LEFT, padx=6)

        # Troubleshooting controls
        tst = ttk.LabelFrame(right, text="Troubleshoot SSH/HTTPS")
        tst.pack(fill=tk.X, pady=(8,0))
        tbtn_row = ttk.Frame(tst)
        tbtn_row.pack(fill=tk.X, padx=6, pady=6)
        ttk.Button(tbtn_row, text="Test SSH auth", command=self.test_ssh).pack(side=tk.LEFT)
        ttk.Button(tbtn_row, text="List SSH keys", command=self.list_ssh_keys).pack(side=tk.LEFT, padx=6)
        ttk.Button(tbtn_row, text="Add default key to agent", command=self.add_key_to_agent).pack(side=tk.LEFT, padx=6)
        ttk.Button(tbtn_row, text="Copy pubkey to clipboard", command=self.copy_pubkey_to_clipboard).pack(side=tk.LEFT, padx=6)
        ttk.Button(tbtn_row, text="Switch origin → HTTPS", command=self.switch_remote_to_https).pack(side=tk.LEFT, padx=6)
        ttk.Button(tbtn_row, text="Create GitHub repo", command=self.open_github_new_repo).pack(side=tk.LEFT, padx=6)
        self.ssh_keys_label = ttk.Label(tst, text="")
        self.ssh_keys_label.pack(anchor=tk.W, padx=6)

        # Output console
        outlabel = ttk.Label(root, text="Git Output")
        outlabel.pack(anchor=tk.W, padx=8)
        self.output = tk.Text(root, height=12)
        self.output.pack(fill=tk.BOTH, expand=False, padx=8, pady=(0,8))

        self.refresh_status()

    def append_output(self, text):
        self.output.insert(tk.END, text + "\n")
        self.output.see(tk.END)

    def get_branch(self):
        code, out, err = run_git(["rev-parse", "--abbrev-ref", "HEAD"])
        if code == 0:
            return out
        return "(no branch)"

    def get_remote_url(self):
        code, out, err = run_git(["remote", "get-url", "origin"])
        if code == 0:
            return out
        return None

    def refresh_status(self):
        code, out, err = run_git(["status", "--porcelain"])
        self.file_listbox.delete(0, tk.END)
        self.files = []
        if code != 0:
            # Special-case: not a git repository
            msg = (err or out)
            if msg and 'not a git repository' in msg.lower():
                self.status_label.config(text="Not a git repository. Use the buttons to initialize.")
                self.append_output("Not a git repository. You can initialize a repo here or set a remote and initialize.")
                return
            self.append_output("git status failed: " + msg)
            return
        for line in out.splitlines():
            if not line.strip():
                continue
            # porcelain: XY filename
            parts = line[3:]
            filename = parts.strip()
            self.files.append(filename)
            self.file_listbox.insert(tk.END, line)
        self.branch_var.set(self.get_branch())
        self.append_output("Refreshed status. {} changed paths.".format(len(self.files)))

    def stage_selected(self):
        sel = self.file_listbox.curselection()
        if not sel:
            messagebox.showinfo("No selection", "Select files to stage first")
            return
        files = [self.files[i] for i in sel]
        code, out, err = run_git(["add", "--"] + files)
        if code == 0:
            self.append_output("Staged: {}".format(", ".join(files)))
        else:
            self.append_output("git add failed: {} {}".format(out, err))
        self.refresh_status()

    def stage_all(self):
        code, out, err = run_git(["add", "--all"])
        if code == 0:
            self.append_output("Staged all changes")
        else:
            self.append_output("git add --all failed: {} {}".format(out, err))
        self.refresh_status()

    def commit(self):
        msg = self.msg_entry.get("1.0", tk.END).strip()
        if not msg:
            messagebox.showinfo("Empty message", "Enter a commit message first")
            return
        code, out, err = run_git(["commit", "-m", msg])
        if code == 0:
            self.append_output("Commit succeeded: {}".format(out))
            self.msg_entry.delete("1.0", tk.END)
        else:
            self.append_output("git commit failed: {} {}".format(out, err))
        self.refresh_status()

    def pull(self):
        branch = self.get_branch()
        code, out, err = run_git(["pull", "origin", branch])
        if code == 0:
            self.append_output("Pull succeeded: {}".format(out))
        else:
            self.append_output("git pull failed: {} {}".format(out, err))
        self.refresh_status()

    def push(self):
        branch = self.get_branch()
        if not branch or branch == "HEAD":
            messagebox.showerror("No branch", "Cannot determine current branch to push")
            return
        # push may prompt for SSH agent; assumes git/ssh already set up
        self.append_output("Pushing branch {} to origin...".format(branch))
        def do_push():
            code, out, err = run_git(["push", "origin", branch])
            if code == 0:
                self.append_output("Push succeeded: {}".format(out or "(no output)"))
            else:
                self.append_output("git push failed: {} {}".format(out, err))
            self.refresh_status()
        threading.Thread(target=do_push, daemon=True).start()

    def set_remote(self):
        url = self.remote_var.get().strip()
        if not url:
            messagebox.showinfo("Empty remote", "Enter a remote URL")
            return
        # if origin exists, set-url, else add
        code, out, err = run_git(["remote", "get-url", "origin"])
        if code == 0:
            code2, out2, err2 = run_git(["remote", "set-url", "origin", url])
            if code2 == 0:
                self.append_output("Updated origin URL to {}".format(url))
            else:
                self.append_output("Failed to set remote URL: {} {}".format(out2, err2))
        else:
            code2, out2, err2 = run_git(["remote", "add", "origin", url])
            if code2 == 0:
                self.append_output("Added origin remote {}".format(url))
            else:
                self.append_output("Failed to add remote: {} {}".format(out2, err2))

    def init_repo(self):
        """Initialize a git repository in this folder."""
        code, out, err = run_git(["init"])
        if code == 0:
            self.append_output("Initialized empty git repository.")
        else:
            self.append_output("git init failed: {} {}".format(out, err))
            return
        # After init, refresh status
        self.refresh_status()

    def init_and_set_remote(self):
        url = self.init_remote_var.get().strip()
        if not url:
            messagebox.showinfo("Empty remote", "Enter a remote URL to set as origin")
            return
        # init first
        code, out, err = run_git(["init"])
        if code != 0:
            self.append_output("git init failed: {} {}".format(out, err))
            return
        # add remote
        code2, out2, err2 = run_git(["remote", "add", "origin", url])
        if code2 == 0:
            self.append_output("Initialized repo and added origin {}".format(url))
        else:
            self.append_output("Failed to add remote after init: {} {}".format(out2, err2))
        self.refresh_status()

    # ---------------- troubleshooting helpers ----------------
    def test_ssh(self):
        """Run a non-interactive SSH test to GitHub and display the result."""
        try:
            p = subprocess.run(["ssh", "-T", "-o", "BatchMode=yes", "git@github.com"], capture_output=True, text=True)
            out = p.stdout.strip() or p.stderr.strip()
            self.append_output("ssh test: returncode={} output={}".format(p.returncode, out))
            # Try to detect deploy key vs user key based on greeting
            # Example: "Hi username! ..." or "Hi owner/repo! ..."
            if "Hi " in out and "!" in out:
                try:
                    greet = out.split("Hi ", 1)[1].split("!", 1)[0]
                    if "/" in greet:
                        self.append_output("Note: This looks like a deploy key identity ({}). Deploy keys may be read-only unless 'Allow write' is enabled.".format(greet))
                        self.append_output("Tip: Use a personal SSH key added to your GitHub account for full access, or switch origin to HTTPS.")
                    else:
                        self.append_output("Authenticated as GitHub user: {}".format(greet))
                except Exception:
                    pass
        except FileNotFoundError:
            self.append_output("ssh not found on PATH")

    def list_ssh_keys(self):
        ssh_dir = os.path.join(os.path.expanduser('~'), '.ssh')
        if not os.path.isdir(ssh_dir):
            self.append_output("No ~/.ssh directory found at {}".format(ssh_dir))
            self.ssh_keys_label.config(text="No SSH keys found")
            return
        files = os.listdir(ssh_dir)
        pubs = [f for f in files if f.endswith('.pub')]
        if not pubs:
            self.append_output("No public keys (.pub) found in {}".format(ssh_dir))
            self.ssh_keys_label.config(text="No public keys found in {}".format(ssh_dir))
            return
        self.ssh_pubkeys = [os.path.join(ssh_dir, p) for p in pubs]
        self.ssh_keys_label.config(text="Found pubkeys: {}".format(', '.join(pubs)))
        self.append_output("SSH public keys found: {}".format(', '.join(self.ssh_pubkeys)))

    def copy_pubkey_to_clipboard(self):
        # copy the first discovered pubkey to clipboard (safe default)
        try:
            keypath = getattr(self, 'ssh_pubkeys', [None])[0]
            if not keypath or not os.path.isfile(keypath):
                self.append_output("No public key available to copy. Run 'List SSH keys' first.")
                return
            with open(keypath, 'r', encoding='utf-8') as fh:
                content = fh.read().strip()
            # Validate key begins with an accepted algorithm prefix
            allowed_prefixes = (
                'ssh-rsa',
                'ecdsa-sha2-nistp256',
                'ecdsa-sha2-nistp384',
                'ecdsa-sha2-nistp521',
                'ssh-ed25519',
                'sk-ecdsa-sha2-nistp256@openssh.com',
                'sk-ssh-ed25519@openssh.com',
            )
            first_line = content.splitlines()[0] if content else ''
            if not any(first_line.startswith(p) for p in allowed_prefixes):
                # try to find a valid-looking line inside the file
                candidate = None
                for ln in content.splitlines():
                    s = ln.strip()
                    if any(s.startswith(p) for p in allowed_prefixes):
                        candidate = s
                        break
                if candidate:
                    content_to_copy = candidate
                    self.append_output(f"Found valid public key line in {keypath}; copying that line.")
                else:
                    # Not a valid public key file (maybe user picked private key). Help the user.
                    self.append_output(f"Public key at {keypath} does not start with a known key algorithm prefix.")
                    self.append_output("Make sure you copy the contents of the .pub file (the public key), not your private key.\nHere is the file content:\n" + content)
                    messagebox.showerror("Invalid public key", "The selected file doesn't look like a valid SSH public key for GitHub. Open the .pub file and copy the line beginning with 'ssh-rsa' or 'ssh-ed25519' etc.")
                    return
            else:
                content_to_copy = first_line

            # use tkinter clipboard
            try:
                self.root.clipboard_clear()
                self.root.clipboard_append(content_to_copy)
                self.append_output("Public key copied to clipboard from {}".format(keypath))
                messagebox.showinfo("Copied", "Public key copied to clipboard. Paste it into GitHub: https://github.com/settings/keys")
            except Exception:
                # fallback: print to output
                self.append_output("Could not copy to clipboard; here is the key:\n{}".format(content_to_copy))
        except Exception as e:
            self.append_output("Error copying pubkey: {}".format(e))

    def add_key_to_agent(self):
        # attempt to add common default key names
        ssh_dir = os.path.join(os.path.expanduser('~'), '.ssh')
        candidates = [os.path.join(ssh_dir, 'id_ed25519'), os.path.join(ssh_dir, 'id_rsa')]
        key = None
        for c in candidates:
            if os.path.isfile(c):
                key = c
                break
        if not key:
            self.append_output("No default private key found to add. Create one with ssh-keygen.")
            return
        try:
            p = subprocess.run(["ssh-add", key], capture_output=True, text=True)
            out = p.stdout.strip() or p.stderr.strip()
            self.append_output("ssh-add {} -> rc={} output={}".format(key, p.returncode, out))
        except FileNotFoundError:
            self.append_output("ssh-add not found on PATH; ensure OpenSSH client is installed.")

    def switch_remote_to_https(self):
        # convert git@github.com:owner/repo.git to https://github.com/owner/repo.git
        url = self.remote_var.get().strip()
        if url.startswith('git@github.com:'):
            path = url.split(':', 1)[1]
            https = 'https://github.com/' + path
        elif url.startswith('https://'):
            https = url
        else:
            # try to construct using repo info if possible
            self.append_output('Cannot parse origin URL to convert to HTTPS: {}'.format(url))
            return
        code, out, err = run_git(["remote", "set-url", "origin", https])
        if code == 0:
            self.remote_var.set(https)
            self.append_output("Remote origin switched to {}".format(https))
        else:
            self.append_output("Failed to set remote to HTTPS: {} {}".format(out, err))

    def open_origin_in_browser(self):
        url = self.remote_var.get().strip()
        if not url:
            messagebox.showinfo("No remote", "No origin URL configured")
            return
        if url.startswith('git@github.com:'):
            path = url.split(':', 1)[1]
            url = 'https://github.com/' + path
        webbrowser.open(url)

    def open_github_new_repo(self):
        # Prefill the repo name from folder or origin
        repo_name = os.path.basename(REPO_ROOT).strip() or 'MusicTheory'
        url = f"https://github.com/new?name={repo_name}"
        webbrowser.open(url)

    # ---------------- Connect Wizard ----------------
    def open_wizard(self):
        w = tk.Toplevel(self.root)
        w.title('Connect Wizard')
        w.geometry('700x520')

        help_text = tk.Text(w, height=4, wrap=tk.WORD)
        help_text.insert(tk.END, "This wizard helps you connect this folder to GitHub. Follow the steps below in order. Use the buttons in each section to perform actions; output appears in the main window.\n")
        help_text.config(state=tk.DISABLED)
        help_text.pack(fill=tk.X, padx=8, pady=6)

        # Step 1: Repo status
        lf1 = ttk.LabelFrame(w, text='Step 1 — Repository')
        lf1.pack(fill=tk.X, padx=8, pady=6)
        repo_status = ttk.Label(lf1, text=self._repo_status_text())
        repo_status.pack(side=tk.LEFT, padx=6, pady=6)
        ttk.Button(lf1, text='Initialize repo here', command=lambda: [self.init_repo(), repo_status.config(text=self._repo_status_text())]).pack(side=tk.RIGHT, padx=6)

        # Step 2: Remote
        lf2 = ttk.LabelFrame(w, text='Step 2 — Remote')
        lf2.pack(fill=tk.X, padx=8, pady=6)
        remote_entry_var = tk.StringVar(value=self.get_remote_url() or 'git@github.com:parkerchace/MusicTheory.git')
        ttk.Label(lf2, text='Origin:').pack(side=tk.LEFT, padx=(6,2))
        ttk.Entry(lf2, textvariable=remote_entry_var, width=60).pack(side=tk.LEFT, padx=6)
        ttk.Button(lf2, text='Set origin', command=lambda: [self.remote_var.set(remote_entry_var.get()), self.set_remote(), repo_status.config(text=self._repo_status_text())]).pack(side=tk.LEFT, padx=6)

        # Step 3: Authentication
        lf3 = ttk.LabelFrame(w, text='Step 3 — Authentication (SSH)')
        lf3.pack(fill=tk.X, padx=8, pady=6)
        ttk.Button(lf3, text='Test SSH auth', command=self.test_ssh).pack(side=tk.LEFT, padx=6, pady=6)
        ttk.Button(lf3, text='List SSH keys', command=self.list_ssh_keys).pack(side=tk.LEFT, padx=6, pady=6)
        ttk.Button(lf3, text='Generate key (ed25519)', command=self.generate_ssh_key).pack(side=tk.LEFT, padx=6, pady=6)
        ttk.Button(lf3, text='Copy pubkey to clipboard', command=self.copy_pubkey_to_clipboard).pack(side=tk.LEFT, padx=6, pady=6)
        ttk.Button(lf3, text='Add default key to agent', command=self.add_key_to_agent).pack(side=tk.LEFT, padx=6, pady=6)
        ttk.Button(lf3, text='Open GitHub SSH keys page', command=lambda: webbrowser.open('https://github.com/settings/keys')).pack(side=tk.LEFT, padx=6, pady=6)

        # Step 4: Fallback
        lf4 = ttk.LabelFrame(w, text='Alternative — HTTPS')
        lf4.pack(fill=tk.X, padx=8, pady=6)
        ttk.Button(lf4, text='Switch origin → HTTPS', command=self.switch_remote_to_https).pack(side=tk.LEFT, padx=6, pady=6)

        # Step 5: Initial commit & push
        lf5 = ttk.LabelFrame(w, text='Step 5 — Commit & Push')
        lf5.pack(fill=tk.X, padx=8, pady=6)
        ttk.Button(lf5, text='Stage all', command=self.stage_all).pack(side=tk.LEFT, padx=6, pady=6)
        commit_msg_var = tk.StringVar(value='Initial commit')
        ttk.Entry(lf5, textvariable=commit_msg_var, width=48).pack(side=tk.LEFT, padx=6)
        ttk.Button(lf5, text='Commit', command=lambda: self._wizard_commit(commit_msg_var.get())).pack(side=tk.LEFT, padx=6)
        ttk.Button(lf5, text='Push', command=self.push).pack(side=tk.LEFT, padx=6)

        ttk.Button(w, text='Close', command=w.destroy).pack(side=tk.RIGHT, padx=8, pady=8)

    def _repo_status_text(self):
        # returns a short status about whether this folder is a git repo
        code, out, err = run_git(['rev-parse', '--is-inside-work-tree'])
        if code == 0 and out.strip() == 'true':
            return 'This folder is a git repository.'
        return 'Not a git repository.'

    def generate_ssh_key(self):
        ssh_dir = os.path.join(os.path.expanduser('~'), '.ssh')
        os.makedirs(ssh_dir, exist_ok=True)
        keypath = os.path.join(ssh_dir, 'id_ed25519')
        if os.path.exists(keypath):
            self.append_output('Key already exists at {} — will not overwrite'.format(keypath))
            return
        try:
            p = subprocess.run(['ssh-keygen', '-t', 'ed25519', '-C', 'generated-by-gui', '-f', keypath, '-N', ''], capture_output=True, text=True)
            out = p.stdout.strip() or p.stderr.strip()
            self.append_output('ssh-keygen rc={} output={}'.format(p.returncode, out))
            if p.returncode == 0:
                self.list_ssh_keys()
        except FileNotFoundError:
            self.append_output('ssh-keygen not found on PATH')

    def _wizard_commit(self, msg):
        if not msg:
            messagebox.showinfo('Empty message', 'Enter a commit message for the initial commit')
            return
        code, out, err = run_git(['commit', '-m', msg])
        if code == 0:
            self.append_output('Commit created: {}'.format(out))
        else:
            self.append_output('git commit failed: {} {}'.format(out, err))


def main():
    root = tk.Tk()
    app = GitPushGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()

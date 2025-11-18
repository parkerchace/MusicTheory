import os
import subprocess
import sys
import threading
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


def main():
    root = tk.Tk()
    app = GitPushGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()

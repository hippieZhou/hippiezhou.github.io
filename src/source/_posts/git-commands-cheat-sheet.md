---
title: Git 命令速查表
title_en: Git Commands Cheat Sheet
date: 2022-02-27 20:55:55
updated: 2022-02-27 20:55:55
tags: Git
---

> Git 常用命令速查表，包括仓库初始化、提交、分支管理、远程操作等常用命令，以及常见问题的解决方案。

# 一、常用命令

```bash
# Initialize a new git repository:
git init

# Set configuration values for your settings:
git config --global user.name <your-name>
git config --global user.email <your-email>
git config --global init.defaultBranch main

# Clone a repository:
git clone <repository-url>

# Add a file to the staging area:
git add <file>

# Add all files changes to the staging area:
git add

# Check the unstaged changes:
git diff

# Commit the staged changes:
git commit -m "Message"
git commit --amend --no-edit

# Reset staging area to the last commit:
git reset

# Check the state of the working directory and the staging area:
git status

# Remove a file from the index and working directory:
git rm <file>

# List the commit history:
git log

# Show changelog with graph
git log --graph

# Check the metadata and content changes of the commit:
git show <commit-hash>

# Lists all local and remote branches:
git branch -a

# Create a new branch:
git branch <branch-name>

# Rename the current branch:
git branch -m <new-branch-name>

# Delete a branch:
git branch -d <branch-name>

# Switch to another branch:
git checkout <branch-name>

# Create and switch to a new branch
git checkout -b <branch-name>

# Merge specified branch into the current branch:
git merge <branch-name>

# Create a new connection to a remote repository:
git remote add <name> <repository-url>

# Push the committed changes to a remote repository:
git push <remote> <branch>

# Download the content from a remote repository:
git pull <remote>

# Cleanup unnecessary files and optimize the local repository:
git gc

# Temporarily remove uncommitted changes and save them for later use:
git stash

# Reapply previously stashed changes
git stash apply

# Fetch all remote branches, delete branch if upstream is gone
git fetch --all --prune
```

# 二、使用技巧

![Use Git like a pro.](/images/git-commands-cheat-sheet/GYZ96EYasAA3GOf.jpg)

# 三、常见问题

## 3.1 修复 SSH 连接超时问题

try to create or update `~/.ssh/config` as followed:

```bash
Host github.com
 Hostname ssh.github.com
 Port 443
```

Then, run the command `ssh -T git@github.com` to confirm if the issue is fixed.

## 3.2 无法获取所有远程分支

try to open your git config by `git config -e (--global)`, and then modify relevant configuration:

```bash
[remote "origin"]
    url = https://git.example.com/example.git (you can omit this URL)
    fetch = +refs/heads/*:refs/remotes/origin/*
```

after that, you can run `git fetch --all`.

## 3.3 生成或应用补丁文件

```bash
# Creating a patch from unstaged changes
git diff > changes.patch  
# Creating a patch from staged changes
git diff --cached > changes.patch  
# Creating a patch between two commits
git diff commit1 commit2 > changes.patch

# Apply the changes specified in changes.patch to your current working directory.
git apply changes.patch
```

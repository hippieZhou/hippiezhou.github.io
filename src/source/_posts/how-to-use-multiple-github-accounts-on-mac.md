---
title: 如何在 Mac 上使用多个 GitHub 账户
title_en: How to Use Multiple GitHub Accounts on Mac
date: 2024-09-06 09:21:42
updated: 2024-09-06 09:21:42
tags: 
    - Git
---

> we may need multiple github accounts in our daily work, so I want to introduce a easy way to config multiple accounts on our Mac machine.

# 一、为所有账户创建 SSH 密钥

First make sure your current directory is your .ssh folder.

```bash
cd ~/.ssh
```

Syntax for generating unique ssh key for ann account is:

```bash
ssh-keygen -t rsa -C "your-email-address" -f "github-username"
```

here

-C: stands for comment to help identify your ssh key

-f: stands for the file name where your ssh key get saved

```bash
ssh-keygen -t rsa -C "hippiezhou@gmail.com" -f "github-work"
ssh-keygen -t rsa -C "hippiezhou@outlook.com" -f "github-personal"
```

# 二、将 SSH 公钥添加到 GitHub

## 2.1 复制公钥

```bash
vim ~/.ssh/github-work.pub
vim ~/.ssh/github-personal.pub
```

## 2.2 在 GitHub 上粘贴公钥

- Sign in to Github Account
- Goto Settings > SSH and GPG keys > New SSH Key
- Paste your copied public key and give it a Title of your choice.

# 三、将 SSH 密钥添加到 SSH Agent

add some alias in `~/.zshrc` file

```bash
alias ssh-personal="ssh-add -D && ssh-add ~/.ssh/github-personal && git config --global user.name 'happy life' && git config --global user.email 'hippiezhou@outlook.com'"
alias ssh-work="ssh-add -D && ssh-add ~/.ssh/github-work && git config --global user.name 'happy work' && git config --global user.email 'hippiezhou@gmail.com'"
```

Then you can use a **CLI alias** to switch to the account that you want.

```bash
# switch to personl account
ssh-personal
# switch to work account
ssh-work
```

More info: [ssh-agent](https://help.github.com/en/github/authenticating-to-github/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)

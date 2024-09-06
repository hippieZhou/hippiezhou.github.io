---
title: How to use multiple github accounts on Mac
date: 2024-09-06 09:21:42
tags: CLI
---

> we may need multiple github accounts in our dialy work, so I want to introduce a easy way to config multiple accounts on our Mac machine.

# Create SSH keys for all accounts

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

# Add SSH public key to the Github

## Copy the public key

```bash
vim ~/.ssh/github-work.pub
vim ~/.ssh/github-personal.pub
```

## Paste the public key on Github

- Sign in to Github Account
- Goto Settings > SSH and GPG keys > New SSH Key
- Paste your copied public key and give it a Title of your choice.

# Add SSH keys to SSH Agent

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

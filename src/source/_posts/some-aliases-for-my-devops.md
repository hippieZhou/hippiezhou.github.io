---
title: Some aliases for my devops
date: 2025-06-29 15:36:41
updated: 2025-06-29 15:36:41
tags: devops
---

> 本文介绍我在日常开发和运维中常用的终端工具配置与别名，包括 Vim、PowerShell、Bash/WSL 等。

# TL;DR

- 快速总结各终端工具的高效配置和常用 alias。

# PowerShell 配置

- profile 配置方法
- 常用 alias 和函数
- 推荐模块（如 oh-my-posh）

# Bash/WSL 配置

- .bashrc/.bash_profile 配置

```bash
vim ~/.bashrc
```

- Brew 常用 alias 和函数

```bash
alias brew-cleanup="brew cleanup -s --prune=all"
```

- Git 常用 alias 和函数

```bash
alias git-list="git config --global --list"
alias git-amend="git add . && git commit --amend --no-edit"
alias gpr="git pull --rebase"

alias ssh-list="ssh-add -l"
alias ssh-personal="ssh-add -D && ssh-add ~/.ssh/github-personal && git config --global user.name 'hippiezhou' && git config --global user.email 'hippiezhou@outlook.com'"

alias login-dev="ssh root@192.168.1.1"
```

- Kubectl 常用 alias 和函数

```bash
alias k='kubectl'
alias kg='k get'
alias kd='k describe'
alias kl='k logs'
alias ke='k explain'
alias kr='k replace'
alias kc='k create'
alias kgp='k get po'
alias kgn='k get no'
alias kge='k get ev'
alias kex='k exec -it'
alias kgc='k config get-contexts'
alias ksn='k config set-context --current --namespace'
alias kuc='k config use-context'
alias krun='k run'
export do='--dry-run=client -oyaml'
export force='--grace-period=0 --force'

source <(kubectl completion bash)
source <(kubectl completion bash | sed 's/kubectl/k/g' )
complete -F __start_kubectl k

alias krp='k run test --image=busybox --restart=Never'
alias kuc='k config use-context'
```

- WSL 下的特殊配置建议

# Vim 配置

- 常用配置项（如 .vimrc）

```bash
vi ~/.vimrc
---
:set number
:set et
:set sw=2 ts=2 sts=2
---
^: Start of word in line
0: Start of line
$: End of line
w: End of word
GG: End of file
```

- 插件推荐与管理
- 常用快捷键和自定义命令

# 终端美化与效率提升

- 主题与配色方案
- 字体与终端模拟器推荐
- 提升效率的小技巧

# 相关参考

- 官方文档与社区资源链接

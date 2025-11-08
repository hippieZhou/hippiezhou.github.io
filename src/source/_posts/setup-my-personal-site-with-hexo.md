---
title: 使用 Hexo 搭建个人网站
title_en: Setup My Personal Site with Hexo
date: 2016-07-01 12:43:22
updated: 2016-07-01 12:43:22
tags: Frontend
---

> Hexo 是一个快速、简洁且高效的博客框架，使用 Node.js 驱动。本文介绍如何使用 Hexo 搭建个人博客网站，包括环境配置、主题安装和部署流程。

Welcome to [Hexo](https://hexo.io/)! This is your very first post. Check [documentation](https://hexo.io/docs/) for more info. If you get any problems when using Hexo, you can find the answer in [troubleshooting](https://hexo.io/docs/troubleshooting.html) or you can ask me on [GitHub](https://github.com/hexojs/hexo/issues).

# 一、快速开始

## 1.1 环境配置

### 1.1.1 安装和初始化

```bash
# install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# or
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# install hexo CLI
npm install -g hexo-cli

# setup environment
mkdir hippiezhou.io
cd hippiezhou.io

# target node.js version by NVM
nvm  list
nvm install --lts
echo "20.17.0" > .nvmrc
nvm use

# create project
hexo init src
git init
mv src/.github/ .
mv src/.gitignore .
```

try to use `setup.sh` to setup:

```bash
chmod +x setup.sh
./setup.sh
```

## 1.2 应用第三方主题

```bash
git submodule add https://github.com/zchengsite/hexo-theme-oranges.git src/themes/oranges

# or just fecth submodule
git submodule update --init --recursive
```

after that, copy theme config file from `/src/themes/oranges/_config.yml` to `/src` and rename it as `_config.oranges.yml`. then edit it for what you want.

More info: [Oranges](https://github.com/zchengsite/hexo-theme-oranges)

## 1.3 创建新文章

```bash
$ hexo new "My New Post"
```

More info: [Writing](https://hexo.io/docs/writing.html)

## 1.4 运行服务器

```bash
$ hexo s
# or
$ hexo server
# or
hexo clean && hexo g && hexo s
```

More info: [Server](https://hexo.io/docs/server.html)

## 1.5 生成静态文件

```bash
$ hexo generate
```

More info: [Generating](https://hexo.io/docs/generating.html)

## 1.6 部署到远程站点

```bash
$ hexo deploy
```

More info: [Deployment](https://hexo.io/docs/one-command-deployment.html)

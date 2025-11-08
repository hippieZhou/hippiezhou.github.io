---
title: Setup My Personal Site with Hexo
date: 2016-07-01 12:43:22
updated: 2016-07-01 12:43:22
tags: Frontend
---

Welcome to [Hexo](https://hexo.io/)! This is your very first post. Check [documentation](https://hexo.io/docs/) for more info. If you get any problems when using Hexo, you can find the answer in [troubleshooting](https://hexo.io/docs/troubleshooting.html) or you can ask me on [GitHub](https://github.com/hexojs/hexo/issues).

## Quick Start

### Setup and initialize

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

### apply third party theme

```bash
git submodule add https://github.com/zchengsite/hexo-theme-oranges.git src/themes/oranges

# or just fecth submodule
git submodule update --init --recursive
```

after that, copy theme config file from `/src/themes/oranges/_config.yml` to `/src` and rename it as `_config.oranges.yml`. then edit it for what you want.

More info: [Oranges](https://github.com/zchengsite/hexo-theme-oranges)

### Create a new post

```bash
$ hexo new "My New Post"
```

More info: [Writing](https://hexo.io/docs/writing.html)

### Run server

```bash
$ hexo s
# or
$ hexo server
# or
hexo clean && hexo g && hexo s
```

More info: [Server](https://hexo.io/docs/server.html)

### Generate static files

```bash
$ hexo generate
```

More info: [Generating](https://hexo.io/docs/generating.html)

### Deploy to remote sites

```bash
$ hexo deploy
```

More info: [Deployment](https://hexo.io/docs/one-command-deployment.html)

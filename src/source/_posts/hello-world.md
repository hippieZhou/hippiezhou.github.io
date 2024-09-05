---
title: Hello World
tag: Frontend
---
Welcome to [Hexo](https://hexo.io/)! This is your very first post. Check [documentation](https://hexo.io/docs/) for more info. If you get any problems when using Hexo, you can find the answer in [troubleshooting](https://hexo.io/docs/troubleshooting.html) or you can ask me on [GitHub](https://github.com/hexojs/hexo/issues).

## Quick Start

### Setup and initialize

```bash
# install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
# or
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash

# setup environment
mkdir hippiezhou.io
cd hippiezhou.io

# target node.js version by NVM
nvm  list
nvm install --lts
echo "20.17.0" > .nvmrc
nvm use

# create project by Hexo
npm install hexo-cli
hexo init src
git init
mv src/.github/ .
mv src/.gitignore .
```

### apply third party theme

```bash
git submodule add https://github.com/zchengsite/hexo-theme-oranges.git src/themes/oranges
```
after that, copy theme config file from `/src/themes/oranges/_config.yml` to `/src` and rename it as `_config.oranges.yml`. then edit it for what you want.

More info: [Oranges](https://github.com/zchengsite/hexo-theme-oranges)

### Create a new post

``` bash
$ hexo new "My New Post"
```

More info: [Writing](https://hexo.io/docs/writing.html)

### Run server

``` bash
$ hexo server
```

More info: [Server](https://hexo.io/docs/server.html)

### Generate static files

``` bash
$ hexo generate
```

More info: [Generating](https://hexo.io/docs/generating.html)

### Deploy to remote sites

``` bash
$ hexo deploy
```

More info: [Deployment](https://hexo.io/docs/one-command-deployment.html)
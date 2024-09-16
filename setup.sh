#!/bin/bash

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm use

if [ -d "src/themes/oranges" ]; then
  git submodule update --init --recursive
else
  git submodule add https://github.com/zchengsite/hexo-theme-oranges.git src/themes/oranges
fi

npm install

cd src

npm install

echo "Setup completed. Required npm packages installed."

hexo s

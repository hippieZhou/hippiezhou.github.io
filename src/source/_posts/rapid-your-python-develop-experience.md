---
title: Rapid Your Python Develop Experience
date: 2025-01-17 15:21:50
updated: 2025-01-17 15:21:50
tags: Python
---

> save your time for real things

# TL;DR

if you want to quickly setup your local python environment on Mac, I would like to share some useful scripts for that.

# Motivation

I have been working on a Python project for serval days and will continue to work on it for more than half a year.
Recently, I insisted my team colleagues had some issues when they tried to set their local Python environment on a Mac machine. To improve our development experience, I realize that we don't need to spend much time on it, just keeping it as simple as possible is better for us. So I think that we should take a unified script to initialize our local environment.

# Example

Before starting use those scripts, please make sure that you have installed python(3+) on you Mac machine.

```bash
#!/bin/bash

set -e

PYTHON_VERSION="3.11.11"

if [[ -f .python-version ]]; then
  PYTHON_VERSION=$(cat .python-version)
  echo "Using Python version from .python-version: ${PYTHON_VERSION}"
else
  PYTHON_VERSION=${DEFAULT_PYTHON_VERSION}
  echo ".python-version not found. Defaulting to Python version: ${PYTHON_VERSION}"
fi

if ! command -v pyenv &>/dev/null; then
  echo "pyenv is not installed. Installing pyenv..."

  curl https://pyenv.run | bash

  export PATH="$HOME/.pyenv/bin:$PATH"
  eval "$(pyenv init --path)"
  eval "$(pyenv init -)"
  eval "$(pyenv virtualenv-init -)"

  echo "pyenv installed successfully!"
else
  echo "pyenv is already installed."
fi

export PATH="$HOME/.pyenv/bin:$PATH"
eval "$(pyenv init --path)"
eval "$(pyenv init -)"
eval "$(pyenv virtualenv-init -)"

if ! pyenv versions --bare | grep -q "^${PYTHON_VERSION}$"; then
  echo "Python version ${PYTHON_VERSION} not found. Installing..."
  pyenv install "${PYTHON_VERSION}"
else
  echo "Python version ${PYTHON_VERSION} is already installed."
fi

echo "Setting Python version with pyenv..."
pyenv local "${PYTHON_VERSION}"

echo "Creating Python virtual environment..."
python3 -m venv .venv

echo "Activating the virtual environment..."
source .venv/bin/activate

echo "Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Setup completed successfully!"

deactivate
```

save it as `setiup_env.sh` and let it go:

```bash
chmod +x setup_env.sh
./setup_env.sh
```

Finally, I also want to share some useful CLIs about `Pyenv`.

```
# create a new virtual env
python -m venv .venv

# switch to a specific python interpreter
pyenv local 3.11.11

# show all python verions
python versions

# show current python verion
python version
```

# Conclusion

# References

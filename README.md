# 🚀 hippiezhou.github.io

> Personal Tech Blog - Built with Hexo + Oranges Theme

[![Website](https://img.shields.io/badge/Website-hippiezhou.github.io-blue?style=flat-square)](https://hippiezhou.github.io)
[![License](https://img.shields.io/github/license/hippieZhou/hippiezhou.github.io?style=flat-square)](LICENSE)

**Tech Stack**: Hexo 7.3.0 | Node.js 20.x | Oranges Theme | GitHub Pages

---

## 🚀 Quick Start

### Setup

```bash
git clone https://github.com/hippieZhou/hippiezhou.github.io.git
cd hippiezhou.github.io
# Use the Node.js version specified by .nvmrc
nvm use
cd src
npm install
git submodule update --init --recursive
npm run server
```

Open http://localhost:4000 to preview the site.

### Commands

```bash
cd src
npm run server  # Start the local server
npm run build   # Build the site in public/
npm run clean   # Remove generated files
```

## 📝 Create a New Post

```bash
cd src
hexo new "Post Title"
```

Posts are created in `src/source/_posts/`. Use YAML front matter:

```yaml
---
title: Post Title
date: YYYY-MM-DD HH:MM:SS
updated: YYYY-MM-DD HH:MM:SS
tags: Tag Name
---
```

Specify a language for each code block. Use a localized references heading for each post language.

## ⚙️ Site Configuration

Edit `src/_config.yml` for site settings and `src/_config.oranges.yml` for theme options, including navigation, comments, friend links, search, and syntax highlighting.

For example, update site details:

```yaml
title: hippie
author: hippieZhou
url: https://hippiezhou.github.io
```

Add navigation items:

```yaml
navbar:
  - name: Home
    path: /
  - name: Archives
    path: /archives/
```

Configure friend links:

```yaml
friends:
  - nickname: Name
    site: https://example.com
    meta: Description
```

## 🚀 Deployment

Push to `main` to build and deploy to GitHub Pages with GitHub Actions:

```bash
git add .
git commit -m "Update content"
git push origin main
```

Site: https://hippiezhou.github.io

## 📁 Directory Structure

```
src/
├── _config.yml
├── _config.oranges.yml
├── source/
│   ├── _posts/
│   ├── images/
│   ├── about/
│   ├── categories/
│   ├── tags/
│   └── friends/
└── themes/oranges/         # Git submodule
```

---

**Website**: [https://hippiezhou.github.io](https://hippiezhou.github.io) | **License**: MIT

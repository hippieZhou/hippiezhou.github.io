+++
title = 'How to setup my personal site with Hugo'
date = 2023-11-10T15:06:42+08:00
tags = [ "frontend"] 
draft = false
+++

## Introduction

hello, I'm alway want to find a simple way to build my personal site, but no better way for me, So i decide to use 'Hugo' to built it. here my steps:

## Setup local environment

- Install `hugo` and `Paper`

```bash
brew install hugo
hugo new site hippiezhou.dev
cd hippiezhou.dev
git init
git submodule add https://github.com/nanxiaobei/hugo-paper themes/paper
echo "paper = 'paper'" >> hugo.toml
```

## customize my site's preference

you can customize your `hugo.toml`

## add github action for host github page

> add you your own github action, you can refer to : [Host on GitHub Pages](https://gohugo.io/hosting-and-deployment/hosting-on-github/)

## some common usages

```bash
hugo new content posts/my-first-post.md
hugo server --buildDrafts
```

## References

- [Hugo](https://gohugo.io)
- [hugo-paper](https://github.com/nanxiaobei/hugo-paper)

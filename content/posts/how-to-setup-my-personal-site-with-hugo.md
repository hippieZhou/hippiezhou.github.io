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
hugo new site hippiezhou.dev
cd hippiezhou.dev
git init
git submodule add https://github.com/nanxiaobei/hugo-paper themes/paper
echo "paper = 'paper'" >> hugo.toml
hugo server --buildDrafts
```

- customize my site's preference

```bash
baseURL = 'https://hippiezhou.dev/'
author = "hippiezhou"
copyright = "Copyright © 2008–2023; all rights reserved."
title = 'hippiezhou.dev'
paginate = 3
languageCode = 'en-us'
defaultContentLanguage = "en"
enableInlineShortcodes = true

theme = "paper"

[params]
  color = 'linen'

  name = 'hippiezhou'
  twitter = 'hippie_zhou'
  github = 'hippieZhou'
  avatar = 'https://github.com/hippiezhou.png'
  bio = 'Software engineer at Thoughtworks.'
  rss = true


# needed to  render raw HTML (e.g. <sub>, <sup>, <kbd>, <mark>)
[markup]
  [markup.goldmark]
    [markup.goldmark.renderer]
      unsafe = true
  [markup.highlight]
    lineNos = true

[menu]
  [[menu.main]]
    identifier = "apps"
    name = "Apps"
    url = "/apps/"
    weight = 10
  [[menu.main]]
    identifier = "archives"
    name = "Archives"
    url = "/archives/"
    weight = 10
  [[menu.main]]
    identifier = "contact"
    name = "Contact"
    url = "/contact/"
    weight = 10
```

- add github action for host github page

```bash
# todo
```

- Usage

```bash
hugo new content posts/my-first-post.md
```

## References

- [Hugo](https://gohugo.io)
- [hugo-paper](https://github.com/nanxiaobei/hugo-paper)

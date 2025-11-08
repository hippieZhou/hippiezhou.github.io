# 🚀 hippiezhou.github.io

> Personal Tech Blog - Built with Hexo + Oranges Theme

[![Website](https://img.shields.io/badge/Website-hippiezhou.github.io-blue?style=flat-square)](https://hippiezhou.github.io)
[![License](https://img.shields.io/github/license/hippieZhou/hippiezhou.github.io?style=flat-square)](LICENSE)

**Tech Stack**: Hexo 7.3.0 | Node.js 20.x | Oranges Theme | GitHub Pages

---

## 🚀 快速开始

### 环境初始化

```bash
# 1. 克隆仓库
git clone https://github.com/hippieZhou/hippiezhou.github.io.git
cd hippiezhou.github.io

# 2. 安装依赖（需要 Node.js 20.x）
cd src
npm install

# 3. 初始化主题子模块
git submodule update --init --recursive

# 4. 启动开发服务器
npm run server
# 访问 http://localhost:4000
```

### 常用命令

```bash
cd src

# 开发
npm run server          # 启动本地服务器

# 构建
npm run build           # 生成静态文件到 public/
npm run clean           # 清理生成的文件

# 部署（自动通过 GitHub Actions）
git push origin main    # 推送到 main 分支自动部署
```

## 📝 创建新博客

```bash
cd src
hexo new "文章标题"
# 文件会创建在 src/source/_posts/文章标题.md
```

### 文章格式规范

- **Front Matter** (YAML):
  ```yaml
  ---
  title: 文章标题（Title Case）
  date: YYYY-MM-DD HH:MM:SS
  updated: YYYY-MM-DD HH:MM:SS
  tags: 标签名称
  ---
  ```

- **代码块**: 使用语言标识（如 `bash`, `C#`, `XAML`, `js`）
- **参考链接**: 中文文章使用 `# 相关参考`，英文文章使用 `# References`

## ⚙️ 网站配置

### 主要配置文件

- `src/_config.yml` - Hexo 主配置
  - 站点信息（title, author, url）
  - 永久链接格式
  - 分页设置

- `src/_config.oranges.yml` - Oranges 主题配置
  - 导航栏设置
  - 评论系统（Gitalk/Valine/Disqus）
  - 友链配置
  - 搜索功能
  - 代码高亮设置

### 常用设置

**修改站点信息**:
```yaml
# src/_config.yml
title: hippie
author: hippieZhou
url: https://hippiezhou.github.io
```

**添加导航菜单**:
```yaml
# src/_config.oranges.yml
navbar:
  - name: Home
    path: /
  - name: Archives
    path: /archives/
```

**配置友链**:
```yaml
# src/_config.oranges.yml
friends:
  - nickname: 昵称
    site: https://example.com
    meta: 描述
```

## 🚀 部署

**自动部署**: 推送到 `main` 分支后，GitHub Actions 会自动构建并部署到 GitHub Pages

```bash
git add .
git commit -m "更新内容"
git push origin main
```

部署完成后访问: https://hippiezhou.github.io

## 📁 目录结构

```
src/
├── _config.yml              # Hexo 主配置
├── _config.oranges.yml      # Oranges 主题配置
├── source/
│   ├── _posts/             # 博客文章
│   ├── images/             # 图片资源
│   ├── about/              # 关于页面
│   ├── categories/         # 分类页面
│   ├── tags/               # 标签页面
│   └── friends/            # 友链页面
└── themes/oranges/         # Oranges 主题（Git Submodule）
```

---

**Website**: [https://hippiezhou.github.io](https://hippiezhou.github.io) | **License**: MIT

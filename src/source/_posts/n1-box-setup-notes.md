---
title: N1 盒子折腾笔记
title_en: N1 Box Setup Notes
date: 2025-04-27 21:28:11
updated: 2025-04-27 21:28:11
tags: 技术折腾
---

> 本文记录了 N1 盒子折腾的全过程，包括动机、步骤和常见问题的解决方法，适合新手参考。

# 一、插件配置

## 1.1 已安装插件

- alist 网盘
- Aria2 下载器

# 二、问题排查

## 2.1 OpenWRT

## 2.2 iStoreOS

### 2.2.1 iStore 商店安装/更新 `alist` 后无法启动

> 方案来自：[iStore 系统全新安装 3.33 后没有 alist 菜单](https://github.com/sbwml/luci-app-alist/issues/102)

1. 关闭当前正在运行的 alist 服务
2. 从 `系统-软件包` 里卸载 alist 所有相关项
3. 在 Terminal 中执行
   1. `rm -rf /etc/alist /etc/config/alist`
   2. `rm -rf /var/run/alist.sock` (如果有话)
4. 重新在 iStore 安装 Alist

### 2.2.2 AriaNg 下载文件失败

> 方案来自：[玩转 Aria2 远程下载](https://doc.linkease.com/zh/guide/ddnsto/cloudapp.html#_1-%E7%8E%A9%E8%BD%ACaria2%E8%BF%9C%E7%A8%8B%E4%B8%8B%E8%BD%BD)

需要在 **基本选项** 中设置 以 `root` 用户权限来运行。此外，使用此服务时，可考虑配置 `RPC 认证` 一定程度上能提高下载速度

### 2.2.3 Window 无法识别通过 `Samba` 挂载的硬盘

> todo

# 三、相关参考

- [OpenWrt 项目](https://openwrt.org/zh/packages/start)
- [恩山无线论坛](https://www.right.com.cn/)
- [Flippy's openwrt packaged source code](https://github.com/unifreq/openwrt_packit)
- [iStoreOS](https://site.istoreos.com/)
- [AList](https://alist.nn.ci/zh/)

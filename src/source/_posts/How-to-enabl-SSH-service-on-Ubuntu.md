---
title: How to enabl SSH service on Ubuntu
date: 2021-10-17 12:43:22
tags: SSH
---

> 有时候需要远程登陆 ubuntu 的终端，那么可以使用 ssh 来实现，ubuntu 好像默认没有安装 ssh 的，需要自己手动安装。

ssh 分为客户端 openssh-client 和 openssh-server，可根据需要进行安装客户端和服务端

客户端：

```bash
sudo apt-get install openssh-client
```

服务端：

```bash
sudo apt-get install openssh-server
```

确认 sshserver 是否启动：

```bash
ps -e|grep ssh
```

如果看到 sshd 那说明 ssh-server 已经启动了，如果没有可以使用命令启动 ssh 服务：

```bash
service ssh start
```

ssh 的配置文件默认在

```bash
/etc/ssh/sshd_config
```

使用方式 直接在终端输入：

```bash  
# 以 root 身份登陆
ssh root@[your-remote-ip]
```

然后跳出来的授权验证，输入用户名和密码即可。

当然，为了方便登陆，你可以在你的 `~/.zshrc` 配置相关 alias，比如像这样:

```bash
alias login-dev="ssh root@[your-remote-ip]"
```

配置完成后执行一下 `source ~/.zshrc` 让配置生效，这样你就可以直接是 _login-dev_ 进行快速登陆。

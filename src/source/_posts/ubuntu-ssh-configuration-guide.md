---
title: Ubuntu SSH 服务配置指南：从安装到安全加固
title_en: "Ubuntu SSH Service Configuration Guide: From Installation to Security Hardening"
date: 2021-10-17 12:43:22
updated: 2021-10-17 12:43:22
tags: 
    - SSH
    - Ubuntu
    - Linux
    - Security
    - Remote Access
---

> SSH（Secure Shell）是一种网络协议，用于安全地远程访问和管理 Linux 系统。Ubuntu 默认可能没有安装 SSH 服务器，需要手动安装和配置。本文详细介绍如何在 Ubuntu 上安装、配置和加固 SSH 服务，包括基本使用、密钥认证、安全配置和故障排查等完整内容。

# 一、SSH 简介

SSH（Secure Shell）是一种加密的网络传输协议，可以在不安全的网络中为网络服务提供安全的传输环境。SSH 最常见的用途是远程登录系统，但也可以用于端口转发、文件传输等。

## 1.1 SSH 组件

SSH 分为两个主要组件：

- **openssh-client**：SSH 客户端，用于连接到远程服务器
- **openssh-server**：SSH 服务器，用于接受远程连接

# 二、安装 SSH

## 2.1 安装 SSH 客户端

如果只需要连接到其他服务器，只需安装客户端：

```bash
# 更新包列表
sudo apt-get update

# 安装 SSH 客户端
sudo apt-get install -y openssh-client

# 验证安装
ssh -V
```

## 2.2 安装 SSH 服务器

如果需要允许其他机器连接到本机，需要安装服务器：

```bash
# 更新包列表
sudo apt-get update

# 安装 SSH 服务器
sudo apt-get install -y openssh-server

# 验证安装
ssh -V
```

## 2.3 检查 SSH 服务状态

```bash
# 检查 SSH 服务是否运行
sudo systemctl status ssh

# 或者使用
sudo systemctl status sshd

# 检查 SSH 进程
ps -e | grep ssh

# 如果看到 sshd 进程，说明 SSH 服务器正在运行
```

# 三、SSH 服务管理

## 3.1 启动和停止服务

```bash
# 启动 SSH 服务
sudo systemctl start ssh

# 停止 SSH 服务
sudo systemctl stop ssh

# 重启 SSH 服务
sudo systemctl restart ssh

# 重载 SSH 配置（不中断现有连接）
sudo systemctl reload ssh
```

## 3.2 设置开机自启

```bash
# 启用开机自启
sudo systemctl enable ssh

# 禁用开机自启
sudo systemctl disable ssh

# 查看服务状态
sudo systemctl is-enabled ssh
```

## 3.3 使用 service 命令（旧版本 Ubuntu）

对于较旧版本的 Ubuntu，可以使用 `service` 命令：

```bash
# 启动/停止/重启
sudo service ssh start
sudo service ssh stop
sudo service ssh restart

# 查看状态
sudo service ssh status
```

# 四、SSH 配置文件

## 4.1 配置文件位置

SSH 服务器的主配置文件位于：

```bash
/etc/ssh/sshd_config
```

SSH 客户端的配置文件位于：

```bash
~/.ssh/config  # 用户配置
/etc/ssh/ssh_config  # 系统配置
```

## 4.2 查看和编辑配置

```bash
# 查看服务器配置
sudo nano /etc/ssh/sshd_config

# 或者使用 vim
sudo vim /etc/ssh/sshd_config

# 查看客户端配置
nano ~/.ssh/config
```

## 4.3 测试配置文件

修改配置后，务必测试配置文件语法：

```bash
# 测试 SSH 服务器配置
sudo sshd -t

# 如果配置正确，不会有输出
# 如果有错误，会显示错误信息
```

# 五、基本使用

## 5.1 基本连接

```bash
# 基本语法
ssh username@hostname
ssh username@ip_address

# 示例：使用用户名和 IP 地址
ssh root@192.168.1.100

# 示例：使用用户名和域名
ssh user@example.com

# 指定端口（默认端口是 22）
ssh -p 2222 username@hostname
```

## 5.2 首次连接

首次连接到服务器时，会提示确认服务器指纹：

```
The authenticity of host '192.168.1.100 (192.168.1.100)' can't be established.
ECDSA key fingerprint is SHA256:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
```

输入 `yes` 后，服务器指纹会被保存到 `~/.ssh/known_hosts` 文件中。

## 5.3 使用别名简化连接

### 方法一：使用 SSH 配置文件

创建或编辑 `~/.ssh/config` 文件：

```bash
nano ~/.ssh/config
```

添加以下内容：

```
Host dev-server
    HostName 192.168.1.100
    User root
    Port 22
    IdentityFile ~/.ssh/id_rsa

Host production
    HostName example.com
    User deploy
    Port 2222
    IdentityFile ~/.ssh/production_key
```

然后就可以使用别名连接：

```bash
ssh dev-server
ssh production
```

### 方法二：使用 Shell 别名

在 `~/.bashrc` 或 `~/.zshrc` 中添加：

```bash
# 编辑配置文件
nano ~/.bashrc
# 或
nano ~/.zshrc

# 添加别名
alias login-dev="ssh root@192.168.1.100"
alias login-prod="ssh deploy@example.com"

# 使配置生效
source ~/.bashrc
# 或
source ~/.zshrc

# 使用别名
login-dev
login-prod
```

## 5.4 执行远程命令

```bash
# 执行单个命令
ssh username@hostname "command"

# 示例：查看远程服务器时间
ssh root@192.168.1.100 "date"

# 示例：查看远程服务器磁盘使用情况
ssh root@192.168.1.100 "df -h"

# 执行多个命令
ssh username@hostname "command1 && command2"
```

## 5.5 文件传输

### 使用 SCP

```bash
# 复制文件到远程服务器
scp local_file.txt username@hostname:/remote/path/

# 从远程服务器复制文件
scp username@hostname:/remote/path/file.txt ./

# 复制目录（递归）
scp -r local_directory username@hostname:/remote/path/
```

### 使用 SFTP

```bash
# 启动 SFTP 会话
sftp username@hostname

# SFTP 命令
put local_file.txt          # 上传文件
get remote_file.txt         # 下载文件
ls                          # 列出远程目录
lls                         # 列出本地目录
cd remote_directory         # 切换远程目录
lcd local_directory         # 切换本地目录
exit                        # 退出
```

### 使用 rsync

```bash
# 同步文件到远程服务器
rsync -avz local_directory/ username@hostname:/remote/path/

# 从远程服务器同步文件
rsync -avz username@hostname:/remote/path/ local_directory/
```

# 六、SSH 密钥认证

## 6.1 生成 SSH 密钥对

```bash
# 生成 RSA 密钥对（推荐 4096 位）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 生成 ED25519 密钥对（更安全，更快速）
ssh-keygen -t ed25519 -C "your_email@example.com"

# 指定密钥文件名
ssh-keygen -t rsa -b 4096 -f ~/.ssh/my_key -C "your_email@example.com"
```

生成过程中会提示：
- 密钥保存位置（默认 `~/.ssh/id_rsa`）
- 密码短语（passphrase，可选但推荐）

## 6.2 复制公钥到服务器

### 方法一：使用 ssh-copy-id（推荐）

```bash
# 自动复制公钥到服务器
ssh-copy-id username@hostname

# 指定密钥文件
ssh-copy-id -i ~/.ssh/my_key.pub username@hostname

# 指定端口
ssh-copy-id -p 2222 username@hostname
```

### 方法二：手动复制

```bash
# 查看公钥内容
cat ~/.ssh/id_rsa.pub

# 复制公钥内容，然后登录服务器
ssh username@hostname

# 在服务器上创建 .ssh 目录（如果不存在）
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# 将公钥添加到 authorized_keys
echo "your_public_key" >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## 6.3 使用密钥登录

配置好密钥后，可以直接使用密钥登录：

```bash
# 使用默认密钥
ssh username@hostname

# 指定密钥文件
ssh -i ~/.ssh/my_key username@hostname
```

## 6.4 配置 SSH Agent

```bash
# 启动 SSH Agent
eval "$(ssh-agent -s)"

# 添加密钥到 Agent
ssh-add ~/.ssh/id_rsa

# 查看已添加的密钥
ssh-add -l

# 删除所有密钥
ssh-add -D
```

在 `~/.bashrc` 或 `~/.zshrc` 中添加自动启动 SSH Agent：

```bash
# 添加到 ~/.bashrc 或 ~/.zshrc
if [ -z "$SSH_AUTH_SOCK" ]; then
    eval "$(ssh-agent -s)"
    ssh-add ~/.ssh/id_rsa 2>/dev/null
fi
```

# 七、SSH 安全配置

## 7.1 基本安全设置

编辑 `/etc/ssh/sshd_config`：

```bash
sudo nano /etc/ssh/sshd_config
```

### 推荐的安全配置

```bash
# 禁用 root 登录（推荐）
PermitRootLogin no

# 或者只允许密钥登录 root
PermitRootLogin prohibit-password

# 限制登录用户
AllowUsers username1 username2
# 或
AllowGroups sshusers

# 禁止特定用户登录
DenyUsers baduser
DenyGroups badgroup

# 更改默认端口（可选，但推荐）
Port 2222

# 禁用密码认证，只允许密钥认证（推荐）
PasswordAuthentication no
PubkeyAuthentication yes

# 限制登录尝试次数
MaxAuthTries 3

# 设置空闲超时时间（秒）
ClientAliveInterval 300
ClientAliveCountMax 2

# 禁用空密码
PermitEmptyPasswords no

# 禁用 X11 转发（如果不需要）
X11Forwarding no

# 禁用端口转发（如果不需要）
AllowTcpForwarding no
```

## 7.2 应用配置更改

```bash
# 测试配置文件
sudo sshd -t

# 如果测试通过，重载配置
sudo systemctl reload ssh

# 或者重启服务
sudo systemctl restart ssh
```

## 7.3 使用 fail2ban 防止暴力破解

```bash
# 安装 fail2ban
sudo apt-get update
sudo apt-get install -y fail2ban

# 创建本地配置文件
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# 编辑配置
sudo nano /etc/fail2ban/jail.local
```

在 `[sshd]` 部分配置：

```ini
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
```

```bash
# 启动 fail2ban
sudo systemctl start fail2ban
sudo systemctl enable fail2ban

# 查看状态
sudo fail2ban-client status sshd

# 查看被禁止的 IP
sudo fail2ban-client status sshd
```

## 7.4 防火墙配置

```bash
# 安装 UFW（如果未安装）
sudo apt-get install -y ufw

# 允许 SSH（重要：先允许 SSH，避免被锁在外面）
sudo ufw allow 22/tcp

# 如果更改了 SSH 端口，使用新端口
sudo ufw allow 2222/tcp

# 启用防火墙
sudo ufw enable

# 查看防火墙状态
sudo ufw status
```

# 八、高级用法

## 8.1 SSH 端口转发

### 本地端口转发

```bash
# 将本地端口 8080 转发到远程服务器的 80 端口
ssh -L 8080:localhost:80 username@hostname

# 访问本地 http://localhost:8080 实际访问远程服务器的 80 端口
```

### 远程端口转发

```bash
# 将远程服务器的 8080 端口转发到本地的 80 端口
ssh -R 8080:localhost:80 username@hostname
```

### 动态端口转发（SOCKS 代理）

```bash
# 创建 SOCKS 代理
ssh -D 1080 username@hostname

# 配置浏览器使用 SOCKS5 代理 localhost:1080
```

## 8.2 SSH 隧道

```bash
# 创建 SSH 隧道
ssh -N -L 3306:localhost:3306 username@hostname

# -N: 不执行远程命令
# -L: 本地端口转发
# 这样可以通过本地 3306 端口访问远程 MySQL 服务器
```

## 8.3 保持连接活跃

```bash
# 客户端配置（~/.ssh/config）
Host *
    ServerAliveInterval 60
    ServerAliveCountMax 3

# 或者在连接时使用
ssh -o ServerAliveInterval=60 username@hostname
```

## 8.4 压缩传输

```bash
# 启用压缩（适合慢速网络）
ssh -C username@hostname

# 或在配置文件中
Host *
    Compression yes
```

# 九、故障排查

## 9.1 无法连接到服务器

```bash
# 检查 SSH 服务是否运行
sudo systemctl status ssh

# 检查端口是否监听
sudo netstat -tlnp | grep :22
# 或
sudo ss -tlnp | grep :22

# 检查防火墙
sudo ufw status

# 检查 SSH 日志
sudo tail -f /var/log/auth.log
```

## 9.2 连接超时

```bash
# 增加连接超时时间
ssh -o ConnectTimeout=30 username@hostname

# 使用详细模式查看连接过程
ssh -v username@hostname
# -v: 详细模式
# -vv: 更详细
# -vvv: 最详细
```

## 9.3 权限问题

```bash
# 检查 .ssh 目录权限
ls -la ~/.ssh

# 正确的权限应该是：
# .ssh 目录: 700 (drwx------)
# authorized_keys: 600 (-rw-------)
# id_rsa: 600 (-rw-------)
# id_rsa.pub: 644 (-rw-r--r--)

# 修复权限
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
chmod 600 ~/.ssh/id_rsa
chmod 644 ~/.ssh/id_rsa.pub
```

## 9.4 密钥认证失败

```bash
# 检查服务器日志
sudo tail -f /var/log/auth.log

# 常见错误：
# - "Permission denied (publickey)": 公钥未正确配置
# - "Too many authentication failures": 尝试次数过多

# 使用密码登录测试
ssh -o PreferredAuthentications=password username@hostname
```

## 9.5 查看 SSH 连接信息

```bash
# 查看当前 SSH 连接
who

# 查看详细的 SSH 连接信息
w

# 查看所有 SSH 会话
sudo netstat -tnpa | grep :22
```

# 十、最佳实践

## 10.1 安全建议

1. ✅ **禁用 root 登录**：创建普通用户，使用 sudo 提升权限
2. ✅ **使用密钥认证**：禁用密码认证，只使用密钥
3. ✅ **更改默认端口**：减少自动化攻击
4. ✅ **限制登录用户**：只允许必要的用户登录
5. ✅ **使用 fail2ban**：防止暴力破解攻击
6. ✅ **定期更新系统**：保持系统和 SSH 软件最新
7. ✅ **监控日志**：定期检查 `/var/log/auth.log`
8. ✅ **使用强密码**：如果必须使用密码认证

## 10.2 性能优化

```bash
# 在 /etc/ssh/sshd_config 中优化
UseDNS no              # 禁用 DNS 查找
GSSAPIAuthentication no # 禁用 GSSAPI 认证
```

## 10.3 备份配置

```bash
# 备份 SSH 配置
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# 备份密钥
cp -r ~/.ssh ~/.ssh.backup
```

# 十一、总结

通过本文的介绍，您已经了解了：

1. ✅ **SSH 安装**：客户端和服务器的安装方法
2. ✅ **服务管理**：启动、停止、重启 SSH 服务
3. ✅ **基本使用**：连接、执行命令、文件传输
4. ✅ **密钥认证**：生成密钥、配置密钥登录
5. ✅ **安全配置**：加固 SSH 服务器安全
6. ✅ **高级用法**：端口转发、隧道、代理
7. ✅ **故障排查**：常见问题和解决方法

SSH 是 Linux 系统管理的重要工具，正确配置和使用 SSH 可以大大提高工作效率和系统安全性。

# 十二、相关参考

- [OpenSSH 官方文档](https://www.openssh.com/manual.html)
- [SSH 配置文件手册](https://man.openbsd.org/ssh_config)
- [SSH 服务器配置手册](https://man.openbsd.org/sshd_config)
- [Ubuntu SSH 文档](https://help.ubuntu.com/community/SSH)
- [fail2ban 官方文档](https://www.fail2ban.org/wiki/index.php/Main_Page)

---
title: 在阿里云上部署 Django 应用：完整部署指南
title_en: "Deploy Django Application on Aliyun: Complete Deployment Guide"
date: 2017-12-17 21:09:26
updated: 2017-12-17 21:09:26
tags: Django, Deployment, Nginx, Gunicorn, Aliyun, Linux
---

> 本文详细介绍如何在阿里云服务器上部署 Django 应用，包括服务器初始化、环境配置、Nginx 配置、Gunicorn 部署、SSL 证书配置以及自动化部署等完整流程。适用于 Ubuntu/Debian 系统的生产环境部署。

# 一、部署前的准备

## 1.1 服务器准备

### 购买和配置云服务器

1. **购买云服务器**：在阿里云控制台购买 ECS 实例
2. **购买域名**：购买域名并完成备案（如需要）
3. **域名解析**：将域名解析到服务器公网 IP

### 服务器初始化

**重要提示**：服务器购买成功后，建议执行一次**重新初始化磁盘**操作（需要先停止服务器），确保系统镜像干净。执行该操作时，网页会提示设置远程登录密码。

### 远程登录服务器

```bash
# SSH 登录服务器
ssh root@your-server-ip

# 输入密码后登录成功
```

## 1.2 系统更新和用户创建

```bash
# 更新系统包列表
apt-get update

# 升级系统包
apt-get upgrade -y

# 执行系统版本升级（可选，谨慎操作）
# do-release-upgrade

# 创建非 root 用户（推荐使用非 root 用户）
useradd -m -s /bin/bash django
usermod -a -G sudo django  # 添加到 sudo 组
passwd django  # 设置密码

# 切换到新用户
su - django
```

## 1.3 配置 SSH 密钥（推荐）

```bash
# 在本地机器生成 SSH 密钥对（如果还没有）
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# 将公钥复制到服务器
ssh-copy-id django@your-server-ip

# 测试无密码登录
ssh django@your-server-ip
```

## 1.4 配置防火墙

```bash
# 安装 UFW（如果未安装）
sudo apt-get install ufw

# 允许 SSH（重要：先允许 SSH，避免被锁在外面）
sudo ufw allow 22/tcp

# 允许 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看防火墙状态
sudo ufw status
```

# 二、安装基础软件

## 2.1 安装 Python 和 pip

```bash
# 安装 Python 3 和 pip
sudo apt-get update
sudo apt-get install -y python3 python3-pip python3-venv

# 验证安装
python3 --version
pip3 --version

# 升级 pip
pip3 install --upgrade pip
```

## 2.2 安装 Git

```bash
# 安装 Git
sudo apt-get install -y git

# 配置 Git（可选）
git config --global user.name "Your Name"
git config --global user.email "your_email@example.com"

# 验证安装
git --version
```

## 2.3 安装 Nginx

```bash
# 安装 Nginx
sudo apt-get install -y nginx

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查 Nginx 状态
sudo systemctl status nginx

# 查看 Nginx 进程
ps -ef | grep nginx

# 测试：访问 http://your-server-ip 应该看到 Nginx 默认页面
```

**常用 Nginx 命令**：

```bash
# 启动/停止/重启/重载配置
sudo systemctl start nginx
sudo systemctl stop nginx
sudo systemctl restart nginx
sudo systemctl reload nginx  # 不中断服务重载配置

# 测试配置文件语法
sudo nginx -t
```

## 2.4 安装 MySQL 数据库

```bash
# 检查是否已安装 MySQL
netstat -tap | grep mysql

# 安装 MySQL Server 和 Client
sudo apt-get install -y mysql-server mysql-client

# 启动 MySQL 服务
sudo systemctl start mysql

# 设置开机自启
sudo systemctl enable mysql

# 检查 MySQL 状态
sudo systemctl status mysql

# 查看 MySQL 进程
ps -ef | grep mysql
```

### MySQL 安全配置

```bash
# 运行安全配置脚本
sudo mysql_secure_installation

# 该脚本会引导你完成：
# - 设置 root 密码
# - 移除匿名用户
# - 禁止 root 远程登录
# - 移除测试数据库
```

### 创建数据库和用户

```bash
# 登录 MySQL（使用 sudo 或 root）
sudo mysql -u root -p

# 在 MySQL 中执行以下命令
```

```sql
-- 创建数据库（使用 utf8mb4 编码，支持 emoji）
CREATE DATABASE myproject CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建数据库用户
CREATE USER 'django_user'@'localhost' IDENTIFIED BY 'your_secure_password';

-- 授予权限
GRANT ALL PRIVILEGES ON myproject.* TO 'django_user'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出 MySQL
EXIT;
```

### 修改 MySQL root 密码

```bash
# 方法一：使用 mysqladmin
sudo mysqladmin -u root -p password 'newpassword'

# 方法二：在 MySQL 中修改
sudo mysql -u root -p
```

```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'newpassword';
FLUSH PRIVILEGES;
```

# 三、部署 Django 应用

## 3.1 创建项目目录

```bash
# 创建项目目录结构
mkdir -p ~/sites/myproject
cd ~/sites/myproject

# 或者使用域名作为目录名
mkdir -p ~/sites/www.example.com
cd ~/sites/www.example.com
```

## 3.2 创建虚拟环境

```bash
# 创建虚拟环境
python3 -m venv env

# 激活虚拟环境
source env/bin/activate

# 验证虚拟环境（命令提示符前应该显示 (env)）
which python
python --version
```

## 3.3 克隆项目代码

```bash
# 克隆项目（根据你的代码托管方案）
git clone https://github.com/yourusername/yourproject.git

# 或者使用 SSH
git clone git@github.com:yourusername/yourproject.git

# 进入项目目录
cd yourproject
```

## 3.4 安装项目依赖

```bash
# 确保虚拟环境已激活
source ~/sites/myproject/env/bin/activate

# 安装项目依赖
pip install -r requirements.txt

# 如果遇到 mysql_config not found 错误，安装以下包
sudo apt-get install -y libmysqlclient-dev default-libmysqlclient-dev

# 如果使用 PostgreSQL
sudo apt-get install -y libpq-dev

# 如果使用其他数据库驱动，安装相应的开发包
```

## 3.5 配置 Django 项目

### 创建或修改 settings.py

```python
# settings.py

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# 安全设置
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-here')
DEBUG = False  # 生产环境必须设置为 False
ALLOWED_HOSTS = ['www.example.com', 'example.com', 'your-server-ip']

# 数据库配置
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'NAME': 'myproject',
        'USER': 'django_user',
        'PASSWORD': 'your_secure_password',
        'HOST': 'localhost',
        'PORT': '3306',
        'OPTIONS': {
            'charset': 'utf8mb4',
        },
    }
}

# 静态文件配置
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# 媒体文件配置（如果需要）
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# 安全设置
SECURE_SSL_REDIRECT = True  # 如果使用 HTTPS
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
```

### 使用环境变量管理敏感信息

```bash
# 创建 .env 文件（不要提交到版本控制）
cat > .env << EOF
SECRET_KEY=your-secret-key-here
DB_NAME=myproject
DB_USER=django_user
DB_PASSWORD=your_secure_password
DEBUG=False
EOF
```

```python
# 安装 python-decouple 或 python-dotenv
pip install python-decouple

# 在 settings.py 中使用
from decouple import config

SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=False, cast=bool)
```

## 3.6 执行数据库迁移

```bash
# 确保虚拟环境已激活
source env/bin/activate

# 进入项目目录
cd yourproject

# 创建迁移文件
python manage.py makemigrations

# 查看迁移 SQL（可选）
python manage.py sqlmigrate app_name 0001

# 执行迁移
python manage.py migrate

# 创建超级用户
python manage.py createsuperuser
```

## 3.7 收集静态文件

```bash
# 收集静态文件到 STATIC_ROOT 目录
python manage.py collectstatic

# 如果提示覆盖，输入 yes
# 静态文件会被收集到项目根目录的 static 文件夹中
```

## 3.8 测试 Django 应用

```bash
# 测试运行（仅用于测试，不要在生产环境使用）
python manage.py runserver 0.0.0.0:8000

# 访问 http://your-server-ip:8000 测试
# 测试完成后按 Ctrl+C 停止
```

# 四、配置 Nginx

## 4.1 创建 Nginx 配置文件

```bash
# 创建站点配置文件
sudo nano /etc/nginx/sites-available/www.example.com
```

```nginx
# /etc/nginx/sites-available/www.example.com

server {
    listen 80;
    server_name www.example.com example.com;
    charset utf-8;
    client_max_body_size 75M;

    # 静态文件配置
    location /static {
        alias /home/django/sites/www.example.com/yourproject/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 媒体文件配置（如果需要）
    location /media {
        alias /home/django/sites/www.example.com/yourproject/media;
    }

    # 代理到 Gunicorn
    location / {
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_pass http://unix:/tmp/www.example.com.socket;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # 禁止访问隐藏文件
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
}
```

## 4.2 启用站点配置

```bash
# 创建符号链接到 sites-enabled
sudo ln -s /etc/nginx/sites-available/www.example.com /etc/nginx/sites-enabled/www.example.com

# 删除默认配置（可选）
sudo rm /etc/nginx/sites-enabled/default

# 测试 Nginx 配置
sudo nginx -t

# 如果测试通过，重载 Nginx
sudo systemctl reload nginx
```

## 4.3 配置 SSL 证书（HTTPS）

### 使用 Let's Encrypt 免费证书

```bash
# 安装 Certbot
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d www.example.com -d example.com

# 证书会自动续期，但可以测试续期
sudo certbot renew --dry-run

# 查看证书信息
sudo certbot certificates
```

Certbot 会自动修改 Nginx 配置文件，添加 SSL 配置。

### 手动配置 SSL（如果使用其他证书）

```nginx
server {
    listen 443 ssl http2;
    server_name www.example.com example.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 其他配置...
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name www.example.com example.com;
    return 301 https://$server_name$request_uri;
}
```

# 五、使用 Gunicorn 部署

## 5.1 安装 Gunicorn

```bash
# 确保虚拟环境已激活
source ~/sites/www.example.com/env/bin/activate

# 安装 Gunicorn
pip install gunicorn

# 验证安装
gunicorn --version
```

## 5.2 创建 Gunicorn 配置文件

```bash
# 创建 Gunicorn 配置目录
mkdir -p ~/sites/www.example.com/config

# 创建配置文件
nano ~/sites/www.example.com/config/gunicorn_config.py
```

```python
# config/gunicorn_config.py

import multiprocessing

# 服务器 socket
bind = "unix:/tmp/www.example.com.socket"
backlog = 2048

# Worker 进程
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
worker_connections = 1000
timeout = 30
keepalive = 2

# 日志
accesslog = "/home/django/sites/www.example.com/logs/access.log"
errorlog = "/home/django/sites/www.example.com/logs/error.log"
loglevel = "info"

# 进程命名
proc_name = "gunicorn_www.example.com"

# 服务器机制
daemon = False
pidfile = "/home/django/sites/www.example.com/gunicorn.pid"
umask = 0
user = None
group = None
tmp_upload_dir = None

# SSL（如果使用）
# keyfile = None
# certfile = None
```

## 5.3 创建日志目录

```bash
# 创建日志目录
mkdir -p ~/sites/www.example.com/logs

# 设置权限
chmod 755 ~/sites/www.example.com/logs
```

## 5.4 测试 Gunicorn

```bash
# 确保虚拟环境已激活
source ~/sites/www.example.com/env/bin/activate

# 进入项目目录
cd ~/sites/www.example.com/yourproject

# 测试运行 Gunicorn
gunicorn --config ~/sites/www.example.com/config/gunicorn_config.py yourproject.wsgi:application

# 或者使用命令行参数
gunicorn --bind unix:/tmp/www.example.com.socket --workers 3 yourproject.wsgi:application

# 测试访问后，按 Ctrl+C 停止
```

## 5.5 配置 Systemd 服务（推荐）

```bash
# 创建 systemd 服务文件
sudo nano /etc/systemd/system/gunicorn-www.example.com.service
```

```ini
[Unit]
Description=Gunicorn daemon for www.example.com
After=network.target

[Service]
User=django
Group=django
WorkingDirectory=/home/django/sites/www.example.com/yourproject
Environment="PATH=/home/django/sites/www.example.com/env/bin"
ExecStart=/home/django/sites/www.example.com/env/bin/gunicorn \
    --config /home/django/sites/www.example.com/config/gunicorn_config.py \
    yourproject.wsgi:application

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

```bash
# 重新加载 systemd
sudo systemctl daemon-reload

# 启动服务
sudo systemctl start gunicorn-www.example.com

# 设置开机自启
sudo systemctl enable gunicorn-www.example.com

# 查看服务状态
sudo systemctl status gunicorn-www.example.com

# 查看日志
sudo journalctl -u gunicorn-www.example.com -f
```

**常用 systemd 命令**：

```bash
# 启动/停止/重启/重载
sudo systemctl start gunicorn-www.example.com
sudo systemctl stop gunicorn-www.example.com
sudo systemctl restart gunicorn-www.example.com
sudo systemctl reload gunicorn-www.example.com  # 平滑重载（不中断连接）

# 查看状态和日志
sudo systemctl status gunicorn-www.example.com
sudo journalctl -u gunicorn-www.example.com -n 50  # 查看最近 50 条日志
```

# 六、部署后操作

## 6.1 更新代码流程

```bash
# 1. 登录服务器
ssh django@your-server-ip

# 2. 进入项目目录
cd ~/sites/www.example.com/yourproject

# 3. 激活虚拟环境
source ../env/bin/activate

# 4. 拉取最新代码
git pull origin main  # 或 master

# 5. 安装新依赖（如果有）
pip install -r requirements.txt

# 6. 执行数据库迁移（如果有）
python manage.py migrate

# 7. 收集静态文件（如果有新的静态文件）
python manage.py collectstatic --noinput

# 8. 重启 Gunicorn
sudo systemctl restart gunicorn-www.example.com

# 9. 重载 Nginx（如果需要）
sudo systemctl reload nginx
```

## 6.2 创建部署脚本

```bash
# 创建部署脚本
nano ~/sites/www.example.com/deploy.sh
```

```bash
#!/bin/bash
# deploy.sh

set -e  # 遇到错误立即退出

echo "开始部署..."

# 进入项目目录
cd ~/sites/www.example.com/yourproject

# 激活虚拟环境
source ../env/bin/activate

# 拉取最新代码
echo "拉取最新代码..."
git pull origin main

# 安装依赖
echo "安装依赖..."
pip install -r requirements.txt

# 执行迁移
echo "执行数据库迁移..."
python manage.py migrate

# 收集静态文件
echo "收集静态文件..."
python manage.py collectstatic --noinput

# 重启服务
echo "重启 Gunicorn..."
sudo systemctl restart gunicorn-www.example.com

# 重载 Nginx
echo "重载 Nginx..."
sudo systemctl reload nginx

echo "部署完成！"
```

```bash
# 添加执行权限
chmod +x ~/sites/www.example.com/deploy.sh

# 使用部署脚本
~/sites/www.example.com/deploy.sh
```

## 6.3 设置文件权限

```bash
# 设置项目目录权限
sudo chown -R django:django ~/sites/www.example.com

# 设置 socket 文件权限（Gunicorn 会自动创建）
# 确保 /tmp 目录有写权限
```

# 七、性能优化

## 7.1 Gunicorn 优化

```python
# config/gunicorn_config.py

# 根据服务器配置调整 workers
# CPU 密集型：workers = CPU 核心数 + 1
# I/O 密集型：workers = CPU 核心数 * 2 + 1
workers = 4

# 使用异步 worker（适合 I/O 密集型应用）
worker_class = "gevent"
worker_connections = 1000

# 超时设置
timeout = 30
graceful_timeout = 30
```

## 7.2 Nginx 优化

```nginx
# 启用 gzip 压缩
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss;

# 缓存设置
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m max_size=10g inactive=60m use_temp_path=off;

# 在 location 中使用缓存
location / {
    proxy_cache my_cache;
    proxy_cache_valid 200 60m;
    # ...
}
```

## 7.3 Django 优化

```python
# settings.py

# 数据库连接池
DATABASES = {
    'default': {
        # ...
        'CONN_MAX_AGE': 600,  # 连接池超时时间（秒）
    }
}

# 缓存配置（使用 Redis 或 Memcached）
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}

# 会话存储（使用缓存）
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
```

# 八、监控和日志

## 8.1 日志管理

```bash
# 查看 Gunicorn 日志
tail -f ~/sites/www.example.com/logs/error.log
tail -f ~/sites/www.example.com/logs/access.log

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# 查看 systemd 日志
sudo journalctl -u gunicorn-www.example.com -f
```

## 8.2 日志轮转

```bash
# 创建 logrotate 配置
sudo nano /etc/logrotate.d/gunicorn-www.example.com
```

```
/home/django/sites/www.example.com/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 django django
    sharedscripts
    postrotate
        systemctl reload gunicorn-www.example.com > /dev/null 2>&1 || true
    endscript
}
```

# 九、常见问题和故障排查

## 9.1 502 Bad Gateway

**原因**：Gunicorn 未运行或 socket 文件路径不正确

```bash
# 检查 Gunicorn 是否运行
sudo systemctl status gunicorn-www.example.com

# 检查 socket 文件
ls -l /tmp/www.example.com.socket

# 检查权限
sudo chmod 666 /tmp/www.example.com.socket  # 临时解决
```

## 9.2 静态文件 404

**原因**：静态文件路径配置错误或未收集静态文件

```bash
# 检查静态文件是否存在
ls -la ~/sites/www.example.com/yourproject/static

# 重新收集静态文件
python manage.py collectstatic

# 检查 Nginx 配置中的路径
sudo nginx -t
```

## 9.3 数据库连接错误

```bash
# 检查 MySQL 是否运行
sudo systemctl status mysql

# 测试数据库连接
mysql -u django_user -p -h localhost myproject

# 检查 Django 设置中的数据库配置
```

## 9.4 权限问题

```bash
# 检查文件所有者
ls -la ~/sites/www.example.com

# 修改所有者
sudo chown -R django:django ~/sites/www.example.com

# 检查 socket 文件权限
ls -l /tmp/www.example.com.socket
```

# 十、安全建议

## 10.1 Django 安全设置

```python
# settings.py

# 生产环境必须设置
DEBUG = False
ALLOWED_HOSTS = ['www.example.com', 'example.com']

# 安全设置
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
```

## 10.2 服务器安全

```bash
# 定期更新系统
sudo apt-get update && sudo apt-get upgrade -y

# 配置 fail2ban（防止暴力破解）
sudo apt-get install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# 禁用 root 登录（可选）
sudo nano /etc/ssh/sshd_config
# 设置 PermitRootLogin no
sudo systemctl restart sshd
```

# 十一、总结

通过本文的步骤，您已经完成了：

1. ✅ **服务器初始化**：系统更新、用户创建、防火墙配置
2. ✅ **环境搭建**：Python、Nginx、MySQL 安装配置
3. ✅ **Django 部署**：代码部署、数据库迁移、静态文件收集
4. ✅ **Nginx 配置**：反向代理、静态文件服务、SSL 证书
5. ✅ **Gunicorn 部署**：WSGI 服务器配置、systemd 服务
6. ✅ **自动化部署**：部署脚本、日志管理

现在您的 Django 应用应该已经成功部署在阿里云服务器上了！

# 十二、相关参考

- [Django 官方部署文档](https://docs.djangoproject.com/en/stable/howto/deployment/)
- [Gunicorn 文档](https://docs.gunicorn.org/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [Let's Encrypt 文档](https://letsencrypt.org/docs/)
- [使用 Nginx 和 Gunicorn 部署 Django 博客](https://www.zmrenwu.com/post/20/)
- [Django 教程](http://www.liujiangblog.com/course/django/2)

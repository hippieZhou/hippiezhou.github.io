---
title: Deploy Django on Aliyun
date: 2017-12-17 21:09:26
updated: 2017-12-17 21:09:26
tags: Django
---

# 部署前的准备：

购买域名和域名解析以及购买云服务器这些操作方法阿里云都有相应提示，按提示操作即可。这里需要指出的一点时，当服务器购买成功后请进入该实例执行一次 **重新初始化磁盘** 操作 (需要先停止该服务器) 确保系统镜像的干净，在执行该操作的时候，网页会提示你设置远程登陆的密码。服务器启动成功后远程登陆你的云服务器并更新系统

```bash
ssh root@ip
password

# 登陆成功后
do-releae-upgrade
apt-get update
apt-get upgrade

# 创建用户
useradd -m -s /bin/bash hippieZhou
usermod -a -G hippieZhou
passwd hippieZhou
su - hippieZhou
```

# 搭建 Nginx 服务器：

```bash
# 执行该操作后无误后，访问公网IP即可看到 Nginx 的默认页面
apt-get install Nginx

# 启动/重启/停止 Nginx
/etc/init.d/nginx statrt(& restart/stop)

# 查看 Nginx 是否已经启动
ps -ef|grep nginx
```

# 安装 Mysql 数据库：

```bash
# 测试本机是否已安装 mysql
netstat -tap|grep mysql

# 安装 mysql(这个过程会让你添加连接数据库的密码)
apt-get install mysql-server mysql-client

# 登陆 mysql
mysql -u root -p

# 创建数据库(需要设置编码格式，否者后面会导致数据库中文乱码)
create database ZQDB character set utf8;

# 启动mysql
service mysql start

# 查看 Nginx 是否已经启动
ps -ef|grep mysql

# 修改 root 用户密码
sudo mysqladmin -u root password newpassword
```

# 部署代码：

```bash
# 安装虚拟环境并启动
sudo apt-get install git python3 python3-pip
sudo pip3 install virtualenv
virtualenv --python=python3 env
source env/bin/activate

# 将代码克隆下来(依你具体的代码托管方案，我是采用 github 来托管的)
git clone htt://www.github.com/yourname/yourproject.git

# 安装依赖环境
pip install -r requirements.txt

# 如果提示 EnvironmentError: mysql_config not found 请执行下面操作
apt-get install libmysqld-dev

# 创建项目
django-admin.py startproject website

# 创建应用
django-admin.py startapp blog

# 收集静态文件、执行数据库迁移、创建超级用户
python3 manage.py collecstatic
python3 manage.py makemigrations
python3 manage.py migrate
python3 manage.py createsuperuser

# 查看执行 0001 数据库迁移的相关 SQL 语句
python3 manage.py sqlmigrate blog 0001

# 启动服务器
python3 manage.py runserver (IP:Port)

# 启动 django shell
python3 manage.py shell
```

# 配置 Nginx ：

在/etc/nginx/site-available/下创建一个本项目对应的配置文件

```bash
/etc/nginx/sites-available/www.hippiezhou.com
server {
    charset utf-8;
    listen 80;
    server_name www.hippiezhou.fun;

    location /static {
        alias /home/hippieZhou/sites/hippiezhou.fun/website/static; 
    }

    location / {
        proxy_set_header Host $host;
        proxy_pass http://unix:/tmp/www.hippiezhou.com.socket;
    }
}
```

创建该配置的连接文件到sites-enabled目录下，删除该目录中的default链接

```bash
ln -s /etc/nginx/sites-available/www.hippiezhou.fun /etc/nginx/sites-enabled/www.hippiezhou.fun
rm /etc/nginx/sites-enabled/default
```

# 通过 Gunicorn 部署代码：

```bash
# 在虚拟环境中安装Gunicorn包
pip3 install Gunicorn

# 用 Gunicorn 启动服务器进程，请确保在项目目录中执行该操作
gunicorn --bind unix:/tmp/www.hippiezhou.fun.socket website.wsgi:application

```

此时通过域名和IP应该是可以访问到你的项目的。
自动启动 Gunicorn
在 /etc/init/下创建一个自启动脚本gunicorn-www.hippiezhou.fun.conf

```bash
start on net-device-up
stop on shutdown

respawn

setuid hippieZhou
chdir /home/hippieZhou/sites/www.hippiezhou.fun/website

exec ../env/bin/gunicorn --bind unix:/tmp/www.hippiezhou.fun.socket website.wsgi:application
```

启动脚本

```bash
sudo start gunicorn-www.hippiezhou.fun
```

以后更新代码后只需要执行下面操作即可

```bash
sudo service nginx reload
sudo restart gunicorn-www.hippiezhou.fun
```

# 相关参考

1. [使用 Nginx 和 Gunicorn 部署 Django 博客](https://www.zmrenwu.com/post/20/)
1. [Django教程](http://www.liujiangblog.com/course/django/2)
1. [Django documentation](https://docs.djangoproject.com/en/1.11/)

# 注意事项：

1. 在进行部署时各个配置文件中对应的文件路径请确保正确；
1. 有些操作请在正确的文件路径下执行，否则会执行失败； 

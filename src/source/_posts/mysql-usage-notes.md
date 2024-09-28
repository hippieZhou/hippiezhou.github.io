---
title: MySQL usage notes
date: 2017-12-20 21:31:00
updated: 2017-12-20 21:31:00
tags: MySQL
---

# 环境配置

```shell
# 安装
sudo apt-get install mysql-client mysql-server

# 默认配置文件
/etc/my.cnf

# 为 root 用户设置密码
mysqladmin -u root -p password 'newpassword'

# 测试 mysql 安装是否正常（登陆）
mysql -u root -p

# 启动/停止/重启服务
/etc/init.d/mysqld start/stop/estart
```

# 相关操作

```Shell
# 查看当前所有数据库
show databases;

# 创建数据库（注意编码格式，避免数据乱码）
create database dbname (character set utf8);

# 删除数据库
drop database dbname;

# 使用数据库
use dbname;

# 查看数据库表
show tables;

# 查看表结构
show describle tablename;

# 创建表
create table tablename();

# 删除表
drop table tablename;

# 增加列
alter table tablename add columnname datatype [not null] [default]
# 删除列
alter table tablename drop columnname
# 修改列（注意 名称不变类型变/名称变类型不变/名称和类型都变 对应的语句）
alter table tablename change oldcolumnname newcolumnname datatype

# 插入数据
insert into tablename values(value0,value1,...)
insert into tablename(columnname) values(value)

# 条件查询
select * from tablename where columnname =(获取其它运算符) value

# null 字段的判断
select * from tablename where columnname is (not) null

# 去掉重复元素
select distinct columnname from tablename;

# 对查询结果进行排序（where 必须要在 order by 前面）
select * from tablename where ... order by columnname[asc/desc]
select * from tablename where ... order by columnname[asc/desc],columnname1[asc/desc],...

# 使用 limit 截取查询结果(offset：查询结果的起始位置，rowcount：从 offset 位置开始，获取的记录条数)
select * from tablename where ... order by ... limit [offset,] rowcount

# insert into & select
insert into tablename1 selct columnname1,columnname2 from tablename2
insert into tablename1 (columnname1,columnname2) select columnname3,columnname4 from tablename2

# 更新表数据
update tablename set columnname = value where ...
update tablename set columnname1 = value1, columnnamename2 = value2 ... where ...

# in
select * from tablename where columnname in (value1,value2,...)
select * from tablename where columnname in (select columnname1 from tablename1)

# Between
select * from tablename where columnname (not) between value1 and value2

# like(pattern:'abc','%abc','abc%','%abc%')
select * from tablename columnname (not)like pattern
```

# 常见问题

1. 启动 mysql 时提示 "No directory, logging in with HOME=/"

```bash
sudo service mysql stop
sudo usermod -d /var/lib/mysql/ mysql
sudo service mysql start
```

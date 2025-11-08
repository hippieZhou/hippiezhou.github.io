---
title: Snowflake 简介
title_en: Snowflake Intro
date: 2025-01-15 11:19:29
updated: 2025-01-15 11:19:29
tags: Snowflake
---

> Snowflake 是一家基于云架构的数据公司，通过将数据存储与数据计算分离，为企业提供高性能、可扩展、按需配置的数据服务。本文介绍 Snowflake 的基本概念、核心功能和主要应用场景。

# 一、什么是 Snowflake

[Snowflake](https://www.snowflake.com/en/) 是一家基于云架构的数据公司，成立于 2012 年。该平台通过和不同的云平台厂商 (Amazon Web Service， Microsoft Azure， Google Cloud Platform) 集成，为用户的数据导入提供更多选择。该平台通过将数据存储 (storage layer) 与数据计算 (compute layer) 分离，为企业提供高性能，可扩展，按需配置的数据服务。此外，该平台还通过提供 Data Products 来允许用户进行数据分发，应用开发。总的来讲提供了如下相关功能：

- List or buy data from the Snowflake marketplace
- Use Snowflake as a data warehouse and data lake
- Run data analysis and build visualizations
- Load data, build a data pipeline or migrate an existing warehouse
- Build or distribute an application with Snowflake
- Build or train a machine learning model

> 和 Snowflake 类似的竞品为 [Databricks](https://www.databricks.com/)。

# 二、Snowflake 的架构设计

Snowflake 是一个完全自主管理服务的数据平台 (DASS)。所有组件全都构建在云基础设施中。用户可以按需进行配置，按量进行付费 (Pay As You Go)。

![architecture-overview](/images/snowflake-intro/architecture-overview.png)

Snowflake 的架构大致可以分为三层：

- Database Storage

> 当数据加载到 Snowflake 中时，Snowflake 会将该数据重新组织为其内部优化的压缩柱状格式。Snowflake 将这些优化数据存储在云存储中。Snowflake 存储的数据对象不能被客户直接看到或访问；它们只能通过使用 Snowflake 运行的 SQL 查询操作来访问。

- Query Processing

> 查询执行在处理层中执行。Snowflake 使用“虚拟仓库(virtual warehouse)”处理查询。每个虚拟仓库都是由 Snowflake 从云提供商分配的多个计算节点组成的 MPP 计算集群。每个虚拟仓库都是一个独立的计算集群，不与其他虚拟仓库共享计算资源。因此，每个虚拟仓库不会对其他虚拟仓库的性能产生影响。

- Cloud Services

> 云服务层是协调 Snowflake 中活动的服务集合。这些服务将 Snowflake 的所有不同组件结合在一起，以便处理从登录查询调度的用户请求。云服务层还在云提供商 Snowflake 提供的计算实例上运行。

该层管理的服务包括：

- 身份验证
- 基础设施管理
- 元数据管理
- 查询解析和优化
- 访问控制

此外，Snowflake 还提供 `Time travel` 功能，允许具有特殊权限的用户对过去某个时间段的数据在保留期 `Retention Period` 内进行相关操作。

# 三、连接到 Snowflake

Snowflake 支持多种连接服务的方式：

- 基于 Web 的用户界面，可以从该界面访问管理和使用 Snowflake 的所有方面。
- 命令行客户端（例如 SnowSQL）还可以访问管理和使用 Snowflake 的所有方面。
- 其他应用程序（例如 Tableau）可以使用 ODBC 和 JDBC 驱动程序连接到 Snowflake。
- 可用于开发连接到 Snowflake 的应用程序的本机连接器（例如 Python、Spark）。
- 可用于将 ETL （例如 Informatica）和 BI 工具（例如 ThoughtSpot）等应用程序连接到 Snowflake 的第三方连接器。

# 四、开始使用

snowflake 支持结构化的 SQL 查询语句，同时还内置了 Python 环境，允许用户通过代码方式进行一些数据计算。官方提供了一些基础的教程来供初学者学习使用，可以参考这里：[Getting Started](https://docs.snowflake.com/user-guide-getting-started)。

# 五、相关参考

- [Snowflake Documentation](https://docs.snowflake.com/?_ga=2.46146287.938659337.1736732867-1432902502.1735886987&_gac=1.175425942.1736732867.EAIaIQobChMIj8qv_snxigMV2dhMAh2lhzW5EAAYASAAEgLdH_D_BwE)
- [Snowflake Tutorials](https://docs.snowflake.com/en/tutorials)
- [security-access-control-overview](https://docs.snowflake.cn/zh/user-guide/security-access-control-overview)
- [Learn Snowflake in 10 Minutes| High Paying Skills | Step by Step Hands-On Guide](https://www.youtube.com/watch?v=VIJH7TZXkaA)

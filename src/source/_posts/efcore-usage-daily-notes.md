---
title: EFCore Usage Daily Notes
date: 2024-06-06 14:22:52
tags: EFCore
---

> EF Core 是微软官方负责维护的 ORM 框架，支持多种数据库类型（包括关系型和非关系型）。在实际项目中，如果采用不恰当的使用方式，极易导致代码复杂度提升，服务性能下降。这里总结了大量在使用 EF Core 过程中的实现细节方案，方便结合自己的使用场景来选择对应的解决方案。

# Migration 的生成

需要安装的依赖包：

- Microsoft.EntityFrameworkCore.Design
- Microsoft.EntityFrameworkCore.Tools

```bash
# 安装 CLI 工具
dotnet tool update --global dotnet-ef
# 生成 Migration 文件
dotnet ef migrations add InitialCreate
# 移除上一次的 Migration
dotnet ef migrations remove
# 将 Migration 同步至数据库中
dotnet ef database update
```

> 注意不要手动修改 `Migrations` 文件夹中的任何文件。

# 基础类型的配置

- 枚举类型配置

```bash
public enum WineType
{
    [Description("Classic red")]
    Red = 1,
    [Description("Dinner white")]
    White = 2,
    [Description("Imported rose")]
    Rose = 3
}
public class Wine
{
    public string Name { get; set; }
    public WineType WineType { get; set; }
    public override string ToString() => $"{WineType} {Name}";
}

# 将枚举类型映射到数据库为 int
modelBuilder.Entity<Wine>()
    .Property(c => c.WineType)
    .HasConversion<int>();

# 将枚举类型映射到数据库为 string
modelBuilder.Entity<Wine>()
    .Property(c => c.WineType)
    .HasConversion<string>();
```

- 数据自动初始化

```bash
public class BaseEntity
{
    public Guid Id { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime UpdatedAt { get; set; }
}

modelBuilder.Entity<Wine>.HasKey(x => x.Id);
modelBuilder.Entity<Wine>.Property(x => x.Id).ValueGeneratedOnAdd().IsRequired();
modelBuilder.Entity<Wine>.Property(x => x.CreatedAt).HasColumnType("timestamptz").HasDefaultValueSql("CURRENT_TIMESTAMP").ValueGeneratedOnAdd();
modelBuilder.Entity<Wine>.Property(x => x.UpdatedAt).HasColumnType("timestamptz").HasDefaultValueSql("CURRENT_TIMESTAMP").ValueGeneratedOnUpdate();
```

- 导航属性

当我们的两张表有外键关联时，这个时候可以考虑使用 `导航属性` 的方式，这样可以极大简化我们的多表操作，这里列出微软官方链接：[Relationship navigations](https://learn.microsoft.com/en-us/ef/core/modeling/relationships/navigations)

# 实体配置

- 方式一：属性配置

这种方式是将实体字段对应数据库的配置通过 `attribute` 的方式写在对应 Property 上面。也是最简单的配置方式。但是当我们的实体代码变多时，多表关系变复杂时，这种方式显示就有些臃肿了。

```bash
[Table("blogs")]
public class Blog
{
    [Key]
    public int Id { get; set; }
    [MaxLength(500)]
    public string Url { get; set; }
}
```

- 方式二：重写 `OnModelCreateing`

这种方式会将实体定义与实体相关的数据库配置分开处理，会使代码相对 clean 一些，但是由于 `OnModelCreating` 方法是需要配置所有的实体配置，所以同样存在代码冗长的问题。

```bash
internal class MyContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Blog>().ToTable("blogs").HasKey(x => x.Id);;
        modelBuilder.Entity<Wine>.Property(x => x.Url).HasMaxLength(500);
    }
}
```

- 方式三：继承 `IEntityTypeConfiguration` 配置

这种方式是将实体定义与实体配置完全分开，每个实体对应独立的实体配置类，当项目代码复杂时，能快速找到不同实体对应的数据库配置内容，让关注点完全分离。

```bash
[EntityTypeConfiguration<BlogTypeConfiguration, Blog>]
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }
}

public class BlogTypeConfiguration : IEntityTypeConfiguration<Blog>
{
    public void Configure(EntityTypeBuilder<Blog> builder)
    {
        builder.ToTable("blogs").HasKey(x => x.BlogId);;
        builder.Property(x => x.Url).HasMaxLength(500);
    }
}
```

以上三种方式都能实现相同的目的，没有好坏之分。如果在真实项目中，个人更倾向于用第三种方式。

# Repository 的实现（UOW ？）

当我们在项目中引入 EF Core 之后，我们会习惯性的创建 `Repository` 层来抽象数据库的操作，但是我们是否想过 `Repository` 的由来以及它真正要解决的问题。`UOW` 模式在早期项目开发时，确实帮忙我们解决了数据库相关操作的问题，但是当我们引入了 ORM 框架后（尤其是 EF Core）后，再套用之前的那一套 `UOW` 会发现我们的代码越写越奇怪。合理罗列一些我认为的一些 bad smell

- 每个 Repository 中如果有更新数据的操作的话，都会重复调用 EF Core 的 保存方法
- 每个 Repository 中有很多相似的代码，只是 DBSet 不一样
- 如果涉及到跨表操作（主外键关联）的话，单一的 Repository 层已经不能满足我们的需求，还不如直接操作 DbContext 来的方便
- ......

对于以上这些问题，我们可能没有完美的解决方法，但是我们可以结合我们的实际项目情况采用合适的方式实现合适的 `Unit of Work`。

# 数据操作

## 敏感数据

EF Core 支持配置日志信息中是否显示敏感信息，具体可以参考官方链接：[DbContextOptionsBuilder.EnableSensitiveDataLogging](https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.dbcontextoptionsbuilder.enablesensitivedatalogging?view=efcore-8.0)

## 数据跟踪

EF Core 默认是启用数据跟踪特性，这样是方便在数据更新时，能保证对象数据关联，但是如果对于查询类的数据，我们不需要这种特性，如果查询的数据量过大，跟踪时间过长，会对我们的程序性能有一定的影响，所以我们可以尝试在必要的地方再启用这种特性，关于如何配置，可以参考官方链接：[DbContextOptionsBuilder.UseQueryTrackingBehavior](https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.dbcontextoptionsbuilder.usequerytrackingbehavior?view=efcore-8.0)

## 优化查询

EF Core 提供了一种高效的查询方式 **EF.CompileAsyncQuery**，这种方式比通过 DbSet 的方式更加高效。具体该如何使用可以参考官方链接：[EF.CompileAsyncQuery](https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.ef.compileasyncquery?view=efcore-8.0)

## Audit 实现

EF Core 提供了通过自定义 Interceptor 的方式来做一些 Audit 的功能，它可以满足通过操作 DbSet 的方式来生成对应的 Audit，但是如果通过 **直连 SQL** 的方式来操作的话，Interceptor 是无法跟踪该操作的。使用的时候还是需要注意这一点。

## 单元测试和集成测试

关于在测试中是否应该用真实的数据库还是用内存数据库的问题，一直存在着分歧。两者没有优劣之分，还是需要结合实际的项目情况来看。但是用真实数据库的话，有一些问题需要注意：比如测试依赖数据库中的基础数据是否互相影响；对于数据库中的数据是否需要清空；pipeline 上跑测试时，需要提供对应的真实数据库的基础设施；反观使用内存数据库则不存在这种问题。

# 相关参考

- [Entity Framework Core](https://learn.microsoft.com/en-us/ef/core/)

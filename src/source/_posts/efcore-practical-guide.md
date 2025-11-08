---
title: EF Core 实用指南：最佳实践与常见问题
title_en: "EF Core Practical Guide: Best Practices and Common Issues"
date: 2024-06-06 14:22:52
updated: 2024-06-06 14:22:52
tags: 
    - EFCore
    - .NET
    - ORM
    - Entity Framework
---

> EF Core 是微软官方维护的 ORM 框架，支持多种数据库类型（包括关系型和非关系型）。在实际项目中，如果采用不恰当的使用方式，极易导致代码复杂度提升、服务性能下降。本文总结了 EF Core 使用过程中的实现细节、最佳实践和常见问题，帮助开发者根据实际场景选择合适的解决方案。

# 一、数据库迁移（Migration）

## 1.1 安装必要的工具和包

### 安装 NuGet 包

在项目文件中添加以下包：

```xml
<ItemGroup>
  <PackageReference Include="Microsoft.EntityFrameworkCore.Design" Version="8.0.0">
    <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    <PrivateAssets>all</PrivateAssets>
  </PackageReference>
  <PackageReference Include="Microsoft.EntityFrameworkCore.Tools" Version="8.0.0">
    <IncludeAssets>runtime; build; native; contentfiles; analyzers; buildtransitive</IncludeAssets>
    <PrivateAssets>all</PrivateAssets>
  </PackageReference>
</ItemGroup>
```

### 安装 EF Core CLI 工具

```bash
# 安装全局工具
dotnet tool install --global dotnet-ef

# 更新工具
dotnet tool update --global dotnet-ef

# 验证安装
dotnet ef --version
```

## 1.2 Migration 常用命令

```bash
# 生成 Migration 文件
dotnet ef migrations add InitialCreate

# 生成指定名称的 Migration
dotnet ef migrations add AddUserTable

# 指定 DbContext（如果有多个 DbContext）
dotnet ef migrations add InitialCreate --context MyDbContext

# 指定项目（如果 DbContext 在不同的项目中）
dotnet ef migrations add InitialCreate --project MyProject --startup-project MyWebProject

# 移除最后一次 Migration（如果还未应用到数据库）
dotnet ef migrations remove

# 将 Migration 应用到数据库
dotnet ef database update

# 更新到指定的 Migration
dotnet ef database update MigrationName

# 回滚到上一个 Migration
dotnet ef database update PreviousMigrationName

# 生成 SQL 脚本（不应用到数据库）
dotnet ef migrations script

# 生成从指定 Migration 到最新版本的 SQL 脚本
dotnet ef migrations script FromMigration ToMigration
```

## 1.3 Migration 最佳实践

- ⚠️ **不要手动修改 Migration 文件**：Migration 文件应该由 EF Core 自动生成和管理
- ✅ **版本控制**：将 Migration 文件纳入版本控制
- ✅ **命名规范**：使用描述性的 Migration 名称，如 `AddUserTable`、`UpdateProductPrice`
- ✅ **测试 Migration**：在开发环境中先测试 Migration，再应用到生产环境
- ✅ **备份数据库**：在生产环境应用 Migration 前，务必备份数据库

# 二、基础类型配置

## 2.1 枚举类型配置

### 枚举映射为整数

```C#
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
    public int Id { get; set; }
    public string Name { get; set; }
    public WineType WineType { get; set; }
}

// 在 DbContext 中配置
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // 将枚举映射为 int（默认方式）
    modelBuilder.Entity<Wine>()
        .Property(c => c.WineType)
        .HasConversion<int>();
}
```

### 枚举映射为字符串

```C#
// 将枚举映射为字符串
modelBuilder.Entity<Wine>()
    .Property(c => c.WineType)
    .HasConversion<string>();

// 或者使用自定义转换器
modelBuilder.Entity<Wine>()
    .Property(c => c.WineType)
    .HasConversion(
        v => v.ToString(),
        v => (WineType)Enum.Parse(typeof(WineType), v));
```

### 枚举值转换器（推荐）

```C#
public class WineTypeConverter : ValueConverter<WineType, string>
{
    public WineTypeConverter() : base(
        v => v.ToString(),
        v => Enum.Parse<WineType>(v))
    {
    }
}

// 使用自定义转换器
modelBuilder.Entity<Wine>()
    .Property(c => c.WineType)
    .HasConversion<WineTypeConverter>();
```

## 2.2 值对象（Value Objects）

```C#
public class Address
{
    public string Street { get; set; }
    public string City { get; set; }
    public string ZipCode { get; set; }
}

public class User
{
    public int Id { get; set; }
    public string Name { get; set; }
    public Address Address { get; set; }
}

// 配置值对象
modelBuilder.Entity<User>()
    .OwnsOne(u => u.Address, a =>
    {
        a.Property(p => p.Street).HasColumnName("Street");
        a.Property(p => p.City).HasColumnName("City");
        a.Property(p => p.ZipCode).HasColumnName("ZipCode");
    });
```

## 2.3 自动初始化字段

### 基础实体类

```C#
public class BaseEntity
{
    public Guid Id { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class Wine : BaseEntity
{
    public string Name { get; set; }
    public WineType WineType { get; set; }
}
```

### 配置自动初始化

```C#
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // 配置主键
    modelBuilder.Entity<Wine>()
        .HasKey(x => x.Id);

    // 配置 Id 自动生成
    modelBuilder.Entity<Wine>()
        .Property(x => x.Id)
        .ValueGeneratedOnAdd()
        .IsRequired();

    // 配置 CreatedAt：插入时自动设置
    modelBuilder.Entity<Wine>()
        .Property(x => x.CreatedAt)
        .HasColumnType("timestamptz")
        .HasDefaultValueSql("CURRENT_TIMESTAMP")
        .ValueGeneratedOnAdd();

    // 配置 UpdatedAt：更新时自动设置
    modelBuilder.Entity<Wine>()
        .Property(x => x.UpdatedAt)
        .HasColumnType("timestamptz")
        .HasDefaultValueSql("CURRENT_TIMESTAMP")
        .ValueGeneratedOnAddOrUpdate();
}
```

### 使用 SaveChangesInterceptor 自动设置

```C#
public class TimestampInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        foreach (var entry in eventData.Context.ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAt = DateTime.UtcNow;
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAt = DateTime.UtcNow;
            }
        }

        return result;
    }
}

// 在 DbContext 中注册
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    optionsBuilder.AddInterceptors(new TimestampInterceptor());
}
```

## 2.4 导航属性

导航属性是 EF Core 中处理关系的重要方式，可以极大简化多表操作。

### 一对一关系

```C#
public class Author
{
    public int Id { get; set; }
    public string Name { get; set; }
    public AuthorBio Bio { get; set; } // 导航属性
}

public class AuthorBio
{
    public int Id { get; set; }
    public string Biography { get; set; }
    public int AuthorId { get; set; }
    public Author Author { get; set; } // 导航属性
}

// 配置一对一关系
modelBuilder.Entity<Author>()
    .HasOne(a => a.Bio)
    .WithOne(b => b.Author)
    .HasForeignKey<AuthorBio>(b => b.AuthorId);
```

### 一对多关系

```C#
public class Blog
{
    public int Id { get; set; }
    public string Url { get; set; }
    public List<Post> Posts { get; set; } // 导航属性
}

public class Post
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Content { get; set; }
    public int BlogId { get; set; }
    public Blog Blog { get; set; } // 导航属性
}

// 配置一对多关系
modelBuilder.Entity<Blog>()
    .HasMany(b => b.Posts)
    .WithOne(p => p.Blog)
    .HasForeignKey(p => p.BlogId);
```

### 多对多关系

```C#
public class Student
{
    public int Id { get; set; }
    public string Name { get; set; }
    public List<Course> Courses { get; set; } // 导航属性
}

public class Course
{
    public int Id { get; set; }
    public string Title { get; set; }
    public List<Student> Students { get; set; } // 导航属性
}

// 配置多对多关系
modelBuilder.Entity<Student>()
    .HasMany(s => s.Courses)
    .WithMany(c => c.Students)
    .UsingEntity<Dictionary<string, object>>(
        "StudentCourse",
        j => j.HasOne<Course>().WithMany().HasForeignKey("CourseId"),
        j => j.HasOne<Student>().WithMany().HasForeignKey("StudentId"));
```

**参考**：[Relationship navigations](https://learn.microsoft.com/en-us/ef/core/modeling/relationships/navigations)

# 三、实体配置方式

EF Core 提供了三种配置实体的方式，各有优缺点：

## 3.1 方式一：数据注解（Data Annotations）

**优点**：
- ✅ 简单直接，配置写在实体类上
- ✅ 易于理解

**缺点**：
- ❌ 实体类与数据库配置耦合
- ❌ 复杂配置时代码臃肿
- ❌ 难以复用配置逻辑

```C#
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

[Table("blogs")]
public class Blog
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(500)]
    public string Url { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal Rating { get; set; }
}
```

## 3.2 方式二：Fluent API（OnModelCreating）

**优点**：
- ✅ 实体类与配置分离
- ✅ 配置集中管理

**缺点**：
- ❌ `OnModelCreating` 方法会变得很长
- ❌ 难以维护大量实体配置

```C#
internal class MyContext : DbContext
{
    public DbSet<Blog> Blogs { get; set; }
    public DbSet<Post> Posts { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Blog 配置
        modelBuilder.Entity<Blog>()
            .ToTable("blogs")
            .HasKey(x => x.Id);

        modelBuilder.Entity<Blog>()
            .Property(x => x.Url)
            .HasMaxLength(500)
            .IsRequired();

        // Post 配置
        modelBuilder.Entity<Post>()
            .ToTable("posts")
            .HasKey(x => x.Id);

        // ... 更多配置
    }
}
```

## 3.3 方式三：IEntityTypeConfiguration（推荐）

**优点**：
- ✅ 实体定义与配置完全分离
- ✅ 每个实体对应独立的配置类
- ✅ 易于维护和查找
- ✅ 配置可以复用

**缺点**：
- ❌ 需要创建额外的配置类

### 基本用法

```C#
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }
    public decimal Rating { get; set; }
}

public class BlogTypeConfiguration : IEntityTypeConfiguration<Blog>
{
    public void Configure(EntityTypeBuilder<Blog> builder)
    {
        builder.ToTable("blogs");
        builder.HasKey(x => x.BlogId);
        builder.Property(x => x.Url)
            .HasMaxLength(500)
            .IsRequired();
        builder.Property(x => x.Rating)
            .HasColumnType("decimal(18,2)");
    }
}

// 在 DbContext 中应用配置
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.ApplyConfiguration(new BlogTypeConfiguration());
    // 或者自动应用所有配置
    modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
}
```

### 自动发现配置（EF Core 6.0+）

```C#
// 使用特性标记实体类
[EntityTypeConfiguration(typeof(BlogTypeConfiguration))]
public class Blog
{
    public int BlogId { get; set; }
    public string Url { get; set; }
}

// EF Core 会自动发现并应用配置
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    // 自动应用所有标记了 EntityTypeConfiguration 特性的配置
    modelBuilder.ApplyConfigurationsFromAssembly(Assembly.GetExecutingAssembly());
}
```

### 配置对比

| 方式 | 适用场景 | 推荐度 |
|-----|---------|--------|
| **数据注解** | 简单项目、快速原型 | ⭐⭐ |
| **Fluent API** | 中小型项目 | ⭐⭐⭐ |
| **IEntityTypeConfiguration** | 大型项目、复杂配置 | ⭐⭐⭐⭐⭐ |

**建议**：在真实项目中，推荐使用第三种方式（`IEntityTypeConfiguration`），它提供了最好的可维护性和可扩展性。

# 四、Repository 模式与 Unit of Work

## 4.1 是否需要 Repository？

当引入 EF Core 后，很多开发者习惯性地创建 Repository 层来抽象数据库操作。但需要思考：Repository 模式真正要解决的问题是什么？

### EF Core 本身就是 Repository

EF Core 的 `DbContext` 和 `DbSet<T>` 已经实现了 Repository 模式的核心功能：

- ✅ 数据访问抽象
- ✅ 查询封装
- ✅ 变更跟踪
- ✅ 工作单元（Unit of Work）

### Repository 模式的常见问题

在 EF Core 中使用传统 Repository 模式时，容易出现以下问题：

- ⚠️ **重复调用 SaveChanges**：每个 Repository 都需要调用 `SaveChanges`，导致事务管理混乱
- ⚠️ **代码重复**：不同 Repository 中有大量相似的 CRUD 代码
- ⚠️ **跨表操作困难**：涉及多表关联时，Repository 层反而增加了复杂度
- ⚠️ **性能问题**：额外的抽象层可能影响查询性能

## 4.2 推荐的实现方式

### 方式一：直接使用 DbContext（推荐）

对于大多数场景，直接使用 `DbContext` 是最简单有效的方式：

```C#
public class BlogService
{
    private readonly MyContext _context;

    public BlogService(MyContext context)
    {
        _context = context;
    }

    public async Task<Blog> GetBlogAsync(int id)
    {
        return await _context.Blogs
            .Include(b => b.Posts)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task CreateBlogAsync(Blog blog)
    {
        _context.Blogs.Add(blog);
        await _context.SaveChangesAsync();
    }
}
```

### 方式二：通用 Repository（如果需要）

如果确实需要 Repository 模式，可以使用通用 Repository：

```C#
public interface IRepository<T> where T : class
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(T entity);
}

public class Repository<T> : IRepository<T> where T : class
{
    protected readonly DbContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(DbContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public virtual async Task<T?> GetByIdAsync(int id)
    {
        return await _dbSet.FindAsync(id);
    }

    public virtual async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _dbSet.ToListAsync();
    }

    public virtual async Task AddAsync(T entity)
    {
        await _dbSet.AddAsync(entity);
    }

    public virtual Task UpdateAsync(T entity)
    {
        _dbSet.Update(entity);
        return Task.CompletedTask;
    }

    public virtual Task DeleteAsync(T entity)
    {
        _dbSet.Remove(entity);
        return Task.CompletedTask;
    }
}

// Unit of Work 模式
public interface IUnitOfWork : IDisposable
{
    IRepository<Blog> Blogs { get; }
    IRepository<Post> Posts { get; }
    Task<int> SaveChangesAsync();
}

public class UnitOfWork : IUnitOfWork
{
    private readonly MyContext _context;
    private IRepository<Blog>? _blogs;
    private IRepository<Post>? _posts;

    public UnitOfWork(MyContext context)
    {
        _context = context;
    }

    public IRepository<Blog> Blogs => _blogs ??= new Repository<Blog>(_context);
    public IRepository<Post> Posts => _posts ??= new Repository<Post>(_context);

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context?.Dispose();
    }
}
```

### 方式三：特定查询接口

对于复杂查询，可以定义特定的查询接口：

```C#
public interface IBlogRepository
{
    Task<Blog?> GetBlogWithPostsAsync(int id);
    Task<IEnumerable<Blog>> GetPopularBlogsAsync(int count);
}

public class BlogRepository : IBlogRepository
{
    private readonly MyContext _context;

    public BlogRepository(MyContext context)
    {
        _context = context;
    }

    public async Task<Blog?> GetBlogWithPostsAsync(int id)
    {
        return await _context.Blogs
            .Include(b => b.Posts)
            .FirstOrDefaultAsync(b => b.Id == id);
    }

    public async Task<IEnumerable<Blog>> GetPopularBlogsAsync(int count)
    {
        return await _context.Blogs
            .OrderByDescending(b => b.Rating)
            .Take(count)
            .ToListAsync();
    }
}
```

## 4.3 最佳实践建议

1. ✅ **优先直接使用 DbContext**：对于大多数场景，直接使用 `DbContext` 更简单高效
2. ✅ **避免过度抽象**：不要为了使用模式而使用模式
3. ✅ **特定查询接口**：对于复杂查询，可以定义特定的查询接口
4. ✅ **统一事务管理**：使用 `DbContext` 的 `SaveChanges` 统一管理事务

# 五、数据操作与性能优化

## 5.1 敏感数据日志

EF Core 支持配置日志中是否显示敏感信息（如 SQL 参数值）：

```C#
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    // 开发环境：启用敏感数据日志
    #if DEBUG
    optionsBuilder.EnableSensitiveDataLogging();
    #endif

    // 生产环境：禁用敏感数据日志（默认）
}
```

**注意**：生产环境务必禁用敏感数据日志，避免泄露敏感信息。

**参考**：[DbContextOptionsBuilder.EnableSensitiveDataLogging](https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.dbcontextoptionsbuilder.enablesensitivedatalogging)

## 5.2 查询跟踪（Tracking）

### 跟踪行为配置

EF Core 默认启用变更跟踪，这对于更新操作很有用，但对于只读查询会影响性能：

```C#
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    // 全局禁用跟踪（仅用于只读场景）
    optionsBuilder.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);

    // 或者针对特定查询禁用跟踪
    var blogs = await _context.Blogs
        .AsNoTracking()
        .ToListAsync();
}
```

### 跟踪行为对比

| 跟踪行为 | 适用场景 | 性能 |
|---------|---------|------|
| **Tracking** | 需要更新数据的查询 | 较慢 |
| **NoTracking** | 只读查询、大量数据查询 | 较快 |

### 最佳实践

```C#
// 只读查询：使用 AsNoTracking
var blogs = await _context.Blogs
    .AsNoTracking()
    .ToListAsync();

// 需要更新的查询：使用默认跟踪
var blog = await _context.Blogs
    .FirstOrDefaultAsync(b => b.Id == id);
blog.Rating = 5.0;
await _context.SaveChangesAsync();
```

**参考**：[DbContextOptionsBuilder.UseQueryTrackingBehavior](https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.dbcontextoptionsbuilder.usequerytrackingbehavior)

## 5.3 编译查询（Compiled Queries）

对于频繁执行的查询，可以使用编译查询提升性能：

```C#
// 定义编译查询
private static readonly Func<MyContext, int, Task<Blog?>> GetBlogByIdQuery =
    EF.CompileAsyncQuery((MyContext context, int id) =>
        context.Blogs.FirstOrDefault(b => b.Id == id));

// 使用编译查询
public async Task<Blog?> GetBlogAsync(int id)
{
    return await GetBlogByIdQuery(_context, id);
}
```

**优点**：
- ✅ 查询只编译一次，后续执行更快
- ✅ 适合频繁执行的查询

**缺点**：
- ❌ 查询逻辑固定，不够灵活
- ❌ 代码复杂度增加

**参考**：[EF.CompileAsyncQuery](https://learn.microsoft.com/en-us/dotnet/api/microsoft.entityframeworkcore.ef.compileasyncquery)

## 5.4 批量操作

### 批量插入

```C#
// EF Core 7.0+ 支持批量插入
var blogs = new List<Blog>
{
    new Blog { Url = "blog1.com" },
    new Blog { Url = "blog2.com" },
    new Blog { Url = "blog3.com" }
};

_context.Blogs.AddRange(blogs);
await _context.SaveChangesAsync(); // 一次性插入多条记录
```

### 批量更新

```C#
// EF Core 7.0+ 支持 ExecuteUpdate
await _context.Blogs
    .Where(b => b.Rating < 3)
    .ExecuteUpdateAsync(setters => setters
        .SetProperty(b => b.Rating, b => b.Rating + 1));

// 或者使用 ExecuteDelete 批量删除
await _context.Blogs
    .Where(b => b.Rating < 1)
    .ExecuteDeleteAsync();
```

## 5.5 审计（Audit）实现

### 使用 Interceptor

```C#
public class AuditInterceptor : SaveChangesInterceptor
{
    public override InterceptionResult<int> SavingChanges(
        DbContextEventData eventData,
        InterceptionResult<int> result)
    {
        foreach (var entry in eventData.Context.ChangeTracker.Entries())
        {
            if (entry.Entity is IAuditableEntity auditable)
            {
                switch (entry.State)
                {
                    case EntityState.Added:
                        auditable.CreatedAt = DateTime.UtcNow;
                        auditable.CreatedBy = GetCurrentUser();
                        break;
                    case EntityState.Modified:
                        auditable.UpdatedAt = DateTime.UtcNow;
                        auditable.UpdatedBy = GetCurrentUser();
                        break;
                }
            }
        }

        return result;
    }

    private string GetCurrentUser()
    {
        // 获取当前用户逻辑
        return "System";
    }
}

public interface IAuditableEntity
{
    DateTime CreatedAt { get; set; }
    string CreatedBy { get; set; }
    DateTime UpdatedAt { get; set; }
    string UpdatedBy { get; set; }
}

// 注册 Interceptor
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    optionsBuilder.AddInterceptors(new AuditInterceptor());
}
```

### 审计日志记录

```C#
public class AuditLog
{
    public int Id { get; set; }
    public string EntityName { get; set; }
    public string EntityId { get; set; }
    public string Action { get; set; }
    public string Changes { get; set; }
    public DateTime Timestamp { get; set; }
    public string UserId { get; set; }
}

public class AuditLogInterceptor : SaveChangesInterceptor
{
    private readonly IAuditService _auditService;

    public AuditLogInterceptor(IAuditService auditService)
    {
        _auditService = auditService;
    }

    public override async ValueTask<InterceptionResult<int>> SavingChangesAsync(
        DbContextEventData eventData,
        InterceptionResult<int> result,
        CancellationToken cancellationToken = default)
    {
        var auditLogs = new List<AuditLog>();

        foreach (var entry in eventData.Context.ChangeTracker.Entries())
        {
            if (entry.State == EntityState.Added || 
                entry.State == EntityState.Modified || 
                entry.State == EntityState.Deleted)
            {
                auditLogs.Add(new AuditLog
                {
                    EntityName = entry.Entity.GetType().Name,
                    EntityId = entry.Property("Id").CurrentValue?.ToString() ?? "",
                    Action = entry.State.ToString(),
                    Changes = JsonSerializer.Serialize(entry.Properties.ToDictionary(
                        p => p.Metadata.Name,
                        p => new { Old = p.OriginalValue, New = p.CurrentValue })),
                    Timestamp = DateTime.UtcNow,
                    UserId = GetCurrentUser()
                });
            }
        }

        if (auditLogs.Any())
        {
            await _auditService.LogAsync(auditLogs);
        }

        return result;
    }
}
```

**注意**：Interceptor 只能跟踪通过 `DbSet` 的操作，无法跟踪直接执行 SQL 的操作。

## 5.6 查询性能优化

### 使用 Include 预加载关联数据

```C#
// 避免 N+1 查询问题
var blogs = await _context.Blogs
    .Include(b => b.Posts)
        .ThenInclude(p => p.Comments)
    .ToListAsync();
```

### 使用 Select 投影

```C#
// 只查询需要的字段
var blogSummaries = await _context.Blogs
    .Select(b => new BlogSummary
    {
        Id = b.Id,
        Url = b.Url,
        PostCount = b.Posts.Count()
    })
    .ToListAsync();
```

### 分页查询

```C#
var pageSize = 10;
var pageNumber = 1;

var blogs = await _context.Blogs
    .OrderBy(b => b.Id)
    .Skip((pageNumber - 1) * pageSize)
    .Take(pageSize)
    .ToListAsync();
```

# 六、测试

## 6.1 内存数据库 vs 真实数据库

### 内存数据库（In-Memory Database）

**优点**：
- ✅ 速度快，无需真实数据库基础设施
- ✅ 测试隔离性好，不会影响其他测试
- ✅ CI/CD 友好，无需配置数据库

**缺点**：
- ❌ 不支持某些数据库特定功能（如存储过程、触发器）
- ❌ 行为可能与真实数据库有差异

```C#
public class TestDbContext : DbContext
{
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseInMemoryDatabase("TestDb");
    }
}
```

### 真实数据库

**优点**：
- ✅ 完全模拟生产环境
- ✅ 支持所有数据库功能

**缺点**：
- ❌ 需要数据库基础设施
- ❌ 测试可能相互影响
- ❌ 需要清理测试数据

```C#
public class TestDbContext : DbContext
{
    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        optionsBuilder.UseNpgsql("Host=localhost;Database=TestDb;Username=test;Password=test");
    }
}
```

## 6.2 测试最佳实践

### 使用测试数据库

```C#
public class BlogServiceTests : IDisposable
{
    private readonly MyContext _context;
    private readonly BlogService _service;

    public BlogServiceTests()
    {
        var options = new DbContextOptionsBuilder<MyContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new MyContext(options);
        _service = new BlogService(_context);
    }

    [Fact]
    public async Task GetBlogAsync_ReturnsBlog_WhenExists()
    {
        // Arrange
        var blog = new Blog { Url = "test.com" };
        _context.Blogs.Add(blog);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetBlogAsync(blog.Id);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test.com", result.Url);
    }

    public void Dispose()
    {
        _context?.Dispose();
    }
}
```

### 使用事务回滚

```C#
[Fact]
public async Task CreateBlogAsync_CreatesBlog()
{
    using var transaction = await _context.Database.BeginTransactionAsync();
    try
    {
        // 执行测试
        var blog = new Blog { Url = "test.com" };
        await _service.CreateBlogAsync(blog);

        // 断言
        var result = await _context.Blogs.FindAsync(blog.Id);
        Assert.NotNull(result);
    }
    finally
    {
        await transaction.RollbackAsync();
    }
}
```

## 6.3 测试建议

- ✅ **选择合适的测试方式**：根据项目需求选择内存数据库或真实数据库
- ✅ **测试隔离**：确保测试之间不会相互影响
- ✅ **清理数据**：测试后清理测试数据
- ✅ **使用事务**：使用事务确保测试数据不会持久化

# 七、常见问题与最佳实践

## 7.1 常见问题

### N+1 查询问题

**问题**：循环中查询关联数据导致多次数据库查询

```C#
// ❌ 错误：N+1 查询
var blogs = await _context.Blogs.ToListAsync();
foreach (var blog in blogs)
{
    var posts = await _context.Posts.Where(p => p.BlogId == blog.Id).ToListAsync();
}

// ✅ 正确：使用 Include 预加载
var blogs = await _context.Blogs
    .Include(b => b.Posts)
    .ToListAsync();
```

### 查询性能问题

**问题**：查询大量数据导致性能问题

```C#
// ❌ 错误：查询所有数据
var blogs = await _context.Blogs.ToListAsync();

// ✅ 正确：使用分页或 Select 投影
var blogs = await _context.Blogs
    .Select(b => new { b.Id, b.Url })
    .Skip(0)
    .Take(10)
    .ToListAsync();
```

### 并发冲突

**问题**：多个用户同时更新同一条记录

```C#
// 使用乐观并发控制
public class Blog
{
    [Timestamp]
    public byte[] RowVersion { get; set; }
}

// 处理并发冲突
try
{
    await _context.SaveChangesAsync();
}
catch (DbUpdateConcurrencyException ex)
{
    // 处理并发冲突
    foreach (var entry in ex.Entries)
    {
        var databaseValues = await entry.GetDatabaseValuesAsync();
        // 解决冲突逻辑
    }
}
```

## 7.2 最佳实践总结

1. ✅ **使用 IEntityTypeConfiguration**：保持实体配置清晰和可维护
2. ✅ **合理使用跟踪**：只读查询使用 `AsNoTracking`
3. ✅ **避免 N+1 查询**：使用 `Include` 预加载关联数据
4. ✅ **使用分页**：查询大量数据时使用分页
5. ✅ **统一事务管理**：使用 `SaveChanges` 统一管理事务
6. ✅ **启用敏感数据日志**：仅在开发环境启用
7. ✅ **使用编译查询**：对频繁执行的查询使用编译查询
8. ✅ **测试隔离**：确保测试之间不会相互影响

# 八、总结

EF Core 是一个强大的 ORM 框架，正确使用可以大大提高开发效率。本文总结了：

1. ✅ **数据库迁移**：Migration 的生成和管理
2. ✅ **类型配置**：枚举、值对象、自动初始化字段
3. ✅ **实体配置**：三种配置方式的对比和选择
4. ✅ **Repository 模式**：是否需要以及如何实现
5. ✅ **性能优化**：查询跟踪、编译查询、批量操作
6. ✅ **审计实现**：使用 Interceptor 实现审计功能
7. ✅ **测试策略**：内存数据库 vs 真实数据库

掌握这些知识，可以帮助您更好地使用 EF Core，构建高性能、可维护的应用程序。

# 九、相关参考

- [Entity Framework Core 官方文档](https://learn.microsoft.com/en-us/ef/core/)
- [EF Core 性能最佳实践](https://learn.microsoft.com/en-us/ef/core/performance/)
- [EF Core 关系配置](https://learn.microsoft.com/en-us/ef/core/modeling/relationships)
- [EF Core 变更跟踪](https://learn.microsoft.com/en-us/ef/core/change-tracking/)
- [EF Core 测试](https://learn.microsoft.com/en-us/ef/core/testing/)

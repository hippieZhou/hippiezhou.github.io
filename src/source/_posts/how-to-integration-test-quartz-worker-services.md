---
title: 如何优雅地对 Quartz Worker 服务进行集成测试
title_en: How to Elegantly Perform Integration Testing for Quartz Worker Services
date: 2025-11-08 21:56:13
updated: 2025-11-08 21:56:13
tags: Quartz.NET, Testing, Integration Testing
---

> 在微服务架构中，后台任务调度服务（Worker Service）扮演着重要角色。当我们使用 Quartz.NET 构建定时任务服务时，如何进行有效的集成测试往往是一个挑战。传统的单元测试无法覆盖真实的调度场景，而端到端测试又过于笨重且难以控制。本文将分享一种优雅的集成测试方案，它既能保证测试的真实性，又能提供良好的可控性和隔离性。这套方案已经在生产环境中验证，值得借鉴。

# 一、面临的挑战

在对 Quartz Worker 服务进行集成测试时，我们通常会遇到以下问题：

## 1.1 定时任务自动执行的干扰

Quartz 的 `QuartzHostedService` 会在后台自动按计划执行任务，这在测试环境中会带来：
- ⚠️ 无法精确控制任务的执行时机
- ⚠️ 测试之间可能相互干扰
- ⚠️ 难以验证特定场景下的行为

## 1.2 外部依赖的复杂性

Worker 服务通常依赖多个外部系统：
- 数据库
- REST API
- 消息队列
- 认证服务

如何在测试中隔离这些依赖是个难题。

## 1.3 异步任务的等待问题

如何在测试中知道异步任务已经完成？传统的 `Thread.Sleep()` 既不优雅也不可靠。

# 二、测试边界与准备工作

在编写集成测试之前，明确测试边界至关重要。这决定了测试的范围、Mock 的内容以及所需的准备工作。

## 2.1 定义测试边界

集成测试的核心是**测试组件间的协作**，而非端到端的系统测试。明确测试边界有助于：

- 🎯 **聚焦测试目标**：集中测试应用内部的业务逻辑和组件协作
- 🚀 **提高测试速度**：隔离慢速的外部依赖
- 🔒 **增强测试稳定性**：避免外部系统故障影响测试结果
- 🧪 **便于场景模拟**：轻松模拟各种外部响应（成功、失败、超时等）

**测试边界划分原则：**

集成测试的边界划分遵循以下层次结构：

**测试范围（真实运行的组件）：**

```
任务调度层 (Scheduler)
    ↓
业务处理层 (Services)
    ↓
数据层 (Repos)
```

这些核心组件由以下基础层支持：
- **依赖注入 (DI 容器)**：支持任务调度层
- **领域逻辑 (核心代码)**：支持业务处理层
- **数据库 (可选)**：支持数据层，可使用内存数据库

**测试边界**

这是区分真实运行组件和外部依赖的分界线。

**外部依赖（使用 Mock/Stub 替代）：**

- 外部 API
- 消息队列
- 第三方服务
- 认证服务
- 文件存储
- 缓存系统

数据层通过测试边界与外部依赖交互，所有外部依赖都应使用 Mock 或 Stub 进行隔离。

**边界内（真实运行）：**
- ✅ 应用程序代码（Job、Service、Repository）
- ✅ 依赖注入容器
- ✅ 内部业务逻辑
- ✅ 配置加载机制
- ✅ 数据访问层（可使用内存数据库）

**边界外（Mock 替代）：**
- ❌ 外部 HTTP/REST API
- ❌ 消息队列服务
- ❌ 第三方认证系统
- ❌ 云存储服务
- ❌ 邮件/短信服务
- ❌ 外部数据库（可选 Mock）

## 2.2 测试范围矩阵

| 组件类型 | 是否真实运行 | 实现方式 | 理由 |
|---------|-------------|---------|------|
| **Quartz Scheduler** | ✅ 是 | 真实 Scheduler（手动触发）| 测试调度机制 |
| **业务 Job** | ✅ 是 | 真实 Job 代码 | 核心测试目标 |
| **DI 容器** | ✅ 是 | 完整的 ServiceCollection | 测试依赖注入 |
| **业务逻辑层** | ✅ 是 | 真实 Service/StepLibrary | 测试业务流程 |
| **仓储层** | ✅ 是 | 真实 Repository 实现 | 测试数据访问逻辑 |
| **数据库** | 🟡 可选 | 内存数据库或 Testcontainers | 平衡速度与真实性 |
| **外部 HTTP API** | ❌ 否 | WireMock | 隔离外部系统 |
| **消息队列** | ❌ 否 | 内存队列/Mock | 避免依赖外部 MQ |
| **文件系统** | 🟡 可选 | 临时目录或 Mock | 根据测试需要 |
| **认证服务** | ❌ 否 | WireMock | 使用 fake token |

## 2.3 准备工作清单

### ✅ 环境配置

```C#
// 1. 确认测试项目引用必要的包
/*
<PackageReference Include="xUnit" Version="2.5.0" />
<PackageReference Include="WireMock.Net" Version="1.5.38" />
<PackageReference Include="Microsoft.Extensions.Hosting" Version="8.0.0" />
<PackageReference Include="Quartz" Version="3.8.0" />
*/

// 2. 配置测试专用的 appsettings.Test.json
{
  "Logging": {
    "LogLevel": {
      "Default": "Warning",  // 减少测试日志噪音
      "Microsoft": "Warning"
    }
  },
  "DatabaseConfig": {
    "DB_NAME": "test_db",
    "RetrySeconds": 1  // 缩短重试时间
  }
}
```

### ✅ 测试数据策略

```C#
// 方案 1: 使用 Fixture 模式创建测试数据
public class TestDataFixture
{
    public Transaction CreatePendingTransaction(string orderId = null)
    {
        return new Transaction
        {
            OrderId = orderId ?? Guid.NewGuid().ToString(),
            Type = "TestType",
            Status = "Pending",
            CreatedAt = DateTime.UtcNow
        };
    }
}

// 方案 2: 使用 Builder 模式
public class TransactionBuilder
{
    private Transaction _transaction = new();
    
    public TransactionBuilder WithOrderId(string id)
    {
        _transaction.OrderId = id;
        return this;
    }
    
    public TransactionBuilder AsPending()
    {
        _transaction.Status = "Pending";
        return this;
    }
    
    public Transaction Build() => _transaction;
}
```

### ✅ Mock API 预设

```C#
// 创建可复用的 Mock 配置
public static class WireMockExtensions
{
    public static void SetupAuthEndpoint(this WireMockServer server)
    {
        server.Given(Request.Create()
            .WithPath("/oauth2/token")
            .UsingPost())
        .RespondWith(Response.Create()
            .WithStatusCode(200)
            .WithBodyAsJson(new { access_token = "test-token", expires_in = 3600 }));
    }
    
    public static void SetupApiSuccess(this WireMockServer server, string path, object response)
    {
        server.Given(Request.Create().WithPath(path).UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(response));
    }
    
    public static void SetupApiError(this WireMockServer server, string path, int statusCode = 500)
    {
        server.Given(Request.Create().WithPath(path).UsingGet())
            .RespondWith(Response.Create().WithStatusCode(statusCode));
    }
}

// 在测试中使用
_factory.MockServer.SetupAuthEndpoint();
_factory.MockServer.SetupApiSuccess("/api/data", new { id = 1, status = "ok" });
```

### ✅ 数据库准备

```C#
// 选项 1: 使用内存数据库（适合简单场景）
services.AddDbContext<MyDbContext>(options =>
    options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}"));

// 选项 2: 使用 SQLite（适合需要更真实的 SQL 行为）
services.AddDbContext<MyDbContext>(options =>
    options.UseSqlite($"Data Source=test_{Guid.NewGuid()}.db"));

// 选项 3: 使用 Testcontainers（适合需要完全真实的数据库）
var container = new ContainerBuilder()
    .WithImage("postgres:15")
    .WithEnvironment("POSTGRES_PASSWORD", "test")
    .WithPortBinding(5432, true)
    .Build();
await container.StartAsync();
```

## 2.4 测试前的检查项

在开始编写测试之前，确认以下项目：

- [ ] **WorkerApplicationFactory 已实现**：包含 Mock Server、配置覆盖、Job 注册
- [ ] **程序入口点可扩展**：`Program.CreateHostBuilder` 接受回调函数
- [ ] **配置文件已准备**：测试专用的配置文件和覆盖策略
- [ ] **测试数据辅助类已创建**：Fixture、Builder 或 Factory 模式
- [ ] **Mock 预设已定义**：常用 API 的 Mock 配置封装为扩展方法
- [ ] **数据库策略已确定**：内存数据库、SQLite 或 Testcontainers
- [ ] **清理策略已实现**：每个测试后清理数据库、Mock 日志等

# 三、架构设计：可测试的 Worker 服务

## 3.1 核心设计思想

一个可测试的 Quartz Worker 服务应该具备以下特点：

```
┌─────────────────────────────────────────────────────────┐
│                    生产环境                               │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ Host Builder │ → │ Quartz Jobs  │ → 自动调度执行     │
│  └──────────────┘    └──────────────┘                  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                    测试环境                               │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │ Host Builder │ → │ Durable Jobs │ → 手动触发执行     │
│  │  (复用逻辑)   │    │  (无触发器)   │                  │
│  └──────────────┘    └──────────────┘                  │
│         ↓                                                │
│  ┌──────────────────────────────────┐                  │
│  │  配置覆盖：所有外部 URL 指向 Mock  │                  │
│  └──────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────┘
```

## 3.2 Program.cs 的设计要点

为了支持测试，`Program.cs` 需要采用**可扩展的设计**：

```C#
[ExcludeFromCodeCoverage]
public sealed class Program
{
    public static void Main(string[] args)
    {
        // 生产环境：注册带触发器的 Job
        var builder = CreateHostBuilder(args, 
            (services, configuration) => services.AddQuartzJobs(configuration));
        var host = builder.Build();
        host.Run();
    }

    // 关键：接受回调函数，允许测试环境自定义 Job 注册策略
    public static IHostBuilder CreateHostBuilder(
        string[] args, 
        Action<IServiceCollection, IConfiguration> callback)
    {
        var hostBuilder = Host.CreateDefaultBuilder(args)
            .ConfigureServices((context, services) =>
            {
                // 注册所有业务服务
                services.AddLogging();
                services.AddMemoryCache();
                
                // HTTP 客户端
                services.AddHttpClient<IAuthClient, AuthClient>();
                services.AddHttpClient<IApiCallClient, ApiCallClient>();
                
                // 仓储层
                services.AddSingleton<ITenantRepository, TenantRepository>();
                services.AddSingleton<ITransactionStateRepository, TransactionStateRepository>();
                
                // 业务逻辑层
                services.AddSingleton<IStepLibrary, StepLibrary>();
                services.AddSingleton<ITransactionHelper, TransactionHelper>();
                
                // Quartz 基础服务（但不注册 QuartzHostedService）
                services.AddQuartzServices();
                
                // 调用回调，允许外部自定义注册逻辑
                callback?.Invoke(services, context.Configuration);
            })
            .ConfigureAppConfiguration((context, config) =>
            {
                // 多环境配置策略
                var env = context.HostingEnvironment.EnvironmentName;
                var appSettingsFile = $"appsettings.{env}.json";

                config.AddJsonFile("appsettings.json", optional: false)
                    .AddJsonFile(appSettingsFile, optional: true)
                    .AddEnvironmentVariables();
            });

        return hostBuilder;
    }
}
```

**设计亮点：**
- ✅ `CreateHostBuilder` 是公共静态方法，测试可以直接调用
- ✅ 通过回调函数参数，允许测试环境使用不同的 Job 注册策略
- ✅ 所有业务服务的注册逻辑在测试和生产环境中完全一致

# 四、实现：集成测试基类

## 4.1 WorkerApplicationFactory 整体架构

```C#
public class WorkerApplicationFactory : IAsyncDisposable
{
    private readonly IHost _host;
    public WireMockServer MockServer { get; private set; }

    public WorkerApplicationFactory(Action<IServiceCollection>? configureServices = null)
    {
        // 1️⃣ 启动 WireMock 服务器
        MockServer = WireMockServer.Start();
        var mockBaseUrl = MockServer.Urls[0].TrimEnd('/');

        // 2️⃣ 复用生产环境的 HostBuilder，但使用测试专用的 Job 注册策略
        var hostBuilder = Program.CreateHostBuilder([], (services, configuration) =>
        {
            AddJobsForTesting(services, configuration);
            configureServices?.Invoke(services);
        })
        .UseEnvironment(Environments.Development);

        // 3️⃣ 覆盖配置，将所有外部 URL 指向 Mock 服务器
        hostBuilder.ConfigureAppConfiguration((context, config) =>
        {
            var configurationOverrides = new Dictionary<string, string?>
            {
                { "EgressUrl", mockBaseUrl }
            };
            
            // 最后添加的配置优先级最高
            config.AddInMemoryCollection(configurationOverrides);
        });

        _host = hostBuilder.Build();
    }
    
    // ... 其他方法
}
```

## 4.2 关键实现：测试环境的 Job 注册策略

这是整个方案的**核心**：

```C#
private void AddJobsForTesting(IServiceCollection services, IConfiguration configuration)
{
    services.AddQuartz(q =>
    {
        q.UseJobFactory<MicrosoftDependencyInjectionJobFactory>();
        q.AddJobListener<CustomJobListener>();

        // 🔑 关键：注册 Durable Jobs（持久化任务，无需触发器）
        // 这些 Job 不会自动执行，只能通过代码手动触发
        q.AddJob<CustomTestJob>(opts => 
            opts.WithIdentity(nameof(CustomTestJob)).StoreDurably());
            
    }).Configure<QuartzOptions>(options =>
    {
        options.Scheduling.IgnoreDuplicates = true;
    });

    // ⚠️ 重要：不要添加 QuartzHostedService
    // services.AddHostedService<QuartzHostedService>(); ❌ 绝对不要这样做
}
```

**为什么这样设计？**

| 配置项 | 生产环境 | 测试环境 | 说明 |
|--------|---------|---------|------|
| Job 注册 | `AddJob<T>()` + `AddTrigger()` | `AddJob<T>().StoreDurably()` | 测试环境不添加触发器 |
| QuartzHostedService | ✅ 添加 | ❌ 不添加 | 避免后台自动执行 |
| 调度器启动 | 自动启动 | 手动启动 | 测试中需要手动控制 |
| Job 执行方式 | 定时自动触发 | 手动按需触发 | 完全可控 |

## 4.3 启动测试环境

```C#
public async Task StartAsync(CancellationToken cancellationToken = default)
{
    if (_host is null)
    {
        throw new InvalidOperationException("Host is not initialized.");
    }

    // 启动 Host
    await _host.StartAsync(cancellationToken);

    // 设置 Mock API 响应
    MockServer.Given(
        Request.Create()
            .WithPath("/oauth2/token")
            .UsingPost())
        .RespondWith(
            Response.Create()
                .WithStatusCode(HttpStatusCode.OK)
                .WithHeader("Content-Type", "application/json")
                .WithBodyAsJson(new
                {
                    access_token = "fake-token-for-testing",
                    expires_in = 3600,
                    token_type = "Bearer"
                }));

    // 🔑 手动启动 Quartz 调度器（不会自动执行 Job）
    var schedulerFactory = GetService<ISchedulerFactory>();
    var scheduler = await schedulerFactory.GetScheduler(cancellationToken);
    if (!scheduler.IsStarted)
    {
        await scheduler.Start(cancellationToken);
    }
}

public TService GetService<TService>() where TService : class
{
    return _host.Services.GetRequiredService<TService>();
}
```

## 4.4 手动触发 Job 并等待完成

这是测试中最常用的方法，也是最精妙的设计：

```C#
/// <summary>
/// 手动触发 Job 并等待其完成
/// </summary>
public async Task<bool> TriggerJobAndWaitAsync<TJob>(
    TimeSpan? timeout = null, 
    CancellationToken cancellationToken = default) 
    where TJob : IJob
{
    var schedulerFactory = GetService<ISchedulerFactory>();
    var scheduler = await schedulerFactory.GetScheduler(cancellationToken);
    var jobKey = new JobKey(typeof(TJob).Name);
    
    // 使用 TaskCompletionSource 创建异步等待信号
    var tcs = new TaskCompletionSource<bool>();
    var maxWait = timeout ?? TimeSpan.FromMinutes(5);

    // 临时注册一个 JobListener 来监听任务完成
    var listenerKey = Guid.NewGuid().ToString();
    scheduler.ListenerManager.AddJobListener(
        new CompletedJobListener(listenerKey, jobKey, tcs),
        KeyMatcher<JobKey>.KeyEquals(jobKey));

    try
    {
        // 手动触发 Job
        await scheduler.TriggerJob(jobKey, cancellationToken);

        // 等待任务完成或超时
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(maxWait);

        return await tcs.Task.WaitAsync(cts.Token);
    }
    catch (OperationCanceledException)
    {
        return false; // 超时
    }
    finally
    {
        // 清理 Listener
        scheduler.ListenerManager.RemoveJobListener(listenerKey);
    }
}
```

**实现原理解析：**

```
1. 创建 TaskCompletionSource<bool>
   ↓
2. 注册临时 JobListener 监听 Job 完成事件
   ↓
3. 手动触发 Job：scheduler.TriggerJob(jobKey)
   ↓
4. 异步等待：await tcs.Task.WaitAsync(timeout)
   ↓
5. Job 完成 → Listener 触发 → tcs.SetResult(true)
   ↓
6. 测试代码继续执行，可以验证结果
```

## 4.5 CompletedJobListener 实现

```C#
internal class CompletedJobListener : IJobListener
{
    private readonly string _name;
    private readonly JobKey _jobKey;
    private readonly TaskCompletionSource<bool> _tcs;

    public CompletedJobListener(
        string name, 
        JobKey jobKey, 
        TaskCompletionSource<bool> tcs)
    {
        _name = name;
        _jobKey = jobKey;
        _tcs = tcs;
    }

    public string Name => _name;

    public Task JobToBeExecuted(
        IJobExecutionContext context, 
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    public Task JobExecutionVetoed(
        IJobExecutionContext context, 
        CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    public Task JobWasExecuted(
        IJobExecutionContext context,
        JobExecutionException? jobException,
        CancellationToken cancellationToken = default)
    {
        // Job 执行完成，设置信号
        if (context.JobDetail.Key.Equals(_jobKey))
        {
            if (jobException != null)
            {
                _tcs.SetException(jobException);
            }
            else
            {
                _tcs.SetResult(true);
            }
        }
        return Task.CompletedTask;
    }
}
```

# 五、编写集成测试

## 5.1 基本测试结构

使用 xUnit 的 `IAsyncLifetime` 接口管理测试生命周期：

```C#
public class MyJobTests : IAsyncLifetime
{
    private WorkerApplicationFactory _factory;

    public async Task InitializeAsync()
    {
        _factory = new WorkerApplicationFactory();
        await _factory.StartAsync();
    }

    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync();
    }

    [Fact]
    public async Task Job_Should_Process_Successfully()
    {
        // Arrange - 准备数据和 Mock
        var repository = _factory.GetService<IRepository>();
        await repository.InsertTestDataAsync();
        
        _factory.MockServer
            .Given(Request.Create().WithPath("/api/data").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithBodyAsJson(new { success = true }));
        
        // Act - 手动触发 Job
        var success = await _factory.TriggerJobAndWaitAsync<MyJob>(
            timeout: TimeSpan.FromSeconds(30)
        );
        
        // Assert - 验证结果
        Assert.True(success);
        var result = await repository.GetResultAsync();
        Assert.Equal("Completed", result.Status);
        
        // 验证 Mock API 被调用
        var requests = _factory.MockServer.LogEntries;
        Assert.Contains(requests, r => r.RequestMessage.Path == "/api/data");
    }
}
```

## 5.2 测试要点

**三步测试流程：**

1. **Arrange**：准备测试数据 + 配置 WireMock 响应
2. **Act**：调用 `TriggerJobAndWaitAsync<TJob>()` 手动触发任务
3. **Assert**：验证数据库状态 + API 调用记录 + 业务结果

**验证维度：**

```C#
// ✅ 验证 Job 执行成功
Assert.True(success, "Job should complete within timeout");

// ✅ 验证数据变更
var result = await _repository.GetByIdAsync(id);
Assert.Equal("Expected", result.Status);

// ✅ 验证 API 调用
var apiCalls = _factory.MockServer.LogEntries
    .Where(e => e.RequestMessage.Path.Contains("/api/endpoint"))
    .ToList();
Assert.Single(apiCalls);
```

# 六、最佳实践总结

## 6.1 设计原则

| 原则 | 说明 | 实现方式 |
|------|------|---------|
| **隔离性** | 测试之间不相互影响 | 每个测试使用独立的 Factory 实例 |
| **可控性** | 精确控制任务执行时机 | 不启用 QuartzHostedService，手动触发 |
| **可观测性** | 能够等待异步任务完成 | JobListener + TaskCompletionSource |
| **真实性** | 测试环境接近生产环境 | 复用生产配置逻辑和 DI 容器 |
| **依赖隔离** | 消除外部系统依赖 | WireMock 模拟所有外部 API |

## 6.2 关键技术点

### ✅ DO（应该这样做）

```C#
// ✅ 使用 StoreDurably() 注册 Job
q.AddJob<MyJob>(opts => opts
    .WithIdentity(nameof(MyJob))
    .StoreDurably());

// ✅ 不添加 QuartzHostedService
// 让调度器保持启动但不自动执行任务

// ✅ 使用 TaskCompletionSource 等待异步完成
var tcs = new TaskCompletionSource<bool>();
await scheduler.TriggerJob(jobKey);
await tcs.Task.WaitAsync(timeout);

// ✅ 配置覆盖放在最后
hostBuilder.ConfigureAppConfiguration((context, config) =>
{
    config.AddInMemoryCollection(testConfig); // 优先级最高
});

// ✅ 清理测试资源
public async Task DisposeAsync()
{
    await _factory.DisposeAsync();
    _factory.MockServer.Stop();
}
```

### ❌ DON'T（不要这样做）

```C#
// ❌ 不要在测试中添加 QuartzHostedService
services.AddHostedService<QuartzHostedService>(); // 会导致自动执行

// ❌ 不要使用 Thread.Sleep 等待
Thread.Sleep(5000); // 不可靠且浪费时间

// ❌ 不要在测试中连接真实的外部 API
services.AddHttpClient<IApiClient>(client => 
    client.BaseAddress = new Uri("https://real-api.com")); // 不稳定

// ❌ 不要注册带触发器的 Job
q.AddJob<MyJob>()
 .AddTrigger(t => t.WithCronSchedule("0/10 * * * * ?")); // 会自动执行

// ❌ 不要在测试间共享状态
private static WorkerApplicationFactory _sharedFactory; // 测试会相互影响
```

## 6.3 完整的技术栈

```yaml
核心框架:
  - .NET 6/7/8 Host Builder
  - Quartz.NET 3.x
  - xUnit (或 NUnit)

Mock 工具:
  - WireMock.Net (HTTP API Mock)
  - Testcontainers (可选，用于数据库)

依赖注入:
  - Microsoft.Extensions.DependencyInjection
  - Microsoft.Extensions.Configuration

异步控制:
  - TaskCompletionSource<T>
  - CancellationTokenSource
  - Quartz IJobListener
```

## 6.4 测试层次划分

```
单元测试 (Unit Tests)
├── 测试单个方法和类
├── Mock 所有依赖
└── 快速执行（毫秒级）

集成测试 (Integration Tests) ← 本文重点
├── 测试多个组件协作
├── 使用真实的 DI 容器
├── Mock 外部依赖（API、MQ）
└── 较慢执行（秒级）

端到端测试 (E2E Tests)
├── 测试整个系统
├── 使用真实的外部服务
└── 最慢执行（分钟级）
```

## 6.5 性能优化建议

```C#
// 1. 并行运行测试（xUnit 默认支持）
[Collection("Sequential")] // 仅对有状态依赖的测试使用
public class MyTests { }

// 2. 重用 WireMock 配置
private void SetupCommonMocks()
{
    // 提取公共 Mock 设置
}

// 3. 使用内存数据库
services.AddDbContext<MyDbContext>(options =>
    options.UseInMemoryDatabase("TestDb"));

// 4. 设置合理的超时
var success = await _factory.TriggerJobAndWaitAsync<MyJob>(
    timeout: TimeSpan.FromSeconds(10) // 不要设置过长
);
```

## 6.6 CI/CD 集成

```yaml
# GitHub Actions / Azure DevOps 示例
- name: Run Integration Tests
  run: |
    dotnet test \
      --filter "Category=Integration" \
      --logger "trx;LogFileName=integration-tests.xml" \
      --collect:"XPlat Code Coverage"
  env:
    ASPNETCORE_ENVIRONMENT: Testing
```

# 七、故障排查指南

## 问题 1：Job 无法触发

**症状：** `TriggerJobAndWaitAsync` 超时返回 false

**可能原因：**
```C#
// ❌ 忘记启动 Scheduler
var scheduler = await schedulerFactory.GetScheduler();
// await scheduler.Start(); // 缺少这一行

// ❌ Job 没有注册为 Durable
q.AddJob<MyJob>(); // 缺少 .StoreDurably()
```

**解决方案：**
```C#
// ✅ 确保 Scheduler 已启动
if (!scheduler.IsStarted)
{
    await scheduler.Start(cancellationToken);
}

// ✅ 注册为 Durable Job
q.AddJob<MyJob>(opts => opts
    .WithIdentity(nameof(MyJob))
    .StoreDurably());
```

## 问题 2：Mock API 没有被调用

**症状：** WireMock 日志为空

**可能原因：**
```C#
// ❌ 配置覆盖顺序错误
hostBuilder.ConfigureAppConfiguration((context, config) =>
{
    config.AddJsonFile("appsettings.json"); // 后添加优先级更高
    config.AddInMemoryCollection(testConfig); // 应该放在最后
});
```

**解决方案：**
```C#
// ✅ 测试配置必须最后添加
var hostBuilder = Program.CreateHostBuilder(args, callback);
hostBuilder.ConfigureAppConfiguration((context, config) =>
{
    // 在 CreateHostBuilder 之后添加，优先级最高
    config.AddInMemoryCollection(testConfig);
});
```

## 问题 3：测试之间相互干扰

**症状：** 单独运行通过，批量运行失败

**可能原因：**
```C#
// ❌ 共享状态
private static WorkerApplicationFactory _factory;

// ❌ 数据库状态未清理
```

**解决方案：**
```C#
// ✅ 每个测试使用独立实例
public class MyTests : IAsyncLifetime
{
    private WorkerApplicationFactory _factory;
    
    public async Task InitializeAsync()
    {
        _factory = new WorkerApplicationFactory();
        await _factory.StartAsync();
    }
    
    public async Task DisposeAsync()
    {
        await _factory.DisposeAsync(); // 清理资源
    }
}
```

# 相关参考

- [Quartz.NET Documentation](https://www.quartz-scheduler.net/documentation/)
- [WireMock.Net GitHub](https://github.com/WireMock-Net/WireMock.Net)
- [ASP.NET Core Integration Testing](https://docs.microsoft.com/en-us/aspnet/core/test/integration-tests)

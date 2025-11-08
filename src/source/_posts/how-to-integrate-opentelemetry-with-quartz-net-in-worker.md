---
title: 如何在 Worker 中集成 OpenTelemetry 与 Quartz.net
title_en: How to Integrate OpenTelemetry with Quartz.net in Worker
date: 2024-05-08 13:57:49
updated: 2024-05-08 13:57:49
tags: OpenTelemetry
---

> 在 .NET Core 的 Worker 类型项目中，**OpenTelemetry** 并没有为其提供标准的 `Instrumentation`，如果我们的项目中以 `Quartz.net` 作为我们默认的 Schedule Engine 的话，这个时候就需要考虑需要如何将两者集成到一起。本文介绍如何通过自定义 `IJobListener` 来实现 OpenTelemetry 与 Quartz.net 的集成，实现任务执行的分布式追踪。

# 一、问题背景

在微服务架构中，Worker Service 通常用于执行后台任务和定时作业。Quartz.net 是一个功能强大的任务调度框架，广泛应用于 .NET 应用中。然而，当我们需要对 Worker Service 进行监控和追踪时，会发现 OpenTelemetry 并没有为 Quartz.net 提供开箱即用的 Instrumentation。

## 1.1 为什么需要集成

- **可观测性需求**：在生产环境中，我们需要追踪每个定时任务的执行情况，包括执行时间、成功/失败状态等
- **问题排查**：当任务执行失败时，需要快速定位问题所在
- **性能监控**：了解任务的执行性能，识别性能瓶颈
- **分布式追踪**：在微服务架构中，任务可能调用其他服务，需要完整的调用链追踪

## 1.2 解决方案思路

Quartz.net 提供了 `IJobListener` 接口，允许我们在任务执行的生命周期中插入自定义逻辑。我们可以通过实现 `IJobListener` 来创建 OpenTelemetry 的 `Activity`，从而实现分布式追踪。

# 二、安装依赖包

```bash
dotnet add package Quartz.Extensions.Hosting
dotnet add package  OpenTelemetry.Extensions.Hosting
dotnet add package  OpenTelemetry.Exporter.Console
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
```

# 三、实现方案

## 3.1 JobListener 实现

`JobListener` 是实现 OpenTelemetry 集成的核心组件。它实现了 `IJobListener` 接口，在任务执行的关键生命周期节点创建 OpenTelemetry Activity。

### 关键实现点：

1. **ActivitySource 初始化**：根据环境名称和服务名称创建 `ActivitySource`
2. **JobToBeExecuted**：任务开始执行时创建 Activity，设置状态为 `Unset`
3. **JobWasExecuted**：任务执行完成后设置 Activity 状态（成功或失败）并结束

```C#
public class JobListener : IJobListener
{
    private readonly ActivitySource _activitySource;
    private readonly IDatetimeProvider _datetimeProvider;
    public string Name { get; }

    public JobListener(
        IOptions<DiagnosticsConfiguration> configuration,
        IHostEnvironment hostEnvironment,
        IDatetimeProvider datetimeProvider)
    {
        var envName = hostEnvironment.EnvironmentName;
        var serviceName = $"{envName}-{configuration.Value.ServiceName}";
        _activitySource = new ActivitySource(serviceName);
        _datetimeProvider = datetimeProvider;
        Name = GetType().Name;
    }

    public Task JobToBeExecuted(IJobExecutionContext context,
        CancellationToken cancellationToken = new CancellationToken())
    {
        using var activity = _activitySource.StartActivity($"{context.JobDetail.JobType.Name}.JobToBeExecuted");
        activity?.SetStatus(ActivityStatusCode.Unset);
        activity?.SetStartTime(_datetimeProvider.Now());
        return Task.CompletedTask;
    }

    public Task JobExecutionVetoed(IJobExecutionContext context,
        CancellationToken cancellationToken = new CancellationToken())
    {
        return Task.CompletedTask;
    }

    public Task JobWasExecuted(IJobExecutionContext context, JobExecutionException? jobException,
        CancellationToken cancellationToken = new CancellationToken())
    {
        using var activity = _activitySource.StartActivity($"{context.JobDetail.JobType.Name}.JobWasExecuted");
        activity?.SetStatus(jobException == null ? ActivityStatusCode.Ok : ActivityStatusCode.Error);
        activity?.SetEndTime(_datetimeProvider.Now());
        return Task.CompletedTask;
    }
}
```

## 3.2 Quartz 配置扩展方法

为了方便注册任务，我们可以创建一个扩展方法来简化 Quartz 任务的配置。这个方法会自动创建 JobKey 和 Trigger。

```C#
public static class QuartzJobExtensions
{
    public static void AddJobWithTrigger<T>(this IServiceCollectionQuartzConfigurator configurator,
        string cronExpression) where T : IJob
    {
        // Create a "key" for the job
        var jobKey = new JobKey(typeof(T).Name);

        // Register the job with the DI container
        configurator.AddJob<T>(opts => opts.WithIdentity(jobKey));

        // Create a trigger for the job
        configurator.AddTrigger(opts => opts
            .ForJob(jobKey)
            .WithIdentity($"{jobKey.Name}-trigger")
            .WithCronSchedule(cronExpression));
    }
}
```

## 3.3 Quartz 服务注册

在 `Program.cs` 中注册 Quartz 服务和 JobListener。

```C#
builder.Services.AddQuartz(q =>
{
    q.UseJobFactory<MicrosoftDependencyInjectionJobFactory>();
    q.AddJobListener<JobListener>();
    q.AddJobWithTrigger<HelloWorldJob>("0/2 * * * * ?"); // Run every 2 seconds
}).AddQuartzHostedService(
    q =>
    {
        q.WaitForJobsToComplete = true;
        q.StartDelay = TimeSpan.FromSeconds(0);
    });
```

## 3.4 OpenTelemetry 配置

配置 OpenTelemetry 的 Tracing，根据环境选择不同的 Exporter（开发环境使用 Console，生产环境使用 OTLP）。

```C#
private static void AddOpenTelemetry(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
{
    services.AddOpenTelemetry()
        .WithTracing(tracerProviderBuilder =>
            {
                var openTelemetryConfig = new DiagnosticsConfiguration();
                configuration.GetSection("OpenTelemetry").Bind(openTelemetryConfig);

                var envName = environment.EnvironmentName;
                var serviceName = $"{envName}-{openTelemetryConfig.ServiceName}";

                tracerProviderBuilder.ConfigureServices(serviceCollection =>
                {
                    services.AddOptions<DiagnosticsConfiguration>().Bind(configuration.GetSection("OpenTelemetry")).ValidateDataAnnotations();
                });

                tracerProviderBuilder
                    .AddSource(serviceName)
                    .ConfigureResource(resource => resource
                        .AddService(serviceName, openTelemetryConfig.ServiceNamespace)
                        .AddAttributes(new KeyValuePair<string, object>[]
                        {
                            new("deployment.environment", envName)
                        }));

                if (environment.IsDevelopment())
                {
                    tracerProviderBuilder.AddConsoleExporter();
                }
                else
                {
                    tracerProviderBuilder.AddOtlpExporter(options =>
                    {
                        options.Endpoint = new Uri(openTelemetryConfig.OtlpUrl);
                        options.Protocol = OtlpExportProtocol.HttpProtobuf;
                    });
                }
            }
        );
}
```

# 四、配置说明

## 4.1 appsettings.json 配置

在 `appsettings.json` 中添加 OpenTelemetry 配置：

```json
{
  "OpenTelemetry": {
    "ServiceName": "MyWorkerService",
    "ServiceNamespace": "MyCompany",
    "OtlpUrl": "http://localhost:4318"
  }
}
```

## 4.2 DiagnosticsConfiguration 类

创建配置类来绑定配置：

```C#
public class DiagnosticsConfiguration
{
    [Required]
    public string ServiceName { get; set; } = string.Empty;
    
    public string ServiceNamespace { get; set; } = string.Empty;
    
    [Required]
    public string OtlpUrl { get; set; } = string.Empty;
}
```

## 4.3 Program.cs 完整示例

```C#
var builder = Host.CreateApplicationBuilder(args);

// 注册 Quartz
builder.Services.AddQuartz(q =>
{
    q.UseJobFactory<MicrosoftDependencyInjectionJobFactory>();
    q.AddJobListener<JobListener>();
    q.AddJobWithTrigger<HelloWorldJob>("0/2 * * * * ?");
}).AddQuartzHostedService(q =>
{
    q.WaitForJobsToComplete = true;
    q.StartDelay = TimeSpan.FromSeconds(0);
});

// 注册 OpenTelemetry
builder.Services.AddOpenTelemetry(builder.Configuration, builder.Environment);

var host = builder.Build();
host.Run();
```

# 五、使用示例

## 5.1 创建示例 Job

```C#
public class HelloWorldJob : IJob
{
    private readonly ILogger<HelloWorldJob> _logger;

    public HelloWorldJob(ILogger<HelloWorldJob> logger)
    {
        _logger = logger;
    }

    public Task Execute(IJobExecutionContext context)
    {
        _logger.LogInformation("Hello World Job executed at {Time}", DateTimeOffset.Now);
        return Task.CompletedTask;
    }
}
```

## 5.2 查看追踪数据

### 开发环境

在开发环境中，追踪数据会输出到控制台，格式如下：

```
Activity.TraceId:            abc123...
Activity.SpanId:             def456...
Activity.TraceFlags:         Recorded
Activity.ActivitySourceName: Development-MyWorkerService
Activity.DisplayName:        HelloWorldJob.JobToBeExecuted
Activity.Kind:               Internal
Activity.StartTime:          2024-05-08T13:57:49.1234567Z
Activity.Duration:           00:00:00.1234567
```

### 生产环境

在生产环境中，追踪数据会发送到 OTLP 端点（如 Jaeger、Zipkin 或 Grafana Tempo），可以通过相应的 UI 查看。

# 六、注意事项

## 6.1 ActivitySource 命名

- ActivitySource 的名称应该与服务名称一致，这样才能正确收集追踪数据
- 建议使用 `{EnvironmentName}-{ServiceName}` 格式，便于区分不同环境的服务

## 6.2 异常处理

在 `JobWasExecuted` 方法中，我们通过检查 `jobException` 来判断任务是否成功执行。如果任务抛出异常，Activity 的状态会被设置为 `Error`。

## 6.3 性能考虑

- Activity 的创建和销毁会有一定的性能开销，但对于大多数场景来说，这个开销是可以接受的
- 如果任务执行非常频繁（如每秒数千次），可能需要考虑采样策略

## 6.4 依赖注入

确保 `DiagnosticsConfiguration`、`IHostEnvironment` 和 `IDatetimeProvider` 都已正确注册到依赖注入容器中。

# 七、总结

通过实现自定义的 `IJobListener`，我们可以成功地将 OpenTelemetry 与 Quartz.net 集成，实现 Worker Service 中定时任务的分布式追踪。这种方案具有以下优点：

- ✅ **非侵入性**：不需要修改现有的 Job 实现
- ✅ **灵活性**：可以根据需要自定义追踪信息
- ✅ **可扩展性**：可以轻松添加更多的追踪信息（如标签、事件等）
- ✅ **环境适配**：支持开发和生产环境的不同配置

通过这种方式，我们可以更好地监控和追踪 Worker Service 中的定时任务，提高系统的可观测性。

# 八、相关参考

- [OpenTelemetry .NET Documentation](https://opentelemetry.io/docs/instrumentation/net/)
- [Quartz.NET Documentation](https://www.quartz-scheduler.net/)
- [IJobListener Interface](https://www.quartz-scheduler.net/api/html/T_Quartz_IJobListener.htm)
- [ActivitySource Class](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.activitysource)
- [OpenTelemetry Specification](https://opentelemetry.io/docs/specs/otel/)

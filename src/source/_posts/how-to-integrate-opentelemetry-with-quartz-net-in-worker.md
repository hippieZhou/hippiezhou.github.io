---
title: How to Integrate OpenTelemetry with Quartz.net in Worker
date: 2024-05-08 13:57:49
updated: 2024-05-08 13:57:49
tags: OpenTelemetry
---

> 在 .NET Core 的 Worker 类型项目中，**OpenTelemetry** 并没有为其提供标准的 `Instrumentation`，如果我们的项目中以 `Quartz.net` 作为我们默认的 Schedule Engine 的话，这个时候就需要考虑需要如何将两者即成到一起。

# 安装依赖包

```bash
dotnet add package Quartz.Extensions.Hosting
dotnet add package  OpenTelemetry.Extensions.Hosting
dotnet add package  OpenTelemetry.Exporter.Console
dotnet add package OpenTelemetry.Exporter.OpenTelemetryProtocol
```

# 集成示例

> 下面是完整的示例代码

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

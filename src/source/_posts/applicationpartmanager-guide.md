---
title: ApplicationPartManager 使用指南
title_en: ApplicationPartManager Usage Guide
date: 2024-05-20 10:00:00
updated: 2024-05-20 10:00:00
tags: 
    - ASP.NET Core
    - Testing
    - MVC
    - Integration Testing
---

> `ApplicationPartManager` 是 ASP.NET Core 中用于管理应用程序部分（Application Parts）的核心组件，它控制框架在哪些程序集中发现和加载 MVC 组件。在集成测试场景中，当测试控制器位于测试程序集中时，需要使用 `ApplicationPartManager` 将其注册到测试服务器中。本文详细介绍 `ApplicationPartManager` 的使用方法、常见场景和最佳实践。

# 一、概述

`ApplicationPartManager` 是 ASP.NET Core 中用于管理应用程序部分（Application Parts）的核心组件。它控制框架在哪些程序集中发现和加载 MVC 组件，如控制器、视图、Tag Helpers 等。

## 1.1 什么是 Application Parts？

Application Parts 是 ASP.NET Core MVC 用来发现和加载应用程序组件的机制。每个 Application Part 代表一个程序集或程序集的一部分，框架会扫描这些部分来查找：

- 控制器（Controllers）
- 视图组件（View Components）
- Tag Helpers
- 模型绑定器（Model Binders）
- 其他 MVC 相关组件

# 二、使用场景

## 2.1 集成测试中注册测试控制器

**最常见场景**：在集成测试中，测试控制器位于测试程序集中，而不是主应用程序程序集。默认情况下，ASP.NET Core 只会扫描主应用程序程序集中的控制器。

**问题示例**：
```C#
// 测试程序集中的控制器
namespace Tests.HttpConcurrency.Fixtures;

[ApiController]
[Route("/api/test")]
public class TestController : ControllerBase
{
    // ...
}
```

如果直接使用 `WebApplicationFactory<Program>`，测试服务器无法发现 `TestController`，因为它在不同的程序集中。

**解决方案**：使用 `ApplicationPartManager` 将测试程序集添加到应用程序部分。

## 2.2 插件式架构

在需要支持插件或模块化架构的应用中，可以动态加载外部程序集中的控制器。

## 2.3 共享控制器库

当控制器定义在共享类库中，需要在多个应用程序中使用时。

## 2.4 条件性加载控制器

根据配置或环境动态决定加载哪些程序集中的控制器。

# 三、如何正确使用

## 3.1 基本用法

### 3.1.1 获取 ApplicationPartManager

`ApplicationPartManager` 通常在服务配置阶段就已经注册。可以通过以下方式获取：

```C#
var partManager = services
    .Last(descriptor => descriptor.ServiceType == typeof(ApplicationPartManager))
    .ImplementationInstance as ApplicationPartManager;
```

或者更安全的方式：

```C#
var partManager = services
    .Where(descriptor => descriptor.ServiceType == typeof(ApplicationPartManager))
    .Select(descriptor => descriptor.ImplementationInstance)
    .OfType<ApplicationPartManager>()
    .FirstOrDefault();

if (partManager != null)
{
    // 使用 partManager
}
```

### 3.1.2 添加程序集部分

使用 `AssemblyPart` 将程序集添加到应用程序部分：

```C#
using System.Reflection;
using Microsoft.AspNetCore.Mvc.ApplicationParts;

// 方式 1: 通过类型获取程序集
var assembly = Assembly.GetAssembly(typeof(TestController));
partManager.ApplicationParts.Add(new AssemblyPart(assembly!));

// 方式 2: 直接指定程序集
partManager.ApplicationParts.Add(new AssemblyPart(typeof(TestController).Assembly));

// 方式 3: 通过程序集名称加载
var assembly = Assembly.LoadFrom("path/to/assembly.dll");
partManager.ApplicationParts.Add(new AssemblyPart(assembly));
```

## 3.2 完整示例：集成测试场景

以下示例展示了在集成测试中如何正确使用 `ApplicationPartManager`：

```C#
using System.Net.Http.Json;
using System.Reflection;
using Microsoft.AspNetCore.Mvc.ApplicationParts;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

public class HttpConcurrencyTest : TestBase
{
    [Fact]
    public async Task should_return_different_user_when_use_different_request()
    {
        // Arrange
        var factory = new TestWebApplicationFactory(services =>
        {
            // 配置其他服务...
            services.AddTransient<TestDelegatingHandler>();
            services.AddHttpClient<ITestHttpClient, TestHttpClient>()
                .AddHttpMessageHandler<TestDelegatingHandler>();
            
            // 获取 ApplicationPartManager 并添加测试程序集
            var partManager = (ApplicationPartManager)services
                .Last(descriptor => descriptor.ServiceType == typeof(ApplicationPartManager))
                .ImplementationInstance!;
            
            // 将包含 TestController 的程序集添加为 Application Part
            partManager.ApplicationParts.Add(
                new AssemblyPart(Assembly.GetAssembly(typeof(TestController))!)
            );
        });
        
        // Act & Assert
        var httpClient = factory.CreateClient();
        var response = await httpClient.GetAsync("/api/test");
        response.EnsureSuccessStatusCode();
    }
}
```

## 3.3 在 Startup/Program.cs 中使用

如果需要在应用程序启动时配置，可以在 `Program.cs` 或 `Startup.cs` 中：

```C#
var builder = WebApplication.CreateBuilder(args);

// 获取 ApplicationPartManager
var partManager = builder.Services
    .Where(descriptor => descriptor.ServiceType == typeof(ApplicationPartManager))
    .Select(descriptor => descriptor.ImplementationInstance)
    .OfType<ApplicationPartManager>()
    .FirstOrDefault();

if (partManager != null)
{
    // 添加外部程序集
    var pluginAssembly = Assembly.LoadFrom("path/to/plugin.dll");
    partManager.ApplicationParts.Add(new AssemblyPart(pluginAssembly));
}

var app = builder.Build();
// ...
```

## 3.4 使用 CompiledRazorAssemblyPart（适用于 Razor 视图）

如果程序集包含预编译的 Razor 视图，使用 `CompiledRazorAssemblyPart`：

```C#
using Microsoft.AspNetCore.Mvc.Razor.Compilation;

var assembly = Assembly.GetAssembly(typeof(SomeView));
partManager.ApplicationParts.Add(new CompiledRazorAssemblyPart(assembly!));
```

# 四、注意事项

## 4.1 时机很重要

必须在 `WebApplicationFactory` 的 `ConfigureWebHost` 或 `ConfigureServices` 阶段添加 Application Parts，**在服务构建完成之前**。

```C#
// ✅ 正确：在 ConfigureWebHost 中
var factory = new TestWebApplicationFactory(services =>
{
    var partManager = GetApplicationPartManager(services);
    partManager.ApplicationParts.Add(new AssemblyPart(...));
});

// ❌ 错误：在服务构建之后
var factory = new TestWebApplicationFactory();
var partManager = factory.Services.GetRequiredService<ApplicationPartManager>();
// 此时已经太晚了，控制器发现已经完成
```

## 4.2 空值检查

始终检查 `ApplicationPartManager` 是否为 null：

```C#
var partManager = services
    .Where(descriptor => descriptor.ServiceType == typeof(ApplicationPartManager))
    .Select(descriptor => descriptor.ImplementationInstance)
    .OfType<ApplicationPartManager>()
    .FirstOrDefault();

if (partManager == null)
{
    throw new InvalidOperationException(
        "ApplicationPartManager not found in service collection");
}

partManager.ApplicationParts.Add(new AssemblyPart(assembly));
```

## 4.3 程序集引用

确保目标程序集已被正确引用。在测试项目中，确保测试程序集引用了包含控制器的程序集。

## 4.4 避免重复添加

虽然重复添加同一个程序集通常不会导致错误，但最好检查是否已存在：

```C#
var assembly = typeof(TestController).Assembly;
var assemblyName = assembly.GetName().Name;

if (!partManager.ApplicationParts
    .OfType<AssemblyPart>()
    .Any(ap => ap.Assembly.GetName().Name == assemblyName))
{
    partManager.ApplicationParts.Add(new AssemblyPart(assembly));
}
```

## 4.5 性能考虑

添加大量程序集可能会影响应用程序启动时间，因为框架需要扫描所有这些程序集来发现组件。

# 五、常见问题排查

## 5.1 控制器无法被发现

**症状**：路由返回 404，即使控制器已定义。

**可能原因**：
- Application Part 添加时机太晚
- 程序集未正确引用
- 控制器未正确标记（缺少 `[ApiController]` 或 `[Controller]`）

**解决方案**：
```C#
// 确保在 ConfigureServices 阶段添加
var factory = new TestWebApplicationFactory(services =>
{
    var partManager = GetApplicationPartManager(services);
    var assembly = Assembly.GetAssembly(typeof(YourController));
    partManager.ApplicationParts.Add(new AssemblyPart(assembly!));
});
```

## 5.2 ApplicationPartManager 为 null

**症状**：无法从服务集合中获取 `ApplicationPartManager`。

**可能原因**：
- 在 `AddControllers()` 或 `AddMvc()` 之前尝试获取
- 服务集合配置不正确

**解决方案**：
```C#
// 确保先添加 MVC 服务
builder.Services.AddControllers();
// 然后再获取 ApplicationPartManager
var partManager = GetApplicationPartManager(builder.Services);
```

## 5.3 多个程序集需要添加

**解决方案**：遍历并添加多个程序集：

```C#
var assemblies = new[]
{
    typeof(TestController1).Assembly,
    typeof(TestController2).Assembly,
    typeof(TestController3).Assembly
};

foreach (var assembly in assemblies)
{
    partManager.ApplicationParts.Add(new AssemblyPart(assembly));
}
```

# 六、最佳实践

## 6.1 封装获取逻辑

创建一个辅助方法来获取 `ApplicationPartManager`：

```C#
private static ApplicationPartManager? GetApplicationPartManager(IServiceCollection services)
{
    return services
        .Where(descriptor => descriptor.ServiceType == typeof(ApplicationPartManager))
        .Select(descriptor => descriptor.ImplementationInstance)
        .OfType<ApplicationPartManager>()
        .FirstOrDefault();
}
```

## 6.2 在测试基类中提供帮助方法

```C#
public abstract class TestBase
{
    protected static void AddApplicationPart<T>(IServiceCollection services)
    {
        var partManager = GetApplicationPartManager(services);
        if (partManager != null)
        {
            partManager.ApplicationParts.Add(
                new AssemblyPart(typeof(T).Assembly)
            );
        }
    }
}
```

## 6.3 使用扩展方法

创建扩展方法简化使用：

```C#
public static class ApplicationPartManagerExtensions
{
    public static IServiceCollection AddApplicationPart<T>(
        this IServiceCollection services)
    {
        var partManager = services
            .Where(descriptor => descriptor.ServiceType == typeof(ApplicationPartManager))
            .Select(descriptor => descriptor.ImplementationInstance)
            .OfType<ApplicationPartManager>()
            .FirstOrDefault();

        if (partManager != null)
        {
            partManager.ApplicationParts.Add(
                new AssemblyPart(typeof(T).Assembly)
            );
        }

        return services;
    }
}

// 使用
services.AddApplicationPart<TestController>();
```

# 七、总结

`ApplicationPartManager` 是 ASP.NET Core 中扩展控制器发现机制的关键组件。在集成测试场景中，它允许你将测试程序集中的控制器注册到测试服务器中。正确使用时需要注意：

- ✅ 在服务构建之前添加 Application Parts
- ✅ 进行空值检查
- ✅ 确保程序集正确引用
- ✅ 封装重复逻辑以提高代码可维护性

通过遵循这些指南，你可以有效地在集成测试和其他场景中使用 `ApplicationPartManager`。

# 相关参考

- [ApplicationPartManager Class - Microsoft Docs](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.applicationparts.applicationpartmanager)
- [Application Parts in ASP.NET Core - Microsoft Docs](https://learn.microsoft.com/en-us/aspnet/core/mvc/advanced/app-parts)
- [Integration tests in ASP.NET Core - Microsoft Docs](https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests)
- [WebApplicationFactory<TEntryPoint> Class - Microsoft Docs](https://learn.microsoft.com/en-us/dotnet/api/microsoft.aspnetcore.mvc.testing.webapplicationfactory-1)

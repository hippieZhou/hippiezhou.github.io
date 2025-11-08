---
title: MEF 插件式架构实现指南：.NET Framework 与 .NET Core 对比
title_en: "MEF Plugin Architecture Guide: .NET Framework vs .NET Core"
date: 2022-02-17 21:21:18
updated: 2022-02-17 21:21:18
tags: 
    - MEF
    - .NET Framework
    - .NET Core
    - Plugin Architecture
---

> MEF（Managed Extensibility Framework）是 .NET 框架中的扩展性框架，用于构建可扩展的应用程序。本文记录 MEF 在 .NET Framework 和 .NET Core/.NET 5+ 中的使用差异和实现方式，包括如何导出和导入组件、使用 ExportFactory 创建实例，以及在不同 .NET 版本中的配置差异。

# 一、MEF 简介

MEF（Managed Extensibility Framework）是微软提供的一个扩展性框架，允许应用程序在运行时动态发现和组合组件。它通过声明式的导入/导出机制，实现了松耦合的组件架构。

## 1.1 核心概念

- **Export（导出）**：使用 `[Export]` 特性标记组件，使其可以被其他组件使用
- **Import（导入）**：使用 `[Import]` 或 `[ImportMany]` 特性标记依赖，自动注入导出的组件
- **ExportFactory**：用于延迟创建导出组件的实例，特别适用于需要创建多个实例的场景
- **CompositionContainer**：组合容器，负责发现和组合导出的组件

## 1.2 .NET Framework vs .NET Core/.NET 5+

在 .NET Framework 中，MEF 是内置的（`System.ComponentModel.Composition`）。而在 .NET Core/.NET 5+ 中，需要使用 `System.Composition` NuGet 包，API 略有不同。

# 二、模块代码实现

## 2.1 导出 Window 组件

使用 `[Export]` 特性导出 Window 组件，并使用 `[ExportMetadata]` 添加元数据信息。

```C#
[Export(typeof(Window))]
[ExportMetadata("name", "首页")]
public partial class MainView : Window
{
    public MainView()
    {
        InitializeComponent();
    }
}
```

### 说明：

- `[Export(typeof(Window))]`：导出类型为 `Window` 的组件
- `[ExportMetadata("name", "首页")]`：添加元数据，键为 "name"，值为 "首页"
- 元数据可以用于筛选和识别不同的导出组件

## 2.2 导入多个 Window 组件

### .NET Framework 版本

在 .NET Framework 中，使用 `System.ComponentModel.Composition` 命名空间：

```C#
using System.ComponentModel.Composition;
using System.ComponentModel.Composition.Hosting;

public class WindowsCompos
{
    [Export("extWindows")]
    [ImportMany(typeof(Window))]
    public IEnumerable<ExportFactory<Window, IDictionary<string, object>>> ExtWindows { get; set; }
}
```

### .NET Core/.NET 5+ 版本

在 .NET Core/.NET 5+ 中，需要先安装 `System.Composition` NuGet 包，并使用 `System.Composition` 命名空间：

```bash
dotnet add package System.Composition
```

```C#
using System.Composition;
using System.Composition.Hosting;

public class WindowsCompos
{
    [Export("extWindows")]
    [ImportMany]
    public IEnumerable<ExportFactory<Window, IDictionary<string, object>>> ExtWindows { get; set; }
}
```

### 关键差异：

1. **命名空间**：.NET Framework 使用 `System.ComponentModel.Composition`，.NET Core 使用 `System.Composition`
2. **ImportMany 特性**：.NET Framework 版本需要指定类型 `[ImportMany(typeof(Window))]`，.NET Core 版本可以省略类型参数 `[ImportMany]`
3. **ExportFactory**：两个版本都支持，但命名空间不同

### ExportFactory 的作用：

`ExportFactory<T, TMetadata>` 允许延迟创建导出组件的实例。这对于需要创建多个实例的场景非常有用，例如在 WPF 应用中需要创建多个 Window 实例。

# 三、主程序代码实现

## 3.1 .NET Framework 版本

在 .NET Framework 中，使用 `AssemblyCatalog` 和 `CompositionContainer`：

```C#
using System.ComponentModel.Composition.Hosting;
using System.Reflection;

// 加载包含导出组件的程序集
var extAss = Assembly.Load("MultiToolKit.WpfApp.Modules.Home");

// 创建程序集目录
var catalog = new AssemblyCatalog(extAss);

// 创建组合容器
var container = new CompositionContainer(catalog);

// 组合部件（满足导入需求）
container.ComposeParts(this);

// 获取导出的组件列表
var extWindowsList =
    container.GetExportedValue<IEnumerable<ExportFactory<Window, IDictionary<string, object>>>>(
        "extWindows");
```

### 说明：

1. **AssemblyCatalog**：从指定程序集中发现导出组件
2. **CompositionContainer**：组合容器，负责组合导入和导出
3. **ComposeParts**：组合部件，满足导入需求（如果 `WindowsCompos` 是当前类的属性）
4. **GetExportedValue**：获取导出的值，参数是导出契约名称

## 3.2 .NET Core/.NET 5+ 版本

在 .NET Core/.NET 5+ 中，使用 `ContainerConfiguration` 和 `CompositionHost`：

```C#
using System.Composition.Hosting;
using System.Reflection;
using System.Runtime.Loader;

// 获取可执行文件所在目录
var executableLocation = Assembly.GetEntryAssembly().Location;
var path = Path.GetDirectoryName(executableLocation);

// 加载目录下所有 DLL 文件
var assemblies = Directory
    .GetFiles(path, "*.dll", SearchOption.AllDirectories)
    .Select(AssemblyLoadContext.Default.LoadFromAssemblyPath)
    .ToList();

// 配置容器
var configuration = new ContainerConfiguration()
    .WithAssemblies(assemblies);

// 创建容器
using var container = configuration.CreateContainer();

// 获取导出的组件列表
_extWindowsList = container.GetExports<ExportFactory<Window, IDictionary<string, object>>>();
```

### 说明：

1. **AssemblyLoadContext**：用于加载程序集，.NET Core 中推荐使用 `AssemblyLoadContext.Default`
2. **ContainerConfiguration**：配置容器，指定要扫描的程序集
3. **WithAssemblies**：添加要扫描的程序集列表
4. **CreateContainer**：创建组合容器
5. **GetExports**：获取导出的组件列表（泛型方法，不需要指定契约名称）

## 3.3 使用导出的组件

获取到 `ExportFactory` 列表后，可以通过 `CreateExport()` 方法创建实例：

```C#
foreach (var exportFactory in extWindowsList)
{
    // 创建 Window 实例
    var window = exportFactory.CreateExport().Value;
    
    // 访问元数据
    var metadata = exportFactory.Metadata;
    var windowName = metadata["name"] as string;
    
    // 显示窗口
    window.Show();
}
```

# 四、完整示例

## 4.1 .NET Framework 完整示例

```C#
using System.ComponentModel.Composition;
using System.ComponentModel.Composition.Hosting;
using System.Reflection;
using System.Windows;

public partial class App : Application
{
    private IEnumerable<ExportFactory<Window, IDictionary<string, object>>> _extWindowsList;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        
        // 加载程序集
        var extAss = Assembly.Load("MultiToolKit.WpfApp.Modules.Home");
        var catalog = new AssemblyCatalog(extAss);
        var container = new CompositionContainer(catalog);
        
        // 组合部件
        var compos = new WindowsCompos();
        container.ComposeParts(compos);
        
        // 获取导出的窗口列表
        _extWindowsList = compos.ExtWindows;
        
        // 创建并显示窗口
        foreach (var exportFactory in _extWindowsList)
        {
            var window = exportFactory.CreateExport().Value;
            var metadata = exportFactory.Metadata;
            var windowName = metadata["name"] as string;
            
            window.Title = windowName;
            window.Show();
        }
    }
}
```

## 4.2 .NET Core/.NET 5+ 完整示例

```C#
using System.Composition;
using System.Composition.Hosting;
using System.Reflection;
using System.Runtime.Loader;
using System.Windows;

public partial class App : Application
{
    private IEnumerable<ExportFactory<Window, IDictionary<string, object>>> _extWindowsList;

    protected override void OnStartup(StartupEventArgs e)
    {
        base.OnStartup(e);
        
        // 加载程序集
        var executableLocation = Assembly.GetEntryAssembly().Location;
        var path = Path.GetDirectoryName(executableLocation);
        var assemblies = Directory
            .GetFiles(path, "*.dll", SearchOption.AllDirectories)
            .Select(AssemblyLoadContext.Default.LoadFromAssemblyPath)
            .ToList();
        
        // 配置并创建容器
        var configuration = new ContainerConfiguration()
            .WithAssemblies(assemblies);
        using var container = configuration.CreateContainer();
        
        // 获取导出的窗口列表
        _extWindowsList = container.GetExports<ExportFactory<Window, IDictionary<string, object>>>();
        
        // 创建并显示窗口
        foreach (var exportFactory in _extWindowsList)
        {
            var window = exportFactory.CreateExport().Value;
            var metadata = exportFactory.Metadata;
            var windowName = metadata["name"] as string;
            
            window.Title = windowName;
            window.Show();
        }
    }
}
```

# 五、注意事项

## 5.1 程序集加载

- **.NET Framework**：使用 `Assembly.Load()` 或 `Assembly.LoadFrom()` 加载程序集
- **.NET Core**：推荐使用 `AssemblyLoadContext.Default.LoadFromAssemblyPath()`，避免程序集加载冲突

## 5.2 依赖注入

- MEF 可以与依赖注入框架（如 Microsoft.Extensions.DependencyInjection）一起使用
- 在 .NET Core 中，可以考虑使用内置的 DI 容器替代 MEF，除非需要插件式架构

## 5.3 生命周期管理

- `ExportFactory` 创建的实例需要手动管理生命周期
- 使用 `using` 语句确保资源正确释放

## 5.4 元数据访问

- 元数据是弱类型的，访问时需要进行类型转换
- 建议定义强类型的元数据接口以提高类型安全性

## 5.5 性能考虑

- 程序集扫描和组合过程会有一定的性能开销
- 对于大型应用程序，考虑延迟加载或缓存组合结果

# 六、最佳实践

## 6.1 使用强类型元数据

定义元数据接口：

```C#
public interface IWindowMetadata
{
    string Name { get; }
    string Description { get; }
}

[Export(typeof(Window))]
[ExportMetadata("Name", "首页")]
[ExportMetadata("Description", "应用程序主窗口")]
public partial class MainView : Window
{
    // ...
}
```

使用强类型元数据：

```C#
[ImportMany]
public IEnumerable<ExportFactory<Window, IWindowMetadata>> ExtWindows { get; set; }

// 访问元数据
foreach (var exportFactory in ExtWindows)
{
    var metadata = exportFactory.Metadata;
    var name = metadata.Name; // 强类型访问
}
```

## 6.2 错误处理

```C#
try
{
    container.ComposeParts(this);
}
catch (CompositionException ex)
{
    foreach (var error in ex.Errors)
    {
        Console.WriteLine($"Composition Error: {error.Description}");
    }
}
```

## 6.3 条件导入

使用 `[ImportMany]` 和 LINQ 进行条件筛选：

```C#
[ImportMany]
public IEnumerable<ExportFactory<Window, IDictionary<string, object>>> ExtWindows { get; set; }

// 筛选特定名称的窗口
var homeWindow = ExtWindows
    .FirstOrDefault(ef => ef.Metadata["name"]?.ToString() == "首页");
```

# 七、总结

MEF 是一个强大的扩展性框架，适用于需要插件式架构的应用程序。在 .NET Framework 和 .NET Core/.NET 5+ 中的主要差异包括：

- ✅ **命名空间不同**：.NET Framework 使用 `System.ComponentModel.Composition`，.NET Core 使用 `System.Composition`
- ✅ **API 略有差异**：.NET Core 版本使用 `ContainerConfiguration` 和 `CompositionHost`
- ✅ **程序集加载方式不同**：.NET Core 推荐使用 `AssemblyLoadContext`
- ✅ **功能基本一致**：核心的导入/导出机制在两个版本中都可用

对于新项目，如果不需要插件式架构，建议优先考虑使用 .NET Core 内置的依赖注入框架。如果需要动态加载和组合组件，MEF 仍然是一个不错的选择。

# 八、相关参考

- [MEF (Managed Extensibility Framework) - Microsoft Docs](https://docs.microsoft.com/en-us/dotnet/framework/mef/)
- [System.Composition NuGet Package](https://www.nuget.org/packages/System.Composition/)
- [AssemblyLoadContext Class](https://learn.microsoft.com/en-us/dotnet/api/system.runtime.loader.assemblyloadcontext)
- [ExportFactory Class](https://learn.microsoft.com/en-us/dotnet/api/system.componentmodel.composition.exportfactory-2)

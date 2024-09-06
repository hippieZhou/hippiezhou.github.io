---
title: MEF Notes
date: 2022-02-17 21:21:18
tags: WPF
---

# 模块代码

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

# .NET Framework 版本
public class WindowsCompos
{
    [Export("extWindows")]
    [ImportMany(typeof(Window))]
    public IEnumerable<ExportFactory<Window, IDictionary<string, object>>> ExtWindows { get; set; }
}

# .NET 版本（需要先安装 System.Composition）
public class WindowsCompos
{
    [Export("extWindows")]
    [ImportMany]
    public IEnumerable<ExportFactory<Window, IDictionary<string, object>>> ExtWindows { get; set; }
}
```

# 主程序代码

```C#
# .NET Framework 版本
var extAss = Assembly.Load("MultiToolKit.WpfApp.Modules.Home");
var catalog = new AssemblyCatalog(extAss);
var container = new CompositionContainer(catalog);

var extWindowsList =
    container.GetExportedValue<IEnumerable<ExportFactory<Window, IDictionary<string, object>>>>(
        "extWindows");

# .NET 版本
var executableLocation = Assembly.GetEntryAssembly().Location;
var path = Path.GetDirectoryName(executableLocation);
var assemblies = Directory
    .GetFiles(path, "*.dll", SearchOption.AllDirectories)
    .Select(AssemblyLoadContext.Default.LoadFromAssemblyPath)
    .ToList();
var configuration = new ContainerConfiguration()
    .WithAssemblies(assemblies);
using var container = configuration.CreateContainer();
_extWindowsList = container.GetExports<ExportFactory<Window, IDictionary<string, object>>>();
```
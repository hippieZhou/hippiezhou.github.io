---
title: 使用单线程运行 WPF
title_en: Run WPF with Single Thread
date: 2017-07-19 21:20:58
updated: 2017-07-19 21:20:58
tags: WPF
---

> WPF 应用必须在单线程（STA）模式下运行。本文介绍两种在单线程中运行 WPF 应用的方式：使用 Thread 创建 STA 线程和使用 [STAThread] 特性标记主方法。

# 一、实现方式

## 1.1 示例代码

```C#
# 方式 1
static void Main(string[] args)
{
    var t = new Thread(() =>
    {
        var main = new MainView();
        main.Closed += (sender, e) =>
        {
            //退出消息循环
            System.Windows.Threading.Dispatcher.ExitAllFrames();
        };
        main.Show();
        //开启消息循环
        System.Windows.Threading.Dispatcher.Run();
    });
    t.SetApartmentState(ApartmentState.STA);
    t.Start();
}

# 方式2
[STAThread]
static void Main(string[] args)
{
    var main = new MainView();
    main.Closed += (sender, e) =>
    {
        //退出消息循环
        System.Windows.Threading.Dispatcher.ExitAllFrames();
    };
    main.Show();
    //开启消息循环
    System.Windows.Threading.Dispatcher.Run();
}
```


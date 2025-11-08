---
title: 使用单线程运行 WPF
title_en: Run WPF with Single Thread
date: 2017-07-19 21:20:58
updated: 2017-07-19 21:20:58
tags: WPF
---

示例代码：

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


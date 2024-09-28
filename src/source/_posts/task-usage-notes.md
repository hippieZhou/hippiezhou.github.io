---
title: Task usage notes
date: 2017-10-18 21:20:58
updated: 2017-10-18 21:20:58
tags: C#
---

# 指数避让原则：

```C#
public async Task<string> DownloadStringWithRetiresAsync(string uri)
{
    using (var client = new HttpClient())
    {
        var nextDelay = TimeSpan.FromSeconds(1);
        for (int i = 0; i != 3; i++)
        {
            try
            {
                return await client.GetStringAsync(uri);
            }
            catch (Exception)
            {
            }
            await Task.Delay(nextDelay);
            nextDelay = nextDelay + nextDelay;
        }
        var result = await client.GetStringAsync(uri);
        return result;
    }
}
```

# 超时连接：

```C#
public async Task<string> DownloadStringWithTimeOutAsync(string uri)
{
    using (var client = new HttpClient())
    {
        var downloadTask = client.GetStringAsync(uri);
        var timeout = Task.Delay(3000);
        var completedTask = await Task.WhenAny(downloadTask, timeout);
        if (completedTask == timeout)
            return null;
        else
            return await downloadTask;
    }
}
```

# 进度汇报：

```C#
public async Task CallReportProcessAsync()
{
    var progress = new Progress<double>();
    progress.ProgressChanged += (sender, e) =>
    {
        Console.WriteLine(e);
    };
    await ReportProcessAsync(progress);
}
private async Task ReportProcessAsync(IProgress<double> progress = null)
{
    double procentComplete = 0;
    while (procentComplete < 100)
    {
        if (progress != null)
            progress.Report(procentComplete);
        procentComplete += 1;
        await Task.Delay(TimeSpan.FromSeconds(1));
    }
}
```

# 其它：

1. ConfigureAwait(false)：
> 调用该方法可以使当前代码被暂停后可以继续在线程池中运行，不会回到主线程。最好的做法是在核心代码库中使用该方法，在外围的用户界面代码中，只在需要时才恢复上下文。

2. Task.Run() 和 Task.Factory.StartNew()的区别：
> Task.Run() 一般用于 CPU 需要执行实际的计算指令，而 Task.Factory.StartNew() 则一般表明是按照特定计划执行的一个任务（代码段）。

3. 数据并行和任务并行
> 数据并行一般是指大量数据处理过程彼此基本独立，Parallel的使用对资源更加友好，与系统中的其它进程配合的比较好，PLINQ 会试图让所有 CPU 来执行本进程，代码更加优美。

```C#
var list = new List<object>();

Parallel.ForEach(list,item=>{ //todo });
#等价于
list.AsParallel().ForAll(item=>{ //todo }); //代码更优美
```

> 任务并行是指大量任务处理过程基本彼此独立，可以是动态的。

```C#
Parallel.Invoke();
```

1. 隐式状态

> 效率不是特别高，一般建议通过添加参数或属性的方式来进行相关数据的访问。

```C#
public void DoLongOperation()
{
    var operationId = Guid.NewGuid();
    CallContext.LogicalSetData("OperationId", operationId);

    Console.WriteLine($"A:In operation:{CallContext.LogicalGetData("OperationId")}");

    Task.Factory.StartNew(() =>
    {
        Console.WriteLine($"A:In operation:{CallContext.LogicalGetData("OperationId")}");
    }).ConfigureAwait(false);

    CallContext.FreeNamedDataSlot("OperationId");
}
```

1. 应用程序几乎不需要自行创建新的线程，若要为 COM Interop 程序创建 STA 现场，就得创建线程，这是唯一需要创建线程的情况。

2. Task.FromResult 只能提供结果正确的同步 Task 对象。如果要返回的 Task 对象有一个其它类型的结果（例如以 NotImplementedException 结束的 Task 对象），就得自行创建使用 NotImplementedException 的辅助方法。

# 参考：

1. 《C#并发编程经典实例》

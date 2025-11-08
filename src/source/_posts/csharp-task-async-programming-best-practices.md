---
title: C# Task 异步编程最佳实践与实战技巧
title_en: "C# Task Async Programming: Best Practices and Practical Guide"
date: 2017-10-18 21:20:58
updated: 2017-10-18 21:20:58
tags: C#, Async Programming, Task
---

> C# 中 Task 异步编程的使用笔记，包括指数退避重试策略、超时处理、取消操作、进度汇报等常用模式和最佳实践。本文涵盖了异步编程中的常见场景和注意事项，帮助开发者编写更健壮的异步代码。

# 一、指数退避重试策略

在网络请求或外部服务调用中，临时性失败是常见的。指数退避重试策略通过逐渐增加重试间隔来避免对服务造成过大压力，同时提高重试成功率。

## 1.1 基本实现

```C#
public async Task<string> DownloadStringWithRetiresAsync(string uri, int maxRetries = 3)
{
    using (var client = new HttpClient())
    {
        var nextDelay = TimeSpan.FromSeconds(1);
        
        for (int i = 0; i < maxRetries; i++)
        {
            try
            {
                return await client.GetStringAsync(uri);
            }
            catch (HttpRequestException ex)
            {
                // 记录异常日志
                Console.WriteLine($"Attempt {i + 1} failed: {ex.Message}");
                
                // 如果是最后一次重试，直接抛出异常
                if (i == maxRetries - 1)
                {
                    throw;
                }
            }
            
            // 等待后重试，延迟时间指数增长
            await Task.Delay(nextDelay);
            nextDelay = nextDelay + nextDelay; // 1s -> 2s -> 4s
        }
        
        // 理论上不会执行到这里
        throw new InvalidOperationException("Unexpected end of retry loop");
    }
}
```

### 关键点：

- **指数增长**：延迟时间从 1 秒开始，每次翻倍（1s → 2s → 4s）
- **异常处理**：只捕获预期的异常类型（如 `HttpRequestException`），避免吞掉其他异常
- **最大重试次数**：设置合理的重试上限，避免无限重试

## 1.2 改进版本：支持 CancellationToken

```C#
public async Task<string> DownloadStringWithRetiresAsync(
    string uri, 
    int maxRetries = 3,
    CancellationToken cancellationToken = default)
{
    using (var client = new HttpClient())
    {
        var nextDelay = TimeSpan.FromSeconds(1);
        
        for (int i = 0; i < maxRetries; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();
            
            try
            {
                return await client.GetStringAsync(uri, cancellationToken);
            }
            catch (HttpRequestException ex) when (i < maxRetries - 1)
            {
                Console.WriteLine($"Attempt {i + 1} failed: {ex.Message}");
                await Task.Delay(nextDelay, cancellationToken);
                nextDelay = nextDelay + nextDelay;
            }
        }
        
        throw new HttpRequestException($"Failed after {maxRetries} attempts");
    }
}
```

### 改进点：

- 支持 `CancellationToken`，允许取消重试操作
- 使用异常过滤器 `when` 子句，代码更简洁
- 最后一次重试失败时抛出异常

# 二、超时处理

异步操作可能会因为网络问题或服务响应慢而长时间挂起。超时处理可以确保操作在合理时间内完成或失败。

## 2.1 使用 Task.WhenAny 实现超时

```C#
public async Task<string> DownloadStringWithTimeOutAsync(string uri, int timeoutMs = 3000)
{
    using (var client = new HttpClient())
    {
        var downloadTask = client.GetStringAsync(uri);
        var timeoutTask = Task.Delay(timeoutMs);
        
        var completedTask = await Task.WhenAny(downloadTask, timeoutTask);
        
        if (completedTask == timeoutTask)
        {
            // 超时了，可以选择取消操作（如果支持 CancellationToken）
            throw new TimeoutException($"Operation timed out after {timeoutMs}ms");
        }
        
        // 返回结果
        return await downloadTask;
    }
}
```

### 说明：

- `Task.WhenAny` 返回第一个完成的任务
- 如果超时任务先完成，说明操作超时
- 即使超时，原始任务仍在运行，可能造成资源浪费

## 2.2 改进版本：使用 CancellationTokenSource

```C#
public async Task<string> DownloadStringWithTimeOutAsync(string uri, int timeoutMs = 3000)
{
    using (var client = new HttpClient())
    using (var cts = new CancellationTokenSource(timeoutMs))
    {
        try
        {
            return await client.GetStringAsync(uri, cts.Token);
        }
        catch (TaskCanceledException ex) when (ex.CancellationToken == cts.Token)
        {
            throw new TimeoutException($"Operation timed out after {timeoutMs}ms", ex);
        }
    }
}
```

### 优势：

- 使用 `CancellationTokenSource` 的构造函数直接设置超时时间
- 超时后自动取消操作，避免资源浪费
- 代码更简洁，不需要手动管理超时任务

## 2.3 通用超时扩展方法

```C#
public static async Task<T> WithTimeout<T>(this Task<T> task, TimeSpan timeout)
{
    using (var cts = new CancellationTokenSource())
    {
        var timeoutTask = Task.Delay(timeout, cts.Token);
        var completedTask = await Task.WhenAny(task, timeoutTask);
        
        if (completedTask == timeoutTask)
        {
            throw new TimeoutException($"Operation timed out after {timeout}");
        }
        
        return await task;
    }
}

// 使用示例
var result = await client.GetStringAsync(uri).WithTimeout(TimeSpan.FromSeconds(5));
```

# 三、进度汇报

对于长时间运行的异步操作，向用户报告进度可以改善用户体验。`IProgress<T>` 接口提供了标准的进度报告机制。

## 3.1 基本用法

```C#
public async Task CallReportProcessAsync()
{
    var progress = new Progress<double>();
    progress.ProgressChanged += (sender, percentage) =>
    {
        Console.WriteLine($"Progress: {percentage:F2}%");
    };
    
    await ReportProcessAsync(progress);
}

private async Task ReportProcessAsync(IProgress<double> progress = null)
{
    double percentComplete = 0;
    while (percentComplete < 100)
    {
        if (progress != null)
        {
            progress.Report(percentComplete);
        }
        
        percentComplete += 1;
        await Task.Delay(TimeSpan.FromSeconds(1));
    }
    
    // 报告完成
    progress?.Report(100);
}
```

### 说明：

- `Progress<T>` 类实现了 `IProgress<T>` 接口
- `ProgressChanged` 事件会在捕获的同步上下文中触发（通常是 UI 线程）
- 进度值可以是任何类型（double、int、自定义类型等）

## 3.2 实际应用示例：文件下载进度

```C#
public async Task DownloadFileWithProgressAsync(
    string url, 
    string filePath, 
    IProgress<double> progress = null)
{
    using (var client = new HttpClient())
    {
        var response = await client.GetAsync(url, HttpCompletionOption.ResponseHeadersRead);
        var totalBytes = response.Content.Headers.ContentLength ?? 0;
        var downloadedBytes = 0L;
        
        using (var fileStream = new FileStream(filePath, FileMode.Create))
        using (var contentStream = await response.Content.ReadAsStreamAsync())
        {
            var buffer = new byte[8192];
            int bytesRead;
            
            while ((bytesRead = await contentStream.ReadAsync(buffer, 0, buffer.Length)) > 0)
            {
                await fileStream.WriteAsync(buffer, 0, bytesRead);
                downloadedBytes += bytesRead;
                
                if (progress != null && totalBytes > 0)
                {
                    var percentage = (double)downloadedBytes / totalBytes * 100;
                    progress.Report(percentage);
                }
            }
        }
    }
}

// 使用示例
var progress = new Progress<double>(percentage => 
{
    Console.WriteLine($"Download progress: {percentage:F2}%");
});

await DownloadFileWithProgressAsync("https://example.com/file.zip", "file.zip", progress);
```

# 四、取消操作

`CancellationToken` 是异步编程中实现取消操作的标准机制。它允许协作式取消，即操作定期检查取消请求并优雅地退出。

## 4.1 基本用法

```C#
public async Task ProcessDataAsync(CancellationToken cancellationToken = default)
{
    for (int i = 0; i < 100; i++)
    {
        // 检查取消请求
        cancellationToken.ThrowIfCancellationRequested();
        
        // 执行操作
        await DoWorkAsync(i);
    }
}

// 使用示例
using (var cts = new CancellationTokenSource())
{
    // 5 秒后自动取消
    cts.CancelAfter(TimeSpan.FromSeconds(5));
    
    try
    {
        await ProcessDataAsync(cts.Token);
    }
    catch (OperationCanceledException)
    {
        Console.WriteLine("Operation was cancelled");
    }
}
```

## 4.2 组合多个 CancellationToken

```C#
public async Task ProcessWithMultipleTokensAsync(
    CancellationToken token1, 
    CancellationToken token2)
{
    using (var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(token1, token2))
    {
        await ProcessDataAsync(linkedCts.Token);
    }
}
```

## 4.3 取消操作的最佳实践

```C#
public async Task<string> DownloadWithCancellationAsync(
    string uri, 
    CancellationToken cancellationToken = default)
{
    using (var client = new HttpClient())
    {
        try
        {
            return await client.GetStringAsync(uri, cancellationToken);
        }
        catch (TaskCanceledException ex) when (ex.CancellationToken == cancellationToken)
        {
            // 操作被取消
            throw new OperationCanceledException("Download was cancelled", ex, cancellationToken);
        }
    }
}
```

# 五、其他重要概念

## 5.1 ConfigureAwait(false)

`ConfigureAwait(false)` 告诉编译器在异步操作完成后不需要返回到原始的同步上下文（如 UI 线程），而是可以在线程池中的任何线程继续执行。

### 使用场景：

```C#
// 在库代码中使用 ConfigureAwait(false)
public async Task<string> GetDataAsync()
{
    using (var client = new HttpClient())
    {
        // 不需要返回到调用者的同步上下文
        var result = await client.GetStringAsync("https://api.example.com/data")
            .ConfigureAwait(false);
        return result;
    }
}

// 在 UI 代码中不使用 ConfigureAwait(false)
private async void Button_Click(object sender, RoutedEventArgs e)
{
    // 需要返回到 UI 线程更新界面
    var data = await GetDataAsync();
    textBox.Text = data; // 必须在 UI 线程执行
}
```

### 最佳实践：

- ✅ **库代码**：始终使用 `ConfigureAwait(false)`，除非需要返回到原始上下文
- ✅ **UI 代码**：只在不需要更新 UI 的部分使用 `ConfigureAwait(false)`
- ❌ **避免**：在需要访问 UI 控件的代码后使用 `ConfigureAwait(false)`

## 5.2 Task.Run() vs Task.Factory.StartNew()

### Task.Run()

`Task.Run()` 是 `Task.Factory.StartNew()` 的简化版本，专门用于在线程池中执行 CPU 密集型操作。

```C#
// Task.Run() - 推荐用于 CPU 密集型操作
var result = await Task.Run(() =>
{
    // CPU 密集型计算
    return ComputeHeavyOperation();
});
```

### Task.Factory.StartNew()

`Task.Factory.StartNew()` 提供了更多的配置选项，但使用更复杂。

```C#
// Task.Factory.StartNew() - 需要更多控制时使用
var task = Task.Factory.StartNew(() =>
{
    // 执行操作
}, TaskCreationOptions.LongRunning); // 指定任务选项
```

### 区别总结：

| 特性 | Task.Run() | Task.Factory.StartNew() |
|------|------------|-------------------------|
| 默认调度器 | TaskScheduler.Default | TaskScheduler.Current |
| 取消支持 | 自动支持 | 需要手动传递 CancellationToken |
| 使用场景 | CPU 密集型操作 | 需要特殊配置的任务 |
| 推荐度 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 5.3 数据并行和任务并行

### 数据并行

数据并行是指对大量数据进行相同的处理操作，每个数据项的处理彼此独立。

```C#
var list = new List<int> { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 };

// 方式 1：使用 Parallel.ForEach
Parallel.ForEach(list, item =>
{
    ProcessItem(item);
});

// 方式 2：使用 PLINQ（更优雅）
list.AsParallel().ForAll(item =>
{
    ProcessItem(item);
});

// 方式 3：使用 PLINQ 并获取结果
var results = list.AsParallel()
    .Select(item => ProcessItem(item))
    .ToList();
```

### 任务并行

任务并行是指执行多个不同的任务，这些任务可以彼此独立。

```C#
// 并行执行多个不同的操作
Parallel.Invoke(
    () => DownloadFile("file1.txt"),
    () => ProcessData(),
    () => SendEmail()
);

// 使用 Task.WhenAll（推荐用于异步操作）
await Task.WhenAll(
    DownloadFileAsync("file1.txt"),
    ProcessDataAsync(),
    SendEmailAsync()
);
```

### 选择建议：

- **数据并行**：处理大量相似数据时使用 `Parallel` 或 PLINQ
- **任务并行**：执行多个不同操作时使用 `Task.WhenAll` 或 `Parallel.Invoke`
- **异步操作**：优先使用 `Task.WhenAll`，而不是 `Parallel.Invoke`

## 5.4 异步上下文和状态传递

在异步操作中传递上下文信息（如操作 ID、用户信息等）有几种方式：

### 方式 1：通过参数传递（推荐）

```C#
public async Task ProcessWithContextAsync(string operationId, int userId)
{
    await DoWorkAsync(operationId, userId);
}
```

### 方式 2：使用 AsyncLocal（.NET Core）

```C#
public static class OperationContext
{
    private static readonly AsyncLocal<string> _operationId = new AsyncLocal<string>();
    
    public static string OperationId
    {
        get => _operationId.Value;
        set => _operationId.Value = value;
    }
}

// 使用
OperationContext.OperationId = Guid.NewGuid().ToString();
await ProcessAsync(); // 在 ProcessAsync 中可以访问 OperationContext.OperationId
```

### 方式 3：使用 CallContext（.NET Framework，已过时）

```C#
// .NET Framework 中使用 CallContext（不推荐用于新代码）
public void DoLongOperation()
{
    var operationId = Guid.NewGuid();
    CallContext.LogicalSetData("OperationId", operationId);

    Console.WriteLine($"Operation ID: {CallContext.LogicalGetData("OperationId")}");

    Task.Run(() =>
    {
        // 在异步上下文中访问
        Console.WriteLine($"Operation ID: {CallContext.LogicalGetData("OperationId")}");
    });

    CallContext.FreeNamedDataSlot("OperationId");
}
```

## 5.5 Task.FromResult 和 Task.FromException

### Task.FromResult

用于创建已完成且包含结果的 Task。

```C#
public Task<string> GetCachedDataAsync(string key)
{
    if (_cache.TryGetValue(key, out var value))
    {
        // 返回已完成的 Task，避免不必要的异步开销
        return Task.FromResult(value);
    }
    
    return LoadDataAsync(key);
}
```

### Task.FromException

用于创建已完成但包含异常的 Task。

```C#
public Task<string> GetDataAsync(string key)
{
    if (string.IsNullOrEmpty(key))
    {
        // 返回包含异常的 Task
        return Task.FromException<string>(new ArgumentException("Key cannot be null or empty"));
    }
    
    return LoadDataAsync(key);
}

// 自定义辅助方法
public static Task<T> FromNotImplemented<T>()
{
    return Task.FromException<T>(new NotImplementedException());
}
```

## 5.6 线程创建建议

在大多数情况下，**不需要手动创建线程**。.NET 的线程池会自动管理线程，提供更好的性能和资源利用率。

### 需要手动创建线程的场景：

1. **COM Interop**：需要 STA（Single Threaded Apartment）线程时
2. **长时间运行的任务**：使用 `TaskCreationOptions.LongRunning` 标记

```C#
// 创建长时间运行的任务
var longRunningTask = Task.Factory.StartNew(() =>
{
    // 长时间运行的操作
}, TaskCreationOptions.LongRunning);
```

### 推荐做法：

- ✅ 使用 `Task.Run()` 或 `Task.Factory.StartNew()` 在线程池中执行操作
- ✅ 使用 `async/await` 进行异步编程
- ❌ 避免直接创建 `Thread` 对象（除非有特殊需求）

# 六、最佳实践总结

## 6.1 异步方法设计原则

1. **命名约定**：异步方法应以 `Async` 结尾（如 `GetDataAsync`）
2. **返回类型**：返回 `Task` 或 `Task<T>`，避免返回 `void`
3. **异常处理**：让异常自然传播，不要吞掉异常
4. **取消支持**：长时间运行的操作应支持 `CancellationToken`

## 6.2 性能优化建议

- 使用 `ConfigureAwait(false)` 在库代码中避免不必要的上下文切换
- 使用 `Task.FromResult` 避免不必要的异步开销
- 使用 `Task.WhenAll` 并行执行多个独立的异步操作
- 避免过度使用 `Task.Run`，优先使用真正的异步 API

## 6.3 常见错误和陷阱

### 错误 1：async void

```C#
// ❌ 错误：async void 只能用于事件处理器
public async void BadMethod()
{
    await DoSomethingAsync();
}

// ✅ 正确：返回 Task
public async Task GoodMethod()
{
    await DoSomethingAsync();
}
```

### 错误 2：阻塞异步代码

```C#
// ❌ 错误：阻塞异步操作
var result = GetDataAsync().Result;

// ✅ 正确：使用 await
var result = await GetDataAsync();
```

### 错误 3：忘记处理异常

```C#
// ❌ 错误：吞掉异常
try
{
    await DoSomethingAsync();
}
catch
{
    // 什么都不做
}

// ✅ 正确：记录或重新抛出异常
try
{
    await DoSomethingAsync();
}
catch (Exception ex)
{
    _logger.LogError(ex, "Operation failed");
    throw; // 或处理异常
}
```

# 七、总结

Task 异步编程是 .NET 中处理并发和异步操作的核心机制。掌握以下要点对于编写高质量的异步代码至关重要：

- ✅ **重试策略**：使用指数退避策略处理临时性失败
- ✅ **超时处理**：使用 `CancellationTokenSource` 实现超时控制
- ✅ **进度汇报**：使用 `IProgress<T>` 向用户报告进度
- ✅ **取消操作**：支持 `CancellationToken` 实现协作式取消
- ✅ **性能优化**：合理使用 `ConfigureAwait(false)` 和 `Task.FromResult`
- ✅ **最佳实践**：遵循异步方法设计原则，避免常见陷阱

通过合理使用这些模式和最佳实践，可以编写出高效、健壮且易于维护的异步代码。

# 八、相关参考

- [《C#并发编程经典实例》](https://www.oreilly.com/library/view/concurrency-in-c/9781449335935/)
- [Task-based Asynchronous Programming - Microsoft Docs](https://docs.microsoft.com/en-us/dotnet/standard/parallel-programming/task-based-asynchronous-programming)
- [Async/Await Best Practices - Microsoft Docs](https://docs.microsoft.com/en-us/archive/msdn-magazine/2013/march/async-await-best-practices-in-asynchronous-programming)
- [ConfigureAwait FAQ](https://devblogs.microsoft.com/dotnet/configureawait-faq/)
- [CancellationToken Struct](https://learn.microsoft.com/en-us/dotnet/api/system.threading.cancellationtoken)
- [IProgress Interface](https://learn.microsoft.com/en-us/dotnet/api/system.iprogress-1)

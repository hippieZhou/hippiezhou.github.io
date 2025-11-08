---
title: The Locker in C#
date: 2017-02-20 21:31:00
updated: 2017-02-20 21:31:00
tags: C#
---

# 同步锁

```C#
private int _value;
private readonly object locker = new object();
private void Increment()
{
    lock (locker)
    {
        _value += 1;
    }
}
```

# 异步锁

```C#
private int _value;
private readonly SemaphoreSlim slim = new SemaphoreSlim(1);
public async Task DelayAndIncrementAsync()
{
    await slim.WaitAsync();
    try
    {
        var oldValue = _value;
        await Task.Delay(TimeSpan.FromSeconds(5));
        _value = oldValue + 1;
    }
    catch (Exception)
    {
        throw;
    }
    finally
    {
        slim.Release();
    }
}
```

# 区别

1. 同步锁中不能使用异步操作
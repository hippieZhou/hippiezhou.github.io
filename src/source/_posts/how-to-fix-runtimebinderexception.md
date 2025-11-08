---
title: How to Fix RuntimeBinderException
date: 2023-04-13 20:27:39
updated: 2023-04-13 20:27:39
tags: C#
---

> 匿名类型在某些场景下使用起来还是比较方便，比如某个类型只会使用一次，那这个时候定义一个 Class 就没有多少意义，完全可以使用匿名类型来解决，但是在跨项目使用时，还是需要注意避免出现 RuntimeBinderException 问题

# 问题描述

比如我们有一个 netstandard2.0 类型的类库项目，里面有一个这样的方法：

```C#
public static class StandardClass
{
    public static dynamic Get()
    {
        return new { prop1 = "hello", prop2 = 12 };
    }
}
```

然后在一个 net6.0 类型的控制台项目添加下述实例代码:

```C#
using ClassLibrary1;

try
{
    var test = StandardClass.Get();
    var prop1 = test.prop1;
}
catch (Exception e)
{
    Console.WriteLine(e);
    throw;
}
```

这个时候，当我们尝试运行这个控制台项目获取 prop1 值，这个时候，就会喜提 **RuntimeBinderException**

# 解决方案

因为匿名类型默认是 Internal 的访问级别。这就意味着如果是同一个程序集中通过 Dynamic 类型来访问这个匿名对象是没有问题，但是如果跨程序集就会导致 RuntimeBinder 无法识别这种类型，从而也就引发了 **RuntimeBinderException** 异常。解决这种问题有 2 种方法：

- 修改返回类型为强类型，取消匿名类型
- 添加 InternalsVisibleTo 属性，让 Internal 级别的对象对外暴露（如下图所示）

![Csprpj](/images/how-to-fix-runtimebinderexception/749711-20230413210950528-233699530.png)

# 相关参考

- [C# ‘dynamic’ cannot access properties from anonymous types declared in another assembly](https://stackoverflow.com/questions/2630370/c-sharp-dynamic-cannot-access-properties-from-anonymous-types-declared-in-anot)

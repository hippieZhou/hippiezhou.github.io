---
title: AOP 学习
title_en: The Learning of AOP
top: false
tags:
  - .NET
date: 2019-08-09 09:34:14
updated: 2019-08-09 09:34:14
---

> Aspect Oriented Programming

## 前言

**AOP** ,英文全称为 `Aspect Oriented Programming` , 中文全称为 `面向切面编程`，这种编程方式是基于 `面向对象思想` 发展而来的。在刚开始接触编程的那几年里，很多人或许未曾了解过这种编程思想(至少我是这样的)。但是随着自己项目经历越来越多，编程技巧有了一些提升之后，对于项目代码中大量重复的逻辑代码就有了自己的想法，这些逻辑代码有着很多相似性，和业务没有多大关系，直觉告诉我们，一定会有什么办法可以解决这个问题的。那么 **AOP** 就产生了，通过这种编程方式能够很好地管理我们的 `业务代码` 和 `逻辑代码`，这对整个项目的代码质量都有很好的提升。对于这种编程方式常会用于哪些地方，这里就先不归纳，我们可以先一起动手实践一下，最后再来总结。

## 实践

前言部分讲的可能会有些抽象，对于没有实际经历的小伙伴可能感受不是那么深刻，所以咱们还是一步一步尝试通过代码的方式来解释上面的思想，希望我能够依据自己的理解把这个解释通。

Let's GO.

### 邯郸学步

> 在 **面向对象** 里，有三大法宝：`继承`、`封装` 和 `多态`, 假设我们需要对实例对象的某些属性、方法进行性能分析，日志统计，那么其中一个解决方法就是通过代理类的方式来解决。

示例代码如下所示：

```C#
class Program
{
    static void Main(string[] args)
    {
        ProxyCar tesla = new ProxyCar() { Name = "Tesla - Model S" };
        tesla.ShowCar();

        Console.ReadKey();
    }
}

/// <summary>
/// 实体类
/// </summary>
public class Car
{
    public virtual string Name { get; set; }

    public virtual void ShowCar() => Console.Write($"一辆全新的《{Name}》已问世");
}

/// <summary>
/// 代理类
/// </summary>
public class ProxyCar:Car
{
    public override string Name
    {
        get => base.Name;
        set
        {
            var sp = new Stopwatch();

            Console.WriteLine($"{value} 准备生产");
            sp.Start();

            #region 模拟具体生成过程
            Thread.Sleep(1000);
            base.Name = value;
            Thread.Sleep(1000);
            #endregion

            sp.Stop();

            Console.WriteLine($"{value} 生产完毕，共耗时：{sp.ElapsedMilliseconds} 毫秒");
        }
    }

    public override void ShowCar()
    {
        Console.Write("您的爱车来了:");
        base.ShowCar();
        Console.Write(",喜欢不?");
    }
}
```

输出结果如下所示：

![](https://img2018.cnblogs.com/blog/749711/201909/749711-20190924144622614-1348321020.png)

正如输出的结果那样，我们通过代理类 `ProxyCar` 来间接访问我们的实例类型 `Car`，通过 `继承` 的方式来对实例类型相应属性和方法进行重写，从而达到了我们我们的预期。

但是这种方式依然不太优雅，它是属于 AOP 的 **静态代理** 实现，如果我们的需求是应用到很多实例类的话，那我们就需要创建很多对应的代理类。长远看来，这种解决方式似乎给我们埋了一个隐形的坑，所以我们还需要对我们的解决方案进行改进。

### 小马过河

> 为了减少上述实现中代理类的创建，我们可以通过使用 **动态代理** 的方式来实现 AOP。

微软开源了一个简单的相应实现：[System.Reflection.DispatchProxy](https://github.com/dotnet/corefx/tree/master/src/System.Reflection.DispatchProxy)。所以这次我们尝试通过这种方式来简化我们的代码。

首先，将上述包通过 `NuGet` 安装到我们的项目中。这里简单说明一下：

![](https://img2018.cnblogs.com/blog/749711/201909/749711-20190928152003836-95358034.png)

如上图所示，我们通过继承抽象类 `DispatchProxy` 来创建我们的自己的动态代理对象生成器类，然后通过调用 `Create` 泛型方法来创建我们的代理对象，这个对象是一个 `object` 类型的，它是可以转化为我们的原始类型的对象，之后我们对该代理对象的一系列操作都会触发 `Invoke` 方法，所以，我们只需要实现该抽象方法，完善我们的 AOP 相关逻辑即可。

我们开始创建我们的动态代理生成器，示例代码如下所示：

```C#
public class ProxyGenerator : DispatchProxy
{
    public object Wrapped;
    public Action<MethodInfo, object[]> BeforeInvoked;
    public Action<MethodInfo, object[]> AfterInvoked;

    protected override object Invoke(MethodInfo targetMethod, object[] args)
    {
        BeforeInvoked?.Invoke(targetMethod, args);
        object result = targetMethod?.Invoke(Wrapped, args);
        AfterInvoked?.Invoke(targetMethod, args);

        return result;
    }
}
```

这里我们定义了一个动态代理需要使用到的实例对象 `Wrapped`，以及对实例对象进行相应操作进行拦截的拦截器 `StartInvoked` 和 `EndInvoked`。

然后，我们还需要创建一个实例接口及其具体实现，用于给上述类传递参数，示例代码如下所示：

```C#
public interface ICar
{
    string Name { get; set; }
    void ShowCar();
}

public class CarImpl : ICar
{
    private string _name;
    public string Name
    {
        get { return _name; }
        set
        {
            #region 模拟具体生成过程
            Thread.Sleep(1000);
            _name = value;
            Thread.Sleep(1000);
            #endregion
        }
    }

    public void ShowCar()
    {
        Console.WriteLine($"您的爱车来了:{Name},喜欢不?");
    }
}
```

最后，上层调用就相对简单一下，如下所示：

```C#
static void Main(string[] args)
{
    var car = new CarImpl();
    ICar wrapped = ProxyGenerator.Create<ICar, ProxyGenerator>();

    var sp = new Stopwatch();
    if (wrapped is ProxyGenerator generator)
    {
        generator.Wrapped = car;
        generator.BeforeInvoked = (mi, args) =>
        {
            Console.WriteLine($"开始调用方法：{mi.Name}");
            sp.Restart();
        };
        generator.AfterInvoked = (mi, args) =>
        {
            sp.Stop();
            Console.WriteLine($"结束调用方法：{mi.Name}，共耗时：{sp.ElapsedMilliseconds} 毫秒");
        };
    }

    wrapped.Name = "Tesla - Model S";
    wrapped.ShowCar();

    Console.ReadKey();
}
```

程序输入如下图所示：

![](https://img2018.cnblogs.com/blog/749711/201909/749711-20190924154648176-388916330.png)

这里需要说一下的是，**属性也是方法**，所以当我们对通过动态代理方式生成的实例对象 `wrapped` 进行的属性和方法操作都会触发我们定义的拦截器。但是这样实现似乎并不完美，因为上面定义的 `ProxyGenerator` 对外界暴露的太多，如果我们在编写过程中忘记设置里面的 *Wrapped* 实例，或者实例不一致，都会导致我们的切面拦截器出问题，所以我们有必要继续优化我们的代码。

### 豁然开朗

> 一直听说 **Java** 里面的 AOP 很多都是通过注解的方式来进行使用，这样开发起来很是酸爽，所以如果我们也要在 C# 中这样用，接下来，我们就需要一步一步改造我们上面的代码了。

首先，需要定义一些我们的拦截器，这些拦截器是通过 `Attribute` 的方式进行的，示例代码如下所示：

```C#
public abstract class ActionAttribute : Attribute
{
    public abstract string FilterType { get; }
    public abstract void Execute(object obj, object[] parameters);
}

public class BeforeActionAttribute : ActionAttribute
{
    public override string FilterType => "方法开始执行";

    public override void Execute(object obj, object[] parameters)
    {
        Console.WriteLine(FilterType);
    }
}

public class AfterActionAttribute : ActionAttribute
{
    public override string FilterType => "方法执行结束";

    public override void Execute(object obj, object[] parameters)
    {
        Console.WriteLine(FilterType);
    }
}

public class ExceptionFilterAttribute : ActionAttribute
{
    public override string FilterType =>"异常检测";

    public override void Execute(object obj, object[] parameters)
    {
        Console.WriteLine(FilterType);
    }
}
```

接着，我们需要定义一个示例类，用来展示上述属性的使用，示例代码如下所示：

```C#
public class Car
{
    [BeforeAction]
    [AfterAction]
    public string Name { get; set; }

    [ExceptionFilter]
    public void Show()
    {
        throw new NotImplementedException();
    }
}
```

这里，我们对 `Name` 属性进行操作的开始和结束进行拦截，同时对 `Show` 方法进行异常拦截。

接下来，就是关键部分，如果按照传统的对象创建方式的话，上述我们使用的拦截器都是无法正常工作的，因此我们需要改变对象的创建方式，通过某种方式来修改我们的对象创建过程。示例代码如下所示：

```C#

```

## 总结

通过上面的三个 Case，我们可以尝试做一个总结了。

在传统的 **OOP** 思想下，`业务代码` 和 `逻辑代码` 常常纠缠在一起，为了提高 `逻辑代码` 的复用率，减少代码冗余，**AOP** 应运而生。 `AOP` 本身是一种和语言无关，基于 OOP 发展而来的 `设计思想`，常常用于一些和业务逻辑无关的需求上面，比如 `日志诊断`、`性能分析` 、`缓存` 等方面；

其实现原理较好理解，就是通过在 `不改变原有业务代码的前提下新增逻辑功能`，从而获取一些非业务信息。(PS：我咋感觉有点像 `伪中台` 呢，大佬别锤我哈！)

在具体实现方面，常常有 `静态代理/静态拦截` 和 `动态代理` 两种方式，前者可参考我上面的第一个示例，后者又有常见的两种事项方式：`常规动态代理` 和 `IL 编织`，我在本文介绍的后两种方式都是常规的动态代理实现，后一种有点难度，我也仔细研究，有兴趣的大佬欢迎在博客园发文，我要膜拜。

在实际的项目开发中，已经有很多成熟的 AOP 框架值得使用：

- Postsharp
- Castle.Core
- KingAOP

所以，AOP 也是可以在 C# 中玩得很溜的，感兴趣的朋友不妨一试。

共勉！

## 相关参考

- [利用C#实现AOP常见的几种方法详解](https://www.cnblogs.com/yy1234/p/8406207.html)
- [使用 RealProxy 类进行面向方面的编程](https://msdn.microsoft.com/zh-cn/library/dn574804.aspx)
- [CoreProxy](https://github.com/ElderJames/CoreProxy)
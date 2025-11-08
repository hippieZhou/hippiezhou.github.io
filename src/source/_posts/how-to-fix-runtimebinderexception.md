---
title: 如何修复 RuntimeBinderException
title_en: How to Fix RuntimeBinderException
date: 2023-04-13 20:27:39
updated: 2023-04-13 20:27:39
tags: 
    - C#
    - .NET
    - Dynamic
    - Anonymous Types
---

> 匿名类型在某些场景下使用起来还是比较方便，比如某个类型只会使用一次，那这个时候定义一个 Class 就没有多少意义，完全可以使用匿名类型来解决，但是在跨项目使用时，还是需要注意避免出现 RuntimeBinderException 问题

# 一、问题背景

在 C# 开发中，匿名类型（Anonymous Types）是一个非常方便的特性，特别适合在以下场景使用：

- ✅ **临时数据结构**：某个类型只会使用一次，定义完整的类显得冗余
- ✅ **LINQ 查询结果**：从数据库或集合中投影出特定字段
- ✅ **快速原型开发**：快速创建数据结构进行测试

然而，当匿名类型与 `dynamic` 类型结合使用，并且跨越程序集边界时，就会遇到 **RuntimeBinderException** 异常。

## 1.1 什么是 RuntimeBinderException

`RuntimeBinderException` 是 .NET 运行时绑定器（Runtime Binder）在无法解析动态成员访问时抛出的异常。这通常发生在：

- 尝试访问不存在的成员
- 访问跨程序集的内部（Internal）类型成员
- 类型转换失败

## 1.2 问题场景

假设我们有一个 `netstandard2.0` 类型的类库项目（ClassLibrary1），其中包含以下代码：

```C#
// ClassLibrary1/StandardClass.cs
namespace ClassLibrary1
{
    public static class StandardClass
    {
        public static dynamic Get()
        {
            return new { prop1 = "hello", prop2 = 12 };
        }
    }
}
```

然后在另一个 `net6.0` 类型的控制台项目中引用该类库并尝试使用：

```C#
// ConsoleApp1/Program.cs
using ClassLibrary1;

try
{
    var test = StandardClass.Get();
    var prop1 = test.prop1;  // ❌ 这里会抛出 RuntimeBinderException
    Console.WriteLine($"prop1: {prop1}");
}
catch (Microsoft.CSharp.RuntimeBinder.RuntimeBinderException e)
{
    Console.WriteLine($"错误: {e.Message}");
    // 输出: 'object' does not contain a definition for 'prop1'
    throw;
}
```

运行时会抛出异常：
```
Microsoft.CSharp.RuntimeBinder.RuntimeBinderException: 'object' does not contain a definition for 'prop1'
```

## 1.3 异常原因分析

匿名类型在 C# 中默认是 **Internal** 访问级别，这意味着：

- ✅ **同一程序集内**：通过 `dynamic` 访问匿名类型属性没有问题
- ❌ **跨程序集**：RuntimeBinder 无法识别其他程序集中的 Internal 类型，导致绑定失败

当匿名类型跨越程序集边界时，编译器会将其视为普通的 `object` 类型，因此无法访问其属性。

# 二、解决方案

针对这个问题，有以下几种解决方案：

## 2.1 方案一：使用强类型（推荐）

**最佳实践**是避免在公共 API 中使用匿名类型和 `dynamic`，改用强类型。

### 2.1.1 定义明确的类型

```C#
// ClassLibrary1/StandardClass.cs
namespace ClassLibrary1
{
    public class ResultData
    {
        public string Prop1 { get; set; }
        public int Prop2 { get; set; }
    }

    public static class StandardClass
    {
        public static ResultData Get()
        {
            return new ResultData
            {
                Prop1 = "hello",
                Prop2 = 12
            };
        }
    }
}
```

### 2.1.2 使用强类型

```C#
// ConsoleApp1/Program.cs
using ClassLibrary1;

var result = StandardClass.Get();
Console.WriteLine($"prop1: {result.Prop1}");  // ✅ 正常工作
Console.WriteLine($"prop2: {result.Prop2}");  // ✅ 正常工作
```

**优点**：
- ✅ 类型安全，编译时检查
- ✅ IDE 智能提示支持
- ✅ 性能更好（无需运行时绑定）
- ✅ 代码可读性更强

**缺点**：
- ❌ 需要定义额外的类型
- ❌ 代码量稍多

### 2.1.3 使用记录类型（C# 9+）

如果使用 C# 9 或更高版本，可以使用记录类型（Record）简化定义：

```C#
// ClassLibrary1/StandardClass.cs
namespace ClassLibrary1
{
    public record ResultData(string Prop1, int Prop2);

    public static class StandardClass
    {
        public static ResultData Get()
        {
            return new ResultData("hello", 12);
        }
    }
}
```

## 2.2 方案二：使用 InternalsVisibleTo

如果必须使用匿名类型和 `dynamic`，可以通过 `InternalsVisibleTo` 属性让调用方程序集能够访问内部类型。

### 2.2.1 添加 AssemblyInfo.cs

在类库项目中添加 `AssemblyInfo.cs` 文件（或直接在项目文件中配置）：

```C#
// ClassLibrary1/AssemblyInfo.cs
using System.Runtime.CompilerServices;

[assembly: InternalsVisibleTo("ConsoleApp1")]
```

### 2.2.2 使用项目文件配置（推荐）

对于 SDK 风格的项目，可以在 `.csproj` 文件中直接配置：

```xml
<!-- ClassLibrary1/ClassLibrary1.csproj -->
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>netstandard2.0</TargetFramework>
  </PropertyGroup>
  
  <ItemGroup>
    <AssemblyAttribute Include="System.Runtime.CompilerServices.InternalsVisibleTo">
      <_Parameter1>ConsoleApp1</_Parameter1>
    </AssemblyAttribute>
  </ItemGroup>
</Project>
```

或者使用更简洁的方式：

```xml
<ItemGroup>
  <InternalsVisibleTo Include="ConsoleApp1" />
</ItemGroup>
```

### 2.2.3 配置多个程序集

如果需要向多个程序集暴露内部成员：

```xml
<ItemGroup>
  <InternalsVisibleTo Include="ConsoleApp1" />
  <InternalsVisibleTo Include="TestProject1" />
  <InternalsVisibleTo Include="AnotherProject" />
</ItemGroup>
```

### 2.2.4 使用强名称程序集

如果程序集使用了强名称（Strong Name），需要包含完整的公钥：

```xml
<ItemGroup>
  <InternalsVisibleTo Include="ConsoleApp1, PublicKey=0024000004800000940000000602000000240000525341310004000001000100..." />
</ItemGroup>
```

**优点**：
- ✅ 保持匿名类型的简洁性
- ✅ 不需要修改现有代码结构

**缺点**：
- ❌ 破坏了封装性，暴露了内部实现细节
- ❌ 需要明确指定每个调用方程序集
- ❌ 维护成本较高（新增调用方需要更新配置）
- ❌ 仍然存在运行时绑定的性能开销

## 2.3 方案三：使用 Dictionary 或 ExpandoObject

如果确实需要动态访问，可以考虑使用 `Dictionary<string, object>` 或 `ExpandoObject`：

```C#
// ClassLibrary1/StandardClass.cs
using System.Collections.Generic;
using System.Dynamic;

namespace ClassLibrary1
{
    public static class StandardClass
    {
        // 方式1: 使用 Dictionary
        public static Dictionary<string, object> GetAsDictionary()
        {
            return new Dictionary<string, object>
            {
                ["prop1"] = "hello",
                ["prop2"] = 12
            };
        }

        // 方式2: 使用 ExpandoObject
        public static dynamic GetAsExpando()
        {
            dynamic result = new ExpandoObject();
            result.prop1 = "hello";
            result.prop2 = 12;
            return result;
        }
    }
}
```

使用方式：

```C#
// 使用 Dictionary
var dict = StandardClass.GetAsDictionary();
var prop1 = dict["prop1"];  // ✅ 正常工作

// 使用 ExpandoObject
var expando = StandardClass.GetAsExpando();
var prop1 = expando.prop1;  // ✅ 正常工作
```

**优点**：
- ✅ 跨程序集正常工作
- ✅ 保持动态访问的灵活性

**缺点**：
- ❌ 性能不如强类型
- ❌ 缺少编译时检查

# 三、最佳实践建议

## 3.1 何时使用匿名类型

✅ **适合使用的场景**：
- 同一程序集内的临时数据结构
- LINQ 查询的中间结果
- 单元测试中的快速数据构造

❌ **不适合使用的场景**：
- 公共 API 的返回值
- 跨程序集的数据传递
- 需要长期维护的数据结构

## 3.2 何时使用 dynamic

✅ **适合使用的场景**：
- 与 COM 互操作
- 与动态语言（如 Python、JavaScript）交互
- 处理 JSON 等动态数据结构（考虑使用 `System.Text.Json` 的 `JsonElement`）

❌ **不适合使用的场景**：
- 替代强类型（优先使用接口或基类）
- 公共 API 设计
- 性能敏感的场景

## 3.3 设计建议

1. **优先使用强类型**：在公共 API 中始终使用明确的类型定义
2. **避免跨程序集的 dynamic**：如果必须使用，考虑使用 `Dictionary` 或 `ExpandoObject`
3. **保持封装性**：谨慎使用 `InternalsVisibleTo`，避免过度暴露内部实现
4. **文档化**：如果必须使用 `dynamic`，在文档中明确说明预期的数据结构

# 四、常见问题

## 4.1 为什么同一程序集内可以访问？

匿名类型在同一程序集内可以正常访问，因为：

- 编译器在编译时就知道匿名类型的完整定义
- RuntimeBinder 可以访问同一程序集中的 Internal 类型
- 类型信息在程序集元数据中可用

## 4.2 InternalsVisibleTo 是否安全？

`InternalsVisibleTo` 会暴露内部实现细节，需要注意：

- ⚠️ **安全风险**：调用方可以访问所有 Internal 成员，包括私有字段和方法
- ⚠️ **维护成本**：内部实现的变更可能影响调用方
- ⚠️ **测试友好**：常用于单元测试项目访问内部成员

## 4.3 性能影响

使用 `dynamic` 会有性能开销：

- 运行时类型解析需要额外时间
- 无法进行编译时优化
- 强类型访问通常比动态访问快 10-100 倍

## 4.4 如何调试 RuntimeBinderException？

调试时可以使用以下技巧：

```C#
try
{
    var test = StandardClass.Get();
    var prop1 = test.prop1;
}
catch (Microsoft.CSharp.RuntimeBinder.RuntimeBinderException e)
{
    // 查看异常详细信息
    Console.WriteLine($"错误消息: {e.Message}");
    Console.WriteLine($"绑定类型: {e.GetType()}");
    
    // 检查实际类型
    Console.WriteLine($"实际类型: {test?.GetType().FullName}");
    
    // 使用反射查看可用成员
    if (test != null)
    {
        var members = test.GetType().GetMembers();
        Console.WriteLine("可用成员:");
        foreach (var member in members)
        {
            Console.WriteLine($"  - {member.Name}");
        }
    }
}
```

# 五、实际应用示例

## 5.1 Web API 返回匿名类型的问题

```C#
// ❌ 不推荐：返回匿名类型
[HttpGet]
public dynamic GetUserInfo()
{
    return new { Id = 1, Name = "John", Email = "john@example.com" };
}
```

```C#
// ✅ 推荐：使用强类型
[HttpGet]
public UserInfoDto GetUserInfo()
{
    return new UserInfoDto
    {
        Id = 1,
        Name = "John",
        Email = "john@example.com"
    };
}

public class UserInfoDto
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string Email { get; set; }
}
```

## 5.2 LINQ 查询中的匿名类型

```C#
// ✅ 同一程序集内使用匿名类型是可以的
var query = from user in users
            where user.IsActive
            select new { user.Id, user.Name, user.Email };

foreach (var item in query)
{
    Console.WriteLine($"{item.Name}: {item.Email}");
}
```

但如果需要跨程序集返回，应该使用强类型：

```C#
// ✅ 跨程序集返回时使用强类型
public IEnumerable<UserSummaryDto> GetActiveUsers()
{
    return from user in users
           where user.IsActive
           select new UserSummaryDto
           {
               Id = user.Id,
               Name = user.Name,
               Email = user.Email
           };
}
```

# 六、总结

`RuntimeBinderException` 在使用匿名类型和 `dynamic` 跨程序集访问时是一个常见问题。解决这个问题的最佳实践是：

1. ✅ **优先使用强类型**：在公共 API 中定义明确的类型，避免使用匿名类型和 `dynamic`
2. ✅ **保持封装性**：谨慎使用 `InternalsVisibleTo`，只在必要时使用（如单元测试）
3. ✅ **考虑替代方案**：如果需要动态访问，考虑使用 `Dictionary` 或 `ExpandoObject`
4. ✅ **理解性能影响**：`dynamic` 有运行时开销，在性能敏感场景避免使用

通过遵循这些最佳实践，可以编写出更健壮、更易维护的 C# 代码。

# 七、相关参考

- [C# 'dynamic' cannot access properties from anonymous types declared in another assembly](https://stackoverflow.com/questions/2630370/c-sharp-dynamic-cannot-access-properties-from-anonymous-types-declared-in-anot)
- [C# 匿名类型文档](https://learn.microsoft.com/zh-cn/dotnet/csharp/fundamentals/types/anonymous-types)
- [dynamic 类型文档](https://learn.microsoft.com/zh-cn/dotnet/csharp/language-reference/builtin-types/reference-types#the-dynamic-type)
- [InternalsVisibleToAttribute 文档](https://learn.microsoft.com/zh-cn/dotnet/api/system.runtime.compilerservices.internalsvisibletoattribute)
- [RuntimeBinderException 文档](https://learn.microsoft.com/zh-cn/dotnet/api/microsoft.csharp.runtimebinder.runtimebinderexception)
- [C# 记录类型（Record）](https://learn.microsoft.com/zh-cn/dotnet/csharp/language-reference/builtin-types/record)

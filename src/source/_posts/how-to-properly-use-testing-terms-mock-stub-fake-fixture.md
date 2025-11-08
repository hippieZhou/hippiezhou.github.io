---
title: 如何正确使用 Mock、Stub、Fake、Fixture 等测试名词
title_en: "How to Properly Use Testing Terms: Mock, Stub, Fake, and Fixture"
date: 2025-07-09 10:37:01
updated: 2025-07-09 10:37:01
tags: Testing, Unit Testing, Test Doubles
---

> 在编写测试代码时，我们经常听到 Mock、Stub、Fake、Fixture 等术语，但这些概念之间的区别和正确使用方法往往让人困惑。本文将从 Martin Fowler 的经典定义出发，结合实际代码示例，详细解释这些测试名词的含义、区别和使用场景，帮助开发者写出更清晰、更准确的测试代码。

# 一、测试替身（Test Doubles）概述

在测试中，我们经常需要替换真实的对象或依赖，这些替换物统称为**测试替身（Test Doubles）**。Martin Fowler 在他的经典文章 [Mocks Aren't Stubs](https://martinfowler.com/articles/mocksArentStubs.html) 中，将测试替身分为以下几类：

- **Dummy**：占位对象，不会被使用
- **Fake**：简化实现的对象
- **Stub**：提供预设响应的对象
- **Mock**：可验证交互的对象
- **Spy**：记录调用信息的真实对象包装

# 二、各类型详解

## 2.1 Dummy（占位对象）

**定义**：Dummy 是一个占位对象，在测试中不会被实际使用，只是为了满足方法签名或参数要求。

**使用场景**：
- 方法需要传递参数，但该参数在测试中不会被使用
- 仅用于满足编译要求

**示例**：

```C#
// Dummy 对象：不会被使用，只是为了满足参数要求
public class OrderService
{
    public void ProcessOrder(Order order, ILogger logger)
    {
        // logger 在这个方法中不会被使用
        // 但方法签名要求传递它
    }
}

// 测试中
[Fact]
public void ProcessOrder_Should_Work()
{
    var dummyLogger = new DummyLogger(); // 占位对象，不会被使用
    var order = new Order { Id = 1 };
    var service = new OrderService();
    
    service.ProcessOrder(order, dummyLogger);
    // dummyLogger 不会被调用，只是占位
}
```

## 2.2 Fake（伪造对象）

**定义**：Fake 是一个简化但可工作的实现，通常用于替代重量级的依赖（如数据库、文件系统）。

**特点**：
- ✅ 有实际的实现逻辑
- ✅ 功能简化但可用
- ✅ 通常比真实实现更快、更轻量

**使用场景**：
- 内存数据库替代真实数据库
- 内存文件系统替代真实文件系统
- 简化的 HTTP 客户端实现

**示例**：

```C#
// Fake：内存数据库实现
public class InMemoryUserRepository : IUserRepository
{
    private readonly List<User> _users = new();
    
    public Task<User> GetByIdAsync(int id)
    {
        return Task.FromResult(_users.FirstOrDefault(u => u.Id == id));
    }
    
    public Task SaveAsync(User user)
    {
        var existing = _users.FirstOrDefault(u => u.Id == user.Id);
        if (existing != null)
        {
            _users.Remove(existing);
        }
        _users.Add(user);
        return Task.CompletedTask;
    }
}

// 测试中使用 Fake
[Fact]
public async Task GetUser_Should_Return_User()
{
    var fakeRepo = new InMemoryUserRepository();
    await fakeRepo.SaveAsync(new User { Id = 1, Name = "Test" });
    
    var user = await fakeRepo.GetByIdAsync(1);
    Assert.NotNull(user);
    Assert.Equal("Test", user.Name);
}
```

## 2.3 Stub（桩对象）

**定义**：Stub 提供预设的响应，不关心方法如何被调用，只返回预定义的值。

**特点**：
- ✅ 返回预设的响应
- ✅ 不验证调用方式
- ✅ 不记录调用信息

**使用场景**：
- 模拟外部 API 返回固定数据
- 模拟依赖返回成功/失败状态
- 简化测试数据准备

**示例**：

```C#
// Stub：返回预设响应
public class StubPaymentService : IPaymentService
{
    private readonly bool _shouldSucceed;
    
    public StubPaymentService(bool shouldSucceed = true)
    {
        _shouldSucceed = shouldSucceed;
    }
    
    public Task<PaymentResult> ProcessPaymentAsync(decimal amount)
    {
        // 不关心参数，只返回预设结果
        return Task.FromResult(new PaymentResult
        {
            Success = _shouldSucceed,
            TransactionId = "stub-transaction-123"
        });
    }
}

// 测试中使用 Stub
[Fact]
public async Task ProcessOrder_With_Successful_Payment_Should_Complete()
{
    var stubPayment = new StubPaymentService(shouldSucceed: true);
    var orderService = new OrderService(stubPayment);
    
    var result = await orderService.ProcessOrderAsync(new Order { Amount = 100 });
    
    Assert.True(result.Success);
    // 不关心 stubPayment 被调用了多少次，只关心结果
}
```

## 2.4 Mock（模拟对象）

**定义**：Mock 不仅提供预设响应，还会验证对象之间的交互（调用次数、参数等）。

**特点**：
- ✅ 返回预设响应
- ✅ **验证交互行为**（调用次数、参数等）
- ✅ 记录调用信息

**使用场景**：
- 验证方法是否被调用
- 验证调用次数和参数
- 确保对象间的协作正确

**示例**（使用 Moq 框架）：

```C#
// Mock：验证交互
[Fact]
public async Task ProcessOrder_Should_Call_PaymentService_Once()
{
    var mockPayment = new Mock<IPaymentService>();
    mockPayment
        .Setup(x => x.ProcessPaymentAsync(It.IsAny<decimal>()))
        .ReturnsAsync(new PaymentResult { Success = true });
    
    var orderService = new OrderService(mockPayment.Object);
    await orderService.ProcessOrderAsync(new Order { Amount = 100 });
    
    // 验证交互：确保 ProcessPaymentAsync 被调用了一次
    mockPayment.Verify(
        x => x.ProcessPaymentAsync(It.Is<decimal>(a => a == 100)), 
        Times.Once);
}
```

## 2.5 Spy（间谍对象）

**定义**：Spy 是对真实对象的包装，记录调用信息但不改变行为。

**特点**：
- ✅ 使用真实实现
- ✅ 记录调用信息
- ✅ 可以验证调用

**使用场景**：
- 需要真实行为但也要验证调用
- 调试测试问题
- 性能监控

**示例**：

```C#
// Spy：包装真实对象，记录调用
public class SpyLogger : ILogger
{
    private readonly ILogger _realLogger;
    public List<string> LoggedMessages { get; } = new();
    
    public SpyLogger(ILogger realLogger)
    {
        _realLogger = realLogger;
    }
    
    public void Log(string message)
    {
        LoggedMessages.Add(message); // 记录调用
        _realLogger.Log(message); // 调用真实实现
    }
}

// 测试中使用 Spy
[Fact]
public void ProcessOrder_Should_Log_Message()
{
    var realLogger = new ConsoleLogger();
    var spyLogger = new SpyLogger(realLogger);
    var service = new OrderService(spyLogger);
    
    service.ProcessOrder(new Order());
    
    // 验证日志被记录
    Assert.Contains("Order processed", spyLogger.LoggedMessages);
}
```

# 三、对比总结

| 类型 | 是否有实现 | 是否验证交互 | 主要用途 | 示例 |
|------|-----------|-------------|---------|------|
| **Dummy** | ❌ 无 | ❌ 否 | 占位，满足参数要求 | `null`, 空对象 |
| **Fake** | ✅ 简化实现 | ❌ 否 | 替代重量级依赖 | 内存数据库 |
| **Stub** | ⚠️ 预设响应 | ❌ 否 | 返回预设数据 | 固定返回值 |
| **Mock** | ⚠️ 预设响应 | ✅ **是** | 验证交互行为 | Moq, NSubstitute |
| **Spy** | ✅ 真实实现 | ✅ 是 | 记录调用信息 | 包装真实对象 |

# 四、实际应用建议

## 4.1 何时使用 Stub

**使用 Stub 当：**
- ✅ 只需要返回预设数据
- ✅ 不关心方法如何被调用
- ✅ 测试重点是业务逻辑，不是交互

**示例场景**：
```C#
// 只需要返回成功响应，不关心调用细节
var stubRepo = new StubUserRepository();
stubRepo.SetupGetById(1, new User { Id = 1, Name = "Test" });
```

## 4.2 何时使用 Mock

**使用 Mock 当：**
- ✅ 需要验证方法是否被调用
- ✅ 需要验证调用次数和参数
- ✅ 测试重点是对象间的协作

**示例场景**：
```C#
// 需要验证 SendEmail 被调用了一次
var mockEmail = new Mock<IEmailService>();
mockEmail.Verify(x => x.SendEmail(It.IsAny<string>()), Times.Once);
```

## 4.3 何时使用 Fake

**使用 Fake 当：**
- ✅ 需要真实的简化实现
- ✅ 需要持久化数据（在测试范围内）
- ✅ 替代重量级依赖

**示例场景**：
```C#
// 使用内存数据库替代真实数据库
var fakeDb = new InMemoryDbContext();
// 可以保存和查询数据，但只在内存中
```

## 4.4 何时使用 Fixture

**Fixture（测试夹具）**不是测试替身，而是测试数据的准备工具：

```C#
// Fixture：测试数据准备
public class OrderFixture
{
    public Order CreatePendingOrder(string orderId = null)
    {
        return new Order
        {
            Id = orderId ?? Guid.NewGuid().ToString(),
            Status = "Pending",
            Amount = 100,
            CreatedAt = DateTime.UtcNow
        };
    }
    
    public Order CreateCompletedOrder()
    {
        return new Order
        {
            Id = Guid.NewGuid().ToString(),
            Status = "Completed",
            Amount = 100,
            CreatedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow
        };
    }
}

// 使用 Fixture
[Fact]
public void ProcessOrder_Should_Work()
{
    var fixture = new OrderFixture();
    var order = fixture.CreatePendingOrder("order-123");
    // 使用 fixture 创建测试数据
}
```

# 五、常见错误和最佳实践

## 5.1 常见错误

### ❌ 错误 1：过度使用 Mock

```C#
// ❌ 不好的做法：Mock 一切
var mockRepo = new Mock<IUserRepository>();
var mockLogger = new Mock<ILogger>();
var mockCache = new Mock<ICache>();
// 过度 Mock，测试变得复杂且难以理解
```

### ✅ 正确做法：合理选择

```C#
// ✅ 好的做法：根据需求选择
var fakeRepo = new InMemoryUserRepository(); // Fake：需要真实行为
var stubLogger = new StubLogger(); // Stub：只需要占位
var mockEmail = new Mock<IEmailService>(); // Mock：需要验证调用
```

## 5.2 最佳实践

1. **优先使用 Fake**：如果可能，使用 Fake 替代 Mock，因为它更接近真实行为
2. **Stub 用于数据**：当只需要返回数据时，使用 Stub
3. **Mock 用于验证**：当需要验证交互时，使用 Mock
4. **避免过度 Mock**：不要 Mock 一切，这会降低测试的可读性和维护性
5. **使用 Fixture 管理测试数据**：集中管理测试数据的创建逻辑

## 5.3 选择决策树

```
需要替代依赖吗？
├─ 是 → 需要验证交互吗？
│   ├─ 是 → 使用 Mock
│   └─ 否 → 需要真实行为吗？
│       ├─ 是 → 使用 Fake
│       └─ 否 → 使用 Stub
└─ 否 → 只是占位 → 使用 Dummy
```

# 六、.NET 中的常用框架

## 6.1 Moq（Mock 框架）

```C#
var mock = new Mock<IService>();
mock.Setup(x => x.GetData()).Returns("test");
mock.Verify(x => x.GetData(), Times.Once);
```

## 6.2 NSubstitute（Mock 框架）

```C#
var substitute = Substitute.For<IService>();
substitute.GetData().Returns("test");
substitute.Received().GetData();
```

## 6.3 Bogus（测试数据生成）

```C#
var faker = new Faker<User>()
    .RuleFor(u => u.Name, f => f.Name.FullName())
    .RuleFor(u => u.Email, f => f.Internet.Email());
var user = faker.Generate(); // Fixture 数据生成
```

# 七、总结

理解这些测试名词的区别有助于：

- ✅ **写出更清晰的测试代码**：选择合适的测试替身类型
- ✅ **提高测试可读性**：明确表达测试意图
- ✅ **避免过度 Mock**：根据需求选择合适的方式
- ✅ **提高测试质量**：验证正确的内容（数据 vs 交互）

记住：
- **Stub** = 返回数据，不验证交互
- **Mock** = 返回数据 + 验证交互
- **Fake** = 简化但真实的实现
- **Fixture** = 测试数据准备工具

选择合适的工具，写出更好的测试！

# 相关参考

- [Mocks Aren't Stubs - Martin Fowler](https://martinfowler.com/articles/mocksArentStubs.html)
- [Test Double - xUnit Patterns](http://xunitpatterns.com/Test%20Double.html)
- [Moq Documentation](https://github.com/moq/moq4)
- [NSubstitute Documentation](https://nsubstitute.github.io/)


---
title: 如何在 ASP.NET Core 中保持与 ASP.NET 一致的 Payload 处理
title_en: "How to Keep Payload Processing in ASP.NET Core Consistent with ASP.NET"
date: 2023-07-25 22:15:59
updated: 2023-07-25 22:15:59
tags: ASP.NET Core, Model Binding, JSON Serialization, Migration
---

> 在将 ASP.NET 应用迁移到 ASP.NET Core 时，可能会遇到 Payload 处理不一致的问题。当请求体中的数据类型与后端定义的类型不匹配时，ASP.NET 会使用默认值填充，而 ASP.NET Core 会抛出异常。本文分析问题原因，并提供两种解决方案，确保两个框架在处理请求体时保持一致的行为。

# 一、问题背景

## 1.1 迁移场景

在将 ASP.NET Web API 应用迁移到 ASP.NET Core 的过程中，团队需要将 Engagements 相关的业务接口从 ASP.NET 框架迁移至 ASP.NET Core。

得益于团队前期已经把基础依赖部分的实现代码都迁移到了 `netstandard2.0`，所以 Controller 级别的接口迁移工作量相对较小，基本只需要修改路由定义和对应的返回值类型。

## 1.2 问题出现

在所有相关的 Controller 都迁移完成后，按照团队的测试策略部署到 QA 环境进行测试。第一轮测试中，QA 人员反馈测试相对顺利，没有发现明显的 bug。

然而，在后续测试中，突然收到了其他团队的反馈，说有一个接口出现问题，错误日志如下：

![Error](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/error01.png)

## 1.3 问题分析

通过对比前后端代码，确认这一块的代码从 ASP.NET 迁移到 ASP.NET Core 中并没有做任何改动，理论上不应该出现这种问题。

# 二、问题复现

## 2.1 创建测试接口

为了在本地复现问题，创建了两个不同框架的测试接口：

### ASP.NET Core 版本

```C#
using Microsoft.AspNetCore.Mvc;

namespace AspNetCoreApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class XXXServicesController : ControllerBase
    {
        [HttpPut("fee/xxx/{engagementId}/services")]
        public IActionResult Save(
            [FromRoute] long engagementId, 
            [FromBody] BatchUpdateEngagementTypeOfServiceRequest request)
        {
            return Ok(request);
        }
    }
}
```

### ASP.NET 版本

```C#
using System.Net;
using System.Net.Http;
using System.Web.Http;

namespace AspNetApp.Controllers
{
    public class EngagementServicesController : ApiController
    {
        [HttpPut]
        [Route("fee/xxx/{engagementId}/services")]
        public HttpResponseMessage Save(
            long engagementId, 
            BatchUpdateEngagementTypeOfServiceRequest request)
        {
            return Request.CreateResponse(HttpStatusCode.OK, request);
        }
    }
}
```

## 2.2 测试 Payload

使用以下 Payload 进行测试：

```json
{
   "servicesToCreate":[
      {
         "service":{
            "name":"12312",
            "engagementUri":"https://test/xxx/20069",
            "countryTypeOfServiceUri":"https://test/services/1798",
            "status":"Active",
            "needPreApproval":false,
            "actionRequiredLeadTime":"N/A"
         },
         "fee":{
            "countryAbbreviation":"LT",
            "interofficeFeeAmount":null,
            "actionRequiredLeadTime":null,
            "useForProgressBill":false
         }
      }
   ],
   "servicesToUpdate":[],
   "idsToBeDeleted":[]
}
```

## 2.3 问题现象

在相同 Payload 的情况下：

- ✅ **ASP.NET**：可以正常解析，`request` 对象不为 null
- ❌ **ASP.NET Core**：`request` 对象为 `null`，无法正常解析

## 2.4 根本原因

通过对比 Payload 格式和定义的 DTO，发现问题根源：

- **后端定义**：`actionRequiredLeadTime` 的类型为 `int?`（可空整数）
- **前端传递**：值为 `"N/A"`（字符串）
- **类型不匹配**：导致反序列化失败

### DTO 定义示例

```C#
public class BatchUpdateEngagementTypeOfServiceRequest
{
    public List<ServiceToCreate> ServicesToCreate { get; set; }
    public List<ServiceToUpdate> ServicesToUpdate { get; set; }
    public List<long> IdsToBeDeleted { get; set; }
}

public class ServiceToCreate
{
    public ServiceInfo Service { get; set; }
    public FeeInfo Fee { get; set; }
}

public class ServiceInfo
{
    public string Name { get; set; }
    public string EngagementUri { get; set; }
    public string CountryTypeOfServiceUri { get; set; }
    public string Status { get; set; }
    public bool NeedPreApproval { get; set; }
    public int? ActionRequiredLeadTime { get; set; }  // 定义为 int?
}
```

## 2.5 添加错误日志

为了获取更详细的错误信息，在 ASP.NET Core 中注册序列化异常回调：

```C#
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using NLog;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers()
            .AddNewtonsoftJson(options =>
            {
                options.SerializerSettings.Error += (sender, args) =>
                {
                    var errorCtx = args.ErrorContext.Error;
                    LogManager.GetLogger(nameof(Program))
                        .Log(LogLevel.Error, errorCtx, errorCtx.Message);
                    args.ErrorContext.Handled = false;
                };
            });

        var app = builder.Build();
        app.MapControllers();
        app.Run();
    }
}
```

添加上述配置后，ASP.NET Core 会输出详细的错误信息：

![Error](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/error02.png)

错误信息显示：无法将字符串 `"N/A"` 转换为 `int?` 类型。

# 三、追根溯源

## 3.1 框架差异分析

通过本地复现，可以得出以下结论：

- **ASP.NET**：当 Payload 中的参数类型与后端定义的类型不一致时，**不会报错**，会使用**默认值填充**
- **ASP.NET Core**：当类型不匹配时，会**直接抛出参数类型异常**

## 3.2 Model Binding 流程

无论是 ASP.NET Core 还是 ASP.NET，对于 Payload 转换为后端对象的逻辑都是由 **Model Binding** 这一层来实现的。

![Filter Pipeline](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/filterpipeline.png)

![Controller Execute](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/controllerexecute.png)

## 3.3 差异原因

通过查看源码可以发现，两种框架在 Model Binding 的实现上存在差异：

- **ASP.NET**：使用更宽松的类型转换策略，无法转换时使用默认值
- **ASP.NET Core**：使用严格的类型检查，类型不匹配时抛出异常

这种差异导致在迁移过程中，原本在 ASP.NET 中能正常工作的接口，在 ASP.NET Core 中可能会失败。

# 四、解决方案

## 4.1 方案一：自定义 Model Binder（推荐用于特定类型）

适用于需要为特定类型或特定请求模型定制绑定逻辑的场景。

### 4.1.1 实现自定义 Model Binder

```C#
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using System.Text;

public class BatchUpdateEngagementTypeOfServiceRequestBinder : IModelBinder
{
    private readonly ILogger<BatchUpdateEngagementTypeOfServiceRequestBinder> _logger;

    public BatchUpdateEngagementTypeOfServiceRequestBinder(
        ILogger<BatchUpdateEngagementTypeOfServiceRequestBinder> logger)
    {
        _logger = logger;
    }

    public async Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }

        // 启用请求体缓冲，以便多次读取
        bindingContext.HttpContext.Request.EnableBuffering();

        // 读取请求体
        using var reader = new StreamReader(
            bindingContext.HttpContext.Request.Body, 
            Encoding.UTF8, 
            leaveOpen: true);
        
        var body = await reader.ReadToEndAsync();

        try
        {
            // 使用自定义转换器反序列化
            var model = JsonConvert.DeserializeObject<BatchUpdateEngagementTypeOfServiceRequest>(
                body,
                new CustomNullableIntJsonConverter());

            bindingContext.Result = ModelBindingResult.Success(model);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bind model: {Message}", ex.Message);
            bindingContext.Result = ModelBindingResult.Failed();
        }
        finally
        {
            // 重置流位置，以便后续处理
            bindingContext.HttpContext.Request.Body.Seek(0, SeekOrigin.Begin);
        }
    }
}
```

### 4.1.2 实现自定义 JSON 转换器

```C#
using Newtonsoft.Json;

internal class CustomNullableIntJsonConverter : JsonConverter<int?>
{
    public override void WriteJson(JsonWriter writer, int? value, JsonSerializer serializer)
    {
        if (value.HasValue)
        {
            writer.WriteValue(value.Value);
        }
        else
        {
            writer.WriteNull();
        }
    }

    public override int? ReadJson(
        JsonReader reader, 
        Type objectType, 
        int? existingValue, 
        bool hasExistingValue,
        JsonSerializer serializer)
    {
        if (reader.Value == null)
        {
            return null;
        }

        // 尝试解析字符串值
        var stringValue = reader.Value.ToString();
        
        // 如果是 "N/A" 或其他无法解析的值，返回 null
        if (string.Equals(stringValue, "N/A", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(stringValue, "null", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        // 尝试解析为整数
        if (int.TryParse(stringValue, out var intValue))
        {
            return intValue;
        }

        // 无法解析时返回 null（而不是抛出异常）
        return null;
    }

    public override bool CanRead => true;
    public override bool CanWrite => true;
}
```

### 4.1.3 实现 Model Binder Provider

```C#
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.AspNetCore.Mvc.ModelBinding.Binders;

public class CustomRequestEntityBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context == null)
        {
            throw new ArgumentNullException(nameof(context));
        }

        // 只为特定类型提供自定义绑定器
        if (context.Metadata.ModelType == typeof(BatchUpdateEngagementTypeOfServiceRequest))
        {
            return new BinderTypeModelBinder(typeof(BatchUpdateEngagementTypeOfServiceRequestBinder));
        }

        return null;
    }
}
```

### 4.1.4 注册 Model Binder

```C#
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using NLog;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers(options =>
        {
            // 移除默认的输出格式化器（可选）
            options.OutputFormatters.RemoveType<StringOutputFormatter>();
            options.OutputFormatters.RemoveType<HttpNoContentOutputFormatter>();
            
            // 注册自定义 Model Binder Provider
            options.ModelBinderProviders.Insert(0, new CustomRequestEntityBinderProvider());
        })
        .AddNewtonsoftJson(options =>
        {
            // 注册错误处理回调
            options.SerializerSettings.Error += (sender, args) =>
            {
                var errorCtx = args.ErrorContext.Error;
                LogManager.GetLogger(nameof(Program))
                    .Log(LogLevel.Error, errorCtx, 
                        $"Cannot process request body with incorrect type: {errorCtx.Message}");
                args.ErrorContext.Handled = false;
            };
        });

        var app = builder.Build();
        app.MapControllers();
        app.Run();
    }
}
```

**优点**：
- ✅ 精确控制特定类型的绑定行为
- ✅ 不影响其他类型的绑定
- ✅ 可以添加详细的日志记录

**缺点**：
- ❌ 需要为每个类型创建单独的 Binder
- ❌ 代码量较多

## 4.2 方案二：自定义值类型 JSON 转换器（推荐用于全局处理）

适用于需要全局处理所有值类型转换的场景，更通用且易于维护。

### 4.2.1 实现通用值类型转换器

```C#
using System.ComponentModel;
using Newtonsoft.Json;

/// <summary>
/// 自定义值类型 JSON 转换器，用于处理类型不匹配的情况
/// 当无法转换时，返回类型的默认值而不是抛出异常
/// </summary>
public class ValueTypeJsonConverter : JsonConverter
{
    public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
    {
        if (value == null)
        {
            writer.WriteNull();
        }
        else
        {
            writer.WriteValue(value);
        }
    }

    public override object? ReadJson(
        JsonReader reader, 
        Type objectType, 
        object? existingValue,
        JsonSerializer serializer)
    {
        var val = reader.Value;
        
        // 如果值为 null，返回类型的默认值
        if (val == null)
        {
            return GetDefaultValue(objectType);
        }

        try
        {
            // 尝试使用 TypeConverter 进行转换
            var typeDescriptor = TypeDescriptor.GetConverter(objectType);
            if (typeDescriptor != null && typeDescriptor.CanConvertFrom(val.GetType()))
            {
                return typeDescriptor.ConvertFrom(val);
            }
        }
        catch (Exception ex)
        {
            // 如果是参数异常（通常是类型不匹配），返回默认值
            if (ex is ArgumentException || ex is FormatException)
            {
                return GetDefaultValue(objectType);
            }

            // 其他异常重新抛出
            throw;
        }

        // 如果无法转换，返回默认值
        return GetDefaultValue(objectType);
    }

    public override bool CanConvert(Type objectType)
    {
        // 只处理值类型（包括可空值类型）
        return objectType.IsValueType || 
               (objectType.IsGenericType && 
                objectType.GetGenericTypeDefinition() == typeof(Nullable<>));
    }

    /// <summary>
    /// 获取类型的默认值
    /// </summary>
    private static object? GetDefaultValue(Type type)
    {
        // 处理可空类型
        if (type.IsGenericType && type.GetGenericTypeDefinition() == typeof(Nullable<>))
        {
            return null;
        }

        // 返回值类型的默认值
        return Activator.CreateInstance(type);
    }
}
```

### 4.2.2 注册转换器

```C#
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using NLog;

public class Program
{
    public static void Main(string[] args)
    {
        var builder = WebApplication.CreateBuilder(args);

        builder.Services.AddControllers(options =>
        {
            // 移除默认的输出格式化器（可选）
            options.OutputFormatters.RemoveType<StringOutputFormatter>();
            options.OutputFormatters.RemoveType<HttpNoContentOutputFormatter>();
        })
        .AddNewtonsoftJson(options =>
        {
            // 添加自定义值类型转换器
            options.SerializerSettings.Converters.Add(new ValueTypeJsonConverter());
            
            // 注册错误处理回调
            options.SerializerSettings.Error += (sender, args) =>
            {
                var errorCtx = args.ErrorContext.Error;
                LogManager.GetLogger(nameof(Program))
                    .Log(LogLevel.Error, errorCtx, 
                        $"Cannot process request body with incorrect type: {errorCtx.Message}");
                
                // 设置为已处理，避免抛出异常
                args.ErrorContext.Handled = true;
            };
        });

        var app = builder.Build();
        app.MapControllers();
        app.Run();
    }
}
```

**优点**：
- ✅ 全局生效，无需为每个类型单独配置
- ✅ 代码简洁，易于维护
- ✅ 自动处理所有值类型的转换

**缺点**：
- ❌ 可能影响其他不需要宽松转换的场景
- ❌ 需要仔细测试确保不会隐藏真正的错误

## 4.3 方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|-----|---------|------|------|
| **方案一：自定义 Model Binder** | 特定类型需要特殊处理 | 精确控制、不影响其他类型 | 需要为每个类型创建 Binder |
| **方案二：自定义 JSON 转换器** | 全局处理所有值类型 | 全局生效、代码简洁 | 可能影响其他场景 |

## 4.4 选择建议

- **迁移场景**：如果是为了保持与 ASP.NET 的兼容性，推荐使用**方案二**（全局转换器）
- **特定需求**：如果只有少数几个类型需要特殊处理，推荐使用**方案一**（自定义 Binder）
- **新项目**：建议修复前端代码，传递正确的数据类型，而不是使用这些兼容性方案

# 五、最佳实践

## 5.1 前端修复（推荐）

最好的解决方案是修复前端代码，确保传递的数据类型与后端定义一致：

```javascript
// 前端代码修复示例
const payload = {
    service: {
        name: "12312",
        actionRequiredLeadTime: serviceData.actionRequiredLeadTime === "N/A" 
            ? null 
            : parseInt(serviceData.actionRequiredLeadTime)
    }
};
```

## 5.2 使用数据验证

在 DTO 中添加数据验证属性：

```C#
using System.ComponentModel.DataAnnotations;

public class ServiceInfo
{
    [Required]
    public string Name { get; set; }
    
    [Range(0, int.MaxValue, ErrorMessage = "ActionRequiredLeadTime must be a positive integer")]
    public int? ActionRequiredLeadTime { get; set; }
}
```

## 5.3 统一错误处理

```C#
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

public class ModelValidationFilter : IActionFilter
{
    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            context.Result = new BadRequestObjectResult(context.ModelState);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // 执行后处理
    }
}
```

## 5.4 日志记录

确保记录详细的日志，便于问题排查：

```C#
options.SerializerSettings.Error += (sender, args) =>
{
    var errorCtx = args.ErrorContext.Error;
    var path = args.ErrorContext.Path;
    
    _logger.LogError(
        errorCtx, 
        "JSON deserialization error at path '{Path}': {Message}", 
        path, 
        errorCtx.Message);
    
    args.ErrorContext.Handled = true;
};
```

# 六、测试验证

## 6.1 单元测试

```C#
using Xunit;
using Newtonsoft.Json;

public class ValueTypeJsonConverterTests
{
    [Fact]
    public void ReadJson_WithNumericString_ShouldParse()
    {
        // Arrange
        var converter = new ValueTypeJsonConverter();
        var json = "\"123\"";
        var reader = new JsonTextReader(new StringReader(json));
        reader.Read();

        // Act
        var result = converter.ReadJson(reader, typeof(int?), null, JsonSerializer.CreateDefault());

        // Assert
        Assert.Equal(123, result);
    }

    [Fact]
    public void ReadJson_WithNAString_ShouldReturnNull()
    {
        // Arrange
        var converter = new ValueTypeJsonConverter();
        var json = "\"N/A\"";
        var reader = new JsonTextReader(new StringReader(json));
        reader.Read();

        // Act
        var result = converter.ReadJson(reader, typeof(int?), null, JsonSerializer.CreateDefault());

        // Assert
        Assert.Null(result);
    }
}
```

## 6.2 集成测试

```C#
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Save_WithInvalidType_ShouldReturnOk()
    {
        // Arrange
        var client = _factory.CreateClient();
        var payload = new
        {
            servicesToCreate = new[]
            {
                new
                {
                    service = new
                    {
                        name = "Test",
                        actionRequiredLeadTime = "N/A"
                    }
                }
            }
        };

        // Act
        var response = await client.PutAsJsonAsync(
            "/api/XXXServices/fee/xxx/123/services", 
            payload);

        // Assert
        response.EnsureSuccessStatusCode();
    }
}
```

# 七、常见问题

## 7.1 为什么 ASP.NET 不会报错？

ASP.NET 使用更宽松的类型转换策略，当类型不匹配时：
- 尝试使用 `TypeConverter` 进行转换
- 如果转换失败，使用类型的默认值（对于可空类型是 `null`，对于值类型是 `0` 等）

## 7.2 为什么 ASP.NET Core 会报错？

ASP.NET Core 使用更严格的类型检查：
- 使用 `System.Text.Json` 或 `Newtonsoft.Json` 进行反序列化
- 类型不匹配时直接抛出异常，而不是使用默认值

## 7.3 如何选择 JSON 序列化库？

ASP.NET Core 默认使用 `System.Text.Json`，但可以通过 `AddNewtonsoftJson()` 使用 `Newtonsoft.Json`：

```C#
// 使用 System.Text.Json（默认，性能更好）
builder.Services.AddControllers();

// 使用 Newtonsoft.Json（功能更丰富，兼容性更好）
builder.Services.AddControllers().AddNewtonsoftJson();
```

## 7.4 性能影响

自定义转换器可能会影响性能，特别是在高并发场景下。建议：
- 只在必要时使用
- 进行性能测试
- 考虑使用缓存优化

# 八、总结

在将 ASP.NET 应用迁移到 ASP.NET Core 时，Payload 处理的不一致性是一个常见问题。本文提供了两种解决方案：

1. ✅ **自定义 Model Binder**：适用于特定类型需要特殊处理的场景
2. ✅ **自定义 JSON 转换器**：适用于全局处理所有值类型的场景

**关键要点**：

- ASP.NET 使用宽松的类型转换，类型不匹配时使用默认值
- ASP.NET Core 使用严格的类型检查，类型不匹配时抛出异常
- 可以通过自定义转换器或 Model Binder 实现兼容性
- **最佳实践**：修复前端代码，确保数据类型正确

**建议**：

- 🎯 **迁移阶段**：使用方案二（全局转换器）快速解决兼容性问题
- 🎯 **长期方案**：修复前端代码，统一数据类型
- 🎯 **新项目**：从一开始就确保前后端数据类型一致

通过本文的解决方案，可以确保 ASP.NET Core 应用在处理 Payload 时与 ASP.NET 保持一致的行为，顺利完成迁移工作。

# 九、相关参考

- [ASP.NET Core 模型绑定](https://learn.microsoft.com/zh-cn/aspnet/core/mvc/models/model-binding)
- [自定义模型绑定器](https://learn.microsoft.com/zh-cn/aspnet/core/mvc/advanced/custom-model-binding)
- [Newtonsoft.Json 文档](https://www.newtonsoft.com/json/help/html/Introduction.htm)
- [从 ASP.NET 迁移到 ASP.NET Core](https://learn.microsoft.com/zh-cn/aspnet/core/migration/proper-to-aspnetcore)
- [JSON 序列化最佳实践](https://learn.microsoft.com/zh-cn/dotnet/standard/serialization/system-text-json/how-to)

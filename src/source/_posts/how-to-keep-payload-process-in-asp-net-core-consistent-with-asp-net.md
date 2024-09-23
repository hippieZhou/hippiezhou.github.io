---
title: How to keep payload process in ASP.NET Core consistent with ASP.NET
date: 2023-07-25 22:15:59
updated: 2023-07-25 22:15:59
tags: ASP.NET Core
---

# 问题背景

最近主要做的一项工作是需要将 XXX Api 中 Engagements 相关的业务接口从  ASP.NET  框架迁移至  ASP.NET Core 中。得益于团队前期已经把基础依赖部分的实现代码都已经迁到到  netstandard2.0，所以 Controller 级别的接口迁移也就不需要很多工作量，基本就是修改一下路由定义和对应的返回值类型就差不多了。再把所有相关的 Controller 都迁移完之后按照团队的测试策略来讲的话，也就可以部署到 QA 环境进行测试。在第一轮的测试过程中，QA 人员反馈测试相对比较顺利，没有发现什么明显的 bug。本以为能安心接着修改 Engagements 对应的测试，但是却突然收到了其他团队的反馈，说有一个接口出问题，错误日志如下图所示：

![Error](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/error01.png)

# 问题复现

通过和前后端代码反复对比确认，这一块的代码从 ASP.NET 迁移到 ASP.NET Core 中并没有做任何改动，理论上不应该出现这种问题，为了让这个问题能在本地复现，我在本地分别写了两个不同框架的接口：

```C#
# ASP.NET Core
public class XXXServicesController : ControllerBase
{
    [HttpPut("fee/xxx/{engagementId}/services")]
    public IActionResult Save([FromRoute]long engagementId, [FromBody] BatchUpdateEngagementTypeOfServiceRequest request)
    {
        return Ok(request);
    }
}

# ASP.NET
public class EngagementServicesController : ApiController
{
    [HttpPut]
    [Route("fee/xxx/{engagementId}/services")]
    public HttpResponseMessage Save(long engagementId, BatchUpdateEngagementTypeOfServiceRequest request)
    {
        return Request.CreateResponse(request);
    }
}
```

Payload 参数如下所示：

```C#
{
   "servicesToCreate":[
      {
         "service":{
            "name":"12312",
            "engagementUri":"https://test/xxx/20069",
            "countryTypeOfServiceUri":"https://test/services/1798",
            "status":"Active",
            "needPreApproval":false,
            "abc":"N/A"
         },
         "fee":{
            "countryAbbreviation":"LT",
            "interofficeFeeAmount":null,
            "adbcdefeaade":null,
            "useForProgressBill":false
         }
      }
   ],
   "servicesToUpdate":[

   ],
   "idsToBeDeleted":[

   ]
}
```

发现在 payload 相同的情况下，传到 ASP.NET 中就可以正常解析，但是传到 APS.NET Core 中时就会导致转化 request 对象为 null，通过对比 payload 格式和定义的 DTO 差异，发现 actionRequiredLeadTime 后端实际定义的类型为 int? 类型，但是前端传递的值却是 N/A ，显然是类型不匹配导致的问题。为了让日志里面的错误更加具体，我在 ASP.NET Core 中将序列化异常的回调事件注册上：

```C#
services.AddControllers().AddNewtonsoftJson(options =>
{
    options.SerializerSettings.Error += (sender, args) =>
    {
        var errorCtx = args.ErrorContext.Error;
        LogManager.GetLogger(nameof(Program)).Log(LogLevel.Error, errorCtx, errorCtx.Message);
        args.ErrorContext.Handled = false;
    };
});
```

添加上述配置后再进行测试，ASP.NET Core 中就会有一个这种错误信息了：

![Error](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/error02.png)

# 追根溯源

通过本地复现的方式，可以得到一个这样的结论：在 payload 穿的参数类型和后端定义的参数类型不一致的情况下，ASP.NET 不会报错，会以默认值填充；但是在 ASP.NET Core 中就直接爆参数类型异常。为了从代码代码角度来分析这个问题，有必要先了解一下这两种框架对于处理 payload 的差异性。

![Filter Pipeline](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/filterpipeline.png)

![Controller Execute](/images/how-to-keep-payload-process-in-asp-net-core-consistent-with-asp-net/controllerexecute.png)

通过上图我们可以看到，无论是 ASP.NET Core 还是 ASP.NET ，对于 payload 转后端对象的逻辑都是由 Model Binding 这一层来实现的，所以就需要这里面的不同实现，通过查看源码可以找出有这一段逻辑。

# 解决方案

## 方案一：CustomModelBinder

```C#
public class BatchUpdateEngagementTypeOfServiceRequestBinder : IModelBinder
{
    private readonly ILogger<BatchUpdateEngagementTypeOfServiceRequestBinder> logger;
    public BatchUpdateEngagementTypeOfServiceRequestBinder(ILogger<BatchUpdateEngagementTypeOfServiceRequestBinder> logger)
    {
        this.logger = logger;
    }

    public async Task BindModelAsync(ModelBindingContext bindingContext)
    {
        if (bindingContext == null)
        {
            throw new ArgumentNullException(nameof(bindingContext));
        }
        bindingContext.HttpContext.Request.EnableBuffering();
        using var reader = new StreamReader(bindingContext.ActionContext.HttpContext.Request.Body);
        var body = await reader.ReadToEndAsync();

        try
        {
            var model = JsonConvert.DeserializeObject<BatchUpdateEngagementTypeOfServiceRequest>(body,
                new CustomNullableIntJsonConverter());
            bindingContext.Result = ModelBindingResult.Success(model);
        }
        catch (Exception e)
        {
            logger.LogError(e, e.Message);
        }
        finally
        {
            bindingContext.ActionContext.HttpContext.Request.Body.Seek(0, SeekOrigin.Begin);
        }
    }
}

internal class CustomNullableIntJsonConverter : JsonConverter<int?>
{
    public override void WriteJson(JsonWriter writer, int? value, JsonSerializer serializer)
    {
        writer.WriteValue(value.ToString());
    }

    public override int? ReadJson(JsonReader reader, Type objectType, int? existingValue, bool hasExistingValue,
        JsonSerializer serializer)
    {
        return reader.Value == null ? null : int.TryParse(reader.Value.ToString(), out var val) ? val : default(int?);
    }
}
```

```C#
public class CustomRequestEntityBinderProvider : IModelBinderProvider
{
    public IModelBinder? GetBinder(ModelBinderProviderContext context)
    {
        if (context == null)
        {
            throw new ArgumentNullException(nameof(context));
        }

        return context.Metadata.ModelType == typeof(BatchUpdateEngagementTypeOfServiceRequest)
            ? new BinderTypeModelBinder(typeof(BatchUpdateEngagementTypeOfServiceRequestBinder))
            : null;
    }
}
```

```C#
services.AddControllers(options =>
{
    options.OutputFormatters.RemoveType<StringOutputFormatter>();
    options.OutputFormatters.RemoveType<HttpNoContentOutputFormatter>();
    options.ModelBinderProviders.Insert(0, new CustomRequestEntityBinderProvider());
}).AddNewtonsoftJson(options =>
{
    options.SerializerSettings.Error += (sender, args) =>
    {
        var errorCtx = args.ErrorContext.Error;
        LogManager.GetLogger(nameof(Program)).Log(LogLevel.Error, errorCtx, $"can not process request body with incorrect type:{errorCtx.Message}");
        args.ErrorContext.Handled = false;
    };
});
```

## 方案二：CustomValueTypeJsonConverter

```C#
# ValueTypeJsonConverter.cs
public class ValueTypeJsonConverter : JsonConverter
{
    public override void WriteJson(JsonWriter writer, object? value, JsonSerializer serializer)
    {
        writer.WriteValue(value);
    }

    public override object? ReadJson(JsonReader reader, Type objectType, object? existingValue,
        JsonSerializer serializer)
    {
        var val = reader.Value;
        if (val == null)
        {
            return Activator.CreateInstance(objectType);
        }

        try
        {
            var typeDescriptor = TypeDescriptor.GetConverter(objectType);
            return typeDescriptor.ConvertFromString(val.ToString());
        }
        catch (Exception e)
        {
            if (e is ArgumentException)
            {
                return Activator.CreateInstance(objectType);
            }

            throw;
        }
    }

    public override bool CanConvert(Type objectType) => objectType.IsValueType;
}
```

```C#
services.AddControllers(options =>
{
    options.OutputFormatters.RemoveType<StringOutputFormatter>();
    options.OutputFormatters.RemoveType<HttpNoContentOutputFormatter>();
}).AddNewtonsoftJson(options =>
{
	  options.SerializerSettings.Converters.Add(new ValueTypeJsonConverter());
    options.SerializerSettings.Error += (sender, args) =>
    {
        var errorCtx = args.ErrorContext.Error;
        LogManager.GetLogger(nameof(Program)).Log(LogLevel.Error, errorCtx, $"can not process request body with incorrect type:{errorCtx.Message}");
        args.ErrorContext.Handled = true;
    };
});
```

# 总结

> 略

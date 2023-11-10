+++
title = 'Prevent escaping string in path params with swaggerUI'
date = 2023-11-10T20:33:37+08:00
tags = ["backend"]
draft = false
+++

## Introduction

Recent days, I got an interesting bug in my backend api. when i use different tools(SwaggerUI & Axios) to send a request with slash(/) as parameter, they are different:

- api

```bash
[Route("api/helloworld")]
[ApiController]
public class HelloWorldController : ControllerBase
{
    [HttpPut("test/{*path}")]
    public async Task<IActionResult> ImportWorkbooks(string path)
    {
        return Ok(path);
    }
}

```

![Prevent Escaping String in Path Params With SwaggerUI](/images/posts/Snipaste_2023-11-10_21-15-29.png)

we can find the same issue on github: [Prevent escaping html in path params? ](https://github.com/swagger-api/swagger-ui/issues/1637)

## Fix it

When we use `Swashbuckle.AspNetCore` in our's ASP.NET Core backend service, it provide a simple way to inject a request interceptor in HTTP request, as follows:

```bash
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(options =>
    {
        var request = "(request) => { request.url = decodeURIComponent(request.url); return request; }";
        options.UseRequestInterceptor(request);
    });
}
```

from now on, we fix it, happay end.

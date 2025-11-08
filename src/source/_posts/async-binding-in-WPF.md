---
title: WPF 中的异步绑定
title_en: Async Binding in WPF
date: 2017-04-18 14:05:39
updated: 2017-04-18 14:05:39
tags: WPF
---

> 在进行 WPF 开发过程中，当我们需要将一些请求较为耗时的数据通过数据绑定的方法显示到 View 层时，这个时候为了提升用户体验，需要保证 View 层不能出现卡顿，并最好能显示一些数据请求信息。因此，我们可以通过创建一个继承 **INotifyPropertyChanged** 泛型类来实现该效果。

首先，我们创建一个能够在 Task 运行的不同状态下进行属性通知的类，示例代码如下：

```C#
public class BindableTask<T> : INotifyPropertyChanged
{
    private readonly Task<T> _task;
    public BindableTask(Task<T> task)
    {
        _task = task;
        var _ = WatchTaskAsync();
    }

    private async Task WatchTaskAsync()
    {
        try
        {
            await _task;
        }
        catch (Exception)
        {

            throw;
        }
        OnPropertyChanged(nameof(IsNotCompleted));
        OnPropertyChanged(nameof(IsSuccessfullyCompleted));
        OnPropertyChanged(nameof(IsFaulted));
        OnPropertyChanged(nameof(Result));
    }
    public bool IsNotCompleted => !_task.IsCompleted;
    public bool IsSuccessfullyCompleted => _task.Status == TaskStatus.RanToCompletion;
    public bool IsFaulted => _task.IsFaulted;
    public T Result => IsSuccessfullyCompleted ? _task.Result : default(T);

    public event PropertyChangedEventHandler PropertyChanged;
    public void OnPropertyChanged(string propertyName) => PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
}
```

该类支持在任务 **未完成** **完成** **错误** 时进行属性通知

创建对应的 ViewModel，示例代码如下：

```C#
public class MainViewModel
{
    public BindableTask<string> MyValue { get;private set; }

    public MainViewModel()
    {
        MyValue = new BindableTask<string>(CalculateMyValueAsync());
    }

    private async Task<string> CalculateMyValueAsync()
    {
        //此处用于模拟耗时操作
        await Task.Delay(TimeSpan.FromSeconds(5));
        return "hippieZhou";
    }
}
```

创建相应的值转换器，用于将执行状态直观的显示到界面上，示例代码如下：

```C#
public class BooleanToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (bool.TryParse(value.ToString(), out bool b))
            return b ? Visibility.Visible : Visibility.Collapsed;
        else
            return Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
```

创建 View 层，进行数据展示，示例代码如下：

```XAML
<Window.Resources>
    <ResourceDictionary>
        <local:BooleanToVisibilityConverter x:Key="BooleanToVisibilityConverter" />
    </ResourceDictionary>
</Window.Resources>
<Window.DataContext>
    <local:MainViewModel />
</Window.DataContext>
<Grid>
    <Grid HorizontalAlignment="Center" VerticalAlignment="Center">
        <Label Content="Loading" Visibility="{Binding MyValue.IsNotCompleted, Converter={StaticResource BooleanToVisibilityConverter}}" />
        <Label Content="{Binding MyValue.Result}" />
        <Label
            Content="An Error Occurred"
            Foreground="Red"
            Visibility="{Binding MyValue.IsFaulted, Converter={StaticResource BooleanToVisibilityConverter}}" />
    </Grid>
</Grid>
```

执行上述操作后，运行该程序，会发现程序在运行 5 秒之后显示由显示 **loading** 变为 **hippieZhou**。

# 相关参考

1. 《C#并发编程经典实例》

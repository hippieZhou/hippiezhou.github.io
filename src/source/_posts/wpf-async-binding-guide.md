---
title: WPF 中的异步绑定：实现非阻塞数据加载
title_en: "Async Binding in WPF: Implementing Non-Blocking Data Loading"
date: 2017-04-18 14:05:39
updated: 2017-04-18 14:05:39
tags: 
    - WPF
    - Async
    - Data Binding
    - MVVM
---

> 在 WPF 开发中，当需要通过数据绑定显示耗时较长的数据时，为了提升用户体验，需要确保 UI 不卡顿，并显示加载状态。本文介绍如何通过创建一个继承 `INotifyPropertyChanged` 的泛型类来实现异步绑定，让 UI 在数据加载过程中保持响应，并提供加载状态和错误处理。

# 一、问题背景

在 WPF 应用中，当我们需要从数据库、Web API 或其他耗时操作中获取数据并显示在界面上时，如果直接在 UI 线程上执行这些操作，会导致界面冻结，用户体验很差。

## 1.1 传统方式的局限性

```C#
// ❌ 错误：阻塞 UI 线程
public class MainViewModel : INotifyPropertyChanged
{
    private string _myValue;
    public string MyValue
    {
        get => _myValue;
        set { _myValue = value; OnPropertyChanged(); }
    }

    public MainViewModel()
    {
        // 这会阻塞 UI 线程
        MyValue = LoadData(); // 同步方法，会导致 UI 冻结
    }
}
```

## 1.2 异步绑定的优势

- ✅ **非阻塞 UI**：异步操作不会阻塞 UI 线程
- ✅ **加载状态显示**：可以显示加载指示器
- ✅ **错误处理**：可以优雅地处理错误
- ✅ **更好的用户体验**：界面保持响应

# 二、BindableTask 类实现

## 2.1 基础实现

创建一个能够在 Task 运行的不同状态下进行属性通知的类：

```C#
using System;
using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Threading.Tasks;

public class BindableTask<T> : INotifyPropertyChanged
{
    private readonly Task<T> _task;

    public BindableTask(Task<T> task)
    {
        _task = task ?? throw new ArgumentNullException(nameof(task));
        
        // 如果任务已完成，立即通知属性变化
        if (task.IsCompleted)
        {
            OnPropertyChanged(nameof(IsNotCompleted));
            OnPropertyChanged(nameof(IsSuccessfullyCompleted));
            OnPropertyChanged(nameof(IsFaulted));
            OnPropertyChanged(nameof(IsCanceled));
            OnPropertyChanged(nameof(Result));
            OnPropertyChanged(nameof(Exception));
        }
        else
        {
            // 异步监视任务状态变化
            _ = WatchTaskAsync();
        }
    }

    private async Task WatchTaskAsync()
    {
        try
        {
            await _task;
        }
        catch
        {
            // 异常会被捕获并在属性中暴露
        }
        finally
        {
            // 任务完成时通知所有相关属性
            OnPropertyChanged(nameof(IsNotCompleted));
            OnPropertyChanged(nameof(IsSuccessfullyCompleted));
            OnPropertyChanged(nameof(IsFaulted));
            OnPropertyChanged(nameof(IsCanceled));
            OnPropertyChanged(nameof(Result));
            OnPropertyChanged(nameof(Exception));
        }
    }

    // 任务状态属性
    public bool IsNotCompleted => !_task.IsCompleted;
    public bool IsSuccessfullyCompleted => _task.Status == TaskStatus.RanToCompletion;
    public bool IsFaulted => _task.IsFaulted;
    public bool IsCanceled => _task.IsCanceled;
    public bool IsCompleted => _task.IsCompleted;

    // 结果属性
    public T Result => IsSuccessfullyCompleted ? _task.Result : default(T);

    // 异常属性
    public Exception Exception => _task.IsFaulted ? _task.Exception?.GetBaseException() : null;

    // 实现 INotifyPropertyChanged
    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

## 2.2 改进版本：支持取消和重试

```C#
public class BindableTask<T> : INotifyPropertyChanged
{
    private readonly Task<T> _task;
    private readonly Func<Task<T>> _taskFactory;

    public BindableTask(Task<T> task)
    {
        _task = task ?? throw new ArgumentNullException(nameof(task));
        if (task.IsCompleted)
        {
            NotifyProperties();
        }
        else
        {
            _ = WatchTaskAsync();
        }
    }

    public BindableTask(Func<Task<T>> taskFactory)
    {
        _taskFactory = taskFactory ?? throw new ArgumentNullException(nameof(taskFactory));
        _task = taskFactory();
        _ = WatchTaskAsync();
    }

    private async Task WatchTaskAsync()
    {
        try
        {
            await _task;
        }
        catch
        {
            // 异常处理
        }
        finally
        {
            NotifyProperties();
        }
    }

    private void NotifyProperties()
    {
        OnPropertyChanged(nameof(IsNotCompleted));
        OnPropertyChanged(nameof(IsSuccessfullyCompleted));
        OnPropertyChanged(nameof(IsFaulted));
        OnPropertyChanged(nameof(IsCanceled));
        OnPropertyChanged(nameof(Result));
        OnPropertyChanged(nameof(Exception));
    }

    // 重试方法
    public void Retry()
    {
        if (_taskFactory != null)
        {
            var newTask = _taskFactory();
            // 重新创建 BindableTask
            // 注意：这需要重新绑定到 ViewModel
        }
    }

    // 属性定义...
    public bool IsNotCompleted => !_task.IsCompleted;
    public bool IsSuccessfullyCompleted => _task.Status == TaskStatus.RanToCompletion;
    public bool IsFaulted => _task.IsFaulted;
    public bool IsCanceled => _task.IsCanceled;
    public T Result => IsSuccessfullyCompleted ? _task.Result : default(T);
    public Exception Exception => _task.IsFaulted ? _task.Exception?.GetBaseException() : null;

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

## 2.3 非泛型版本（用于无返回值任务）

```C#
public class BindableTask : INotifyPropertyChanged
{
    private readonly Task _task;

    public BindableTask(Task task)
    {
        _task = task ?? throw new ArgumentNullException(nameof(task));
        if (task.IsCompleted)
        {
            NotifyProperties();
        }
        else
        {
            _ = WatchTaskAsync();
        }
    }

    private async Task WatchTaskAsync()
    {
        try
        {
            await _task;
        }
        catch
        {
            // 异常处理
        }
        finally
        {
            NotifyProperties();
        }
    }

    private void NotifyProperties()
    {
        OnPropertyChanged(nameof(IsNotCompleted));
        OnPropertyChanged(nameof(IsSuccessfullyCompleted));
        OnPropertyChanged(nameof(IsFaulted));
        OnPropertyChanged(nameof(IsCanceled));
        OnPropertyChanged(nameof(Exception));
    }

    public bool IsNotCompleted => !_task.IsCompleted;
    public bool IsSuccessfullyCompleted => _task.Status == TaskStatus.RanToCompletion;
    public bool IsFaulted => _task.IsFaulted;
    public bool IsCanceled => _task.IsCanceled;
    public Exception Exception => _task.IsFaulted ? _task.Exception?.GetBaseException() : null;

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

# 三、ViewModel 实现

## 3.1 基础 ViewModel

```C#
using System;
using System.Threading.Tasks;
using System.Windows.Input;

public class MainViewModel : INotifyPropertyChanged
{
    private BindableTask<string> _myValue;

    public MainViewModel()
    {
        // 初始化时启动异步加载
        LoadData();
    }

    public BindableTask<string> MyValue
    {
        get => _myValue;
        private set
        {
            _myValue = value;
            OnPropertyChanged();
        }
    }

    public ICommand RefreshCommand { get; }

    private void LoadData()
    {
        MyValue = new BindableTask<string>(CalculateMyValueAsync());
    }

    private async Task<string> CalculateMyValueAsync()
    {
        // 模拟耗时操作（如 API 调用、数据库查询等）
        await Task.Delay(TimeSpan.FromSeconds(2));
        
        // 模拟可能的异常
        // throw new Exception("模拟错误");
        
        return "hippieZhou";
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

## 3.2 支持刷新的 ViewModel

```C#
public class MainViewModel : INotifyPropertyChanged
{
    private BindableTask<string> _myValue;
    private bool _isRefreshing;

    public MainViewModel()
    {
        RefreshCommand = new RelayCommand(RefreshData, () => !IsRefreshing);
        LoadData();
    }

    public BindableTask<string> MyValue
    {
        get => _myValue;
        private set
        {
            _myValue = value;
            OnPropertyChanged();
        }
    }

    public bool IsRefreshing
    {
        get => _isRefreshing;
        private set
        {
            _isRefreshing = value;
            OnPropertyChanged();
            ((RelayCommand)RefreshCommand).RaiseCanExecuteChanged();
        }
    }

    public ICommand RefreshCommand { get; }

    private void LoadData()
    {
        MyValue = new BindableTask<string>(LoadDataAsync());
    }

    private void RefreshData()
    {
        IsRefreshing = true;
        LoadData();
        
        // 等待任务完成后重置刷新状态
        if (MyValue != null)
        {
            MyValue.PropertyChanged += (s, e) =>
            {
                if (e.PropertyName == nameof(BindableTask<string>.IsCompleted))
                {
                    IsRefreshing = false;
                }
            };
        }
    }

    private async Task<string> LoadDataAsync()
    {
        await Task.Delay(TimeSpan.FromSeconds(2));
        return $"Data loaded at {DateTime.Now:HH:mm:ss}";
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

// 简单的 RelayCommand 实现
public class RelayCommand : ICommand
{
    private readonly Action _execute;
    private readonly Func<bool> _canExecute;

    public RelayCommand(Action execute, Func<bool> canExecute = null)
    {
        _execute = execute ?? throw new ArgumentNullException(nameof(execute));
        _canExecute = canExecute;
    }

    public event EventHandler CanExecuteChanged;

    public bool CanExecute(object parameter) => _canExecute?.Invoke() ?? true;

    public void Execute(object parameter) => _execute();

    public void RaiseCanExecuteChanged() => CanExecuteChanged?.Invoke(this, EventArgs.Empty);
}
```

## 3.3 多个异步数据绑定

```C#
public class DashboardViewModel : INotifyPropertyChanged
{
    public DashboardViewModel()
    {
        UserData = new BindableTask<User>(LoadUserDataAsync());
        Statistics = new BindableTask<Statistics>(LoadStatisticsAsync());
        RecentActivities = new BindableTask<List<Activity>>(LoadRecentActivitiesAsync());
    }

    public BindableTask<User> UserData { get; }
    public BindableTask<Statistics> Statistics { get; }
    public BindableTask<List<Activity>> RecentActivities { get; }

    private async Task<User> LoadUserDataAsync()
    {
        await Task.Delay(1000);
        return new User { Name = "John Doe", Email = "john@example.com" };
    }

    private async Task<Statistics> LoadStatisticsAsync()
    {
        await Task.Delay(1500);
        return new Statistics { TotalUsers = 1000, ActiveUsers = 750 };
    }

    private async Task<List<Activity>> LoadRecentActivitiesAsync()
    {
        await Task.Delay(2000);
        return new List<Activity>
        {
            new Activity { Description = "User logged in", Timestamp = DateTime.Now },
            new Activity { Description = "Data updated", Timestamp = DateTime.Now.AddMinutes(-5) }
        };
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

# 四、值转换器

## 4.1 BooleanToVisibilityConverter

WPF 已经内置了 `BooleanToVisibilityConverter`，但我们可以创建自定义版本以支持更多功能：

```C#
using System;
using System.Globalization;
using System.Windows;
using System.Windows.Data;

public class BooleanToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is bool boolValue)
        {
            // 支持反转参数（parameter="Invert"）
            if (parameter?.ToString() == "Invert")
            {
                boolValue = !boolValue;
            }
            
            return boolValue ? Visibility.Visible : Visibility.Collapsed;
        }
        
        return Visibility.Collapsed;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is Visibility visibility)
        {
            bool result = visibility == Visibility.Visible;
            
            if (parameter?.ToString() == "Invert")
            {
                result = !result;
            }
            
            return result;
        }
        
        return false;
    }
}
```

## 4.2 空值到可见性转换器

```C#
public class NullToVisibilityConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        bool isNull = value == null;
        
        if (parameter?.ToString() == "Invert")
        {
            isNull = !isNull;
        }
        
        return isNull ? Visibility.Collapsed : Visibility.Visible;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
```

## 4.3 异常消息转换器

```C#
public class ExceptionToMessageConverter : IValueConverter
{
    public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
    {
        if (value is Exception exception)
        {
            return exception.Message;
        }
        
        return string.Empty;
    }

    public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
    {
        throw new NotImplementedException();
    }
}
```

# 五、View 层实现

## 5.1 基础实现

```XAML
<Window x:Class="WpfApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:WpfApp"
        Title="Async Binding Example" Height="450" Width="800">
    
    <Window.Resources>
        <local:BooleanToVisibilityConverter x:Key="BooleanToVisibilityConverter" />
        <local:ExceptionToMessageConverter x:Key="ExceptionToMessageConverter" />
    </Window.Resources>
    
    <Window.DataContext>
        <local:MainViewModel />
    </Window.DataContext>
    
    <Grid>
        <StackPanel HorizontalAlignment="Center" VerticalAlignment="Center" Spacing="10">
            <!-- 加载指示器 -->
            <StackPanel Orientation="Horizontal" 
                       Visibility="{Binding MyValue.IsNotCompleted, Converter={StaticResource BooleanToVisibilityConverter}}">
                <TextBlock Text="Loading..." FontSize="16" Margin="0,0,10,0"/>
                <ProgressBar IsIndeterminate="True" Width="200" Height="20"/>
            </StackPanel>
            
            <!-- 成功显示结果 -->
            <TextBlock Text="{Binding MyValue.Result}" 
                      FontSize="18"
                      Visibility="{Binding MyValue.IsSuccessfullyCompleted, Converter={StaticResource BooleanToVisibilityConverter}}"/>
            
            <!-- 错误显示 -->
            <StackPanel Visibility="{Binding MyValue.IsFaulted, Converter={StaticResource BooleanToVisibilityConverter}}">
                <TextBlock Text="An Error Occurred:" 
                          Foreground="Red" 
                          FontWeight="Bold" 
                          Margin="0,0,0,5"/>
                <TextBlock Text="{Binding MyValue.Exception, Converter={StaticResource ExceptionToMessageConverter}}" 
                          Foreground="Red"/>
            </StackPanel>
        </StackPanel>
    </Grid>
</Window>
```

## 5.2 使用 DataTemplate 的改进版本

```XAML
<Window x:Class="WpfApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:WpfApp"
        Title="Async Binding Example" Height="450" Width="800">
    
    <Window.Resources>
        <local:BooleanToVisibilityConverter x:Key="BooleanToVisibilityConverter" />
        
        <!-- 加载状态模板 -->
        <DataTemplate x:Key="LoadingTemplate">
            <StackPanel Orientation="Horizontal">
                <TextBlock Text="Loading..." FontSize="16" Margin="0,0,10,0"/>
                <ProgressBar IsIndeterminate="True" Width="200" Height="20"/>
            </StackPanel>
        </DataTemplate>
        
        <!-- 成功状态模板 -->
        <DataTemplate x:Key="SuccessTemplate">
            <TextBlock Text="{Binding Result}" FontSize="18" Foreground="Green"/>
        </DataTemplate>
        
        <!-- 错误状态模板 -->
        <DataTemplate x:Key="ErrorTemplate">
            <StackPanel>
                <TextBlock Text="Error:" Foreground="Red" FontWeight="Bold"/>
                <TextBlock Text="{Binding Exception.Message}" Foreground="Red"/>
            </StackPanel>
        </DataTemplate>
    </Window.Resources>
    
    <Window.DataContext>
        <local:MainViewModel />
    </Window.DataContext>
    
    <Grid>
        <ContentControl Content="{Binding MyValue}">
            <ContentControl.Style>
                <Style TargetType="ContentControl">
                    <Style.Triggers>
                        <DataTrigger Binding="{Binding IsNotCompleted}" Value="True">
                            <Setter Property="ContentTemplate" Value="{StaticResource LoadingTemplate}"/>
                        </DataTrigger>
                        <DataTrigger Binding="{Binding IsSuccessfullyCompleted}" Value="True">
                            <Setter Property="ContentTemplate" Value="{StaticResource SuccessTemplate}"/>
                        </DataTrigger>
                        <DataTrigger Binding="{Binding IsFaulted}" Value="True">
                            <Setter Property="ContentTemplate" Value="{StaticResource ErrorTemplate}"/>
                        </DataTrigger>
                    </Style.Triggers>
                </Style>
            </ContentControl.Style>
        </ContentControl>
    </Grid>
</Window>
```

## 5.3 多个异步数据绑定示例

```XAML
<Window x:Class="WpfApp.DashboardWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        xmlns:local="clr-namespace:WpfApp"
        Title="Dashboard" Height="600" Width="800">
    
    <Window.Resources>
        <local:BooleanToVisibilityConverter x:Key="BooleanToVisibilityConverter" />
    </Window.Resources>
    
    <Window.DataContext>
        <local:DashboardViewModel />
    </Window.DataContext>
    
    <Grid Margin="20">
        <Grid.RowDefinitions>
            <RowDefinition Height="Auto"/>
            <RowDefinition Height="*"/>
            <RowDefinition Height="*"/>
        </Grid.RowDefinitions>
        
        <!-- 用户信息 -->
        <GroupBox Header="User Information" Grid.Row="0" Margin="0,0,0,10">
            <Grid>
                <ProgressBar IsIndeterminate="True" 
                           Visibility="{Binding UserData.IsNotCompleted, Converter={StaticResource BooleanToVisibilityConverter}}"/>
                <StackPanel Visibility="{Binding UserData.IsSuccessfullyCompleted, Converter={StaticResource BooleanToVisibilityConverter}}">
                    <TextBlock Text="{Binding UserData.Result.Name}" FontSize="16"/>
                    <TextBlock Text="{Binding UserData.Result.Email}"/>
                </StackPanel>
            </Grid>
        </GroupBox>
        
        <!-- 统计信息 -->
        <GroupBox Header="Statistics" Grid.Row="1" Margin="0,0,0,10">
            <Grid>
                <ProgressBar IsIndeterminate="True" 
                           Visibility="{Binding Statistics.IsNotCompleted, Converter={StaticResource BooleanToVisibilityConverter}}"/>
                <StackPanel Visibility="{Binding Statistics.IsSuccessfullyCompleted, Converter={StaticResource BooleanToVisibilityConverter}}">
                    <TextBlock Text="{Binding Statistics.Result.TotalUsers, StringFormat='Total Users: {0}'}"/>
                    <TextBlock Text="{Binding Statistics.Result.ActiveUsers, StringFormat='Active Users: {0}'}"/>
                </StackPanel>
            </Grid>
        </GroupBox>
        
        <!-- 最近活动 -->
        <GroupBox Header="Recent Activities" Grid.Row="2">
            <Grid>
                <ProgressBar IsIndeterminate="True" 
                           Visibility="{Binding RecentActivities.IsNotCompleted, Converter={StaticResource BooleanToVisibilityConverter}}"/>
                <ListBox ItemsSource="{Binding RecentActivities.Result}" 
                        Visibility="{Binding RecentActivities.IsSuccessfullyCompleted, Converter={StaticResource BooleanToVisibilityConverter}}"/>
            </Grid>
        </GroupBox>
    </Grid>
</Window>
```

# 六、最佳实践

## 6.1 错误处理

```C#
public class MainViewModel : INotifyPropertyChanged
{
    private BindableTask<string> _myValue;

    public MainViewModel()
    {
        MyValue = new BindableTask<string>(LoadDataWithErrorHandlingAsync());
        
        // 监听错误
        MyValue.PropertyChanged += (s, e) =>
        {
            if (e.PropertyName == nameof(BindableTask<string>.IsFaulted) && MyValue.IsFaulted)
            {
                // 记录错误日志
                LogError(MyValue.Exception);
                
                // 显示错误消息给用户
                ShowErrorMessage(MyValue.Exception?.Message ?? "An error occurred");
            }
        };
    }

    private async Task<string> LoadDataWithErrorHandlingAsync()
    {
        try
        {
            // 模拟可能失败的操作
            await Task.Delay(TimeSpan.FromSeconds(2));
            
            // 模拟错误
            if (DateTime.Now.Second % 2 == 0)
            {
                throw new InvalidOperationException("Simulated error");
            }
            
            return "Success";
        }
        catch (Exception ex)
        {
            // 记录详细错误信息
            Console.WriteLine($"Error loading data: {ex}");
            throw; // 重新抛出，让 BindableTask 处理
        }
    }

    private void LogError(Exception exception)
    {
        // 实现日志记录
    }

    private void ShowErrorMessage(string message)
    {
        // 实现错误消息显示（如使用 MessageBox）
    }

    public BindableTask<string> MyValue
    {
        get => _myValue;
        private set
        {
            _myValue = value;
            OnPropertyChanged();
        }
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

## 6.2 取消支持

```C#
public class MainViewModel : INotifyPropertyChanged
{
    private CancellationTokenSource _cancellationTokenSource;
    private BindableTask<string> _myValue;

    public MainViewModel()
    {
        CancelCommand = new RelayCommand(CancelLoad, () => _myValue?.IsNotCompleted == true);
        LoadData();
    }

    public BindableTask<string> MyValue
    {
        get => _myValue;
        private set
        {
            _myValue = value;
            OnPropertyChanged();
            ((RelayCommand)CancelCommand).RaiseCanExecuteChanged();
        }
    }

    public ICommand CancelCommand { get; }

    private void LoadData()
    {
        _cancellationTokenSource = new CancellationTokenSource();
        MyValue = new BindableTask<string>(LoadDataAsync(_cancellationTokenSource.Token));
    }

    private void CancelLoad()
    {
        _cancellationTokenSource?.Cancel();
    }

    private async Task<string> LoadDataAsync(CancellationToken cancellationToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(5), cancellationToken);
        cancellationToken.ThrowIfCancellationRequested();
        return "Data loaded";
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

## 6.3 性能优化

```C#
// 使用 ConfigureAwait(false) 避免不必要的上下文切换
private async Task<string> LoadDataAsync()
{
    await Task.Delay(TimeSpan.FromSeconds(2)).ConfigureAwait(false);
    return "Data";
}

// 缓存结果，避免重复加载
public class MainViewModel : INotifyPropertyChanged
{
    private BindableTask<string> _myValue;
    private string _cachedValue;

    public BindableTask<string> MyValue
    {
        get
        {
            if (_myValue == null || _myValue.IsFaulted)
            {
                _myValue = new BindableTask<string>(LoadDataAsync());
            }
            return _myValue;
        }
    }

    private async Task<string> LoadDataAsync()
    {
        if (_cachedValue != null)
        {
            return _cachedValue;
        }
        
        await Task.Delay(TimeSpan.FromSeconds(2));
        _cachedValue = "Cached data";
        return _cachedValue;
    }

    public event PropertyChangedEventHandler PropertyChanged;

    protected virtual void OnPropertyChanged([CallerMemberName] string propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}
```

# 七、常见问题

## 7.1 任务已完成时的处理

如果任务在创建 `BindableTask` 时已经完成，需要立即通知属性变化：

```C#
public BindableTask(Task<T> task)
{
    _task = task ?? throw new ArgumentNullException(nameof(task));
    
    if (task.IsCompleted)
    {
        // 立即通知，避免 UI 显示加载状态
        NotifyProperties();
    }
    else
    {
        _ = WatchTaskAsync();
    }
}
```

## 7.2 内存泄漏问题

确保在 ViewModel 销毁时取消未完成的任务：

```C#
public class MainViewModel : INotifyPropertyChanged, IDisposable
{
    private CancellationTokenSource _cancellationTokenSource;

    public void Dispose()
    {
        _cancellationTokenSource?.Cancel();
        _cancellationTokenSource?.Dispose();
    }
}
```

## 7.3 UI 线程访问

确保属性通知在 UI 线程上执行：

```C#
private async Task WatchTaskAsync()
{
    try
    {
        await _task.ConfigureAwait(false);
    }
    catch
    {
        // 异常处理
    }
    finally
    {
        // 确保在 UI 线程上通知属性变化
        Application.Current.Dispatcher.Invoke(() =>
        {
            NotifyProperties();
        });
    }
}
```

# 八、总结

通过使用 `BindableTask<T>` 类，我们可以：

1. ✅ **实现非阻塞数据加载**：UI 在数据加载过程中保持响应
2. ✅ **显示加载状态**：用户可以清楚地看到数据正在加载
3. ✅ **优雅的错误处理**：可以显示友好的错误消息
4. ✅ **提升用户体验**：界面不会冻结，交互更流畅

这种模式特别适合：
- 从 Web API 加载数据
- 数据库查询
- 文件 I/O 操作
- 任何耗时的异步操作

掌握异步绑定技术，可以让您的 WPF 应用更加响应和用户友好。

# 九、相关参考

- [C# 并发编程经典实例](https://www.oreilly.com/library/view/concurrency-in-c/9781449335935/)
- [WPF 数据绑定概述](https://learn.microsoft.com/zh-cn/dotnet/desktop/wpf/data/data-binding-overview)
- [异步编程模式](https://learn.microsoft.com/zh-cn/dotnet/standard/asynchronous-programming-patterns/)
- [INotifyPropertyChanged 接口](https://learn.microsoft.com/zh-cn/dotnet/api/system.componentmodel.inotifypropertychanged)
- [Task 和异步编程](https://learn.microsoft.com/zh-cn/dotnet/standard/parallel-programming/task-based-asynchronous-programming)

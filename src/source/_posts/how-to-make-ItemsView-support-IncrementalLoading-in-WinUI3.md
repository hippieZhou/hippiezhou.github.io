---
title: 如何在 WinUI3 中让 ItemsView 支持 IncrementalLoading
title_en: How to Make ItemsView Support IncrementalLoading in WinUI3
date: 2024-09-22 21:40:01
updated: 2024-09-22 21:40:01
tags: WinUI3
---

> 在 WinUI3 中新增的 **ItemsView** 控件本身不支持 `IncrementalLoading` 进行增量加载，这给需要处理大量数据的场景带来了挑战。本文通过实现一个自定义的 Behavior 方式来解决这个问题，让 ItemsView 能够像 ListView 一样支持增量加载，提升大数据量场景下的性能和用户体验。

# 一、问题背景

## 1.1 ItemsView 的限制

WinUI3 中的 `ItemsView` 控件是一个现代化的列表控件，相比传统的 `ListView` 和 `GridView`，它提供了更灵活的布局和更好的性能。然而，`ItemsView` 缺少一个重要的功能：**增量加载（IncrementalLoading）**。

**传统 ListView 的增量加载：**
```C#
// ListView 支持 ISupportIncrementalLoading
public class MyCollection : ObservableCollection<Item>, ISupportIncrementalLoading
{
    public bool HasMoreItems => /* 判断逻辑 */;
    public IAsyncOperation<LoadMoreItemsResult> LoadMoreItemsAsync(uint count) { /* ... */ }
}
```

**ItemsView 的问题：**
- ❌ 不支持 `ISupportIncrementalLoading` 接口
- ❌ 无法自动触发加载更多数据
- ❌ 需要手动实现滚动到底部检测逻辑

## 1.2 解决方案思路

通过实现一个自定义的 `Behavior`，监听 `ScrollViewer` 的滚动事件，当滚动接近底部时自动触发加载更多数据的命令。

# 二、核心接口和类型定义

## 2.1 IIncrementalSource 接口

首先定义增量数据源接口：

```C#
/// <summary>
/// 增量数据源接口
/// </summary>
public interface IIncrementalSource<T>
{
    /// <summary>
    /// 获取分页数据
    /// </summary>
    /// <param name="pageIndex">页码（从 0 开始）</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>当前页的数据</returns>
    Task<IEnumerable<T>> GetPagedItemsAsync(int pageIndex, int pageSize);
}
```

## 2.2 IncrementalLoadingCollection 实现

实现支持增量加载的集合类：

```C#
using CommunityToolkit.WinUI.Collections;
using System.Collections.ObjectModel;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.Foundation;
using Windows.Foundation.Collections;

/// <summary>
/// 增量加载集合
/// </summary>
public class IncrementalLoadingCollection<TSource, T> : ObservableCollection<T>, ISupportIncrementalLoading
    where TSource : IIncrementalSource<T>
{
    private readonly TSource _source;
    private int _currentPageIndex;
    private bool _hasMoreItems;
    private bool _isLoading;

    public IncrementalLoadingCollection(TSource source)
    {
        _source = source ?? throw new ArgumentNullException(nameof(source));
        _currentPageIndex = 0;
        _hasMoreItems = true;
        _isLoading = false;
    }

    public bool HasMoreItems => _hasMoreItems && !_isLoading;

    public bool IsLoading => _isLoading;

    public IAsyncOperation<LoadMoreItemsResult> LoadMoreItemsAsync(uint count)
    {
        return LoadMoreItemsAsyncInternal(count).AsAsyncOperation();
    }

    private async Task<LoadMoreItemsResult> LoadMoreItemsAsyncInternal(uint count)
    {
        if (_isLoading)
        {
            return new LoadMoreItemsResult { Count = 0 };
        }

        _isLoading = true;
        OnPropertyChanged(new System.ComponentModel.PropertyChangedEventArgs(nameof(IsLoading)));
        OnPropertyChanged(new System.ComponentModel.PropertyChangedEventArgs(nameof(HasMoreItems)));

        try
        {
            var items = await _source.GetPagedItemsAsync(_currentPageIndex, (int)count);
            var itemsList = items.ToList();

            if (itemsList.Count == 0)
            {
                _hasMoreItems = false;
            }
            else
            {
                foreach (var item in itemsList)
                {
                    Add(item);
                }
                _currentPageIndex++;
            }

            return new LoadMoreItemsResult { Count = (uint)itemsList.Count };
        }
        finally
        {
            _isLoading = false;
            OnPropertyChanged(new System.ComponentModel.PropertyChangedEventArgs(nameof(IsLoading)));
            OnPropertyChanged(new System.ComponentModel.PropertyChangedEventArgs(nameof(HasMoreItems)));
        }
    }
}
```

# 三、数据源实现

## 3.1 数据模型

```C#
public class Person
{
    public string Name { get; set; }
    public string Email { get; set; }
    public int Age { get; set; }
}
```

## 3.2 增量数据源实现

```C#
public class PeopleSource : IIncrementalSource<Person>
{
    private readonly List<Person> _people;

    public PeopleSource()
    {
        // 创建示例数据集合
        _people = new List<Person>();

        for (int i = 1; i <= 200; i++)
        {
            _people.Add(new Person
            {
                Name = $"Person {i}",
                Email = $"person{i}@example.com",
                Age = 20 + (i % 50)
            });
        }
    }

    public async Task<IEnumerable<Person>> GetPagedItemsAsync(int pageIndex, int pageSize)
    {
        // 根据页码和页大小获取数据
        var result = _people
            .Skip(pageIndex * pageSize)
            .Take(pageSize)
            .ToList();

        // 模拟网络请求延迟
        await Task.Delay(500);

        return result;
    }
}
```

**实际项目中的实现示例（调用 API）：**

```C#
public class ApiPeopleSource : IIncrementalSource<Person>
{
    private readonly IApiClient _apiClient;

    public ApiPeopleSource(IApiClient apiClient)
    {
        _apiClient = apiClient;
    }

    public async Task<IEnumerable<Person>> GetPagedItemsAsync(int pageIndex, int pageSize)
    {
        // 调用实际的 API
        var response = await _apiClient.GetPeopleAsync(pageIndex, pageSize);
        return response.Items;
    }
}
```

# 四、ViewModel 实现

```C#
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

public partial class MainViewModel : ObservableObject
{
    public IncrementalLoadingCollection<PeopleSource, Person> Items { get; private set; }

    public MainViewModel()
    {
        Items = new IncrementalLoadingCollection<PeopleSource, Person>(new PeopleSource());
    }

[RelayCommand]
    private async Task LoadMoreItemsAsync()
{
        if (Items != null && !Items.IsLoading && Items.HasMoreItems)
    {
        await Items.LoadMoreItemsAsync(10);
    }
}

[RelayCommand]
private void OnItemInvoked(ItemsViewItemInvokedEventArgs invokedItem)
{
        if (invokedItem.InvokedItem is Person selectedPerson)
        {
            // 处理项目点击事件
            System.Diagnostics.Debug.WriteLine($"Selected: {selectedPerson.Name}");
        }
    }
}
```

# 五、扩展方法：FindAscendant

`IncrementalLoadingBehavior` 中使用了 `FindAscendant` 扩展方法来查找父级 `ScrollViewer`，需要实现这个扩展方法：

```C#
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Media;

public static class VisualTreeHelperExtensions
{
    /// <summary>
    /// 向上查找指定类型的父元素
    /// </summary>
    public static T? FindAscendant<T>(this DependencyObject element) where T : DependencyObject
    {
        var parent = VisualTreeHelper.GetParent(element);
        
        while (parent != null)
        {
            if (parent is T result)
            {
                return result;
            }
            parent = VisualTreeHelper.GetParent(parent);
        }
        
        return null;
    }
}
```

# 六、IncrementalLoadingBehavior 的实现

```C#
using Microsoft.UI.Xaml;
using Microsoft.UI.Xaml.Controls;
using Microsoft.UI.Xaml.Input;
using Microsoft.Xaml.Interactivity;

public class IncrementalLoadingBehavior : Behavior<ItemsView>
{
    private ScrollViewer? _scrollViewer;

    public static readonly DependencyProperty LoadMoreItemsCommandProperty =
        DependencyProperty.Register(
            nameof(LoadMoreItemsCommand),
            typeof(ICommand),
            typeof(IncrementalLoadingBehavior),
            new PropertyMetadata(null));

    public ICommand LoadMoreItemsCommand
    {
        get => (ICommand)GetValue(LoadMoreItemsCommandProperty);
        set => SetValue(LoadMoreItemsCommandProperty, value);
    }

    /// <summary>
    /// 触发加载的阈值（距离底部的像素数）
    /// </summary>
    public double LoadThreshold { get; set; } = 100.0;

    protected override void OnAttached()
    {
        base.OnAttached();
        AssociatedObject.Loaded += OnLoaded;
    }

    protected override void OnDetaching()
    {
        base.OnDetaching();
        AssociatedObject.Loaded -= OnLoaded;
        
        if (_scrollViewer != null)
        {
            _scrollViewer.ViewChanged -= OnViewChanged;
        }
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
        // 查找 ItemsView 的父级 ScrollViewer
        _scrollViewer = AssociatedObject.FindAscendant<ScrollViewer>();
        
        if (_scrollViewer != null)
        {
            _scrollViewer.ViewChanged += OnViewChanged;
        }
    }

    private void OnViewChanged(object? sender, ScrollViewerViewChangedEventArgs e)
    {
        if (_scrollViewer == null || LoadMoreItemsCommand == null)
        {
            return;
        }

        // 检查是否接近底部
        var isNearBottom = _scrollViewer.VerticalOffset >= 
                          (_scrollViewer.ScrollableHeight - LoadThreshold);

        if (isNearBottom && LoadMoreItemsCommand.CanExecute(null))
        {
            LoadMoreItemsCommand.Execute(null);
        }
    }
}
```

# 七、XAML 集成

## 7.1 命名空间引用

```XAML
<Page
    x:Class="YourApp.MainPage"
    xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
    xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
    xmlns:i="using:Microsoft.Xaml.Interactivity"
    xmlns:ic="using:Microsoft.Xaml.Interactions.Core"
    xmlns:helpers="using:YourApp.Behaviors"
    xmlns:local="using:YourApp.Models">
```

## 7.2 ItemsView 配置

```XAML
<ScrollViewer 
    VerticalScrollBarVisibility="Auto" 
    VerticalScrollMode="Auto"
    ZoomMode="Disabled">
    <ItemsView
        IsItemInvokedEnabled="True"
        ItemsSource="{x:Bind ViewModel.Items}"
        SelectionMode="None">
        
        <i:Interaction.Behaviors>
            <!-- 增量加载 Behavior -->
            <helpers:IncrementalLoadingBehavior 
                LoadMoreItemsCommand="{x:Bind ViewModel.LoadMoreItemsCommand}"
                LoadThreshold="100" />
            
            <!-- 项目点击事件 -->
            <ic:EventTriggerBehavior EventName="ItemInvoked">
                <ic:InvokeCommandAction 
                    Command="{x:Bind ViewModel.ItemInvokedCommand}"
                    PassEventArgsToCommand="True" />
            </ic:EventTriggerBehavior>
        </i:Interaction.Behaviors>
        
        <ItemsView.ItemTemplate>
        	<DataTemplate x:DataType="local:Person">
                <ItemContainer>
                    <Border 
                        Background="{ThemeResource CardBackgroundFillColorDefaultBrush}"
                        CornerRadius="8"
                        Padding="12"
                        Margin="4">
                        <StackPanel Spacing="8">
                            <TextBlock 
                                Text="{x:Bind Name}" 
                                Style="{StaticResource TitleTextBlockStyle}" />
                            <TextBlock 
                                Text="{x:Bind Email}" 
                                Style="{StaticResource BodyTextBlockStyle}"
                                Foreground="{ThemeResource TextFillColorSecondaryBrush}" />
                            <TextBlock 
                                Text="{x:Bind Age}" 
                                Style="{StaticResource CaptionTextBlockStyle}" />
                        </StackPanel>
                    </Border>
                </ItemContainer>
            </DataTemplate>
        </ItemsView.ItemTemplate>
    </ItemsView>
</ScrollViewer>
```

# 八、使用注意事项

## 8.1 性能优化

1. **合理设置页大小**：根据数据项的大小和网络速度，选择合适的页大小（通常 10-50 项）
2. **防抖处理**：避免快速滚动时频繁触发加载，可以在 Behavior 中添加防抖逻辑
3. **加载状态提示**：显示加载指示器，提升用户体验

## 8.2 错误处理

```C#
public async Task<IEnumerable<Person>> GetPagedItemsAsync(int pageIndex, int pageSize)
{
    try
    {
        var response = await _apiClient.GetPeopleAsync(pageIndex, pageSize);
        return response.Items;
    }
    catch (Exception ex)
    {
        // 记录错误并返回空集合
        System.Diagnostics.Debug.WriteLine($"Error loading page {pageIndex}: {ex.Message}");
        return Enumerable.Empty<Person>();
    }
}
```

## 8.3 加载状态管理

在 ViewModel 中添加加载状态属性：

```C#
public partial class MainViewModel : ObservableObject
{
    [ObservableProperty]
    private bool _isLoadingMore;

    [RelayCommand]
    private async Task LoadMoreItemsAsync()
    {
        if (Items == null || Items.IsLoading || !Items.HasMoreItems)
        {
            return;
        }

        IsLoadingMore = true;
        try
        {
            await Items.LoadMoreItemsAsync(10);
        }
        finally
        {
            IsLoadingMore = false;
        }
    }
}
```

在 XAML 中显示加载状态：

```XAML
<StackPanel>
    <ItemsView ... />
    <ProgressRing 
        IsActive="{x:Bind ViewModel.IsLoadingMore}"
        Visibility="{x:Bind ViewModel.IsLoadingMore, Mode=OneWay}"
        Height="40"
        Width="40"
        Margin="12" />
</StackPanel>
```

# 九、完整示例项目结构

```
YourApp/
├── Models/
│   └── Person.cs
├── Services/
│   └── IIncrementalSource.cs
│   └── PeopleSource.cs
├── Collections/
│   └── IncrementalLoadingCollection.cs
├── Behaviors/
│   └── IncrementalLoadingBehavior.cs
├── Extensions/
│   └── VisualTreeHelperExtensions.cs
├── ViewModels/
│   └── MainViewModel.cs
└── Views/
    └── MainPage.xaml
```

# 十、总结

通过实现自定义的 `IncrementalLoadingBehavior`，我们成功让 `ItemsView` 支持了增量加载功能。这种方案具有以下优点：

- ✅ **解耦设计**：通过 Behavior 模式，将增量加载逻辑与 UI 分离
- ✅ **可复用性**：Behavior 可以在多个 ItemsView 中复用
- ✅ **灵活性**：可以自定义加载阈值和触发条件
- ✅ **性能优化**：避免一次性加载大量数据，提升应用性能

**关键要点：**
1. 实现 `IIncrementalSource<T>` 接口提供分页数据
2. 使用 `IncrementalLoadingCollection` 管理增量加载状态
3. 通过 `Behavior` 监听滚动事件并触发加载命令
4. 合理设置加载阈值和页大小，平衡性能和用户体验

# 相关参考

- [ItemsView Class - Microsoft Docs](https://learn.microsoft.com/en-us/windows/windows-app-sdk/api/winrt/microsoft.ui.xaml.controls.itemsview)
- [ISupportIncrementalLoading Interface - Microsoft Docs](https://learn.microsoft.com/en-us/uwp/api/windows.ui.xaml.data.isupportincrementalloading)
- [Behavior Class - Microsoft Docs](https://learn.microsoft.com/en-us/windows/communitytoolkit/behaviors/)
- [CommunityToolkit.WinUI Collections](https://github.com/CommunityToolkit/WindowsCommunityToolkit)

---
title: How to Make ItemsView Support IncrementalLoading in WinUI3
date: 2024-09-22 21:40:01
updated: 2024-09-22 21:40:01
tags: WinUI3
---

> 在 WinUI3 中新增的 **ItemsView** 控件本身不支持 `IncrementalLoading` 进行增量加载，本文通过实现一个自定义的 Behavior 方式来解决这个问题。

# ItemSource 的定义

```C#
public class Person
{
    public string Name { get; set; }
}

public class PeopleSource : IIncrementalSource<Person>
{
    private readonly List<Person> people;

    public PeopleSource()
    {
        // Creates an example collection.
        people = new List<Person>();

        for (int i = 1; i <= 200; i++)
        {
            var p = new Person { Name = "Person " + i };
            people.Add(p);
        }
    }

    public async Task<IEnumerable<Person>> GetPagedItemsAsync(int pageIndex, int pageSize)
    {
        // Gets items from the collection according to pageIndex and pageSize parameters.
        var result = (from p in people select p).Skip(pageIndex * pageSize).Take(pageSize);

        // Simulates a longer request...
        await Task.Delay(1000);

        return result;
    }
}


// ViewModel.cs
public Items { get; private set; } = new IncrementalLoadingCollection<PeopleSource, Person>();

[RelayCommand]
private async Task OnLoadMoreItemsAsync()
{
    if (Items != null && Items.IsLoading == false)
    {
        await Items.LoadMoreItemsAsync(10);
    }
}

[RelayCommand]
private void OnItemInvoked(ItemsViewItemInvokedEventArgs invokedItem)
{
    var selected = invokedItem.InvokedItem as Person;
}
```

# IncrementalLoadingBehavior 的实现

```C#
public class IncrementalLoadingBehavior : Behavior<ItemsView>
{
    private ScrollViewer? scrollViewer;

    public static readonly DependencyProperty LoadMoreItemsCommandProperty =
     DependencyProperty.Register(nameof(LoadMoreItemsCommand), typeof(ICommand), typeof(IncrementalLoadingBehavior), new PropertyMetadata(null));

    public ICommand LoadMoreItemsCommand
    {
        get => (ICommand)GetValue(LoadMoreItemsCommandProperty);
        set => SetValue(LoadMoreItemsCommandProperty, value);
    }

    protected override void OnAttached()
    {
        base.OnAttached();
        AssociatedObject.Loaded += OnLoaded;
    }

    protected override void OnDetaching()
    {
        base.OnDetaching();
        AssociatedObject.Loaded -= OnLoaded;
        if (scrollViewer != null)
        {
            scrollViewer.ViewChanged -= OnViewChanged;
        }
    }

    private void OnLoaded(object sender, RoutedEventArgs e)
    {
         scrollViewer = AssociatedObject.FindAscendant<ScrollViewer>();
        if (scrollViewer != null)
        {
            scrollViewer.ViewChanged += OnViewChanged;
        }
    }

    private void OnViewChanged(object? sender, ScrollViewerViewChangedEventArgs e)
    {
        if (scrollViewer != null &&
                scrollViewer.VerticalOffset >= scrollViewer.ScrollableHeight - 100)
        {
            LoadMoreItemsCommand?.Execute(null);
        }
    }
}
```

# ItemsView 的集成

```XAML
<ScrollViewer VerticalScrollBarVisibility="Auto" VerticalScrollMode="Auto">
    <ItemsView
        IsItemInvokedEnabled="True"
        ItemsSource="{x:Bind ViewModel.Items}"
        SelectionMode="None">
        <i:Interaction.Behaviors>
            <helpers:IncrementalLoadingBehavior LoadMoreItemsCommand="{x:Bind ViewModel.LoadMoreItemsCommand}" />
            <ic:EventTriggerBehavior EventName="ItemInvoked">
                <ic:InvokeCommandAction Command="{x:Bind ViewModel.ItemInvokedCommand}" />
            </ic:EventTriggerBehavior>
        </i:Interaction.Behaviors>
        <ItemsView.ItemTemplate>
        	<DataTemplate x:DataType="local:Person">
                <ItemContainer>
                    <UserControl>
                        ......
                    </UserControl>
                </ItemContainer>
            </DataTemplate>
        </ItemsView.ItemTemplate>
    </ItemsView>
</ScrollViewer>
```

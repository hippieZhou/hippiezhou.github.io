---
title: WPF 样式深入解析：从基础到高级应用
title_en: "Deep Dive into WPF Styles: From Basics to Advanced Applications"
date: 2017-09-02 21:31:00
updated: 2017-09-02 21:31:00
tags: WPF, XAML, .NET
---

> WPF 中的样式（Style）是一种强大的机制，允许您定义控件的属性值并在多个控件之间共享。本文深入解析 WPF 样式系统，从基础用法到高级特性，包括样式定义、触发器、隐式样式、样式合并、主题样式以及换肤实现等核心概念和最佳实践。

# 一、样式基础

## 1.1 什么是样式（Style）

WPF 中的样式（Style）是一种强大的机制，允许您定义控件的属性值并在多个控件之间共享。Style 作为属性、资源和事件的批处理，提供了一种便捷的方式来对控件进行快速设置。

### 使用样式的好处

- ✅ **统一风格**：将控件的通用设置抽取为 Style，使控件具有统一的风格
- ✅ **易于维护**：修改 Style 中的属性值可以方便地作用在所有应用该 Style 的控件上
- ✅ **灵活切换**：可以为同一类型控件定义多个 Style，通过替换 Style 来方便地更改控件的样式

## 1.2 基本示例

```XAML
<Window x:Class="WpfApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="MainWindow" Height="450" Width="800">
    <Grid>
        <Grid.Resources>
            <!-- 定义样式 -->
            <Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
                <Setter Property="Height" Value="30"/>
                <Setter Property="Width" Value="100"/>
                <Setter Property="Margin" Value="5"/>
            </Style>
        </Grid.Resources>
        
        <!-- 应用样式 -->
        <Button Content="按钮1" Style="{StaticResource ButtonStyle}"/>
        <Button Content="按钮2" Style="{StaticResource ButtonStyle}"/>
    </Grid>
</Window>
```

## 1.3 Style 的元素组成

一个完整的 Style 可以包含以下元素：

- **Setter**：设置属性的值
- **EventSetter**：设置事件处理器
- **Trigger**：基于条件改变属性值
- **Resources**：样式内部的资源字典

### 示例：包含所有元素的样式

```XAML
<Window x:Class="WpfApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="MainWindow" Height="450" Width="800">
    <Window.Resources>
        <Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
            <!-- 样式内部资源 -->
            <Style.Resources>
                <SolidColorBrush x:Key="brush" Color="Yellow"/>
            </Style.Resources>
            
            <!-- Setter：设置属性值 -->
            <Setter Property="Height" Value="30"/>
            <Setter Property="Width" Value="100"/>
            
            <!-- EventSetter：设置事件处理器 -->
            <EventSetter Event="Loaded" Handler="Button_Loaded"/>
        </Style>
    </Window.Resources>
    
    <Grid>
        <Button x:Name="button1" 
                Style="{StaticResource ButtonStyle}" 
                Background="{DynamicResource brush}"/>
        <Button x:Name="button2" 
                Style="{StaticResource ButtonStyle}" 
                Background="{DynamicResource brush}"/>
    </Grid>
</Window>
```

**后台代码**：

```C#
using System.Windows;
using System.Windows.Controls;

namespace WpfApp
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }

        private void Button_Loaded(object sender, RoutedEventArgs e)
        {
            if (sender is Button button)
            {
                MessageBox.Show($"{button.Name} Loaded");
            }
        }
    }
}
```

## 1.4 触发器（Trigger）

触发器允许您根据条件动态改变控件的属性值。WPF 定义了五种类型的触发器：

### 1.4.1 Trigger

以控件的属性作为触发条件：

```XAML
<Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
    <Setter Property="Width" Value="60"/>
    <Setter Property="Height" Value="30"/>
    
    <Style.Triggers>
        <!-- 鼠标悬停时改变宽度 -->
        <Trigger Property="IsMouseOver" Value="True">
            <Setter Property="Width" Value="80"/>
            <Setter Property="Background" Value="LightBlue"/>
        </Trigger>
        
        <!-- 按钮被按下时改变背景 -->
        <Trigger Property="IsPressed" Value="True">
            <Setter Property="Background" Value="DarkBlue"/>
        </Trigger>
    </Style.Triggers>
</Style>
```

### 1.4.2 DataTrigger

以控件 `DataContext` 的属性作为触发条件：

```XAML
<Style TargetType="{x:Type Button}" x:Key="DataTriggerStyle">
    <Style.Triggers>
        <DataTrigger Binding="{Binding IsEnabled}" Value="False">
            <Setter Property="Opacity" Value="0.5"/>
        </DataTrigger>
    </Style.Triggers>
</Style>
```

### 1.4.3 MultiTrigger

以控件的多个属性作为触发条件（所有条件都满足时才触发）：

```XAML
<Style TargetType="{x:Type Button}" x:Key="MultiTriggerStyle">
    <Style.Triggers>
        <MultiTrigger>
            <MultiTrigger.Conditions>
                <Condition Property="IsMouseOver" Value="True"/>
                <Condition Property="IsEnabled" Value="True"/>
            </MultiTrigger.Conditions>
            <Setter Property="Background" Value="LightGreen"/>
        </MultiTrigger>
    </Style.Triggers>
</Style>
```

### 1.4.4 MultiDataTrigger

以控件 `DataContext` 的多个属性作为触发条件：

```XAML
<Style TargetType="{x:Type Button}" x:Key="MultiDataTriggerStyle">
    <Style.Triggers>
        <MultiDataTrigger>
            <MultiDataTrigger.Conditions>
                <Condition Binding="{Binding IsActive}" Value="True"/>
                <Condition Binding="{Binding IsVisible}" Value="True"/>
            </MultiDataTrigger.Conditions>
            <Setter Property="Background" Value="Green"/>
        </MultiDataTrigger>
    </Style.Triggers>
</Style>
```

### 1.4.5 EventTrigger

以路由事件（RoutedEvent）作为触发条件，通常用于动画：

```XAML
<Style TargetType="{x:Type Button}" x:Key="EventTriggerStyle">
    <Style.Triggers>
        <EventTrigger RoutedEvent="MouseEnter">
            <BeginStoryboard>
                <Storyboard>
                    <DoubleAnimation Storyboard.TargetProperty="Opacity"
                                     From="1.0" To="0.5" Duration="0:0:0.3"/>
                </Storyboard>
            </BeginStoryboard>
        </EventTrigger>
        <EventTrigger RoutedEvent="MouseLeave">
            <BeginStoryboard>
                <Storyboard>
                    <DoubleAnimation Storyboard.TargetProperty="Opacity"
                                     From="0.5" To="1.0" Duration="0:0:0.3"/>
                </Storyboard>
            </BeginStoryboard>
        </EventTrigger>
    </Style.Triggers>
</Style>
```

### 触发器类型对比

| 触发器类型 | 触发条件 | 使用场景 |
|----------|---------|---------|
| **Trigger** | 控件属性 | 鼠标悬停、按钮状态等 UI 交互 |
| **DataTrigger** | DataContext 属性 | 数据绑定状态变化 |
| **MultiTrigger** | 多个控件属性 | 需要多个条件同时满足 |
| **MultiDataTrigger** | 多个 DataContext 属性 | 数据绑定的复杂条件判断 |
| **EventTrigger** | 路由事件 | 动画效果、事件响应 |

## 1.5 隐式样式（Implicit Style）

前面的例子中，都是使用 `StaticResource` 或 `DynamicResource` 来显式设置 Style。为了使用方便，WPF 提供了隐式样式（Implicit Style）机制，允许自动将样式应用到指定类型的所有控件。

### 1.5.1 隐式样式定义

隐式样式与显式样式的区别在于**不指定 `x:Key`**：

```XAML
<Window x:Class="WpfApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="MainWindow" Height="450" Width="800">
    <Grid>
        <Grid.Resources>
            <!-- 隐式样式：没有 x:Key，只有 TargetType -->
            <Style TargetType="{x:Type Button}">
                <Setter Property="Height" Value="30"/>
                <Setter Property="Width" Value="100"/>
                <Setter Property="Margin" Value="5"/>
                <Setter Property="Background" Value="LightBlue"/>
            </Style>
        </Grid.Resources>
        
        <!-- 这些 Button 会自动应用上面的隐式样式 -->
        <Button Content="按钮1"/>
        <Button Content="按钮2"/>
        <Button Content="按钮3"/>
        
        <!-- 如果显式设置了 Style，隐式样式不会生效 -->
        <Button Content="按钮4" Style="{x:Null}"/>
    </Grid>
</Window>
```

### 1.5.2 隐式样式的工作原理

- ✅ **自动应用**：隐式样式会自动应用到指定类型的所有控件
- ✅ **无需手动指定**：不需要在每个控件上使用 `Style="{StaticResource ...}"`
- ⚠️ **优先级**：如果控件显式设置了 `Style` 属性（即使是 `{x:Null}`），隐式样式不会生效
- ⚠️ **作用域**：隐式样式遵循资源查找的**就近原则**，子元素优先使用最近的资源字典中的样式

### 1.5.3 StaticResource vs DynamicResource

```XAML
<!-- StaticResource：静态资源，编译时解析 -->
<Button Style="{StaticResource ButtonStyle}"/>

<!-- DynamicResource：动态资源，运行时解析，支持资源替换 -->
<Button Style="{DynamicResource ButtonStyle}"/>
```

**区别**：
- **StaticResource**：性能更好，但资源必须在编译时存在
- **DynamicResource**：支持运行时替换资源，适合换肤场景

# 二、样式系统深入解析

Style 是一个优秀的概念，作为 Presentation 框架，将 UI 对象的结构、样式和行为分离是一种很好的设计。Style 比较容易上手，但实际使用中也会遇到一些问题。要理解这些问题，需要深入了解 Style 的本质和实现机制。

从概念上讲，Style 类似于一个 `Dictionary<string, object>`，预存了属性的名字和预设值，然后作用到 UI 对象上。WPF 在 Style 的设计上围绕几个关键技术加入了很多功能，下面详细介绍：

## 2.1 样式与依赖属性（Dependency Property）

**依赖属性（Dependency Property，简称 DP）**是 WPF 的核心，Style 就是基于依赖属性的。

### 关键要点

- ✅ **Style 只能设置依赖属性**：Style 中的 `Setter` 只能作用于依赖属性，不能设置普通的 CLR 属性
- ✅ **属性值优先级**：依赖属性设计的精髓在于将字段的存取和对象（DependencyObject）剥离开，一个属性值内部用多个字段来存储，根据取值条件的优先级来决定当前属性应该取哪个字段
- ⚠️ **CLR 属性限制**：如果你在控件中定义了一个 CLR 属性，Style 是无法设置的

### 依赖属性值优先级

依赖属性取值条件的优先级（从低到高）：

```C#
public enum BaseValueSource
{
    Unknown,              // 未知来源
    Default,              // 默认值
    Inherited,            // 继承值
    DefaultStyle,         // 默认样式（ThemeStyle）
    DefaultStyleTrigger,   // 默认样式触发器
    Style,                // 显式样式
    TemplateTrigger,      // 模板触发器
    StyleTrigger,         // 样式触发器
    ImplicitStyleReference, // 隐式样式引用
    ParentTemplate,       // 父模板
    ParentTemplateTrigger, // 父模板触发器
    Local                 // 本地值（最高优先级）
}
```

### 优先级示例

```XAML
<Window x:Class="WpfApp.MainWindow"
        xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="MainWindow" Height="450" Width="800">
    <Window.Resources>
        <Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
            <!-- Style 优先级：设置 Width=60 -->
            <Setter Property="Width" Value="60"/>
            
            <Style.Triggers>
                <!-- StyleTrigger 优先级：鼠标悬停时 Width=80 -->
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter Property="Width" Value="80"/>
                </Trigger>
            </Style.Triggers>
        </Style>
    </Window.Resources>
    
    <Grid>
        <!-- Local 优先级（最高）：Width=20 会覆盖 Style 和 StyleTrigger -->
        <Button x:Name="button1" 
                Style="{StaticResource ButtonStyle}" 
                Width="20"/>
    </Grid>
</Window>
```

**说明**：
- 第 4 行：Style 优先级设置 `Width=60`
- 第 7 行：StyleTrigger 优先级，当 `IsMouseOver=True` 时设置 `Width=80`
- 第 15 行：Local 优先级设置 `Width=20`（最高优先级）

由于 Local 优先级最高，即使鼠标移到 Button 上，StyleTrigger 也不会生效。如果移除第 15 行的 `Width="20"`，那么鼠标悬停时 Width 会变为 80，移开后恢复为 60。

## 2.2 Style & FrameworkElement

Style作为一个属性定义在FrameworkElement上，所有继承自FrameworkElement的控件都可以使用Style。FrameworkElement定义了多个Style：Style，ThemeStyle，FocusVisualStyle：

> FocusVisualStyle：是当控件获得键盘焦点时，显示在外面的一个虚线框，这个Style并没有直接作用在对应的FrameworkElement上，而是当控件获得键盘焦点时使用AdornLayer创建了一个新的Control，然后再这个Control上使用FocusVisualStyle，再把它遮盖在对应的FrameworkElement上形成一个虚线框的效果。
>
> Style：就是我们前面一直设置的Style。

ThemeStyle：这里引入了一个Theme的概念，具体来谈一下它。为了更好的切换主题，WPF引入了ThemeStyle这个概念。当我们使用VS2010的模板生成一个自定义控件（Custom Control）后，会自动添加一个Themes的文件夹以及一个Generic.xaml的文件。

WPF默认提供了很多控件，Button，ListBox，TabControl等等，我们使用这些控件时，是没有指定它的样式（Style）的，WPF为我们提供了默认Style，这个默认Style是与Windows主题相关的。比如我们切换Windows的主题从Aero到Classic，WPF窗口里的控件外观也会发生变化。这些默认的Style是以ResourceDictionary的形式保存在PresentationFramework.Aero.dll，PresentationFramework.Classic.dll等dll中的，这里的命名规则是：程序集名称+Theme名称+.dll。

那么WPF又是如何根据Windows的Theme找到对应的ThemeStyle呢？WPF提出了ThemeInfo这个Attribute来指定Theme信息。ThemeInfo一般定义在Properties/AssemblyInfo.cs中。

```C#
[assembly: ThemeInfo(
      ResourceDictionaryLocation.SourceAssembly,
      ResourceDictionaryLocation.SourceAssembly)
)]
```

ThemeInfo有两个参数，第一个参数指的是ThemeResource，第二个参数指的是GenericResource，它们的类型是ResourceDictionaryLocation：

```C#
public enum ResourceDictionaryLocation
{
    None = 0,
    SourceAssembly = 1,
    ExternalAssembly = 2,
}
```

ResourceDictionaryLocation的None指不存在对应的Resource，SourceAssembly指该程序集（Assembly）中存在对应的Resource，ExternalAssembly指对应的Resource保存在外部的程序集（Assembly）中，这个外部程序集的查找规则就是我们前面看到的：程序集名称+Theme名称+.dll。

对于一个控件，无论是系统自带的控件还是我们自定义的控件，WPF启动时都会通过当前Windows系统的Theme查找它对应的ThemeStyle。这个查找规则是：

> 先通过控件的类型（Type）找到它对应的程序集（Assembly），然后获取程序集中的ThemeInfo，看看它的ThemeResource和GenericResource在哪里。如果ThemeResource的值不是None，系统会读取到ThemeResource对应的ResourceDictionary，在这个ResourceDictionary中查找是否定义了TargetType={x:Type 控件类型}，如果有，把控件的ThemeStyle指定为这个Style。
>
> 如果第一步的查找失败，那么GenericResource派上用场，Generic这个词表示一般。WPF会查看ThemeInfo的第二个参数GenericResource来查找它的ThemeStyle，查找规则同第一步，如果查找成功，把这个Style指定为控件的ThemeStyle。

任意一个控件，如果不显式指定它的Style，并且查不到默认的ThemeStyle，这个控件是没有外观的。为了编程方便，当我们使用VS添加自定义控件时，VS默认帮我们生成了Generic.xaml，如果我们希望自定义的控件也要支持系统的Theme变化，可以在Themes这个文件夹下加入对应的ResourceDictionary，比如上面的Aero.NormalColor.xaml，并且指定程序集ThemeInfo的第一个参数为SourceAssembly，表明该程序集支持系统Theme变化并且对应的资源文件在该程序集中。当然，ResourceDictionary一定要放在Themes文件夹下，因为WPF查找ResourceDictionary时使用的是类似：

```C#
string relativePackUriForResources = "/" +
        themeAssemblyName.FullName +
        ";component/themes/" +
        themeName + "." +
        colorScheme + ".xaml";
```

## 2.3 Style & ResourceDictionary

前面提到了很多次ResourceDictionary，关于WPF的Resource系统，以后再来细谈。WPF的Resource系统使用ResourceDictionary来储存Resource，ResourceDictionary，顾名思义，也是一个Dictionary，既然是Dictionary，就是按键/值对来存储的。我们最前面在Window的Resource中创建Style时，指定了Style对应的键值（x:Key），后面又用StaticResource来引用这个键值。

如果在ResourceDictionary中添加一个对象Button，不指定它的键值（x:Key），是不能通过编译的。我们前面介绍的隐式（Implicit）Style，只指定了一个TargetType={x:Type  类型}，并没有指定键值，为什么它可以通过编译呢？

对于在ResourceDictionary中添加Style，如果我们没有指定键值（x:Key），WPF会默认帮我们生成键值，这个键值不是一个String，而是一个类型object（具体来说是Type实例），也就是说相当于：

```XAML
<Style TargetType="{x:Type Button}" x:Key="{x:Type Button}">
```

Appliation以及FrameworkElement类都定义了Resources属性，内部都持有一个ResourceDictionary，Resource查找遵循的最基本原则是就近原则，如：

```XAML
<Window>
    <Window.Resources>
        <Style TargetType="{x:Type Button}">
            <Setter Property="Background" Value="Yellow"/>
        </Style>
        <Style TargetType="{x:Type ToggleButton}" x:Key="toggleBtnStyle">
            <Setter Property="Background" Value="Red"/>
        </Style>
    </Window.Resources>
    <StackPanel>
        <StackPanel.Resources>
            <Style TargetType="{x:Type Button}">
                <Setter Property="Background" Value="Blue"/>
            </Style>
            <Style TargetType="{x:Type ToggleButton}" x:Key="toggleBtnStyle">
                <Setter Property="Background" Value="Green"/>
            </Style>
        </StackPanel.Resources>
        <ToggleButton Width="80" Height="20" Style="{DynamicResource toggleBtnStyle}"/>
        <Button Width="80" Height="20"  Content="button2" Click="Button_Click"/>
    </StackPanel>
</Window>
```

Window和StackPanel的Resources中都分别定义了toggleBtnStyle以及隐式Style（Button），根据就近原则，StackPanel内部的ToggleButton和Button会应用StackPanel的Resource而不会使用Window的。

# 三、Style Merge

这里要提到本篇的重点也是不被人注意却经常出错的地方，Style的合并（Merge）。

前面提到了很多Style，ThemeStyle，Style，隐式Style。我们提过，Style相当于一个属性值的批处理，那么对于一个属性，只能有一个预设值而不能多个，这些Style在运行时要进行合并，然后作用在FrameworkElement上。

Style的合并，要分两步进行：

> 找到所有Style。
>
> 确定Style的优先级，根据优先级来合并Style。

以Button来说：

> 如果当前Windows的Theme是Aero，启动后会从PresentationFramework.Aero.dll中找到对应的ThemeStyle。
>
> 如果在Button上使用StaticResource或者DynamicResource指定了Style，会通过键值在Resource系统中找到对应的Style。
>
> 如果没有在Button上显式指定Style，会通过Resource系统查找隐式Style（x:Type Button）。
>
> 第二步和第三步是排他的，这两步只能确定一个Style，然后把这个Style和ThemeStyle进行合并（Merge）得到Button最终的效果。

先从合并来说，显式或者隐式Style的优先级是高于ThemeStyle的，如果Style和ThemeStyle的Setter中都对同一属性进行了预设，那么会取Style里面的Setter而忽略ThemeStyle。这里比较特殊的是EventSetter，EventSetter使用的是RoutedEvent，如果两个Style的EventSetter对同一个RoutedEvent进行了设置，两个都会注册到RoutedEvent上。

前面看到，显式和隐式Style是排他的，两者只能取一，在实际项目中，在全局定义好Button的基本样式，然后具体使用上再根据基本样式做一些特殊处理，这种需求是很常见的。为了解决这种需求，Style提出了BasedOn属性，来表示继承关系，如：

```XAML
<Window>
    <Window.Resources>
        <Style TargetType="{x:Type Button}">
            <Setter Property="Width" Value="80"/>
            <Setter Property="Height" Value="20"/>
            <EventSetter Event="Click" Handler="btnBase_Click"/>
        </Style>
        <Style TargetType="{x:Type ButtonBase}" x:Key="toggleBtnStyle">
            <Setter Property="Width" Value="80"/>
            <Setter Property="Height" Value="20"/>
            <Setter Property="Background" Value="Red"/>
        </Style>
    </Window.Resources>
    <StackPanel>
        <StackPanel.Resources>
            <Style TargetType="{x:Type Button}" BasedOn="{StaticResource {x:Type Button}}">
                <Setter Property="Background" Value="Blue"/>
                <EventSetter Event="Click" Handler="btn_Click"/>
            </Style>
            <Style TargetType="{x:Type ToggleButton}" x:Key="toggleBtnStyle" BasedOn="{StaticResource toggleBtnStyle}">
                <Setter Property="Background" Value="Green"/>
            </Style>
        </StackPanel.Resources>
        <ToggleButton Style="{DynamicResource toggleBtnStyle}"/>
        <Button Content="button2"/>
    </StackPanel>
</Window>
```

为了更清晰的解释，给出了一个不太常见的例子。第16行创建了一个隐式Style（Button），它的BasedOn属性仍然是隐式Style（Button），Resource系统会向上查找找到Window的Resorces中的隐式Style（Button），然后把两者合并。对于同一个ResourceDictionary，是不允许有重复键值的，StackPanel和Window各有各自的ResourceDictionary，他们的键值不受干扰，查找时会通过就近原则来找到优先级最高的Resource。第20行ToggleButton的例子和Button是一样的，只是它查找到的第8行toggleBtnStyle的TargetStyle是ButtonBase，ButtonBase是ToggleButton的基类，BasedOn属性也可以作用。

WPF的Style机制是一个密封（Seal）机制，它的书写方式很灵活，可以支持合并等，当最后合并后，Style就被密封（Seal），内部的Setter等不允许再被修改。这种密封的设计有它的道理，但在Style的动态性上就稍显不足。

以自定义控件为例，自定义一个Button，名字叫MyButton，它继承自Button，在自定义控件中，经常可以看到这样的代码：

```C#
static MyButton()
{
    DefaultStyleKeyProperty.OverrideMetadata(typeof(MyButton), new FrameworkPropertyMetadata(typeof(MyButton)));
}
```

这里出现了DefaultStyle，这个是WPF对ThemeStyle的另一个说法，ThemeStyle就是用来确定默认的Style的，后来包括BaseValueSource中也使用了DefaultStyle来表示ThemeStyle。在MyButton的静态函数中重载DefaultStyleKeyProperty内部Metadata的含义是告诉WPF系统，查找MyButton的ThemeStyle使用的键值从{x:Type Button}被改成了{x:Type MyButton}。

如果像上述代码一样修改了DefaultStyleKeyProperty，那么需要我们在Themes/Generic.xaml中定义好MyButton的默认（Theme）Style，否则MyButton是没有外观的，因为查找ThemeStyle的键值已经被修改，PresentationFramework.Aero.dll等dll中是没有定义{x:Type MyButton}的。

前面是关于ThemeStyle的用法，那么回到隐式Style上来，如果我们在Application的Resources中定义了Button的隐式Style（TargetType={x:Type Button}），即使没有显式设置MyButton的Style，所有的MyButton控件也不会使用这个隐式Style的。需要你在Application的Resources中，在定义Button隐式Style的下面定义

```XAML
<Style TargetType="{x:Type local:MyButton}" BasedOn="{StaticResource {x:Type Button}}"/>
```

这里就回到Style的合并（Merge）上来了，Style的Merge是很基本（很傻）的合并（Merge），它不具备Auto性。具体来说，就是：

> 基类控件的隐式Style不会作用到派生类控件上。
>
> 像前面在Window和StackPanel中分别定义了隐式Style（Button），这两个隐式Style不会智能合并后再作用到Button上，而是通过就近原则只选其一。
>
> Style的BasedOn属性只支持StaticResource方式引用，因为Style继承自DispatcherObject而不是DependencyObject，DynamicResource只支持DP。

这些问题都需要通过Style的BasedOn来解决，因为BasedOn用的是静态引用（StaticResource），当隐式Style发生变化时就有麻烦了。

# 四、换肤

UI程序的换肤是很炫的玩意，换肤分两种：1，更换整个控件的Style；2，更换Style中的颜色画刷（Brush）。后者的实现很简单，定义好颜色画刷的资源文件（ResourceDictionary），使用画刷的时候使用DynamicResource绑定，换肤的时候替换画刷的资源文件就可以了。

很多公司都有自己皮肤库，这些皮肤库一般都是隐式的Style，定义了所有控件的隐式Style，使用时把这个皮肤资源Merge到Application的Resources中。换肤时把旧的皮肤资源从Application的Resources中删除，替换成新的皮肤资源ResourceDictionary。

这种做法很好理解，但是碰到 Style 的 `BasedOn` 属性就不起作用了。`BasedOn` 属性使用 `StaticResource`，是静态的一次性的。新的皮肤库被添加到 Application 资源文件后，如果在 Application 的资源文件中已经定义过 `<Style TargetType="{x:Type Button}" BasedOn="{StaticResource {x:Type Button}}"/>` 这样隐式的 Style，控件是不会更新皮肤的。如果有这方面的需求，需要手动合并（Merge）Style 来解决问题，类似：

```C#
public static void Merge(this Style style, Style otherStyle)
{
    foreach (SetterBase currentSetter in otherStyle.Setters)
    {
        style.Setters.Add(currentSetter);
    }
    foreach (TriggerBase currentTrigger in otherStyle.Triggers)
    {
        style.Triggers.Add(currentTrigger);
    }
    foreach (object key in otherStyle.Resources.Keys)
    {
        style.Resources[key] = otherStyle.Resources[key];
    }
}
```

这里还需要加上一些条件判断，以及决定是否要递归合并otherStyle的BasedOn，回到前面，程序需要使用DynamicResource来监听Application资源中隐式Style的变化，用一个附加属性来解决：

```C#
public static readonly DependencyProperty AutoMergeStyleProperty =
    DependencyProperty.RegisterAttached("AutoMergeStyle", typeof(Type), typeof(Behavior),
        new FrameworkPropertyMetadata((Type)null,
            new PropertyChangedCallback(OnAutoMergeStyleChanged)));

private static void OnAutoMergeStyleChanged(DependencyObject d, DependencyPropertyChangedEventArgs e)
{
    if (e.OldValue == e.NewValue)
    {
        return;
    }
    FrameworkElement control = d as FrameworkElement;
    if (control == null)
    {
        throw new NotSupportedException("AutoMergeStyle can only used in FrameworkElement");
    }
    Type type = e.NewValue as Type;
    if (type != null)
    {
        control.SetResourceReference(Behavior.BaseOnStyleProperty, type);
    }
    else
    {
        control.ClearValue(Behavior.BaseOnStyleProperty);
    }
}
```

`SetResourceReference` 是 XAML 中 `DynamicResource` 的代码表示，相当于 `Behavior.BaseOnStyle={DynamicResource type}`。对控件使用 `SetResourceReference`，监听的键值是 `type`，监听的属性是一个自定义的附加属性 `BaseOnStyleProperty`。当换肤替换 Application 的资源文件时，`BaseOnStyle` 属性被更新，在 `BaseOnStyleProperty` 的 `Changed` 事件中可以读取控件的 `Style` 属性和新的 `ThemeStyle`，调用 `Merge` 方法合并两者然后再设置到控件的 `Style` 属性上。

# 五、最佳实践

## 5.1 样式组织建议

- ✅ **集中管理**：将样式定义在 `App.xaml` 或独立的资源字典文件中
- ✅ **命名规范**：使用清晰的命名，如 `ButtonStyle`、`PrimaryButtonStyle` 等
- ✅ **分层设计**：基础样式 → 主题样式 → 特定样式
- ✅ **使用 BasedOn**：通过 `BasedOn` 属性实现样式继承，避免重复定义

## 5.2 性能优化

- ✅ **优先使用 StaticResource**：除非需要动态替换，否则使用 `StaticResource`
- ✅ **避免过度嵌套**：样式继承层级不宜过深
- ✅ **合理使用触发器**：触发器会增加性能开销，避免过度使用

## 5.3 常见陷阱

- ⚠️ **隐式样式不继承**：基类控件的隐式样式不会自动应用到派生类控件
- ⚠️ **BasedOn 只支持 StaticResource**：`BasedOn` 属性不支持 `DynamicResource`
- ⚠️ **样式密封机制**：样式合并后会被密封，无法动态修改
- ⚠️ **优先级理解**：Local 值优先级最高，会覆盖所有样式设置

# 六、总结

WPF 样式系统是一个强大而灵活的机制，通过本文的介绍，我们了解了：

1. ✅ **样式基础**：Setter、EventSetter、Trigger 等基本元素
2. ✅ **隐式样式**：自动应用到指定类型控件的样式机制
3. ✅ **依赖属性**：样式只能作用于依赖属性，理解属性值优先级
4. ✅ **样式合并**：ThemeStyle、显式样式、隐式样式的合并规则
5. ✅ **样式继承**：通过 `BasedOn` 实现样式继承和扩展
6. ✅ **换肤实现**：动态替换样式资源实现主题切换

掌握这些知识，可以帮助您更好地使用 WPF 样式系统，构建统一、美观、易维护的用户界面。

# 七、相关参考

- [WPF 样式和模板概述](https://learn.microsoft.com/zh-cn/dotnet/desktop/wpf/controls/styles-templates-overview)
- [WPF 依赖属性概述](https://learn.microsoft.com/zh-cn/dotnet/desktop/wpf/properties/dependency-properties-overview)
- [WPF 资源概述](https://learn.microsoft.com/zh-cn/dotnet/desktop/wpf/advanced/resources-wpf)
- [WPF 触发器概述](https://learn.microsoft.com/zh-cn/dotnet/desktop/wpf/controls/triggers-overview)
- [WPF 控件创作概述](https://learn.microsoft.com/zh-cn/dotnet/desktop/wpf/controls/control-authoring-overview)
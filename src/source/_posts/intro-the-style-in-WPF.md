---
title: WPF 中的样式介绍
title_en: Intro the Style in WPF
date: 2017-09-02 21:31:00
updated: 2017-09-02 21:31:00
tags: WPF
---

# 示例

```XAML
<Window>
    <Grid>
        <Grid.Resources>
            <Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
                <Setter Property="Height" Value="22"/>
                <Setter Property="Width" Value="60"/>
            </Style>
        </Grid.Resources>
        <Button Content="Button" Style="{StaticResource ButtonStyle}"/>
        <Button Content="Button" Style="{StaticResource ButtonStyle}" Margin="156,144,286,145" />
    </Grid>
</Window>
```

Style作为属性，资源，事件的批处理，它提供了一种捷径来对控件进行快速设置，使用Style的好处有二：

> 把一些控件的通用设置抽出来变成Style，使这些控件具有统一的风格，修改Style中的属性值可以方便的作用在所有应用该Style的控件上。可以对同一类型控件定义多个Style，通过替换Style来方便的更改控件的样式。

# Style的元素

```XAML
<Window>
    <Window.Resources>
        <Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
            <Style.Resources>
                <SolidColorBrush x:Key="brush" Color="Yellow"/>
            </Style.Resources>
            <Setter Property="Height" Value="22"/>
            <Setter Property="Width" Value="60"/>
            <EventSetter Event="Loaded" Handler="Button_Loaded"/>
        </Style>
    </Window.Resources>
    <x:Code>
        <![CDATA[
            void Button_Loaded(object sender, RoutedEventArgs e)
            {
                MessageBox.Show((sender as Button).Name + " Loaded");
            }
        ]]>
    </x:Code>
    <Grid>
        <Button x:Name="button1" Style="{StaticResource ButtonStyle}" Background="{DynamicResource brush}"/>
        <Button x:Name="button2" Style="{StaticResource ButtonStyle}" Background="{DynamicResource brush}" Margin="156,144,286,145" />
    </Grid>
</Window>
```

# Trigger

```XAML
<Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
    <Setter Property="Width" Value="60"/>
    <Style.Triggers>
        <Trigger Property="IsMouseOver" Value="True">
            <Setter Property="Width" Value="80"/>
        </Trigger>
    </Style.Triggers>
</Style>
```

WPF定义了五种Trigger来作为触发条件，分别是：Trigger，DataTrigger，MultiTrigger，MultiDataTrigger，EventTrigger，他们的触发条件分别是：

> Trigger：以控件的属性作为触发条件，如前面的IsMouseOver为True的时候触发。
>
> DataTrigger：以控件DataContext的属性作为触发条件。
>
> MultiTrigger：以控件的多个属性作为触发条件。
>
> MultiDataTrigger：以控件DataContext的多个属性作为触发条件。
>
> EventTrigger：以RoutedEvent作为触发条件，当指定的路由事件Raise时触发。

# Implicit Style

上面的例子中，都是使用StaticResource来设置Style的，当然，你也可以使用DynamicResource来设置Style。这两种方式都需要你在XAML或者后台代码中手动注明，为了使用方便，WPF提出了隐式（Implicit） Style的方式允许自动设置Style到控件，如：

```XAML
<Window>
    <Grid>
        <Grid.Resources>
            <Style TargetType="{x:Type Button}">
                <Setter Property="Height" Value="22"/>
                <Setter Property="Width" Value="60"/>
            </Style>
        </Grid.Resources>
        <Button x:Name="button1" Style="{x:Null}"/>
        <Button x:Name="button2" Margin="156,144,286,145" />
        <Button x:Name="button3" Margin="196,144,0,145" />
    </Grid>
</Window>
```

在Gird的Resource中定义Style时，没有给Style起名字（Key），这个Style会自动应用在Grid的所有子Button中，如果像button1一样在Button中显式定义了Style（这里设置了一个空值Null），那么这种隐式（Implicit）的Style会不起作用。

# 深入Style

Style是一个不错的概念，作为一个Presentation的框架，把UI对象的结构，样式和行为分离这是一种很好的设计。Style也比较容易上手，像它的隐式（Implicit）Style的设计也是水到渠成的想法，但实际使用中也会出现一些问题。这些问题在WPF中也会经常遇见：概念不错，描述简单，前景美好，Bug稀奇古怪，要把这些问题说清楚，就要从根本来看，Style是个什么东西？

按照通常的想法，Style应该类似于一个Dictionary&lt;string, object&gt; setters，预存了属性的名字和预设值，然后作用到UI对象上。WPF在Style处的想法很多，围绕着几个关键技术也加入了很多功能，详细的介绍一下：

# Style & Dependency Property

Dependency Property（简称DP）是WPF的核心，Style就是基于Dependency Property的，关于DP的内幕，请参见深入WPF--依赖属性。Style中的Setter就是作用在DP上的，如果你在控件中定义了一个CLR属性，Style是不能设置的。Dependency Property设计的精髓在于把字段的存取和对象（Dependency Object）剥离开，一个属性值内部用多个字段来存储，根据取值条件的优先级来决定当前属性应该取哪个字段。

Dependency Property取值条件的优先级是（从上到下优先级从低到高）：

```C#
 public enum BaseValueSource
 {
     Unknown,
     Default,
     Inherited,
     DefaultStyle,
     DefaultStyleTrigger,
     Style,
     TemplateTrigger,
     StyleTrigger,
     ImplicitStyleReference,
     ParentTemplate,
     ParentTemplateTrigger,
     Local
 }
```

对于一个具体例子来说：

```XAML
<Window>
    <Window.Resources>
        <Style TargetType="{x:Type Button}" x:Key="ButtonStyle">
            <Setter Property="Width" Value="60"/>
            <Style.Triggers>
                <Trigger Property="IsMouseOver" Value="True">
                    <Setter Property="Width" Value="80"/>
                </Trigger>
            </Style.Triggers>
        </Style>
    </Window.Resources>
    <Grid>
        <Button x:Name="button1" Style="{StaticResource ButtonStyle}" Background="{DynamicResource brush}" Width="20"/>
    </Grid>
</Window>
```

第4行用Style的Setter设置Width=60，这个优先级是Style；第6行当IsMouseOver为True时设置Width=80，这个优先级是StyleTrigger；第13行使用Style的Button定义Width=20，这个优先级是Local。Local具有最高的优先级，所以即使鼠标移到Button上，第6行的Trigger也会因为优先级不够高而不起作用。如果去掉了第13行中的Width=20，那么鼠标移到Button上时Width会变为80，鼠标移开后会回到第4行的设置的60来。

# Style & FrameworkElement

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

# Style & ResourceDictionary

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

# Style Merge

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

# 换肤

UI程序的换肤是很炫的玩意，换肤分两种：1，更换整个控件的Style；2，更换Style中的颜色画刷（Brush）。后者的实现很简单，定义好颜色画刷的资源文件（ResourceDictionary），使用画刷的时候使用DynamicResource绑定，换肤的时候替换画刷的资源文件就可以了。

很多公司都有自己皮肤库，这些皮肤库一般都是隐式的Style，定义了所有控件的隐式Style，使用时把这个皮肤资源Merge到Application的Resources中。换肤时把旧的皮肤资源从Application的Resources中删除，替换成新的皮肤资源ResourceDictionary。

这种做法很好理解，但是碰到Style的BasedOn属性就不起作用了，BasedOn属性使用是StaticResource，是静态的一次性的。新的皮肤库被添加到Application资源文件后，如果在Application的资源文件中已经定义过&lt;Style TargetType=“{x:Type Button}” BasedOn=“{StaticResource {x:Type Button}}”/&gt;这样隐式的Style，控件是不会更新皮肤的。如果有这方面的需求，需要手动合并（Merge）Style来解决问题，类似：

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

SetResourceReference是XAML中DynamicResource的代码表示，相当于Behavior.BaseOnStyle={DynamicResource type}。对控件使用SetResourceReference，监听的键值是type，监听的属性是一个我们自定义的附加属性BaseOnStyleProperty。当换肤替换Application的资源文件时，BaseOnStyle属性被更新，在BaseOnStyleProperty的Changed事件中可以读取控件的Style属性和新的ThemeStyle，调用Merge方法Merge两者然后再设置到控件的Style属性上。
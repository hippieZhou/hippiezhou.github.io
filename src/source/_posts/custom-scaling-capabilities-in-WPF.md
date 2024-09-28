---
title: Custom scaling capabilities in WPF
date: 2017-05-16 21:37:04
updated: 2017-05-16 21:37:04
tags: WPF
---

```XAML
<Window>
    AllowsTransparency="True"
    WindowState="Normal"
    WindowStyle="None">
    <Grid>
        <Grid.RowDefinitions>
            <RowDefinition Height="4" />
            <RowDefinition Height="*" />
            <RowDefinition Height="4" />
        </Grid.RowDefinitions>
        <Grid.ColumnDefinitions>
            <ColumnDefinition Width="4" />
            <ColumnDefinition Width="*" />
            <ColumnDefinition Width="4" />
        </Grid.ColumnDefinitions>
        <Rectangle
            x:Name="ResizetopLeft"
            Grid.Row="0"
            Grid.Column="0"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Rectangle
            x:Name="ResizeTop"
            Grid.Row="0"
            Grid.Column="1"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Rectangle
            x:Name="ResizeTopRight"
            Grid.Row="0"
            Grid.Column="2"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Rectangle
            x:Name="ResizeLeft"
            Grid.Row="1"
            Grid.Column="0"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Rectangle
            x:Name="ResizeRight"
            Grid.Row="1"
            Grid.Column="2"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Rectangle
            x:Name="ResizeBottomLeft"
            Grid.Row="2"
            Grid.Column="0"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Rectangle
            x:Name="ResizeBottom"
            Grid.Row="2"
            Grid.Column="1"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Rectangle
            x:Name="ResizeBottomRight"
            Grid.Row="2"
            Grid.Column="2"
            Fill="Black"
            MouseDown="ResizePressed"
            MouseMove="ResizePressed" />
        <Grid
            x:Name="MainContent"
            Grid.Row="1"
            Grid.Column="1" />
    </Grid>
</Window>
```

```C#
public enum ResizeDirection
{
    Left = 1,
    Right = 2,
    Top = 3,
    TopLeft = 4,
    TopRight = 5,
    Bottom = 6,
    BottomLeft = 7,
    BottomRight = 8
}
public partial class MainWindow : Window
{
    private HwndSource _hwndSource;
    private const int WM_SYSCOMMAND = 0x112;
    [DllImport("user32.dll",CharSet = CharSet.Auto)]
    private static extern IntPtr SendMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);
    private Dictionary<ResizeDirection, Cursor> cursors = new Dictionary<ResizeDirection, Cursor>
    {
        { ResizeDirection.Top,Cursors.SizeNS },
        { ResizeDirection.Bottom,Cursors.SizeNS },
        { ResizeDirection.Left,Cursors.SizeWE },
        { ResizeDirection.Right,Cursors.SizeWE },
        { ResizeDirection.TopLeft,Cursors.SizeNWSE },
        { ResizeDirection.BottomLeft,Cursors.SizeNWSE },
        { ResizeDirection.TopRight,Cursors.SizeNESW },
        { ResizeDirection.BottomRight,Cursors.SizeNESW },
    };
    public MainWindow()
    {
        InitializeComponent();
        this.SourceInitialized += MainWindow_SourceInitialized;
        this.MouseMove += MainWindow_MouseMove;
    }

    private void MainWindow_MouseMove(object sender, MouseEventArgs e)
    {
        if (e.OriginalSource is FrameworkElement element && !element.Name.Contains("Resize"))
            Cursor = Cursors.Arrow;
    }

    private void MainWindow_SourceInitialized(object sender, EventArgs e)
    {
        _hwndSource = PresentationSource.FromVisual((Visual)sender) as HwndSource;
    }

    private void ResizePressed(object sender, MouseEventArgs e)
    {
        var element = sender as FrameworkElement;
        ResizeDirection direction = (ResizeDirection)Enum.Parse(typeof(ResizeDirection), element.Name.Replace("Resize", ""));
        this.Cursor = cursors[direction];
        if (e.LeftButton == MouseButtonState.Pressed)
            ResizeWindow(direction);
    }

    private void ResizeWindow(ResizeDirection direction)
    {
        SendMessage(_hwndSource.Handle, WM_SYSCOMMAND, (IntPtr)(61440 + direction), IntPtr.Zero);
    }
}
```
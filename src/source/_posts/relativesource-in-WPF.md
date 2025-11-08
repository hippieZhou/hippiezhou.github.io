---
title: WPF 中的 Relativesource
title_en: RelativeSource in WPF
date: 2017-03-28 21:28:16
updated: 2017-03-28 21:28:16
tags: 
    - WPF
---

> RelativeSource 是 WPF 数据绑定中的一个重要属性，允许根据当前目标对象的相对关系指向源目标，比如获取父对象、兄弟对象或自身的其他属性。本文介绍 RelativeSource 的几种使用模式。

# 一、概述

设置该属性 可以根据当前目标对象的相对关系指向源目标。比如获取当前对象的父对象、兄弟对象或者自身的其他属性等一些数据；

# 二、示例代码

```XAML
<StackPanel
        Margin="10,50,0,0"
        HorizontalAlignment="Center"
        VerticalAlignment="Center"
        Orientation="Vertical"
        ToolTip="top">
        <StackPanel Orientation="Horizontal">
            <TextBlock Width="150" Text="获取自身宽度:" />
            <TextBlock Width="200" Text="{Binding Path=Width, RelativeSource={RelativeSource Mode=Self}}" />
        </StackPanel>
        <StackPanel Orientation="Horizontal" ToolTip="parent">
            <TextBlock Width="150" Text="查找上一层ToolTip:" />
            <TextBlock Text="{Binding Path=ToolTip, RelativeSource={RelativeSource Mode=FindAncestor, AncestorType={x:Type StackPanel}}}" />
        </StackPanel>
        <StackPanel Orientation="Horizontal">
            <TextBlock Width="150" Text="查找上二层ToolTip:" />
            <TextBlock Text="{Binding Path=ToolTip, RelativeSource={RelativeSource Mode=FindAncestor, AncestorType={x:Type StackPanel}, AncestorLevel=2}}" />
        </StackPanel>
</StackPanel>
```

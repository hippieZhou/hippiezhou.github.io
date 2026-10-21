---
title: 禁用 TCL 电视遥控器上的哔哩哔哩快捷键
title_en: Disable the Bilibili Shortcut on a TCL TV Remote
date: 2026-10-21 19:41:00
updated: 2026-10-21 19:41:00
tags:
    - 技术折腾
    - Android TV
---

家里的 TCL 电视遥控器上有一个哔哩哔哩快捷键。孩子已经习惯按这个键看短视频，但短视频里有些内容并不适合小朋友。这个快捷键是 TCL 电视内置的快捷按键，不能直接修改按键映射，所以我希望通过技术手段禁用它。

这次我借助 [CleanYourTV](https://github.com/Gathin23/cleanyourtv) 仓库里的 ADB 工具，停用了对应应用，让这个快捷键不再启动哔哩哔哩。

## 准备环境

先将 CleanYourTV 仓库克隆到电脑，并在命令行中进入项目目录：

```bash
git clone https://github.com/Gathin23/cleanyourtv.git
cd cleanyourtv
```

使用 `pyenv` 安装并选择一个 Python 版本；如果该版本已经安装，可以跳过安装步骤：

```bash
python3 -m venv tools/venv && tools/venv/bin/pip install -r tools/requirements.txt
```

进入项目目录后，启用虚拟环境：

```bash
source .venv/bin/activate
```

操作完成后，可以退出虚拟环境：

```bash
deactivate
```

## 电视和应用信息

先在电视上开启 ADB 功能：进入「设置」→「关于」→「本机信息」，然后依次按遥控器上的「上、下、左、右」方向键。不同电视系统版本的菜单名称可能略有差异。

通过 ADB 远程操作前，确保电脑和电视连接在同一个局域网，并让电视处于待机状态。之后在电脑上设置电视的 IP 地址，用仓库提供的探测命令确认设备信息：

```bash
export TV_HOST=<电视的 IP 地址>
tools/venv/bin/python -I tools/tv.py --probe
```

这台电视报告的设备型号是 `tcl_mt5879_cn`，运行 Android 11（SDK 30）。在已安装应用列表中找到云视听小电视：

```text
package:com.xiaodianshi.tv.yst
```

这里的包名是识别应用的依据；不要只凭应用名称相似就停用其他 TCL 系统组件。

## 通过 ADB 停用应用

开启电视的 ADB 功能并确认网络条件满足后，CleanYourTV 仓库的 `tools/tv.py` 可以向电视执行 ADB shell 命令：

```bash
# 可先查看应用包名是否存在
tools/venv/bin/python -I tools/tv.py 'pm list packages'

# 清除云视听小电视的应用数据
tools/venv/bin/python -I tools/tv.py 'pm clear com.xiaodianshi.tv.yst'

# 停用应用
tools/venv/bin/python -I tools/tv.py 'pm disable-user --user 0 com.xiaodianshi.tv.yst'

# 停用 TCL 系统自带的应用商店
tools/venv/bin/python -I tools/tv.py 'pm disable-user --user 0 com.tcl.appmarket2'
```

停用云视听小电视后，遥控器快捷键不再能打开该应用。不过，如果之后将云视听小电视卸载，按下快捷键可能会跳转到 TCL 系统自带的应用商店。因此还需要停用应用商店 `com.tcl.appmarket2`，避免快捷键在目标应用被卸载时转而打开应用商店。

停用应用包不是单独修改遥控器的按键映射；停用云视听小电视也会同时影响从其他入口打开该应用。停用应用商店则会影响通过该商店安装或打开应用，请确认这是你期望的行为。

停用电视自带的应用商店后，如果仍需要在电视上安装应用，可以安装「[当贝市场](https://www.dangbei.com/)」作为替代应用市场。

`pm clear` 会删除这个应用在电视上的本地数据，例如登录状态和应用设置。**如果你的目的只是让快捷键不能启动它，通常只需要执行停用命令，不必清除数据。**上面的清除数据命令是本次记录中的操作步骤。

## 恢复应用

如果想恢复应用，可以分别重新启用云视听小电视和系统应用商店：

```bash
tools/venv/bin/python -I tools/tv.py 'pm enable --user 0 com.xiaodianshi.tv.yst'
tools/venv/bin/python -I tools/tv.py 'pm enable --user 0 com.tcl.appmarket2'
```

重新启用云视听小电视只会恢复应用包，不会还原此前由 `pm clear` 删除的应用数据。完成后，建议在电视开发者选项中关闭网络调试和 USB 调试，并撤销不再需要的调试授权。

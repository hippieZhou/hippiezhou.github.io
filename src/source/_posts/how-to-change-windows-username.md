---
title: 如何修改 Windows 系统的用户名名称
title_en: "How to Change Windows System Username"
date: 2025-01-27 10:00:00
updated: 2025-01-27 10:00:00
tags: 
    - Windows11
    - 系统配置
---

> 本文介绍如何修改 Windows 系统的用户名名称，包括通过计算机管理工具修改用户名、更新注册表配置、手动更新用户目录名称，以及解决修改后可能出现的系统路径问题和 OneDrive 启动异常。

# 一、修改用户名

## 1.1 通过计算机管理工具修改

1. 打开 **计算机管理**（可以通过右键点击"此电脑" -> "管理"）
2. 导航至 **系统工具** -> **本地用户和组** -> **用户**
3. 找到需要修改的用户账户
4. 右键点击该用户，选择 **重命名**
5. 输入新的用户名

## 1.2 注意事项

⚠️ **重要提示**：修改用户名前，建议先备份重要数据，并确保当前用户具有管理员权限。

# 二、更新注册表配置

修改用户名后，需要更新注册表中对应的 `ProfileImagePath` 为新的用户目录路径。

## 2.1 打开注册表编辑器

1. 按 `Win + R` 打开运行对话框
2. 输入 `regedit` 并回车
3. 导航至：`HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList`

## 2.2 修改 ProfileImagePath

1. 在 `ProfileList` 下找到对应的用户 SID（Security Identifier）
2. 找到 `ProfileImagePath` 项
3. 将其值修改为新的用户目录路径（例如：`C:\Users\新用户名`）

# 三、更新用户目录名称

## 3.1 准备工作

在更新用户目录名称之前，需要先执行以下操作：

- 注销当前登录（或使用其他管理员账户登录）
- 确保没有程序正在使用该用户目录

## 3.2 重命名用户目录

1. 导航至 `C:\Users` 目录
2. 找到旧的用户目录
3. 将其重命名为新的用户名

# 四、解决系统路径问题

修改用户名后，可能会出现部分系统路径（如桌面、文档等）找不到的问题。

## 4.1 更新快速访问列表

1. 打开 **文件资源管理器**
2. 查看 **快速访问** 列表中的所有系统目录
3. 检查这些目录是否已更新为新的用户目录路径
4. 如果未更新：
   - 将旧的系统目录从快速访问列表中移除
   - 将新用户目录下的系统目录添加到快速访问列表

## 4.2 验证系统路径

修改完成后，建议验证以下系统路径是否正确：

- 桌面：`C:\Users\新用户名\Desktop`
- 文档：`C:\Users\新用户名\Documents`
- 下载：`C:\Users\新用户名\Downloads`
- 图片：`C:\Users\新用户名\Pictures`

# 五、修复 OneDrive 启动异常

修改用户名后，OneDrive 可能会出现启动异常或无法访问的问题。这是因为 OneDrive 的配置仍然指向旧的用户目录路径。

## 5.1 问题表现

修改用户名后，OneDrive 可能出现以下问题：

- ❌ OneDrive 无法启动
- ❌ 系统托盘中的 OneDrive 图标消失
- ❌ OneDrive 同步失败
- ❌ 文件资源管理器中无法访问 OneDrive

## 5.2 解决方案：重新运行 OneDrive 安装程序

最简单有效的方法是找到 OneDrive 的安装目录，然后运行 `OneDriveSetup.exe` 来触发重新安装和配置。

### 5.2.1 查找 OneDrive 安装目录

OneDrive 通常安装在以下位置之一：

1. **系统级安装目录**（64 位系统）：
   ```
   C:\Program Files\Microsoft OneDrive\OneDriveSetup.exe
   ```

2. **系统级安装目录**（32 位系统）：
   ```
   C:\Program Files (x86)\Microsoft OneDrive\OneDriveSetup.exe
   ```

3. **用户级安装目录**：
   ```
   C:\Users\新用户名\AppData\Local\Microsoft\OneDrive\OneDriveSetup.exe
   ```

### 5.2.2 运行 OneDriveSetup.exe

1. 打开 **文件资源管理器**
2. 导航到 OneDrive 安装目录（通常为 `C:\Users\新用户名\AppData\Local\Microsoft\OneDrive\`）
3. 找到 `OneDriveSetup.exe` 文件
4. 右键点击 `OneDriveSetup.exe`，选择 **以管理员身份运行**
5. 按照安装向导的提示完成重新安装和配置
6. 重新登录 OneDrive 账户

### 5.2.3 通过命令行运行（推荐）

也可以通过命令行快速运行：

```bash
# 方法一：直接运行（如果路径在 PATH 中）
OneDriveSetup.exe

# 方法二：使用完整路径
"C:\Program Files\Microsoft OneDrive\OneDriveSetup.exe"

# 方法三：通过 PowerShell（以管理员身份运行）
Start-Process -FilePath "C:\Program Files\Microsoft OneDrive\OneDriveSetup.exe" -Verb RunAs
```

### 5.2.4 使用 PowerShell 脚本自动查找并运行

如果无法确定 OneDrive 的安装位置，可以使用以下 PowerShell 脚本自动查找并运行：

```powershell
# 以管理员身份运行 PowerShell

Write-Host "正在查找 OneDrive 安装目录..." -ForegroundColor Yellow

# 可能的安装路径
$possiblePaths = @(
    "C:\Program Files\Microsoft OneDrive\OneDriveSetup.exe",
    "C:\Program Files (x86)\Microsoft OneDrive\OneDriveSetup.exe",
    "$env:LOCALAPPDATA\Microsoft\OneDrive\OneDriveSetup.exe"
)

$found = $false
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        Write-Host "找到 OneDrive 安装程序: $path" -ForegroundColor Green
        Write-Host "正在运行 OneDrive 安装程序..." -ForegroundColor Yellow
        
        # 以管理员身份运行
        Start-Process -FilePath $path -Verb RunAs
        
        $found = $true
        break
    }
}

if (-not $found) {
    Write-Host "未找到 OneDriveSetup.exe，请手动查找并运行" -ForegroundColor Red
    Write-Host "提示：可以在以下位置查找：" -ForegroundColor Yellow
    $possiblePaths | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
}
```

## 5.3 其他修复方法

如果运行 `OneDriveSetup.exe` 后问题仍然存在，可以尝试以下方法：

### 5.3.1 重置 OneDrive

1. 按 `Win + R`，输入以下命令并回车：
   ```bash
   %localappdata%\Microsoft\OneDrive\OneDrive.exe /reset
   ```

2. 等待 OneDrive 重置完成

3. 重新启动 OneDrive：
   ```bash
   %localappdata%\Microsoft\OneDrive\OneDrive.exe
   ```

### 5.3.2 清理 OneDrive 配置

如果重置无效，可以尝试清理 OneDrive 配置：

```powershell
# 以管理员身份运行 PowerShell

# 停止 OneDrive 进程
Get-Process -Name "OneDrive" -ErrorAction SilentlyContinue | Stop-Process -Force

# 删除 OneDrive 配置目录（会清除同步设置，需要重新登录）
$onedriveConfigPath = "$env:LOCALAPPDATA\Microsoft\OneDrive\settings"
if (Test-Path $onedriveConfigPath) {
    Remove-Item -Path $onedriveConfigPath -Recurse -Force
    Write-Host "已清理 OneDrive 配置，请重新运行 OneDriveSetup.exe" -ForegroundColor Green
}
```

### 5.3.3 重新安装 OneDrive

如果上述方法都无法解决问题，可以考虑完全重新安装 OneDrive：

1. 卸载 OneDrive：
   - 按 `Win + R`，输入 `appwiz.cpl` 并回车
   - 找到 **Microsoft OneDrive**，右键选择 **卸载**

2. 清理残留文件：
   ```powershell
   Remove-Item -Path "$env:LOCALAPPDATA\Microsoft\OneDrive" -Recurse -Force -ErrorAction SilentlyContinue
   ```

3. 从 Microsoft 官网重新下载并安装 OneDrive：
   - 访问：https://www.microsoft.com/zh-cn/microsoft-365/onedrive/download

## 5.4 验证修复结果

修复完成后，验证 OneDrive 是否正常工作：

1. ✅ 检查系统托盘中是否显示 OneDrive 图标
2. ✅ 右键点击 OneDrive 图标，查看同步状态
3. ✅ 打开文件资源管理器，检查左侧导航栏中是否显示 OneDrive
4. ✅ 尝试访问 OneDrive 文件夹，确认可以正常打开
5. ✅ 测试文件同步功能，上传一个文件确认同步正常

# 六、自动化脚本方式（推荐）

如果不想手动执行上述步骤，可以使用 PowerShell 脚本一次性完成所有操作。

## 6.1 使用 PowerShell 脚本

为了方便操作，我们可以使用 PowerShell 脚本一次性完成所有步骤：

```powershell
# 以管理员身份运行 PowerShell，执行以下命令：
.\change-windows-username.ps1 -OldUsername "旧用户名" -NewUsername "新用户名"
```

### 脚本功能

该脚本会自动完成以下操作：

1. ✅ 检查管理员权限
2. ✅ 验证用户是否存在
3. ✅ 重命名用户账户
4. ✅ 更新注册表中的 `ProfileImagePath`
5. ✅ 重命名用户目录（如果可能）
6. ✅ 更新快速访问列表

### 使用步骤

1. 复制下面的脚本内容，保存为 `change-windows-username.ps1` 文件
2. 右键点击 PowerShell，选择 **以管理员身份运行**
3. 导航到脚本所在目录
4. 执行脚本命令：
   ```powershell
   .\change-windows-username.ps1 -OldUsername "当前用户名" -NewUsername "新用户名"
   ```
5. 按照提示完成操作
6. **注销并重新登录**以应用所有更改

### 注意事项

⚠️ **重要提示**：
- 脚本必须以管理员身份运行
- 修改前建议备份重要数据
- 如果用户目录正在被使用，可能需要先注销用户
- 完成后建议重启计算机以确保所有更改生效

## 6.2 脚本内容

<details>
<summary>点击展开查看完整脚本代码</summary>

```powershell
# PowerShell 脚本：自动修改 Windows 用户名
# 使用方法：以管理员身份运行 PowerShell，执行以下命令：
# .\change-windows-username.ps1 -OldUsername "旧用户名" -NewUsername "新用户名"

param(
    [Parameter(Mandatory=$true)]
    [string]$OldUsername,
    
    [Parameter(Mandatory=$true)]
    [string]$NewUsername
)

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "错误：此脚本需要管理员权限运行！" -ForegroundColor Red
    Write-Host "请右键点击 PowerShell，选择'以管理员身份运行'" -ForegroundColor Yellow
    exit 1
}

Write-Host "开始修改 Windows 用户名..." -ForegroundColor Green
Write-Host "旧用户名: $OldUsername" -ForegroundColor Cyan
Write-Host "新用户名: $NewUsername" -ForegroundColor Cyan
Write-Host ""

# 检查旧用户是否存在
try {
    $user = [ADSI]"WinNT://./$OldUsername,user"
    $user.GetInfo()
} catch {
    Write-Host "错误：用户 '$OldUsername' 不存在！" -ForegroundColor Red
    exit 1
}

# 检查新用户名是否已存在
try {
    $existingUser = [ADSI]"WinNT://./$NewUsername,user"
    $existingUser.GetInfo()
    Write-Host "错误：用户名 '$NewUsername' 已存在！" -ForegroundColor Red
    exit 1
} catch {
    # 用户不存在，可以继续
}

$oldProfilePath = "C:\Users\$OldUsername"
$newProfilePath = "C:\Users\$NewUsername"

# 检查旧用户目录是否存在
if (-not (Test-Path $oldProfilePath)) {
    Write-Host "警告：用户目录 '$oldProfilePath' 不存在！" -ForegroundColor Yellow
}

Write-Host "步骤 1: 重命名用户账户..." -ForegroundColor Yellow
try {
    # 使用 WMI 重命名用户
    $computer = [ADSI]"WinNT://$env:COMPUTERNAME"
    $user = $computer.Children.Find($OldUsername, "user")
    $user.Name = $NewUsername
    $user.SetInfo()
    Write-Host "✓ 用户账户重命名成功" -ForegroundColor Green
} catch {
    Write-Host "错误：重命名用户账户失败 - $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "步骤 2: 更新注册表中的 ProfileImagePath..." -ForegroundColor Yellow
try {
    $profileListPath = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList"
    $profileKeys = Get-ChildItem -Path $profileListPath
    
    $found = $false
    foreach ($key in $profileKeys) {
        $profileImagePath = (Get-ItemProperty -Path $key.PSPath -Name "ProfileImagePath" -ErrorAction SilentlyContinue).ProfileImagePath
        
        if ($profileImagePath -eq $oldProfilePath) {
            Set-ItemProperty -Path $key.PSPath -Name "ProfileImagePath" -Value $newProfilePath
            Write-Host "✓ 注册表 ProfileImagePath 更新成功" -ForegroundColor Green
            Write-Host "  路径: $($key.PSPath)" -ForegroundColor Gray
            $found = $true
            break
        }
    }
    
    if (-not $found) {
        Write-Host "警告：未找到匹配的注册表项，可能需要手动检查" -ForegroundColor Yellow
    }
} catch {
    Write-Host "错误：更新注册表失败 - $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "步骤 3: 重命名用户目录..." -ForegroundColor Yellow
if (Test-Path $oldProfilePath) {
    try {
        # 检查是否有程序正在使用该目录
        $processes = Get-Process | Where-Object { $_.Path -like "$oldProfilePath*" }
        if ($processes) {
            Write-Host "警告：以下进程正在使用用户目录，请先关闭它们：" -ForegroundColor Yellow
            $processes | ForEach-Object { Write-Host "  - $($_.ProcessName)" -ForegroundColor Gray }
            Write-Host ""
            Write-Host "请注销当前用户或关闭相关进程后，手动重命名目录：$oldProfilePath -> $newProfilePath" -ForegroundColor Yellow
        } else {
            Rename-Item -Path $oldProfilePath -NewName $NewUsername -Force
            Write-Host "✓ 用户目录重命名成功" -ForegroundColor Green
        }
    } catch {
        Write-Host "错误：重命名用户目录失败 - $_" -ForegroundColor Red
        Write-Host "提示：可能需要注销当前用户后手动重命名目录" -ForegroundColor Yellow
    }
} else {
    Write-Host "警告：用户目录 '$oldProfilePath' 不存在，跳过此步骤" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "步骤 4: 更新快速访问列表..." -ForegroundColor Yellow
try {
    # 快速访问列表存储在注册表中
    $quickAccessPath = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Quick Access\User Pinned"
    
    # 更新文件资源管理器的快速访问
    $pinnedItems = Get-ItemProperty -Path "$quickAccessPath\FileSystem" -ErrorAction SilentlyContinue
    if ($pinnedItems) {
        $pinnedItems.PSObject.Properties | ForEach-Object {
            if ($_.Value -like "*$OldUsername*") {
                $newValue = $_.Value -replace [regex]::Escape($OldUsername), $NewUsername
                Set-ItemProperty -Path "$quickAccessPath\FileSystem" -Name $_.Name -Value $newValue
            }
        }
    }
    
    Write-Host "✓ 快速访问列表已更新（可能需要重启文件资源管理器生效）" -ForegroundColor Green
} catch {
    Write-Host "警告：更新快速访问列表时出现问题 - $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "修改完成！" -ForegroundColor Green
Write-Host ""
Write-Host "重要提示：" -ForegroundColor Yellow
Write-Host "1. 请注销并重新登录以应用所有更改" -ForegroundColor White
Write-Host "2. 如果用户目录重命名失败，请注销后手动重命名" -ForegroundColor White
Write-Host "3. 建议重启计算机以确保所有更改完全生效" -ForegroundColor White
Write-Host "=" * 60 -ForegroundColor Cyan
```

</details>

# 总结

修改 Windows 系统用户名有两种方式：

## 方式一：手动修改

手动修改需要完成以下步骤：

1. ✅ 通过计算机管理工具修改用户名
2. ✅ 更新注册表中的 `ProfileImagePath` 配置
3. ✅ 手动重命名用户目录
4. ✅ 更新快速访问列表中的系统路径
5. ✅ 修复 OneDrive 启动异常（如需要）

## 方式二：使用 PowerShell 脚本（推荐）

使用提供的 PowerShell 脚本可以一次性完成所有步骤，简单高效。

完成以上步骤后，建议重启计算机以确保所有更改生效。如果遇到 OneDrive 启动异常，可以运行 `OneDriveSetup.exe` 重新配置。如果遇到其他问题，可以使用系统还原功能恢复到修改前的状态。

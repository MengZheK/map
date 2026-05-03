Option Explicit
Dim shell, fso, scriptDir, batPath, desktop, linkPath, sc
Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
batPath = scriptDir & "\Start-Maptool.bat"

If Not fso.FileExists(batPath) Then
  MsgBox "找不到 Start-Maptool.bat：" & vbCrLf & batPath, vbCritical, "Maptool"
  WScript.Quit 1
End If

desktop = shell.SpecialFolders("Desktop")
linkPath = desktop & "\Kang Map 相册工具.lnk"
Set sc = shell.CreateShortcut(linkPath)
sc.TargetPath = batPath
sc.WorkingDirectory = scriptDir
sc.WindowStyle = 1
sc.Description = "启动相册清单工具（Electron / maptool）"
sc.Save

MsgBox "已在桌面创建快捷方式：" & vbCrLf & "Kang Map 相册工具.lnk", vbInformation, "Maptool"

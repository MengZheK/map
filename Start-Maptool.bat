@echo off
chcp 65001 >nul
set "ROOT=%~dp0"
cd /d "%ROOT%maptool" || (
  echo [错误] 找不到 maptool 目录。
  pause
  exit /b 1
)

if not exist "node_modules\" (
  echo [首次运行] 正在安装依赖，请稍候…
  call npm install || (
    echo [错误] npm install 失败。请确认已安装 Node.js 并已加入 PATH。
    pause
    exit /b 1
  )
)

echo 启动相册清单工具 (maptool)…
call npm run dev

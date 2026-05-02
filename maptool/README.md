# 相册清单工具（桌面端）

在本地编辑网站仓库中的 `public/photos/photos.json`：从本地照片读取 EXIF（兼容 JPG、PNG、WebP、GIF、TIFF、HEIC、常见 RAW 等，解析失败可手填），粘贴腾讯云 COS 图片 URL，**每张单独设置分类与描述**。合并写入时不删除已有条目；保存前自动生成 `photos.json.bak`。

## 运行

```bash
cd maptool
npm install
npm run dev
```

## iPhone / HEIC 说明

- 工具会依次使用 **exifr** 与 **sharp**（将 HEIC 转 JPEG 再读元数据）尽量提取 EXIF / GPS。
- 若仍为空：Windows 请安装 **Microsoft 应用商店的「HEIF 图像扩展」**，或把照片在相册中 **导出为 JPEG** 再选择；也可在界面中 **手填** 各字段。

## 分类自定义

侧栏可 **添加 / 删除** 分类（id 仅限字母数字下划线）。列表保存在系统用户目录下的 `maptool-categories.json`，与网站工程路径无关。

## 合并规则

- 仅 **追加** 新 `id`；已存在的 `id` **不会覆盖**。
- 新 id 按现有 `p0001` 形式递增。

## 构建

```bash
npm run build
```

# picgo-plugin-watermark-mrxn

PicGo / PicList 高级水印插件：满屏自适应旋转文本水印 + 扩频盲水印。

## 功能

- **可见水印**：全图平铺旋转半透明文字，自适应图片尺寸，奇偶行交错
- **盲水印**：扩频算法嵌入隐藏信息到蓝色通道，密码保护，抗轻度压缩
- 两种水印可独立开关，互不干扰
- 完整的 GUI 配置界面（PicList / PicGo 2.3.0+）

## 安装

### PicList / PicGo GUI

插件设置 → 搜索 `watermark-mrxn` → 点击安装

### npm（推荐）

从 [npmjs.com](https://www.npmjs.com/package/picgo-plugin-watermark-mrxn) 安装：

```bash
# 全局安装（供 PicGo CLI 使用）
npm install picgo-plugin-watermark-mrxn -g

# 或在 PicList 配置目录下局部安装
# macOS
cd ~/Library/Application\ Support/piclist
# Windows
# cd %APPDATA%\piclist
npm install picgo-plugin-watermark-mrxn
```

### 从 GitHub Packages 安装

从 [GitHub Packages](https://github.com/Mr-xn/picgo-plugin-watermark-mrxn/pkgs/npm/picgo-plugin-watermark-mrxn) 安装：

1. 在项目根目录创建或编辑 `.npmrc` 文件，添加以下内容：

   ```
   @mr-xn:registry=https://npm.pkg.github.com
   ```

2. 安装插件：

   ```bash
   npm install @mr-xn/picgo-plugin-watermark-mrxn
   ```

### 本地下载导入

适用于无法访问 npm 网络、或希望使用本地修改版本的场景：

1. 下载源码：

   ```bash
   # 方式一：git clone
   git clone https://github.com/Mr-xn/picgo-plugin-watermark-mrxn.git

   # 方式二：直接下载 ZIP
   # 访问 https://github.com/Mr-xn/picgo-plugin-watermark-mrxn/archive/refs/heads/main.zip
   # 解压到本地任意目录，例如 ~/picgo-plugin-watermark-mrxn
   ```

2. 安装插件依赖：

   ```bash
   cd picgo-plugin-watermark-mrxn
   npm install
   ```

3. 在 PicList / PicGo 配置目录下，通过本地路径安装：

   ```bash
   # macOS
   cd ~/Library/Application\ Support/piclist
   npm install /本地路径/picgo-plugin-watermark-mrxn

   # Windows（CMD）
   cd %APPDATA%\piclist
   npm install C:\本地路径\picgo-plugin-watermark-mrxn
   ```

   > 也可在 PicList / PicGo GUI 中：插件设置 → 导入本地插件 → 选择插件目录

## 本地开发 & 测试

### 环境要求

- Node.js >= 16.0.0
- npm >= 7

### 克隆与初始化

```bash
git clone https://github.com/Mr-xn/picgo-plugin-watermark-mrxn.git
cd picgo-plugin-watermark-mrxn
npm install
```

### 运行测试

```bash
npm test
```

脚本会自动生成一张 800×600 渐变测试图，依次执行以下三个测试用例，并将结果保存到 `test-output/` 目录：

| 输出文件 | 说明 |
|----------|------|
| `0-original.png` | 原始测试图 |
| `1-visible.png` | 叠加可见水印后的图 |
| `2-blind.png` | 嵌入盲水印后的图（同时验证提取） |
| `3-pipeline.png` | 可见水印 + 盲水印完整流水线输出 |

控制台会输出每个测试的执行结果，其中部分测试会显示 `PASS / FAIL`，并打印盲水印提取内容。

### 盲水印提取工具

提取命令、参数说明与示例请统一参考下方的 [盲水印检测](#盲水印检测) 章节，避免重复维护。
### 项目结构

```
picgo-plugin-watermark-mrxn/
├── src/
│   ├── index.js              # PicGo/PicList 插件入口
│   ├── visible-watermark.js  # 可见水印（SVG pattern + sharp）
│   └── blind-watermark.js    # 盲水印（扩频算法）
├── extract-watermark.js      # 独立盲水印检测 CLI
├── test.js                   # 本地测试脚本
└── package.json
```

## 配置项

### 可见水印

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enableVisible | bool | true | 启用可见水印 |
| visibleText | string | 请勿商用 | 水印文字 |
| colorR/G/B | int | 255/160/122 | 水印颜色 (浅鲑鱼色) |
| alpha | int | 110 | 透明度 (0-255) |
| rotateDegree | float | -26 | 旋转角度 |
| fontSize | int | 0 | 字号 (0=自适应) |
| stepScaleX/Y | float | 1.6 | 水平/垂直间距倍数 |
| staggerRatio | float | 0.5 | 奇数行交错比例 |

### 盲水印

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| enableBlind | bool | true | 启用盲水印 |
| blindPayload | string | watermark-pro\|v1 | 嵌入的隐藏信息 |
| blindPassword | string | 136677 | 密钥 |
| blindStrength | int | 3 | 强度 (1-10, 越大越鲁棒) |

### PicList 第二图床

| 配置 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| secondUploaderMode | string | same | 第二图床水印模式（仅独立模式生效） |

`secondUploaderMode` 可选值：

| 值 | 行为 |
|-----|------|
| `same` | 与主图床一致，应用相同的水印设置（默认） |
| `skip` | 跳过所有水印，第二图床收到原始图片 |
| `visibleOnly` | 仅添加可见水印，不添加盲水印 |
| `blindOnly` | 仅添加盲水印，不添加可见水印 |

## PicList 第二图床详解

[PicList](https://github.com/Kuingsmile/PicList) 支持同时上传到两个图床。在「设置 → 上传 → 上传行为」中可启用第二图床，并选择模式：

### 数据流分析

本插件注册在 `beforeUploadPlugins` 生命周期钩子。PicList-Core 的完整处理链为：

```
原始图片 → preprocess (内置压缩/水印) → beforeTransform → doTransform
→ buildInRename → beforeUpload [本插件在此] → doUpload → afterUpload
```

#### 独立模式 (separate)

第二图床使用**原始输入**重新执行完整生命周期：

```
第一图床: 原始图片 → 完整流程 → [本插件处理] → 上传到主图床
第二图床: 原始图片 → 完整流程 → [本插件再次处理] → 上传到第二图床
```

- 两次上传**独立**执行，插件在第二图床上传时**会再次被调用**
- 可以通过 `secondUploaderMode` 配置项控制第二图床的水印行为
- 例如：主图床添加可见水印 + 盲水印，第二图床仅添加盲水印用于追踪

#### 备份模式 (backup)

第二图床直接使用主图床**已处理好的数据**，跳过所有插件：

```
第一图床: 原始图片 → 完整流程 → [本插件处理] → 上传到主图床
第二图床: 直接使用已处理的数据 (含水印) → 上传到第二图床
```

- `beforeUploadPlugins` 被**完全跳过**，插件不会被调用
- 第二图床**始终**收到与主图床相同的已加水印图片
- `secondUploaderMode` 设置在此模式下**不生效**
- 如需第二图床不加水印，请改用「独立模式」

### 推荐配置

| 使用场景 | 第二图床模式 | secondUploaderMode |
|---------|------------|-------------------|
| 两个图床都需要完全一致的水印 | 备份模式 或 独立模式 | `same`（默认） |
| 主图床加水印，第二图床作为纯备份 | 独立模式 | `skip` |
| 主图床全水印，第二图床仅需追踪 | 独立模式 | `blindOnly` |
| 主图床全水印，第二图床仅需可见标记 | 独立模式 | `visibleOnly` |

## 盲水印检测

本插件附带独立检测工具，用于验证图片中是否包含盲水印：

```bash
# 基本用法
node extract-watermark.js <图片路径> [密码]

# 示例
node extract-watermark.js photo.png
node extract-watermark.js photo.png 136677
```

输出示例：
```
文件: photo.png (272816 bytes)
密码: 136677
---
✓ 检测到盲水印
  内容: "watermark-pro|v1"
```

> **注意**：本插件使用扩频盲水印算法（蓝色通道空域嵌入）

## 注意事项

- **与 PicList 内置水印冲突**：使用本插件前，需在 PicList 设置中关闭自带的文字/图片水印功能
- **处理链顺序**：格式转换 → 压缩 → EXIF 清理 → **本插件** → 上传
- **支持格式**：PNG、JPG、JPEG、WebP（GIF/SVG 会跳过）
- **盲水印容错**：盲水印嵌入失败不阻断上传，原图照常上传并记录日志

## 技术原理

### 可见水印

使用 SVG pattern + sharp composite：
1. 根据图片尺寸自适应计算字号
2. 生成带旋转 `patternTransform` 的 SVG 平铺图案（含奇偶行交错）
3. 通过 sharp 合成到原图上

### 盲水印

扩频（spread-spectrum）算法：
1. 密码驱动 PRNG 生成像素索引置换表（Fisher-Yates 洗牌）
2. 每个 payload bit 扩展到 256 个像素（SPREAD_FACTOR=256）
3. 用密码派生的伪随机 ±1 模式调制蓝色通道值
4. 提取时通过均值中心化相关性检测还原 bit

## 依赖

- [sharp](https://www.npmjs.com/package/sharp) — 图片处理与 SVG 合成

## 许可

MIT

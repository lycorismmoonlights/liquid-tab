# Liquid Tab

这是一个给 iPhone 浏览器用的移动端起始页原型，重点是把原本又厚又白的底部操作区，换成更接近液态玻璃的漂浮 dock。

## 现在可以直接用的文件

- [`index.html`](/Volumes/HP P900/goole_ui_pro/index.html)
- [`styles.css`](/Volumes/HP P900/goole_ui_pro/styles.css)
- [`script.js`](/Volumes/HP P900/goole_ui_pro/script.js)
- [`manifest.webmanifest`](/Volumes/HP P900/goole_ui_pro/manifest.webmanifest)

## 用法

1. 直接在浏览器打开 [`index.html`](/Volumes/HP P900/goole_ui_pro/index.html)。
2. 如果你想在 iPhone 上更像“独立标签页”，建议用 Safari 打开后，点“分享”。
3. 选择“添加到主屏幕”。
4. 以后从主屏幕打开，它会更像一个独立首页，而不是 Safari 默认起始页。

## 能做和不能做

能做：

- 自定义首页视觉
- 搜索框交互
- 底部透明 / 液态玻璃 dock
- 记住你上次选的样式和搜索引擎

不能做：

- 直接替换 iOS Safari 或 Chrome 的系统级“新标签页”
- 真正修改 iPhone 浏览器原生底栏

## 可调项

页面里已经做了两个风格开关：

- `液态玻璃`
- `纯透明`

如果你想改默认风格，可以在 [`script.js`](/Volumes/HP P900/goole_ui_pro/script.js) 里改默认状态。

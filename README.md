# Liquid Tab

这是一个给 iPhone 浏览器用的移动端起始页原型，重点是把原本又厚又白的底部操作区，换成更接近液态玻璃的漂浮 dock。

## 现在可以直接用的文件

- [`index.html`](/Volumes/HP P900/goole_ui_pro/index.html)
- [`styles.css`](/Volumes/HP P900/goole_ui_pro/styles.css)
- [`script.js`](/Volumes/HP P900/goole_ui_pro/script.js)
- [`manifest.webmanifest`](/Volumes/HP P900/goole_ui_pro/manifest.webmanifest)
- [`STATE_FRAMEWORK.md`](/Volumes/HP P900/goole_ui_pro/STATE_FRAMEWORK.md)
- [`PROJECT_CONTEXT.md`](/Volumes/HP P900/goole_ui_pro/PROJECT_CONTEXT.md)

## 跨线程上下文入口

如果你之后会频繁新开 Codex 线程继续这个项目，先看：

1. [`PROJECT_CONTEXT.md`](/Volumes/HP P900/goole_ui_pro/PROJECT_CONTEXT.md)
2. [`docs/CURRENT_STATUS.md`](/Volumes/HP P900/goole_ui_pro/docs/CURRENT_STATUS.md)
3. [`docs/NEXT_STEPS.md`](/Volumes/HP P900/goole_ui_pro/docs/NEXT_STEPS.md)
4. [`docs/DECISIONS.md`](/Volumes/HP P900/goole_ui_pro/docs/DECISIONS.md)
5. [`docs/CONTEXT_MECHANISM.md`](/Volumes/HP P900/goole_ui_pro/docs/CONTEXT_MECHANISM.md)
6. [`docs/WORK_LOG.md`](/Volumes/HP P900/goole_ui_pro/docs/WORK_LOG.md)

这套文档系统就是为了把项目状态、决策和线程进度沉淀到仓库里，让新线程可以直接读文件恢复上下文。现在阅读顺序也已经正式写入机制文档，不再只是建议。

## 状态读写约定

后续如果要继续改设置项、最近浏览、壁纸或别的持久化逻辑，先看 [`STATE_FRAMEWORK.md`](/Volumes/HP P900/goole_ui_pro/STATE_FRAMEWORK.md)。

现在项目约定：

- 所有持久化字段都登记在 [`script.js`](/Volumes/HP P900/goole_ui_pro/script.js) 的 `PERSISTED_STATE_FIELDS`
- 运行时修改统一走 `stateStore`
- 不再直接散写 `state.xxx = ...` 或手动 `localStorage.*`

## 现成液态玻璃实现

这版已经改为使用现成开源库：

- `liquidGL` by NaughtyDuk, MIT
- `html2canvas` by Niklas von Hertzen, MIT

本地文件：

- [`vendor/liquidGL.js`](/Volumes/HP P900/goole_ui_pro/vendor/liquidGL.js)
- [`vendor/html2canvas.min.js`](/Volumes/HP P900/goole_ui_pro/vendor/html2canvas.min.js)

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

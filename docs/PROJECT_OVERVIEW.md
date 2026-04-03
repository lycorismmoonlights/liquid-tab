# 项目概览

## 项目定位

`Liquid Tab` 是一个浏览器起始页原型，主要服务于 iPhone 场景，核心体验不是“功能很多”，而是更轻、更像液态玻璃的视觉与交互感。

## 主要目标

- 提供可自定义的起始页视觉体验
- 提供搜索、快捷链接、最近访问等轻量能力
- 用更轻的悬浮式底部 dock 取代厚重底栏的观感
- 保持为静态前端项目，方便直接打开或添加到主屏幕使用

## 当前代码结构

- [`index.html`](/Volumes/HP%20P900/goole_ui_pro/index.html)：页面结构
- [`styles.css`](/Volumes/HP%20P900/goole_ui_pro/styles.css)：视觉样式、布局与动效
- [`script.js`](/Volumes/HP%20P900/goole_ui_pro/script.js)：交互逻辑、状态管理、本地持久化
- [`manifest.webmanifest`](/Volumes/HP%20P900/goole_ui_pro/manifest.webmanifest)：PWA 基础配置
- [`vendor/liquidGL.js`](/Volumes/HP%20P900/goole_ui_pro/vendor/liquidGL.js)：液态玻璃效果依赖
- [`vendor/html2canvas.min.js`](/Volumes/HP%20P900/goole_ui_pro/vendor/html2canvas.min.js)：截图/画布相关依赖

## 关键实现约定

- 项目当前是以根目录静态文件为主的实现，而不是完整的构建型前端工程。
- 持久化逻辑已经统一收口到 [`script.js`](/Volumes/HP%20P900/goole_ui_pro/script.js) 中的状态框架。
- 新的可持久化字段需要先登记到 [`STATE_FRAMEWORK.md`](/Volumes/HP%20P900/goole_ui_pro/STATE_FRAMEWORK.md) 提到的 `PERSISTED_STATE_FIELDS`。
- 运行时状态修改应通过 `stateStore`，避免散落的 `localStorage` 或直接 `state.xxx = ...` 写法。

## 当前可见功能面

- 搜索框与搜索引擎切换
- 液态玻璃 / 透明风格切换
- 主题模式与浏览器模式适配
- 快捷链接
- 最近访问
- 壁纸上传与裁切相关逻辑
- 动效强度与减少动画设置

## 文档协作策略

- 稳定知识放在本目录的核心文档中
- 最近进展放在 [`WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)
- 单次线程上下文放在 [`docs/threads/`](/Volumes/HP%20P900/goole_ui_pro/docs/threads/README.md)

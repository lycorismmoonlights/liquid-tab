# 项目上下文入口

这个文件是给新线程看的总入口。任何新的 Codex 线程接手这个仓库时，先读这里，再按顺序打开下面几份文档，就能快速恢复项目上下文。

## 先读顺序

1. [`PROJECT_CONTEXT.md`](/Volumes/HP%20P900/goole_ui_pro/PROJECT_CONTEXT.md)
2. [`docs/CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)
3. [`docs/NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)
4. [`docs/DECISIONS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/DECISIONS.md)
5. [`docs/CONTEXT_MECHANISM.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CONTEXT_MECHANISM.md)
6. [`STATE_FRAMEWORK.md`](/Volumes/HP%20P900/goole_ui_pro/STATE_FRAMEWORK.md)
7. [`docs/WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)
8. 相关源码：
   - [`index.html`](/Volumes/HP%20P900/goole_ui_pro/index.html)
   - [`styles.css`](/Volumes/HP%20P900/goole_ui_pro/styles.css)
   - [`script.js`](/Volumes/HP%20P900/goole_ui_pro/script.js)

## 项目一句话

`Liquid Tab` 是一个面向 iPhone 浏览器使用场景的移动端起始页原型，重点在于“液态玻璃感”的搜索区、快捷区与底部 dock 体验。

## 文档地图

- [`docs/PROJECT_OVERVIEW.md`](/Volumes/HP%20P900/goole_ui_pro/docs/PROJECT_OVERVIEW.md)：项目目标、结构与主要模块
- [`docs/CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)：当前实现到哪一步、哪些已经稳定
- [`docs/NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)：接下来最值得继续做的事
- [`docs/DECISIONS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/DECISIONS.md)：关键约定与设计决策
- [`docs/CONTEXT_MECHANISM.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CONTEXT_MECHANISM.md)：新线程启动、进行中更新、结束交接的机制
- [`docs/WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)：跨线程共享的追加式工作日志
- [`docs/threads/README.md`](/Volumes/HP%20P900/goole_ui_pro/docs/threads/README.md)：线程交接文件的命名与使用方法
- [`docs/threads/THREAD_TEMPLATE.md`](/Volumes/HP%20P900/goole_ui_pro/docs/threads/THREAD_TEMPLATE.md)：新线程记录模板

## 新线程接手规则

1. 新线程开始前，必须先按“先读顺序”完成阅读，这个顺序已经正式写入 [`docs/CONTEXT_MECHANISM.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CONTEXT_MECHANISM.md)。
2. 先确认当前任务是否已经在 [`docs/WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md) 或 `docs/threads/` 中有人做过。
3. 如果命中已有记录，优先延续原文档，不要另起一套平行说明。
4. 如果做了用户可感知的变更，结束前至少更新：
   - [`docs/CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)
   - [`docs/NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)
   - [`docs/WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)
5. 如果这次工作有独立上下文、试验过程或交接成本较高，再额外新建一份 `docs/threads/*.md` 线程记录。

## 结束线程前的最小更新清单

- 当前做了什么
- 改了哪些文件
- 哪些结果已经验证
- 还有什么风险或未完成项
- 下一位线程接手时应按什么阅读顺序看哪些文件

## 最近一次系统更新时间

- 2026-04-03：建立跨线程文档系统与线程模板。
- 2026-04-03：把阅读顺序正式写入上下文机制。

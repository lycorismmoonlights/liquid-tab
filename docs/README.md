# 文档系统说明

这套文档系统的目标不是写很多文档，而是让任何新线程都能在几分钟内恢复上下文，知道项目现在是什么状态、为什么这么做、以及下一步该接什么。

## 结构

- [`PROJECT_OVERVIEW.md`](/Volumes/HP%20P900/goole_ui_pro/docs/PROJECT_OVERVIEW.md)：稳定信息，更新频率低
- [`CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)：当前快照，更新频率高
- [`NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)：按优先级维护的待办与建议
- [`DECISIONS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/DECISIONS.md)：重要约定和取舍原因
- [`CONTEXT_MECHANISM.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CONTEXT_MECHANISM.md)：新线程必须遵守的阅读与交接机制
- [`WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)：追加式简报，适合快速浏览近期变更
- [`threads/`](/Volumes/HP%20P900/goole_ui_pro/docs/threads/README.md)：单次线程交接文件

## 推荐阅读顺序

1. [`PROJECT_CONTEXT.md`](/Volumes/HP%20P900/goole_ui_pro/PROJECT_CONTEXT.md)
2. [`CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)
3. [`NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)
4. [`DECISIONS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/DECISIONS.md)
5. [`CONTEXT_MECHANISM.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CONTEXT_MECHANISM.md)
6. [`WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)
7. 需要时再看 `docs/threads/*.md`

## 更新原则

1. `PROJECT_OVERVIEW.md` 只放相对稳定的事实，不写零散过程。
2. `CURRENT_STATUS.md` 只描述“现在是什么状态”，不要写成长篇流水账。
3. `WORK_LOG.md` 按时间追加，单条尽量简短，强调结果和下一步。
4. `DECISIONS.md` 只记录以后可能会被问“为什么这样做”的事项。
5. 阅读顺序是机制的一部分，不是可有可无的建议。
6. 如果某次线程的背景复杂、信息量大，再创建独立线程文件。

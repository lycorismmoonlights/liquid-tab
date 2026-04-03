# 上下文机制

这份文档定义“新线程如何读、做、写”。阅读顺序从现在开始不是建议，而是这套文档系统的一部分。

## 核心原则

1. 新线程开始工作前，先按规定阅读顺序恢复上下文，再进入代码。
2. 线程进行中如果发现新的长期约定，要把它写回文档，而不是只留在对话里。
3. 线程结束前要把结果写回文档，确保下一线程可以继续接。

## 新线程启动机制

### 第一步：按阅读顺序读取

任何新线程开始前，按下面顺序阅读：

1. [`PROJECT_CONTEXT.md`](/Volumes/HP%20P900/goole_ui_pro/PROJECT_CONTEXT.md)
2. [`docs/CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)
3. [`docs/NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)
4. [`docs/DECISIONS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/DECISIONS.md)
5. [`STATE_FRAMEWORK.md`](/Volumes/HP%20P900/goole_ui_pro/STATE_FRAMEWORK.md)
6. [`docs/WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)
7. 如果命中某个历史任务，再读对应的 `docs/threads/*.md`
8. 最后才打开与你当前任务直接相关的源码文件

### 第二步：确认是否已有同类上下文

- 先检查 [`docs/WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md)
- 再检查 [`docs/threads/README.md`](/Volumes/HP%20P900/goole_ui_pro/docs/threads/README.md) 对应的线程记录
- 如果已有同类任务记录，优先延续原记录，不要平行新开一套说明

### 第三步：开始实施

- 稳定信息写到核心文档
- 单次复杂过程写到线程记录
- 代码改动遵守已有状态框架与项目约定

## 线程进行中机制

- 如果发现新的长期约束，更新 [`docs/DECISIONS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/DECISIONS.md)
- 如果当前项目状态发生变化，更新 [`docs/CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)
- 如果后续动作优先级变化，更新 [`docs/NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)
- 如果这次线程内容复杂，补一份 `docs/threads/*.md`

## 线程结束机制

结束前至少完成下面几项：

1. 更新 [`docs/CURRENT_STATUS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CURRENT_STATUS.md)
2. 更新 [`docs/NEXT_STEPS.md`](/Volumes/HP%20P900/goole_ui_pro/docs/NEXT_STEPS.md)
3. 在 [`docs/WORK_LOG.md`](/Volumes/HP%20P900/goole_ui_pro/docs/WORK_LOG.md) 追加一条简短记录
4. 如果这次工作复杂，更新或新增对应的 `docs/threads/*.md`
5. 在线程记录中写清“下一线程应按什么阅读顺序接手”

## 什么时候必须建线程记录

- 一次改动跨多个文件且接手成本高
- 有试验、回滚、备选方案或明显踩坑过程
- 预计下一线程会直接延续这项工作

## 机制落点

- 总入口：[`PROJECT_CONTEXT.md`](/Volumes/HP%20P900/goole_ui_pro/PROJECT_CONTEXT.md)
- 机制说明：[`docs/CONTEXT_MECHANISM.md`](/Volumes/HP%20P900/goole_ui_pro/docs/CONTEXT_MECHANISM.md)
- 线程模板：[`docs/threads/THREAD_TEMPLATE.md`](/Volumes/HP%20P900/goole_ui_pro/docs/threads/THREAD_TEMPLATE.md)

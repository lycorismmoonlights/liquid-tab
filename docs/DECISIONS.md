# 关键决策

## 2026-04-03: 用仓库内文件做跨线程上下文，而不是依赖单线程对话

### 决策

建立以 [`PROJECT_CONTEXT.md`](/Volumes/HP%20P900/goole_ui_pro/PROJECT_CONTEXT.md) 为入口、`docs/` 为主体、`docs/threads/` 为线程补充的文档系统。

### 原因

- 新线程天然看不到旧线程对话
- 仓库文件是所有线程都能直接读取的共享介质
- 轻量 Markdown 成本低，适合持续维护

### 影响

- 项目进展会以文件形式沉淀下来
- 每次完成较大改动时，需要多做一次简短文档更新

## 已有长期约定: 状态持久化统一走状态框架

### 决策

所有持久化字段统一登记在 [`script.js`](/Volumes/HP%20P900/goole_ui_pro/script.js) 的 `PERSISTED_STATE_FIELDS`，运行时写入统一通过 `stateStore`。

### 原因

- 避免新功能把 `localStorage` 调用散落到各处
- 降低新线程接手时的理解成本

### 参考

- [`STATE_FRAMEWORK.md`](/Volumes/HP%20P900/goole_ui_pro/STATE_FRAMEWORK.md)

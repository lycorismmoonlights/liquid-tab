# State Framework

This project uses one shared state/storage framework in [`script.js`](./script.js) so future changes stay inside the same read/write path, even in a brand-new Codex thread.

## Source Of Truth

- `PERSISTED_STATE_FIELDS`: declares every persisted field, its storage key, default value, and optional read/write/clear rules.
- `readStateField(fieldName)`: reads one field from storage using the schema.
- `writeStateField(fieldName, value)`: writes one field back using the schema.
- `stateStore`: the only supported write entry for runtime state changes.

## Rules

1. If a new setting needs persistence, add it to `PERSISTED_STATE_FIELDS`.
2. Do not write `state.foo = ...` directly in feature code.
3. Use `stateStore.write(...)`, `stateStore.patch(...)`, `stateStore.toggle(...)`, or a small helper built on top of them.
4. If a field needs custom serialization, put it in the schema with `read`, `write`, or `shouldClear`.
5. If a feature needs a special action, add a named helper near `stateStore` instead of scattering storage calls across the file.

## Existing Patterns

- Simple setting:
  `stateStore.write("style", "transparent")`
- Boolean switch:
  `stateStore.toggle("showQuickLinks")`
- Replace list data:
  `stateStore.replaceRecent(entries)`
- Clear persisted value:
  `stateStore.persist("wallpaper", "")`

## Guardrail

`state` is wrapped in a guarded `Proxy`. Direct writes still work technically, but they log a warning in the console so accidental bypasses are easier to catch during development.

## For New Threads

When continuing work in a new thread:

1. Read this file first.
2. Open [`script.js`](./script.js) around the schema and `stateStore`.
3. Extend the schema before adding new persisted behavior.
4. Keep all new reads/writes inside this framework.

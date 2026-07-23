# main

Thin R package that ships C sources for an Emscripten **MAIN_MODULE** front-end
(`Rmain`). The binary is linked by the `r-main` conda recipe against `libR`
using `cross-r-base` Makeconf flags; it is **not** built as an R SHLIB.

## C API

| Symbol | Role |
|--------|------|
| `rmain_init(argc, argv)` | `Rf_initEmbeddedR` once; sets `R_running_as_main_program` |
| `rmain_eval(code)` | Parse/eval UTF-8 source in `R_GlobalEnv` via `R_tryEval` |
| `rmain_last_error()` | Message for the most recent `rmain_eval` failure |

## Layout

- `src/` — compiled and installed under `$PREFIX/bin/Rmain{,.wasm}`
- `NAMESPACE` — no `useDynLib`; this package does not install a `.so`

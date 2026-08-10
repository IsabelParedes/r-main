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
| `extractArchiveFromMemory(data, size)` | libarchive extract of an in-memory tarball into the Emscripten FS |

## JS API (`rmain_post.js` on the Emscripten `Module`)

| API | Role |
|-----|------|
| `initR(args?)` | Embedded R init |
| `evalR(code)` | Eval UTF-8 R; throws on error |
| `fetchUrls(urls, { concurrency, onProgress, onDone })` | Concurrent HTTP GET of archives/assets |
| `extractArchiveFromMemory(Uint8Array)` | Untar into the Emscripten FS; throws on failure |
| `populateFilesystem({ metaUrl, packagesBaseUrl, concurrency, onProgress })` | Fetch `empack_env_meta.json`, download each `packages[]` and `mounts[]` archive, extract into the FS |

`populateFilesystem` options:

- `metaUrl` — URL of `empack_env_meta.json` (default `./empack_env_meta.json`)
- `packagesBaseUrl` — base URL for package filenames (default: directory of `metaUrl`)
- `concurrency` — parallel downloads (default `5`)
- `onProgress({ downloadedBytes, totalBytes, percent })` — download progress callback

Fails if the meta fetch, any archive fetch, or any extract fails.

## Layout

- `src/` — compiled and installed under `$PREFIX/bin/Rmain{,.wasm}`
- `NAMESPACE` — no `useDynLib`; this package does not install a `.so`

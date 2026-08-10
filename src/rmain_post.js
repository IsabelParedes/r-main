// JS wrappers around rmain_init / rmain_eval (exported via ccall).
function rmainBuildArgv(args) {
  var fullArgs = [Module["thisProgram"] || "Rmain"].concat(args);
  var argc = fullArgs.length;
  var argv = Module["stackAlloc"]((argc + 1) * 4);
  var argvPtr = argv;
  for (var i = 0; i < argc; i++) {
    Module["setValue"](argvPtr, Module["stringToUTF8OnStack"](fullArgs[i]), "i32");
    argvPtr += 4;
  }
  Module["setValue"](argvPtr, 0, "i32");
  return { argc: argc, argv: argv };
}

Module["initR"] = function (args) {
  args = args || [];
  var av = rmainBuildArgv(args);
  return Module["ccall"]("rmain_init", "number", ["number", "number"], [av.argc, av.argv]);
};

Module["evalR"] = function (code) {
  var result = Module["ccall"]("rmain_eval", "number", ["string"], [code]);
  var err = Module["ccall"]("rmain_last_error", "string", [], []);
  if (err) {
    throw new Error(err);
  }
  return result;
};



Module["fetchUrls"] = async function fetchUrls(
  urls,
  {
    concurrency = 10,
    onProgress = () => {},
    onDone = async () => {},
  } = {}
) {
  // Try to determine total size for progress reporting.
  // If a server doesn't provide Content-Length, totalBytes may be incomplete.
  const sizes = await Promise.all(
    urls.map(async (url) => {
      try {
        const res = await fetch(url, { method: "HEAD" });
        return Number(res.headers.get("content-length")) || 0;
      } catch {
        return 0;
      }
    })
  );

  const totalBytes = sizes.reduce((sum, size) => sum + size, 0);

  const results = new Array(urls.length);
  let downloadedBytes = 0;
  let nextIndex = 0;

  async function responseToArrayBuffer(response) {
    const reader = response.body.getReader();

    const chunks = [];
    let totalLength = 0;

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      chunks.push(value);
      totalLength += value.byteLength;

      downloadedBytes += value.byteLength;

      onProgress({
        downloadedBytes,
        totalBytes,
        percent:
          totalBytes > 0
            ? (downloadedBytes / totalBytes) * 100
            : null,
      });
    }

    const merged = new Uint8Array(totalLength);

    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }

    return merged.buffer;
  }

  async function worker() {
    while (true) {
      const index = nextIndex++;
      if (index >= urls.length) return;

      const url = urls[index];

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(
            `HTTP ${response.status} ${response.statusText}`
          );
        }

        const arrayBuffer = await responseToArrayBuffer(response);

        results[index] = arrayBuffer;

        await onDone({
          index,
          url,
          arrayBuffer,
          error: null,
        });
      } catch (error) {
        results[index] = null;

        await onDone({
          index,
          url,
          arrayBuffer: null,
          error,
        });
      }
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(concurrency, urls.length) },
      () => worker()
    )
  );

  return results;
}



Module["extractArchiveFromMemory"] = function (myTypedArray) {
  var nbytes = myTypedArray.length * myTypedArray.BYTES_PER_ELEMENT;
  var buf = Module._malloc(nbytes);
  Module.HEAPU8.set(myTypedArray, buf);
  var rc = Module.ccall(
    "extractArchiveFromMemory",
    "number",
    ["number", "number"],
    [buf, nbytes]
  );
  Module._free(buf);
  if (rc !== 0) {
    throw new Error("extractArchiveFromMemory failed with status " + rc);
  }
  return rc;
};

/**
 * Fetch an empack env meta file and extract each package archive into the
 * Emscripten filesystem.
 *
 * @param {object} [options]
 * @param {string} [options.metaUrl="./empack_env_meta.json"]
 *   URL of empack_env_meta.json (absolute or relative to the worker/page).
 * @param {string} [options.packagesBaseUrl]
 *   Base URL for package archives. Defaults to the directory containing metaUrl.
 * @param {number} [options.concurrency=5]
 * @param {function} [options.onProgress]
 *   Called with `{ downloadedBytes, totalBytes, percent }` during downloads.
 * @returns {Promise<object>} The parsed empack env meta object.
 */
Module["populateFilesystem"] = async function ({
  metaUrl = "./empack_env_meta.json",
  packagesBaseUrl,
  concurrency = 5,
  onProgress = () => {},
} = {}) {
  const metaHref = new URL(metaUrl, self.location.href).href;
  const response = await fetch(metaHref);
  if (!response.ok) {
    throw new Error(
      "Failed to fetch " + metaHref + ": HTTP " + response.status
    );
  }
  const empack_env_meta = await response.json();
  const packages = Array.isArray(empack_env_meta.packages)
    ? empack_env_meta.packages
    : [];
  // `empack pack append` registers extra archives under `mounts`, not `packages`.
  const mounts = Array.isArray(empack_env_meta.mounts)
    ? empack_env_meta.mounts
    : [];
  const archives = packages.concat(mounts);
  if (archives.length === 0) {
    throw new Error("No packages or mounts listed in " + metaHref);
  }

  const baseHref = new URL(
    packagesBaseUrl != null ? packagesBaseUrl : ".",
    packagesBaseUrl != null ? self.location.href : metaHref
  ).href;

  const urls = archives.map(function (pkg) {
    if (!pkg || !pkg.filename) {
      throw new Error("Archive entry missing filename in " + metaHref);
    }
    return new URL(pkg.filename, baseHref).href;
  });

  const errors = [];
  await Module.fetchUrls(urls, {
    concurrency: concurrency,
    onProgress: onProgress,
    onDone: async function ({ url, arrayBuffer, error }) {
      if (error) {
        errors.push({ url: url, error: error });
        return;
      }
      try {
        Module.extractArchiveFromMemory(new Uint8Array(arrayBuffer));
      } catch (extractError) {
        errors.push({ url: url, error: extractError });
      }
    },
  });

  if (errors.length > 0) {
    var detail = errors
      .map(function (e) {
        return e.url + ": " + (e.error && e.error.message ? e.error.message : e.error);
      })
      .join("; ");
    throw new Error(
      "populateFilesystem failed for " + errors.length + " archive(s): " + detail
    );
  }

  return empack_env_meta;
};


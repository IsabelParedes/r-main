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
    var buf = Module._malloc(myTypedArray.length * myTypedArray.BYTES_PER_ELEMENT);
    Module.HEAPU8.set(myTypedArray, buf);
    Module.ccall('extractArchiveFromMemory', 'number', ['number', 'number'], [buf, myTypedArray.length * myTypedArray.BYTES_PER_ELEMENT]);
    Module._free(buf);
}




Module["populateFilesystem"] =  async function () {

  // fetch empack_env_meta.json

  const response = await fetch("./empack_env_meta.json");
  var empack_env_meta = await response.json();
  console.log("empack_env_meta:", empack_env_meta);
  

  var packages = empack_env_meta.packages;

  // list of urls 
  let urls = [];

  for (const pkg of packages) {
    const filename = pkg.filename;
    const url = `./${filename}`;
    urls.push(url);
  }


 // fetch all urls with concurrency limit
 await Module.fetchUrls(urls, {
    concurrency: 5,
    onProgress: ({ downloadedBytes, totalBytes, percent }) => {
        self.postMessage({
        type: "download-progress",
        downloadedBytes,
        totalBytes,
        percent,
        });
    },

    onDone: async ({ index, url, arrayBuffer, error }) => {
      if (error) {
        console.error(`Failed to fetch ${url}:`, error);
        return;
      }
      
      const pkg = packages[index];
      const filename = pkg.filename;
      const filePath = `/${filename}`;
      console.log(`Writing ${filePath} to Emscripten FS...`);
      Module.extractArchiveFromMemory(new Uint8Array(arrayBuffer));
    }
  });


}




   

self.onmessage = async (e) => {
    console.log("got message", e.data);

    if (e.data.type === "init"){

        try {
            // Load the generated Emscripten JS file.
            const ModuleFactory = (await import("./Rmain.js")).default;

            // Create the module instance.
            Module = await ModuleFactory({
                locateFile(path) {
                    // Ensure wasm is found next to the JS file.
                    return path;
                },
                 print: (text) => {
                    console.log("[R PRINT]", text);
                    self.postMessage({
                        type: "print",
                        text: text
                    });
                }
            });
            

            self.postMessage({
                type: "ready"
            });

            // Example:
            // const result = Module._my_exported_function();
            // self.postMessage({ result });
            console.log("Rmain.js loaded and module initialized.");
            console.log("Module:", Module);


            // redirect print




            await Module.populateFilesystem();
            Module.initR();

        } catch (err) {
            self.postMessage({
                type: "error",
                error: String(err)
            });
        }
    }
    else if (e.data.type === "runRCode") {
        try {
   
            const code = e.data.code;

            // Call the R function to evaluate the code.
            Module.evalR(code);

            self.postMessage({
                type: "codeExecuted",
                code: code
            });
        } catch (err) {
            self.postMessage({
                type: "error",
                error: String(err)
            });
        }
    }
};
Module["preRun"] = [].concat(Module["preRun"] || [], () => {
  Object.assign(ENV, {
    R_HOME: "/lib/R",
    R_LIBS: "/lib/R/library",
    R_LIBS_USER: "NULL",
    R_LIBS_SITE: "NULL",
    R_INSTALL_LIBRARY: "/lib/R/library",
    R_ENVIRON: "/lib/R/etc/Renviron",
    LD_LIBRARY_PATH: "/lib/R/lib:/lib",
    R_ENABLE_JIT: "0",
  });
});

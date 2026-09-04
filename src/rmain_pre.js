Module["preRun"] = [].concat(Module["preRun"] || [], () => {
  Object.assign(ENV, {
    R_HOME: "/lib/R",
    R_LIBS_USER: "NULL",
    R_LIBS_SITE: "NULL",
    R_ENVIRON: "/lib/R/etc/Renviron",
    R_ENABLE_JIT: "0",
    PYTHONHOME: "/",
    TZ: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
});

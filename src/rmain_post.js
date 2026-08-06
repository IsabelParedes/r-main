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


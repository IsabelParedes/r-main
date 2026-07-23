#include "rmain.h"

#include <Rembedded.h>
#include <Rinterface.h>

#include <stddef.h>

static int rmain_initialized = 0;

RMAIN_KEEPALIVE int rmain_init(int argc, char **argv) {
  if (rmain_initialized) {
    return 0;
  }
  if (argc < 1 || argv == NULL || argv[0] == NULL) {
    return 1;
  }

  /* Rf_initEmbeddedR runs Rf_initialize_R + setup_Rmainloop. */
  if (Rf_initEmbeddedR(argc, argv) != 1) {
    return 1;
  }

  /* Match the Lucent glue: mark this process as a main-program embed. */
  R_running_as_main_program = 1;
  rmain_initialized = 1;
  return 0;
}

/* Stub main for the MAIN_MODULE link; INVOKE_RUN=0 so this is not auto-called. */
int main(int argc, char **argv) {
  (void)argc;
  (void)argv;
  return 0;
}

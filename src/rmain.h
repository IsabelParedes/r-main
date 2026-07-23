#ifndef RMAIN_H_
#define RMAIN_H_

#include <Rinternals.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
#define RMAIN_KEEPALIVE EMSCRIPTEN_KEEPALIVE
#else
#define RMAIN_KEEPALIVE
#endif

#ifdef __cplusplus
extern "C" {
#endif

/**
 * Initialize an embedded R session (once).
 *
 * argv[0] should be the program name; remaining args are R flags
 * (e.g. "--vanilla", "--no-save"). Returns 0 on success, non-zero on failure.
 * Subsequent calls are no-ops and return 0.
 */
RMAIN_KEEPALIVE int rmain_init(int argc, char **argv);

/**
 * Parse and evaluate UTF-8 R source in R_GlobalEnv.
 *
 * On success, returns the SEXP of the last expression. On parse or evaluation
 * failure, returns R_NilValue and sets the message from rmain_last_error().
 * The returned SEXP is unprotected; callers that keep it must PROTECT it.
 */
RMAIN_KEEPALIVE SEXP rmain_eval(const char *code);

/**
 * NUL-terminated message for the most recent rmain_eval failure, or "" if none.
 */
RMAIN_KEEPALIVE const char *rmain_last_error(void);

#ifdef __cplusplus
}
#endif

#endif /* RMAIN_H_ */

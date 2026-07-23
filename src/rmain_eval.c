#include "rmain.h"

#include <R_ext/Parse.h>

#include <stdio.h>
#include <string.h>

#define RMAIN_ERR_LEN 1024

static char rmain_errbuf[RMAIN_ERR_LEN] = "";

static void rmain_set_error(const char *msg) {
  if (msg == NULL) {
    rmain_errbuf[0] = '\0';
    return;
  }
  snprintf(rmain_errbuf, sizeof(rmain_errbuf), "%s", msg);
}

RMAIN_KEEPALIVE const char *rmain_last_error(void) {
  return rmain_errbuf;
}

RMAIN_KEEPALIVE SEXP rmain_eval(const char *code) {
  ParseStatus status;
  SEXP src_vec, parsed, result;
  int i, n, error_occurred;

  rmain_set_error(NULL);

  if (code == NULL) {
    rmain_set_error("R evaluation error: NULL code");
    return R_NilValue;
  }

  /* Build a length-1 STRSXP of UTF-8 source, matching the JS glue. */
  PROTECT(src_vec = Rf_allocVector(STRSXP, 1));
  SET_STRING_ELT(src_vec, 0, Rf_mkCharCE(code, CE_UTF8));

  PROTECT(parsed = R_ParseVector(src_vec, -1, &status, R_NilValue));
  if (status != PARSE_OK) {
    char buf[64];
    snprintf(buf, sizeof(buf), "R parse error (status %d)", (int)status);
    rmain_set_error(buf);
    UNPROTECT(2);
    return R_NilValue;
  }

  n = Rf_length(parsed);
  result = R_NilValue;
  for (i = 0; i < n; i++) {
    error_occurred = 0;
    PROTECT(result = R_tryEval(VECTOR_ELT(parsed, i), R_GlobalEnv, &error_occurred));
    if (error_occurred) {
      const char *err_msg = "R evaluation error";
      SEXP err_chars = Rf_asChar(result);
      if (err_chars != R_NilValue && err_chars != NA_STRING) {
        err_msg = CHAR(err_chars);
      }
      rmain_set_error(err_msg);
      UNPROTECT(3); /* result, parsed, src_vec */
      return R_NilValue;
    }
    /* Keep only the latest result protected across loop iterations. */
    if (i + 1 < n) {
      UNPROTECT(1);
    }
  }

  if (n > 0) {
    /* Leave result unprotected for the caller (no alloc before return). */
    UNPROTECT(3); /* result, parsed, src_vec */
  } else {
    UNPROTECT(2); /* parsed, src_vec */
  }
  return result;
}

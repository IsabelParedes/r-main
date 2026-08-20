include $(R_HOME)/etc/Makeconf

SRC_DIR = src
OBJECTS = $(SRC_DIR)/rmain_init.o $(SRC_DIR)/rmain_eval.o $(SRC_DIR)/untar.o

# Extra -I so headers resolve even if Makeconf CPPFLAGS has a stale host path.
ALL_CPPFLAGS = -I$(R_HOME)/include $(CPPFLAGS)

RUNTIME_METHODS = ccall,cwrap,FS,ENV,HEAPU8,getEnvStrings,TTY,UTF8ToString,stringToUTF8OnStack,stackAlloc,setValue,getValue
EXPORTED_FUNCTIONS = _main,_rmain_init,_rmain_eval,_rmain_last_error,_extractArchiveFromMemory,_malloc,_free

# Embed front-end MAIN flags (adapted from r-base config.site MAIN_LDFLAGS).
PRE_JS = $(SRC_DIR)/rmain_pre.js
POST_JS = $(SRC_DIR)/rmain_post.js

# All functions are exported with MAIN_MODULE=1.
RMAIN_LDFLAGS = -sMAIN_MODULE=1 \
	-sMODULARIZE=1 \
	-sEXPORT_NAME=Rmain \
	-sEXPORT_ES6=1 \
	-sINITIAL_MEMORY=128MB \
	-sSTACK_SIZE=32MB \
	-sALLOW_MEMORY_GROWTH=1 \
	-fwasm-exceptions \
	-sSUPPORT_LONGJMP=wasm \
	-sEXPORTED_FUNCTIONS=$(EXPORTED_FUNCTIONS) \
	-sEXPORTED_RUNTIME_METHODS=$(RUNTIME_METHODS) \
	-sFORCE_FILESYSTEM=1 \
	-sINVOKE_RUN=0 \
	-sERROR_ON_UNDEFINED_SYMBOLS=1 \
	--pre-js=$(PRE_JS) \
	--post-js=$(POST_JS)

bindir = $(PREFIX)/bin

.PHONY: all install clean

all: Rmain.js

$(SRC_DIR)/%.o: $(SRC_DIR)/%.c $(SRC_DIR)/rmain.h
	$(CC) $(ALL_CPPFLAGS) $(CFLAGS) $(CPICFLAGS) -c $< -o $@

Rmain.js: $(OBJECTS) $(PRE_JS) $(POST_JS)
	$(CC) $(CFLAGS) -o $@ $(OBJECTS) \
		$(RMAIN_LDFLAGS) $(LDFLAGS) \
		-L$(PREFIX)/lib \
		-larchive \
		-lzstd \
		$(R_HOME)/lib/libR.so \
		$(BLAS_LIBS) $(LAPACK_LIBS) $(FLIBS) $(LIBS) \
		-sEXPORTED_FUNCTIONS=$(EXPORTED_FUNCTIONS)

install: Rmain.js
	mkdir -p "$(bindir)"
	cp Rmain.js "$(bindir)/Rmain.js"
	cp Rmain.wasm "$(bindir)/Rmain.wasm"

clean:
	rm -f $(OBJECTS) Rmain.js Rmain.wasm

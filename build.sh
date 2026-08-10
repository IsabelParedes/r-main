#!/bin/bash

SCRIPT_DIR=$(cd $(dirname $0); pwd)
GLUE_DIR=$SCRIPT_DIR/glue


BUILD_PREFIX=$MAMBA_ROOT_PREFIX/envs/r-main-wasm-build
HOST_PREFIX=$MAMBA_ROOT_PREFIX/envs/r-main-wasm-host
RUN_PREFIX=$MAMBA_ROOT_PREFIX/envs/r-main-wasm-run

# delete shared libz.so
rm -f $HOST_PREFIX/lib/libz.so

export R_HOME=$HOST_PREFIX/lib/R
export R_SHARE_DIR=$R_HOME/share
export PREFIX=$HOST_PREFIX

ls $R_HOME/lib/

# make clean
make

# copy result to glue dir
echo "copy result to glue dir"
cp $HOST_PREFIX/lib/R/lib/libR.so  $GLUE_DIR/
cp $HOST_PREFIX/lib/R/lib/libRblas.so $GLUE_DIR/
cp $HOST_PREFIX/lib/R/lib/libRlapack.so $GLUE_DIR/

cp $SCRIPT_DIR/Rmain.js $GLUE_DIR/Rmain.js
cp $SCRIPT_DIR/Rmain.wasm $GLUE_DIR/Rmain.wasm



# pack the RUN_PREFIX via empack to multiple *.tar.gz files
# only if $GLUE_DIR/empack_env_meta.json does not exist
if [ ! -f $GLUE_DIR/empack_env_meta.json ]; then

    echo "pack the RUN_PREFIX via empack to multiple *.tar.gz files"
    empack pack env --env-prefix $RUN_PREFIX --outdir $GLUE_DIR
fi
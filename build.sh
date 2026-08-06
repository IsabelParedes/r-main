#!/bin/bash


HOST_PREFIX=$MAMBA_ROOT_PREFIX/envs/r-main-wasm-host
BUILD_PREFIX=$MAMBA_ROOT_PREFIX/envs/r-main-wasm-build

# delet shard libz.so
rm -f $HOST_PREFIX/lib/libz.so

export R_HOME=$HOST_PREFIX/lib/R
export R_SHARE_DIR=$R_HOME/share
export PREFIX=$HOST_PREFIX

ls $R_HOME/lib/

make clean 
make
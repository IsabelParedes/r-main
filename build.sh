#!/bin/bash


HOST_PREFIX=$MAMBA_ROOT_PREFIX/envs/r-main-wasm-host
BUILD_PREFIX=$MAMBA_ROOT_PREFIX/envs/r-main-wasm-build

export R_HOME=$HOST_PREFIX/lib/R
export R_SHARE_DIR=$R_HOME/share


make
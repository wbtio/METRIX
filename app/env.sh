#!/usr/bin/env bash
# Source this before building:  source ./env.sh
export JAVA_HOME="/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
echo "[env] JAVA_HOME=$JAVA_HOME"
echo "[env] ANDROID_HOME=$ANDROID_HOME"
java -version 2>&1 | head -1

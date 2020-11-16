#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

# Derived from the javascript-node container template here:
# https://github.com/microsoft/vscode-dev-containers/tree/master/containers/javascript-node

# [Choice] Node.js version: 14, 12, 10
ARG VARIANT="14-buster"
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:0-${VARIANT}

# Install Docker CLI / Docker-Compose and create '/usr/local/share/docker-init.sh' to proxy the
# docker socket.  (We retrieve the script from the 'docker-from-docker' dev container template)
RUN mkdir /tmp/library-scripts \
    && curl -o /tmp/library-scripts/docker-debian.sh -sS https://raw.githubusercontent.com/microsoft/vscode-dev-containers/c3214ad7fcf5086e898e3941a36e0171959a48ca/containers/azure-ansible/.devcontainer/library-scripts/docker-debian.sh \
    && /bin/bash /tmp/library-scripts/docker-debian.sh "${ENABLE_NONROOT_DOCKER}" "${SOURCE_SOCKET}" "${TARGET_SOCKET}" "node" \
    && rm -rf /tmp/library-scripts/

# Install additional desired packages here.  Base image includes the following:
#
#    eslint (global), node/npm, nvm, yarn, zsh (+ oh-my-zsh)
#    curl, g++, git, make, procps, python, wget
#
# (See https://github.com/microsoft/vscode-dev-containers/tree/master/containers/javascript-node/.devcontainer)

# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends \
#         vim

# Clean up after apt-get
RUN apt-get autoremove -y \
    && apt-get clean -y \
    && rm -rf /var/lib/apt/lists/*

USER node

# For convenience, install the Rush CLI globally.  Note that the '/bin/rush' script
# automatically installs and caches the versions of rush/pnpm specified in 'rush.json'
# in the project's '/common/temp' folder.  (i.e., the version of the globally installed
# '@microsoft/rush' package doesn't matter.)
RUN bash -ci "npm i -g @microsoft/rush"

# Install our custom .bashrc for colorized prompt and 'ls'
COPY ./.bashrc /home/node/

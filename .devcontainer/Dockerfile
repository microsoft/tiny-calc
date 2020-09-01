#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

# Based on the javascript-node container template here:
# https://github.com/microsoft/vscode-dev-containers/tree/master/containers/javascript-node

ARG NODE_VERSION=12
FROM mcr.microsoft.com/vscode/devcontainers/javascript-node:${NODE_VERSION}

# Install needed packages and setup non-root user. Use a separate RUN statement to add your own dependencies.
COPY library-scripts/*.sh /tmp/library-scripts/
RUN apt-get update \
    # Install Docker CLI / Docker-Compose and create 'docker-init.sh' to proxy docker socket.
    # && /bin/bash /tmp/library-scripts/docker-debian.sh "${ENABLE_NONROOT_DOCKER}" "${SOURCE_SOCKET}" "${TARGET_SOCKET}" "${USERNAME}" \
    # Clean up
    && apt-get autoremove -y && apt-get clean -y && rm -rf /var/lib/apt/lists/* /tmp/library-scripts/

# Setting the ENTRYPOINT to docker-init.sh will configure non-root access to
# the Docker socket if "overrideCommand": false is set in devcontainer.json.
# The script will also execute CMD if you need to alter startup behaviors.
ENTRYPOINT [ "/usr/local/share/docker-init.sh" ]
CMD [ "sleep", "infinity" ]

# For convenience, install the Rush CLI globally.  Note that the '/bin/rush' script
# automatically installs and caches the versions of rush/pnpm specified in 'rush.json'
# in the project's '/common/temp' folder.  (i.e., the version of the globally installed
# '@microsoft/rush' package doesn't matter.)
RUN bash -ci "npm i -g @microsoft/rush"

# [Optional] Uncomment this section to install additional OS packages.
# RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
#     && apt-get -y install --no-install-recommends <your-package-list-here>

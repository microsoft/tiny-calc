/*!
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

declare var crypto: any;

module.exports = crypto.getRandomValues.bind(crypto);

// Copyright 2026 Happy Technologies LLC
// SPDX-License-Identifier: Apache-2.0

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
const logger_1 = require("./logger");
async function withRetry(operation, options = {}) {
    const { maxAttempts = 3, initialDelay = 2000, maxDelay = 30000, backoffMultiplier = 2, operationName = 'operation', } = options;
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            logger_1.logger.debug(`Executing ${operationName}`, { attempt, maxAttempts });
            const result = await operation();
            if (attempt > 1) {
                logger_1.logger.info(`${operationName} succeeded after ${attempt} attempts`);
            }
            return result;
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts) {
                const delay = Math.min(initialDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay);
                logger_1.logger.warn(`${operationName} failed (attempt ${attempt}/${maxAttempts})`, {
                    _error: lastError.message,
                    _retryIn: `${delay}ms`,
                });
                await sleep(delay);
            }
            else {
                logger_1.logger.error(`${operationName} failed after ${maxAttempts} attempts`, {
                    _error: lastError.message,
                });
            }
        }
    }
    throw lastError;
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
//# sourceMappingURL=retry.js.map
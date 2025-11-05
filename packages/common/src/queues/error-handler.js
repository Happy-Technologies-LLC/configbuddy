"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobErrorHandler = exports.ErrorCategory = void 0;
exports.createErrorHandlerMiddleware = createErrorHandlerMiddleware;
const logger_1 = require("../utils/logger");
var ErrorCategory;
(function (ErrorCategory) {
    ErrorCategory["TRANSIENT"] = "transient";
    ErrorCategory["PERMANENT"] = "permanent";
    ErrorCategory["RESOURCE"] = "resource";
    ErrorCategory["SYSTEM"] = "system";
})(ErrorCategory || (exports.ErrorCategory = ErrorCategory = {}));
class JobErrorHandler {
    static classifyError(error) {
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('validation') ||
            errorMessage.includes('invalid') ||
            errorMessage.includes('unauthorized') ||
            errorMessage.includes('forbidden') ||
            errorMessage.includes('not found')) {
            return {
                _category: ErrorCategory.PERMANENT,
                shouldRetry: false,
                notifyAdmin: true,
            };
        }
        if (errorMessage.includes('rate limit') ||
            errorMessage.includes('quota exceeded') ||
            errorMessage.includes('too many requests')) {
            return {
                _category: ErrorCategory.RESOURCE,
                shouldRetry: true,
                retryDelay: 60000,
                notifyAdmin: false,
            };
        }
        if (errorMessage.includes('database') ||
            errorMessage.includes('connection') ||
            errorMessage.includes('service unavailable')) {
            return {
                _category: ErrorCategory.SYSTEM,
                shouldRetry: true,
                retryDelay: 30000,
                notifyAdmin: true,
            };
        }
        return {
            _category: ErrorCategory.TRANSIENT,
            shouldRetry: true,
            retryDelay: 5000,
            notifyAdmin: false,
        };
    }
    static async handleJobFailure(job, error) {
        const classification = this.classifyError(error);
        logger_1.logger.error(`Job ${job.id} failed`, {
            _jobName: job.name,
            _queueName: job.queueName,
            _error: error.message,
            _category: classification._category,
            _attemptsMade: job.attemptsMade,
            _data: job.data,
        });
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
            await this.sendToDeadLetterQueue(job, error, classification);
        }
        if (classification.notifyAdmin) {
            await this.notifyAdmin(job, error, classification);
        }
    }
    static async sendToDeadLetterQueue(_job, _error, _classification) {
        logger_1.logger.warn(`Job ${_job.id} moved to dead letter queue`, {
            _jobName: _job.name,
            _queueName: _job.queueName,
            _category: _classification._category,
        });
        await _job.log(`DEAD LETTER: ${_error.message}`);
        await _job.updateData({
            ..._job.data,
            __dlq: {
                _error: _error.message,
                _category: _classification._category,
                _timestamp: new Date().toISOString(),
                _attemptsMade: _job.attemptsMade,
            },
        });
    }
    static async notifyAdmin(_job, _error, _classification) {
        logger_1.logger.error(`ADMIN NOTIFICATION: Job ${_job.id} failed critically`, {
            _jobName: _job.name,
            _queueName: _job.queueName,
            _error: _error.message,
            _category: _classification._category,
            _data: _job.data,
        });
    }
    static getRetryDelay(_attemptsMade, _error) {
        const classification = this.classifyError(_error);
        if (!classification.shouldRetry) {
            return undefined;
        }
        if (classification.retryDelay) {
            return classification.retryDelay * Math.pow(2, _attemptsMade - 1);
        }
        return Math.min(2000 * Math.pow(2, _attemptsMade - 1), 60000);
    }
    static shouldRetryJob(job, error) {
        const classification = this.classifyError(error);
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
            return false;
        }
        return classification.shouldRetry;
    }
}
exports.JobErrorHandler = JobErrorHandler;
function createErrorHandlerMiddleware() {
    return {
        _onFailed: async (job, error) => {
            if (!job) {
                logger_1.logger.error('Job failed without job context', { error: error.message });
                return;
            }
            await JobErrorHandler.handleJobFailure(job, error);
        },
        _onStalled: async (jobId) => {
            logger_1.logger.warn(`Job ${jobId} stalled - may need manual intervention`);
        },
    };
}
//# sourceMappingURL=error-handler.js.map
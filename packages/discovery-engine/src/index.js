"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDiscoveryWorkerManager = exports.getDiscoveryScheduler = exports.NmapDiscoveryWorker = exports.SSHDiscoveryWorker = exports.GCPDiscoveryWorker = exports.AzureDiscoveryWorker = exports.AWSDiscoveryWorker = exports.DiscoveryOrchestrator = void 0;
exports.getDiscoveryOrchestrator = getDiscoveryOrchestrator;
var discovery_orchestrator_1 = require("./orchestrator/discovery-orchestrator");
Object.defineProperty(exports, "DiscoveryOrchestrator", { enumerable: true, get: function () { return discovery_orchestrator_1.DiscoveryOrchestrator; } });
var aws_discovery_worker_1 = require("./workers/aws-discovery.worker");
Object.defineProperty(exports, "AWSDiscoveryWorker", { enumerable: true, get: function () { return aws_discovery_worker_1.AWSDiscoveryWorker; } });
var azure_discovery_worker_1 = require("./workers/azure-discovery.worker");
Object.defineProperty(exports, "AzureDiscoveryWorker", { enumerable: true, get: function () { return azure_discovery_worker_1.AzureDiscoveryWorker; } });
var gcp_discovery_worker_1 = require("./workers/gcp-discovery.worker");
Object.defineProperty(exports, "GCPDiscoveryWorker", { enumerable: true, get: function () { return gcp_discovery_worker_1.GCPDiscoveryWorker; } });
var ssh_discovery_worker_1 = require("./workers/ssh-discovery.worker");
Object.defineProperty(exports, "SSHDiscoveryWorker", { enumerable: true, get: function () { return ssh_discovery_worker_1.SSHDiscoveryWorker; } });
var nmap_discovery_worker_1 = require("./workers/nmap-discovery.worker");
Object.defineProperty(exports, "NmapDiscoveryWorker", { enumerable: true, get: function () { return nmap_discovery_worker_1.NmapDiscoveryWorker; } });
let orchestratorInstance = null;
function getDiscoveryOrchestrator() {
    if (!orchestratorInstance) {
        orchestratorInstance = new DiscoveryOrchestrator();
    }
    return orchestratorInstance;
}
exports.getDiscoveryScheduler = getDiscoveryOrchestrator;
exports.getDiscoveryWorkerManager = getDiscoveryOrchestrator;
//# sourceMappingURL=index.js.map
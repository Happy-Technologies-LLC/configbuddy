import { Session } from 'neo4j-driver';
import { CI, CIInput } from '@cmdb/common';
export declare class Neo4jClient {
    private driver;
    constructor(uri: string, username: string, password: string, config?: {
        encrypted?: boolean;
        trust?: 'TRUST_ALL_CERTIFICATES' | 'TRUST_SYSTEM_CA_SIGNED_CERTIFICATES';
    });
    verifyConnectivity(): Promise<void>;
    initializeSchema(schemaFilePath?: string): Promise<void>;
    getSession(database?: string): Session;
    close(): Promise<void>;
    createCI(ci: CIInput): Promise<CI>;
    updateCI(id: string, updates: Partial<CIInput>): Promise<CI>;
    getCI(id: string): Promise<CI | null>;
    createRelationship(fromId: string, toId: string, type: string, properties?: Record<string, any>): Promise<void>;
    getRelationships(ciId: string, direction?: 'in' | 'out' | 'both', depth?: number): Promise<{
        _type: any;
        _ci: CI;
        _properties: any;
        _startNodeId: any;
        _endNodeId: any;
    }[]>;
    getDependencies(ciId: string, depth?: number): Promise<any[]>;
    impactAnalysis(ciId: string, depth?: number): Promise<{
        _ci: CI;
        _distance: any;
    }[]>;
    private recordToCI;
}
export declare function getNeo4jClient(): Neo4jClient;
//# sourceMappingURL=client.d.ts.map
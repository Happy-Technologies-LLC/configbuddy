import { UnifiedCredential } from '../types/unified-credential.types';
export interface AwsCredentialIdentity {
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken?: string;
    expiration?: Date;
}
export interface AzureClientSecretConfig {
    tenantId: string;
    clientId: string;
    clientSecret: string;
}
export interface GCPServiceAccountCredentials {
    type: 'service_account';
    project_id: string;
    private_key_id?: string;
    private_key: string;
    client_email: string;
    client_id?: string;
    auth_uri?: string;
    token_uri?: string;
    auth_provider_x509_cert_url?: string;
    client_x509_cert_url?: string;
}
export interface SSHConfig {
    host: string;
    port: number;
    username: string;
    privateKey?: string;
    passphrase?: string;
    password?: string;
}
export interface SNMPConfig {
    version: '2c' | '3';
    community?: string;
    username?: string;
    authProtocol?: string;
    authPassword?: string;
    privProtocol?: string;
    privPassword?: string;
}
export interface WinRMConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    transport: 'http' | 'https';
}
export interface KubernetesConfig {
    kubeconfigContent?: string;
    server?: string;
    token?: string;
    certificateAuthority?: string;
    namespace?: string;
    skipTLSVerify?: boolean;
}
export interface LDAPConfig {
    url: string;
    baseDN: string;
    bindDN: string;
    password: string;
    useSSL: boolean;
    port: number;
}
export interface RedfishConfig {
    host: string;
    username: string;
    password: string;
    port: number;
    verifySsl: boolean;
    timeout: number;
}
export interface ProxmoxConfig {
    username: string;
    password?: string;
    tokenId?: string;
    tokenSecret?: string;
}
export declare class CredentialProtocolAdapter {
    static toAWSCredentials(cred: UnifiedCredential): AwsCredentialIdentity;
    static toAzureCredentials(cred: UnifiedCredential): AzureClientSecretConfig;
    static toGCPCredentials(cred: UnifiedCredential): GCPServiceAccountCredentials;
    static toSSHConfig(cred: UnifiedCredential, host: string): SSHConfig;
    static toSNMPConfig(cred: UnifiedCredential): SNMPConfig;
    static toAPIHeaders(cred: UnifiedCredential): Record<string, string>;
    static toWinRMConfig(cred: UnifiedCredential, host: string): WinRMConfig;
    static toKubernetesConfig(cred: UnifiedCredential): KubernetesConfig;
    static toLDAPConfig(cred: UnifiedCredential): LDAPConfig;
    static toRedfishConfig(cred: UnifiedCredential, host: string): RedfishConfig;
    static toProxmoxConfig(cred: UnifiedCredential): ProxmoxConfig;
    static validate(cred: UnifiedCredential): boolean;
    static getSupportedProtocols(): string[];
    static isProtocolSupported(protocol: string): boolean;
}
export default CredentialProtocolAdapter;
//# sourceMappingURL=credential-protocol-adapter.d.ts.map
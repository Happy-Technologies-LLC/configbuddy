"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CredentialProtocolAdapter = void 0;
class CredentialProtocolAdapter {
    static toAWSCredentials(cred) {
        if (cred.protocol !== 'aws_iam') {
            throw new Error(`Invalid protocol for AWS: ${cred.protocol}. Expected aws_iam.`);
        }
        const { access_key_id, secret_access_key, session_token } = cred.credentials;
        if (!access_key_id || !secret_access_key) {
            throw new Error('AWS IAM credentials must include access_key_id and secret_access_key');
        }
        return {
            accessKeyId: access_key_id,
            secretAccessKey: secret_access_key,
            sessionToken: session_token,
        };
    }
    static toAzureCredentials(cred) {
        if (cred.protocol !== 'azure_sp') {
            throw new Error(`Invalid protocol for Azure: ${cred.protocol}. Expected azure_sp.`);
        }
        const { tenant_id, client_id, client_secret } = cred.credentials;
        if (!tenant_id || !client_id || !client_secret) {
            throw new Error('Azure Service Principal credentials must include tenant_id, client_id, and client_secret');
        }
        return {
            tenantId: tenant_id,
            clientId: client_id,
            clientSecret: client_secret,
        };
    }
    static toGCPCredentials(cred) {
        if (cred.protocol !== 'gcp_sa') {
            throw new Error(`Invalid protocol for GCP: ${cred.protocol}. Expected gcp_sa.`);
        }
        const { project_id, private_key, client_email } = cred.credentials;
        if (!project_id || !private_key || !client_email) {
            throw new Error('GCP Service Account credentials must include project_id, private_key, and client_email');
        }
        return {
            type: 'service_account',
            project_id,
            private_key,
            client_email,
            ...cred.credentials,
        };
    }
    static toSSHConfig(cred, host) {
        if (!['ssh_key', 'ssh_password'].includes(cred.protocol)) {
            throw new Error(`Invalid protocol for SSH: ${cred.protocol}. Expected ssh_key or ssh_password.`);
        }
        const { username, port } = cred.credentials;
        if (!username) {
            throw new Error('SSH credentials must include username');
        }
        const config = {
            host,
            port: port || 22,
            username,
        };
        if (cred.protocol === 'ssh_key') {
            const { private_key, passphrase } = cred.credentials;
            if (!private_key) {
                throw new Error('SSH key credentials must include private_key');
            }
            config.privateKey = private_key;
            config.passphrase = passphrase;
        }
        else {
            const { password } = cred.credentials;
            if (!password) {
                throw new Error('SSH password credentials must include password');
            }
            config.password = password;
        }
        return config;
    }
    static toSNMPConfig(cred) {
        if (cred.protocol === 'snmp_v2c') {
            const { community_string } = cred.credentials;
            if (!community_string) {
                throw new Error('SNMP v2c credentials must include community_string');
            }
            return {
                version: '2c',
                community: community_string,
            };
        }
        else if (cred.protocol === 'snmp_v3') {
            const { username, auth_protocol, auth_password, priv_protocol, priv_password, } = cred.credentials;
            if (!username || !auth_protocol || !auth_password) {
                throw new Error('SNMP v3 credentials must include username, auth_protocol, and auth_password');
            }
            return {
                version: '3',
                username,
                authProtocol: auth_protocol,
                authPassword: auth_password,
                privProtocol: priv_protocol,
                privPassword: priv_password,
            };
        }
        throw new Error(`Invalid SNMP protocol: ${cred.protocol}`);
    }
    static toAPIHeaders(cred) {
        switch (cred.protocol) {
            case 'api_key': {
                const { key, header_name } = cred.credentials;
                if (!key) {
                    throw new Error('API key credentials must include key');
                }
                const headerName = header_name || 'X-API-Key';
                return { [headerName]: key };
            }
            case 'bearer': {
                const { token } = cred.credentials;
                if (!token) {
                    throw new Error('Bearer credentials must include token');
                }
                return { Authorization: `Bearer ${token}` };
            }
            case 'basic': {
                const { username, password } = cred.credentials;
                if (!username || !password) {
                    throw new Error('Basic auth credentials must include username and password');
                }
                const encoded = Buffer.from(`${username}:${password}`).toString('base64');
                return { Authorization: `Basic ${encoded}` };
            }
            default:
                throw new Error(`Unsupported API protocol: ${cred.protocol}`);
        }
    }
    static toWinRMConfig(cred, host) {
        if (cred.protocol !== 'winrm') {
            throw new Error(`Invalid protocol for WinRM: ${cred.protocol}. Expected winrm.`);
        }
        const { username, password, port, transport } = cred.credentials;
        if (!username || !password) {
            throw new Error('WinRM credentials must include username and password');
        }
        return {
            host,
            port: port || 5985,
            username,
            password,
            transport: transport || 'http',
        };
    }
    static toKubernetesConfig(cred) {
        if (cred.protocol !== 'kubernetes') {
            throw new Error(`Invalid protocol for Kubernetes: ${cred.protocol}. Expected kubernetes.`);
        }
        const { kubeconfig_content, server, token, certificate_authority, namespace, skip_tls_verify, } = cred.credentials;
        if (!kubeconfig_content && (!server || !token)) {
            throw new Error('Kubernetes credentials must include either kubeconfig_content or both server and token');
        }
        return {
            kubeconfigContent: kubeconfig_content,
            server,
            token,
            certificateAuthority: certificate_authority,
            namespace: namespace || 'default',
            skipTLSVerify: skip_tls_verify || false,
        };
    }
    static toLDAPConfig(cred) {
        if (cred.protocol !== 'ldap') {
            throw new Error(`Invalid protocol for LDAP: ${cred.protocol}. Expected ldap.`);
        }
        const { domain, base_dn, username, password, use_ssl, port } = cred.credentials;
        if (!domain || !base_dn || !username || !password) {
            throw new Error('LDAP credentials must include domain, base_dn, username, and password');
        }
        const useSSL = use_ssl !== undefined ? use_ssl : true;
        const ldapPort = port || (useSSL ? 636 : 389);
        const protocol = useSSL ? 'ldaps' : 'ldap';
        const url = domain.startsWith('ldap://') || domain.startsWith('ldaps://')
            ? domain
            : `${protocol}://${domain}:${ldapPort}`;
        return {
            url,
            baseDN: base_dn,
            bindDN: username,
            password,
            useSSL,
            port: ldapPort,
        };
    }
    static toRedfishConfig(cred, host) {
        if (cred.protocol !== 'redfish') {
            throw new Error(`Invalid protocol for Redfish: ${cred.protocol}. Expected redfish.`);
        }
        const { username, password, port, verify_ssl, timeout } = cred.credentials;
        if (!username || !password) {
            throw new Error('Redfish credentials must include username and password');
        }
        return {
            host,
            username,
            password,
            port: port || 443,
            verifySsl: verify_ssl !== undefined ? verify_ssl : false,
            timeout: timeout || 30000,
        };
    }
    static toProxmoxConfig(cred) {
        if (cred.protocol !== 'proxmox') {
            throw new Error(`Invalid protocol for Proxmox: ${cred.protocol}. Expected proxmox.`);
        }
        const { username, password, token_id, token_secret } = cred.credentials;
        if (!username) {
            throw new Error('Proxmox credentials must include username');
        }
        if (!password && !(token_id && token_secret)) {
            throw new Error('Proxmox credentials must include either password or both token_id and token_secret');
        }
        return {
            username,
            password,
            tokenId: token_id,
            tokenSecret: token_secret,
        };
    }
    static validate(cred) {
        if (!cred.protocol) {
            throw new Error('Credential must have a protocol');
        }
        if (!cred.credentials || typeof cred.credentials !== 'object') {
            throw new Error('Credential must have a credentials object');
        }
        switch (cred.protocol) {
            case 'aws_iam':
                this.toAWSCredentials(cred);
                break;
            case 'azure_sp':
                this.toAzureCredentials(cred);
                break;
            case 'gcp_sa':
                this.toGCPCredentials(cred);
                break;
            case 'ssh_key':
            case 'ssh_password':
                this.toSSHConfig(cred, 'validation-host');
                break;
            case 'snmp_v2c':
            case 'snmp_v3':
                this.toSNMPConfig(cred);
                break;
            case 'api_key':
            case 'bearer':
            case 'basic':
                this.toAPIHeaders(cred);
                break;
            case 'winrm':
                this.toWinRMConfig(cred, 'validation-host');
                break;
            case 'kubernetes':
                this.toKubernetesConfig(cred);
                break;
            case 'ldap':
                this.toLDAPConfig(cred);
                break;
            case 'redfish':
                this.toRedfishConfig(cred, 'validation-host');
                break;
            case 'proxmox':
                this.toProxmoxConfig(cred);
                break;
            case 'oauth2':
            case 'certificate':
            case 'kerberos':
                throw new Error(`Protocol ${cred.protocol} is not yet supported by the adapter`);
            default:
                throw new Error(`Unknown protocol: ${cred.protocol}`);
        }
        return true;
    }
    static getSupportedProtocols() {
        return [
            'aws_iam',
            'azure_sp',
            'gcp_sa',
            'ssh_key',
            'ssh_password',
            'snmp_v2c',
            'snmp_v3',
            'api_key',
            'bearer',
            'basic',
            'winrm',
            'kubernetes',
            'ldap',
            'redfish',
            'proxmox',
        ];
    }
    static isProtocolSupported(protocol) {
        return this.getSupportedProtocols().includes(protocol);
    }
}
exports.CredentialProtocolAdapter = CredentialProtocolAdapter;
exports.default = CredentialProtocolAdapter;
//# sourceMappingURL=credential-protocol-adapter.js.map
export interface EncryptedData {
    iv: string;
    encryptedData: string;
    authTag: string;
}
export declare class EncryptionService {
    private readonly algorithm;
    private readonly ivLength;
    private readonly keyLength;
    private readonly encryptionKey;
    constructor(masterKey?: string);
    encrypt(plaintext: string): EncryptedData;
    decrypt(encrypted: EncryptedData): string;
    encryptCredential(credential: any): string;
    decryptCredential(encryptedString: string): any;
    redactCredential(credential: any): any;
}
export declare function getEncryptionService(masterKey?: string): EncryptionService;
export declare function resetEncryptionService(): void;
//# sourceMappingURL=encryption.service.d.ts.map
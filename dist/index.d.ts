type GetDataFromWalletErrors = Record<string, string[]>;
interface GetDataFromWalletResult {
    success: boolean;
    data: ProfileData | null;
    errors?: GetDataFromWalletErrors;
}
interface GetDataFromWalletOptions {
    certifiers?: string[];
    connectionTypes?: string[];
    profileType?: string;
    basket?: string;
}
interface ProvidedCertificate {
    type: string;
    keyring: any;
    fields: any;
    certifier: string;
}
interface ConnectionData {
    type: string;
    url: string;
    verified: boolean;
}
interface ProfileData {
    displayName: string;
    description: string;
    locationLng: number;
    locationLat: number;
    email: string;
    phoneNumber: string;
    imageKey: string | null;
    privateFields: string[];
    websites: Array<{
        id: string;
        type: string;
        url: string;
        makePublic: boolean;
    }>;
    connections: ConnectionData[];
}
/**
 * Checks if user has a certificate and fetches profile data from wallet
 * Returns profile data if certificate exists, null if no certificate
 */
declare function getDataFromWallet(userWallet: any, options?: GetDataFromWalletOptions, certificate?: ProvidedCertificate): Promise<GetDataFromWalletResult>;

export { type ConnectionData, type GetDataFromWalletErrors, type GetDataFromWalletOptions, type GetDataFromWalletResult, type ProfileData, type ProvidedCertificate, getDataFromWallet };

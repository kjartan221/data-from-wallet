import { MasterCertificate, Utils } from "@bsv/sdk";

export type GetDataFromWalletErrors = Record<string, string[]>;

export interface GetDataFromWalletResult {
    success: boolean;
    data: ProfileData | null;
    errors?: GetDataFromWalletErrors;
}

export interface GetDataFromWalletOptions {
    certifiers?: string[];
    connectionTypes?: string[];
    profileType?: string;
    basket?: string;
}

export interface ConnectionData {
    type: string;
    url: string;
    verified: boolean;
}

export interface ProfileData {
    displayName: string;
    description: string;
    locationLng: number;
    locationLat: number;
    email: string;
    phoneNumber: string;
    imageKey: string | null; // S3 key from token
    privateFields: string[];
    websites: Array<{ id: string; type: string; url: string; makePublic: boolean }>;
    connections: ConnectionData[];
}

/**
 * Checks if user has a certificate and fetches profile data from wallet
 * Returns profile data if certificate exists, null if no certificate
 */
export async function getDataFromWallet(userWallet: any, options?: GetDataFromWalletOptions): Promise<GetDataFromWalletResult> {
    const errors: GetDataFromWalletErrors = {};
    const addError = (key: string, message: string) => {
        (errors[key] ??= []).push(message);
    };

    return getDataFromWalletWithOptions(userWallet, options, errors, addError);
}

async function getDataFromWalletWithOptions(
    userWallet: any,
    options: GetDataFromWalletOptions | undefined,
    errors: GetDataFromWalletErrors,
    addError: (key: string, message: string) => void
): Promise<GetDataFromWalletResult> {

    if (!userWallet) {
        addError('wallet', 'No wallet available');
        return {
            success: false,
            data: null,
            errors,
        };
    }

    try {
        const profileType = typeof options?.profileType === 'string' && options.profileType.trim() !== ''
            ? options.profileType : null;

        if (!profileType) {
            addError('config', 'No profile type provided');
            const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
            return {
                success: false,
                data: null,
                errors: maybeErrors,
            };
        }

        const basket = typeof options?.basket === 'string' && options.basket.trim() !== ''
            ? options.basket
            : null;

        if (!basket) {
            addError('config', 'No basket provided');
            const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
            return {
                success: false,
                data: null,
                errors: maybeErrors,
            };
        }
        
        const profileCertTypeB64 = Utils.toBase64(Utils.toArray(profileType));

        const extractConnectionTypeName = (certType: string): string => {
            if (certType.includes('LinkedIn')) return 'LinkedIn';
            if (certType.includes('Twitter')) return 'Twitter';
            if (certType.includes('Instagram')) return 'Instagram';
            if (certType.includes('Telegram')) return 'Telegram';
            if (certType.includes('Discord')) return 'Discord';
            return certType; // fallback to original
        };

        const connectionTypes = (options?.connectionTypes ?? []).filter(
            (type): type is string => typeof type === 'string' && type.trim() !== ''
        );

        const certifiers = (options?.certifiers ?? []).filter(
            (key): key is string => typeof key === 'string' && key.trim() !== ''
        );

        if (certifiers.length === 0) {
            addError('config', 'No certifiers provided');
            const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
            return {
                success: false,
                data: null,
                errors: maybeErrors,
            };
        }

        const connectionTypesB64 = connectionTypes.map((connType) => Utils.toBase64(Utils.toArray(connType)));
        const requestedTypesB64 = [profileCertTypeB64, ...connectionTypesB64];
        const certificates = await userWallet.listCertificates({
            certifiers,
            types: requestedTypesB64,
            limit: Math.max(10, requestedTypesB64.length * 3),
        });

        const certificate = certificates.certificates.find((c: any) => c.type === profileCertTypeB64);

        if (!certificate) {
            addError('certificate', 'No certificate found');
            const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
            return {
                success: false,
                data: null,
                errors: maybeErrors,
            };
        }

        // Decrypt certificate fields and verify them before signing
        const decryptedFields = await MasterCertificate.decryptFields(
            userWallet,
            certificate.keyring,
            certificate.fields,
            certificate.certifier
        );

        // Now get the rest of the data from token
        const token = await userWallet.listOutputs({
            basket,
            includeCustomInstructions: true,
            limit: 1,
        });

        if (token.outputs.length === 0) {
            addError('token', 'No token found');
            const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
            return {
                success: false,
                data: null,
                errors: maybeErrors,
            };
        }

        const output = token.outputs[0];
        let tokenData: any;
        try {
            tokenData = JSON.parse(output.customInstructions);
        } catch {
            addError('token', 'Invalid token customInstructions JSON');
            const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
            return {
                success: false,
                data: null,
                errors: maybeErrors,
            };
        }

        // Fetch connections and check for verification certificates
        const connections: ConnectionData[] = [];

        for (let i = 0; i < connectionTypes.length; i++) {
            const connType = connectionTypes[i];
            try {
                const connTypeB64 = connectionTypesB64[i];
                const connCert = certificates.certificates.find((c: any) => c.type === connTypeB64);

                if (connCert) {
                    // Decrypt the connection URL from certificate
                    const connFields = await MasterCertificate.decryptFields(
                        userWallet,
                        connCert.keyring,
                        connCert.fields,
                        connCert.certifier
                    );

                    if (connFields.url) {
                        connections.push({
                            type: extractConnectionTypeName(connType),
                            url: connFields.url,
                            verified: true,
                        });
                    }
                }
            } catch (error) {
                addError(
                    'connections',
                    `Error checking ${connType} certificate${error instanceof Error && error.message ? `: ${error.message}` : ''}`
                );
            }
        }

        // Build actual response data
        const profileData: ProfileData = {
            displayName: decryptedFields.displayName,
            description: tokenData.description || '',
            locationLng: Number(decryptedFields.lng),
            locationLat: Number(decryptedFields.lat),
            email: decryptedFields.email,
            phoneNumber: decryptedFields.phoneNumber,
            imageKey: tokenData.imageKey || null,
            privateFields: tokenData.privateFields || [],
            websites: tokenData.websites || [],
            connections,
        };

        const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
        return {
            success: true,
            data: profileData,
            errors: maybeErrors,
        };

    } catch (error) {
        addError('unknown', error instanceof Error ? error.message : 'Unknown error');
        const maybeErrors = Object.keys(errors).length > 0 ? errors : undefined;
        return {
            success: false,
            data: null,
            errors: maybeErrors,
        };
    }
}
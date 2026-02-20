// Crypto Service
// Handles key generation and signing

export const generateKeys = async () => {
    // Placeholder — real ECDSA keypair via backend /auth/generate-keys
    return { publicKey: null, privateKey: null };
};

export const signTransaction = async (payload, privateKey) => {
    // If no real private key, return simulated signature
    if (!privateKey) {
        return `simulated_sig_${Date.now()}`;
    }
    // In production, use ECDSA signing here
    return `signed_${payload.slice(0, 16)}_${Date.now()}`;
};

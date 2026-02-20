import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from './apiConfig';

const ppayClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
});

/**
 * Resolve a PrahariPay handle (e.g. "alice@ppay" or "alice") to a user profile.
 */
export const resolvePpayId = async (ppayId) => {
    const normalized = ppayId.trim().toLowerCase();
    const response = await ppayClient.get(`/auth/resolve-ppay/${encodeURIComponent(normalized)}`);
    return response.data;
};

export const getPpayErrorMessage = (error, fallback = 'Unknown error') => {
    if (!error) return fallback;

    if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
            return 'Request timed out. Check your connection.';
        }
        if (!error.response) {
            return `Cannot reach backend at ${API_BASE_URL}.`;
        }
        const detail = error.response.data?.detail;
        if (typeof detail === 'string' && detail.trim()) return detail;
    }

    return fallback;
};

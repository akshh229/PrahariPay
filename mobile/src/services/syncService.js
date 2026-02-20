import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from './apiConfig';

const DEV_FALLBACK_BASE_URLS = __DEV__
    ? ['http://127.0.0.1:8000/api/v1', 'http://10.0.2.2:8000/api/v1']
    : [];

const candidateBaseUrls = Array.from(
    new Set([
        API_BASE_URL,
        ...DEV_FALLBACK_BASE_URLS,
    ].filter(Boolean))
);

const getErrorDetail = (error) => {
    if (!axios.isAxiosError(error)) {
        return null;
    }

    const detail = error.response?.data?.detail;
    if (typeof detail === 'string' && detail.trim().length > 0) {
        return detail;
    }

    if (Array.isArray(detail) && detail[0]?.msg) {
        return detail[0].msg;
    }

    return null;
};

export const getSyncErrorMessage = (error) => {
    const detail = getErrorDetail(error);
    if (detail) {
        return detail;
    }

    if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
            return 'Sync timed out. Check backend connection and retry.';
        }
        if (!error.response) {
            return `Could not reach backend. Tried: ${candidateBaseUrls.join(', ')}`;
        }
        const status = error.response?.status;
        const urlTried = error.config?.baseURL || error.config?.url || 'unknown URL';
        return `Sync failed with status ${status} from ${urlTried}`;
    }

    return error instanceof Error
        ? `Sync failed: ${error.message}`
        : 'Could not connect to server. Try again later.';
};

const postSync = async (transactions) => {
    let lastError = null;

    for (const baseURL of candidateBaseUrls) {
        const syncClient = axios.create({
            baseURL,
            timeout: API_TIMEOUT_MS,
        });

        try {
            const response = await syncClient.post('/sync', transactions);
            return response.data;
        } catch (error) {
            lastError = error;

            if (axios.isAxiosError(error) && error.response) {
                throw error;
            }
        }
    }

    throw lastError || new Error('Sync failed');
};

export const syncTransactions = async (transactions) => {
    return postSync(transactions);
};

export const syncSingleTransaction = async (transaction) => {
    return postSync([transaction]);
};

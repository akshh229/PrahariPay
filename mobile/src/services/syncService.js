import axios from 'axios';
import { API_BASE_URL, API_TIMEOUT_MS } from './apiConfig';

const candidateBaseUrls = Array.from(
    new Set([
        API_BASE_URL,
        'http://127.0.0.1:8000/api/v1',
        'http://10.0.2.2:8000/api/v1',
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
    }

    return 'Could not connect to server. Try again later.';
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

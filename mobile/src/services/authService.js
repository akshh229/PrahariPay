import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT_MS } from './apiConfig';
import { setBalance } from './ledgerService';

const authClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: API_TIMEOUT_MS,
});

export const getAuthErrorMessage = (error, fallbackMessage) => {
    if (!error) {
        return fallbackMessage;
    }

    if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNABORTED') {
            return 'Request timed out. Check backend/network and try again.';
        }

        if (!error.response) {
            return `Cannot reach backend at ${API_BASE_URL}. Ensure backend is running and accessible from this device.`;
        }

        const detail = error.response.data?.detail;

        if (Array.isArray(detail) && detail.length > 0) {
            const firstDetail = detail[0];
            if (typeof firstDetail?.msg === 'string' && firstDetail.msg.trim().length > 0) {
                return firstDetail.msg;
            }
        }

        if (typeof detail === 'string' && detail.trim().length > 0) {
            return detail;
        }
    }

    return fallbackMessage;
};

export const loginUser = async (username, password) => {
    const response = await authClient.post('/auth/login', { username, password });
    await AsyncStorage.setItem('access_token', response.data.access_token);
    await AsyncStorage.setItem('refresh_token', response.data.refresh_token);
    await AsyncStorage.setItem('user_id', response.data.user_id);
    await AsyncStorage.setItem('username', response.data.username);

    try {
        const profile = await authClient.get('/auth/profile', {
            headers: { Authorization: `Bearer ${response.data.access_token}` },
        });
        if (typeof profile?.data?.balance === 'number') {
            await setBalance(profile.data.balance);
        }
    } catch {
        // keep login successful even if profile refresh fails
    }

    return response.data;
};

export const registerUser = async (username, password, isMerchant = true) => {
    const response = await authClient.post('/auth/register', {
        username,
        password,
        is_merchant: isMerchant,
    });
    return response.data;
};

export const logoutUser = async () => {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_id', 'username']);
};

export const getCurrentUsername = async () => {
    return AsyncStorage.getItem('username');
};

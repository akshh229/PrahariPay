import { Platform } from 'react-native';
import Constants from 'expo-constants';

const MANUAL_API_URL = process.env.EXPO_PUBLIC_API_URL;
const USE_LAN_DEV = String(process.env.EXPO_PUBLIC_USE_LAN || '').toLowerCase() === 'true';
const PROD_API_URL = 'https://praharipay.onrender.com/api/v1';
const DEFAULT_DEV_API_URL = 'http://172.22.216.121:8000/api/v1';

const isPrivateIpv4 = (value) => {
    if (typeof value !== 'string') return false;
    return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(value);
};

const normalizeApiBaseUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    return trimmed.replace(/\/+$/, '');
};

const extractExpoHost = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoGo?.debuggerHost ||
        Constants.manifest?.debuggerHost;

    if (!hostUri || typeof hostUri !== 'string') {
        return null;
    }

    const host = hostUri.split(':')[0];
    return isPrivateIpv4(host) ? host : null;
};

export const resolveApiBaseUrl = () => {
    const manual = normalizeApiBaseUrl(MANUAL_API_URL);
    if (manual) {
        return manual;
    }

    if (__DEV__ && USE_LAN_DEV) {
        const expoHost = extractExpoHost();
        if (expoHost) {
            return `http://${expoHost}:8000/api/v1`;
        }

        if (DEFAULT_DEV_API_URL) {
            return DEFAULT_DEV_API_URL;
        }

        if (Platform.OS === 'android') {
            return 'http://10.0.2.2:8000/api/v1';
        }

        return 'http://127.0.0.1:8000/api/v1';
    }

    return PROD_API_URL;
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_TIMEOUT_MS = 10000;
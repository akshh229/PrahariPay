import { Platform } from 'react-native';
import Constants from 'expo-constants';

const MANUAL_API_URL = process.env.EXPO_PUBLIC_API_URL;

const extractExpoHost = () => {
    const hostUri =
        Constants.expoConfig?.hostUri ||
        Constants.manifest2?.extra?.expoGo?.debuggerHost ||
        Constants.manifest?.debuggerHost;

    if (!hostUri || typeof hostUri !== 'string') {
        return null;
    }

    return hostUri.split(':')[0];
};

export const resolveApiBaseUrl = () => {
    if (MANUAL_API_URL && typeof MANUAL_API_URL === 'string') {
        return MANUAL_API_URL.replace(/\/+$/, '');
    }

    const expoHost = extractExpoHost();
    if (expoHost) {
        return `http://${expoHost}:8000/api/v1`;
    }

    if (Platform.OS === 'android') {
        return 'http://10.0.2.2:8000/api/v1';
    }

    return 'http://127.0.0.1:8000/api/v1';
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_TIMEOUT_MS = 10000;
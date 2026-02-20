import AsyncStorage from '@react-native-async-storage/async-storage';

const LEDGER_KEY = 'praharipay_ledger';
const BALANCE_KEY = 'praharipay_balance';
const OFFLINE_KEY = 'praharipay_offline';

const DEFAULT_BALANCE = 100000;

const scopedKey = async (baseKey) => {
    const userId = await AsyncStorage.getItem('user_id');
    return userId ? `${baseKey}:${userId}` : baseKey;
};

const readWithLegacyFallback = async (baseKey) => {
    const userScoped = await scopedKey(baseKey);
    const scopedVal = await AsyncStorage.getItem(userScoped);
    if (scopedVal !== null) {
        return { key: userScoped, value: scopedVal };
    }

    const legacyVal = await AsyncStorage.getItem(baseKey);
    if (legacyVal !== null && userScoped !== baseKey) {
        await AsyncStorage.setItem(userScoped, legacyVal);
        return { key: userScoped, value: legacyVal };
    }

    return { key: userScoped, value: null };
};

// --- Balance ---
export const getBalance = async () => {
    const { value: stored } = await readWithLegacyFallback(BALANCE_KEY);
    return stored ? parseFloat(stored) : DEFAULT_BALANCE;
};

export const setBalance = async (amount) => {
    const key = await scopedKey(BALANCE_KEY);
    await AsyncStorage.setItem(key, amount.toString());
};

// --- Offline Mode ---
export const isOfflineMode = async () => {
    const { value: val } = await readWithLegacyFallback(OFFLINE_KEY);
    return val === 'true';
};

export const setOfflineMode = async (enabled) => {
    const key = await scopedKey(OFFLINE_KEY);
    await AsyncStorage.setItem(key, enabled ? 'true' : 'false');
};

// --- Transactions ---
export const getTransactions = async () => {
    const { value: data } = await readWithLegacyFallback(LEDGER_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveTransaction = async (tx) => {
    const existing = await getTransactions();
    existing.push(tx);
    const key = await scopedKey(LEDGER_KEY);
    await AsyncStorage.setItem(key, JSON.stringify(existing));
};

export const updateTransaction = async (txId, updates) => {
    const existing = await getTransactions();
    const updated = existing.map((tx) =>
        tx.transaction_id === txId ? { ...tx, ...updates } : tx
    );
    const key = await scopedKey(LEDGER_KEY);
    await AsyncStorage.setItem(key, JSON.stringify(updated));
};

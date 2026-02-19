import AsyncStorage from '@react-native-async-storage/async-storage';

const LEDGER_KEY = 'praharipay_ledger';
const BALANCE_KEY = 'praharipay_balance';
const OFFLINE_KEY = 'praharipay_offline';

const DEFAULT_BALANCE = 10000;

// --- Balance ---
export const getBalance = async () => {
    const stored = await AsyncStorage.getItem(BALANCE_KEY);
    return stored ? parseFloat(stored) : DEFAULT_BALANCE;
};

export const setBalance = async (amount) => {
    await AsyncStorage.setItem(BALANCE_KEY, amount.toString());
};

// --- Offline Mode ---
export const isOfflineMode = async () => {
    const val = await AsyncStorage.getItem(OFFLINE_KEY);
    return val === 'true';
};

export const setOfflineMode = async (enabled) => {
    await AsyncStorage.setItem(OFFLINE_KEY, enabled ? 'true' : 'false');
};

// --- Transactions ---
export const getTransactions = async () => {
    const data = await AsyncStorage.getItem(LEDGER_KEY);
    return data ? JSON.parse(data) : [];
};

export const saveTransaction = async (tx) => {
    const existing = await getTransactions();
    existing.push(tx);
    await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(existing));
};

export const updateTransaction = async (txId, updates) => {
    const existing = await getTransactions();
    const updated = existing.map((tx) =>
        tx.transaction_id === txId ? { ...tx, ...updates } : tx
    );
    await AsyncStorage.setItem(LEDGER_KEY, JSON.stringify(updated));
};

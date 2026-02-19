import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert, ScrollView } from 'react-native';
import { getBalance, getTransactions, isOfflineMode, setOfflineMode } from '../services/ledgerService';
import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';

export default function DashboardScreen({ navigation }) {
    const [balance, setBalance] = useState(10000);
    const [offline, setOffline] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [transactionCount, setTransactionCount] = useState(0);
    const [lastRisk, setLastRisk] = useState('No alerts');

    useEffect(() => {
        const load = async () => {
            const bal = await getBalance();
            const mode = await isOfflineMode();
            const txs = await getTransactions();

            const pending = txs.filter((tx) => !tx.synced).length;
            const latestRiskTx = [...txs].reverse().find((tx) => tx.classification && tx.classification !== 'Valid');

            setBalance(bal);
            setOffline(mode);
            setPendingCount(pending);
            setTransactionCount(txs.length);
            setLastRisk(latestRiskTx ? latestRiskTx.classification : 'No alerts');
        };
        load();
    }, []);

    const toggleOffline = async (val) => {
        await setOfflineMode(val);
        setOffline(val);
        Alert.alert(val ? '📴 Offline Mode Enabled' : '🌐 Online Mode Enabled');
    };

    return (
        <AnimatedScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>PrahariPay Wallet</Text>
                    <Text style={styles.subtitle}>Secure offline-first payments</Text>
                </View>
                <View style={styles.modeRow}>
                    <Text style={styles.modeLabel}>{offline ? 'Offline' : 'Online'}</Text>
                    <Switch
                        value={offline}
                        onValueChange={toggleOffline}
                        trackColor={{ false: '#334155', true: '#0ea5e9' }}
                        thumbColor={offline ? '#38bdf8' : '#64748b'}
                    />
                </View>
            </View>

            <View style={styles.balanceCard}>
                <Text style={styles.balanceLabel}>Available Balance</Text>
                <Text style={styles.balanceAmount}>₹{balance.toLocaleString()}</Text>
                <Text style={styles.creditLabel}>Protected offline credit: ₹2,000</Text>
                <View style={styles.balanceMetaRow}>
                    <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>{pendingCount} pending sync</Text>
                    </View>
                    <View style={styles.metaBadge}>
                        <Text style={styles.metaBadgeText}>{transactionCount} total tx</Text>
                    </View>
                </View>
            </View>

            <View style={styles.actions}>
                <AnimatedPressable
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('ScanQR')}
                >
                    <Text style={styles.actionIcon}>📷</Text>
                    <Text style={styles.actionText}>Scan & Pay</Text>
                </AnimatedPressable>

                <AnimatedPressable
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('Ledger')}
                >
                    <Text style={styles.actionIcon}>📒</Text>
                    <Text style={styles.actionText}>Ledger</Text>
                </AnimatedPressable>

                <AnimatedPressable
                    style={[styles.actionBtn, styles.syncBtn]}
                    onPress={() => navigation.navigate('Sync')}
                >
                    <Text style={styles.actionIcon}>🔄</Text>
                    <Text style={styles.actionText}>Sync</Text>
                </AnimatedPressable>
            </View>

            <View style={styles.statusBar}>
                <View style={styles.statusItem}>
                    <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                    <Text style={styles.statusText}>AI Guard active</Text>
                </View>
                <View style={styles.statusItem}>
                    <View style={[styles.dot, { backgroundColor: offline ? '#f59e0b' : '#22c55e' }]} />
                    <Text style={styles.statusText}>{offline ? 'Offline mode on' : 'Network synced'}</Text>
                </View>
            </View>

            <View style={styles.alertCard}>
                <Text style={styles.alertTitle}>Latest Risk Signal</Text>
                <Text style={styles.alertValue}>{lastRisk}</Text>
                <Text style={styles.alertHint}>Open Ledger to review transaction-level risk labels.</Text>
            </View>
        </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b1220' },
    content: { padding: 20, paddingTop: 52, paddingBottom: 34 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    greeting: { fontSize: 22, fontWeight: '800', color: '#e2e8f0' },
    subtitle: { color: '#64748b', fontSize: 12, marginTop: 3 },
    modeRow: { flexDirection: 'row', alignItems: 'center' },
    modeLabel: { color: '#94a3b8', fontSize: 12, marginRight: 8 },
    balanceCard: {
        backgroundColor: '#131d2e',
        borderRadius: 18,
        padding: 24,
        marginTop: 24,
        borderWidth: 1,
        borderColor: '#25324a',
    },
    balanceLabel: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
    balanceAmount: { color: '#38bdf8', fontSize: 36, fontWeight: 'bold', marginTop: 8 },
    creditLabel: { color: '#64748b', fontSize: 12, marginTop: 8 },
    balanceMetaRow: { flexDirection: 'row', marginTop: 14 },
    metaBadge: {
        backgroundColor: '#0b1220',
        borderColor: '#25324a',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginRight: 8,
    },
    metaBadgeText: { color: '#cbd5e1', fontSize: 11, fontWeight: '600' },
    actions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
    actionBtn: {
        flex: 1,
        backgroundColor: '#131d2e',
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#25324a',
        marginRight: 8,
    },
    syncBtn: { borderColor: '#0ea5e9', marginRight: 0 },
    actionIcon: { fontSize: 28, marginBottom: 8 },
    actionText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 14,
        paddingVertical: 12,
        backgroundColor: '#131d2e',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#25324a',
    },
    statusItem: { flexDirection: 'row', alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { color: '#94a3b8', fontSize: 12, marginLeft: 8 },
    alertCard: {
        marginTop: 14,
        borderRadius: 14,
        backgroundColor: '#131d2e',
        borderWidth: 1,
        borderColor: '#25324a',
        padding: 14,
    },
    alertTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
    alertValue: { color: '#f8fafc', fontSize: 17, fontWeight: '800', marginTop: 4 },
    alertHint: { color: '#64748b', fontSize: 11, marginTop: 4 },
});

import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions } from '../services/ledgerService';
import AnimatedScreen from '../components/AnimatedScreen';

export default function LedgerScreen() {
    const [transactions, setTransactions] = useState([]);

    useFocusEffect(
        useCallback(() => {
            const load = async () => {
                const txs = await getTransactions();
                setTransactions(txs.reverse());
            };
            load();
        }, [])
    );

    const getRiskColor = (classification) => {
        switch (classification) {
            case 'Valid': return '#22c55e';
            case 'Likely Honest Conflict': return '#f59e0b';
            case 'Suspicious': return '#f97316';
            case 'Likely Fraud': return '#ef4444';
            default: return '#64748b';
        }
    };

    const renderItem = ({ item }) => (
        <View style={styles.txCard}>
            <View style={styles.txRow}>
                <Text style={styles.txMerchant}>{item.merchant_id || item.receiver_id}</Text>
                <Text style={styles.txAmount}>-₹{item.amount}</Text>
            </View>
            <View style={styles.txRow}>
                <Text style={styles.txTime}>{new Date(item.timestamp).toLocaleString()}</Text>
                <View style={styles.statusInline}>
                    {item.classification && (
                        <View style={[styles.badge, { backgroundColor: getRiskColor(item.classification) + '30' }]}>
                            <Text style={[styles.badgeText, { color: getRiskColor(item.classification) }]}>
                                {item.classification}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.dot, { backgroundColor: item.synced ? '#22c55e' : '#f59e0b' }]} />
                </View>
            </View>
        </View>
    );

    return (
        <AnimatedScreen>
        <View style={styles.container}>
            <Text style={styles.title}>Transaction Ledger</Text>
            <Text style={styles.subtitle}>Local audit trail with AI risk labels</Text>

            <View style={styles.summaryRow}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Total Tx</Text>
                    <Text style={styles.summaryValue}>{transactions.length}</Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Pending</Text>
                    <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>
                        {transactions.filter((tx) => !tx.synced).length}
                    </Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Synced</Text>
                    <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
                        {transactions.filter((tx) => tx.synced).length}
                    </Text>
                </View>
            </View>

            {transactions.length === 0 ? (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No transactions yet</Text>
                    <Text style={styles.empty}>Your local ledger entries will appear here after your first payment.</Text>
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.transaction_id}
                    renderItem={renderItem}
                    contentContainerStyle={{ paddingBottom: 20 }}
                />
            )}
        </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b1220', padding: 20, paddingTop: 50 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 16 },
    subtitle: { color: '#64748b', marginTop: -12, marginBottom: 12, fontSize: 12 },
    summaryRow: { flexDirection: 'row', marginBottom: 14 },
    summaryCard: {
        flex: 1,
        backgroundColor: '#131d2e',
        borderWidth: 1,
        borderColor: '#25324a',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginRight: 8,
    },
    summaryLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700' },
    summaryValue: { color: '#e2e8f0', fontSize: 18, fontWeight: '800', marginTop: 2 },
    emptyCard: {
        marginTop: 28,
        backgroundColor: '#131d2e',
        borderWidth: 1,
        borderColor: '#25324a',
        borderRadius: 14,
        padding: 16,
    },
    emptyTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 16, marginBottom: 6 },
    empty: { color: '#64748b', lineHeight: 18 },
    txCard: {
        backgroundColor: '#131d2e',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#25324a',
    },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    txMerchant: { color: '#e2e8f0', fontSize: 15, fontWeight: '700' },
    txAmount: { color: '#f87171', fontSize: 16, fontWeight: 'bold' },
    txTime: { color: '#64748b', fontSize: 11, marginTop: 4 },
    statusInline: { flexDirection: 'row', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
});

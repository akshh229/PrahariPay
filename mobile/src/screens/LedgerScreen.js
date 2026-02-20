import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTransactions } from '../services/ledgerService';
import AnimatedScreen from '../components/AnimatedScreen';
import colors from '../theme/colors';

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
            case 'Valid': return colors.risk.valid;
            case 'Likely Honest Conflict': return colors.risk.honest;
            case 'Suspicious': return colors.risk.suspicious;
            case 'Likely Fraud': return colors.risk.fraud;
            default: return colors.risk.neutral;
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
                        <View style={[styles.badge, { backgroundColor: getRiskColor(item.classification) + '22' }]}>
                            <Text style={[styles.badgeText, { color: getRiskColor(item.classification) }]}>
                                {item.classification}
                            </Text>
                        </View>
                    )}
                    <View style={[styles.dot, { backgroundColor: item.synced ? colors.risk.valid : colors.risk.honest }]} />
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
                    <Text style={[styles.summaryValue, { color: colors.risk.honest }]}>
                        {transactions.filter((tx) => !tx.synced).length}
                    </Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>Synced</Text>
                    <Text style={[styles.summaryValue, { color: colors.risk.valid }]}>
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
    container: { flex: 1, backgroundColor: colors.bg.app, padding: 20, paddingTop: 52, paddingBottom: 32 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginBottom: 4 },
    subtitle: { color: colors.text.secondary, marginBottom: 12, fontSize: 12 },
    summaryRow: { flexDirection: 'row', marginBottom: 14 },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 10,
        marginRight: 8,
    },
    summaryLabel: { color: colors.text.secondary, fontSize: 10, fontWeight: '700' },
    summaryValue: { color: colors.text.primary, fontSize: 18, fontWeight: '800', marginTop: 2 },
    emptyCard: {
        marginTop: 28,
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 14,
        padding: 16,
    },
    emptyTitle: { color: colors.text.primary, fontWeight: '700', fontSize: 16, marginBottom: 6 },
    empty: { color: colors.text.secondary, lineHeight: 18 },
    txCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    txMerchant: { color: colors.text.primary, fontSize: 15, fontWeight: '700' },
    txAmount: { color: colors.status.dangerFg, fontSize: 16, fontWeight: 'bold' },
    txTime: { color: colors.text.secondary, fontSize: 11, marginTop: 4 },
    statusInline: { flexDirection: 'row', alignItems: 'center' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    badgeText: { fontSize: 10, fontWeight: '600' },
    dot: { width: 8, height: 8, borderRadius: 4, marginLeft: 8 },
});

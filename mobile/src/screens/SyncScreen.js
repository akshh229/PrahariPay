import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import { getTransactions, updateTransaction } from '../services/ledgerService';
import { getSyncErrorMessage, syncTransactions } from '../services/syncService';
import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';

export default function SyncScreen() {
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [showSuccessAnim, setShowSuccessAnim] = useState(false);
    const successScale = useState(new Animated.Value(0.8))[0];
    const successOpacity = useState(new Animated.Value(0))[0];

    React.useEffect(() => {
        const loadPending = async () => {
            const allTx = await getTransactions();
            setPendingCount(allTx.filter((tx) => !tx.synced).length);
        };
        loadPending();
    }, [results]);

    const playSyncSuccessAnimation = () =>
        new Promise((resolve) => {
            setShowSuccessAnim(true);
            successScale.setValue(0.8);
            successOpacity.setValue(0);

            Animated.sequence([
                Animated.parallel([
                    Animated.timing(successOpacity, {
                        toValue: 1,
                        duration: 180,
                        easing: Easing.out(Easing.cubic),
                        useNativeDriver: true,
                    }),
                    Animated.spring(successScale, {
                        toValue: 1,
                        friction: 5,
                        tension: 110,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.delay(420),
                Animated.timing(successOpacity, {
                    toValue: 0,
                    duration: 180,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShowSuccessAnim(false);
                resolve();
            });
        });

    const handleSync = async () => {
        setSyncing(true);
        try {
            const allTx = await getTransactions();
            const unsynced = allTx.filter((tx) => !tx.synced);

            if (unsynced.length === 0) {
                Alert.alert('All Synced', 'No pending transactions to sync.');
                setSyncing(false);
                return;
            }

            const response = await syncTransactions(unsynced);

            if (response && response.results) {
                // Update local ledger with AI results
                for (const result of response.results) {
                    await updateTransaction(result.transaction_id, {
                        synced: true,
                        risk_score: result.risk_score,
                        classification: result.classification,
                    });
                }
                setResults(response.results);
                setPendingCount(Math.max(0, pendingCount - response.results.length));
                await playSyncSuccessAnimation();
                Alert.alert('✅ Sync Complete', `${response.results.length} transactions synced.`);
            }
        } catch (e) {
            Alert.alert('Sync Failed', getSyncErrorMessage(e));
        }
        setSyncing(false);
    };

    return (
        <AnimatedScreen>
        <View style={styles.container}>
            <Text style={styles.title}>Sync Center</Text>
            <Text style={styles.desc}>
                Upload pending offline transactions to the backend for AI reconciliation.
            </Text>

            <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Pending transactions</Text>
                <Text style={styles.summaryValue}>{pendingCount}</Text>
                <Text style={styles.summaryHint}>Keep this near zero for stronger trust continuity.</Text>
            </View>

            <AnimatedPressable
                style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                onPress={handleSync}
                disabled={syncing}
            >
                {syncing ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.syncBtnText}>Sync Now</Text>
                )}
            </AnimatedPressable>

            {results && (
                <View style={styles.resultsBox}>
                    <Text style={styles.resultsTitle}>AI Analysis Results</Text>
                    {results.map((r, i) => (
                        <View key={i} style={styles.resultItem}>
                            <View>
                                <Text style={styles.resultTx}>TX: {r.transaction_id.slice(0, 8)}...</Text>
                                <Text style={styles.resultScore}>Risk: {(r.risk_score * 100).toFixed(0)}%</Text>
                            </View>
                            <Text style={[styles.resultClass, {
                                color: r.classification === 'Valid' ? '#22c55e' :
                                    r.classification === 'Suspicious' ? '#f97316' : '#f59e0b'
                            }]}>
                                {r.classification}
                            </Text>
                        </View>
                    ))}
                </View>
            )}

            {showSuccessAnim && (
                <View style={styles.successOverlay} pointerEvents="none">
                    <Animated.View
                        style={[
                            styles.successBadge,
                            {
                                opacity: successOpacity,
                                transform: [{ scale: successScale }],
                            },
                        ]}
                    >
                        <Text style={styles.successIcon}>✓</Text>
                        <Text style={styles.successText}>Synced</Text>
                    </Animated.View>
                </View>
            )}
        </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b1220', padding: 20, paddingTop: 50 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#e2e8f0', marginBottom: 8 },
    desc: { color: '#94a3b8', fontSize: 14, marginBottom: 24, lineHeight: 20 },
    summaryCard: {
        backgroundColor: '#131d2e',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#25324a',
        padding: 14,
        marginBottom: 14,
    },
    summaryLabel: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },
    summaryValue: { color: '#e2e8f0', fontSize: 28, fontWeight: '800', marginTop: 4 },
    summaryHint: { color: '#64748b', fontSize: 11 },
    syncBtn: {
        backgroundColor: '#0ea5e9',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    syncBtnDisabled: { opacity: 0.6 },
    syncBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    resultsBox: {
        marginTop: 24,
        backgroundColor: '#131d2e',
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: '#25324a',
    },
    resultsTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '600', marginBottom: 12 },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#25324a',
    },
    resultTx: { color: '#94a3b8', fontSize: 12 },
    resultScore: { color: '#f59e0b', fontSize: 12, fontWeight: '600', marginTop: 2 },
    resultClass: { fontSize: 12, fontWeight: '600' },
    successOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(3, 8, 18, 0.28)',
    },
    successBadge: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#14532d',
        backgroundColor: '#052e16',
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
    },
    successIcon: { color: '#22c55e', fontSize: 26, fontWeight: '900' },
    successText: { color: '#bbf7d0', fontSize: 13, fontWeight: '800', marginTop: 2 },
});

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTransactions, updateTransaction } from '../services/ledgerService';
import { getSyncErrorMessage, syncTransactions } from '../services/syncService';
import { API_BASE_URL } from '../services/apiConfig';
import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';
import colors from '../theme/colors';

export default function SyncScreen() {
    const [syncing, setSyncing] = useState(false);
    const [results, setResults] = useState(null);
    const [pendingCount, setPendingCount] = useState(0);
    const [showSuccessAnim, setShowSuccessAnim] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('unknown');
    const successScale = useState(new Animated.Value(0.8))[0];
    const successOpacity = useState(new Animated.Value(0))[0];

    const backendMode = (() => {
        if (API_BASE_URL.includes('onrender.com')) return 'Render';
        if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1') || API_BASE_URL.includes('10.0.2.2')) return 'Local';
        return 'LAN / Custom';
    })();

    React.useEffect(() => {
        const loadPending = async () => {
            const allTx = await getTransactions();
            setPendingCount(allTx.filter((tx) => !tx.synced).length);
        };
        const loadUser = async () => {
            const uid = await AsyncStorage.getItem('user_id');
            setCurrentUserId(uid || 'unknown');
        };
        loadPending();
        loadUser();
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

    const runSyncBatch = async (transactions, opts = { announceEmpty: true }) => {
        if (!transactions || transactions.length === 0) {
            if (opts.announceEmpty) {
                Alert.alert('All Synced', 'No pending transactions to sync.');
            }
            return;
        }

        const response = await syncTransactions(transactions);
        if (response && response.results) {
            for (const result of response.results) {
                await updateTransaction(result.transaction_id, {
                    synced: true,
                    risk_score: result.risk_score,
                    classification: result.classification,
                });
            }
            setResults(response.results);
            const remaining = Math.max(0, pendingCount - response.results.length);
            setPendingCount(remaining);
            await playSyncSuccessAnimation();
            Alert.alert('✅ Sync Complete', `${response.results.length} transactions synced.`);
        }
    };

    const handleResyncRecent = async () => {
        setSyncing(true);
        try {
            const allTx = await getTransactions();
            const recent = [...allTx]
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 50);

            await runSyncBatch(recent, { announceEmpty: true });
        } catch (e) {
            Alert.alert('Resync Failed', getSyncErrorMessage(e));
        }
        setSyncing(false);
    };

    const handleSync = async () => {
        setSyncing(true);
        try {
            const allTx = await getTransactions();
            const unsynced = allTx.filter((tx) => !tx.synced);

            if (unsynced.length === 0) {
                Alert.alert(
                    'No Pending Transactions',
                    'Everything is marked synced locally. If older sync went to a different backend, resync recent transactions to this backend now.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Resync Recent', onPress: () => { void handleResyncRecent(); } },
                    ]
                );
                setSyncing(false);
                return;
            }

            await runSyncBatch(unsynced, { announceEmpty: false });
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

            <View style={styles.backendCard}>
                <View style={styles.backendHeaderRow}>
                    <Text style={styles.backendTitle}>Connected Backend</Text>
                    <Text style={styles.backendMode}>{backendMode}</Text>
                </View>
                <Text style={styles.backendUrl} numberOfLines={2}>
                    {API_BASE_URL}
                </Text>
                <Text style={styles.backendUser}>Account: {currentUserId}</Text>
            </View>

            <AnimatedPressable
                style={[styles.syncBtn, syncing && styles.syncBtnDisabled]}
                onPress={handleSync}
                disabled={syncing}
            >
                {syncing ? (
                    <ActivityIndicator color={colors.text.inverse} />
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
                                color: r.classification === 'Valid' ? colors.risk.valid :
                                    r.classification === 'Suspicious' ? colors.risk.suspicious : colors.risk.honest
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
    container: { flex: 1, backgroundColor: colors.bg.app, padding: 20, paddingTop: 52, paddingBottom: 32 },
    title: { fontSize: 24, fontWeight: 'bold', color: colors.text.primary, marginBottom: 6 },
    desc: { color: colors.text.secondary, fontSize: 14, marginBottom: 24, lineHeight: 20 },
    summaryCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: 14,
        marginBottom: 14,
    },
    summaryLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: '700' },
    summaryValue: { color: colors.text.primary, fontSize: 28, fontWeight: '800', marginTop: 4 },
    summaryHint: { color: colors.text.muted, fontSize: 11 },
    backendCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: 12,
        marginBottom: 14,
    },
    backendHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    backendTitle: { color: colors.text.secondary, fontSize: 11, fontWeight: '700' },
    backendMode: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.brand.primary,
        backgroundColor: '#f8ecdf',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    backendUrl: { color: colors.text.primary, fontSize: 12, lineHeight: 16 },
    backendUser: { color: colors.text.secondary, fontSize: 11, marginTop: 6 },
    syncBtn: {
        backgroundColor: colors.brand.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    syncBtnDisabled: { opacity: 0.6 },
    syncBtnText: { color: colors.text.inverse, fontSize: 16, fontWeight: 'bold' },
    resultsBox: {
        marginTop: 24,
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    resultsTitle: { color: colors.text.primary, fontSize: 16, fontWeight: '600', marginBottom: 12 },
    resultItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
    },
    resultTx: { color: colors.text.secondary, fontSize: 12 },
    resultScore: { color: colors.risk.honest, fontSize: 12, fontWeight: '600', marginTop: 2 },
    resultClass: { fontSize: 12, fontWeight: '600' },
    successOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg.overlaySoft,
    },
    successBadge: {
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#caebd7',
        backgroundColor: colors.status.successBg,
        paddingHorizontal: 20,
        paddingVertical: 14,
        alignItems: 'center',
    },
    successIcon: { color: colors.status.successFg, fontSize: 26, fontWeight: '900' },
    successText: { color: colors.status.successFg, fontSize: 13, fontWeight: '800', marginTop: 2 },
});

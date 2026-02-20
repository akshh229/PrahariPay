import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getTransactions } from '../services/ledgerService';
import AnimatedScreen from '../components/AnimatedScreen';
import colors from '../theme/colors';

const CATEGORY_COLORS = [
    colors.brand.primary,
    colors.status.warningFg,
    colors.status.infoFg,
    colors.status.successFg,
    colors.risk.suspicious,
    colors.text.muted,
];

export default function InsightsScreen() {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        const load = async () => {
            const txs = await getTransactions();
            setTransactions(txs || []);
        };
        load();
    }, []);

    const summary = useMemo(() => {
        const total = transactions.reduce((acc, tx) => acc + Number(tx.amount || 0), 0);
        const flagged = transactions.filter(
            (tx) => tx.classification === 'Suspicious' || tx.classification === 'Likely Fraud'
        ).length;
        const synced = transactions.filter((tx) => tx.synced).length;
        const trustScore = transactions.length === 0
            ? 100
            : Math.max(45, 100 - Math.round((flagged / transactions.length) * 60));
        return { total, flagged, synced, count: transactions.length, trustScore };
    }, [transactions]);

    return (
        <AnimatedScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>AI Insights</Text>
            <Text style={styles.subtitle}>Daily Intelligence Briefing</Text>

            <View style={styles.heroCard}>
                <Text style={styles.heroLabel}>Total Spend</Text>
                <Text style={styles.heroAmount}>₹{summary.total.toFixed(2)}</Text>
                <Text style={styles.heroMeta}>{summary.count} transactions analyzed</Text>
            </View>

            <View style={styles.grid}>
                <View style={styles.smallCard}>
                    <Text style={styles.smallLabel}>Flagged</Text>
                    <Text style={[styles.smallValue, { color: '#f97316' }]}>{summary.flagged}</Text>
                </View>
                <View style={styles.smallCard}>
                    <Text style={styles.smallLabel}>Synced</Text>
                    <Text style={[styles.smallValue, { color: '#22c55e' }]}>{summary.synced}</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Trust Integrity</Text>
                <Text style={styles.trustValue}>{summary.trustScore}%</Text>
                <View style={styles.trustBarTrack}>
                    <View style={[styles.trustBarFill, { width: `${summary.trustScore}%` }]} />
                </View>
                <Text style={styles.trustHint}>Derived from sync discipline and flagged-risk frequency.</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Spend Over Time (Preview)</Text>
                <View style={styles.bars}>
                    {[32, 48, 20, 64, 38, 52].map((h, index) => (
                        <View key={index} style={styles.barWrap}>
                            <View
                                style={[
                                    styles.bar,
                                    {
                                        height: h,
                                        backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
                                    },
                                ]}
                            />
                        </View>
                    ))}
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>AI Recommendations</Text>
                <View style={styles.tip}>
                    <Text style={styles.tipTitle}>• Watch suspicious spikes</Text>
                    <Text style={styles.tipText}>Review transactions marked "Suspicious" within 24 hours.</Text>
                </View>
                <View style={styles.tip}>
                    <Text style={styles.tipTitle}>• Keep sync interval low</Text>
                    <Text style={styles.tipText}>Run sync frequently to improve trust score updates.</Text>
                </View>
                <View style={styles.tip}>
                    <Text style={styles.tipTitle}>• Enable guardian checks</Text>
                    <Text style={styles.tipText}>Guardian approvals reduce fraud risk on recovery actions.</Text>
                </View>
            </View>
        </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg.app },
    content: { padding: 20, paddingTop: 52, paddingBottom: 32 },
    title: { fontSize: 26, color: colors.text.primary, fontWeight: '800' },
    subtitle: { color: colors.text.secondary, marginTop: 4, marginBottom: 16 },
    heroCard: {
        backgroundColor: colors.bg.card,
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: colors.border.subtle,
    },
    heroLabel: { color: colors.text.secondary, fontSize: 12, fontWeight: '600' },
    heroAmount: { color: colors.brand.primary, fontSize: 30, fontWeight: '800', marginTop: 6 },
    heroMeta: { color: colors.text.secondary, marginTop: 6, fontSize: 12, fontWeight: '600' },
    grid: { flexDirection: 'row', gap: 12, marginTop: 12 },
    smallCard: {
        flex: 1,
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: 14,
    },
    smallLabel: { color: colors.text.secondary, fontSize: 11, fontWeight: '600' },
    smallValue: { marginTop: 6, fontSize: 24, fontWeight: '800' },
    card: {
        marginTop: 12,
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: 14,
    },
    cardTitle: { color: colors.text.primary, fontWeight: '700', fontSize: 14, marginBottom: 10 },
    trustValue: { color: colors.brand.primary, fontSize: 28, fontWeight: '800', marginTop: -2 },
    trustBarTrack: {
        marginTop: 10,
        height: 10,
        borderRadius: 999,
        backgroundColor: colors.bg.muted,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        overflow: 'hidden',
    },
    trustBarFill: { height: '100%', backgroundColor: colors.brand.primary },
    trustHint: { color: colors.text.secondary, fontSize: 11, marginTop: 8 },
    bars: { flexDirection: 'row', alignItems: 'flex-end', height: 80, gap: 8 },
    barWrap: { flex: 1, justifyContent: 'flex-end' },
    bar: { borderRadius: 8 },
    tip: { marginBottom: 8 },
    tipTitle: { color: colors.text.primary, fontWeight: '700', fontSize: 12 },
    tipText: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
});

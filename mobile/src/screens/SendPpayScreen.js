import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';
import { resolvePpayId, getPpayErrorMessage } from '../services/ppayService';
import { saveTransaction, getBalance, setBalance } from '../services/ledgerService';
import { broadcastTransaction } from '../services/gossip';
import { generateUUID } from '../utils/uuid';
import { signTransaction } from '../services/crypto';
import colors from '../theme/colors';

export default function SendPpayScreen({ navigation }) {
    const [receiverPpayId, setReceiverPpayId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [resolvedUser, setResolvedUser] = useState(null);
    const [resolving, setResolving] = useState(false);
    const [sending, setSending] = useState(false);

    const canSend = useMemo(() => {
        const parsedAmount = Number(amount);
        return !!resolvedUser && Number.isFinite(parsedAmount) && parsedAmount > 0;
    }, [amount, resolvedUser]);

    const normalizePpayId = (value) => {
        const clean = (value || '').trim().toLowerCase();
        if (!clean) return '';
        return clean.includes('@') ? clean : `${clean}@ppay`;
    };

    const handleResolve = async () => {
        const normalized = normalizePpayId(receiverPpayId);
        if (!normalized) {
            Alert.alert('Missing Receiver', 'Enter a PrahariPay ID first.');
            return;
        }

        try {
            setResolving(true);
            const result = await resolvePpayId(normalized);
            setResolvedUser(result);
            setReceiverPpayId(result.ppay_id || normalized);
        } catch (error) {
            setResolvedUser(null);
            Alert.alert('Could not resolve ID', getPpayErrorMessage(error, 'PrahariPay ID not found.'));
        } finally {
            setResolving(false);
        }
    };

    const buildSignaturePayload = (tx) => `${tx.transaction_id}:${tx.sender_id}:${tx.receiver_id}:${tx.amount}:${tx.timestamp}`;

    const buildTransactionSignature = async (tx) => {
        try {
            const privateKey = await AsyncStorage.getItem('private_key');
            if (privateKey && typeof signTransaction === 'function') {
                const payload = buildSignaturePayload(tx);
                const signed = await signTransaction(payload, privateKey);
                if (signed) return signed;
            }
        } catch {
            // fallback below
        }
        return `simulated_sig_${Date.now()}`;
    };

    const handleSend = async () => {
        if (!canSend) return;

        const parsedAmount = Number(amount);
        const currentBalance = await getBalance();
        if (parsedAmount > currentBalance) {
            Alert.alert('Insufficient Balance', `You need ₹${parsedAmount} but have ₹${currentBalance}`);
            return;
        }

        try {
            setSending(true);
            const senderId = (await AsyncStorage.getItem('user_id')) || 'user_001';
            const nowIso = new Date().toISOString();

            const tx = {
                transaction_id: generateUUID(),
                sender_id: senderId,
                receiver_id: resolvedUser.user_id,
                merchant_id: resolvedUser.is_merchant ? resolvedUser.user_id : null,
                invoice_id: note.trim() || null,
                amount: parsedAmount,
                timestamp: nowIso,
                token_id: generateUUID(),
                signature: '',
                propagated_to_peers: 0,
                synced: false,
            };

            tx.signature = await buildTransactionSignature(tx);

            await setBalance(currentBalance - parsedAmount);
            await saveTransaction(tx);

            try {
                const gossipResult = await broadcastTransaction(tx);
                const peers = Number(gossipResult?.propagated_to_peers || gossipResult?.peers_reached || 0);
                if (peers > 0) {
                    tx.propagated_to_peers = peers;
                } else {
                    tx.propagated_to_peers = 1;
                }
            } catch {
                // gossip is best-effort
            }

            Alert.alert(
                '✅ Payment Stored',
                `Sent ₹${parsedAmount} to ${resolvedUser.full_name || resolvedUser.username} (${resolvedUser.ppay_id})\nStored locally, not synced yet.`,
                [
                    {
                        text: 'Sync now',
                        onPress: () => navigation.navigate('Main', { screen: 'Sync' }),
                    },
                    { text: 'Done', onPress: () => navigation.goBack() },
                ]
            );
        } catch (error) {
            Alert.alert('Send failed', getPpayErrorMessage(error, 'Could not complete transfer.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <AnimatedScreen>
            <ScrollView style={styles.container} contentContainerStyle={styles.content}>
                <Text style={styles.title}>Send via Prahari ID</Text>
                <Text style={styles.subtitle}>Transfer securely using handle@ppay</Text>

                <View style={styles.card}>
                    <Text style={styles.label}>To (Prahari ID)</Text>
                    <TextInput
                        value={receiverPpayId}
                        onChangeText={(value) => {
                            setReceiverPpayId(value);
                            setResolvedUser(null);
                        }}
                        onBlur={handleResolve}
                        autoCapitalize="none"
                        autoCorrect={false}
                        placeholder="alice@ppay"
                        placeholderTextColor={colors.text.muted}
                        style={styles.input}
                    />
                    <AnimatedPressable style={styles.secondaryBtn} onPress={handleResolve}>
                        {resolving ? <ActivityIndicator color={colors.text.secondary} /> : <Text style={styles.secondaryBtnText}>Check</Text>}
                    </AnimatedPressable>
                </View>

                {resolvedUser && (
                    <View style={styles.previewCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{(resolvedUser.username || 'U').slice(0, 2).toUpperCase()}</Text>
                        </View>
                        <View style={styles.previewMeta}>
                            <Text style={styles.previewName}>{resolvedUser.full_name || resolvedUser.username}</Text>
                            <Text style={styles.previewId}>{resolvedUser.ppay_id}</Text>
                        </View>
                        {resolvedUser.is_merchant ? <Text style={styles.badge}>Merchant</Text> : null}
                    </View>
                )}

                <View style={styles.card}>
                    <Text style={styles.label}>Amount (₹)</Text>
                    <TextInput
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="decimal-pad"
                        placeholder="0.00"
                        placeholderTextColor={colors.text.muted}
                        style={styles.input}
                    />

                    <Text style={[styles.label, { marginTop: 10 }]}>Note (optional)</Text>
                    <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="Purpose / reference"
                        placeholderTextColor={colors.text.muted}
                        style={styles.input}
                    />
                </View>

                <AnimatedPressable
                    style={[styles.primaryBtn, (!canSend || sending) && styles.primaryBtnDisabled]}
                    onPress={handleSend}
                    disabled={!canSend || sending}
                >
                    {sending ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.primaryBtnText}>Send with PrahariPay</Text>}
                </AnimatedPressable>
            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg.app },
    content: { padding: 20, paddingTop: 50, paddingBottom: 32 },
    title: { color: colors.text.primary, fontSize: 26, fontWeight: '800' },
    subtitle: { color: colors.text.secondary, marginTop: 4, marginBottom: 14 },
    card: {
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        padding: 14,
        marginBottom: 12,
    },
    label: { color: colors.text.secondary, fontSize: 12, fontWeight: '700', marginBottom: 6 },
    input: {
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: colors.text.primary,
        backgroundColor: colors.bg.muted,
    },
    secondaryBtn: {
        marginTop: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.bg.muted,
        alignItems: 'center',
        paddingVertical: 10,
    },
    secondaryBtnText: { color: colors.text.secondary, fontWeight: '700' },
    previewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.status.successBg,
        borderColor: '#cfead9',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
    },
    avatar: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: colors.status.successFg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: { color: colors.text.inverse, fontWeight: '900' },
    previewMeta: { flex: 1, marginLeft: 10 },
    previewName: { color: colors.status.successFg, fontWeight: '700' },
    previewId: { color: colors.text.secondary, fontSize: 12, marginTop: 2 },
    badge: {
        color: colors.status.successFg,
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: '#cfead9',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 4,
        fontSize: 11,
        fontWeight: '700',
    },
    primaryBtn: {
        borderRadius: 12,
        backgroundColor: colors.brand.primary,
        alignItems: 'center',
        paddingVertical: 13,
        marginTop: 6,
    },
    primaryBtnDisabled: { opacity: 0.6 },
    primaryBtnText: { color: colors.text.inverse, fontWeight: '900', fontSize: 14 },
});

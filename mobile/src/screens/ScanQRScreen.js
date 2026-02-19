import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Animated, Easing } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { saveTransaction, getBalance, setBalance, isOfflineMode } from '../services/ledgerService';
import { syncSingleTransaction } from '../services/syncService';
import { generateUUID } from '../utils/uuid';
import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';

const tryJsonParse = (value) => {
    if (typeof value !== 'string') {
        return null;
    }
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

const parseQrPayload = (rawData) => {
    if (typeof rawData !== 'string' || rawData.trim().length === 0) {
        return null;
    }

    const trimmed = rawData.trim();

    const directJson = tryJsonParse(trimmed);
    if (directJson) return directJson;

    try {
        const decoded = decodeURIComponent(trimmed);
        const decodedJson = tryJsonParse(decoded);
        if (decodedJson) return decodedJson;
    } catch {
        // ignore decode errors
    }

    try {
        const url = new URL(trimmed);
        const payloadParam =
            url.searchParams.get('payload') ||
            url.searchParams.get('data') ||
            url.searchParams.get('qr');

        if (payloadParam) {
            const payloadJson = tryJsonParse(payloadParam) || tryJsonParse(decodeURIComponent(payloadParam));
            if (payloadJson) return payloadJson;
        }
    } catch {
        // not a URL, ignore
    }

    const merchantMatch = trimmed.match(/merchant[_-]?id\s*[:=]\s*['\"]?([a-zA-Z0-9_-]+)['\"]?/i);
    const amountMatch = trimmed.match(/amount\s*[:=]\s*['\"]?([0-9]+(?:\.[0-9]+)?)['\"]?/i);
    const invoiceMatch = trimmed.match(/invoice[_-]?(?:id|ref)\s*[:=]\s*['\"]?([a-zA-Z0-9._-]+)['\"]?/i);

    if (merchantMatch && amountMatch) {
        return {
            merchant_id: merchantMatch[1],
            amount: Number(amountMatch[1]),
            invoice_id: invoiceMatch?.[1] || '',
        };
    }

    return null;
};

export default function ScanQRScreen({ navigation }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [paymentAnimVisible, setPaymentAnimVisible] = useState(false);
    const [paymentAnimAmount, setPaymentAnimAmount] = useState(0);
    const [paymentAnimReceiver, setPaymentAnimReceiver] = useState('');
    const transferProgress = useState(new Animated.Value(0))[0];
    const receiverPulse = useState(new Animated.Value(1))[0];

    useEffect(() => {
        if (!permission?.granted) {
            requestPermission();
        }
    }, []);

    const playPaymentAnimation = (amount, receiver) =>
        new Promise((resolve) => {
            setPaymentAnimAmount(amount);
            setPaymentAnimReceiver(receiver);
            setPaymentAnimVisible(true);
            transferProgress.setValue(0);
            receiverPulse.setValue(1);

            Animated.sequence([
                Animated.timing(transferProgress, {
                    toValue: 1,
                    duration: 950,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.spring(receiverPulse, {
                    toValue: 1.18,
                    friction: 4,
                    tension: 70,
                    useNativeDriver: true,
                }),
                Animated.spring(receiverPulse, {
                    toValue: 1,
                    friction: 5,
                    tension: 65,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setTimeout(() => {
                    setPaymentAnimVisible(false);
                    resolve();
                }, 200);
            });
        });

    const handleBarCodeScanned = async ({ data }) => {
        if (scanned) return;
        setScanned(true);

        try {
            const rawText = typeof data === 'string' ? data : JSON.stringify(data);
            const payload = parseQrPayload(rawText);
            if (!payload) {
                const preview = (rawText || '').replace(/\s+/g, ' ').slice(0, 140);
                Alert.alert('Invalid QR', `Scanned format not supported.\n\nData: ${preview || 'empty'}`);
                setScanned(false);
                return;
            }

            const merchantId = payload.merchant_id || payload.merchantId;
            const rawAmount = payload.amount ?? payload.data?.amount;
            const invoiceId = payload.invoice_id || payload.invoiceId || payload.data?.invoice_ref || '';
            const parsedAmount = Number(rawAmount);

            if (!merchantId || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
                Alert.alert('Invalid QR', 'This QR code is not a valid PrahariPay payment.');
                setScanned(false);
                return;
            }

            const currentBalance = await getBalance();
            if (parsedAmount > currentBalance) {
                Alert.alert('Insufficient Balance', `You need ₹${parsedAmount} but have ₹${currentBalance}`);
                setScanned(false);
                return;
            }

            const senderId = (await AsyncStorage.getItem('user_id')) || 'user_001';

            const transaction = {
                transaction_id: generateUUID(),
                sender_id: senderId,
                receiver_id: merchantId,
                merchant_id: merchantId,
                invoice_id: invoiceId,
                amount: parsedAmount,
                timestamp: new Date().toISOString(),
                token_id: generateUUID(),
                signature: 'simulated_sig_' + Date.now(),
                propagated_to_peers: 0,
                synced: false,
            };

            // Debit locally
            await setBalance(currentBalance - parsedAmount);
            await saveTransaction(transaction);

            const offline = await isOfflineMode();

            if (!offline) {
                // Online: sync immediately
                try {
                    await syncSingleTransaction(transaction);
                    await playPaymentAnimation(parsedAmount, merchantId);
                    Alert.alert(
                        '✅ Payment Sent',
                        `₹${parsedAmount} paid to ${merchantId}\nSynced immediately.`,
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                } catch (e) {
                    await playPaymentAnimation(parsedAmount, merchantId);
                    Alert.alert(
                        '⚠️ Payment Saved Locally',
                        `₹${parsedAmount} debited. Sync failed, will retry later.`,
                        [{ text: 'OK', onPress: () => navigation.goBack() }]
                    );
                }
            } else {
                await playPaymentAnimation(parsedAmount, merchantId);
                Alert.alert(
                    '📴 Offline Payment Stored',
                    `₹${parsedAmount} to ${merchantId}\nWill sync when online.`,
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            }
        } catch (e) {
            Alert.alert('Error', `Could not parse QR code data.\n${e?.message || ''}`);
            setScanned(false);
        }
    };

    if (!permission?.granted) {
        return (
            <AnimatedScreen>
            <View style={styles.container}>
                <View style={styles.permissionCard}>
                    <Text style={styles.permissionTitle}>Camera Access Required</Text>
                    <Text style={styles.text}>Grant camera permission to scan merchant QR codes securely.</Text>
                    <AnimatedPressable style={styles.btn} onPress={requestPermission}>
                        <Text style={styles.btnText}>Grant Permission</Text>
                    </AnimatedPressable>
                </View>
            </View>
            </AnimatedScreen>
        );
    }

    return (
        <AnimatedScreen>
        <View style={styles.container}>
            <View style={styles.topPanel}>
                <Text style={styles.topTitle}>Scan to Pay</Text>
                <Text style={styles.topHint}>Align merchant QR within the frame</Text>
            </View>
            <CameraView
                style={styles.camera}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />

            <View pointerEvents="none" style={styles.frameWrap}>
                <View style={styles.scanFrame}>
                    <View style={[styles.corner, styles.topLeft]} />
                    <View style={[styles.corner, styles.topRight]} />
                    <View style={[styles.corner, styles.bottomLeft]} />
                    <View style={[styles.corner, styles.bottomRight]} />
                </View>
            </View>

            <View style={styles.overlay}>
                <Text style={styles.hint}>{scanned ? 'Scan complete. Confirm and continue.' : 'Point camera at merchant QR code'}</Text>
                {scanned && (
                    <AnimatedPressable style={styles.btn} onPress={() => setScanned(false)}>
                        <Text style={styles.btnText}>Scan Again</Text>
                    </AnimatedPressable>
                )}
            </View>

            {paymentAnimVisible && (
                <View style={styles.paymentOverlay}>
                    <View style={styles.paymentCard}>
                        <Text style={styles.paymentTitle}>Processing Payment</Text>
                        <Text style={styles.paymentAmount}>₹{paymentAnimAmount}</Text>

                        <View style={styles.paymentFlowRow}>
                            <View style={styles.partyBubble}>
                                <Text style={styles.partyLabel}>You</Text>
                            </View>

                            <View style={styles.trackArea}>
                                <View style={styles.trackLine} />
                                <Animated.View
                                    style={[
                                        styles.moneyDot,
                                        {
                                            transform: [
                                                {
                                                    translateX: transferProgress.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0, 124],
                                                    }),
                                                },
                                            ],
                                        },
                                    ]}
                                >
                                    <Text style={styles.moneyDotText}>₹</Text>
                                </Animated.View>
                            </View>

                            <Animated.View style={[styles.partyBubble, { transform: [{ scale: receiverPulse }] }]}>
                                <Text numberOfLines={1} style={styles.partyLabel}>{paymentAnimReceiver}</Text>
                            </Animated.View>
                        </View>
                    </View>
                </View>
            )}
        </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0b1220' },
    topPanel: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 2,
        paddingTop: 52,
        paddingBottom: 12,
        paddingHorizontal: 18,
        backgroundColor: 'rgba(11,18,32,0.7)',
    },
    topTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 22 },
    topHint: { color: '#94a3b8', marginTop: 4, fontSize: 12 },
    camera: { flex: 1 },
    frameWrap: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanFrame: {
        width: 250,
        height: 250,
        borderRadius: 18,
        backgroundColor: 'rgba(0,0,0,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.3)',
    },
    corner: {
        position: 'absolute',
        width: 28,
        height: 28,
        borderColor: '#38bdf8',
        borderWidth: 4,
    },
    topLeft: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
    topRight: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 12 },
    bottomLeft: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 12 },
    bottomRight: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
    overlay: {
        position: 'absolute',
        bottom: 42,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    hint: {
        color: '#e2e8f0',
        fontSize: 14,
        marginBottom: 12,
        backgroundColor: 'rgba(11,18,32,0.78)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 999,
        textAlign: 'center',
    },
    permissionCard: {
        marginTop: 180,
        marginHorizontal: 20,
        borderRadius: 16,
        backgroundColor: '#131d2e',
        borderWidth: 1,
        borderColor: '#25324a',
        padding: 18,
    },
    permissionTitle: { color: '#f8fafc', fontWeight: '800', fontSize: 18, marginBottom: 8 },
    text: { color: '#94a3b8', fontSize: 14, lineHeight: 20 },
    btn: { backgroundColor: '#0ea5e9', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10, marginTop: 12 },
    btnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    paymentOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(3, 8, 18, 0.72)',
        justifyContent: 'center',
        paddingHorizontal: 18,
    },
    paymentCard: {
        borderRadius: 18,
        backgroundColor: '#131d2e',
        borderWidth: 1,
        borderColor: '#25324a',
        padding: 18,
    },
    paymentTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '700' },
    paymentAmount: { color: '#38bdf8', fontSize: 28, fontWeight: '800', marginTop: 6 },
    paymentFlowRow: {
        marginTop: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    partyBubble: {
        width: 74,
        height: 44,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#25324a',
        backgroundColor: '#0f172a',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    partyLabel: { color: '#e2e8f0', fontSize: 11, fontWeight: '700' },
    trackArea: {
        width: 140,
        height: 22,
        justifyContent: 'center',
    },
    trackLine: {
        height: 2,
        borderRadius: 999,
        backgroundColor: '#334155',
        width: '100%',
    },
    moneyDot: {
        position: 'absolute',
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#22c55e',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#86efac',
    },
    moneyDotText: { color: '#052e16', fontSize: 11, fontWeight: '900' },
});

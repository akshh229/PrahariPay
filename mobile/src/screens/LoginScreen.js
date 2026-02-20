import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getAuthErrorMessage, loginUser } from '../services/authService';
import { API_BASE_URL } from '../services/apiConfig';
import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';
import colors from '../theme/colors';

export default function LoginScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        const normalizedUsername = username.trim();

        if (!normalizedUsername || !password) {
            Alert.alert('Missing fields', 'Please enter username and password.');
            return;
        }

        setLoading(true);
        try {
            await loginUser(normalizedUsername, password);

            navigation.replace('Main');
        } catch (error) {
            Alert.alert('Login failed', getAuthErrorMessage(error, 'Unable to login'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatedScreen>
        <View style={styles.container}>
            <View style={styles.glowOrb} />

            <View style={styles.header}>
                <Text style={styles.logo}>🛡</Text>
                <Text style={styles.title}>PrahariPay</Text>
                <Text style={styles.subtitle}>Secure Offline-First Payments</Text>
                <Text style={styles.debugText}>Backend: {API_BASE_URL}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Welcome Back</Text>
                <Text style={styles.cardText}>Sign in to your merchant wallet</Text>

                <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Username"
                    placeholderTextColor={colors.text.muted}
                    autoCapitalize="none"
                    style={styles.input}
                />
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor={colors.text.muted}
                    secureTextEntry
                    style={styles.input}
                />

                <AnimatedPressable
                    style={[styles.loginButton, loading && styles.disabledButton]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.loginText}>Authenticate</Text>}
                </AnimatedPressable>

                <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                    <Text style={styles.link}>New user? Create account</Text>
                </TouchableOpacity>
            </View>
        </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.bg.app,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    glowOrb: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: colors.brand.soft,
        top: 110,
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logo: {
        fontSize: 56,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: colors.text.primary,
    },
    subtitle: {
        marginTop: 6,
        color: colors.text.secondary,
        fontSize: 13,
    },
    debugText: {
        marginTop: 8,
        color: colors.text.muted,
        fontSize: 11,
        textAlign: 'center',
    },
    card: {
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 18,
        padding: 22,
    },
    cardTitle: {
        color: colors.text.primary,
        fontWeight: '700',
        fontSize: 20,
    },
    cardText: {
        marginTop: 4,
        color: colors.text.secondary,
        fontSize: 12,
        marginBottom: 14,
    },
    input: {
        backgroundColor: colors.bg.muted,
        borderColor: colors.border.subtle,
        borderWidth: 1,
        borderRadius: 12,
        color: colors.text.primary,
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 10,
    },
    loginButton: {
        backgroundColor: colors.brand.primary,
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        marginTop: 2,
    },
    disabledButton: {
        opacity: 0.6,
    },
    loginText: {
        color: colors.text.inverse,
        fontWeight: '800',
        fontSize: 14,
    },
    link: {
        marginTop: 12,
        color: colors.brand.primary,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
    },
});

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
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    style={styles.input}
                />
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Password"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    style={styles.input}
                />

                <AnimatedPressable
                    style={[styles.loginButton, loading && styles.disabledButton]}
                    onPress={handleLogin}
                    disabled={loading}
                >
                    {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.loginText}>Authenticate</Text>}
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
        backgroundColor: '#0f172a',
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    glowOrb: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(58,191,248,0.15)',
        top: 110,
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        marginBottom: 36,
    },
    logo: {
        fontSize: 56,
        marginBottom: 8,
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        color: '#e2e8f0',
    },
    subtitle: {
        marginTop: 6,
        color: '#94a3b8',
        fontSize: 13,
    },
    debugText: {
        marginTop: 8,
        color: '#64748b',
        fontSize: 11,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'rgba(30,41,59,0.85)',
        borderWidth: 1,
        borderColor: '#334155',
        borderRadius: 18,
        padding: 20,
    },
    cardTitle: {
        color: '#f8fafc',
        fontWeight: '700',
        fontSize: 20,
    },
    cardText: {
        marginTop: 4,
        color: '#94a3b8',
        fontSize: 12,
        marginBottom: 16,
    },
    input: {
        backgroundColor: '#111827',
        borderColor: '#334155',
        borderWidth: 1,
        borderRadius: 12,
        color: '#f8fafc',
        paddingHorizontal: 14,
        paddingVertical: 12,
        marginBottom: 12,
    },
    loginButton: {
        backgroundColor: '#3abff8',
        borderRadius: 12,
        paddingVertical: 13,
        alignItems: 'center',
        marginTop: 4,
    },
    disabledButton: {
        opacity: 0.6,
    },
    loginText: {
        color: '#0f172a',
        fontWeight: '800',
        fontSize: 14,
    },
    link: {
        marginTop: 14,
        color: '#38bdf8',
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
    },
});

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { getAuthErrorMessage, registerUser } from '../services/authService';
import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';

export default function RegisterScreen({ navigation }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isMerchant, setIsMerchant] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        const normalizedUsername = username.trim();

        if (!normalizedUsername || !password) {
            Alert.alert('Missing fields', 'Please complete username and password.');
            return;
        }

        if (normalizedUsername.length < 3) {
            Alert.alert('Invalid username', 'Username must be at least 3 characters.');
            return;
        }

        if (password.length < 6) {
            Alert.alert('Weak password', 'Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            await registerUser(normalizedUsername, password, isMerchant);

            Alert.alert('Account created', 'Your account is ready. Please login.', [
                { text: 'Continue', onPress: () => navigation.replace('Login') },
            ]);
        } catch (error) {
            Alert.alert('Registration failed', getAuthErrorMessage(error, 'Unable to register'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatedScreen>
        <View style={styles.container}>
            <Text style={styles.step}>Step 1 / 3</Text>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Setup your PrahariPay identity</Text>

            <View style={styles.card}>
                <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Choose username"
                    placeholderTextColor="#64748b"
                    autoCapitalize="none"
                    style={styles.input}
                />
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create password"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    style={styles.input}
                />

                <View style={styles.toggleRow}>
                    <View>
                        <Text style={styles.toggleTitle}>I am a merchant</Text>
                        <Text style={styles.toggleDesc}>Enable point-of-sale features</Text>
                    </View>
                    <Switch
                        value={isMerchant}
                        onValueChange={setIsMerchant}
                        trackColor={{ false: '#334155', true: '#3abff8' }}
                        thumbColor="#f8fafc"
                    />
                </View>

                <AnimatedPressable
                    style={[styles.button, loading && styles.disabledButton]}
                    disabled={loading}
                    onPress={handleRegister}
                >
                    {loading ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.buttonText}>Create Account</Text>}
                </AnimatedPressable>

                <TouchableOpacity onPress={() => navigation.replace('Login')}>
                    <Text style={styles.link}>Already have an account? Login</Text>
                </TouchableOpacity>
            </View>
        </View>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#101d23',
        paddingHorizontal: 20,
        paddingTop: 70,
    },
    step: {
        color: '#38bdf8',
        fontWeight: '700',
        fontSize: 12,
        marginBottom: 8,
    },
    title: {
        color: '#f8fafc',
        fontWeight: '800',
        fontSize: 28,
    },
    subtitle: {
        color: '#94a3b8',
        marginTop: 6,
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: 16,
        borderColor: '#334155',
        borderWidth: 1,
        padding: 16,
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
    toggleRow: {
        marginTop: 4,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    toggleTitle: {
        color: '#f1f5f9',
        fontWeight: '700',
        fontSize: 14,
    },
    toggleDesc: {
        color: '#94a3b8',
        fontSize: 11,
        marginTop: 2,
    },
    button: {
        backgroundColor: '#3abff8',
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 13,
    },
    buttonText: {
        color: '#0f172a',
        fontWeight: '800',
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.6,
    },
    link: {
        textAlign: 'center',
        color: '#38bdf8',
        marginTop: 12,
        fontWeight: '600',
        fontSize: 12,
    },
});

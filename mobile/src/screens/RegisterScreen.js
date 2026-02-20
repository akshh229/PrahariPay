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
import colors from '../theme/colors';

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
                    placeholderTextColor={colors.text.muted}
                    autoCapitalize="none"
                    style={styles.input}
                />
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Create password"
                    placeholderTextColor={colors.text.muted}
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
                        trackColor={{ false: colors.border.strong, true: colors.brand.primary }}
                        thumbColor={colors.text.inverse}
                    />
                </View>

                <AnimatedPressable
                    style={[styles.button, loading && styles.disabledButton]}
                    disabled={loading}
                    onPress={handleRegister}
                >
                    {loading ? <ActivityIndicator color={colors.text.inverse} /> : <Text style={styles.buttonText}>Create Account</Text>}
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
        backgroundColor: colors.bg.app,
        paddingHorizontal: 20,
        paddingTop: 64,
    },
    step: {
        color: colors.brand.primary,
        fontWeight: '700',
        fontSize: 12,
        marginBottom: 8,
    },
    title: {
        color: colors.text.primary,
        fontWeight: '800',
        fontSize: 28,
    },
    subtitle: {
        color: colors.text.secondary,
        marginTop: 6,
        marginBottom: 20,
    },
    card: {
        backgroundColor: colors.bg.card,
        borderRadius: 16,
        borderColor: colors.border.subtle,
        borderWidth: 1,
        padding: 22,
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
    toggleRow: {
        marginTop: 2,
        marginBottom: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
    },
    toggleTitle: {
        color: colors.text.primary,
        fontWeight: '700',
        fontSize: 14,
    },
    toggleDesc: {
        color: colors.text.secondary,
        fontSize: 11,
        marginTop: 2,
    },
    button: {
        backgroundColor: colors.brand.primary,
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 13,
    },
    buttonText: {
        color: colors.text.inverse,
        fontWeight: '800',
        fontSize: 14,
    },
    disabledButton: {
        opacity: 0.6,
    },
    link: {
        textAlign: 'center',
        color: colors.brand.primary,
        marginTop: 12,
        fontWeight: '600',
        fontSize: 12,
    },
});

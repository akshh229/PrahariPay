import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AnimatedScreen from '../components/AnimatedScreen';
import AnimatedPressable from '../components/AnimatedPressable';
import colors from '../theme/colors';

export default function SettingsScreen({ navigation }) {
    const [username, setUsername] = useState('Merchant');
    const [offline, setOffline] = useState(true);
    const [aiGuard, setAiGuard] = useState(true);
    const [notifications, setNotifications] = useState(true);

    useEffect(() => {
        const load = async () => {
            const storedName = await AsyncStorage.getItem('username');
            if (storedName) setUsername(storedName);
        };
        load();
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_id', 'username']);
        navigation.replace('Login');
    };

    return (
        <AnimatedScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.title}>Settings & Security</Text>
            <Text style={styles.subtitle}>Manage app controls and account safety</Text>

            <View style={styles.profileCard}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{username.slice(0, 2).toUpperCase()}</Text></View>
                <View>
                    <Text style={styles.profileName}>{username}</Text>
                    <Text style={styles.profileMeta}>Trust score: 98 • Guardian verified</Text>
                </View>
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Security Controls</Text>
                <SettingToggle label="Offline transacting" value={offline} onChange={setOffline} />
                <SettingToggle label="AI fraud guard" value={aiGuard} onChange={setAiGuard} />
                <SettingToggle label="Notifications" value={notifications} onChange={setNotifications} isLast />
            </View>

            <View style={styles.card}>
                <Text style={styles.cardTitle}>Quick Actions</Text>
                <AnimatedPressable style={styles.actionButton} onPress={() => Alert.alert('Coming soon', 'Key rotation flow will be added next part.')}>
                    <Text style={styles.actionText}>Rotate Keys</Text>
                </AnimatedPressable>
                <AnimatedPressable style={styles.actionButton} onPress={() => navigation.navigate('Sync')}>
                    <Text style={styles.actionText}>Open Sync Center</Text>
                </AnimatedPressable>
            </View>

            <AnimatedPressable style={styles.logoutButton} onPress={handleLogout}>
                <Text style={styles.logoutText}>Log Out</Text>
            </AnimatedPressable>
        </ScrollView>
        </AnimatedScreen>
    );
}

function SettingToggle({ label, value, onChange, isLast = false }) {
    return (
        <View style={[styles.toggleRow, isLast && styles.toggleRowLast]}>
            <Text style={styles.toggleLabel}>{label}</Text>
            <Switch
                value={value}
                onValueChange={onChange}
                trackColor={{ false: colors.border.strong, true: colors.brand.primary }}
                thumbColor={colors.text.inverse}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg.app },
    content: { padding: 20, paddingTop: 50, paddingBottom: 30 },
    title: { color: colors.text.primary, fontSize: 26, fontWeight: '800' },
    subtitle: { color: colors.text.secondary, marginTop: 4, marginBottom: 16 },
    profileCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: colors.bg.card,
        borderRadius: 16,
        borderColor: colors.border.subtle,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: colors.brand.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: { color: colors.text.inverse, fontWeight: '900' },
    profileName: { color: colors.text.primary, fontSize: 16, fontWeight: '700' },
    profileMeta: { color: colors.text.secondary, fontSize: 11, marginTop: 2 },
    card: {
        backgroundColor: colors.bg.card,
        borderRadius: 14,
        borderColor: colors.border.subtle,
        borderWidth: 1,
        padding: 14,
        marginBottom: 12,
    },
    cardTitle: { color: colors.text.primary, fontWeight: '700', marginBottom: 10 },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomColor: colors.border.subtle,
        borderBottomWidth: 1,
    },
    toggleRowLast: {
        borderBottomWidth: 0,
        paddingBottom: 0,
    },
    toggleLabel: { color: colors.text.secondary, fontSize: 13, fontWeight: '600' },
    actionButton: {
        borderRadius: 10,
        borderColor: colors.border.subtle,
        borderWidth: 1,
        backgroundColor: colors.bg.muted,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    actionText: { color: colors.text.primary, fontSize: 13, fontWeight: '600' },
    logoutButton: {
        backgroundColor: colors.status.dangerFg,
        borderRadius: 12,
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    logoutText: { color: colors.text.inverse, fontWeight: '800' },
});

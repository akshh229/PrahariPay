import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

export default function SplashScreen({ navigation }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
        }).start(() => {
            setTimeout(() => navigation.replace('Login'), 500);
        });
    }, []);

    return (
        <View style={styles.container}>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                <Text style={styles.shield}>🛡</Text>
                <Text style={styles.title}>PrahariPay</Text>
                <Text style={styles.subtitle}>Your Intelligent Payment Guardian</Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0f172a',
    },
    shield: { fontSize: 64, marginBottom: 16 },
    title: { fontSize: 32, fontWeight: 'bold', color: '#38bdf8' },
    subtitle: { fontSize: 14, color: '#94a3b8', marginTop: 8 },
});

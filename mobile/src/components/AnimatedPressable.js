import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';

export default function AnimatedPressable({ children, style, onPress, disabled }) {
    const scale = useRef(new Animated.Value(1)).current;

    const animateTo = (value) => {
        Animated.spring(scale, {
            toValue: value,
            friction: 5,
            tension: 120,
            useNativeDriver: true,
        }).start();
    };

    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            onPressIn={() => animateTo(0.97)}
            onPressOut={() => animateTo(1)}
        >
            <Animated.View style={[style, { transform: [{ scale }] }]}>
                {children}
            </Animated.View>
        </Pressable>
    );
}

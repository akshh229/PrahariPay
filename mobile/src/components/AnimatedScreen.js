import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';

export default function AnimatedScreen({ children, delay = 0, yOffset = 14, duration = 380, style }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(yOffset)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration,
                delay,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
        ]).start();
    }, [delay, duration, opacity, translateY]);

    return (
        <Animated.View
            style={[
                {
                    flex: 1,
                    opacity,
                    transform: [{ translateY }],
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
}

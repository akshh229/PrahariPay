import colors from './colors';

const components = {
    card: {
        backgroundColor: colors.bg.card,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 14,
    },
    cardMuted: {
        backgroundColor: colors.bg.muted,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        borderRadius: 14,
    },
    primaryButton: {
        backgroundColor: colors.brand.primary,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pill: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.bg.muted,
    },
};

export default components;

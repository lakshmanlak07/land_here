import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const SUPPORT_EMAIL = 'lakshmanlak07@gmail.com';

/**
 * Themed fallback shown when a descendant throws during render. Kept as its
 * own function component so it can read the theme via hooks — the boundary
 * itself must be a class component.
 */
function ErrorFallback({ onRetry, errorMessage }: { onRetry: () => void; errorMessage: string }) {
  const { colors, spacing, radius } = useTheme();

  function contactSupport() {
    const subject = encodeURIComponent('LandHere app crash report');
    const body = encodeURIComponent(`\n\nError details:\n${errorMessage}`);
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() => {});
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: spacing.xl }]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Something went wrong
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
        The app hit an unexpected error. Tap below to try again, or contact support if it keeps happening.
      </Text>
      <Pressable
        onPress={onRetry}
        style={[styles.btn, { backgroundColor: colors.primary, borderRadius: radius.button, marginBottom: spacing.md }]}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
      <Pressable
        onPress={contactSupport}
        accessibilityRole="button"
        accessibilityLabel="Contact support"
      >
        <Text style={[styles.supportLink, { color: colors.primary }]}>Contact support</Text>
      </Pressable>
    </View>
  );
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

/**
 * Root-level error boundary. Catches any render error anywhere beneath it and
 * shows a friendly themed fallback instead of a blank white screen. "Retry"
 * clears the error state and re-renders the tree.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: unknown): State {
    const msg = error instanceof Error ? error.message : String(error);
    return { hasError: true, errorMessage: msg };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] caught render error:', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, errorMessage: '' });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} errorMessage={this.state.errorMessage} />;
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  btn: { paddingHorizontal: 28, paddingVertical: 14 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  supportLink: { fontSize: 14, textDecorationLine: 'underline', textAlign: 'center' },
});

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

/**
 * Themed fallback shown when a descendant throws during render. Kept as its
 * own function component so it can read the theme via hooks — the boundary
 * itself must be a class component.
 */
function ErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bg, padding: spacing.xl }]}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={[styles.title, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Something went wrong
      </Text>
      <Text style={[styles.body, { color: colors.textSecondary, marginBottom: spacing.xl }]}>
        The app hit an unexpected error. Tap below to try again.
      </Text>
      <Pressable
        onPress={onRetry}
        style={[styles.btn, { backgroundColor: colors.primary, borderRadius: radius.button }]}
      >
        <Text style={styles.btnText}>Try again</Text>
      </Pressable>
    </View>
  );
}

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Root-level error boundary. Catches any render error anywhere beneath it and
 * shows a friendly themed fallback instead of a blank white screen. "Retry"
 * clears the error state and re-renders the tree.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary] caught render error:', error);
  }

  reset = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return <ErrorFallback onRetry={this.reset} />;
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
});

import { Alert, Platform } from 'react-native';

// Cross-platform confirmation dialog.
// React Native's Alert.alert is a no-op on web, so destructive actions
// (delete program, remove exercise, discard workout) silently did nothing.
// On web we fall back to the browser's confirm(); on native we use Alert.
//
// confirmAction({ title, message, confirmText, destructive, onConfirm })
export function confirmAction({ title, message, confirmText = 'OK', cancelText = 'Cancel', destructive = false, onConfirm }) {
  if (Platform.OS === 'web') {
    const ok = window.confirm(message ? `${title}\n\n${message}` : title);
    if (ok) onConfirm?.();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelText, style: 'cancel' },
    { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: () => onConfirm?.() },
  ]);
}

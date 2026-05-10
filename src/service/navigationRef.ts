import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from '../../App';

// Global navigation ref — attach this to <NavigationContainer ref={navigationRef}>
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Navigate to a screen from anywhere outside React components.
 * Used in api.ts interceptor for 401 session expiry redirects.
 */
export function navigateTo(name: keyof RootStackParamList, params?: any) {
  if (navigationRef.isReady()) {
    navigationRef.reset({
      index: 0,
      routes: [{ name, params }],
    });
  } else {
    console.warn('[NavigationRef] Navigator not ready yet. Cannot navigate to:', name);
  }
}

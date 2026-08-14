import { useColorScheme as useRNColorScheme } from 'react-native';

/** Uses React Native's subscription to browser color-scheme changes. */
export function useColorScheme() {
  return useRNColorScheme() ?? 'light';
}

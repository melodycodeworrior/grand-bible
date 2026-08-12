import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { GrandbookTheme } from '@/constants/grandbook-theme';

export default function AppTabs() {
  useColorScheme();
  const colors = GrandbookTheme.colors;

  return (
    <NativeTabs
      backgroundColor={colors.paper}
      indicatorColor={colors.cream}
      labelStyle={{ selected: { color: colors.gold }, default: { color: colors.ink } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home_filled' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="read">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }}
          md={{ default: 'bar_chart', selected: 'bar_chart' }}
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="word">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'sparkle.magnifyingglass', selected: 'sparkle.magnifyingglass' }}
          md={{ default: 'travel_explore', selected: 'travel_explore' }}
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

import { Redirect } from 'expo-router';

import { usePaigeModeStore } from '@/stores/paigeModeStore';

// Land on Summary — except in Paige mode, where Home (chores) is the only tab.
export default function Index() {
  const paigeMode = usePaigeModeStore((s) => s.active);
  return <Redirect href={paigeMode ? '/(tabs)/home' : '/(tabs)/summary'} />;
}

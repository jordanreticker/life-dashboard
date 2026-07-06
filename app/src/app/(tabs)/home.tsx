import { EmptyState, PaneTitle, Screen } from '@/components/ui';

export default function HomeScreen() {
  return (
    <Screen>
      <PaneTitle title="🏠 Home" />
      <EmptyState emoji="🏠" title="Coming together" body="This pane is being ported from the web app." />
    </Screen>
  );
}

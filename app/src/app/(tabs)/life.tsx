import { EmptyState, PaneTitle, Screen } from '@/components/ui';

export default function LifeScreen() {
  return (
    <Screen>
      <PaneTitle title="✦ Life" />
      <EmptyState emoji="✦" title="Coming together" body="This pane is being ported from the web app." />
    </Screen>
  );
}

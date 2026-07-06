import { EmptyState, PaneTitle, Screen } from '@/components/ui';

export default function WorkScreen() {
  return (
    <Screen>
      <PaneTitle title="💼 Work" />
      <EmptyState emoji="💼" title="Coming together" body="This pane is being ported from the web app." />
    </Screen>
  );
}

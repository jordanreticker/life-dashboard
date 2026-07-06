import { EmptyState, PaneTitle, Screen } from '@/components/ui';

export default function SummaryScreen() {
  return (
    <Screen>
      <PaneTitle title="Summary" />
      <EmptyState emoji="⊙" title="Coming together" body="This pane is being ported from the web app." />
    </Screen>
  );
}

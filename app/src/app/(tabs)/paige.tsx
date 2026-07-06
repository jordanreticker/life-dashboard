import { EmptyState, PaneTitle, Screen } from '@/components/ui';

export default function PaigeScreen() {
  return (
    <Screen>
      <PaneTitle title="💕 Paige" />
      <EmptyState emoji="💕" title="Coming together" body="This pane is being ported from the web app." />
    </Screen>
  );
}

import { EmptyState, PaneTitle, Screen } from '@/components/ui';

export default function CommunityScreen() {
  return (
    <Screen>
      <PaneTitle title="👥 Community" />
      <EmptyState emoji="👥" title="Coming together" body="This pane is being ported from the web app." />
    </Screen>
  );
}

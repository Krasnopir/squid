import { createFileRoute } from '@tanstack/react-router';

import { TutorialPage } from '@/pages/TutorialPage';

export const Route = createFileRoute('/tutorial')({
  component: TutorialPage,
});

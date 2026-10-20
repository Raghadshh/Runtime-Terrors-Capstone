import RoutineTemplatesScreen from '../../src/features/routines/RoutineTemplatesScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';

export default function Route() {
  return (
    <SignedInOnly>
      <RoutineTemplatesScreen />
    </SignedInOnly>
  );
}
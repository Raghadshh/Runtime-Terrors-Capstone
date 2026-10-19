import RoutineFormScreen from '../../src/features/routines/RoutineFormScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';
export default function Route() { return <SignedInOnly><RoutineFormScreen /></SignedInOnly>; }

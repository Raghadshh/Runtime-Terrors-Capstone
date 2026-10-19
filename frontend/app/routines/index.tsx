import RoutineListScreen from '../../src/features/routines/RoutineListScreen';
import { SignedInOnly } from '../../src/features/tasks/SignedInOnly';
export default function Route() { return <SignedInOnly><RoutineListScreen /></SignedInOnly>; }

/** Sends people to the right setup screen until they are signed in with a finished profile. */
import { Redirect } from "expo-router";
import type { ReactNode } from "react";
import { Text } from "react-native";

import { useAccounts } from "../accounts/AccountsContext";

export function SignedInOnly({ children }: { children: ReactNode }) {
  const { loading, userId, role, fullName } = useAccounts();
  if (loading) return <Text>Loading…</Text>;
  if (!userId) return <Redirect href="/login" />;
  if (!role) return <Redirect href="/account-type" />;
  if (!fullName) return <Redirect href={role === "parent" ? "/parent-profile" : "/independent-profile"} />;
  return <>{children}</>;
}
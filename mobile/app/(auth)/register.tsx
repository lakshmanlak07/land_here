import { Redirect } from 'expo-router';

// Account creation now lives as the first step of the onboarding flow — there is
// no standalone register form anymore. This route is kept only so any lingering
// in-app link or external deep link to /(auth)/register still lands correctly.
export default function RegisterRedirect() {
  return <Redirect href="/(auth)/onboarding" />;
}

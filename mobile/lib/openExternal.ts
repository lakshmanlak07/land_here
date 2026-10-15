import { Linking } from 'react-native';

import { isSafeExternalUrl } from './urlPolicy';

/** Open a link that came from server data, only if it is a plain https URL. */
export function openExternal(url: string | null | undefined): void {
  if (isSafeExternalUrl(url)) Linking.openURL(url).catch(() => {});
}

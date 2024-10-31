import { linkRules } from './linkrules';

export function convertToUniversalLink(url: string, userAgent: string): string {
  const isIOS = /iphone|ipad|ipod/i.test(userAgent);
  const isAndroid = /android/i.test(userAgent);

  if (!isIOS && !isAndroid) return url;

  for (const platform in linkRules) {
    const { match, IOS, Android } = linkRules[platform as keyof typeof linkRules];
    const matchResult = url.match(match);

    if (matchResult) {
      const id = matchResult[1].split('/')[0];
      if (isIOS) {
        return IOS.replace("{id}", id);
      } else if (isAndroid) {
        return Android.replace("{id}", id);
      }
    }
  }
  return url;
}

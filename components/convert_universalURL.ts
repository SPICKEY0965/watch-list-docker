import { linkRules } from './linkrules';

export function convertToUniversalLink(url: string, isMobile: boolean): string {
  // iOSまたはAndroidデバイスの場合にのみ変換を行う
  if (!isMobile) return url; // モバイルでない場合はそのまま返す

  // `platform`の型を `keyof typeof linkRules` に指定してルールオブジェクトを安全に参照
  for (const platform in linkRules) {
    const { match, universal } = linkRules[platform as keyof typeof linkRules]; // 型を明示的に指定
    const matchResult = url.match(match);
    if (matchResult) {
      // ID部分のみを抽出し、それ以降のパラメータを削除
      const id = matchResult[1].split('/')[0];
      return universal.replace("{id}", id);
    }
  }
  return url; // マッチしなければ通常のURLをそのまま返す
}

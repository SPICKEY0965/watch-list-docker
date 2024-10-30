export const linkRules = {
  amazon: {
    match: /https:\/\/www\.amazon\.(?:com|co\.jp)\/gp\/video\/detail\/([A-Z0-9]+)/,  // 不要な部分を無視し、ASINのみをキャプチャ
    universal: "aiv://aiv/play?asin={id}",
  },
  netflix: {
    match: /https:\/\/www\.netflix\.com\/watch\/([0-9]+)/,
    universal: "nflx://www.netflix.com/watch/{id}",
  },
  hulu: {
    match: /https:\/\/www\.hulu\.com\/watch\/([A-Za-z0-9]+)/,
    universal: "hulustart://play/{id}",
  },
  // 他のプラットフォームも必要に応じて追加
} as const;

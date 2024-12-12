export const linkRules = {
  amazon: {
    match: /\/(B0[A-Z0-9]+)\//,
    IOS: "aiv://aiv/detail?asin={id}",
    Android: "intent://watch.amazon.com/detail?asin={id}"
  },
  // 他のプラットフォームも必要に応じて追加
} as const;

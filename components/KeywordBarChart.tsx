"use client"

import type React from "react"
import ReactECharts from "echarts-for-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface Keyword {
  text: string
  score: number
}

interface KeywordBarChartProps {
  keywords: Keyword[]
  isLoading: boolean
}

const KeywordBarChart: React.FC<KeywordBarChartProps> = ({ keywords, isLoading }) => {
  if (isLoading) {
    return (
      <Card className="bg-gray-800 text-white">
        <CardHeader>
          <CardTitle>キーワード分析</CardTitle>
          <CardDescription className="text-gray-400">
            高評価作品から抽出されたキーワードの重要度を示します。
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <div className="space-y-4 w-full">
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
            <Skeleton className="h-8 w-full bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!keywords || keywords.length === 0) {
    return (
      <Card className="bg-gray-800 text-white">
        <CardHeader>
          <CardTitle>キーワード分析</CardTitle>
          <CardDescription className="text-gray-400">
            高評価作品から抽出されたキーワードの重要度を示します。
          </CardDescription>
        </CardHeader>
        <CardContent className="h-80 flex items-center justify-center">
          <p className="text-gray-400">分析対象のデータがありません。より多くの作品を評価してください。</p>
        </CardContent>
      </Card>
    )
  }

  // スコアで降順にソートし、上位15件に絞る
  const sortedKeywords = [...keywords]
    .sort((a, b) => b.score - a.score)
    .slice(0, 15)
    .reverse() // EChartsの横棒グラフは下から上に描画されるため逆順にする

  const chartData = sortedKeywords.map((kw) => kw.score)
  const yAxisData = sortedKeywords.map((kw) => kw.text)

  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "shadow",
      },
      formatter: (params: any) => `${params[0].name} : ${params[0].value.toFixed(3)}`,
      backgroundColor: "rgba(31, 41, 55, 0.9)", // bg-gray-800 with opacity
      borderColor: "rgba(75, 85, 99, 0.8)", // border-gray-600
      textStyle: {
        color: "#fff",
      },
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "value",
      boundaryGap: [0, 0.01],
      axisLabel: {
        formatter: "{value}",
        color: "#FFFFFF", // 白に固定
      },
      splitLine: {
        lineStyle: {
          color: "rgba(255, 255, 255, 0.2)", // 明るいグレーの線に変更
        },
      },
    },
    yAxis: {
      type: "category",
      data: yAxisData,
      axisLabel: {
        interval: 0, // すべてのラベルを表示
        rotate: 0, // ラベルの回転をなしに
        overflow: "truncate", // 長いラベルを省略
        width: 100, // ラベルの最大幅
        color: "#FFFFFF", // 白に固定
      },
      axisLine: {
        lineStyle: {
          color: "rgba(255, 255, 255, 0.3)", // 明るいグレーの線に変更
        },
      },
    },
    series: [
      {
        name: "Score",
        type: "bar",
        data: chartData,
        // プライマリカラーが黒なので、棒の色はアクセントカラー（例: 青）に変更
        itemStyle: {
          color: "#38bdf8", // 明るい水色に変更
        },
      },
    ],
  }

  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>キーワード分析 (上位15件)</CardTitle>
        <CardDescription className="text-gray-400">
          高評価作品から抽出されたキーワードの重要度を示します。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ReactECharts option={option} style={{ height: "500px", width: "100%" }} />
      </CardContent>
    </Card>
  )
}

export default KeywordBarChart

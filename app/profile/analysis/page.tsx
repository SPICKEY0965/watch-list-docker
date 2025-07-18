"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/useAuth"
import { usePreferenceAnalysis } from "@/hooks/usePreferenceAnalysis"
import { useApiClient } from "@/hooks/useApiClient"
import type { SimilarContent } from "@/components/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { Button } from "@/components/ui/button"

const KeywordBarChart = dynamic(() => import("@/components/KeywordBarChart"), {
  ssr: false,
  loading: () => (
    <Card className="bg-gray-800 text-white">
      <CardHeader>
        <CardTitle className="text-white">キーワードグラフ</CardTitle>
      </CardHeader>
      <CardContent className="h-64 flex items-center justify-center">
        <p className="text-gray-400">キーワードグラフを読み込み中...</p>
      </CardContent>
    </Card>
  ),
})

const MatchAnalyzer = dynamic(() => import("@/components/MatchAnalyzer"), {
  ssr: false,
  loading: () => (
    <Card className="bg-gray-800 text-white">
      <CardHeader>
        <CardTitle className="text-white">分析コンポーネント</CardTitle>
      </CardHeader>
      <CardContent className="h-64 flex items-center justify-center">
        <p className="text-gray-400">分析コンポーネントを読み込み中...</p>
      </CardContent>
    </Card>
  ),
})

export default function AnalysisPage() {
  const { user, token, handleLogout } = useAuth()
  const { data, isLoading, error } = usePreferenceAnalysis(user?.id || null)
  const apiClient = useApiClient(token, handleLogout)
  const [recommendations, setRecommendations] = useState<SimilarContent[]>([])
  const [recsLoading, setRecsLoading] = useState(true)

  useEffect(() => {
    const fetchRecommendations = async () => {
      if (!user) return
      setRecsLoading(true)
      try {
        const response = await apiClient.get("/api/users/recommendations")
        setRecommendations(response.data)
      } catch (err) {
        console.error("Failed to fetch recommendations:", err)
      } finally {
        setRecsLoading(false)
      }
    }
    fetchRecommendations()
  }, [user, apiClient])

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="container mx-auto max-w-6xl">
          <Card className="bg-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">ログインしてください</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">このページを表示するにはログインが必要です。</p>
              <Button asChild className="mt-4">
                <Link href="/login">ログインページへ</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="container mx-auto max-w-6xl">
          <Card className="bg-gray-800 text-white border-red-500">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-red-400">エラー</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-300">分析データの取得中にエラーが発生しました。</p>
              <p className="text-sm text-gray-400 mt-2">{error.message}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <div className="container mx-auto space-y-8 max-w-6xl">
        <header className="mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white text-center md:text-left w-full md:w-auto">
              あなたの視聴傾向分析
            </h1>
            <div className="w-full md:w-auto flex justify-center md:justify-end">
              <Button asChild variant="outline" className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
                <Link href="/home">ホームへ</Link>
              </Button>
            </div>
          </div>
          <p className="text-lg text-gray-300 text-center md:text-left">
            高評価（SまたはSS）を付けた作品の概要を分析し、あなたの好みを可視化します。
          </p>
        </header>

        <section>
          <KeywordBarChart keywords={data?.keywordAnalysis || []} isLoading={isLoading} />
        </section>

        <section>
          <MatchAnalyzer userPreferenceVector={data?.userPreferenceVector} />
        </section>

        <section>
          <Card className="bg-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-white">あなたへのおすすめ作品</CardTitle>
              <CardDescription className="text-gray-300">
                あなたの視聴傾向に基づいてパーソナライズされたおすすめ作品です。
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recsLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div key={index} className="space-y-2">
                      <Skeleton className="w-full aspect-[2/3] rounded-md bg-gray-700" />
                      <Skeleton className="h-4 w-3/4 mx-auto bg-gray-700" />
                      <Skeleton className="h-3 w-1/2 mx-auto bg-gray-700" />
                    </div>
                  ))}
                </div>
              ) : recommendations.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {recommendations.map((item) => (
                    <Card key={item.content_id} className="overflow-hidden bg-gray-700 border-none">
                      <CardContent className="p-0">
                        <img
                          src={item.image || "/placeholder.svg?height=300&width=200"}
                          alt={item.title}
                          className="w-full h-auto rounded-t-md object-cover aspect-[2/3]"
                        />
                        <div className="p-2 text-center">
                          <p className="text-sm font-semibold truncate text-white">{item.title}</p>
                          <p className="text-xs text-gray-400">類似度: {Math.round(item.similarity * 100)}%</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400">おすすめ作品を生成するには、より多くの作品を評価してください。</p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { useApiClient } from "@/hooks/useApiClient"
import { useAuth } from "@/hooks/useAuth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Terminal } from "lucide-react"

interface MatchAnalyzerProps {
  userPreferenceVector: number[] | undefined
}

// Cosine similarity function (moved from backend for frontend calculation)
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0
  const dotProduct = vecA.reduce((acc, val, i) => acc + val * vecB[i], 0)
  const normA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0))
  const normB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0))
  if (normA === 0 || normB === 0) return 0
  return dotProduct / (normA * normB)
}

const MatchAnalyzer: React.FC<MatchAnalyzerProps> = ({ userPreferenceVector }) => {
  const { token, handleLogout } = useAuth()
  const apiClient = useApiClient(token, handleLogout)
  const [text, setText] = useState("")
  const [matchScore, setMatchScore] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError("分析対象のテキストを入力してください。")
      return
    }
    if (!userPreferenceVector || userPreferenceVector.length === 0) {
      setError("ご自身の高評価作品が不足しているため分析できません。より多くの作品を評価してください。")
      return
    }

    setIsLoading(true)
    setError(null)
    setMatchScore(null)

    try {
      const response = await apiClient.post("/api/embedding", { text })
      const contentVector = response.data.embedding
      if (contentVector && contentVector.length > 0) {
        const similarity = cosineSimilarity(userPreferenceVector, contentVector)
        setMatchScore(similarity)
      } else {
        throw new Error("Failed to get embedding for the text.")
      }
    } catch (err) {
      console.error("Analysis failed:", err)
      setError("分析中にエラーが発生しました。ネットワーク接続を確認するか、後でもう一度お試しください。")
    } finally {
      setIsLoading(false)
    }
  }, [text, userPreferenceVector, apiClient])

  return (
    <Card className="bg-gray-800 text-white">
      <CardHeader>
        <CardTitle>好みとのマッチ度分析</CardTitle>
        <CardDescription className="text-gray-400">
          気になる作品の概要を貼り付けて、あなたの視聴傾向とどれくらい一致するかを分析します。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Textarea
          placeholder="ここに作品のあらすじや説明文を貼り付けてください..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="w-full resize-y min-h-[120px] bg-gray-700 text-white border-gray-600 focus:border-blue-500"
        />
        <Button
          onClick={handleAnalyze}
          disabled={isLoading || !text.trim() || !userPreferenceVector || userPreferenceVector.length === 0}
        >
          {isLoading ? "分析中..." : "マッチ度を分析する"}
        </Button>

        {error && (
          <Alert variant="destructive" className="bg-red-900/20 text-red-400 border-red-500">
            <Terminal className="h-4 w-4" />
            <AlertTitle>エラー</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {matchScore !== null && (
          <div className="space-y-4 pt-4 border-t border-gray-700 mt-4">
            <h3 className="text-xl font-semibold">分析結果</h3>
            <div className="flex items-center justify-between">
              <p className="text-lg">マッチ度:</p>
              {/* マッチ度の%表示を白に変更 */}
              <p className="font-bold text-3xl text-white">{Math.round(matchScore * 100)}%</p>
            </div>
            {/* プログレスバーの塗りつぶし色をプライマリカラー（黒）ではなく、アクセントカラー（例: 青）に変更 */}
            <Progress value={matchScore * 100} className="w-full h-3 bg-gray-700 [&>*]:bg-blue-500" />
            <p className="text-sm text-gray-400">
              このスコアは、あなたの過去の高評価作品の傾向と、入力されたテキストの関連性の高さを示します。
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MatchAnalyzer

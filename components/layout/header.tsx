"use client"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { ContentsRating, ContentsStatus } from "@/components/types"
import { Filter, Plus, Settings } from "lucide-react"
import Link from "next/link"

//
// ヘッダーコンポーネント（モバイルとデスクトップ）
//
interface HeaderProps {
    activeTab: ContentsStatus | "All"
    setActiveTab: (value: ContentsStatus | "All") => void
    activeRating: ContentsRating | "All" | null
    setActiveRating: (value: ContentsRating | "All" | null) => void
    sortBy: string
    onSort: (criteria: string) => void
    onAdd: () => void
    onLogout: () => void
    onOpenFilter: () => void
    onUpdateAll?: () => void
    isUpdating?: boolean
}

export default function Header({
    activeTab,
    setActiveTab,
    activeRating,
    setActiveRating,
    sortBy,
    onSort,
    onAdd,
    onLogout,
    onOpenFilter,
    onUpdateAll,
    isUpdating,
}: HeaderProps) {
    // 共通の設定ボタン
    const renderSettingsButton = () => (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
                    <Settings className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 bg-gray-800 border-gray-700 text-white">
                <div className="grid gap-1">
                    <Button variant="ghost" className="w-full justify-start hover:bg-gray-700" asChild>
                        <Link href="/profile/analysis">視聴傾向を分析</Link>
                    </Button>
                    {onUpdateAll && (
                        <Button
                            variant="ghost"
                            className="w-full justify-start hover:bg-gray-700"
                            onClick={onUpdateAll}
                            disabled={isUpdating}
                        >
                            {isUpdating ? "更新中..." : "全コンテンツの情報を更新"}
                        </Button>
                    )}
                    <hr className="border-gray-700 my-1" />
                    <Button variant="ghost" className="w-full justify-start hover:bg-gray-700" onClick={onLogout}>
                        ログアウト
                    </Button>
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-red-500 hover:bg-gray-700 hover:text-red-400"
                        onClick={() => {
                            // アカウント削除のトリガーは親コンポーネントで管理
                            document.dispatchEvent(new CustomEvent("openDeleteAccountDialog"))
                        }}
                    >
                        アカウント削除
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    )

    // ステータスタブ
    const statusTabs = [
        ["All", "すべて"],
        ["Watching", "視聴中"],
        ["On-hold", "保留中"],
        ["Plan to watch", "視聴予定"],
        ["Dropped", "視聴中止"],
        ["Completed", "視聴完了"],
    ]

    // 評価フィルター
    const ratingFilters = ["All", "SS", "S", "A", "B", "C", "unrated"]

    return (
        <div className="bg-gray-900 text-white">
            {/* モバイル版 */}
            <div className="flex justify-between items-center p-4 md:hidden">
                <h1 className="text-xl font-bold flex items-center gap-2">ウォッチリスト</h1>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onOpenFilter}
                        aria-label="フィルターとソートメニューを開く"
                        className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                    >
                        <Filter className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onAdd}
                        className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                    {renderSettingsButton()}
                </div>
            </div>

            {/* デスクトップ版 */}
            <div className="hidden md:block">
                {/* ヘッダー上部 */}
                <div className=" mx-auto px-6 py-4 flex justify-between items-center border-b border-gray-800">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        ウォッチリスト
                    </h1>
                    <div className="flex items-center gap-3">
                        <Select value={sortBy} onValueChange={onSort}>
                            <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-700">
                                <SelectValue placeholder="並び替え" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-700 text-white">
                                <SelectItem value="Recently Updated">更新日順</SelectItem>
                                <SelectItem value="Name A-Z">タイトル順</SelectItem>
                                <SelectItem value="Released Date">放送日順</SelectItem>
                                <SelectItem value="Rating">評価順</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={onAdd}
                            className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700"
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                        {renderSettingsButton()}
                    </div>
                </div>

                {/* デスクトップ版評価フィルター */}
                <div className="flex gap-2 md:gap-4 flex-wrap mb-2">
                    {[
                        ['All', 'すべて'],
                        ['Watching', '視聴中'],
                        ['On-hold', '保留中'],
                        ['Plan to watch', '視聴予定'],
                        ['Dropped', '視聴中止'],
                        ['Completed', '視聴完了']
                    ].map(([value, label]) => (
                        <Button
                            key={value}
                            variant={activeTab === value ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveTab(value as ContentsStatus | 'All')}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
                <div className="hidden md:flex gap-2 md:gap-4 mb-6 flex-wrap">
                    {['All', 'SS', 'S', 'A', 'B', 'C', 'unrated'].map((rating) => (
                        <Button
                            key={rating}
                            variant={activeRating === rating ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveRating(rating as ContentsRating | 'All')}
                        >
                            {rating === 'All' ? 'すべて' : rating === 'unrated' ? '未評価' : rating}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    )
}

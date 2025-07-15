"use client"

import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import type { Contents, ContentsStatus } from "@/components/types"
import { getAiringStatus } from "@/components/utils"
import { Edit, Info, MoreVertical, Play, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { convertToUniversalLink } from '@/components/convert_universalURL';

//
// コンテンツカード（個別の表示部分）
//
interface ContentsCardProps {
    contents: Contents
    onEdit: (contents: Contents) => void
    onDelete: (id: number) => void
    onStatusChange: (id: number, newStatus: ContentsStatus) => void
}

export default function ContentsCard({ contents, onEdit, onDelete, onStatusChange }: ContentsCardProps) {
    // ステータスに基づいて色を決定
    const getStatusColor = (status: string) => {
        switch (status) {
            case "Watching":
                return "bg-emerald-500"
            case "On-hold":
                return "bg-amber-500"
            case "Plan to watch":
                return "bg-blue-500"
            case "Dropped":
                return "bg-red-500"
            case "Completed":
                return "bg-purple-500"
            default:
                return "bg-gray-500"
        }
    }

    // 放送状態に基づいて色とテキストを決定
    const getAiringStatusInfo = (contents: Contents) => {
        const status = getAiringStatus(contents)
        switch (status) {
            case "Upcoming":
                return { text: "放送予定", color: "text-blue-400" }
            case "Airing":
                return { text: "放送中", color: "text-emerald-400" }
            default:
                return { text: "放送終了", color: "text-gray-400" }
        }
    }

    const airingStatus = getAiringStatusInfo(contents)
    const statusColor = getStatusColor(contents.status)

    return (
        <div className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-gray-800 to-gray-900 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02]">
            {/* 画像オーバーレイ */}
            <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent opacity-60 z-10"></div>
                <img
                    src={contents.image || "/placeholder.svg"}
                    alt={contents.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                {/* ステータスバッジ - 左上 */}
                <Badge className={cn("absolute top-2 left-2 z-20 px-2 py-1 text-xs font-medium text-white", statusColor)}>
                    {
                        {
                            Watching: "視聴中",
                            "On-hold": "保留中",
                            "Plan to watch": "視聴予定",
                            Dropped: "視聴中止",
                            Completed: "視聴完了",
                        }[contents.status]
                    }
                </Badge>

                {/* アクションボタン - 右上 */}
                <div className="absolute top-2 right-2 z-20 flex gap-1.5">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 transition-colors"
                            >
                                <Info className="h-4 w-4 text-white" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-0 overflow-hidden rounded-xl border-0 shadow-xl">
                            <div className="relative">
                                <div className="h-24 overflow-hidden">
                                    <img
                                        src={contents.image || "/placeholder.svg"}
                                        alt={contents.title}
                                        className="w-full h-full object-cover brightness-[0.7]"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent"></div>
                                </div>
                                <div className="absolute bottom-2 left-4">
                                    <h3 className="font-bold text-lg text-black drop-shadow-md">{contents.title}</h3>
                                </div>
                            </div>
                            <div className="p-4 space-y-4">
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <p className="text-muted-foreground">放送日</p>
                                        <p className="font-medium">{contents.broadcastDate}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">更新日</p>
                                        <p className="font-medium">{contents.updateDay}</p>
                                    </div>
                                    <div>
                                        <p className="text-muted-foreground">ステータス</p>
                                        <p className="font-medium">
                                            {
                                                {
                                                    Watching: "視聴中",
                                                    "On-hold": "保留中",
                                                    "Plan to watch": "視聴予定",
                                                    Dropped: "視聴中止",
                                                    Completed: "視聴完了",
                                                }[contents.status]
                                            }
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-sm text-muted-foreground">評価:</p>
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "font-bold",
                                            contents.rating === "SS"
                                                ? "bg-amber-500/20 text-amber-500 border-amber-500/50"
                                                : contents.rating === "S"
                                                    ? "bg-purple-500/20 text-purple-500 border-purple-500/50"
                                                    : contents.rating === "A"
                                                        ? "bg-blue-500/20 text-blue-500 border-blue-500/50"
                                                        : contents.rating === "B"
                                                            ? "bg-green-500/20 text-green-500 border-green-500/50"
                                                            : contents.rating === "C"
                                                                ? "bg-gray-500/20 text-gray-500 border-gray-500/50"
                                                                : "bg-gray-500/20 text-gray-400 border-gray-500/50",
                                        )}
                                    >
                                        {contents.rating === "unrated" ? "未評価" : contents.rating}
                                    </Badge>
                                </div>
                                <p className="text-sm">
                                <strong>シェア:</strong> {
                                    {
                                        "true": '非公開',
                                        "false": '公開',
                                    }[contents.is_private]
                                }
                                </p>
                                
                                <Button className="w-full" variant="default">
                                    <a
                                        href={convertToUniversalLink(contents.streaming_url, navigator.userAgent)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-full"
                                    >
                                        <Play className="mr-2 h-4 w-4" />
                                        視聴する
                                    </a>
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="secondary"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700 transition-colors"
                            >
                                <MoreVertical className="h-4 w-4 text-white" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => onEdit(contents)} className="cursor-pointer">
                                <Edit className="mr-2 h-4 w-4" />
                                <span>編集</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">ステータス変更</div>
                            {[
                                ["Watching", "視聴中"],
                                ["On-hold", "保留中"],
                                ["Plan to watch", "視聴予定"],
                                ["Dropped", "視聴中止"],
                                ["Completed", "視聴完了"],
                            ].map(([value, label]) => (
                                <DropdownMenuItem
                                    key={value}
                                    onSelect={() => onStatusChange(contents.content_id, value as ContentsStatus)}
                                    className="cursor-pointer"
                                >
                                    <div className="flex items-center justify-between w-full">
                                        <span>{label}</span>
                                        {contents.status === value && <span className="text-primary">✓</span>}
                                    </div>
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onSelect={() => onDelete(contents.content_id)}
                                className="text-red-500 cursor-pointer focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/50"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>削除</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* コンテンツ情報 */}
            <div className="p-4 space-y-3">
                <h3 className="font-bold text-sm md:text-base line-clamp-1">
                    {contents.title}
                </h3>

                <div className="flex justify-between items-center text-xs md:text-sm">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-background/50 backdrop-blur-sm">
                            {contents.currentEpisode}/{contents.episodes}
                        </Badge>
                        {contents.rating !== undefined && contents.rating !== null && contents.rating ? (
                            <div className="flex items-center">
                                <Badge
                                    variant="outline"
                                    className={cn(
                                        "font-bold",
                                        contents.rating === "SS"
                                            ? "bg-amber-500/20 text-amber-500 border-amber-500/50"
                                            : contents.rating === "S"
                                                ? "bg-purple-500/20 text-purple-500 border-purple-500/50"
                                                : contents.rating === "A"
                                                    ? "bg-blue-500/20 text-blue-500 border-blue-500/50"
                                                    : contents.rating === "B"
                                                        ? "bg-green-500/20 text-green-500 border-green-500/50"
                                                        : contents.rating === "C"
                                                            ? "bg-gray-500/20 text-gray-500 border-gray-500/50"
                                                            : "bg-gray-500/20 text-gray-400 border-gray-500/50",
                                    )}
                                >
                                    {contents.rating === "unrated" ? "未評価" : contents.rating}
                                </Badge>
                            </div>
                        ) : (
                            <div className="flex items-center">
                                <Badge variant="outline" className="font-bold bg-gray-500/20 text-gray-400 border-gray-500/50">未評価</Badge>
                            </div>
                        )}
                        <span className={cn("text-xs", airingStatus.color)}>{airingStatus.text}</span>
                    </div>
                </div>
            </div>

            {/* 再生ボタン - 右下 */}
            <Button
                variant="default"
                size="icon"
                className="absolute bottom-4 right-4 h-9 w-9 rounded-full shadow-lg"
                onClick={() => window.open(convertToUniversalLink(contents.streaming_url, navigator.userAgent), "_blank")}
            >
                <Play className="h-4 w-4" />
            </Button>
        </div >
    )
}

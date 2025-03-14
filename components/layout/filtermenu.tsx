import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contents, ContentsRating, ContentsStatus } from '@/components/types';
import { getAiringStatus } from "@/components/utils";
import { useState } from "react";

//
// フィルターメニュー（モバイル版）
//
interface FilterMenuProps {
    activeTab: ContentsStatus | 'All';
    setActiveTab: (value: ContentsStatus | 'All') => void;
    activeRating: ContentsRating | 'All';
    setActiveRating: (value: ContentsRating | 'All') => void;
    sortBy: string;
    onSort: (criteria: string) => void;
}

export default function FilterMenu({ activeTab, setActiveTab, activeRating, setActiveRating, sortBy, onSort }: FilterMenuProps) {
    return (
        <div className="md:hidden mb-4 space-y-4 bg-gray-800 p-4 rounded-lg">
            <div>
                <h3 className="mb-2 text-sm font-medium">ステータス</h3>
                <div className="grid grid-cols-2 gap-2">
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
                            variant={activeTab === value ? "secondary" : "outline"}
                            size="sm"
                            className={activeTab === value ? 'bg-[#a3d3ca] text-white border-blue-500' : 'bg-gray-800 text-white border-gray-700'}
                            onClick={() => setActiveTab(value as ContentsStatus | 'All')}
                        >
                            {label}
                        </Button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="mb-2 text-sm font-medium">評価</h3>
                <div className="grid grid-cols-3 gap-2">
                    {['All', 'SS', 'S', 'A', 'B', 'C', 'unrated'].map((rating) => (
                        <Button
                            key={rating}
                            variant={activeRating === rating ? "secondary" : "outline"}
                            size="sm"
                            className={activeRating === rating ? 'bg-[#a3d3ca] text-white border-blue-500' : 'bg-gray-800 text-white border-gray-700'}
                            onClick={() => setActiveRating(rating as ContentsRating | 'All')}
                        >
                            {rating === 'All' ? 'すべて' : (rating === 'unrated' ? '未評価' : rating)}
                        </Button>
                    ))}
                </div>
            </div>
            <div>
                <h3 className="mb-2 text-sm font-medium">並び替え</h3>
                <Select value={sortBy} onValueChange={onSort}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="並び替え" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Recently Updated">更新日順</SelectItem>
                        <SelectItem value="Name A-Z">タイトル順</SelectItem>
                        <SelectItem value="Released Date">放送日順</SelectItem>
                        <SelectItem value="Rating">評価順</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}

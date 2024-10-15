import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2 } from 'lucide-react';
import { Anime, AnimeStatus, AnimeRating } from './types';

interface AddEditAnimeDialogProps {
    onAddAnime: (newAnime: Omit<Anime, 'id'>) => void;
    onEditAnime: (editedAnime: Anime) => void;
    animeToEdit: Anime | null;
}

export function AddEditAnimeDialog({ onAddAnime, onEditAnime, animeToEdit }: AddEditAnimeDialogProps) {
    const initialAnimeState: Omit<Anime, 'id'> = {
        title: '',
        type: '',
        duration: '',
        episodes: 12,
        currentEpisode: 0,
        image: '',
        rating: null,
        synopsis: '',
        japaneseTitle: '',
        broadcastDate: '',
        updateDay: '',
        streamingUrl: '',
        status: 'Watching',
        genres: []
    };

    const [anime, setAnime] = useState<Omit<Anime, 'id'>>(initialAnimeState);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (animeToEdit) {
            setAnime(animeToEdit)
        }
    }, [animeToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (animeToEdit) {
                await onEditAnime({ ...anime, id: animeToEdit.id });
            } else {
                await onAddAnime(anime);
            }
            setAnime(initialAnimeState);
            setIsOpen(false);
        } catch (error) {
            console.error('Error saving anime:', error);
            alert('コンテンツの保存中にエラーが発生しました。再試行してください。');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="h-12 w-full flex items-center justify-center bg-gray-800 text-white hover:bg-gray-700"
                    onClick={() => setIsOpen(true)}
                >
                    {animeToEdit ? (
                        <>
                            <Edit2 className="h-5 w-5 mr-2" />
                            編集
                        </>
                    ) : (
                        <>
                            <Plus className="h-5 w-5 mr-2" />
                            追加
                        </>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{animeToEdit ? '編集' : '追加'}</DialogTitle>
                    <DialogDescription className="text-sm">
                        ウォッチリストに{animeToEdit ? '編集' : '追加'}したいコンテンツの詳細を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col justify-between gap-4 py-4 h-full">
                    <div className="space-y-4 overflow-y-auto pr-4">
                        <div className="space-y-1">
                            <Label htmlFor="title" className="text-sm font-medium leading-none">
                                タイトル
                            </Label>
                            <Input
                                id="title"
                                value={anime.title}
                                onChange={(e) => setAnime({ ...anime, title: e.target.value })}
                                className="w-full"
                                placeholder="必須"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="type" className="text-sm font-medium leading-none">
                                ジャンル
                            </Label>
                            <Input
                                id="type"
                                value={anime.type}
                                onChange={(e) => setAnime({ ...anime, type: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="episodes" className="text-sm font-medium leading-none">
                                話数
                            </Label>
                            <Input
                                id="episodes"
                                type="number"
                                value={anime.episodes}
                                onChange={(e) => setAnime({ ...anime, episodes: parseInt(e.target.value) })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="broadcastDate" className="text-sm font-medium leading-none">
                                放送日
                            </Label>
                            <Input
                                id="broadcastDate"
                                type="date"
                                value={anime.broadcastDate}
                                onChange={(e) => setAnime({ ...anime, broadcastDate: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="updateDay" className="text-sm font-medium leading-none">
                                更新日
                            </Label>
                            <Select value={anime.updateDay} onValueChange={(value) => setAnime({ ...anime, updateDay: value })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="曜日を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        ['Monday', '月曜日'],
                                        ['Tuesday', '火曜日'],
                                        ['Wednesday', '水曜日'],
                                        ['Thursday', '木曜日'],
                                        ['Friday', '金曜日'],
                                        ['Saturday', '土曜日'],
                                        ['Sunday', '日曜日']
                                    ].map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="streamingUrl" className="text-sm font-medium leading-none">
                                動画URL
                            </Label>
                            <Input
                                id="streamingUrl"
                                type="url"
                                value={anime.streamingUrl}
                                onChange={(e) => setAnime({ ...anime, streamingUrl: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="image" className="text-sm font-medium leading-none">
                                画像URL
                            </Label>
                            <Input
                                id="image"
                                type="url"
                                value={anime.image}
                                onChange={(e) => setAnime({ ...anime, image: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="status" className="text-sm font-medium leading-none">
                                ステータス
                            </Label>
                            <Select value={anime.status} onValueChange={(value: AnimeStatus) => setAnime({ ...anime, status: value })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="ステータスを選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[
                                        ['Watching', '視聴中'],
                                        ['On-hold', '保留中'],
                                        ['Plan to watch', '視聴予定'],
                                        ['Dropped', '視聴中止'],
                                        ['Completed', '視聴完了']
                                    ].map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="rating" className="text-sm font-medium leading-none">
                                評価
                            </Label>
                            <Select value={anime.rating || ''} onValueChange={(value) => setAnime({ ...anime, rating: value as AnimeRating })}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="評価を選択" />
                                </SelectTrigger>
                                <SelectContent>
                                    {['SS', 'S', 'A', 'B', 'C'].map((rating) => (
                                        <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex gap-4 mt-4 sticky bottom-0">
                        <Button type="button" variant="outline" className="w-full" onClick={() => {
                            setAnime(initialAnimeState);
                            setIsOpen(false);
                        }}>キャンセル</Button>
                        <Button type="submit" className="w-full">{animeToEdit ? '更新' : 'アニメを追加'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
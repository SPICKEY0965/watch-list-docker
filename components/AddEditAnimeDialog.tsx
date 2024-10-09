import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from 'lucide-react';
import { Anime, AnimeStatus, AnimeRating } from './types';

interface AddEditAnimeDialogProps {
    onAddAnime: (newAnime: Omit<Anime, 'id'>) => void;
    onEditAnime: (editedAnime: Anime) => void;
    animeToEdit: Anime | null;
}

export function AddEditAnimeDialog({ onAddAnime, onEditAnime, animeToEdit }: AddEditAnimeDialogProps) {
    const [anime, setAnime] = useState<Omit<Anime, 'id'>>({
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
    })

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
            setAnime({
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
            });
        } catch (error) {
            console.error('Error saving anime:', error);
            alert('コンテンツの保存中にエラーが発生しました。再試行してください。');
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                {animeToEdit ? (
                    <Button variant="outline" className="h-full w-full flex flex-col items-center justify-center bg-gray-800 text-white hover:bg-gray-700">
                        <Plus className="h-6 w-6 mb-2" />
                        編集
                    </Button>
                ) : (
                    <Button variant="outline" className="h-full w-full flex flex-col items-center justify-center bg-gray-800 text-white hover:bg-gray-700">
                        <Plus className="h-6 w-6 mb-2" />
                        追加
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{animeToEdit ? '編集' : '追加'}</DialogTitle>
                    <DialogDescription>
                        ウォッチリストに{animeToEdit ? '編集' : '追加'}したいコンテンツの詳細を入力してください。
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            タイトル
                        </Label>
                        <Input
                            id="title"
                            value={anime.title}
                            onChange={(e) => setAnime({ ...anime, title: e.target.value })}
                            className="col-span-3"
                            placeholder="必須"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            ジャンル
                        </Label>
                        <Input
                            id="type"
                            value={anime.type}
                            onChange={(e) => setAnime({ ...anime, type: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="episodes" className="text-right">
                            話数
                        </Label>
                        <Input
                            id="episodes"
                            type="number"
                            value={anime.episodes}
                            onChange={(e) => setAnime({ ...anime, episodes: parseInt(e.target.value) })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="broadcastDate" className="text-right">
                            放送日
                        </Label>
                        <Input
                            id="broadcastDate"
                            type="date"
                            value={anime.broadcastDate}
                            onChange={(e) => setAnime({ ...anime, broadcastDate: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="updateDay" className="text-right">
                            更新日
                        </Label>
                        <Select value={anime.updateDay} onValueChange={(value) => setAnime({ ...anime, updateDay: value })}>
                            <SelectTrigger className="col-span-3">
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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="streamingUrl" className="text-right">
                            動画URL
                        </Label>
                        <Input
                            id="streamingUrl"
                            type="url"
                            value={anime.streamingUrl}
                            onChange={(e) => setAnime({ ...anime, streamingUrl: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image" className="text-right">
                            画像URL
                        </Label>
                        <Input
                            id="image"
                            type="url"
                            value={anime.image}
                            onChange={(e) => setAnime({ ...anime, image: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="status" className="text-right">
                            ステータス
                        </Label>
                        <Select value={anime.status} onValueChange={(value: AnimeStatus) => setAnime({ ...anime, status: value })}>
                            <SelectTrigger className="col-span-3">
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
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rating" className="text-right">
                            評価
                        </Label>
                        <Select value={anime.rating || ''} onValueChange={(value) => setAnime({ ...anime, rating: value as AnimeRating })}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="評価を選択" />
                            </SelectTrigger>
                            <SelectContent>
                                {['SS', 'S', 'A', 'B', 'C'].map((rating) => (
                                    <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button type="submit">{animeToEdit ? 'アニメを更新' : 'アニメを追加'}</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
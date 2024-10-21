import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2 } from 'lucide-react';
import { Contents, ContentsStatus, ContentsRating } from './types';

interface AddEditContentsDialogProps {
    onAddContents: (newContents: Omit<Contents, 'id'>) => void;
    onEditContents: (editedContents: Contents) => void;
    contentsToEdit: Contents | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddEditContentsDialog({ onAddContents, onEditContents, contentsToEdit, isOpen, onOpenChange }: AddEditContentsDialogProps) {
    const initialContentsState: Omit<Contents, 'id'> = {
        title: '',
        duration: '',
        episodes: 12,
        currentEpisode: 0,
        image: '',
        rating: null,
        broadcastDate: '',
        updateDay: '',
        streamingUrl: '',
        status: 'Watching'
    };

    const [contents, setContents] = useState<Omit<Contents, 'id'>>(initialContentsState);

    useEffect(() => {
        if (contentsToEdit) {
            setContents(contentsToEdit)
        } else {
            setContents(initialContentsState);
        }
    }, [contentsToEdit])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (contentsToEdit) {
                await onEditContents({ ...contents, id: contentsToEdit.id });
            } else {
                await onAddContents(contents);
            }
            setContents(initialContentsState);
            onOpenChange(false);
        } catch (error) {
            console.error('Error saving contents:', error);
            alert('コンテンツの保存中にエラーが発生しました。再試行してください。');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{contentsToEdit ? '編集' : '追加'}</DialogTitle>
                    <DialogDescription className="text-sm">
                        ウォッチリストに{contentsToEdit ? '編集' : '追加'}したいコンテンツの詳細を入力してください。
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
                                value={contents.title}
                                onChange={(e) => setContents({ ...contents, title: e.target.value })}
                                className="w-full"
                                placeholder="必須"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="episodes" className="text-sm font-medium leading-none">
                                話数
                            </Label>
                            <Input
                                id="episodes"
                                type="number"
                                value={contents.episodes}
                                onChange={(e) => setContents({ ...contents, episodes: parseInt(e.target.value) })}
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
                                value={contents.broadcastDate}
                                onChange={(e) => setContents({ ...contents, broadcastDate: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="updateDay" className="text-sm font-medium leading-none">
                                更新日
                            </Label>
                            <Select value={contents.updateDay} onValueChange={(value) => setContents({ ...contents, updateDay: value })}>
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
                                value={contents.streamingUrl}
                                onChange={(e) => setContents({ ...contents, streamingUrl: e.target.value })}
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
                                value={contents.image}
                                onChange={(e) => setContents({ ...contents, image: e.target.value })}
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="status" className="text-sm font-medium leading-none">
                                ステータス
                            </Label>
                            <Select value={contents.status} onValueChange={(value: ContentsStatus) => setContents({ ...contents, status: value })}>
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
                            <Select value={contents.rating || ''} onValueChange={(value) => setContents({ ...contents, rating: value as ContentsRating })}>
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
                        <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>キャンセル</Button>
                        <Button type="submit" className="w-full">{contentsToEdit ? '更新' : '追加'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
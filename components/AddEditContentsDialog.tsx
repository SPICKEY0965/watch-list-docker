import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Contents, ContentsRating, ContentsStatus } from "./types";
import { useApiClient } from '@/hooks/useApiClient';
import { useAuth } from '@/hooks/useAuth';

interface AddEditContentsDialogProps {
    onAddContents: (newContents: Omit<Contents, "content_id">) => void;
    onEditContents: (editedContents: Contents) => void;
    contentsToEdit: Contents | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddEditContentsDialog({
    onAddContents,
    onEditContents,
    contentsToEdit,
    isOpen,
    onOpenChange,
}: AddEditContentsDialogProps) {
    const initialContentsState: Omit<Contents, "content_id"> = {
        title: "",
        episodes: 12,
        currentEpisode: 0,
        image: "",
        rating: "unrated",
        broadcastDate: "",
        updateDay: "",
        content_type: "",
        season: 1,
        cour: 1,
        status: "Watching",
        is_private: "true",
        streaming_url: ""
    };

    const [contents, setContents] = useState<Omit<Contents, "content_id">>(initialContentsState);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const { token, handleLogout } = useAuth();
    const apiClient = useApiClient(token, handleLogout);

    // 放送日から曜日を自動的に判定する関数
    const getDayFromDate = (dateString: string | number | Date) => {
        if (!dateString) return '';
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const date = new Date(dateString);
        return days[date.getDay()];
    };

    useEffect(() => {
        if (contents.broadcastDate) {
            const autoUpdateDay = getDayFromDate(contents.broadcastDate);
            setContents(prev => ({ ...prev, updateDay: autoUpdateDay }));
        }
    }, [contents.broadcastDate]);

    const handleDateTimeChange = (type: string, value: string) => {
        let newDateTime;
        const currentDate = new Date();

        if (type === 'date') {
            const time = contents.broadcastDate
                ? contents.broadcastDate.split('T')[1] ||
                `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`
                : `${currentDate.getHours().toString().padStart(2, '0')}:${currentDate.getMinutes().toString().padStart(2, '0')}`;

            newDateTime = `${value}T${time}`;
        } else {
            const date = contents.broadcastDate
                ? contents.broadcastDate.split('T')[0]
                : currentDate.toISOString().split('T')[0];

            newDateTime = `${date}T${value}`;
        }

        setContents({
            ...contents,
            broadcastDate: newDateTime
        });
    };

    const fetchMetaDataFromVideoUrl = useCallback(
        async (
            videoUrl: string
        ): Promise<{ imageUrl: string | null; broadcastDate: string | null, title: string | null } | null> => {
            if (!videoUrl) {
                setErrors(prev => ({ ...prev, streaming_url: "動画URLを入力してください。" }));
                return null;
            }
            try {
                const response = await apiClient.post('/api/metadata', { url: videoUrl });
                const { imageUrl, broadcastDate, title } = response.data;
                return { imageUrl: imageUrl || null, broadcastDate: broadcastDate || null, title: title || null };
            } catch (error) {
                console.error("Metadataの取得に失敗しました:", error);
                setErrors(prev => ({ ...prev, streaming_url: "取得に失敗しました。" }));
                return null;
            }
        },
        [apiClient, setErrors]
    );


    useEffect(() => {
        if (contentsToEdit) {
            setContents(contentsToEdit);
        } else {
            setContents(initialContentsState);
        }
        setErrors({});
    }, [contentsToEdit]);

    const validateForm = () => {
        const newErrors: { [key: string]: string } = {};
        if (!contents.title.trim()) {
            newErrors.title = "タイトルは必須です。";
        }
        if (contents.episodes <= 0) {
            newErrors.episodes = "話数は0より大きい必要があります。";
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {
            if (contentsToEdit) {
                await onEditContents({ ...contents, content_id: contentsToEdit.content_id });
            } else {
                await onAddContents(contents);
            }
            setContents(initialContentsState);
            onOpenChange(false);
        } catch (error) {
            console.error("コンテンツ保存エラー:", error);
            setErrors(prev => ({ ...prev, submit: "コンテンツの保存中にエラーが発生しました。再試行してください。" }));
        }
    };

    const handleFetchMetaData = async () => {
        setErrors((prev) => {
            const { streaming_url: _, ...rest } = prev;
            return rest;
        });
        if (!contents.streaming_url) {
            setErrors((prev) => ({
                ...prev,
                streaming_url: "動画URLを入力してください。",
            }));
            return;
        }
        setLoading(true);
        const metadata = await fetchMetaDataFromVideoUrl(contents.streaming_url);

        setLoading(false);

        if (metadata && metadata.imageUrl && metadata.broadcastDate && metadata.title) {
            setContents({
                ...contents,
                image: metadata.imageUrl,
                broadcastDate: metadata.broadcastDate,
                title: metadata.title,
            });
        }
    };


    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] w-[95vw] max-w-[95vw] sm:w-full max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl">{contentsToEdit ? "編集" : "追加"}</DialogTitle>
                    <DialogDescription className="text-sm">
                        ウォッチリストに{contentsToEdit ? "編集" : "追加"}したいコンテンツの詳細を入力してください。
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
                                onChange={(e) => {
                                    setContents({ ...contents, title: e.target.value });
                                    if (errors.title) {
                                        const { title, ...rest } = errors;
                                        setErrors(rest);
                                    }
                                }}
                                className="w-full"
                                placeholder="必須"
                            />
                            {errors.title && <p className="text-red-500 text-sm mt-1">{errors.title}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="episodes" className="text-sm font-medium leading-none">
                                話数
                            </Label>
                            <Input
                                id="episodes"
                                type="number"
                                value={contents.episodes}
                                onChange={(e) => {
                                    setContents({ ...contents, episodes: parseInt(e.target.value) });
                                    if (errors.episodes) {
                                        const { episodes, ...rest } = errors;
                                        setErrors(rest);
                                    }
                                }}
                                className="w-full"
                            />
                            {errors.episodes && <p className="text-red-500 text-sm mt-1">{errors.episodes}</p>}
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="broadcastDate" className="text-sm font-medium leading-none">
                                放送日
                            </Label>
                            <div className="flex space-x-2">
                                <Input
                                    id="broadcastDate"
                                    type="date"
                                    value={contents.broadcastDate ? contents.broadcastDate.split('T')[0] : ''}
                                    onChange={(e) => handleDateTimeChange('date', e.target.value)}
                                    className="w-2/3"
                                />
                                <Input
                                    id="broadcastTime"
                                    type="time"
                                    value={contents.broadcastDate && contents.broadcastDate.includes('T')
                                        ? contents.broadcastDate.split('T')[1]
                                        : ''}
                                    onChange={(e) => handleDateTimeChange('time', e.target.value)}
                                    className="w-1/3"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="updateDay" className="text-sm font-medium leading-none">
                                更新日
                            </Label>
                            <Select
                                value={contents.updateDay}
                                onValueChange={(value) => setContents({ ...contents, updateDay: value })}
                            >
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
                            <Label htmlFor="streaming_url" className="text-sm font-medium leading-none">
                                動画URL
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="streaming_url"
                                    type="url"
                                    value={contents.streaming_url}
                                    onChange={(e) => {
                                        setContents({ ...contents, streaming_url: e.target.value });
                                        if (errors.streaming_url) {
                                            const { streaming_url, ...rest } = errors;
                                            setErrors(rest);
                                        }
                                    }}
                                    className="w-full"
                                />
                                <Button type="button" onClick={handleFetchMetaData} disabled={loading}>
                                    {loading ? "取得中..." : "自動入力"}
                                </Button>
                            </div>
                            {errors.streaming_url && <p className="text-red-500 text-sm mt-1">{errors.streaming_url}</p>}
                        </div>
                        {errors.submit && <p className="text-red-500 text-sm mt-1">{errors.submit}</p>}
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
                        <Button type="button" variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                            キャンセル
                        </Button>
                        <Button type="submit" className="w-full">{contentsToEdit ? "更新" : "追加"}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

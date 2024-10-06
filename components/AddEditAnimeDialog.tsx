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
        episodes: 0,
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
                episodes: 0,
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
                        Edit Anime
                    </Button>
                ) : (
                    <Button variant="outline" className="h-full w-full flex flex-col items-center justify-center bg-gray-800 text-white hover:bg-gray-700">
                        <Plus className="h-6 w-6 mb-2" />
                        Add Anime
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{animeToEdit ? 'Edit Anime' : 'Add New Anime'}</DialogTitle>
                    <DialogDescription>
                        Enter the details of the anime you want to {animeToEdit ? 'edit' : 'add'} to your watch list.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="title" className="text-right">
                            Title
                        </Label>
                        <Input
                            id="title"
                            value={anime.title}
                            onChange={(e) => setAnime({ ...anime, title: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="type" className="text-right">
                            Type
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
                            Episodes
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
                            Broadcast Date
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
                            Update Day
                        </Label>
                        <Select value={anime.updateDay} onValueChange={(value) => setAnime({ ...anime, updateDay: value })}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                            <SelectContent>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                    <SelectItem key={day} value={day}>{day}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="streamingUrl" className="text-right">
                            Streaming URL
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
                        <Label htmlFor="status" className="text-right">
                            Status
                        </Label>
                        <Select value={anime.status} onValueChange={(value: AnimeStatus) => setAnime({ ...anime, status: value })}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {['Watching', 'On-hold', 'Plan to watch', 'Dropped', 'Completed'].map((status) => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rating" className="text-right">
                            Rating
                        </Label>
                        <Select value={anime.rating || ''} onValueChange={(value) => setAnime({ ...anime, rating: value as AnimeRating })}>
                            <SelectTrigger className="col-span-3">
                                <SelectValue placeholder="Select rating" />
                            </SelectTrigger>
                            <SelectContent>
                                {['SS', 'S', 'A', 'B', 'C'].map((rating) => (
                                    <SelectItem key={rating} value={rating}>{rating}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="image" className="text-right">
                            Image URL
                        </Label>
                        <Input
                            id="image"
                            type="url"
                            value={anime.image}
                            onChange={(e) => setAnime({ ...anime, image: e.target.value })}
                            className="col-span-3"
                        />
                    </div>
                    <Button type="submit">{animeToEdit ? 'Update Anime' : 'Add Anime'}</Button>
                </form>
            </DialogContent>
        </Dialog>
    )
}
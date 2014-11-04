/// <reference path="../typings/node/node.d.ts" />
export declare class Video {
    filename: string;
    initialSeek: number;
    id: string;
    lastPosition: number;
    timemark: number;
    constructor(filename: string, initialSeek: number);
}
export declare class VideoController {
    private currentVideoCommand;
    private videos;
    constructor(videos: Video[]);
    seek(amount: number): boolean;
    addVideo(videoFilename: string): Video;
    getVideos(): any;
    delVideo(videoId: string): any;
    skip(skipNumber: number): void;
    private startVideo();
    private cleanupCommand();
    private processVideos();
}

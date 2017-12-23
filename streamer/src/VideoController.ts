///<reference path='../typings/node/node.d.ts' />

var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var uuid = require('node-uuid');
var config = require('../config.js');

// Represents the currently running FFMPEG session.
class FFMPEGCommandWrapper {
    public videoId:string;
    public command;

    constructor(public video:Video) {
        this.videoId = video.id;

        if (video.lastPosition) {
            video.initialSeek = video.lastPosition;
        }

        var command = ffmpeg(video.filename)
            .inputOptions('-re')
            .audioCodec('aac')
            .videoCodec('libx264')
            .audioFilters('volume=1.0')
            .videoFilters('scale=-2:' + config.vertical_res)
            .format('flv')
            .addOption('-vb', parseFloat(config.video_bitrate) + 'k')
            .addOption('-minrate', (parseFloat(config.video_bitrate) * 0.8) + 'k')
            .addOption('-bufsize', (parseFloat(config.video_bitrate) * 1.2) + 'k')
            .addOption('-maxrate', (parseFloat(config.video_bitrate) * 1.2) + 'k')
            .output(config.stream_server);

        if (video.initialSeek !== undefined) {
            command.seekInput(video.initialSeek);
        }

        this.command = command;
    }

    run() {
        this.command.run();
    }

    cleanup() {
        if (this.command && this.command.ffmpegProc) {
            this.command.kill();
            this.command = null;
        }
    }
}

// A video in the playlist including current playback progress
export class Video {
    public id:string;
    public lastPosition:number;
    public timemark:number;

    constructor(public filename:string, public initialSeek:number) {
        this.id = uuid.v4().replace(/-/g, '');
    }
}

// The class that manages video playback, including wrangling FFMPEG instances,
// playlist progression, and editing. Ensures that as FFMPEG will always be trying to
// stream the first item in the playlist, as long as there is one.
export class VideoController {
    private currentVideoCommand:FFMPEGCommandWrapper = null;
    private videos:Video[];

    constructor(videos:Video[]) {
        this.videos = videos;
        this.processVideos();
    }

    // Seek ahead (positive) or back (negative) the given number of seconds in the currently
    // playing video. Hacky implementation
    seek(amount:number) {
        if (this.videos.length > 0) {
            var video = this.videos.shift();
            var newVideo = new Video(video.filename, video.lastPosition + amount);
            this.videos.unshift(newVideo);
            this.processVideos();
            return true;
        } else {
            return false;
        }
    }

    // Add the given video to the playlist by filename.
    addVideo(videoFilename:string) {
        var video = new Video(videoFilename, 0);
        this.videos.push(video);
        this.processVideos();
        return video;
    }

    // Get a copy of the current playlist.
    getVideos() {
        return JSON.parse(JSON.stringify(this.videos));
    }

    // Delete the video with the given video ID prefix from the playlist.
    // If the currently playing video is specified, playback for that video is ended automatically.
    delVideo(videoId:string) {
        var foundIndex:number = null;

        for (var i = 0; i < this.videos.length; i++) {
            var subId = this.videos[i].id.slice(0, videoId.length);

            if (subId === videoId) {
                if (foundIndex !== null) {
                    return null;
                } else {
                    foundIndex = i;
                }
            }
        }

        if (foundIndex !== null) {
            this.videos.splice(foundIndex, 1);
            this.processVideos();
            return this.getVideos();
        } else {
            return null;
        }
    }

    // Skip the first <n> videos in the playlist.
    skip(skipNumber:number) {
        if (skipNumber > 0) {
            this.videos.splice(0, skipNumber);
            this.processVideos();
        }
    }

    // Handles starting a video, if necessary. A video will only
    // be started if one of the following is true
    // 1. There is no video currently playing but there is at least one video in the playlist
    // 2. There is a video playing but it doesn't match what is currently the first video in the playlist
    //      - in this case, the currently playing video is ended and the first video in the playlist begins
    private startVideo() {
        var video = this.videos[0];
        if (!this.currentVideoCommand && video) {
            var finished = function () {
                this.delVideo(video.id);
            }.bind(this);

            var currentVideoCommand = new FFMPEGCommandWrapper(video);
            this.currentVideoCommand = currentVideoCommand;
            currentVideoCommand.command.on('error', function (err, stdout, stderr) {
                console.log(err);
                finished();
            });

            currentVideoCommand.command.on('end', function (end) {
                finished();
            });

            currentVideoCommand.command.on('stderr', function(msg) {
                console.log("STDERR: " + msg);
            });

            currentVideoCommand.command.on('progress', function (progress) {
                var timemark = progress.timemark;
                var splitTimemark = timemark.split(':');

                var seconds = 0.0;

                var places = 0;
                while (splitTimemark.length > 0) {
                    var currentField = splitTimemark.pop();
                    seconds += parseFloat(currentField) * Math.pow(60, places);
                    places++;
                }

                video.timemark = seconds;
                video.lastPosition = video.initialSeek + seconds;
            }.bind(this));

            currentVideoCommand.run();
        }
    }

    private cleanupCommand() {
        var video = this.videos[0];

        if (this.currentVideoCommand) {
            if (!video || video.id != this.currentVideoCommand.videoId) {
                this.currentVideoCommand.cleanup();
                this.currentVideoCommand = null;
            }
        }
    }

    private processVideos() {
        this.cleanupCommand();
        this.startVideo();
    }
}

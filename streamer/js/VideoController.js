///<reference path='../typings/node/node.d.ts' />
var ffmpeg = require('fluent-ffmpeg');
var fs = require('fs');
var uuid = require('node-uuid');
var config = require('../config.js');
// Represents the currently running FFMPEG session.
var FFMPEGCommandWrapper = (function () {
    function FFMPEGCommandWrapper(video) {
        this.video = video;
        this.videoId = video.id;
        if (video.lastPosition) {
            video.initialSeek = video.lastPosition;
        }
        var command = ffmpeg(video.filename).inputOptions('-re').audioCodec('libfaac').videoCodec('libx264').audioFilters('volume=1.0').videoFilters('scale=-2:' + config.vertical_res).format('flv').addOption('-vb', parseFloat(config.video_bitrate) + 'k').addOption('-minrate', (parseFloat(config.video_bitrate) * 0.8) + 'k').addOption('-bufsize', (parseFloat(config.video_bitrate) * 1.2) + 'k').addOption('-maxrate', (parseFloat(config.video_bitrate) * 1.2) + 'k').output(config.stream_server);
        if (video.initialSeek !== undefined) {
            command.seekInput(video.initialSeek);
        }
        this.command = command;
    }
    FFMPEGCommandWrapper.prototype.run = function () {
        this.command.run();
    };
    FFMPEGCommandWrapper.prototype.cleanup = function () {
        if (this.command && this.command.ffmpegProc) {
            this.command.kill();
            this.command = null;
        }
    };
    return FFMPEGCommandWrapper;
})();
// A video in the playlist including current playback progress
var Video = (function () {
    function Video(filename, initialSeek) {
        this.filename = filename;
        this.initialSeek = initialSeek;
        this.id = uuid.v4().replace(/-/g, '');
    }
    return Video;
})();
exports.Video = Video;
// The class that manages video playback, including wrangling FFMPEG instances,
// playlist progression, and editing. Ensures that as FFMPEG will always be trying to
// stream the first item in the playlist, as long as there is one.
var VideoController = (function () {
    function VideoController(videos) {
        this.currentVideoCommand = null;
        this.videos = videos;
        this.processVideos();
    }
    // Seek ahead (positive) or back (negative) the given number of seconds in the currently
    // playing video. Hacky implementation
    VideoController.prototype.seek = function (amount) {
        if (this.videos.length > 0) {
            var video = this.videos.shift();
            var newVideo = new Video(video.filename, video.lastPosition + amount);
            this.videos.unshift(newVideo);
            this.processVideos();
            return true;
        }
        else {
            return false;
        }
    };
    // Add the given video to the playlist by filename.
    VideoController.prototype.addVideo = function (videoFilename) {
        var video = new Video(videoFilename, 0);
        this.videos.push(video);
        this.processVideos();
        return video;
    };
    // Get a copy of the current playlist.
    VideoController.prototype.getVideos = function () {
        return JSON.parse(JSON.stringify(this.videos));
    };
    // Delete the video with the given video ID prefix from the playlist.
    // If the currently playing video is specified, playback for that video is ended automatically.
    VideoController.prototype.delVideo = function (videoId) {
        var foundIndex = null;
        for (var i = 0; i < this.videos.length; i++) {
            var subId = this.videos[i].id.slice(0, videoId.length);
            if (subId === videoId) {
                if (foundIndex !== null) {
                    return null;
                }
                else {
                    foundIndex = i;
                }
            }
        }
        if (foundIndex !== null) {
            this.videos.splice(foundIndex, 1);
            this.processVideos();
            return this.getVideos();
        }
        else {
            return null;
        }
    };
    // Skip the first <n> videos in the playlist.
    VideoController.prototype.skip = function (skipNumber) {
        if (skipNumber > 0) {
            this.videos.splice(0, skipNumber);
            this.processVideos();
        }
    };
    // Handles starting a video, if necessary. A video will only
    // be started if one of the following is true
    // 1. There is no video currently playing but there is at least one video in the playlist
    // 2. There is a video playing but it doesn't match what is currently the first video in the playlist
    //      - in this case, the currently playing video is ended and the first video in the playlist begins
    VideoController.prototype.startVideo = function () {
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
    };
    VideoController.prototype.cleanupCommand = function () {
        var video = this.videos[0];
        if (this.currentVideoCommand) {
            if (!video || video.id != this.currentVideoCommand.videoId) {
                this.currentVideoCommand.cleanup();
                this.currentVideoCommand = null;
            }
        }
    };
    VideoController.prototype.processVideos = function () {
        this.cleanupCommand();
        this.startVideo();
    };
    return VideoController;
})();
exports.VideoController = VideoController;
//# sourceMappingURL=VideoController.js.map
///<reference path='../typings/node/node.d.ts' />

import vc = require('./VideoController');
var fs = require('fs');
var config = require('../config.js');

var RpcServer = require('node-json-rpc2').Server;
var server = new RpcServer({
    protocol:'http',
    path:'/',
    port:config.port,
    method:'GET'
});

var playlistFilename = 'playlist.json';

var videos:vc.Video[];

if (fs.existsSync(playlistFilename)) {
    var data = fs.readFileSync(playlistFilename);
    videos = JSON.parse(data);
} else {
    videos = [];
}

var isSaving = false;
var saveVideos = function (videos) {
    if (!isSaving) {
        isSaving = true;
        fs.writeFile(playlistFilename, JSON.stringify(videos, null, 4), function (err) {
            isSaving = false;
        });
    }
};

var videoController = new vc.VideoController(videos);

setInterval(function () {
    saveVideos(videoController.getVideos());
}, 500);

function list(args) {
    var videos = videoController.getVideos();
    return {result:videos};
}

interface ReturnObject {
    error?:Error;
    result?:string;
}

function add(args) {
    if (args.length > 0) {
        for (var i = 0; i < args.length; i++) {
            videoController.addVideo(args[i]);
        }

        return {result:videoController.getVideos()};
    } else {
        return {error:new Error("Add needs a video filename!")}
    }
}

function seek(args) {
    if (args[0] === undefined) {
        return {error:new Error("Need amount to seek ahead or behind.")};
    } else {
        if (videoController.seek(parseFloat(args[0]))) {
            return {result:videoController.getVideos()}
        } else {
            return {result:new Error("Seek failed.")}
        }
    }
}

function skip(args) {
    var skipNumber;

    if (args[0] === undefined) {
        skipNumber = 1;
    } else {
        skipNumber = parseInt(args[0]);
    }

    videoController.skip(skipNumber);

    return {result:videoController.getVideos()};
}

function del(args) {
    var videoId = args[0];

    if (!videoId) {
        return {error:new Error("Del needs a video ID.")}
    }

    var deletedVideo = videoController.delVideo(videoId);
    if (deletedVideo) {
        return {result:videoController.getVideos()}
    } else {
        return {error:new Error("Unable to delete video with id " + videoId)};
    }
}

function help(args) {
    var returnString = "";

    for (var commandName in functions) {
        var command = functions[commandName];
        if (command.usage) {
            returnString += commandName + " " + command.usage;
        } else {
            returnString += commandName;
        }
        returnString += "\n\t" + command.helpString + "\n\n";
    }

    return {result:returnString};
}

interface ServerFunction {
    helpString: string;
    usage: string;
    command: (args) => ReturnObject;
}

var functions:{
    [index: string]: ServerFunction;
} = {
    list: {
        helpString: "Lists the videos currently in the playlist.",
        usage: null,
        command: list
    },
    add: {
        helpString: "Adds video(s) to the end of the playlist.",
        usage: "<file_path> [<file_path> [...]]",
        command: add
    },
    del: {
        helpString: "Deletes videos from the playlist, by video ID. You can give just the first few letters in the video ID.",
        usage: "<video_id> [<video_id> [...]]",
        command: del
    },
    skip: {
        helpString: "Skips <n> videos in the playlist.",
        usage: "<n>",
        command: skip
    },
    seek: {
        helpString: "Seeks <n> seconds ahead or back in the currently playing video.",
        usage: "<n>",
        command: seek
    },
    help: {
        helpString: "Returns this help string.",
        usage: "",
        command: help
    }
};

for (var k in functions) {
    (function() {
        var key = k;
        server.addMethod(key, function exposed(args, id) {
            var result = functions[key].command(args);
            return {
                id:id,
                result:result.result,
                error:result.error
            }
        });
    })();
}
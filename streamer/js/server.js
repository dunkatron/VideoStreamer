"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var rpc = require('json-rpc2');
var vc = require("./VideoController");
var fs = require('fs');
var config = require('../config.js');
var server = rpc.Server.$create({
    'websocket': true,
    'headers': {
        'Access-Control-Allow-Origin': '*'
    }
});
var playlistFilename = 'playlist.json';
var videos;
if (fs.existsSync(playlistFilename)) {
    var data = fs.readFileSync(playlistFilename);
    videos = JSON.parse(data);
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
function list(args, opt, callback) {
    var videos = videoController.getVideos();
    callback(null, videos);
}
function add(args, opt, callback) {
    if (args.length > 0) {
        for (var i = 0; i < args.length; i++) {
            videoController.addVideo(args[i]);
        }
        callback(null, videoController.getVideos());
    }
    else {
        callback(new Error("Add needs a video filename!"), null);
    }
}
function seek(args, opt, callback) {
    if (args[0] === undefined) {
        callback(new Error("Need amount to seek ahead or behind."));
    }
    else {
        if (videoController.seek(parseFloat(args[0]))) {
            callback(null, videoController.getVideos());
        }
        else {
            callback(new Error("Seek failed."));
        }
    }
}
function skip(args, opt, callback) {
    var skipNumber;
    if (args[0] === undefined) {
        skipNumber = 1;
    }
    else {
        skipNumber = parseInt(args[0]);
    }
    videoController.skip(skipNumber);
    callback(null, videoController.getVideos());
}
function del(args, opt, callback) {
    var videoId = args[0];
    if (!videoId) {
        callback(new Error("Del needs a video ID."));
        return;
    }
    var deletedVideo = videoController.delVideo(videoId);
    if (deletedVideo) {
        callback(null, videoController.getVideos());
    }
    else {
        callback(new Error("Unable to delete video with id " + videoId));
    }
}
function help(args, opt, callback) {
    var returnString = "";
    for (var commandName in functions) {
        var command = functions[commandName];
        if (command.usage) {
            returnString += commandName + " " + command.usage;
        }
        else {
            returnString += commandName;
        }
        returnString += "\n\t" + command.helpString + "\n\n";
    }
    callback(null, returnString);
}
var functions = {
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
    server.expose(k, functions[k].command);
}
server.listenHybrid(config.port, 'localhost');
//# sourceMappingURL=server.js.map
var config = {};

// Streaming server URL. Usually of the format "rtmp://<server>/<path>/<stream_key>".
config.stream_server = "rtmp://<server>/<path>/<stream_key>";

// How many pixels in height the output stream should be. The width is calculated for you according to each video's
// aspect ratio.
config.vertical_res = '480';

// The bitrate to broadcast at, in kbit/s.
config.video_bitrate = 1800;

// You shouldn't need to change this, but it's the internal port that the client uses to talk to the server.
config.port = 42069;

module.exports = config;

# VideoStreamer

VideoStreamer is an easy way to stream any ffmpeg-supported video to an RTMP server. 
It includes playlist support (including persistent playback state).

## Requirements

- Node.js
- ffmpeg

## Setup

Install Node.js and ensure that npm is working. 
From the streamer directory run "npm install" to install all Node.js dependencies.

Edit streamer/config.js and change the stream URL to whatever is appropriate for your streaming service.

## Running

This tool consists of two parts:

- server.js: always runs, manages keeping ffmpeg alive and progressing through the playlist
- client.js: run to make changes to the currently running playlist and get status updates

First, start server.js. Go to the streamer directory and run "node js/server.js". 
The server is now waiting for files to be dropped into its playlist.

Now, run "node js/client.js add &lt;file_path&gt;". This will add a file to VideoStreamer's playlist and it will begin playing.
As long as there is something in VideoStreamer's playlist to play, it will play it.

## Notes
This has only been tested on Mac OSX.

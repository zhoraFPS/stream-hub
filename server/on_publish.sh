#!/bin/sh

# $MTX_PATH contains the path being published (e.g., live/<STREAM_KEY>)
# Extract the stream key (last part of the path)
STREAM_KEY=$(basename "$MTX_PATH")

# Send "start" webhook to the Node.js backend with streamKey in query param + post data
wget -qO- --post-data="streamKey=$STREAM_KEY" "http://stream-hub:5000/api/internal/obs-start?streamKey=$STREAM_KEY"

# When MediaMTX kills this process (publisher disconnects), send "stop" webhook
trap 'wget -qO- --post-data="streamKey=$STREAM_KEY" "http://stream-hub:5000/api/internal/obs-stop?streamKey=$STREAM_KEY"; exit 0' INT TERM

# Block indefinitely so MediaMTX keeps the RTMP connection alive
sleep 86400

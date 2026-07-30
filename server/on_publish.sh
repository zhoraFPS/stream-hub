#!/bin/sh
# Send "start" webhook to the Node.js backend
wget -qO- --post-data="" http://stream-hub:5000/api/internal/obs-start

# When MediaMTX kills this process (publisher disconnects), send "stop" webhook
trap 'wget -qO- --post-data="" http://stream-hub:5000/api/internal/obs-stop; exit 0' INT TERM

# Block indefinitely so MediaMTX keeps the RTMP connection alive
sleep 86400

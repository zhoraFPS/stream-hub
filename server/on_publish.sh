#!/bin/sh

echo "[on_publish.sh] MTX_PATH is '$MTX_PATH'"
STREAM_KEY=$(basename "$MTX_PATH")
echo "[on_publish.sh] Extracted STREAM_KEY is '$STREAM_KEY'"

if command -v curl >/dev/null 2>&1; then
  curl -s -X POST -H "Content-Type: application/json" -d "{\"streamKey\":\"$STREAM_KEY\", \"path\":\"$MTX_PATH\"}" "http://stream-hub:5000/api/internal/obs-start"
else
  wget -qO- --header="Content-Type: application/json" --post-data="{\"streamKey\":\"$STREAM_KEY\", \"path\":\"$MTX_PATH\"}" "http://stream-hub:5000/api/internal/obs-start"
fi

trap '
  echo "[on_publish.sh] Stopping stream for $STREAM_KEY"
  if command -v curl >/dev/null 2>&1; then
    curl -s -X POST -H "Content-Type: application/json" -d "{\"streamKey\":\"$STREAM_KEY\", \"path\":\"$MTX_PATH\"}" "http://stream-hub:5000/api/internal/obs-stop"
  else
    wget -qO- --header="Content-Type: application/json" --post-data="{\"streamKey\":\"$STREAM_KEY\", \"path\":\"$MTX_PATH\"}" "http://stream-hub:5000/api/internal/obs-stop"
  fi
  exit 0
' INT TERM

# Block indefinitely so MediaMTX keeps the RTMP connection alive and can trigger the trap
sleep 86400

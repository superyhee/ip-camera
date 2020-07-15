#!/bin/bash
docker run -e INPUT_URL='wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_175k.mov' \
    -e BUCKET_NAME='yhee-dev-rtsp-playground' \
    -e CAMERA_NAME='cam01' \
    -e SEGMENT_TIME=30 \
    ip-camera
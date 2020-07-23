#!/bin/bash
# recordCam.sh
url='wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_175k.mov'
BASEpath='/app/videos'
mkdir -p $BASEpath

ffmpeg -rtsp_transport tcp -i rtsp://${INPUT_URL} \
-c:v copy -c:a aac -map 0:0 -f segment -segment_time ${SEGMENT_TIME} -segment_format mp4 -strict -2 \
-strftime 1 "$BASEpath/capture-%03d-%Y-%m-%d_%H-%M-%S.mp4"

#!/bin/bash
# recordCam.sh
url='wowzaec2demo.streamlock.net/vod/mp4:BigBuckBunny_175k.mov'
BASEpath='/app/videos'
mkdir -p $BASEpath

ffmpeg -rtsp_transport tcp -i rtsp://${INPUT_URL} \
-c:v copy -c:a copy -map 0 -f segment -segment_time ${SEGMENT_TIME} -segment_format mp4 -strict -2 \
-strftime 1 "$BASEpath/capture-%03d-%Y-%m-%d_%H-%M-%S.mp4"
#ffmpeg -i input -f segment -segment_time 0.0001 -segment_format singlejpeg -segment_wrap 5 pic%d.jpg

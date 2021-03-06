#!/bin/bash
echo "----copy ${INPUT_URL} of ${CAMERA_NAME} to ${BUCKET_NAME}----"
aws s3 ls ${BUCKET_NAME} --region=cn-northwest-1
nohup ./copyfiles.sh ${BUCKET_NAME} ${CAMERA_NAME} >> ./output.log 2>&1 &
./recordCam.sh ${INPUT_URL}
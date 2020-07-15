console.log('Loading event');
var AWS = require('aws-sdk');

exports.handler = async(event) => {
  return new Promise(async(resolve, reject) => {
    try {
      // Initiate ECS SDK
      const ECS = new AWS.ECS();
   //   console.log('Received event:', JSON.stringify(event, null, 2));
      for (const { body } of event.Records) {
        console.log(body);
        var data = JSON.parse(body);
        console.log('SQS message' + data.cameraUrl);
        // trigger task creation on ECS Fargate
        await ECS.runTask({
          cluster: "test",
          taskDefinition: "ip-camera-run-task-definition:2",
          networkConfiguration: {
            awsvpcConfiguration: {
              subnets: ['subnet-0b6becc4e9f9b39c4',
                'subnet-08844a25185266865'
              ],
              assignPublicIp: "ENABLED"
            }
          },
          overrides: {
            containerOverrides: [{
              name: "ip-camera",
              environment: [
                { name: "BUCKET_NAME", "value": "yhee-dev-rtsp-playground" },
                { name: "CAMERA_NAME", "value": data.cameraName },
                { name: "INPUT_URL", "value": data.cameraUrl },
                { name: "SEGMENT_TIME", "value": "30" }
              ]
            }]
          },
          count: 1,
          launchType: "FARGATE"
        }).promise().then(function(data) {
          console.log('成功：' + data);
        }, function(err) {
          console.log('失败：' + err);
        });;
      }
      return resolve();
    }
    catch (error) {
      return reject(error);
    }
  });

};

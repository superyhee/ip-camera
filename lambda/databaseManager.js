var AWS = require('aws-sdk');
const databaseManager = require('./databaseManager');
const ddb = new AWS.DynamoDB.DocumentClient();
const ECS = new AWS.ECS();
const TABLE_NAME = 'eventlog';

exports.handler = (event, context, callback) => {
    return new Promise(async(resolve, reject) => {
       try {
        var taskArn = event.detail.taskArn;
        var env = event.detail.overrides.containerOverrides[0].environment;
        
        var deviceUUID = null;
        var deviceURL = null;
        var eventID=event.id;
        console.log(eventID+":"+taskArn);
        // console.log(JSON.stringify(event.detail.overrides.containerOverrides.environment));
        for (const record of event.detail.overrides.containerOverrides[0].environment) {
            if (record.name == "CAMERA_NAME")
                deviceUUID = record.value;
            if (record.name == "INPUT_URL")
                deviceURL = record.value;
        }
        if (event.detail.desiredStatus == "STOPPED" &&event.detail.lastStatus == "RUNNING"&&
            event.detail.containers[0].lastStatus =="RUNNING"&&
            event.detail.stoppedReason !== "stop recording") {
          console.log('Received event:', JSON.stringify(event, null, 2)); 
               // Idempotent Lambda Handlers
                // let params = { TableName: TABLE_NAME, Key: { deviceUUID } };
                // let creationTime = Math.floor(Date.now() / 1000);
                // const fiveSeconds = creationTime + 10;
                // await ddb.put({
                //     ...params,
                //     ConditionExpression: 'attribute_not_exists(deviceUUID)',
                //     Item: { deviceUUID, ttl: fiveSeconds, creationTime }
                // }).promise();
                
              //  console.log('Received event:', JSON.stringify(event, null, 2));
                await databaseManager.getItem(deviceUUID, callback).then(function(item) {
                    console.log("stop task with:" + JSON.stringify(item));
                    if (Object.keys(item).length !== 0) {
                        console.log("begin to run task" + deviceUUID);
                        deviceURL = item.deviceURL;
                        return ECS.runTask(getECSParams(env)).promise();
                    }
                }).then(function(data) {
                    var item = new Object();
                    //  item.deviceUUID = deviceUUID;
                    item.deviceURL = deviceURL;
                    item.taksARN = data.tasks[0].taskArn;
                    console.log("begin to update item" + JSON.stringify(item));
                    return databaseManager.updateItem(deviceUUID, item, callback);
                }).then(function(data) {
                    return console.log("update sucessed");
                }).catch(function(error) {
                    reject(error);
                });
            }
        }
         catch (err) {
                console.warn(`Error when writing idemotency record, probably because you've already tried to process this message`, err);
                return;
            }
    });
};


function getECSParams(env) {
    return {
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
                environment: env
            }]
        },
        count: 1,
        launchType: "FARGATE"
    };
}

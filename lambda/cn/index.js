var AWS = require('aws-sdk');
const ECS = new AWS.ECS();
const parameterStore = new AWS.SSM();
let dynamo = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

exports.handler = async(event, context, callback) => {
    return new Promise(async(resolve, reject) => {
        try {
            console.log("-----event----" + JSON.stringify(event));
            var param = await getParam('Password');
            var passwd = param.Parameter.Value;
            console.log("get passwd from parameter Store:" + passwd);
            const buckerName = process.env.BUCKET_NAME; //get bucket name
            const segmentTime = process.env.SEGMENT_TIME; //get file segment time
            const userName = 'admin';
            //var passwd = 'aws@Aaron';
            var deviceURL;
            var deviceUUID;
            for (const record of event.Records) {
                if (record.eventName == "INSERT") {
                    deviceURL = record.dynamodb.NewImage.mediaURL.S; //get media url 
                    deviceUUID = record.dynamodb.NewImage.deviceUUID.S + "-" + record.dynamodb.NewImage.channel.S; //join device id with channel
                    console.log(record.eventName + ":" + deviceUUID);
                    console.log('Run task with deviceURL:' + deviceURL + "  DeviceUUID:" + deviceUUID);
                    //run ecs task
                    await ECS.runTask(getFargateParams(userName + ':' + passwd + '@' + deviceURL, deviceUUID, buckerName, segmentTime)).promise().then(function(data) {
                        var item = new Object();
                        item.deviceUUID = deviceUUID;
                        item.deviceURL = deviceURL;
                        item.taksARN = data.tasks[0].taskArn;
                        //save task info into dynamodb
                        return saveItem(item).then(response => {
                            console.log("success saveItem into dynamodb" + response);
                            //   sendResponse(200, item.deviceUUID, callback);
                        }, (reject) => {
                            console.log("---db error---" + reject)
                            //  sendResponse(400, reject, callback);
                        });
                    }).catch(function(error) {
                        console.log("---task error---" + error);
                    });
                }
                if (record.eventName == "REMOVE") {
                    deviceURL = record.dynamodb.OldImage.mediaURL.S; //get media url 
                    deviceUUID = record.dynamodb.OldImage.deviceUUID.S + "-" + record.dynamodb.OldImage.channel.S; //join device id with channel
                    console.log(record.eventName + ":" + deviceUUID);
                    await getItem(deviceUUID, callback).then(function(item) {
                        if (typeof(item) != 'undefined') {
                            console.log("stop task with:" + JSON.stringify(item));
                            var params = {
                                task: item.taksARN,
                                cluster: process.env.ECS_CLUSTER_NAME,
                                reason: 'stop recording'
                            };
                            return ECS.stopTask(params).promise();
                        }
                    }).then(function(data) {
                        return deleteItem(deviceUUID);
                    }).catch(function(error, data) {
                        if (error)
                            return reject(error);
                        return resolve(data);
                    });
                }
            }
        }
        catch (error) {
            console.log("---task error---" + error);
            return reject(error);
        }

    });
};

function getEC2Params(deviceURL, deviceUUID, buckerName, segmentTime) {
    return {
        cluster: process.env.ECS_CLUSTER_NAME,
        taskDefinition: process.env.ECS_TASK_NAME,
        overrides: {
            containerOverrides: [{
                name: process.env.ECS_CONTAINER_NAME,
                environment: [
                    { name: "BUCKET_NAME", "value": buckerName },
                    { name: "CAMERA_NAME", "value": deviceUUID },
                    { name: "INPUT_URL", "value": deviceURL },
                    { name: "SEGMENT_TIME", "value": segmentTime }
                ]
            }]
        },
        count: 1,
        launchType: "EC2"
    };
}


function getFargateParams(deviceURL, deviceUUID, buckerName, segmentTime) {
    return {
        cluster: process.env.ECS_CLUSTER_NAME,
        taskDefinition: process.env.ECS_TASK_NAME,
        networkConfiguration: {
            awsvpcConfiguration: {
                subnets: [process.env.ECS_SUBNET_ID_1,
                    process.env.ECS_SUBNET_ID_2
                ],
                assignPublicIp: "ENABLED"
            }
        },
        overrides: {
            containerOverrides: [{
                name: process.env.ECS_CONTAINER_NAME,
                environment: [
                    { name: "BUCKET_NAME", "value": buckerName },
                    { name: "CAMERA_NAME", "value": deviceUUID },
                    { name: "INPUT_URL", "value": deviceURL },
                    { name: "SEGMENT_TIME", "value": segmentTime }
                ]
            }]
        },
        count: 1,
        launchType: "FARGATE"
    };
}

function sendResponse(statusCode, message, callback) {
    const response = {
        statusCode: statusCode,
        body: JSON.stringify(message)
    };
    callback(null, response);
}


const getParam = param => {
    return new Promise((res, rej) => {
        parameterStore.getParameter({
            Name: param
        }, (err, data) => {
            if (err) {
                return rej(err);
            }
            return res(data);
        });
    });
};

function saveItem(item) {
    const params = {
        TableName: TABLE_NAME,
        Item: item
    };

    return dynamo
        .put(params)
        .promise()
        .then((result) => {
            return item;
        }, (error) => {
            return error;
        });
}

function getItem(itemId) {
    const params = {
        Key: {
            deviceUUID: itemId
        },
        TableName: TABLE_NAME
    };

    return dynamo
        .get(params)
        .promise()
        .then((result) => {
            return result.Item;
        }, (error) => {
            return error;
        });
}

function deleteItem(itemId) {
    const params = {
        Key: {
            deviceUUID: itemId
        },
        TableName: TABLE_NAME
    };
    return dynamo.delete(params).promise();
}

const { DynamoDBClient, QueryCommand, ScanCommand } = require("@aws-sdk/client-dynamodb");


const client = new DynamoDBClient({});


module.exports.dynamoQuery = async (params) => {
    try {
      const command = new QueryCommand(params);
      const response = await client.send(command);
      return response;
    } catch (error) {
      console.error("DynamoDB Query Error", error);
    }
  };


  module.exports.dynamoScan = async (params) => {
    try {
      const command = new ScanCommand(params);
      const response = await client.send(command);
      return response;
    } catch (error) {
      console.error("DynamoDB Scan Error", error);
    }
  };

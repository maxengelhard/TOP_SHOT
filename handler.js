const awsServerlessExpress = require('aws-serverless-express')
const app = require('./server/server')
const server = awsServerlessExpress.createServer(app)

module.exports.hello = async (event,context) => {

  return awsServerlessExpress.proxy(server,event,context)

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

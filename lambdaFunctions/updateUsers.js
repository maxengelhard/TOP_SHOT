const AWS = require('aws-sdk')
const path = require('path');
const envFilePath = path.resolve(__dirname, './.env');
const env = require("dotenv").config({ path: envFilePath });
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


const myConfig = new AWS.Config({
    region: 'us-east-2'
  });
  
  
AWS.config = myConfig


exports.handler = async (event,context) => {

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();


const subscriptions = await stripe.subscriptions.list();
       const canceled = subscriptions.data.filter(obj => {
         return obj.canceled_at
       }).map(obj => {
         return obj.customer
       })
       // for each of the canceled customers clear out their names in the lambda function

canceled.forEach(customer => {
    const params = {
        TableName: USERS_TABLE,
        Key: {
          id: customer
        },
      };
    
      dynamoDb.delete(params, (error) => {
        if (error) {
          console.log(error);
          console.log({ error: 'Could not delete user' });
        }
      });
})

return canceled

}

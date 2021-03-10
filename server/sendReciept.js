const dotenv = require('dotenv')
dotenv.config()
const AWS = require('aws-sdk')
const receiptHTML = require('./receiptHTML')


const SESConfig = {
  apiVersion: '2010-12-01',
  accessKeyId: process.env.REACT_APP_AWS_SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SES_SECRET_ACCESS_KEY,
  region: 'us-east-2'
}

const sendReciept = async (email,customerId,amount,billing) => {
    // get the user email address and stripe id
    // send it to them with the address
    const stringAmount = amount.toString()
    const prettyAmount = `$${stringAmount.slice(0,stringAmount.length-2)}.${stringAmount.slice(stringAmount.length-2)}`
     const params = {
      Destination: { /* required */
      //   CcAddresses: [
      //     'EMAIL_ADDRESS',
      //     /* more items */
      //   ],
        ToAddresses: [
          'mackw2019@gmail.com', // email
          /* more items */
        ]
      },
      Message: { /* required */
        Body: { /* required */
          Html: {
           Charset: "UTF-8", // receiptHTML = (productName,receipt_id,amount,billingUrl, support_link,websiteScrape)
           Data: receiptHTML('Get Drop Now',customerId,prettyAmount,billing,'https://www.nbatopshot.com/')
          },
          // Text: {
          //  Charset: "UTF-8",
          //  Data: "Hello Max"
          // }
         },
         Subject: {
          Charset: 'UTF-8',
          Data: 'Here is your reciept'
         }
        },
      Source: '"Get Drop Now" <getdropnow@gmail.com>', /* required */
      ReplyToAddresses: [
         'getdropnow@gmail.com',
        /* more items */
      ],
    };
  
    //  Create the promise and SES service object
    const sendPromise = new AWS.SES(SESConfig).sendEmail(params).promise();
    
    // Handle promise's fulfilled/rejected states
    sendPromise.then(
      function(data) {
        // console.log(data.MessageId);
      }).catch(
        function(err) {
        console.error(err, err.stack);
      });
  
     
  }
  
module.exports = sendReciept
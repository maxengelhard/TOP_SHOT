const dotenv = require('dotenv')
dotenv.config()
const AWS = require('aws-sdk')
const receiptHTML = require('./receiptHTML')
const unsubscribed = require('./unsubscribed')
const reactivateEmail = require('./reactivateEmail')
const updateEmailAddress = require('./updateEmail')

const SESConfig = {
  apiVersion: '2010-12-01',
  accessKeyId: process.env.REACT_APP_AWS_SES_ACCESS_KEY_ID,
  secretAccessKey: process.env.REACT_APP_AWS_SES_SECRET_ACCESS_KEY,
  region: 'us-east-2'
}

const sendReciept = async (email,customerId,amount,billing,updated) => {
  const stringAmount = amount.toString()
  const prettyAmount = `$${stringAmount.slice(0,stringAmount.length-2)}.${stringAmount.slice(stringAmount.length-2)}`
    // first check to see what we are sending out 
    let thisEmail = ''
    let subject = ''
  if (!updated) {
    thisEmail = receiptHTML('Get Drop Now',customerId,prettyAmount,billing,process.env.DOMAIN+'help','https://www.nbatopshot.com/')
    subject = 'Thank you! Here is your receipt'
  } else if (updated ==='cancel') {
    thisEmail = unsubscribed() 
    subject = `Cancel Confirmation`
  } else if (updated ==='reactivate') {
    thisEmail = reactivateEmail()
    subject = `We're glad to have you back!`
  } else if (updated ==='changeEmail') {
    thisEmail = updateEmailAddress()
    subject = `New Email Address`
  }
    // get the user email address and stripe id
    // send it to them with the address
    
     const params = {
      Destination: { /* required */
      //   CcAddresses: [
      //     'EMAIL_ADDRESS',
      //     /* more items */
      //   ],
        ToAddresses: [
          email // email
          /* more items */
        ]
      },
      Message: { /* required */
        Body: { /* required */
          Html: {
           Charset: "UTF-8", // receiptHTML = (productName,receipt_id,amount,billingUrl, support_link,websiteScrape)
           Data: thisEmail
          },
          // Text: {
          //  Charset: "UTF-8",
          //  Data: "Hello Max"
          // }
         },
         Subject: {
          Charset: 'UTF-8',
          Data: subject
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
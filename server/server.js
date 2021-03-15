const serverless = require('serverless-http')
const express = require("express");
const app = express();
const path = require('path');
const cors = require('cors');
// const bodyParser = require("body-parser");
const AWS = require('aws-sdk')
const sendRecipet = require('./sendReciept')


const myConfig = new AWS.Config({
  region: 'us-east-2'
});

AWS.config = myConfig

// Copy the .env.example in the root into a .env file in this folder
const envFilePath = path.resolve(__dirname, './.env');
const env = require("dotenv").config({ path: envFilePath });
// if (env.error) {
//   throw new Error(`Unable to load the .env file from ${envFilePath}. Please copy .env.example to ${envFilePath}`);
// }

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
app.use(cors())
// app.use(bodyParser.json())
app.use(express.static(process.env.STATIC_DIR));
app.use(express.urlencoded({ extended: true }));
app.use(
  express.json({
    // We need the raw body to verify webhook signatures.
    // Let's compute it only when hitting the Stripe webhook endpoint.
    verify: function (req, res, buf) {
      if (req.originalUrl.startsWith("/webhook")) {
        req.rawBody = buf.toString();
      }
    },
  })
);

const USERS_TABLE = process.env.USERS_TABLE;
const dynamoDb = new AWS.DynamoDB.DocumentClient();

app.get("/", (req, res) => {
  // const filePath = path.resolve(process.env.STATIC_DIR + "/index.html");
  const pathName = path.join(__dirname, 'client', 'index.html');
  res.sendFile(pathName);
});


// Fetch the Checkout Session to display the JSON result on the success page
app.get("/checkout-session", async (req, res) => {
  const { sessionId } = req.query;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const {id,customer,amount_total} = session
  const {email} = session.customer_details
  // if (typeof userId !== 'string') {
  //   res.status(400).json({ error: '"userId" must be a string' });
  // } else if (typeof email !== 'string') {
  //   res.status(400).json({ error: '"email" must be a string' });
  // }

  const params = {
    TableName: USERS_TABLE,
    Item: {
      id: customer,
      email: email,
      active: true
    },
    ReturnValues: 'ALL_OLD'
  };

  dynamoDb.put(params, (error,data) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create user' });
    }
    if (!data.Attributes) {
    sendRecipet(email,customer,amount_total,process.env.DOMAIN+'/managebilling')
    }
  });

  // send out a receipt
  // sendReciept = async (email,stripe_id,receipt_id,amount)
  // const checkoutsession = await stripe.checkout.sessions.retrieve(sessionId);

  // This is the url to which the customer will be redirected when they are done
  // managing their billing with the portal.
 
 
  res.send(session);
});

app.post("/create-checkout-session", async (req, res) => {
  const domainURL = process.env.DOMAIN;
  const { priceId } = req.body;

  // Create new Checkout Session for the order
  // Other optional params include:
  // [billing_address_collection] - to display billing address details on the page
  // [customer] - if you have an existing Stripe Customer ID
  // [customer_email] - lets you prefill the email input in the form
  // For full details see https://stripe.com/docs/api/checkout/sessions/create
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // ?session_id={CHECKOUT_SESSION_ID} means the redirect will have the session ID set as a query param
      success_url: `${domainURL}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${domainURL}/canceled.html`,
    });
    res.send({
      sessionId: session.id,
    });
  } catch (e) {
    res.status(400);
    return res.send({
      error: {
        message: e.message,
      }
    });
  }
});

app.get("/setup", (req, res) => {
  res.send({
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
    basicPrice: process.env.BASIC_PRICE_ID,
    proPrice: process.env.PRO_PRICE_ID,
  });
});


app.post('/customer-portal', async (req, res) => {
  // For demonstration purposes, we're using the Checkout session to retrieve the customer ID. 
  // Typically this is stored alongside the authenticated user in your database.
  const { customerId } = req.body;
  // const checkoutsession = await stripe.checkout.sessions.retrieve(sessionId);

  // This is the url to which the customer will be redirected when they are done
  // managing their billing with the portal.
  const returnUrl = process.env.DOMAIN;

  const portalsession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  res.send({
    url: portalsession.url,
  });
});

// Webhook handler for asynchronous events.
app.post("/webhook", async (req, res) => {
  let data;
  let eventType;
  // Check if webhook signing is configured.
  if (process.env.STRIPE_WEBHOOK_SECRET) {
    // Retrieve the event by verifying the signature using the raw body and secret.
    let event;
    let signature = req.headers["stripe-signature"];
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.log(`⚠️  Webhook signature verification failed.`);
      return res.sendStatus(400);
    }
    // Extract the object from the event.
    data = event.data;
    eventType = event.type;
  } else {
    // Webhook signing is recommended, but if the secret is not configured in `config.js`,
    // retrieve the event data directly from the request body.
    data = req.body.data;
    eventType = req.body.type;
  }

  const updateUser = async (column,value,email) => {
    const params = {
      TableName: USERS_TABLE,
      Key: {"id": data.object.customer ? data.object.customer: data.object.id},
      UpdateExpression: `set ${column} = :x`,
      ExpressionAttributeValues:{
        ":x": email? email : value
      },
      ReturnValues: "ALL_NEW"
    }
    try {
   return dynamoDb.update(params, (error,data) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: 'Could not update user' });
      }
    }).promise().then(result => result)
  }
  catch(error) {
    console.log(error)
  }
  }
  // we can also send out recipets
  // const sendReciept = async (email,customerId,amount,billing,updated)  
  // with this data update dynamo db
  // if they cancel set active to false
  if (data.object.cancel_at) {
    const user = await updateUser('active',false)
    const {email,id} = user.Attributes
    const {amount} = data.object.plan
  sendRecipet(email,id,amount,process.env.DOMAIN+'/managebilling','cancel')
  } else if (data.previous_attributes.cancel_at && !data.object.cancel_at) { // this is for reactivating
    const user = await updateUser('active',true)
    const {email,id} = user
    const {amount} = data.object.plan
    sendRecipet(email,id,amount,process.env.DOMAIN+'/managebilling','reactivate')
  } else if (data.previous_attributes.email !== data.object.email) { // change of email
    const user = await updateUser('email','_',data.object.email)
    const {email,id} = user
    const amount = false
    sendRecipet(email,id,amount,process.env.DOMAIN+'/managebilling','changeEmail')
  }
  
  if (eventType === "checkout.session.completed") {
    console.log(`🔔  Payment received!`);
  }

  res.sendStatus(200);
});



app.get('/managebilling', async (req,res) => {
  try {
    let root = __dirname.split('/')
    root.pop()
    root = root.join('/')
    const pathName = path.join(root, 'client', 'billing.html');
  res.sendFile(pathName);

  }
  catch(error) {
    console.log(error)
  }
})

app.post('/getusers', async (req,res) => {
  try {
    const {email,customerId} = req.body

    // get the user
    const params = {
      TableName: USERS_TABLE,
      Key: {
        id: customerId
      },
    };
  
    dynamoDb.get(params, (error,data) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: 'Could not get user' });
      } else {
        // check to see if the email matches
        if (data.Item) {
        const dbEmail = data.Item.email
        if (email ===dbEmail) {
          res.json(customerId)
        } else {
          res.json({error: 'Email and Id Do Not Match'})
        }
      }
        else {
          res.json({error: 'Could Not Find Id'})
        }
      }
    }); 
    
  }
  catch(error){
    console.log(error)
  }
})

const port = process.env.PORT || 4242
app.listen(port, () => console.log(`Node server listening at ${port}/`));




// module.exports.handler = serverless(app);



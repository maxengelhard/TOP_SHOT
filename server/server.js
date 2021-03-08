const serverless = require('serverless-http')
const express = require("express");
const app = express();
const path = require('path');
const cors = require('cors');
const bodyParser = require("body-parser");
const AWS = require('aws-sdk')


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
app.use(bodyParser.json())
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


// Create User endpoint
app.post('/users', function (req, res) {
  
})

// Fetch the Checkout Session to display the JSON result on the success page
app.get("/checkout-session", async (req, res) => {
  const { sessionId } = req.query;
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const {customer} = session
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
    },
  };

  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      // res.status(400).json({ error: 'Could not create user' });
    }
    // res.json({ userId, name });
  });
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
  const { sessionId } = req.body;
  const checkoutsession = await stripe.checkout.sessions.retrieve(sessionId);

  // This is the url to which the customer will be redirected when they are done
  // managing their billing with the portal.
  const returnUrl = process.env.DOMAIN;

  const portalsession = await stripe.billingPortal.sessions.create({
    customer: checkoutsession.customer,
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

  if (eventType === "checkout.session.completed") {
    console.log(`🔔  Payment received!`);
  }

  res.sendStatus(200);
});

const port = process.env.PORT || 4242
app.listen(port, () => console.log(`Node server listening at ${port}/`));




// module.exports.handler = serverless(app);



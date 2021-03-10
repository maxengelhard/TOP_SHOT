const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get("session_id")
let customerId;

const portal = (e,customerId) => {
      e.preventDefault();
      fetch('/customer-portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          window.location.href = data.url;
        })
        .catch((error) => {
          console.error('Error:', error);
        });
  
  }

if (sessionId) {
  fetch("/checkout-session?sessionId=" + sessionId)
    .then(function(result){
      return result.json()
    })
    .then(function(session){
      customerId = session.customer
      const manageBillingForm = document.querySelector('#manage-billing-form');
      manageBillingForm.addEventListener('submit', (e) => portal(e,customerId))
      // We store the customer ID here so that we can pass to the
      // server and redirect to customer portal. Note that, in practice
      // this ID should be stored in your database when you receive
      // the checkout.session.completed event. This demo does not have
      // a database, so this is the workaround. This is *not* secure.
      // You should use the Stripe Customer ID from the authenticated
      // user on the server.
      const email = session.customer_details.email
  
      document.getElementById("success-message").textContent = `Congrats on singing up. Notifications will come to ${email} on the first momments notice of a pack drop`;
    })
    .catch(function(err){
      console.log('Error when fetching Checkout session', err);
    });

  // In production, this should check CSRF, and not pass the session ID.
  // The customer ID for the portal should be pulled from the 
  // authenticated user on the server.
  
} else {
  // fetch from database and see if it's there then call the portal
  const manageBillingForm = document.querySelector('#manage-billing-form-1');
  manageBillingForm.addEventListener('submit', (e) => {
    e.preventDefault()
    const email = document.getElementById('email').value
    const customerId = document.getElementById('customerId').value

    fetch('/getusers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,customerId
        }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        alert(data.error)
      } else {
        portal(e,data)
      }
    })
  })
  // fetch('/getusers')
  // .then(res => res.json())
  // .then(customerId => portal(customerId))
}



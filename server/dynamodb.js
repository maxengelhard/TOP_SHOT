const AWS = require("aws-sdk");

const createUser = (user,email) => {

    AWS.config.update({
        region: "us-east-2"
      });
      
      const docClient = new AWS.DynamoDB.DocumentClient();
      
      const table = "TOP_SHOT_USERS";

      console.log(id)
      
    //   const params = {
    //       TableName:table,
    //       Item:{
    //           "id": id,
    //           "customer": user,
    //           "email": email
    //       }
    //   };
      
    //   docClient.put(params, function(err, data) {
    //       if (err) {
    //           console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
    //       } else {
    //           console.log("Added item:", JSON.stringify(data, null, 2));
    //       }
    //   });
}


createUser()

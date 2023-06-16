const mysql = require('mysql');
require('dotenv').config();
const sdk = require('api')('@open-api-docs/v1.0#4y6wbk20lik15p2x');

const request = require('request');

// MySQL configuration
const connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  
  // Check if the access token is expired
  const checkTokenExpiration = () => {
    const currentDate = new Date();
    const query = `SELECT access_token, expiration_time FROM tokens WHERE expiration_time > '${currentDate.toISOString()}'`;
  
    connection.query(query, function (error, results) {
      if (error) throw error;
  
      if (results.length > 0) {
        // Use the existing token
        const accessToken = results[0].access_token;
        console.log('Existing access token:', accessToken);
  
        // Continue with the rest of your code
        // ...
      } else {
        // Existing token has expired, make a new request
        requestNewAccessToken();
      }
    });
  };
  
  // Request a new access token
//   const requestNewAccessToken = () => {
//     const options = {
//       method: 'POST',
//       url: 'https://open-api.guesty.com/oauth2/token',
//       headers: {
//         Accept: 'application/json',
//         'Content-Type': 'application/x-www-form-urlencoded',
//       },
//       form: {
//         grant_type: 'client_credentials',
//         scope: 'open-api',
//         client_secret: process.env.CLIENT_SECRET,
//         client_id: process.env.CLIENT_ID,
//       },
//     };
  
//     request(options, function (error, response) {
//       if (error) throw new Error(error);
  
//       const responseBody = JSON.parse(response.body);
//       const accessToken = responseBody.access_token;
  
//       // Store the new access token in the database
//       storeAccessToken(accessToken);
  
//       console.log('New access token:', accessToken);
  
//       // Continue with the rest of your code
//       // ...
//     });
//   };

// Request a MOCK access token
const requestNewAccessToken = () => {
    const responseBody = {
      token_type: 'Bearer',
      expires_in: 86400,
      access_token: 'your_generated_access_token',
      scope: 'open-api',
    };
  
    const accessToken = responseBody.access_token;
  
    // Store the new access token in the database
    storeAccessToken(accessToken);
  
    console.log('New access token:', accessToken);
  
    // Continue with the rest of your code
    // ...
  };
  
  
// Store the access token in the database
const storeAccessToken = (accessToken) => {
    const expirationTime = new Date();
    console.log("expirationTime", expirationTime);
    expirationTime.setHours(expirationTime.getHours() + 23); // Expire after 23 hours
    console.log("expirationTime + 23", expirationTime);
    const formattedExpirationTime = expirationTime.toISOString().slice(0, 19).replace('T', ' ');
    console.log("formattedExpirationTime", formattedExpirationTime);
    const query = `UPDATE tokens SET access_token = '${accessToken}', expiration_time = '${formattedExpirationTime}'`;
  
    connection.query(query, function (error, results) {
      if (error) throw error;
  
      console.log('Access token stored successfully');
    });
  };
  
  
  // Check token expiration and make a request if necessary
  checkTokenExpiration();
  
//   // Mock request to fetch a new access token
//   function fetchAccessToken(callback) {
//     // Simulate the response body of the token request
//     const responseBody = {
//       "token_type": "Bearer",
//       "expires_in": 86400,
//       "access_token": "mock-access-token",
//       "scope": "open-api"
//     };
  
//     // Simulate a delay of 1 second before returning the response
//     setTimeout(() => {
//       const accessToken = responseBody.access_token;
//       const expirationTime = new Date(new Date().getTime() + (responseBody.expires_in * 1000));
//       storeAccessToken(accessToken, expirationTime);
//       callback(accessToken);
//     }, 1000);
//   }
  
//   function storeAccessToken(token) {
//     // Calculate the expiration time
//     const expirationTime = new Date();
//     expirationTime.setHours(expirationTime.getHours() + 23); // Add 23 hours
  
//     // Store the access token and expiration time in the database
//     pool.query(
//       'INSERT INTO tokens (access_token, expiration_time) VALUES (?, ?)',
//       [token, expirationTime],
//       (error, results) => {
//         if (error) {
//           console.error('Error storing access token:', error);
//         } else {
//           console.log('Access token stored successfully.');
//         }
//       }
//     );
//   }
  
  
//   // Retrieve the access token from the database
//   function retrieveAccessToken(callback) {
//     const currentTime = new Date();
//     const query = `SELECT access_token FROM tokens WHERE expiration_time > ?`;
//     const values = [currentTime];
  
//     pool.query(query, values, (error, results) => {
//       if (error) {
//         console.error('Error retrieving access token:', error);
//         callback(null); // Pass null to indicate no valid token found
//       } else {
//         if (results.length > 0) {
//           const accessToken = results[0].access_token;
//           callback(accessToken); // Pass the retrieved access token
//         } else {
//           callback(null); // Pass null to indicate no valid token found
//         }
//       }
//     });
//   }
  
//   // Example usage: Check if valid access token exists, retrieve or fetch a new token
//   retrieveAccessToken((accessToken) => {
//     if (accessToken) {
//       // Use the existing access token for API requests
//       console.log('Existing access token:', accessToken);
//     } else {
//       // Fetch a new access token
//       fetchAccessToken((newAccessToken) => {
//         if (newAccessToken) {
//           // Use the newly fetched access token for API requests
//           console.log('Newly fetched access token:', newAccessToken);
//         } else {
//           console.error('Failed to fetch a new access token');
//         }
//       });
//     }
//   });
const express = require("express");
const { google } = require("googleapis");
const sdk = require('api')('@open-api-docs/v1.0#4y6wbk20lik15p2x');

const app = express();

require('dotenv').config();

const delayMs = 200; // Delay between write requests in milliseconds
const maxRequestsPerMinute = 120; // Maximum number of requests per minute

let requestCount = 0; // Counter for the number of requests

// var request = require('request');

// var options = {
//   'method': 'POST',
//   'url': 'https://open-api.guesty.com/oauth2/token',
//   'headers': {
//     'Accept': 'application/json',
//     'Content-Type': 'application/x-www-form-urlencoded'
//   },
//   form: {
//     'grant_type': 'client_credentials',
//     'scope': 'open-api',
//     'client_secret': process.env.CLIENT_SECRET,
//     'client_id': process.env.CLIENT_ID
//   }
// };
// request(options, function (error, response) {
//     if (error) {
//       console.error('Error fetching token:', error);
//     } else {
//       console.log('Received token:', response.body);
//     }
//   });
  
const getReservationDetails = async () => {
    let reservationDetails = [];
    const limit = 100;
    let skip = 0;
  
    // Authenticate before making a request
    sdk.auth(process.env.MY_TOKEN);
  
    while (true) {
      const response = await sdk.getReservations({
        fields: '_id%20listing.nickname%20checkIn%20checkOut%20confirmationCode%20money.fareAccommodation%20money.fareCleaning%20createdAt',
        limit: limit.toString(),
        skip: skip.toString()
      });
  
      for (let reservation of response.data.results) {
        reservationDetails.push([
          reservation._id,
          reservation.listing.nickname,
          reservation.checkIn,
          reservation.checkOut,
          reservation.confirmationCode,
          reservation.createdAt,
          reservation.money.fareAccommodation,
          reservation.money.fareCleaning,
        ]);
      }
  
      // If the number of results is less than the limit, break the loop
      if (response.data.results.length < limit) {
        break;
      }
  
      skip += limit;
  
      // Delay the next request
      await new Promise(resolve => setTimeout(resolve, delayMs));
  
      // Increment the request count
      requestCount++;
  
      // Check if the maximum number of requests per minute has been reached
      if (requestCount === maxRequestsPerMinute) {
        const remainingDelayMs = 60 * 1000 - delayMs * maxRequestsPerMinute;
        await new Promise(resolve => setTimeout(resolve, remainingDelayMs));
        requestCount = 0; // Reset the request count
      }
    }
  
    return reservationDetails;
  };
  
  app.get("/reservationDetails", (req, res) => {
    getReservationDetails()
      .then(data => res.send(data))
      .catch(err => {
        console.error(err);
        res.status(500).send(err);
      });
  });
  
  app.get("/", async (req, res) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    });

    // Create client instance for auth
    const client = await auth.getClient();

    // Instance of Google Sheets API
    const googleSheets = google.sheets({ version: "v4", auth: client });

    const spreadsheetId = process.env.SPREADSHEET_ID;
    // Read rows from spreadsheet
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: process.env.RANGE,
    });

    // Get existing data
    const existingData = getRows.data.values || [];

    // Get reservation details
    const reservationDetails = await getReservationDetails();

    // Prepare the queue for write requests
    const queue = [];

    // Check if each row in reservationDetails already exists in the sheet
    for (let row of reservationDetails) {
        const rowIndex = existingData.findIndex(existingRow =>
            existingRow[0] === row[0] // Assuming the ID is the first element in the row
        );

        if (rowIndex === -1) {
            // If ID is not in the sheet, append the row
            queue.push({
                operation: "append",
                values: [row],
            });
        } else {
            // If ID is already in the sheet, update the row
            queue.push({
                operation: "update",
                range: `Sheet1!A${rowIndex + 1}:${String.fromCharCode(65 + row.length)}${rowIndex + 1}`,
                values: [row],
            });
        }
    }

    // Process the queue with limited requests per minute
    const maxRequestsPerMinute = 60; // Adjust this value based on the per minute user limit
    const delayMs = 1000 * (60 / maxRequestsPerMinute);

    for (let i = 0; i < queue.length; i++) {
        const request = queue[i];
        if (request.operation === "append") {
            await googleSheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: "Sheet1",
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: request.values,
                },
            });
        } else if (request.operation === "update") {
            await googleSheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: request.range,
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: request.values,
                },
            });
        }

        // Delay the next request
        if (i < queue.length - 1) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }

    res.send(getRows.data);
});

app.listen(1337, (req, res) => console.log("running on 1337"));

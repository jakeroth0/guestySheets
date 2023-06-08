const express = require("express");
const { google } = require("googleapis");
const sdk = require('api')('@open-api-docs/v1.0#4y6wbk20lik15p2x');

const app = express();

require('dotenv').config();

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
    let reservationDetails = {};
    const limit = 100;
    let skip = 0;

        // Authenticate before making a request
    sdk.auth('Bearer mytoken');

    while (true) {
        const response = await sdk.getReservations({
            fields: '_id%20listing.nickname%20checkIn%20checkOut%20confirmationCode%20money.fareAccommodation%20money.fareCleaning%20createdAt',
            limit: limit.toString(),
            skip: skip.toString()
        });

        for (let reservation of response.data.results) {
            reservationDetails[reservation._id] = {
                checkIn: reservation.checkIn,
                checkOut: reservation.checkOut,
                confirmationCode: reservation.confirmationCode,
                createdAt: reservation.createdAt,
                fareAccommodation: reservation.money.fareAccommodation,
                fareCleaning: reservation.money.fareCleaning,
                nickname: reservation.listing.nickname
            };
        }

        // If the number of results is less than the limit, break the loop
        if (response.data.results.length < limit) {
            break;
        }

        skip += limit;

        // Delay the next request
        await new Promise(resolve => setTimeout(resolve, 750));
    }

    return reservationDetails;
}
    
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
    const googleSheets = google.sheets({version: "v4", auth: client});

    const spreadsheetId = process.env.SPREADSHEET_ID;
    // Read rows from spreadsheet
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: process.env.RANGE,
    });

    // Data to be added (assuming ID is first element)
    const newData = [
        ["ID1", "Airbnb 1", "test"], 
        ["ID2", "Manual 1", "2 test"],
        ["ID2", "Manual 1", "3 test"],
        ["ID3", "Vrbo 1", "5 test"],
    ];

    // Get existing data
    const existingData = getRows.data.values || [];

    // Check if each row in newData already exists in the sheet
    for (let row of newData) {
        const rowIndex = existingData.findIndex(existingRow => 
            existingRow[0] === row[0] // Assuming the ID is the first element in the row
        );

        if (rowIndex === -1) {
            // If ID is not in the sheet, append the row
            await googleSheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: "Sheet1",
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [row],
                },
            });
        } else {
            // If ID is already in the sheet, update the row
            await googleSheets.spreadsheets.values.update({
                auth,
                spreadsheetId,
                range: `Sheet1!A${rowIndex + 1}:${String.fromCharCode(65 + row.length)}${rowIndex + 1}`,
                valueInputOption: "USER_ENTERED",
                resource: {
                    values: [row],
                },
            });
        }
    }

    res.send(getRows.data);
});


app.listen(1337, (req, res) => console.log("running on 1337"));
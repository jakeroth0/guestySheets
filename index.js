const express = require("express");
const { google } = require("googleapis");

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
  


app.get("/", async (req, res) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    });

    // Create client instance for auth
    const client = await auth.getClient();

    // Instance of Google Sheets API
    const googleSheets = google.sheets({version: "v4", auth: client});

    const spreadsheetId = "1uEzB4etmTrnz0yeIH4tYDwHfaAFituyROBlCzLmo_s4";

    // Read rows from spreadsheet
    const getRows = await googleSheets.spreadsheets.values.get({
        auth,
        spreadsheetId,
        range: "Sheet1",
    });

    // Data to be added (assuming ID is first element)
    const newData = [
        ["ID1", "Airbnb 1", "test"], 
        ["ID2", "Manual 1", "2 test"],
        ["ID2", "Manual 1", "3 test"],
        ["ID3", "Vrbo 1", "4 test"],
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
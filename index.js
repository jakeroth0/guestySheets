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
  
const getListingNicknames = async () => {
    let nicknames = {};
    const limit = 100;
    let skip = 0;

     // Authenticate before making a request
sdk.auth('Bearer my token');

while (true) {
    const response = await sdk.getListings({
        fields: '_id nickname',
        limit: limit.toString(),
        skip: skip.toString()
    });

    for (let listing of response.data.results) {
        nicknames[listing._id] = listing.nickname; 
    }

    // If the number of results is less than the limit, break the loop
    if (response.data.results.length < limit) {
        break;
    }

    skip += limit;

    // Delay the next request
    await new Promise(resolve => setTimeout(resolve, 100));
}

return nicknames;
}

const fetchReservations = async () => {
    const listingNicknames = await getListingNicknames();
    const reservations = [];
  
    const batchSize = 100;
    const delayMs = 100;
  
    let skip = 0;
    let hasMoreReservations = true;
  
    while (hasMoreReservations) {
      // Fetch a batch of reservations
      const response = await sdk.getReservations({
        limit: batchSize.toString(),
        skip: skip.toString(),
      });
  
      for (let reservation of response.data.results) {
        const { listingId } = reservation;
  
        if (listingId in listingNicknames) {
          const formattedReservation = {
            listingId: reservation.listingId,
            checkIn: reservation.checkIn,
            checkOut: reservation.checkOut,
            nickname: listingNicknames[listingId],
            // Add other necessary properties for the reservation
          };
  
          reservations.push(formattedReservation);
        } else {
          // Handle case when listingId doesn't exist in the map
          console.log(`Listing ID ${listingId} not found in the listings endpoint. Skipping reservation.`);
        }
      }
  
      // Check if there are more reservations
      hasMoreReservations = response.data.results.length === batchSize;
  
      // Increment skip for the next batch
      skip += batchSize;
  
      // Delay between batches to limit the rate of requests
      if (hasMoreReservations) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  
    return reservations;
  };  
    
    app.get("/nicknames", (req, res) => {
      getListingNicknames()
        .then(data => res.send(data))
        .catch(err => {
          console.error(err);
          res.status(500).send(err);
        });
    });

    app.get("/reservations", async (req, res) => {
        try {
          const reservations = await fetchReservations();
          res.send(reservations);
        } catch (err) {
          console.error(err);
          res.status(500).send(err);
        }
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
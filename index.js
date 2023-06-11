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

// helper function for dates
function getFormattedDate(date) {
    var year = date.getFullYear();
  
    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;
  
    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;
  
    return year + '-' + month + '-' + day;
  }
// this function takes data gathered from the calendar end point and builds an array of objects so that blocks can be added into the sheets
function formatBlock(blocksData, listingId) {
    // Filter out the dates where blocks.m is false
    const blockedDates = blocksData.filter(day => day.blocks.m);
    
    // Sort the blocked dates in ascending order
    blockedDates.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let reservations = [];
    let checkIn = blockedDates[0].date;
    let checkOut = blockedDates[0].date;

    // Iterate over the sorted blocked dates
    for (let i = 1; i < blockedDates.length; i++) {
        // If the current date is the day after the checkOut date, update checkOut
        if (new Date(blockedDates[i].date) - new Date(checkOut) === 1000 * 60 * 60 * 24) {
            checkOut = blockedDates[i].date;
        } else {
            // If not, push the previous reservation to the reservations array
            reservations.push({
                listingId,
                checkIn,
                checkOut,
                type: 'manualBlock'
            });
            // Start a new reservation with the current date as checkIn and checkOut
            checkIn = blockedDates[i].date;
            checkOut = blockedDates[i].date;
        }
    }

    // Push the last reservation to the reservations array
    reservations.push({
        listingId,
        checkIn,
        checkOut,
        type: 'manualBlock'
    });

    return reservations;
}
 
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
          'reservation',
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

  const getListings = async () => {
    let listingIds = [];
    const limit = 100;
    let skip = 0;
  
    // Authenticate before making a request
    sdk.auth(process.env.MY_TOKEN);
    while (true) {
      const response = await sdk.getListings({
        fields: '_id', // request only the listingId
        limit: limit.toString(),
        skip: skip.toString()
      });
  
      for (let listing of response.data.results) {
        listingIds.push(listing._id);
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
  
    return listingIds;
  };
  
async function getCalendarData(listingIds, startDate, endDate) {
  const idsString = Array.isArray(listingIds) ? listingIds.join(',') : listingIds;

  // Convert dates to 'YYYY-MM-DD' string format
  const startDateFormat = getFormattedDate(startDate);
  const endDateFormat = getFormattedDate(endDate);

  // Authenticate before making a request
  sdk.auth(process.env.MY_TOKEN);
  try {
    const response = await sdk.getAvailabilityPricingApiCalendarListings({
      listingIds: idsString,
      startDate: startDateFormat,
      endDate: endDateFormat,
    });
    return response.data;
  } catch (err) {
    console.error(err);
  }
}

const getManualBlocksData = async () => {
    const allListings = await getListings();
    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 2);

    let allManualBlocks = [];

    // Authenticate before making a request
    sdk.auth(process.env.MY_TOKEN);

    for (let listingId of allListings) {
        let calendarData = await getCalendarData(listingId, startDate, endDate);

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

        let currentBlock = [];
        let manualBlocks = [];

        for (let day of calendarData.data.days) {
            if (day.blocks.m) {
                // If the day is manually blocked, add it to the current block
                currentBlock.push(day);
            } else if (currentBlock.length > 0) {
                // If the day is not manually blocked and there is a current block, add the current block to manualBlocks
                manualBlocks.push([listingId, currentBlock[0].date, currentBlock[currentBlock.length - 1].date, 'manualBlock']);
                // Start a new block
                currentBlock = [];
            }
        }

        // If there is a current block at the end of the days, add it to manualBlocks
        if (currentBlock.length > 0) {
            manualBlocks.push([listingId, currentBlock[0].date, currentBlock[currentBlock.length - 1].date, 'manualBlock']);
        }

        allManualBlocks = allManualBlocks.concat(manualBlocks);
    }

    return allManualBlocks;
};

// GET request routes
app.get("/manualBlocks", (req, res) => {
    getManualBlocksData()
        .then(data => res.send(data))
        .catch(err => {
            console.error(err);
            res.status(500).send(err);
        });
});

app.get("/listingIds", (req, res) => {
    getListings()
      .then(data => res.send(data))
      .catch(err => {
        console.error(err);
        res.status(500).send(err);
      });
  });
  
  app.get("/calendarData", async (req, res) => {
    try {
        const listingIds = ['63347696d6c96e00350ca2f0','633476a23a949500335e4237']; // replace with actual listing IDs
        const startDate = new Date('2023-06-01');
        const endDate = new Date('2023-07-01');
        const data = await getCalendarData(listingIds, startDate, endDate);
        res.send(data);
    } catch (err) {
        console.error(err);
        res.status(500).send(err);
    }
});

  app.get("/reservationDetails", (req, res) => {
    getReservationDetails()
      .then(data => res.send(data))
      .catch(err => {
        console.error(err);
        res.status(500).send(err);
      });
  });

  app.get("/testFormatBlock", async (req, res) => {
    try {
      // You should replace the mock data with actual data from your application
      const mockData = [
        {
          "date": "2023-06-01",
          "blocks": {
            "m": true
          }
        },
        {
          "date": "2023-06-02",
          "blocks": {
            "m": false
          }
        },
        {
          "date": "2023-06-03",
          "blocks": {
            "m": true
          }
        },
        {
          "date": "2023-06-04",
          "blocks": {
            "m": true
          }
        }
      ];
      const mockListingId = "642f06a579abb2002e13d6e2";
      const formattedBlockData = formatBlock(mockData, mockListingId);
      res.send(formattedBlockData);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  });

  app.get("/testFormatBlock2", async (req, res) => {
    try {
      // In this example, you are using the listing id '642f06a579abb2002e13d6e2'
      // For other listings, the listing id should be obtained from a different source
      const listingId = '642f06a579abb2002e13d6e2';
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2); // Two months ahead
  
      let calendarData = await getCalendarData([listingId], startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]);
  
      // Filter and format the data
      const formattedBlockData = formatBlock(calendarData.days, listingId);
      
      res.send(formattedBlockData);
    } catch (error) {
      console.error(error);
      res.status(500).send(error);
    }
  });
  
  
//   reservation part of script
  app.get("/", async (req, res) => {
    const auth = new google.auth.GoogleAuth({
        keyFile: "credentials.json",
        scopes: "https://www.googleapis.com/auth/spreadsheets"
    });

// Everything below is logic that writes to the google sheet
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

// block part of script
app.get("/blocks", async (req, res) => {
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
        range: "Sheet2",
    });

    // Get existing data
    const existingData = getRows.data.values || [];

    // Get manual block data
    const manualBlockData = await getManualBlocksData();

    // Prepare the queue for write requests
    const queue = [];

    // Check if each row in manualBlockData already exists in the sheet
    for (let row of manualBlockData) {
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
                range: `Sheet2!A${rowIndex + 1}:${String.fromCharCode(65 + row.length)}${rowIndex + 1}`,
                values: [row],
            });
        }
    }

    // Process the queue with limited requests per minute
    const maxRequestsPerMinute = 10; // Adjust this value based on the per minute user limit
    const delayMs = 1000 * (60 / maxRequestsPerMinute);

    for (let i = 0; i < queue.length; i++) {
        const request = queue[i];
        if (request.operation === "append") {
            await googleSheets.spreadsheets.values.append({
                auth,
                spreadsheetId,
                range: "Sheet2",
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

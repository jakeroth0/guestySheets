const express = require("express");
const { google } = require("googleapis");
const sdk = require('api')('@open-api-docs/v1.0#4y6wbk20lik15p2x');
const mysql = require('mysql');
const util = require('util');
const request = require('request-promise');

const app = express();

require('dotenv').config();

const delayMs = 200; // Delay between write requests in milliseconds
const maxRequestsPerMinute = 120; // Maximum number of requests per minute

let requestCount = 0; // Counter for the number of requests

// Auth functions and logic
// MySQL configuration
let connection; // MySQL connection variable

if (process.env.NODE_ENV === 'production') {
  // JawsDB configuration for production environment
  connection = mysql.createConnection({
    host: process.env.JAWSDB_HOST,
    user: process.env.JAWSDB_USER,
    password: process.env.JAWSDB_PASSWORD,
    database: process.env.JAWSDB_DATABASE,
    port: process.env.JAWSDB_PORT,
  });
} else {
  // Local MySQL configuration for development environment
  connection = mysql.createConnection({
    host: 'localhost',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

connection.query = util.promisify(connection.query);

const checkTokenExpiration = async () => {
  const currentDate = new Date();
  const query = `SELECT access_token, expiration_time FROM tokens WHERE expiration_time > '${currentDate.toISOString()}'`;

  const results = await connection.query(query);

  if (results.length > 0) {
      // Use the existing token
      const accessToken = results[0].access_token;
      console.log('Existing access token:', accessToken);
      return accessToken;
  } else {
      // Existing token has expired, make a new request
      return requestNewAccessToken();
  }
};

const requestNewAccessToken = async () => {
  const options = {
      method: 'POST',
      url: 'https://open-api.guesty.com/oauth2/token',
      headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
      },
      form: {
          grant_type: 'client_credentials',
          scope: 'open-api',
          client_secret: process.env.CLIENT_SECRET,
          client_id: process.env.CLIENT_ID,
      },
  };

  const response = await request(options);
  const responseBody = JSON.parse(response);
  const accessToken = responseBody.access_token;

  // Store the new access token in the database
  await storeAccessToken(accessToken);

  console.log('New access token:', accessToken);
  return accessToken;
};

const storeAccessToken = async (accessToken) => {
  const expirationTime = new Date();
  expirationTime.setHours(expirationTime.getHours() + 23); // Expire after 23 hours
  const formattedExpirationTime = expirationTime.toISOString().slice(0, 19).replace('T', ' ');

  const query = `
      INSERT INTO tokens (id, access_token, expiration_time) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE access_token = ?, expiration_time = ?`;

  await connection.query(query, [1, accessToken, formattedExpirationTime, accessToken, formattedExpirationTime]);

  console.log('Access token stored successfully');
};

// helper function for dates
function getFormattedDate(date) {
    var year = date.getFullYear();
  
    var month = (1 + date.getMonth()).toString();
    month = month.length > 1 ? month : '0' + month;
  
    var day = date.getDate().toString();
    day = day.length > 1 ? day : '0' + day;
  
    return year + '-' + month + '-' + day;
  }
 
  const getListings = async () => {
    let listingIds = [];
    const limit = 100;
    let skip = 0;
    
    // Create an empty object to store the mapping
    let nicknameMapping = {};
  
    while (true) {
      const response = await sdk.getListings({
        fields: '_id%20nickname', // request only the listingId
        limit: limit.toString(),
        skip: skip.toString()
      });
  
      // Populate the nicknameMapping object
      response.data.results.forEach(listing => {
        nicknameMapping[listing._id] = listing.nickname;
      });
  
      // If there are no more listings to fetch, break out of the loop
      if (response.data.results.length < limit) {
        break;
      }
  
      // Otherwise, increment the skip counter to fetch the next page
      skip += limit;
    }
  console.log("nicknameMapping", nicknameMapping);
    // Return the nicknameMapping object along with the original results
    return nicknameMapping;
  };
  
  
async function getCalendarData(listingIds, startDate, endDate) {
  const idsString = Array.isArray(listingIds) ? listingIds.join(',') : listingIds;

  // Convert dates to 'YYYY-MM-DD' string format
  const startDateFormat = getFormattedDate(startDate);
  const endDateFormat = getFormattedDate(endDate);

  // Authenticate before making a request
  // sdk.auth(process.env.MY_TOKEN);
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
    // const allListings = await getListings();
    // const startDate = new Date();
    // const endDate = new Date();
    // endDate.setMonth(endDate.getMonth() + 1);
    const allListings = await getListings();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 1);
    startDate.setHours(23, 59, 59, 999); // Set to the last millisecond of the previous day
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    let allManualBlocks = [];

    // Authenticate before making a request
    // sdk.auth(process.env.MY_TOKEN);

   // Get all listingIds
   const allListingIds = Object.keys(allListings).join(',');
   console.log('allListingIds', allListingIds);

   // Make one call with all listingIds
   const calendarData = await getCalendarData(allListingIds, startDate, endDate); 

   const days = calendarData.data.days; // Retrieve days array directly
   for (let day of days) { // iterate over days
     if (day.blocks.m) { // if manual block is true
       // directly push the simplified object to allManualBlocks
       allManualBlocks.push({
         id: `${day.listingId}_${day.date}`,
         listingId: day.listingId,
         date: day.date,
         nickname: allListings[day.listingId],
         note: day.note ? day.note : ""
       });
     }
   }
  //  console.log('First 3 manually blocked objects', JSON.stringify(allManualBlocks.slice(0, 3), null, 2));
  //  await new Promise(resolve => setTimeout(resolve, 10000));

    return allManualBlocks;
};

const handleBlocks = async () => {
  const auth = new google.auth.GoogleAuth({
    keyFile: "credentials.json",
    // keyFile: "/app/google-credentials.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
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
    range: "Sheet6",
  });

  // Get existing data
  const existingData = getRows.data.values || [];
  console.log("existingData", existingData);

  // Get manual block data
  const manualBlockData = await getManualBlocksData();
  console.log("manualBlockData:", manualBlockData);

      // Prepare the queue for write requests
      const queue = [];

      // const startDate = new Date();
      // startDate.setHours(0,0,0,0);
      
      // const endDate = new Date();
      // endDate.setMonth(endDate.getMonth() + 1);
      // endDate.setHours(23,59,59,999);  
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 1);
      startDate.setHours(23, 59, 59, 999);
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);      

// Filter existingData based on the check-in date range
const filteredExistingData = existingData.filter((row, index) => {
  // Skip the header row and rows with less than 3 elements
  if (index === 0 || row.length < 3) return false;

  const checkInString = row[2].split("-");
  const checkInDate = new Date(checkInString[0], checkInString[1] - 1, checkInString[2]); 

  return checkInDate >= startDate && checkInDate <= endDate;
});  

console.log("startDate", startDate);
console.log("endDate", endDate);
console.log("filteredExistingData", filteredExistingData);

// // Check if each row in manualBlockData already exists in the filtered existingData
// for (let row of manualBlockData) {
//   const existingRow = filteredExistingData.find((existingRow) => existingRow[0] === row.id);

//   if (existingRow) {
//     // If row exists, update the values
//     const range = `Sheet6!A${existingData.indexOf(existingRow) + 1}:E${existingData.indexOf(existingRow) + 1}`;
//     queue.push({
//       operation: "update",
//       range,
//       values: [Object.values(row)],
//     });
//   } else {
//     // If row does not exist, append the values
//     const existingRowWithSameId = existingData.find((existingRow) => existingRow[0] === row.id);
//     if (!existingRowWithSameId) {
//       console.log("Appending row:", row);
//       queue.push({
//         operation: "append",
//         values: [Object.values(row)],
//       });
//     }
//   }
// }

  // Check if each row in manualBlockData already exists in the filtered existingData
  for (let row of manualBlockData) {
    const existingRow = filteredExistingData.find((existingRow) => existingRow[0] === row.id);

    if (!existingRow) {
      // If row does not exist, append the values
      const existingRowWithSameId = existingData.find((existingRow) => existingRow[0] === row.id);
      if (!existingRowWithSameId) {
        console.log("Appending row:", row);
        queue.push({
          operation: "append",
          values: [Object.values(row)],
        });
      }
    }
  }

//   clear row logic
// Check if each row in filteredExistingData is present in manualBlockData
for (let row of filteredExistingData) {
  const manualBlockRow = manualBlockData.find((blockRow) => blockRow.id === row[0]);

  if (!manualBlockRow) {
    // If row does not exist in manualBlockData, queue up a clear operation
    const range = `Sheet6!A${existingData.indexOf(row) + 1}:E${existingData.indexOf(row) + 1}`;
    console.log("Queuing clear operation for:", row);
    queue.push({
      operation: "clear",
      range,
    });
  }
}

  // Process the queue with limited requests per minute
  const maxRequestsPerMinute = 60; // Adjust this value based on the per minute user limit
  const delayMs = 1000 * (60 / maxRequestsPerMinute);

  for (let i = 0; i < queue.length; i++) {
    const request = queue[i];
    console.log("Processing request:", request);

    if (request.operation === "append") {
      await googleSheets.spreadsheets.values.append({
        auth,
        spreadsheetId,
        range: "Sheet6",
        valueInputOption: "USER_ENTERED",
        resource: {
          values: request.values,
        },
      });
    // } else if (request.operation === "update") {
    //   await googleSheets.spreadsheets.values.update({
    //     auth,
    //     spreadsheetId,
    //     range: request.range,
    //     valueInputOption: "USER_ENTERED",
    //     resource: {
    //       values: request.values,
    //     } ,
    //   });
    } else if (request.operation === "clear") {
      // Clear operation - clear the specified range
      await googleSheets.spreadsheets.values.clear({
        auth,
        spreadsheetId,
        range: request.range,
      });
    }

    // Delay the next request
    if (i < queue.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  console.log("Completed processing requests");
  return getRows.data;
};
  
// Main execution flow
const run = async () => {
  const accessToken = await checkTokenExpiration();
  sdk.auth("Bearer " + accessToken);
  // await handleReservations();
  await handleBlocks();
};

run().catch(console.error);
  
  
const PORT = process.env.PORT || 1337;

app.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
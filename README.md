# guestySheets
This application is meant to connect to a service (in this case, Guesty, a property management platform), retrieve reservation data and manual block data, and write that data into a Google Sheet.

Here's a brief summary of how it works:

It authenticates to the API using an SDK for api and a token.

It retrieves reservation data using the getReservationDetails function. This involves a while-loop that continually makes requests until it has fetched all the data, limiting the number of requests per minute to avoid exceeding API rate limits.

It retrieves a list of all listing IDs using the getListings function, again in a paginated manner to avoid exceeding API rate limits.

It retrieves calendar data using the getCalendarData function for each listing. This function uses the getAvailabilityPricingApiCalendarListings method of the API, passing in the listing IDs, start date, and end date.

The getManualBlocksData function is used to collect the manual block data for all listings. For each listing, it gets the calendar data and creates an array of block periods. For each day that is marked as blocked, it checks if it's the day after the last day of the current block period. If it is, it extends the current block period. If it's not, it starts a new block period. This way, it builds a list of all block periods for the listing.

Each block period for a listing is then passed to the formatBlock function, which formats the data to match the reservation data format, appending a 'manualBlock' type to distinguish it from regular reservation data.

The API endpoint /manualBlocks is set up to handle GET requests, retrieving all the manual block data by invoking the getManualBlocksData function, and then returning the data in the HTTP response.

Finally, the data is written to a Google Sheet. The / route is set up to handle GET requests. When a request is received, it authenticates with Google Sheets, retrieves the current data in the sheet, retrieves the reservation details (including the manual block data), and compares the two. If a reservation (or manual block) exists in the retrieved data but not in the sheet, it appends it to the sheet. If it exists in both, but the data is different, it updates the row in the sheet. To avoid exceeding Google Sheets API rate limits, it also limits the number of write requests it makes per minute.
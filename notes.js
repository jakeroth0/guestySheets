// res that has value of 0 for fare
{
    "_id": "64a33b4002da31caf5fd1ef8",
    "integration": {
      "_id": "5bd629fc836a5b00d27e1537",
      "platform": "manual",
      "limitations": {
        "availableStatuses": [
          "checked_in",
          "checked_out",
          "canceled"
        ]
      }
    },
    "accountId": "5bd1d4d2626b79003f13df57",
    "guestId": "64a33b406cb70f003980e2a6",
    // confirmed??
    "status": "confirmed",
    "listingId": "62211c03baf36000374d0b9f",
    "listing": {
      "_id": "62211c03baf36000374d0b9f"
    },
    "guest": {
      "_id": "64a33b406cb70f003980e2a6",
      "fullName": "NSD"
    },
    "log": [
      {
        "_id": "64a33b4407bcb4002b7c1e98",
        "reservationId": "64a33b4002da31caf5fd1ef8",
        "event": "Booking was confirmed successfully",
        "by": "coordinator@tesseractrentals.com",
        "at": "2023-07-03T21:19:00.499Z",
        "changes": [],
        "__v": 0
      }
    ]
  }

// res that has fare value 0
{
    "_id": "64a33357cbd280d9401834ac",
    "integration": {
      "_id": "5bd629fc836a5b00d27e1537",
      "platform": "manual",
      "limitations": {
        "availableStatuses": []
      }
    },
    "accountId": "5bd1d4d2626b79003f13df57",
    "guestId": "64a33356f63f2b002b64b8c2",
    // status canceled
    "status": "canceled",
    "listingId": "62211c03baf36000374d0b9f",
    "listing": {
      "_id": "62211c03baf36000374d0b9f"
    },
    "guest": {
      "_id": "64a33356f63f2b002b64b8c2",
      "fullName": "NSD"
    },
    "log": [
      {
        "_id": "64a33b271d0c30002b4d582c",
        "reservationId": "64a33357cbd280d9401834ac",
        "event": "Booking was canceled",
        "by": "coordinator@tesseractrentals.com",
        "at": "2023-07-03T21:18:31.615Z",
        "changes": [],
        "__v": 0
      },
      {
        "_id": "64a33359096160002d4baae8",
        "reservationId": "64a33357cbd280d9401834ac",
        "event": "Booking was confirmed successfully",
        "by": "coordinator@tesseractrentals.com",
        "at": "2023-07-03T20:45:13.691Z",
        "changes": [],
        "__v": 0
      }
    ]
  }

//   normal res with 529 for fare
{
    "_id": "64a32f35039bb6002c04ce59",
    "integration": {
      "platform": "airbnb2",
      "_id": "5bd1d4d4626b79003f13df5c",
      "limitations": {
        "availableStatuses": []
      }
    },
    "listingId": "62211c03baf36000374d0b9f",
    "listing": {
      "_id": "62211c03baf36000374d0b9f"
    },
    // confirmed
    "status": "confirmed",
    "guest": {
      "_id": "64a32f35039bb6002c04ce54",
      "phone": "15405996192",
      "fullName": "Cody Martin"
    },
    "accountId": "5bd1d4d2626b79003f13df57",
    "guestId": "64a32f35039bb6002c04ce54",
    "log": [
      {
        "_id": "64a32f35039bb6002c04ce7d",
        "reservationId": "64a32f35039bb6002c04ce59",
        "event": "Booking was confirmed successfully",
        "by": "ChannelService",
        "at": "2023-07-03T20:27:33.774Z",
        "changes": [],
        "__v": 0
      }
    ]
  }
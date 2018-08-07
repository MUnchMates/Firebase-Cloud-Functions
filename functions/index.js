const functions = require('firebase-functions')
const admin = require('firebase-admin')
admin.initializeApp();

// listens for database updates in messages
// appropriately sends a message to the user
exports.sendMessageNotification = functions.database.ref('USERS/{userID}/conversations/messageList/{senderID}/messages/{messageID}').onWrite((change, context) => {
  var userID = context.params.userID
  var mateID = context.params.senderID
  var messageData = change.after.val()
  console.log(userID + ' from convo with ' + mateID)

  if (messageData == null) {
    console.log('Bad message update')
    return 0
  }
  if (messageData.sender_id == userID) {
    console.log('Not sending to sender')
    return 0
  }

  const getUserPromise = admin.database().ref(`USERS/${userID}`).once('value')
  return Promise.all([getUserPromise]).then(results => {
    const user = results[0].val()

    if (user.emailNotifications) {
      const payload = {
        data: {
          title: messageData.name,
          body: messageData.text,
          sender: messageData.sender_id,
          date: messageData.dateTime
        },
        notification: {
          title: messageData.name,
          body: messageData.text
        }
      }

      admin.messaging().sendToDevice(user.instanceId, payload)
        .then(function (response) {
          console.log('Successfully sent message:', response)
        })
        .catch(function (error) {
          console.log('Error sending message:', error)
        })
    }
    else {
      console.log('Not sending, user is muted')
    }
  })
})

states = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AS": "American Samoa",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "DC": "District Of Columbia",
  "FM": "Federated States Of Micronesia",
  "FL": "Florida",
  "GA": "Georgia",
  "GU": "Guam",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MH": "Marshall Islands",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "MP": "Northern Mariana Islands",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PW": "Palau",
  "PA": "Pennsylvania",
  "PR": "Puerto Rico",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VI": "Virgin Islands",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
}

// listens for database updates in hometown
exports.fixCity = functions.database.ref('USERS/{userID}/city').onWrite((change, context) => {
  var userID = context.params.userID
  var city = change.after.val()
  console.log("Got city " + city)

  city = city.trim()
  if (city.includes(',')) {
    console.log("Removing state")
    city = city.substring(0, city.indexOf(','))
  }
  if (city.includes('.')) {
    console.log("Removing periods")
    city = city.split('.').join('')
  }

  city = city.trim()
  if(city != change.after.val()) {
    console.log('City updated from ' + change.after.val() + ' to ' + city)
    return change.after.ref.set(city)
  }
  console.log('City ' + city + ' passes')
  return 0
})

// listens for database updates in state
exports.fixState = functions.database.ref('USERS/{userID}/stateCountry').onWrite((change, context) => {
  var userID = context.params.userID
  var state = change.after.val()

  state = state.trim()
  if(state.length > 2) {
    for(key in states) {
      if(states[key].toUpperCase() == state.toUpperCase()) {
        state = key
      }
    }
  }
  else {
    state = state.toUpperCase()
  }

  state = state.trim()
  if(state != change.after.val()) {
    console.log('State updated from ' + change.after.val() + ' to ' + state)
    return change.after.ref.set(state)
  }
  console.log('State ' + state + ' passes')
  return 0
})

// make all mate types advance to the next year
// run https://us-central1-<PROJECT-ID>.cloudfunctions.net/classUpdate?key=<YOUR-KEY>
exports.classUpdate = functions.https.onRequest((req, res) => {
  const key = req.query.key

  if (key != functions.config().cron.key) {
    console.log('Invalid key')
    res.status(403).send('Security key does not match!')
    return null
  }

  const getUsersPromise = admin.database().ref(`USERS/`).once('value')
  return Promise.all([getUsersPromise]).then(results => {
    results[0].forEach(function (child) {
      var key = child.key
      var user = child.val()
      var currentClass = user.mateType
      switch (currentClass) {
        case 'Freshman':
          user.mateType = 'Sophomore'
          console.log('Updating Freshman to Sophomore for' + key)
          break
        case 'Sophomore':
          user.mateType = 'Junior'
          console.log('Updating Sophomore to Junior for' + key)
          break
        case 'Junior':
          user.mateType = 'Senior'
          console.log('Updating Junior to Senior for' + key)
          break
        case 'Senior':
        case 'Super Senior':
          user.mateType = 'Alum'
          console.log('Updating ' + currentClass + ' to Alum for' + key)
          break
        default:
          console.log('Skipping ' + currentClass + ' ' + key)
      }
      admin.database().ref(`USERS/` + key).set(user)
    })
    res.send('Successfully updated mate types!')
  })
})
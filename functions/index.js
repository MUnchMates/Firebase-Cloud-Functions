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
  
  if(messageData == null) {
    console.log('Bad message update')
    return 0
  }
  if(messageData.sender_id == userID) {
    console.log('Not sending to sender')
    return 0
  }

  const getUserPromise = admin.database().ref(`USERS/${userID}`).once('value')
  return Promise.all([getUserPromise]).then(results => {
    const user = results[0].val()

    if(user.emailNotifications) {
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

// make all mate types advance to the next year
// run https://us-central1-<PROJECT-ID>.cloudfunctions.net/classUpdate?key=<YOUR-KEY>
exports.classUpdate = functions.https.onRequest((req, res) => {
  const key = req.query.key

  if(key != functions.config().cron.key) {
    console.log('Invalid key')
    res.status(403).send('Security key does not match!')
    return null
  }

  const getUsersPromise = admin.database().ref(`USERS/`).once('value')
  return Promise.all([getUsersPromise]).then(results => {
    results[0].forEach(function(child) {
      var key = child.key
      var user = child.val()
      var currentClass = user.mateType
      switch(currentClass) {
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
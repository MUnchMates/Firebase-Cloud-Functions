const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

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
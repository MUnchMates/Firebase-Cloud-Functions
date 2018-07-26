const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.sendMessageNotification = functions.database.ref('USERS/{userID}/conversations/messageList/{senderID}/messages/{messageID}').onWrite((change, context) => {
  var receiver = context.params.userID
  var sender = context.params.senderID
  if (receiver == sender) {
    return 0;
  }

  var messageData = change.after.val();    
  const getInstanceIdPromise = admin.database().ref(`USERS/${receiver}/instanceId`).once('value');

  return Promise.all([getInstanceIdPromise]).then(results => {
    const instanceId = results[0].val();

    const payload = {
      data: {
        title: messageData.name,
        body: messageData.text,
        sender: sender,
        date: messageData.dateTime
      },
      notification: {
        title: messageData.name,
        body: messageData.text
      }
    };

    admin.messaging().sendToDevice(instanceId, payload)
      .then(function (response) {
        console.log("Successfully sent message:", response);
      })
      .catch(function (error) {
        console.log("Error sending message:", error);
      });
  });
});
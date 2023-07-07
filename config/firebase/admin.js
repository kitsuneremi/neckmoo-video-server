const admin = require('firebase-admin');
const serviceAccount = require('../server/serviceAccountKey.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'carymei.appspot.com',
    serviceAccount: 'firebase-adminsdk-67b2h@carymei.iam.gserviceaccount.com',
});


module.exports = admin
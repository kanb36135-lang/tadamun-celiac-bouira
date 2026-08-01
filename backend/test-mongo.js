const mongoose = require('mongoose');

const uri = 'mongodb://tadamun_admin:11235813213455@ac-xt6ek6n-shard-00-00.vwgm64a.mongodb.net:27017,ac-xt6ek6n-shard-00-01.vwgm64a.mongodb.net:27017,ac-xt6ek6n-shard-00-02.vwgm64a.mongodb.net:27017/tadamun_celiac?ssl=true&replicaSet=atlas-e8mqw9-shard-0&authSource=admin&appName=Cluster0';

mongoose.connect(uri)
  .then(() => {
    console.log('✅ MongoDB Atlas connecté avec succès !');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erreur:', err.message);
    process.exit(1);
  });
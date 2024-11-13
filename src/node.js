const express = require('express');
const app = express();

app.get('/', function(req, res){
  res.send("Hello from the root application URL!");
});

app.listen(3000, () => {
  console.log("listening on http://localhost:3000");
})



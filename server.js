var express = require('express'),
    athletes = require('./routes/athletes'),
    events = require('./routes/events'),
    rosters = require('./routes/rosters'),
    leaderboard = require('./routes/leaderboard');
 
var app = express();
 
app.configure(function () {
    app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
    app.use(express.bodyParser());
});
 
app.get('/athletes', athletes.findAll);
app.get('/athletes/id/:id', athletes.findById);
app.get('/athletes/reloadAll', athletes.reloadAll);
app.get('/athletes/getGroup/:date', function(req, res) {    // get randomized group of 3 players
  res.contentType("application/json");
  res.header("Access-Control-Allow-Origin", "*");
  athletes.getGroup(req,res);
}); 

app.get('/rosters', rosters.findAll);
app.get('/rosters/scoreAll', rosters.scoreAll);
app.get('/rosters/summary/:user', function(req, res) {
  res.contentType("application/json");
  res.header("Access-Control-Allow-Origin", "*");  
  rosters.userRosterSummary(req,res);
});
app.get('/rosters/:user/:date', function(req, res) {
  res.contentType("application/json");
  res.header("Access-Control-Allow-Origin", "*");  
  rosters.findByUserAndDate(req,res);
});
app.post('/rosters/add', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*"); 
  rosters.addRoster(req,res);
});  

app.get('/events', events.findAll);
app.get('/events/reloadAll', events.reloadAll);
app.get('/events/id/:id', events.findById);

app.get('/leaderboard', function(req, res) {
  res.contentType("application/json");
  res.header("Access-Control-Allow-Origin", "*");  
  leaderboard.getLeaders(req,res);
});

//app.post('/athletes', athletes.addWine);
//app.put('/athletes/:id', athletes.updateWine);
//app.delete('/athletes/:id', athletes.deleteWine);

var port = process.env.PORT || 3000;
app.listen(port);
console.log('Listening on port '+port+'...');

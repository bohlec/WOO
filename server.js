var express = require('express'),
    cronJob = require('cron').CronJob,
    athletes = require('./routes/athletes');
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
app.get('/athletes/reloadAll', function(req, res) {
  athletes.reloadAll(req,res);
});
app.get('/athletes/getGroup/:date', function(req, res) {    // get randomized group of 3 players
  res.contentType("application/json");
  res.header("Access-Control-Allow-Origin", "*");
  athletes.getGroup(req,res);
});

app.get('/rosters', rosters.findAll);
app.get('/rosters/scoreAll', function(req, res) {
  rosters.scoreAll(req,res);
});
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
app.get('/events/reloadAll', function(req, res) {
  events.reloadAll(req,res);
});
app.get('/events/id/:id', events.findById);

app.get('/leaderboard', function(req, res) {
  res.contentType("application/json");
  res.header("Access-Control-Allow-Origin", "*");
  leaderboard.getLeaders(req,res);
});

var job = new cronJob({
  //cronTime: '00 30 11 * * 1-5',
  cronTime: '00 00,15,30,45 * * * *',
  onTick: function() {
      events.reloadAll();
      rosters.scoreAll();
      console.log('Data refreshed! Rosters scored!');
  },
  start: true
});

app.listen(process.env.VCAP_APP_PORT || 3000);
console.log('Listening on port ' + (process.env.VCAP_APP_PORT || 3000) + '...');

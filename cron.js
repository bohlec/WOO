var cronJob = require('cron').CronJob,
    events = require('./routes/events'),
    athletes = require('./routes/athletes'),
    rosters = require('./routes/rosters');

var job = new cronJob({
  //cronTime: '00 30 11 * * 1-5',
  cronTime: '00 00,15,30,45 * * * *',
  onTick: function() {
  		events.reloadAll();
      athletes.reloadAll();
  		rosters.scoreAll();
  },
  start: true,
  timeZone: "America/New_York"
});
//job.start();

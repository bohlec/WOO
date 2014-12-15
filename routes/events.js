var mongo = require('mongodb'),
http = require('http');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure,
    Client = mongo.MongoClient;

//var server = new Server('localhost', 27017, {auto_reconnect: true});
//db = new Db('woo', server);

Client.connect('mongodb://pickarange:pickme@ds049537.mongolab.com:49537/pickarange', function(err, db) {

//db.open(function(err, db) {
    //if(!err) {
        console.log("Connected to 'events' database");
        db.collection('events', {safe:true}, function(err, collection) {
            if (err) {
                console.log("The 'events' collection doesn't exist. Creating it with sample data...");
                //populateDB();
            }
        });
    //}
//});

    exports.findById = function(req, res) {
        var id = req.params.id;
        console.log('Retrieving event: ' + id);
        db.collection('events', function(err, collection) {
            collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, item) {
                res.send(item);
            });
        });
    };

    exports.findAll = function(req, res) {
        db.collection('events', function(err, collection) {
            collection.find().toArray(function(err, items) {
                res.send(items);
            });
        });
    };


    exports.reloadAll = function(req, res) {
        // Lookup last recorded date in DB
        db.collection('events', function(err, collection) {
            collection.find({}, {'date':1}).sort({'date':-1}).limit(1).toArray(function(err, items) {
                var endDate = new Date(),
                    startDate;
                if (items & items.length) {
                    startDate = items[0].date; // last date in DB
                } else {
                    startDate = new Date();
                    startDate.setDate(startDate.getDate()-3); // start 2 days back
                }
                endDate.setDate(endDate.getDate()+2);
                while (startDate <= endDate) {
                    console.log(startDate);

                    var options = {
                      host: 'api.espn.com',
                      port: 80,
                      path: '/v1/sports/basketball/nba/events?dates='+url_date_formatter(startDate)+
                            '&disable=venues,links,stats,linescores&apikey=ceevkg9k7t9gs4kyufyf9rqr'
                    };
                    http.get(options, function(resp){
                        var json = '';
                        resp.on('error', function(e) {
                            console.log('HTTP ERROR: ' + e);
                        });
                        resp.on('data', function(chunk){
                            json+=chunk;
                        });
                        resp.on("end", function(e) {
                            json = JSON.parse(json);
                            var events = json.sports[0].leagues[0].events;
                            console.log('Adding events: '+events.length);
                            for(var i=0;i<events.length;i++) {
                                var options = {
                                  host: 'api.espn.com',
                                  port: 80,
                                  path: '/v1/sports/basketball/nba/events/'+events[i].id+'?' +
                                        '&enable=statistics&apikey=ceevkg9k7t9gs4kyufyf9rqr'
                                };
                                http.get(options, function(resp1){
                                    var json1 = '';
                                    resp1.on('data', function(chunk) {
                                        json1+=chunk;
                                    });
                                    resp1.on('end', function(e) {
                                        json1 = JSON.parse(json1);
                                        db.collection('events', function(err, collection) {
                                            var event = json1.sports[0].leagues[0].events[0];
                                            event.date = new Date(event.date);
                                            collection.update({'id':event.id},
                                                event,
                                                {'upsert':true, 'safe':true},
                                                function(err, result){
                                                    if (err) {
                                                        console.log('Error1 '+err);
                                                    } else {
                                                        //console.log('Success');
                                                        if (res) res.send('Success');
                                                    }
                                                }
                                            );
                                        });

                                        db.collection('athlete_events', function(err, collection) {
                                            var comps = json1.sports[0].leagues[0].events[0].competitions[0].competitors;
                                            for(var i=0;i<comps.length;i++) {
                                                var athletes = comps[i].team.athletes;
                                                var athlete_opp = (i) ? comps[0].team.abbreviation : comps[1].team.abbreviation;
                                                for(var j=0;j<athletes.length;j++) {
                                                    var athlete = athletes[j];
                                                    athlete.date = new Date(json1.sports[0].leagues[0].events[0].date+'');
                                                    athlete.eventID = json1.sports[0].leagues[0].events[0].id;
                                                    athlete.opp = athlete_opp;
                                                     collection.update({'id':parseInt(athlete.id), 'eventID':parseInt(athlete.eventID)},
                                                        athlete,
                                                        {'upsert':true, 'safe':true},
                                                        function(err, result){
                                                            if (err) {
                                                                console.log('Error2 '+err);
                                                            } else {
                                                                //console.log('Success');
                                                                if (res) res.send('Success');
                                                            }
                                                        });
                                                }
                                            }
                                        });

                                    });
                                });
                            }
                        });
                    });

                    startDate.setDate(startDate.getDate()+1);
                }
            });
        });
    }

});


function url_date_formatter(date) {
    var dateString = date.getFullYear().toString();
    dateString += ((date.getMonth()+1) < 10) ? '0' : '';
    dateString += (date.getMonth()+1);
    dateString += (date.getDate() < 10) ? '0' : '';
    dateString += date.getDate();
    return dateString;
}

function parseISO8601(str) {
     // we assume str is a UTC date ending in 'Z'
    if (!(str instanceof Date)) {
        var parts = str.split('T'),
        dateParts = parts[0].split('-'),
        timeParts = parts[1].split('Z'),
        timeSubParts = timeParts[0].split(':'),
        timeSecParts = timeSubParts[2].split('.'),
        timeHours = Number(timeSubParts[0]),
        _date = new Date;

        _date.setUTCFullYear(Number(dateParts[0]));
        _date.setUTCMonth(Number(dateParts[1])-1);
        _date.setUTCDate(Number(dateParts[2]));
        _date.setUTCHours(Number(timeHours));
        _date.setUTCMinutes(Number(timeSubParts[1]));
        _date.setUTCSeconds(Number(timeSecParts[0]));
        if (timeSecParts[1]) _date.setUTCMilliseconds(Number(timeSecParts[1]));

        // by using setUTC methods the date has already been converted to local time(?)
        return _date;
    } else
        return str;
}



/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function (Date, undefined) {
    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));

/*
exports.reloadAll = function(req, res) {
    var options = {
      host: 'api.espn.com',
      port: 80,
      path: '/v1/sports/basketball/nba/events?apikey=ceevkg9k7t9gs4kyufyf9rqr'
    }, json = '';
    http.get(options, function(resp){
        resp.on('data', function(chunk){
            json+=chunk;
        });
        resp.on("end", function(e) {
            json = JSON.parse(json);
            console.log('Adding events: ' + json);
            db.collection('events', function(err, collection) {
                collection.insert(json.sports[0].leagues[0].events, {safe:true}, function(err, result) {
                    if (err) {
                        res.send({'error':'An error has occurred'});
                    } else {
                        console.log('Success: ' + JSON.stringify(result[0]));
                        res.send(result[0]);
                    }
                });
            });
        });
    }).on("error", function(e){
      console.log("Got error: " + e.message);
    });
}
*/

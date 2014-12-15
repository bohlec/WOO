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
        if(!err) {
            console.log("Connected to 'rosters' database");
            db.collection('rosters', {safe:true}, function(err, collection) {
                if (err) {
                    console.log("The 'rosters' collection doesn't exist. Creating it with sample data...");
                    //populateDB();
                }
            });
        }
    //});

    exports.addRoster = function(req, res) {
        var roster = req.body;
        console.log('Adding roster: ' + JSON.stringify(roster));
        db.collection('rosters', function(err, collection) {
            collection.update({'user':roster.user, 'date':roster.date},
                roster,
                {'upsert':true, 'safe':true},
                function(err, result) {
                    if (err) {
                        console.log('Error');
                    } else {
                        console.log('Success');
                        if (res) res.send('Success');
                    }
                }
            );
        });
    };

    exports.findByUserAndDate = function(req, res) {
        var user = req.params.user;
        var date = req.params.date;
        console.log('Retrieving rosters: ' + user + ', ' + date);
        db.collection('rosters', function(err, collection) {
            collection.findOne({'user':user, 'date':date}, function(err, item) {
                if (item) {
                    // need to look up each player to provide player structure
                    var players = []; // ids come back as strings which doesn't look up properly
                    for(var i=0;i<item.players.length;i++) {players.push(parseInt(item.players[i]));}
                    db.collection('athletes', function(err, ath_collection) {
                        console.log('Looking up roster athletes...' + players);
                        ath_collection.find({'id': { $in: players }}).toArray(function(err, items) {
                            if (items) {
                                console.log(items.length);
                                item.players = items; // replace array of ids with array of athlete json
                                res.send('{"roster":'+JSON.stringify(item)+'}');
                            } else {
                                res.send('{"roster":{}}');
                            }
                        });
                    });
                } else
                    res.send('{"roster":{}}');
            });
        });
    };

    exports.findById = function(req, res) {
        var id = req.params.id;
        console.log('Retrieving rosters: ' + id);
        db.collection('rosters', function(err, collection) {
            collection.findOne({'_id':new BSON.ObjectID(id)}, function(err, item) {
                res.send(item);
            });
        });
    };

    exports.findAll = function(req, res) {
        db.collection('rosters', function(err, collection) {
            collection.find().toArray(function(err, items) {
                res.send(items);
            });
        });
    };

    exports.scoreAll = function(req, res) {
         db.collection('rosters', function(err, roster_collection) {
            var today = new Date(), yesterday = new Date();
            yesterday = new Date(yesterday.setDate(yesterday.getDate()-1));
            var dates = [url_date_formatter(today), url_date_formatter(yesterday)];
            roster_collection.find({'$or': [{'score':'-1'}, {'date': {'$in': dates}}]}).toArray(function(err, items) {
                console.log('Updating '+items.length+' roster scores... ['+ url_date_formatter(today) + ']');
                db.collection('athlete_events', function(event_err, event_collection) {
                    items.forEach(function(roster) {
                        // iterate all rosters that have not been scored
                        // convert array of strings to ints
                        var players = [];
                        console.log(roster);
                        for(var k=0;k<roster.players.length;k++) {players.push(parseInt(roster.players[k]));}
                        // set up start date / end date for query
                        var startDate = new Date(roster.date+'T00:00:00-0500');
                        var endDate = new Date(roster.date+'T23:59:59-0500');
                        console.log(startDate + ' ' + endDate);
                        event_collection.find({'id':{'$in':players}, 'date':{'$gte':startDate, '$lt':endDate}}).toArray(function(err, events) {
                            var score = 0, player_points = {};
                            console.log('are there events? ' + events + ', ' + err);
                            for(var j=0;j<events.length;j++) {
                                console.log(events[j].fullName + ' ' + events[j].statistics[0].statCategories[0].stats[19].value);
                                score += events[j].statistics[0].statCategories[0].stats[19].value;
                                player_points[events[j].id.toString()] = events[j].statistics[0].statCategories[0].stats[19].value;
                            }
                            roster.score = score; // players combined points total
                            roster.player_points = player_points; // array of individual player points indexed by player id
                            roster.roster_points = (roster.score >= roster.range_min && roster.score <= roster.range_max) ?
                                    parseInt(roster.points) :  // awarding the points for selected range
                                    0;
                            console.log('roster='+JSON.stringify(roster));
                            roster_collection.update({'user':roster.user, 'date': roster.date},
                                roster,
                                {'upsert':true, 'safe':true},
                                function(err, result){
                                    if (err) {
                                        console.log('Error');
                                    } else {
                                        console.log('Success '+roster.user);
                                        if (res) res.send('Success');
                                    }
                                });
                        });
                    });
                });
            });
        });
    };

    exports.userRosterSummary = function(req, res) {
        var user = req.params.user;
        var json = '';
        console.log(typeof(Promise) != 'undefined');
         db.collection('rosters', function(err, roster_collection) {
            var today = new Date(), dates = [url_date_formatter(today)];
            for (var i=0;i<3;i++) {dates.push(url_date_formatter(new Date(today.setDate(today.getDate()-1))));}
            roster_collection.find({'$and': [{'user':user}, {'date': {'$in': dates}}]}).sort({ "date": -1 }).toArray(function(err, roster_days) {
                console.log('Retrieving '+user+' roster summary... ['+ dates + ']');
                if (roster_days.length) {
                    roster_days.forEach(function(roster_day) {
                        var players = []; // ids come back as strings which doesn't look up properly
                        for(var i=0;i<roster_day.players.length;i++) {players.push(parseInt(roster_day.players[i]));}
                        db.collection('athletes', function(err, ath_collection) {
                            console.log('Looking up roster athletes...' + players);
                            ath_collection.find({'id': { $in: players }}).toArray(function(err, items) {
                                roster_day.players = items; // replace array of ids with array of athlete json
                                // Data obfuscation
                                if (roster_day.score <= 0) {
                                    // Not in progress (or terrible day) - hide range
                                    roster_day.points = roster_day.roster_points = roster_day.range_max = roster_day.range_min = '--';
                                }
                                // End Data obfuscation
                                if (roster_day == roster_days[roster_days.length-1]) {
                                    json += JSON.stringify(roster_day);
                                    res.send('['+json+']');
                                } else {
                                    json += JSON.stringify(roster_day) + ',';
                                }
                            });
                        });

                    });
                } else {
                     res.send('[]');
                }
            });
        });
    };


});

function url_date_formatter(date) {
    var dateString = date.getFullYear().toString() + '-';
    dateString += ((date.getMonth()+1) < 10) ? '0' : '';
    dateString += (date.getMonth()+1) + '-';
    dateString += (date.getDate() < 10) ? '0' : '';
    dateString += date.getDate();
    return dateString;
}

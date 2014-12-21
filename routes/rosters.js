var mongo = require('mongodb-bluebird'),
Promise = require('bluebird'),
http = require('http'),
athletes = require('./athletes');


mongo.connect('mongodb://pickarange:pickme@ds049537.mongolab.com:49537/pickarange').then(function(db) {
//mongo.connect('mongodb://pickarange:pickme@ds027741.mongolab.com:27741/pickarange2').then(function(db) {
    if(db) {
        console.log("Connected to 'rosters' database");
    } else {
        console.log('Connection error - rosters');
    }

    exports.addRoster = function(req, res) {
        var roster = req.body;
        var json = {"results": []};
        console.log('Adding roster: ' + roster.user);
        var collRosters = db.collection('rosters');
        collRosters.update({'user':roster.user, 'date':roster.date},
                roster,
                {'upsert':true, 'safe':true}
        ).then(function(e) {
            json.results.push(e+' rosters added.')
            res.send(json);
        });
    };

    exports.findByUserAndDate = function(req, res) {
        var user = req.params.user;
        var date = req.params.date;
        var response = {"roster":{}};
        console.log('Retrieving rosters: ' + user + ', ' + date);

        var collRosters = db.collection('rosters');

        collRosters.findOne({'user':user, 'date':date})
            .then(function(roster) {
                response.roster = roster;
            }).finally(function() {
                res.send(response);
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

    exports.loadPlayers = function(req,res) {
        var collRosters = db.collection('rosters');
        var json = {"results": null};
        var updates = [];
        collRosters.find({})
            .then(function(rosters) {
                return rosters;
            })
            .each(function(roster) {
                if (roster.players.length && !roster.players[0].id) {
                    var players = [];
                    for(var k=0;k<roster.players.length;k++) {players.push(parseInt(roster.players[k]));}
                    var collAthletes = db.collection('athletes');
                    collAthletes.find({'id': {'$in': players}})
                        .then(function(players) {
                            roster.players = players;
                            return collRosters.update({'user': roster.user, 'date': roster.date},
                                roster,
                                {'upsert':true, 'safe':true}
                                );
                        })
                        .then(function(update) {
                            console.log('2');
                            updates.push(update);
                        });
                }
            })
            .then(function() {
                console.log('3');
                return Promise.all(updates);
            })
            .then(function() {
                res.send(json);
                console.log('4');
            });
    };

    exports.scoreAll = function(req, res) {

        var collRosters = db.collection('rosters'),
            collAthleteEvents = db.collection('athlete_events');

        var today = new Date(), yesterday = new Date();
        yesterday = new Date(yesterday.setDate(yesterday.getDate()-1));
        var dates = [url_date_formatter(today), url_date_formatter(yesterday)];

        var json = {"result": []};
        var rosterPlayers = [];

        collRosters.find({'$or': [{'score':'-1'}, {'date': {'$in': dates}}]})
            .each(function(roster) {
                // iterate all rosters that have not been scored
                // convert array of strings to ints
                var players = [];
                for(var k=0;k<roster.players.length;k++) {players.push(parseInt(roster.players[k]));}
                // set up start date / end date for query
                var startDate = new Date(roster.date+'T00:00:00-0500');
                var endDate = new Date(roster.date+'T23:59:59-0500');
                console.log(startDate + ' ' + endDate);
                rosterPlayers.push(
                    collAthleteEvents.find({'id':{'$in':players}, 'date':{'$gte':startDate, '$lt':endDate}})
                        .then(function(events) {
                            var score = 0, player_points = {};
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
                            return collRosters.update({'user':roster.user, 'date': roster.date},
                                roster,
                                {'upsert':true, 'safe':true}
                                );
                        }).then(function(recordsUpdated){
                            json.result.push(recordsUpdated + ' roster updated.');
                        })
                );
            })
            .then(function() {
                return Promise.all(rosterPlayers);
            })
            .then(function() {
                res.send(json);
            });
    };


    exports.userRosterSummary = function(req, res) {
        var user = req.params.user;
        var json = [];
        var today = new Date(), dates = [url_date_formatter(today)];
        for (var i=0;i<3;i++) {dates.push(url_date_formatter(new Date(today.setDate(today.getDate()-1))));}
        var collRosters = db.collection('rosters');

        collRosters.find({'$and': [{'user':user}, {'date': {'$in': dates}}]})
            .then(function(rosters) {
                console.log('Retrieving '+user+' roster summary... ['+ dates + ']');
                if (rosters && rosters.length) {
                    rosters = rosters.sort(function(a,b) {return new Date(a.date) < new Date(b.date);});
                    for(var i=0;i<rosters.length;i++) {
                        // Data obfuscation
                        if (rosters[i].score <= 0) {
                            // Not in progress (or terrible day) - hide range
                            rosters[i].points = rosters[i].roster_points = rosters[i].range_max = rosters[i].range_min = '--';
                        }
                    }
                    json = rosters;
                }
            })
            .finally(function() {
                res.send(json);
            })
            .catch(function(e) {
                console.log('userRosterSummary error: ' + e);
            });
    };

}).catch(function(err) {
  console.error("Rosters DB connection error.");
});;



function url_date_formatter(date) {
    var dateString = date.getFullYear().toString() + '-';
    dateString += ((date.getMonth()+1) < 10) ? '0' : '';
    dateString += (date.getMonth()+1) + '-';
    dateString += (date.getDate() < 10) ? '0' : '';
    dateString += date.getDate();
    return dateString;
}

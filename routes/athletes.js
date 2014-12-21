var mongo = require('mongodb-bluebird'),
Promise = require('bluebird'),
http = require('http');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure,
    Client = mongo.MongoClient;

//var server = new Server('localhost', 27017, {auto_reconnect: true});
//var server = new Server('ds049537.mongolab.com', 49537, {auto_reconnect: true});
mongo.connect('mongodb://pickarange:pickme@ds049537.mongolab.com:49537/pickarange').then(function(db) {
    //mongodb://<dbuser>:<dbpassword>@ds049537.mongolab.com:49537/pickarange
    //db = new Db('pickarange', server);

    //db.open(function(err, db) {
    if(db) {
        console.log("Connected to 'athletedb' database");
    }
    //});


    exports.findById = function(req, res) {
        var id = req.params.id;
        console.log('Retrieving athlete: ' + id);
        db.collection('athletes', function(err, collection) {
            collection.findOne({'id':id+''}, function(err, item) {
                res.send(item);
            });
        });
    };

    exports.findByIds = function(req, res) {
        var ids = req.params.ids;
        console.log('Retrieving athletes: ' + ids);
        var collAthletes =  db.collection('athletes');

        return collAthletes.find({'id': { $in: ids }});
/*
        db.collection('athletes', function(err, collection) {
            collection.find({'id': { $in: ids }}, function(err, items) {
                res.send(items);
            });
        });
*/
    };

    exports.findAll = function(req, res) {
        db.collection('athletes', function(err, collection) {
            //console.log(collection);
            collection.find().toArray(function(err, items) {
                res.send(items);
            });
        });
    };

    exports.reloadAll = function(req, res) {
        var options = {
          host: 'api.espn.com',
          port: 80,
          path: '/v1/sports/basketball/nba/teams?enable=leaders,stats&apikey=ceevkg9k7t9gs4kyufyf9rqr'
        }, json = '';


        var collAthletes = db.collection('athletes'),
            updates = [];

        http.get(options, function(resp){
            resp.on('data', function(chunk){
                json+=chunk;
            });
            resp.on("end", function(e) {
                json = JSON.parse(json);
                console.log('Adding athletes: ' + json);
                var teams = json.sports[0].leagues[0].teams;
                for (var i=0; i<teams.length; i++) {
                    for (var stat in teams[i].leaders) {
                        if (stat != "season") {
                            var options = {
                                  host: 'api.espn.com',
                                  port: 80,
                                  path: teams[i].leaders[stat].links.api.athletes.href+'?enable=statistics&apikey=ceevkg9k7t9gs4kyufyf9rqr'
                            };
                            http.get(options, function(resp1) {
                                var json1 = '';
                                resp1.on('data', function(chunk) {
                                    json1+=chunk;
                                });
                                resp1.on('end', function(e) {
                                    json1 = JSON.parse(json1);
                                    var player = json1.sports[0].leagues[0].athletes[0];
                                    updates.push(collAthletes.update({'id':player.id},
                                        player,
                                        {'upsert':true, 'safe':true}
                                    ));
                                });
                            });
                        }
                    }
                }
                Promise.all(updates)
                    .then(function() {
                        res.send('Success');
                    });
                console.log('done');
            });
        }).on("error", function(e){
          console.log("Got error: " + e.message);
        });
    };
    exports.getGroup = function(req, res) {
        var json = {"players": {}};
        var date = req.params.date;
        var startDate = new Date(date+'T00:00:00-0500');
        //startDate.setHours(startDate.getHours()-5);
        var endDate = new Date(date+'T23:59:59-0500');
        //endDate.setHours(endDate.getHours()+5);
        var active_teams = [],
            player_opps = {},
            comps = {},
            collEvents = db.collection('events'),
            collAthletes = db.collection('athletes');

        console.log('Getting new group of leaders...'+startDate.toISOString()+' '+endDate.toISOString());
        collEvents.find({'date':{'$gte':new Date(startDate.toISOString()),'$lt':new Date(endDate.toISOString())}})
            .then(function(events) {
                console.log(events.length+' events found.');
                var team1, team2;
                for(var i=0;i<events.length;i++) {
                    team1 = events[i].competitions[0].competitors[0].team;
                    team2 = events[i].competitions[0].competitors[1].team;
                    active_teams.push(team1.id);
                    active_teams.push(team2.id);
                    player_opps[team1.abbreviation] = team2.abbreviation;
                    player_opps[team2.abbreviation] = team1.abbreviation;
                }
                return collAthletes.find({'team.id':{'$in':active_teams}});
            })
            .then(function(athletes) {
                console.log(athletes.length+' athletes found.');
                var group = [], player, groupPlayerIDs = [];
                if (athletes.length) {
                    for(var j=0;j<3;j++) {
                        do {
                            player = athletes[Math.floor(Math.random() * athletes.length)];
                        } while (groupPlayerIDs.indexOf(player.id) >= 0);
                        player.opp = player_opps[player.team.abbreviation];
                        group.push(player);
                        groupPlayerIDs.push(player.id);
                    }
                }
                json.players = group;
            })
            .finally(function() {
                res.send(json);
            });
    };

});

/*

        console.log('Getting new group of leaders...'+startDate.toISOString()+' '+endDate.toISOString());
        db.collection('events', function(err, collection) {
            collection.find({'date':{'$gte':new Date(startDate.toISOString()),'$lt':new Date(endDate.toISOString())}}).toArray(function(err, events) {
                console.log(events.length+' events found.');
                var team1, team2;
                for(var i=0;i<events.length;i++) {
                    team1 = events[i].competitions[0].competitors[0].team;
                    team2 = events[i].competitions[0].competitors[1].team;
                    active_teams.push(team1.id);
                    active_teams.push(team2.id);
                    player_opps[team1.abbreviation] = team2.abbreviation;
                    player_opps[team2.abbreviation] = team1.abbreviation;
                }
                db.collection('athletes', function(err, athlete_collection) {
                    athlete_collection.find({'team.id':{'$in':active_teams}}).toArray(function(err, athletes) {
                        console.log(athletes.length+' athletes found.');
                        var group = [], player, groupPlayerIDs = [];
                        if (athletes.length) {
                            for(var j=0;j<3;j++) {
                                do {
                                    player = athletes[Math.floor(Math.random() * athletes.length)];
                                } while (groupPlayerIDs.indexOf(player.id) >= 0);
                                player.opp = player_opps[player.team.abbreviation];
                                group.push(player);
                                groupPlayerIDs.push(player.id);
                            }
                        }
                        res.send('{"players":'+JSON.stringify(group)+'}');
                    });
                });
            });
        });
*/


/*
exports.getGroup = function(req, res) {
    var json = '';
    var date = req.params.date;
    var startDate = new Date(date+' 00:00:00');
    var endDate = new Date(date+' 23:59:59');
    endDate.setHours(endDate.getHours()+5);
    var active_players = [], player_opps = {};
    var comps = {};
    console.log('Getting new group of leaders...'+startDate+' '+endDate);
    db.collection('athlete_events', function(err, collection) {
        // get collection of athletes playing today
        collection.find({'date':{'$gte':startDate,'$lt':endDate}}).toArray(function(err, items) {
            for(var i=0;i<items.length;i++) {
                active_players.push(items[i].id);
                player_opps[items[i].id] = items[i].opp; // associative array of player id to player opponent
            }
            console.log(active_players.length+' players available')
            if (active_players.length) {
                db.collection('athletes', function(err, collection) {
                    //collection.count(function(err, ct) {
                        var player_ct = active_players.length;
                        var group = [];
                        //collection.find({'id':{'$in':active_players}}).limit( -1 ).skip( Math.floor(Math.random() * player_ct ) ).toArray(function(err, items){
                        collection.find({'id':{'$in':active_players}}).toArray(function(err, items) {
                            for(var j=0;j<3;j++) {
                                console.log(items.length);
                                var player = items[Math.floor(Math.random() * items.length)];
                                player.opp = player_opps[player.id];
                                group.push(player);
                            }
                            res.send('{"players":'+JSON.stringify(group)+'}');
                        });
                    //});
                });
            } else {
                res.send('{"players":[]}');
            }
        });
    });

};
*/
/*
exports.reloadAll = function(req, res) {
    var options = {
      host: 'api.espn.com',
      port: 80,
      path: '/v1/sports/basketball/nba/athletes?enable=stats&apikey=ceevkg9k7t9gs4kyufyf9rqr'
    }, json = '';
    http.get(options, function(resp){
        resp.on('data', function(chunk){
            json+=chunk;
        });
        resp.on("end", function(e) {
            json = JSON.parse(json);
            console.log('Adding athletes: ' + json);
            db.collection('athletes', function(err, collection) {
                collection.insert(json.sports[0].leagues[0].athletes, {safe:true}, function(err, result) {
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
};
*/

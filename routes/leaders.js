var mongo = require('mongodb'),
http = require('http');
 
var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure;
 
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('woo', server);
 
db.open(function(err, db) {
    if(!err) {
        console.log("Connected to 'leaders' database");
        db.collection('leaders', {safe:true}, function(err, collection) {
            if (err) {
                console.log("The 'leaders' collection doesn't exist. Creating it with sample data...");
                //populateDB();
            }
        });
    }
});

exports.findById = function(req, res) {
    var id = req.params.id;
    console.log('Retrieving leader: ' + id);
    db.collection('leaders', function(err, collection) {
        collection.findOne({'id':id+''}, function(err, item) {
            res.send(item);
        });
    });
};

exports.findAll = function(req, res) {
    db.collection('leaders', function(err, collection) {
        collection.find().toArray(function(err, items) {
            res.send(items);
        });
    });
};

exports.reloadAll = function(req, res) {
    var options = {
      host: 'api.espn.com',
      port: 80,
      path: '/v1/sports/basketball/nba/teams?enable=leaders&apikey=ceevkg9k7t9gs4kyufyf9rqr'
    }, json = '';
    http.get(options, function(resp){
        resp.on('data', function(chunk){
            json+=chunk;
        });
        resp.on("end", function(e) {
            json = JSON.parse(json);
            console.log('Adding leaders: ' + json);
            db.collection('leaders', function(err, collection) {
                var teams = json.sports[0].leagues[0].teams;
                for (var i=0; i<teams.length; i++) {
                    for (var stat in teams[i].leaders) {
                        if (stat != "season") {
                            console.log(teams[i].leaders[stat].id);
                            collection.insert(teams[i].leaders[stat], {safe:true}, function(err, result) {
                                if (err) {
                                    res.send({'error':'An error has occurred'});
                                } else {
                                    console.log('Success: ' + JSON.stringify(result[0]));
                                    res.send(result[0]);
                                }
                            });
                        }
                    }
                }
            });
            console.log('done');
            res.send('done');
        });
    }).on("error", function(e){
      console.log("Got error: " + e.message);
    });    
};

exports.getGroup = function(req, res) {
    var json = '';
    console.log('Getting new group of leaders...');
    db.collection('leaders', function(err, collection) {
        collection.count(function(err, ct) {
            collection.find().limit( -1 ).skip( Math.floor(Math.random() * ct ) ).toArray(function(err, items){
                json += JSON.stringify(items);
                collection.find().limit( -1 ).skip( Math.floor(Math.random() * ct ) ).toArray(function(err, items){
                    json += JSON.stringify(items);
                    collection.find().limit( -1 ).skip( Math.floor(Math.random() * ct ) ).toArray(function(err, items){
                        json += JSON.stringify(items);                    
                        res.send('{players:['+json+'])');
                    });
                });
            });
        });
    });
    
};


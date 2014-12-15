var mongo = require('mongodb'),
http = require('http');

var Server = mongo.Server,
    Db = mongo.Db,
    BSON = mongo.BSONPure,
    Client = mongo.MongoClient;
/*
var server = new Server('localhost', 27017, {auto_reconnect: true});
db = new Db('woo', server);

db.open(function(err, db) {
    if(!err) {

    }
});
*/

Client.connect('mongodb://pickarange:pickme@ds049537.mongolab.com:49537/pickarange', function(err, db) {

    exports.getLeaders = function(req, res) {
        console.log('Retrieving leaders: ');
        db.collection('rosters', function(err, collection) {
            collection.aggregate(
                {'$group':{'_id':'$user', 'total':{ '$sum' : '$roster_points'}}},
                {'$sort':{'total':-1}},
                function(err, summary) {
                if (err)
                    res.send(err);
                else
                    res.send(summary);
            });

        });
    };

});

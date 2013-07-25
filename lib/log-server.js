// Retrieve
var when = require('when')
var MongoClient = require('mongodb').MongoClient;


module.exports = function(cfg, callback) {
    var defer = when.defer()
    var promise = defer.promise

    // Connect to the db
    MongoClient.connect("mongodb://10.15.52.87:27017/test", function(err, db) {
        var collection = db.collection('test', function(err, collection) {
            defer.resolve(collection)
        })
    })

    return {
        log: function(order) {
            promise.then(function(collection) {
                collection.insert(order)
            })
        }
    }
}


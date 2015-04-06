//var express = require('express');
//var router = express.Router();
var elasticsearch = require('elasticsearch');
var RSVP = require('rsvp');

// logs elasticsearch stuff, flesh out later once we know what's useful
var ESLogger = function(config) {
	var defaultLogger = function(){};

	this.error = defaultLogger;
	this.warning = defaultLogger;
	this.info = defaultLogger;
	this.debug = defaultLogger;
	this.trace = defaultLogger;
	this.close = defaultLogger;
};


// todo production configuration
var es = new elasticsearch.Client({
	host: 'localhost:9200',
	log: ESLogger
});

module.exports = {};

// health check responds with error if es is down
module.exports.healthcheck = function(cb) {
	es.search({
		index: "if",
		type: "landmarks",
		body: {
			query: {
				match: {
					_all: "food"
				}
			},
			size: 1 // one result is enough to prove it's up
		}
	}).then(function(res) {
		if (res.hits.hits.length > 0) {
			// yay search found something so it's up.
			cb();
		}
	}, function(err) {
		cb(err);
	});
};

// handles text searches.  gee looks easy to convert to an express route some day...
module.exports.search = function(req, res) {
	var q = req.query.textQuery;
	var lat = req.query.userLat;
	var lng = req.query.userLng;
	var t = req.query.localTime;
	
	// update fuzziness of query based on search term length
	var fuzziness = 0;
	if (q.length >= 4) {
		fuzziness = 1;
	} else if (q.length >= 6) {
		fuzziness = 2;
	}

	var fuzzyQuery = {
		index: "if",
		type: "landmarks",
		body: {
			query: {
				filtered: {
					query: {
						multi_match: {
							query: q,
							fuzziness: fuzziness,
							prefix_length: 1,
							type: "best_fields",
							fields: ["name^2", "summary"],
							tie_breaker: 0.2,
							minimum_should_match: "30%"
						}
					},
					filter: {
						geo_distance: {
							distance: "10km",
							"loc.coordinates": {
								lat: lat,
								lon: lng
							}
						}
					}
				}
			}
		}
	};

	var fuzzy = es.search(fuzzyQuery);

	RSVP.hash({
		fuzzy: fuzzy
	}).then(function(results) {
		// Merge and sort the results
		var uniqueBubbles = {} // id is key
		results.fuzzy.hits.hits.map(function(b) {
			b.fuzzyScore = b._score;
			uniqueBubbles[b._id] = b;
		});

//		results.synonym.hits.hits.map(function(b) {
//			if (!uniqueBubbles[b.id]) {
//				uniqueBubbles[b.id] = b.searchResult;
//			}
//			uniqueBubbes[b.id].synonymScore = b.score;
//		});

		// return weighted and sorted array
		// TODO filter on distance
		//
		res.send(Object.keys(uniqueBubbles).map(function(k) {
			return uniqueBubbles[k];
		}).map(function(b) {
			b._source.kip_score = 10*b.fuzzyScore;
			b.kip_score = 10*b.fuzzyScore;
			return b;
		}).sort(function(a, b) {
			return b.kip_score - a.kip_score;
		}).slice(0, 50).map(function(b) {
			return b._source;
		}));
	});
};

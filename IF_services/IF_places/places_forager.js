// https://maps.googleapis.com/maps/api/place/textsearch/json?query=cafe+New+York+food&sensor=false&location=40.67,-73.94&radius=100&key=AIzaSyAj29IMUyzEABSTkMbAGE-0Rh7B39PVNz4
// ChIJ85ZfVFcPK4cRuwSHLukcrAA
var express = require('express'),
    app = module.exports.app = express();
var request = require('request');
var logger = require('morgan');
var async = require('async');
var fs = require('fs');
var http = require('http');
var im = require("imagemagick");
var crypto = require('crypto');
var AWS = require('aws-sdk');
var urlify = require('urlify').create({
    addEToUmlauts: true,
    szToSs: true,
    spaces: "_",
    nonPrintable: "",
    trim: true
});
var q = require('q');

//Default Place style
var forumStyle = require('./forum_theme.json');
var cloudMapName = 'forum';
var cloudMapID = 'interfacefoundry.jh58g2al';

app.use(logger('dev'));

var bodyParser = require('body-parser');

app.use(bodyParser.json({
    extended: true
})); // get information from html forms

var mongoose = require('mongoose'),
    monguurl = require('monguurl');

//----MONGOOOSE----//

//var styleSchema = require('../../../components/IF_schemas/style_schema.js');
// var styles = require('./style_schema.js');
var landmarks = require('../../components/IF_schemas/landmark_schema.js');
var styles = require('../../components/IF_schemas/style_schema.js');

global.config = require('../../config');

mongoose.connect(global.config.mongodb.url);
var db_mongoose = mongoose.connection;
db_mongoose.on('error', console.error.bind(console, 'connection error:'));
//---------------//
///////////
//Require Request Module for making api calls to meetup
var request = require('request');

// var forumStyle = require('./forum_theme.json');

var cloudMapName = 'forum';
var cloudMapID = 'interfacefoundry.jh58g2al';

/*
  CREATED FILE FOR AWS KEYS:

  You need to set up your AWS security credentials before the sample code is able to connect to AWS. 
  You can do this by creating a file named "credentials" at ~/.aws/ and saving the following lines in the file:

  [default]
  aws_access_key_id = <your access key id>
  aws_secret_access_key = <your secret key>

  File contents:

  [default]
  aws_access_key_id = AKIAJZ4N55EN4XBYAG2Q
  aws_secret_access_key = /lx51QZDgPdlSs/wQVJPZ5yL9sm5/4m2Rbng9EoD

*/

var googleAPI = 'AIzaSyCEtavbQS0Qo_lWF70njqYRfLhIMXJbndw';
var awsBucket = "if.forage.google.images";
var zipLow = 1001;
var zipHigh = 99950;

var requestNum = 0;


// var zipLow = 92867;
// var zipHigh = 92868;

var offsetCounter = 0; //offset, increases by multiples of 20 until it reaches 600

//search places in loops
async.whilst(
    function() {
        return true
    },
    function(callback) {

        var count = zipLow;

        async.whilst(
            function() {
                return count != zipHigh;
            },
            function(callback) {
                var zipCodeQuery;
                //so number will format as zip code digit with 0 in front
                if (count < 10000) {
                    zipCodeQuery = '0' + parseInt(count);
                } else {
                    zipCodeQuery = parseInt(count);
                }
                console.log('Searching zipcode: ', zipCodeQuery)
                var coords = getLatLong(zipCodeQuery).then(function(coords) {
                    searchPlaces(coords, function() {
                        count++;
                        setTimeout(callback, 6000); // Wait before going on to the next tag
                    })
                });
            },
            function(err) {
                setTimeout(callback, 10000); // Wait before looping over the hashtags again
            }
        );
    },
    function(err) {
        console.log('Requested ', requestNum, ' times.')
            //iterating over offset to get all the yelps
        if (offsetCounter >= 60) {

            //reset offset
            offsetCounter = 0;

        } else {
            //incrementing until 60
            offsetCounter = offsetCounter + 20;
        }

        setTimeout(callback, 10000); // Wait before looping over the hashtags again

    }
);


//searches google places
function searchPlaces(coords, fin) {

    async.waterfall([
        //****Radar search places for max 200 results and get place_ids
        function(callback) {
            // console.log('!', coords)
            requestPlaces(coords[0], coords[1]).then(function(results) {
                if (results.length > 10) {
                    results.slice(0, 9)
                }
                callback(null, results)
            })
        },
        //****Create landmark and fill in details of place for each place in result set
        function(results, callback) {
            //For each place in result set
            console.log('Second function in waterfall results.length: ', results.length)
            async.each(results, function(place, done) {
                    //Check for anamoly zip codes in Google Places API text search, such as 01006 that give foreign country results
                    // if (place.vicinity.toLowerCase().indexOf('united states') < 1) {
                    //     //If foreign address result found
                    //     console.log('Foreign Address: ', place.vicinity, '. Skipping set')
                    //     fin()
                    // }
                    var newPlace = null;
                    async.series([
                            //First check if landmark exists, if not create a new one
                            function(callback) {
                              console.log('Checking for existing,creating landmark')
                                //Check if place already exists in db, if not create new place
                                landmarks.find({
                                    'source_google.place_id': place.place_id
                                }, function(err, matches) {
                                    if (err) console.log(err)
                                    if (matches.length < 1) {
                                        // console.log('Creating Place!')
                                        newPlace = new landmarks();
                                        newPlace.world = true;
                                        newPlace.source_google.place_id = place.place_id;
                                        newPlace.loc.coordinates[0] = parseFloat(place.geometry.location.lat);
                                        newPlace.loc.coordinates[1] = parseFloat(place.geometry.location.lng);
                                        newPlace.loc.type = 'Point';
                                        saveStyle(newPlace).then(function() { //creating new style to add to landmark
                                            console.log('Created new landmark')
                                            callback(null)
                                        });
                                    } else {
                                        console.log('Matches exist, next place..')
                                        callback(null)
                                    }
                                })
                            },
                            //Now fill in the details of the place
                            function(callback) {
                              console.log('Filling in details of place')
                                if (newPlace == null) {
                                    console.log('Not a new place')
                                    callback(null);
                                } else {
                                 
                                    addGoogleDetails(place.place_id, newPlace).then(function(place) {
                                         console.log('Got Details!',place)
                                        newPlace.name = place.name;
                                        newPlace.source_google.address = place.vicinity;
                                        newPlace.source_google.types = place.types;
                                        //Add city name to landmark id and then uniqueize it
                                        var nameCity = place.name.concat('_' + newPlace.source_google.city)
                                        console.log('nameCity: ', nameCity)
                                        uniqueID(nameCity).then(function(output) {
                                            console.log('LEL IS THIS EVEN OUTPUT LIKE SRS', output)
                                            newPlace.id = output;
                                            callback(null);
                                        })
                                    })
                                }
                            },
                            function(callback) {
                                //Annnd save the place
                                if (!newPlace) {
                                    callback(null)
                                } else {
                                    newPlace.save(function(err, saved) {
                                        if (err) console.log(err)
                                            // console.log('Saved!')
                                        callback(null)
                                    })
                                }
                            }
                        ],
                        //final callback in series
                        function(err, results) {
                            done()
                        }); //END OF ASYNC SERIES
                }, function() {
                    console.log('Finished set, next set..');
                    console.log('Requested ', requestNum, ' times.');
                    fin()
                }) //END OF ASYNC EACH
        }
    ], function(err, results) {
        console.log('SUPER FINISHED SHOULD NOT HIT HIS')
            // result now equals 'done'
    });




}



// var more = false;
// var finalset = []

// async.whilst(
//     function() {
//         return more = true;
//     },
//     function(callback) {
//         requestPlaces().then(function() {
//             callback();
//         }, function(err) {
//             if (err) console.log('asycn whilst error: ', err)
//             callback();
//         })
//     },
//     function(err) {}
// );


function requestPlaces(lat, lng) {
    var deferred = q.defer();

    var location = '40.7410986,-73.9888682'
    var qs = {
        location: location,
        radius: 50000,
        types: 'clothing_store',
        key: googleAPI
    }

    // https://maps.googleapis.com/maps/api/place/radarsearch/json?location=51.503186,-0.126446&radius=5000&types=museum&key=API_KEY
    var url = "https://maps.googleapis.com/maps/api/place/radarsearch/json?"

    request({
        uri: url,
        json: true,
        useQuerystring: true,
        qs: qs
    }, function(error, response, body) {
        requestNum++;
        var resultsValid = ((!error) && (response.statusCode == 200) && (body.results.length >= 1));
        if (resultsValid) {
            //Add results to previous results
            // console.log('request results: ', body)
            deferred.resolve(body.results);
           
        } else {
            if (error) console.log(error)
            console.log("no valid results",response);
            deferred.reject();
        }
    })

     return deferred.promise;
}


function addGoogleDetails(placeID, newPlace) {
  console.log('hitting addGoogleDetails, placeID: ',placeID, 'newPlace: ',newPlace)
    var deferred = q.defer();
    var queryURLToGetDetails = "https://maps.googleapis.com/maps/api/place/details/json?placeid=" + placeID + "&key=" + googleAPI;

    request({
        uri: queryURLToGetDetails,
        json: true
    }, function(error, response, body) {
        requestNum++;
        // console.log("Queried Google details for", name, queryURLToGetDetails);

        if (!error && response.statusCode == 200) {

            if (typeof body.result.address_components == 'undefined') {
                newPlace.source_google.city = ''
            } else {
                // console.log('city: ',body.result.address_components[2].long_name)
                if (body.result.address_components[2].long_name == 'united_states') {
                    newPlace.source_google.city == body.result.address_components[1].long_name
                } else {
                    newPlace.source_google.city = body.result.address_components[2].long_name
                }
            }

            newPlace.source_google.icon = body.result.icon;
            if (typeof body.result.opening_hours == 'undefined') {
                newPlace.source_google.opening_hours = "";
            } else {
                newPlace.source_google.opening_hours = JSON.stringify(body.result.opening_hours.weekday_text);
                newPlace.open_now = body.result.opening_hours.open_now;
            }

            if (typeof body.result.international_phone_number == 'undefined') {
                newPlace.source_google.international_phone_number = "";
            } else {
                newPlace.source_google.international_phone_number = body.result.international_phone_number;
            }
            newPlace.source_google.price_level = body.result.price_level;
            newPlace.source_google.url = body.result.url;
            if (typeof body.result.website == 'undefined') {
                newPlace.source_google.website = "";
            } else {
                newPlace.source_google.website = body.result.website;
            }
            newPlace.source_google.types = body.result.types;
            newPlace.type = body.result.types[0];
            newPlace.source_google.utc_offset = body.result.utc_offset;
            newPlace.source_google.vicinity = body.result.vicinity;
            deferred.resolve(newPlace)
        } else {
            deferred.resolve(null)
        }
    });
    return deferred.promise;
}

function getLatLong(zipcode, callback) {
    var deferred = q.defer();
    var string = 'http://api.tiles.mapbox.com/v4/geocode/mapbox.places-v1/';
    string = string + '+' + zipcode;
    string = string + '.json?access_token=pk.eyJ1IjoiaW50ZXJmYWNlZm91bmRyeSIsImEiOiItT0hjYWhFIn0.2X-suVcqtq06xxGSwygCxw';
    request({
            uri: string
        },
        function(error, response, body) {
            // console.log('getLatLng results: ', body)
            var parseTest = JSON.parse(body);
            if (parseTest.features && parseTest.features.length) {
                if (parseTest.features[0]) {
                    var results = JSON.parse(body).features[0].center;
                    results[0].toString();
                    results[1].toString();
                    console.log('in latlng', results)
                    deferred.resolve(results)
                }
            }
        });
    return deferred.promise
}




function uniqueID(name) {
  console.log('hitting uniqueID')
    var deferred = q.defer();
    var uniqueIDer = urlify(name);
    urlify(uniqueIDer, function() {
        landmarks.findOne({
            'id': uniqueIDer
        }, function(err, data) {
            if (data) {
                var uniqueNumber = 1;
                var newUnique;

                async.forever(function(next) {
                        var uniqueNum_string = uniqueNumber.toString();
                        newUnique = data.id + uniqueNum_string;
                        landmarks.findOne({
                            'id': newUnique
                        }, function(err, data) {
                            if (data) {
                                uniqueNumber++;
                                next();
                            } else {
                                next('unique!'); // This is where the looping is stopped
                            }
                        });
                    },
                    function() {
                        deferred.resolve(newUnique)
                    });
            } else {
                deferred.resolve(uniqueIDer)
            }
        });
    });
    console.log('inside uniqueID', deferred.promise)
    return deferred.promise
}

//loading style from JSON, saving
function saveStyle(place) {
    var deferred = q.defer();
    var st = new styles()
    st.name = forumStyle.name;
    st.bodyBG_color = forumStyle.bodyBG_color;
    st.titleBG_color = forumStyle.titleBG_color;
    st.navBG_color = forumStyle.navBG_color;
    st.landmarkTitle_color = forumStyle.landmarkTitle_color;
    st.categoryTitle_color = forumStyle.categoryTitle_color;
    st.widgets.twitter = forumStyle.twitter;
    st.widgets.instagram = forumStyle.instagram;
    st.widgets.upcoming = forumStyle.upcoming;
    st.widgets.category = forumStyle.category;
    st.widgets.messages = forumStyle.messages;
    st.widgets.streetview = forumStyle.streetview;
    st.widgets.nearby = forumStyle.nearby;
    st.save(function(err, style) {
        if (err) console.log(err);
        place.style.styleID = style._id;
        place.style.maps.cloudMapID = cloudMapID;
        place.style.maps.cloudMapName = cloudMapName;
        deferred.resolve();
    })
    return deferred.promise;
}



//server port 
app.listen(3137, 'localhost', function() {
    console.log("3137 ~ ~");
}).on('error', function(err) {
    console.log('on error handler');
    console.log(err);
});


process.on('uncaughtException', function(err) {
    console.log('process.on handler');
    console.log(err);
});
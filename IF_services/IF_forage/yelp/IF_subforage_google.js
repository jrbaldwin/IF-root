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

app.use(logger('dev'));

var bodyParser = require('body-parser');

app.use(bodyParser.json({
    extended: true
})); // get information from html forms

var mongoose = require('mongoose'),
    monguurl = require('monguurl');

//----MONGOOOSE----//

//var styleSchema = require('../../../components/IF_schemas/style_schema.js');
var styles = require('./style_schema.js');
var landmarks = require('./landmark_schema.js');

mongoose.connect('mongodb://localhost/if');
var db_mongoose = mongoose.connection;
db_mongoose.on('error', console.error.bind(console, 'connection error:'));

//var configDB = require('../../../components/IF_auth/database.js');
var forumStyle = require('./forum_theme.json');

var cloudMapName = 'forum';
var cloudMapID = 'interfacefoundry.jh58g2al';
//---------------//
//JR Yelp Creds
// var yelp = require("yelp").createClient({
//     consumer_key: "dyjR4bZkmcD_CpOTYx2Ekg",
//     consumer_secret: "Coq5UbKKXYWmPy3TZf9hmNODirg",
//     token: "_dDYbpK4qdeV3BWlm6ShoQdKUnz1IwCO",
//     token_secret: "VGCPbsf9bN2SJi7IlM5-uYf4a98"
// });

//April Yelp Creds:
var yelp = require("yelp")
    .createClient({
        consumer_key: "hV6pIDq0pR-urBu-XhlwOQ",
        consumer_secret: "MuIF9fe4Bjcwbmopwc75eGPVpaA",
        token: "wt2O1ykkgdxe6Z0ZJ9ZmwzwWJyYUp-IN",
        token_secret: "UTvnuUiZMtxqfZRCEMzxtLh3C2o"
    });

//April Google Creds:
//var googleAPI = 'AIzaSyAfVLiPr4LMvICmL64m3LDpU6uaW5OV_6c';

//JR Google Creds:
var googleAPI = 'AIzaSyAj29IMUyzEABSTkMbAGE-0Rh7B39PVNz4';

countYelpRecords();

function countYelpRecords(){

    landmarks.model(false)
        .find()
        .exists('source_yelp.id')
        .exec(function(err, docs) {
            if (err) {
                console.log("Error Occured: ", err);
            } else if (docs.length > 0) {
                var sizeOfDb = docs.length;
                console.log(sizeOfDb);
                findLatestYelpRecord(sizeOfDb);
            } else {
                console.log('No Documents');
            }
        });
}

function findLatestYelpRecord(sizeOfDb) {
    console.log("findLatestYelpRecord", sizeOfDb);
    landmarks.model(false)
        .find()
        .exists('source_yelp.id')
        .sort("-_id")
        .limit(1)
        .exec(function(err, docs) {
            if (err) {
                console.log("Error Occured in findLatestYelpRecord: ", err);
            } else if (docs.length > 0) {
                console.log("docsZero.name, date", docs[0].name, docs[0].time.created);
                var docZero = docs[0];
                repeaterThroughYelpRecords(0, docZero, 20);
            } else {
                console.log('No Documents found in findLatestYelpRecord');
            }
        });
}



function repeaterThroughYelpRecords(i, doc, sizeOfDb){

    if (i < sizeOfDb){

        console.log(i, " about to query: ", doc.name, doc.id, doc.time.created);

        (function(){
            landmarks.model(false)
                .find()
                .exists('source_yelp.id')
                .where("_id")
                .lt(doc._id)
                .sort("id")
                .limit(1)
                .exec(function(err, docs) {
                    if (err) {
                        console.log(err);
                    }
                    else if (docs > 1){
                        console.log("docs > 1");
                    }
                    else if (docs < 1){
                        console.log("docs < 1");
                        repeaterThroughYelpRecords(i + 1, docs[0], sizeOfDb);
                    }
                    else {
                        
                        console.log("in exec callback of mongo query ", docs[0].name);
                        getGooglePlaceID(docs[0]);
                        repeaterThroughYelpRecords(i + 1, docs[0], sizeOfDb);
                    }
                });            
         })();
    }
    //need an "else find latest Yelp Record" to loop back to beginning of file here
}



// function loopThroughYelpRecords(doc, sizeOfDb){
//     console.log("about to loop ThroughYelpRecords", doc.name, sizeOfDb);

//     var currentID = doc._id;

//     for (i = 0; i < sizeOfDb; i++){
//         // var j = i; 
//         console.log('weird',currentID);
//         console.log("current id first ", currentID);

//     landmarks.model(false)
//         .find()
//         .exists('source_yelp.id')
//         .where("_id")
//         .lt(currentID)
//         .sort("-id")
//         .limit(1)
//         .exec(function(err, docs) {
//             if (err) {
//                 console.log("Error Occured in loopThroughYelpRecords: ", err);
//             } 
//             else if (docs.length > 0) {
//                 //(function (docs){ //when incrementing the ID, must wrap within a new function to establish new scope
//                 console.log(docs[0].name, docs[0].time.created);
//                 //getGooglePlaceID(docs[0]);


//                 // if (j == sizeOfDb.length ){
//                 //     //countYelpRecords();
//                 // }
                
//                 //})(docs);
//                 console.log("current id", currentID);
//                 console.log("docs[0].id", docs[0]._id);
//                 currentID = docs[0]._id;
//             } 
//             else {
//                 setTimeout(function(){console.log('No Documents found in loopThroughYelpRecords')}, 3000);
//                 //currentID = docs[0]._id;
//                 console.log("currentID no docs", currentID);
//                 // if (j == sizeOfDb.length ){
//                 //     countYelpRecords();

//                 // }
//             }
//         });
//     }
// }



function getGooglePlaceID(doc) {
    console.log("getGooglePlaceID", doc.name);
    // var name = doc.name;
    // var address = doc.source_yelp.locationInfo.address;
    // var zip = doc.source_yelp.locationInfo.postal_code;
    // var queryTermsToGetPlaceID = (name + "+" + address + "+" + zip)
    //     .replace(/,/g, "")
    //     .replace(/\s/g, "+");
    // var queryURLToGetPlaceID = "https://maps.googleapis.com/maps/api/place/textsearch/json?query=" + queryTermsToGetPlaceID + "&key=" + googleAPI;
    // console.log(queryURLToGetPlaceID);


    // request({
    //     uri: queryURLToGetPlaceID,
    //     json: true
    // }, function(error, response, body) {
    //     if (!error && response.statusCode == 200) {

    //         //In case of more than one result, loop through to pick the one with the same zip code. 
    //         //Test case many results, highest one is wrong: https://maps.googleapis.com/maps/api/place/textsearch/json?query=Stephen%27s+Market+&+Grill+2632+E+Main+St+Ventura+CA+93003&key=AIzaSyCVZdZM6rmhP6WwOfhAZqlOSLGcOhXlkjo
    //         //Test case no results: https://maps.googleapis.com/maps/api/place/textsearch/json?query=Ten+Ren+5817+8th+Ave+Borough+Park+2011220&key=AIzaSyCVZdZM6rmhP6WwOfhAZqlOSLGcOhXlkjo

    //         if (body.results.length >= 1) { //loop through them and pick the one that matches the coordinates


    //             for (i = 0; i < body.results.length; i++) {
    //                 console.log("looping through results in text search for placeID");

    //                 if (body.results[i].formatted_address.indexOf(", United States") > 0) { //If it has " United States" in the address

    //                     var googleZip = body.results[i].formatted_address.replace(/, United States/g, "")
    //                         .substr(-5, 5);
    //                     if (googleZip == zip) {

    //                         var placeID = body.results[i].place_id;
    //                         console.log(name, "   _id:  ", doc._id, "  place_id:", placeID); //here it is!

    //                         doc.source_google.placeID = body.results[i].place_id;

    //                         function addGoogleDetails(placeID) {
    //                             console.log("addGoogleDetails", placeID);
    //                             var queryURLToGetDetails = "https://maps.googleapis.com/maps/api/place/details/json?placeid=" + placeID + "&key=" + googleAPI;

    //                             console.log(queryURLToGetDetails);

    //                             request({
    //                                 uri: queryURLToGetDetails,
    //                                 json: true
    //                             }, function(error, response, body) {
    //                                 if (!error && response.statusCode == 200) {

    //                                     doc.source_google.placeID = placeID;
    //                                     doc.source_google.icon = body.result.icon;
    //                                     // doc.source_google.opening_hours = body.result.opening_hours;                                       
    //                                     if (typeof body.result.opening_hours == 'undefined') {
    //                                         doc.source_google.opening_hours = "";
    //                                     } else {
    //                                         doc.source_google.opening_hours = '';
    //                                     }
    //                                     //doc.source_google.weekday_text = body.result.weekday_text;
    //                                     if (typeof body.result.weekday_text == 'undefined') {
    //                                         doc.source_google.weekday_text = "";
    //                                     } else {
    //                                         doc.source_google.weekday_text = body.result.weekday_text;
    //                                     }
    //                                     // doc.source_google.international_phone_number = body.result.international_phone_number;
    //                                     if (typeof body.result.international_phone_number == 'undefined') {
    //                                         doc.source_google.international_phone_number = "";
    //                                     } else {
    //                                         doc.source_google.international_phone_number = body.result.international_phone_number;
    //                                     }
    //                                     doc.source_google.price_level = body.result.price_level;
    //                                     // doc.source_google.reviews = body.result.reviews;
    //                                     if (typeof body.result.reviews == 'undefined') {
    //                                         doc.source_google.reviews = "";
    //                                     } else {
    //                                         doc.source_google.reviews = body.result.reviews;
    //                                     }
    //                                     doc.source_google.url = body.result.url;
    //                                     // doc.source_google.website = body.result.website;
    //                                     if (typeof body.result.website == 'undefined') {
    //                                         doc.source_google.website = "";
    //                                     } else {
    //                                         doc.source_google.website = body.result.website;
    //                                     }
    //                                     doc.source_google.types = body.result.types;
    //                                     doc.source_google.utc_offset = body.result.utc_offset;
    //                                     doc.source_google.vicinity = body.result.vicinity;

    //                                     function updateLandmark() {
    //                                         console.log("UPDATING LANDMARK");
    //                                         doc.save(function(err, docs) {

    //                                             if (err) {

    //                                                 console.log("Erorr Occurred");
    //                                                 console.log(err)
    //                                             } else if (!err) {
    //                                                 console.log("documents saved");
    //                                             } else {

    //                                                 console.log('jajja');

    //                                             }
    //                                         });
    //                                     }

    //                                     updateLandmark();
    //                                     console.log("already updated landmark");

    //                                 }
    //                             });
    //                         }

    //                         addGoogleDetails(body.results[i].place_id, googleAPI);
    //                         console.log("Already added Google Details");

    //                     }
    //                 } 
    //                 else {
    //                     setTimeout(function(){console.log('no results w same zip code')}, 10000);
    //                 }
    //             }
    //         } 
    //         else {
    //             console.log("no matching results")
    //         }
    //     } 
    //     else {
    //         console.log("no results");
    //     }
    // });
}
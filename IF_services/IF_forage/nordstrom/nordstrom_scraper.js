var http = require('http');
var cheerio = require('cheerio');
var db = require('db');
var Promise = require('bluebird');
var async = require('async');
var uniquer = require('../../uniquer');
var urlify = require('urlify').create({
    addEToUmlauts: true,
    szToSs: true,
    spaces: "_",
    nonPrintable: "_",
    trim: true
});
var request = require('request');
var states = require('../zara/states')
var stateIndex = 0;
var currentState = states[stateIndex]
var url = 'http://shop.nordstrom.com/s/canada-goose-kensington-down-parka-with-genuine-coyote-fur-trim/3591024';

//For every url above iterate through all zipcodes on top level and each waterfall will be for one zipcode


//Basically for each item iterate through every zipcode and save all the returned stores, and clone the item for each store.
//Steps:
//For each item style Id
//1. Iterate through all zipcodes given a radius
//2. Create store (with unique store ID and identifier) if it does not exist
//3. Create new item for each store 
//4.
//5.



async.whilst(
    function() {
        return true
    },
    function(loop) {
        var query = {
            'state': currentState
        }
        db.Zipcodes.find(query).then(function(zips) {
            var count = 0;
            console.log('Current state: ' + currentState)
            async.whilst(
                function() {
                    return count <= zips.length
                },
                function(cb) {
                    async.eachSeries(zips, function(zip, finishedZipcode) {
                            zipcode = zip.zipcode

                            async.waterfall([
                                function(callback) {
                                    scrapeItem(url).then(function(item) {
                                        callback(null, item, zipcode)
                                    }).catch(function(err) {
                                        callback(err)
                                    })
                                },
                                function(item, zipcode, callback) {
                                    getInventory(item, zipcode).then(function(inventory) {
                                        callback(null, item, inventory)
                                    }).catch(function(err) {
                                        callback(err)
                                    })
                                },
                                function(item, inventory, callback) {
                                    saveStores(item, inventory).then(function(stores) {
                                        callback(null, item, stores)
                                    }).catch(function(err) {
                                        callback(err)
                                    })
                                },
                                function(item, stores, callback) {
                                    saveItems(item, stores).then(function(items) {
                                        callback(null, item, stores)
                                    }).catch(function(err) {
                                        callback(err)
                                    })
                                },
                                function(item, stores, callback) {
                                    getLatLong(zipcode).then(function(coords) {
                                        callback(null, item, stores, coords)
                                    }).catch(function(err) {
                                        callback(err)
                                    })
                                },
                                function(item, stores, coords, callback) {
                                    updateInventory(item, stores, coords).then(function() {
                                        callback(null, item)
                                    }).catch(function(err) {
                                        callback(err)
                                    })
                                }
                            ], function(err, item) {
                                if (err) {
                                    // console.log('!!',err)
                                }
                                console.log('Finished scraping: ', item.name)
                                count++
                                finishedZipcode()
                            });

                        },
                        function(err) {
                            if (err) {
                                console.log(err);
                                cb()
                            } else {
                                // console.log('Done with state.')
                                cb('Done with state.')
                            }
                        });
                },
                function(err) {
                    if (err) {
                        console.log(err);
                    }
                    //Log results each loop
                    console.log('Finished ' + currentState + '.')
                    stateIndex++;
                    if (states[stateIndex]) {
                        currentState = states[stateIndex]
                    } else {
                        console.log('Restarting...')
                        stateIndex = 0;
                        currentState = states[stateIndex]
                    }
                    wait(loop, 3000)
                }
            );
        })
    },
    function(err) {
        wait(loop, 3000)
    });


function scrapeItem(url) {
    return new Promise(function(resolve, reject) {
        //construct newItem object
        var newItem = {
            src: url,
            images: []
        };

        var options = {
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
            }
        };
        request(options, function(error, response, body) {
            if ((!error) && (response.statusCode == 200)) {

                $ = cheerio.load(body); //load HTML

                //iterate on images found in HTML
                $('img').each(function(i, elem) {
                    if (elem.attribs) {
                        if (elem.attribs.src) { //sort the two types of images to collect
                            if (elem.attribs.src.indexOf("/product/Mini") > -1) { //finding all images that have Mini (all images to scrape)         
                                var s = elem.attribs.src.replace("Mini", "Large"); //get the bigger one
                                newItem.images.push(s);
                            }
                        }
                    }
                });

                //////////Construct item name from Brand Name + Product Name /////////////
                var brandName = '';
                //get brand name
                $("section[id='brand-title']").map(function(i, section) {
                    for (var i = 0; i < section.children.length; i++) {
                        if (section.children[i].name == 'h2') {
                            brandName = section.children[i].children[0].children[0].data;
                        }
                    }
                });
                //get product name
                $("section[id='product-title']").map(function(i, section) {
                    for (var i = 0; i < section.children.length; i++) {
                        if (section.children[i].name == 'h1') {
                            newItem.name = brandName + ' ' + section.children[i].children[0].data; //add brand name + product name together            
                        }
                    }
                });
                //////////////////////////////////////////////////////////////////////////

                //get item price
                $('td').each(function(i, elem) {
                    if (elem.attribs.class.indexOf('item-price') > -1) {
                        newItem.price = elem.children[1].children[0].data.replace(/[^\d.-]/g, ''); //remove dollar sign symbol
                    }
                });

                //get the styleId to query nordstrom server with from the product URL. lastindexof gets item from end of URL. 
                //split('?') kills anything after productID in URL
                newItem.styleId = newItem.src.substring(newItem.src.lastIndexOf("/") + 1).split('?')[0];

                if (newItem.styleId) {
                    resolve(newItem);
                } else {
                    console.log('missing params', newItem);
                    reject('missing params');
                }
            } else {
                if (error) {
                    console.log('error: ', error)
                } else if (response.statusCode !== 200) {
                    console.log('response.statusCode: ', response.statusCode);
                }
            }
        })
    })
}

function getInventory(newItem, zipcode) {
    return new Promise(function(resolve, reject) {
        var radius = '100'; //max is 100 miles
        console.log('zipcode: ', zipcode)
        var url = 'http://shop.nordstrom.com/es/GetStoreAvailability?styleid=' + newItem.styleId + '&type=Style&instoreavailability=true&radius=' + radius + '&postalcode=' + zipcode + '&format=json';
        var options = {
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
            }
        };

        request(options, function(error, response, body) {
            if ((!error) && (response.statusCode == 200)) {
                body = JSON.parse(body);
                body = JSON.parse(body); //o.m.g. request, just do the double parse and don't ask 
                resolve(body)
            } else {
                if (error) {
                    console.log('getinventory error ')
                    reject(error)
                } else {
                    console.log('bad response')
                    reject('Bad response from inventory request')
                }
            }
        })
    })
}

function saveStores(item, inventory) {
    return new Promise(function(resolve, reject) {
        var Stores = [];
        async.eachSeries(inventory["PersonalizedLocationInfo"].Stores, function iterator(item, callback) {
            var url = 'http://test.api.nordstrom.com/v1/storeservice/storenumber/' + item.StoreNumber + '?format=json&apikey=pyaz9x8yd64yb2cfbwc5qd6n';
            var options = {
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
                }
            };

            request(options, function(error, response, body) {
                body = JSON.parse(body);
                var storeObj = {
                    storeId: item.StoreNumber,
                    name: body.StoreCollection[0].StoreName,
                    type: body.StoreCollection[0].StoreType,
                    StreetAddress: body.StoreCollection[0].StreetAddress,
                    City: body.StoreCollection[0].City,
                    State: body.StoreCollection[0].State,
                    PostalCode: body.StoreCollection[0].PostalCode,
                    PhoneNumber: body.StoreCollection[0].PhoneNumber,
                    Hours: body.StoreCollection[0].Hours,
                    Lat: body.StoreCollection[0].Latitude,
                    Lng: body.StoreCollection[0].Longitude
                }

                //Construct our own unique storeId 
                uniquer.uniqueId(body.StoreCollection[0].StoreName, 'Landmark').then(function(output) {
                        //Check if store exists in db
                        db.Landmarks.findOne({
                                'source_generic_store.storeId': storeObj.storeId
                            }, function(err, store) {
                                if (err) {
                                    console.log(err)
                                    setTimeout(function() {
                                        return callback()
                                    }, 800);
                                }
                                //If store does not exist in db yet, create it.
                                if (!store) {
                                    var newStore = new db.Landmarks();
                                    newStore.source_generic_store = storeObj;
                                    newStore.id = output;
                                    newStore.world = true;
                                    newStore.name = storeObj.name;
                                    newStore.hasloc = true;
                                    newStore.loc.type = 'Point';
                                    newStore.loc.coordinates[0] = storeObj.Lng;
                                    newStore.loc.coordinates[1] = storeObj.Lat;
                                    delete newStore.source_generic_store.Lng;
                                    delete newStore.source_generic_store.Lat
                                    newStore.save(function(e, s) {
                                        if (e) {
                                            console.log('Error saving new store: ', e)
                                        }
                                        console.log('Saved store.', s.id)
                                            //Push into proxy array for cloning items at the end of eachseries
                                        Stores.push(s)
                                        setTimeout(function() {
                                            return callback()
                                        }, 800);
                                    })
                                }
                                //If store already exists in db
                                else if (store) {
                                    console.log('Store exists.', store.id)
                                    Stores.push(store)
                                    setTimeout(function() {
                                        return callback()
                                    }, 800);
                                }
                            }) //end of findOne
                    }) //end of uniquer
            }); //end of request

        }, function(err, res) {
            if (err) console.log(err)

            resolve(Stores)
        })
    })
}

function saveItems(newItem, Stores) {
    return new Promise(function(resolve, reject) {
        var savedItems = []

        //For each store create an item in db if it does not already exist
        async.eachSeries(Stores, function iterator(store, callback) {
            //Check if there is an item with parent field that is equal to store id in db
            db.Landmarks.findOne({
                $and: [{
                    'source_generic_item.styleId': newItem.styleId
                }, {
                    'parent.mongoId': store._id
                }]
            }, function(err, i) {
                if (err) console.log(err)

                //Create new item in db if it does not already exist
                if (!i) {
                    var item = new db.Landmarks();
                    item.source_generic_item = newItem;
                    //This field is required in item in order to remove out of stock items in the update inventory func
                    item.source_generic_item.storeId = store.source_generic_store.storeId;
                    item.parent.mongoId = store._id;
                    item.parent.name = store.name;
                    item.parent.id = store.id;
                    item.name = newItem.name;
                    item.world = false;
                    item.loc.type = 'Point';
                    item.loc.coordinates[0] = store.loc.coordinates[0];
                    item.loc.coordinates[1] = store.loc.coordinates[1];
                    uniquer.uniqueId('nordstrom ' + newItem.name, 'Landmark').then(function(output) {
                        item.id = output;
                        //Save item
                        item.save(function(e, i) {
                            if (e) {
                                console.error(e);
                            }
                            savedItems.push(i)
                                // console.log('Saved item', i)
                            return callback();
                        })
                    })
                }

                //If item exists in db 
                else if (i) {
                    // console.log('Item already exists.', i._id)
                    callback()
                }
            })
        }, function(err) {
            if (err) console.log(err)

            console.log('Saved ', savedItems.length)

            resolve(savedItems)
        });
    })
}


function getLatLong(zipcode) {
    return new Promise(function(resolve, reject) {
        db.Zipcodes.findOne({
            zipcode: zipcode
        }, function(err, result) {
            if (err) console.log(err)
            if (result && result.loc.coordinates) {
                resolve(result.loc.coordinates)
            } else {
                console.log('Querying mapbox.')
                var string = 'http://api.tiles.mapbox.com/v4/geocode/mapbox.places-v1/';
                string = string + '+' + zipcode;
                string = string + '.json?access_token=pk.eyJ1IjoiaW50ZXJmYWNlZm91bmRyeSIsImEiOiItT0hjYWhFIn0.2X-suVcqtq06xxGSwygCxw';
                request({
                        uri: string
                    },
                    function(error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var parseTest = JSON.parse(body);
                            if (parseTest.features[0] && parseTest.features[0].center.length > 1) {
                                if (parseTest.features.length >= 1) {
                                    var results = JSON.parse(body).features[0].center;
                                    results[0].toString();
                                    results[1].toString();
                                    var newCoords = new db.Zipcode();
                                    newCoords.loc.coordinates = results;
                                    newCoords.zipcode = zipcode;
                                    newCoords.save(function(err, saved) {
                                        if (err) console.log(err)
                                        console.log('Zipcode saved.')
                                    })
                                    resolve(results)
                                }
                            } else {
                                console.log('Error: ', zipcode)
                                reject()
                            }
                        } else {
                            console.log('Error: ', error)
                            reject(error)
                        }
                    });
            }
        })
    })
}




function updateInventory(item, stores, coords) {
    return new Promise(function(resolve, reject) {
        var storeIds = stores.map(function(store) {
                return store.source_generic_store.storeId
            })
            //Remove items from mongo that no longer appear in inventory list for this item style
        db.Landmarks.remove({
            $and: [{
                'source_generic_item.styleId': item.styleId
            }, {
                'loc': {
                    //Since the inventory check for nordstrom only returns results 100 miles within zipcode
                    //We get a central lat long for the current zipcode and run a geowithin 120 miles (extra 20 miles to compensate for errors)
                    //Otherwise mongo would remove all items outside the current zip that match the query.
                    $geoWithin: {
                        $centerSphere: [
                            [parseFloat(coords[0]), parseFloat(coords[1])], 120 / 3963.2
                        ]
                    }
                }
            }, {
                'source_generic_item.storeId': {
                    $nin: storeIds
                }
            }]
        }, function(err, res) {
            if (err) reject(err)
            console.log('Removed: ', res.result.n)
            resolve(item)
        })
    })
}
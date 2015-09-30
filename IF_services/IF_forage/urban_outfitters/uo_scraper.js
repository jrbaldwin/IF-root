var http = require('http');
var cheerio = require('cheerio');
var db = require('db');
var Promise = require('bluebird');
var async = require('async');
var uniquer = require('../../uniquer');
var request = require('request');
var urlapi = require('url');
var _ = require('lodash');
var fs = require('fs');
var tagParser = require('../tagParser')
    //Global var to hold category
cat = '';
//Global var to hold fake user object
owner = {};

// http://www.urbanoutfitters.com/urban/catalog/availability_include_store_json.jsp?country=US&distance=50&selectedColor=054&skuId=32175697&zipCode=10002
// skuId ---> need to iterate through all sku based on size (or what is the main URL sku??)


module.exports = function(url, category) {

    return new Promise(function(resolve, reject) {
        cat = category;
        async.waterfall([
            function(callback) {
                loadFakeUser().then(function() {
                    callback(null)
                }).catch(function(err) {
                    callback(err)
                })
            },
            function(callback) {
                scrapeItem(url).then(function(item) {
                    // console.log(2)
                    callback(null, item)
                }).catch(function(err) {
                    callback(err)
                })
            },
            function(item, callback) {
                cloneItems(item).then(function(items) {
                    // console.log(3)
                    // console.log('Items: ', items[0].physicalStores[0])
                    callback(null, items)
                }).catch(function(err) {
                    callback(err)
                })
            },
            function(items, callback) {
                saveItems(items).then(function(items) {
                    // console.log(4)
                    callback(null, items)
                }).catch(function(err) {
                    callback(err)
                })
            }
        ], function(err, items) {
            if (err) {
                var today = new Date().toString()
                fs.appendFile('errors.log', '\n' + today + ' Category: ' + cat + '\n' + err, function(err) {
                    console.log('Error 62: ',err)
                    return reject(err)
                });
            }
            console.log('finished scraping item!!', items.length)
            resolve()

        });

    })
}


function loadFakeUser() {
    return new Promise(function(resolve, reject) {
        db.Users
            .findOne({
                'profileID': 'urban411'
            }).exec(function(e, o) {
                if (o) {
                    owner.profileID = o.profileID
                    owner.name = o.name;
                    owner.mongoId = o._id
                    resolve()
                }
                if (!o) {
                    var fake = new db.User()
                    fake.name = 'Urban Outfitters'
                    fake.profileID = 'urban411'
                    fake.save(function(err, o) {
                        if (err) {
                            console.log('93: ', err)
                        } else {
                            // console.log(o.profileID)
                            owner.profileID = o.profileID
                            owner.name = o.name;
                            owner.mongoId = o._id
                            resolve()
                        }
                    })
                }
                if (e) {
                    console.log('Could not load user: ',e)
                    reject(e)
                }
            })
    })
}

//Utility function, will be used in the multi-nested DOM elements below
function hasProp(obj, key) {
    return key.split(".").every(function(x) {
        if (typeof obj != "object" || obj === null || !x in obj)
            return false;
        obj = obj[x];
        return true;
    });
}

// if (has(user, 'loc.lat'))

function scrapeItem(url) {
    return new Promise(function(resolve, reject) {
        var newItems = []; //multiple colors for item == multiple items
        var latestColor;
        var options = {
            url: 'http://www.urbanoutfitters.com/api/v1/product/' + getParameterByName('id', url) + '',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
            }
        };
        request(options, function(error, response, body) {
            if ((!error) && (response.statusCode == 200)) {
                $ = cheerio.load(body); //load HTML
                body = JSON.parse(body);

                // console.log('!!!', $('div.product-description')._root['0'].children[1].children[0].data)

                for (var i = 0; i < body.product.skusInfo.length; i++) { //get all the skuIDs
                    newItems[i] = { //make new item object in array of items
                            name: body.product.skusInfo[i].description + ' ' + body.product.skusInfo[i].color,
                            src: url,
                            skuId: body.product.skusInfo[i].skuId, //used to query for inventory  (this is a UNIQUE id for each color/size of each item)
                            productId: body.product.skusInfo[i].productIds[0], //the parent id for the item (use this just for getting image URLs below)
                            price: body['product']['skusInfo'][0]['priceLists'][0]['salePrice'], //might not be super accurate if there are price changes on some items based on garment size
                            color: body.product.skusInfo[i].color,
                            colorId: body.product.skusInfo[i].colorId,
                            size: body.product.skusInfo[i].size,
                            sizeId: body.product.skusInfo[i].sizeId,
                            physicalStores: [],
                            tags: []
                        }
                        // 
                        //Set descriptions
                    if ( $('div.product-description')._root && $('div.product-description')._root['0'].children && $('div.product-description')._root['0'].children[1].children && $('div.product-description')._root['0'].children[1].children[0] && $('div.product-description')._root['0'].children[1].children[0].data) {
                        var materialStr = ''
                       try {
                            materialStr = $('div.product-description')._root['0'].children[1].children[0].next.next.next.children[0].parent.next.next.data;
                        }
                        catch(error) {

                        }
                        newItems[i].tags = tagParser.parse(($('div.product-description')._root['0'].children[1].children[0].data + materialStr ).split(' '))
                        // console.log('DESC TAGS: ', newItems[i].tags)
                    }

                    if (body.product.skusInfo.length == i + 1) {
                        getImages();
                    }
                }

                function getImages() {

                    for (var i = 0; i < body['product']['colors'].length; i++) { //looping through colors (each color is another item to add to DB)

                        var collectedImages = []; //viewcodes are used to display correct image in series (collect all viewcodes to know pics available for each color of each item)

                        for (var z = 0; z < body['product']['colors'][i]['viewCode'].length; z++) { //looping through the viewcodes to get all images for each color

                            //collecting images for each item color based on viewcodes (photo angles)
                            collectedImages.push('http://images.urbanoutfitters.com/is/image/UrbanOutfitters/' + body['product']['colors'][i].id + '_' + body['product']['colors'][i]['viewCode'][z] + '?$mlarge$&defaultImage=');

                            if (body['product']['colors'][i]['viewCode'].length == z + 1) { //end of for loop for this item viewcode count
                                var imgsToObjs = _.filter(newItems, function(obj) {
                                    return obj.colorId == body['product']['colors'][i].colorCode
                                }); //find the items in our newItems array to add our images to (based on color)
                                for (var x = 0; x < imgsToObjs.length; x++) { //iterate through _.filter results to find all items that match current color code
                                    imgsToObjs[x].images = collectedImages; //push collectedImages to each item that matches color
                                }
                            }
                        }

                        //END OF LOOP, MOVE ON NOW to getting inventory
                        if (body['product']['colors'].length == i + 1) {
                            if (newItems[0].productId) { //if there's at least one item in array that has a productId
                                resolve(newItems); //go to inventory query
                            } else {
                                console.log('missing params', newItem);
                                reject('missing params')
                            }
                        }
                    }
                }

            } else {
                if (error) {
                    console.log('error: ', error)
                } else if (response.statusCode !== 200) {
                    console.log('response.statusCode: ', response.statusCode)
                }
            }
        })
    })
}


function cloneItems(newItems) {
    return new Promise(function(resolve, reject) {

        var postalcode = '66006'; //iterate through all zipcodes? chose this one because we can probably querying whole USA with this lat lng in center of map
        var radius = '6000'; //max is 6000 miles i think? so like...the whole USA? looks like it works :)
        //var physicalStores = [];
        //var colorIdsTemp = [];

        async.eachSeries(newItems, function iterator(item, callback) {

            var url = 'http://www.urbanoutfitters.com/urban/catalog/availability_include_store_json.jsp?country=US&distance=' + radius + '&selectedColor=' + item.colorId + '&skuId=' + item.skuId + '&zipCode=' + postalcode + '';
            var options = {
                url: url,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.13) Gecko/20080311 Firefox/2.0.0.13'
                }
            };

            // console.log('URL', url)

            request(options, function(error, response, body) {
                if ((!error) && (response.statusCode == 200)) {
                    body = JSON.parse(body);
                    item.physicalStores = body.stores; //put store results in each item object
                    // console.log('INV QUERY BODY: ', body)
                } else {
                    if (error) {
                        console.log('getinventory error ')
                        reject(error)
                    } else {
                        console.log('bad response')
                        reject('Bad response from inventory request')
                    }
                }
            });

            setTimeout(function() {
                callback()
            }, 800); //slowly collecting stores that carry item cause there's a rate limiter on the API

        }, function(err, res) {

            var finalItems = [];
            var currentColorId = '';
            var iterateCheck = 0;

            var colorItemObjs = _.groupBy(newItems, 'colorId'); //group items by colorId

            for (var key in colorItemObjs) {

                for (var z = 0; z < colorItemObjs[key].length; z++) {

                    //ADD TO CURRENT ITEM BY COLOR
                    if (colorItemObjs[key][z].colorId == currentColorId) {

                        finalItems[iterateCheck].sizeIds.push({ //store the sizes for each product / color
                            skuId: colorItemObjs[key][z].skuId,
                            size: colorItemObjs[key][z].size,
                            sizeId: colorItemObjs[key][z].sizeId
                        });

                        if (colorItemObjs[key][z].physicalStores) { //add stores for additional item sizes if there are results
                            for (var x = 0; x < colorItemObjs[key][z].physicalStores.length; x++) {
                                finalItems[iterateCheck].physicalStores.push(colorItemObjs[key][z].physicalStores[x]);
                            }
                        }
                    }
                    //CREATE NEW ITEM BY COLOR
                    else {
                        currentColorId = colorItemObjs[key][z].colorId; //update currentColorId with latest color in array
                        var newItem = { //create final items (there's a better way to do this with underscore =_=)
                            productId: colorItemObjs[key][z].productId,
                            name: colorItemObjs[key][z].name,
                            price: colorItemObjs[key][z].price,
                            color: colorItemObjs[key][z].color,
                            colorId: colorItemObjs[key][z].colorId,
                            src: colorItemObjs[key][z].src,
                            sizeIds: [],
                            images: colorItemObjs[key][z].images,
                            physicalStores: [],
                            tags: colorItemObjs[key][z].tags
                        };
                        newItem.sizeIds.push({ //store the sizes for each product / color
                            skuId: colorItemObjs[key][z].skuId,
                            size: colorItemObjs[key][z].size,
                            sizeId: colorItemObjs[key][z].sizeId
                        });

                        if (colorItemObjs[key][z].physicalStores) { //add stores if there are results
                            for (var x = 0; x < colorItemObjs[key][z].physicalStores.length; x++) {
                                newItem.physicalStores.push(colorItemObjs[key][z].physicalStores[x]);
                            }
                        }
                        //create new item
                        finalItems.push(newItem); //add final item by color (will contain all sizes and skuIDs per size)
                    }
                }
                iterateCheck++;
                //ON FINAL Z LOOP END
                if (Object.keys(colorItemObjs).length == iterateCheck) { //fake async
                    finalOutput(finalItems);
                }
            }

            function finalOutput(finalItems) {
                finalItems.forEach(function(item) {
                        item.physicalStores.forEach(function(store) {
                                store.storeId = store.link.split('?id=')[1]
                            })
                            //Remove duplicates
                        item.physicalStores = _.uniq(item.physicalStores, 'storeId');
                        item.physicalStores = _.uniq(item.physicalStores, 'storeName');
                    })
                    // console.log('store: ', finalItems[0].physicalStores[0])
                resolve(finalItems)
            }
        });
    });
}

function saveItems(items) {
    // console.log('!!!!!',items[0].tags)
    return new Promise(function(resolve, reject) {
        var savedItems = []
        async.eachSeries(items, function(item, callback1) {
                var storeIds = []
                var storeLocs = []
                console.log('Pulling up stores from db...')
                async.eachSeries(item.physicalStores, function(store, callback2) {
                            db.Landmarks.findOne({
                                'source_generic_store.storeId': store.storeId,
                                'linkbackname': 'urbanoutfitters.com'
                            }, function(err, s) {
                                if (err) {
                                    console.log('359: ',err)
                                    return callback2()
                                }
                                if (!s) {
                                    console.log('.')
                                        //The parent store doesn't exist in db, skip this item for now.
                                        // console.log('Store in list doesnt exist in the db: ', store.physicalStoreId)
                                    console.log('missing store, try running store_scraper again... ', store.storeId)
                                    return callback2()
                                }
                                //Check if the store with storeId exists in db
                                else if (s) {
                                    console.log('.')
                                    storeIds.push(s._id);
                                    storeLocs.push(s.loc.coordinates)
                                    return callback2()
                                }
                            })
                        },
                        //End of getting store Ids
                        function(err) {
                            if (err) console.log('380', err)

                            if (storeLocs.length < 1) {
                                console.log('Inventory query yielded no "physicalStores" for this item:', item.name)
                                return callback1()
                            }

                            //Check if this item exists
                            db.Landmarks.findOne({
                                'source_generic_item.skuId': item.skuId,
                                'source_generic_item.productId': item.productId,
                                'linkbackname': 'urbanoutfitters.com'
                            }, function(err, match) {
                                if (err) {
                                    console.log('394: ',err)
                                    return callback1()
                                }

                                // console.log('!!! match: ', match)

                                if (!match || (match && match.source_generic_item && !match.source_generic_item.tags)) {
                                    //Create new item for each store in inventory list.
                                    var i = new db.Landmark();
                                    i.parents = storeIds
                                    i.loc.coordinates = storeLocs
                                    i.world = false;
                                    i.source_generic_item = item;
                                    delete i.source_generic_item.physicalStores;
                                    i.price = parseFloat(item.price);
                                    i.itemImageURL = item.images;
                                    i.name = item.name;
                                    i.owner = owner;
                                    i.linkback = item.src;
                                    i.linkbackname = 'urbanoutfitters.com';
                                    var tags = i.name.split(' ').map(function(word) {
                                        return word.toString().toLowerCase()
                                    })
                                    tags = tags.concat(item.tags)
                                    tags.forEach(function(tag) {
                                        i.itemTags.text.push(tag)
                                    })
                                    i.itemTags.text.push('Urban Outfitters')
                                    i.itemTags.text.push(item.color)
                                    i.itemTags.text = tagParser.parse(i.itemTags.text)
                                    if (tagParser.colorize(item.color)) {
                                        i.itemTags.colors.push(tagParser.colorize(item.color))
                                    }
                                    i.itemTags.text.push(cat)
                                    i.hasloc = true;
                                    i.loc.type = 'MultiPoint';
                                    uniquer.uniqueId(i.name + i.source_generic_item.skuId, 'Landmark').then(function(output) {
                                            i.id = output;
                                            //If item was previously scraped without the description tags, delete it
                                            if ((match && !match.source_generic_item.tags)) {
                                                db.Landmarks.remove({
                                                    'id': match.id
                                                }, function(err, res) {
                                                    if (err) console.log('437', err)
                                                        //Save item
                                                    i.save(function(e, item) {
                                                        if (e) {
                                                                console.log('441: ',e);
                                                        }
                                                        savedItems.push(item)
                                                        console.log('Saved: ', item.itemTags.text)
                                                        return callback1();
                                                    })
                                                })
                                            } else {
                                                //Save item
                                                i.save(function(e, item) {
                                                    if (e) {
                                                        console.log('452: ',e);
                                                    }
                                                    savedItems.push(item)
                                                    console.log('Saved: ', item.itemTags.text)
                                                    return callback1();
                                                })
                                            }
                                        }) //end of uniquer

                                } else if (match) {
                                    // console.log('Item exists, updating inventory...');

                                    db.Landmarks.findOne({
                                        '_id': match._id,
                                        'linkbackname': 'urbanoutfitters.com'
                                    }).update({
                                        $set: {
                                            'parents': storeIds,
                                            'loc.coordinates': storeLocs
                                        }
                                    }, function(e, result) {
                                        if (e) {
                                            console.log('Inventory update error: ', e)
                                        }
                                        console.log('Updated inventory for item.'.result)
                                        callback1()
                                    })

                                }
                            })


                        }) //end of inner series

            }, function(err) {
                if (err) {
                    console.log('Error in saveItems: ',err)
                    return reject(err)
                }
                resolve(savedItems)
            }) //end of outer series

    })
}



function checkIfScraped(url) {
    // first check if we have already scraped this thing
    return new Promise(function(resolve, reject) {
        db.Landmarks
            .findOne({
                'source_zara_item.src': url.trim()
            })
            .exec(function(e, l) {
                if (l) {;
                    reject('Item already exists!')
                }
                if (!l) {
                    return resolve(url)
                }
                if (e) {
                    //if some mongo error happened here just go ahead with the process
                    resolve(url)
                }
            })
    })
}




function saveStores(items) {
    return new Promise(function(resolve, reject) {
        var storeIds = []
        var count = 0
        async.each(items, function(item, callback) {
            var store = item.physicalStores[count]

            db.Landmarks
                .findOne({
                    'source_generic_store.storeId': store.storeId,
                    'linkbackname': 'urbanoutfitters.com'
                })
                .exec(function(e, s) {
                    if (e) {
                        //error
                        console.log('Error in saveStores(): ', e)
                        item.physicalStores[count].mongoId = 'null'
                        count++;
                        callback()
                    }
                    if (!s) {
                        var n = new db.Landmark();
                        n.source_zara_store = store;
                        n.world = true;
                        n.hasloc = true;
                        console.log('LNG: ', parseFloat(store.lng), 'LAT: ', parseFloat(store.lat))
                        n.loc.coordinates[0] = parseFloat(store.lng);
                        n.loc.coordinates[1] = parseFloat(store.lat);
                        uniquer.uniqueId('urban outfitters ' + store.storeAddress, 'Landmark').then(function(output) {
                            n.id = output;
                            n.save(function(e, newStore) {
                                if (e) {
                                    // console.error(e);
                                    return callback()
                                }
                                item.physicalStores[count].mongoId = newStore._id
                                count++;
                                callback()
                            })
                        })
                    } else if (s) {
                        item.physicalStores[count].mongoId = s._id
                        count++;
                        callback()
                    }
                })
        }, function(err) {
            if (err) {
                // console.log('Error in saveStores()',err)
                return reject(err)
            }
            item.physicalStores = item.physicalStores.filter(function(val, i) {
                    return val !== 'null'
                })
                // console.log('-_- Updated item: ', item)
            resolve(item)
        })
    })
}

function getParameterByName(name, url) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(url);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
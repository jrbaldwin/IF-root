var http = require("http");
var cheerio = require("cheerio");
var response_text = "";
var fs = require('fs')
var zipCheck = [];
var q = require('q');
var async = require('async');
var hash = require('./hash.js')

var fin = false;
var currentStateIndex = 0;
var col = 1

async.whilst(
    function() {
        return !fin
    },
    function(cb) {
        var options = {
            host: "zipatlas.com",
            path: ''
        };
        console.log('Starting...', currentStateIndex)
            //Navigate from home page to to zipcode population density page
        async.waterfall([
                function(callback) {
                    gotoStatePage(options, currentStateIndex, col)
                        .then(function(path) {
                            var deferred = q.defer()
                            options.path = path;
                            var stateName = options.path.split('/us/')[1].split('.')[0].trim()
                            var state = capitalizeFirstLetter(stateName)
                            for (var key in hash) {
                                if (hash.hasOwnProperty(key)) {
                                    if (hash[key] === state) {
                                        var shortName = key
                                        break 
                                    }
                                }
                            }
                            currentStateIndex++;
                            if (col == 1 && currentStateIndex == 52) {
                                console.log('Next column!')
                                col = 2
                                currentStateIndex = 0
                            } else if (col == 2 && currentStateIndex == 50) {
                                console.log('Finished!!')
                                fin = true;
                            }
                            options.path = '/us/'+shortName.toLowerCase()+'/zip-code-comparison/population-density.htm'
                            callback(null, options)
                        })
                },
                function(options, shortName, callback) {
                    console.log('Collecting data...', options)
                    var done = false;
                    var pageIndex = '';
                    var pageCount = 1;
                    //Recursively call collectData() until it reaches the final page results
                    async.whilst(
                            function() {
                                return !done
                            },
                            function(callback) {
                                collectData(options).then(function() {
                                    console.log('collectData() called', options.path)
                                    pageCount++;
                                    pageIndex = '.' + pageCount.toString();
                                    options.path = '/us/'+shortName.toLowerCase()+'/zip-code-comparison/population-density' + pageIndex + '.htm'
                                    callback(null);
                                }).catch(function(err) {
                                    console.log('hitting catch', err)
                                    done = true;
                                    callback(err)
                                })
                            },
                            function(err) {
                                console.log('Finished! Setting options back to homepage..')
                                options = {
                                    host: "zipatlas.com",
                                    path: ''
                                };
                                done = true;
                                cb();
                            }) //END OF ASYNC.WHILST
                }
            ],
            function(err, result) {
                console.log(err)
                console.log('Finished!')
            }); //END OF ASYNC.WATERFALL
    },
    function(err) {
        console.log(err)
        console.log('Finished!')
    })


function gotoZipPage(options) {
    var deferred = q.defer();
    var request = http.request(options, function(resp) {
        resp.setEncoding("utf8");
        resp.on("data", function(chunk) {
            response_text += chunk;
        });
        resp.on("end", function() {
            if (resp.statusCode != 200) {
                console.log('status Code: ', resp.statusCode)
                deferred.reject()
            } else {
                $ = cheerio.load(response_text);
                // console.log(response_text) 
                var link = $("a:contains('Density')")['1'].attribs.href
                    // console.log('this should be correct: ', link)
                deferred.resolve(link)
            }
        })
    })
    request.end();
    return deferred.promise
}


function gotoDensityPage(options) {
    console.log('inside density!!: ', options.path)
    var deferred = q.defer();
    var link = '/us/' + shortName + '/city-comparison/population-density.html'
    deferred.resolve(link)
    return deferred.promise
}

function gotoStatePage(options, index, col) {
    var deferred = q.defer();
    var request = http.request(options, function(resp) {
        resp.setEncoding("utf8");
        resp.on("data", function(chunk) {
            response_text += chunk;
        });
        resp.on("end", function() {
            if (resp.statusCode != 200) {
                console.log('status Code: ', resp.statusCode)
                deferred.reject()
            } else {
                $ = cheerio.load(response_text);
                var firstCol = $(":contains('Alabama')")['14'].children
                var secondCol = $(":contains('Nebraska')")['14'].children
                if (col == 1) {
                    if (firstCol[index].name == 'a') {
                        console.log('Got new link: ', firstCol[index].attribs.href)
                        currentStateIndex++
                        deferred.resolve(firstCol[index].attribs.href);
                    }
                } else if (col == 2) {
                    if (secondCol[index].name == 'a') {
                        console.log('Got new link: ', secondCol[index].attribs.href)
                        deferred.resolve(secondCol[index].attribs.href);
                        currentStateIndex++
                    }
                }
            }
        })
    })
    request.end();
    return deferred.promise
}

function collectData(options) {
    var deferred = q.defer();
    var request = http.request(options, function(resp) {
        resp.setEncoding("utf8");
        resp.on("data", function(chunk) {
            response_text += chunk;
        });
        resp.on("end", function() {
            if (resp.statusCode != 200) {
                console.log('status Code: ', resp.statusCode)
                deferred.reject(resp.statusCode)
            } else {
                $ = cheerio.load(response_text);

                var firstIndex = ($("span.link").text().length) - 8
                var lastIndex = ($("span.link").text().length)
                var next = $("span.link").text().substr($("span.link").text().length - 7, $("span.link").text().length)
                console.log('NEXT: ', next)
                if (next !== 'Next >>') {
                    console.log('Last Page!')
                    return deferred.reject()
                }

                // console.log(firstIndex, lastIndex)
                // if (!next) {
                //     return deferred.reject()
                // }

                var text = $(":contains('Zip Code')").parent().parent().find("tr").each(function(tr_index, tr) {

                    var th_text = $(this).find(".report_header").text();
                    var prop_name = th_text.trim().toLowerCase().replace(/[^a-z]/g, "");
                    var zipcode = $(this).find("td .report_data").eq(1).text();
                    var density = $(this).find("td .report_data").eq(5).text();
                    if (zipcode !== '') {
                        if (zipCheck.join('').indexOf(zipcode.toString()) == -1) {
                            zipCheck.push(zipcode);
                            var json = {
                                zipcode: zipcode,
                                density: density
                            }
                            var string = JSON.stringify(json)
                            fs.appendFile('density.json', string + ',\n', function(err) {
                                if (err) throw err;
                                // console.log(string)
                            });
                        }
                    }
                });
                deferred.resolve();
            }
        });
    });
    request.end();
    return deferred.promise;
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
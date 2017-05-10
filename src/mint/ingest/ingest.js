var parse = require('csv-parse/lib/sync');
var fs = require('co-fs');
var series = require('co-series');

var db
const dbReady = require('../db')
dbReady.then((models) => { db = models; })

// first argument is source (string), then array of fields
module.exports = function * (source, fields) {
  yield dbReady;
  console.log('db', Object.keys(db));
  var data = yield fs.readFile(`./csv/${source}.CSV`);;
  var records = parse(data);
  console.log('parsed records')
  // console.log('db.ypo_inventory_items', db.YpoInventoryItems)
  var test = yield db.YpoInventoryItems.create({});
  console.log('TEST', test);
  // return;
  // records = records.slice(10, 110);
  yield records.map(series(function * (record) {
    var options = {};

    // console.log('options', options)
    var invItem = yield db[`${source}InventoryItems`].create({});
    for (var i = 0; i < fields.length; i++) {
      invItem[fields[i]] = record[i];
      // console.log('invItem', invItem)
      // console.log('fields[i]', fields[i], record[i])
    }
    yield invItem.save();
    console.log('INVITEM', invItem);
  }));
  console.log('done')
}

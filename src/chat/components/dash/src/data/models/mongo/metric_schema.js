var mongoose = require('mongoose')
import {getSchema} from '@risingstack/graffiti-mongoose';

// stores any sort of metrics
var metricsSchema = mongoose.Schema({
  // required
  metric: {
    type: String,
    index: true
  },
  data: {},

  // optional
  userId: String, // optional

  // automagic
  timestamp: {
    type: Date,
    default: Date.now
  }
})

export default getSchema([mongoose.model('Metrics', metricsSchema)]);


// create the model for users and expose it to our app
// module.exports = mongoose.model('Metrics', metricsSchema)

module.exports.log = function (metric, data) {
  var obj = {
    metric: metric,
    data: data
  };

  (new module.exports(obj)).save()
}

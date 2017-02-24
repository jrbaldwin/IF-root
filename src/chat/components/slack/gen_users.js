require('../../../kip')
var fs = require('fs')
var _ = require('lodash')


db.Slackbots.find({
  'meta.delted': {$ne: true}
}).exec(function (e, bots) {
  if (e) {
    console.error(e)
    process.exit(1)
  }

  //
  // saves a json array of admin id's which we will ping onthe given day
  //
  function gen_day(day) {
    // get the nth admin of every bot
    const admins = bots
      .map(b => _.get(b, 'meta.office_assistancts.' + (day - 1)))
      .filter(Boolean)

    // write the list of nth admins to a json file for use later
    fs.writeFileSync(`users_day_${day}.json`, JSON.stringify(admins))
  }

  //
  // generate four days worth of messages
  //
  gen_day(1)
  gen_day(2)
  gen_day(3)
  gen_day(4)
  process.exit(0)
})

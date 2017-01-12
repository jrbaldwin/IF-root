var queue = require('../queue-mongo');
var request = require('request-promise');
var co = require('co');
// if someone doesn't interact with first message
// delete message and then send a new one with a remind later buttons
module.exports = function(agenda) {
  agenda.define('initial reminder', function(job, done) {
    kip.debug('Initial Reminder running');
    let message = JSON.parse(job.attrs.data.msg),
      token = job.attrs.data.token,
      channel = job.attrs.data.channel;
    co(function * () {
      var prevMessage = yield db.Messages.find({
        thread_id: channel
      }).sort('-ts').limit(1).exec();
      let ts = prevMessage[0].source.ts;

      kip.debug(`👰👰  token: ${token}, ts: ${ts}, channel: ${channel}`);

      request({
        uri: `https://slack.com/api/chat.delete?token=${token}&ts=${ts}&channel=${channel}&as_user=true`,
        method: 'POST',
        json: true
      })
      .then(res => kip.debug(`deleted msg, \n ${JSON.stringify(res, null, 2)}`))
      .catch(err => kip.debug(`couldn't delete msg, \n${JSON.stringify(err, null, 2)}`));
      let newMessage = new db.Message(message);
      newMessage.save((err, res) => {
        if (!err) {
          queue.publish('outgoing.' + newMessage.origin, newMessage, newMessage._id + '.reply.update'); // send new message
        } else {
          kip.debug(`couldn't save reminder message ${JSON.stringify(err, null, 2)}\n${JSON.stringify(res, null, 2)}`);
        }
        done();
      });
    });
  });
};
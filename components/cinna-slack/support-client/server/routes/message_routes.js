// var Message = require('../../../../IF_schemas/message_schema');
var bodyparser = require('body-parser');
var async = require('async');
var Message = require('../models/Message');


module.exports = function(router) {
  router.use(bodyparser.json({limit: '100mb'}));

  //query db for messages
  router.get('/messages', function(req, res) {
    Message.find({
      resolved: false
    }, function(err, data) {
      if (err) {
        console.log(err);
        return res.status(500).json({
          msg: 'internal server error'
        });
      }

      if (data && data.length === 0) {
        console.log('No data found.')
        return
      }

      async.eachSeries(data, function(message, callback1) {
        // console.log('Backend: message routes: flags : ',message.flags)
        if (message.amazon && message.amazon.length > 0) {
              var tempArr = message.amazon; //lmao amazon 
              message.amazon = [];
          async.eachSeries(tempArr, function(item, callback2) {
            var parsed;
            try {
                parsed = JSON.parse(item)
            } catch(err) {
                console.log('Parsing error: ',err);
              return res.status(500).json({
                msg: 'internal server error'
              });
            }
            message.amazon.push(parsed);
            // console.log('Line 41: Parsed item:  ',message.amazon.length)
            callback2();
          }, function done(err) {
            if (err) {
              console.log(err);
              return res.status(500).json({
                msg: 'internal server error'
              });
            }
            // console.log('Line 50: Finished Parsing... ', message.amazon.length)
            callback1();
          })
        } else {
            callback1();
        }
      }, function done(err) {
        if (err) {
          console.log(err);
          return res.status(500).json({
            msg: 'internal server error'
          });
        }
        // console.log('Line 61: Getting heah')
        res.json(data);
      })
    });
  });

  //post a new message to db
  router.post('/newmessage', function(req, res) {
    console.log('message_routes saving msg', req.body)
    Message.findOne({
      'source.channel': req.body.source.channel,
      'source.id': req.body.source.id,
      'msg': req.body.msg
    }, function(err, data) {
      if (err) {
        console.log(err);
        return res.status(500).json({
          msg: 'internal server error'
        });
      }
      if (!data) {
        // console.log('message_routes: req.body: ',req.body)
        if (req.body.amazon && req.body.amazon.length > 0) {
          var stringifiedItems = []
          async.eachSeries(req.body.amazon, function(item, callback) {
            stringifiedItems.push(JSON.stringify(item));
            callback();
          }, function done(err) {
            if (err) {
              console.log(err);
              return res.status(500).json({
                msg: 'internal server error'
              });
            }
            req.body.amazon = stringifiedItems
            var newMessage = new Message(req.body);
            newMessage.save(function(err, saved) {
              if (err) {
                console.log(err);
                return res.status(500).json({
                  msg: 'internal server error'
                });
              }
              res.json(saved);
            })
          })
        } else {
          var newMessage = new Message(req.body);
          newMessage.save(function(err, saved) {
            if (err) {
              console.log(err);
              return res.status(500).json({
                msg: 'internal server error'
              });
            }
            res.json(saved);
          })
        }
      }
      if (data) {
        // console.log('Message doubled up!')
        res.json(data)
      }
    })
  })

  //resolve existing message in db
  router.post('/resolve', function(req, res) {

    Message.find({
      'source.id': req.body.source.id,
      'source.channel': req.body.source.channel
    }, function(err, data) {
      if (err) {
        console.log(err);
        return res.status(500).json({
          msg: 'internal server error'
        });
      }
      if (data && data.length < 1) {
        console.log('Message not found.')
        return res.status(500).json({
          msg: 'internal server error'
        });
      }
      if (data) {

        async.eachSeries(data, function iteratior(msg, callback){ 
              msg.resolved = true
              if (req.body.amazon && req.body.amazon.length > 0) {
                var stringifiedItems = []
                async.eachSeries(req.body.amazon, function(item, callback) {
                  stringifiedItems.push(JSON.stringify(item));
                  callback();
                }, function done(err) {
                  if (err) {
                    console.log(err);
                    return res.status(500).json({
                      msg: 'internal server error'
                    });
                  }
                  msg.amazon = stringifiedItems
                  msg.save(function(err, result) {
                    if (err) {
                      console.log(err);
                      return res.status(500).json({
                        msg: 'internal server error'
                      });
                    }
                    console.log('Message resolved.')
                    callback()
                  })
                })
              } else {
                msg.save(function(err, result) {
                  if (err) {
                    console.log(err);
                    return res.status(500).json({
                      msg: 'internal server error'
                    });
                  }
                  console.log('Message resolved.')
                  callback()
                })
              }
        }, function done(){
          res.json({});
        })


      }
    });
  });

   //fetch processed message
  router.post('/fetchprocessed', function(req, res) {
    console.log('messageroutes 199: req', req.body)
    Message.find({
      'source.id': req.body.id,
    }).sort({'_id':-1}).exec(function(err, data) {
      if (err) {
        console.log(err);
        return res.status(500).json({
          msg: 'internal server error'
        });
      }
      if (data && data.length < 1) {
        console.log('Message not found.')
        return res.status(500).json({
          msg: 'internal server error'
        });
      }
      if (data.length > 0) {
        console.log('Data found!',data[0].client_res)
        res.json(data[0])
      }
    })
  })


}
var ioClient = require('socket.io-client').connect("http://localhost:3000");
ioClient.on('connect', function() {
  console.log('Connected to support client.')
})

//flag to determine is emitting 'new message' event or both 'new message' and 'new channel'
function emit(data, newmessage) {
  if (!ioClient.connected) {
    ioClient.on('connect', function() {
      if (newmessage) {
      //    if (data.bucket === 'results') {
      //       console.log('supervisor.js --> 12',data)
            emitMsg(data)
         // } else {
         //    emitBoth(data) 
         // }
      } else {
        emitMsg(data)
      }
    })
  } else {
        if (newmessage) {
         emitBoth(data) 
      } else {
        emitMsg(data)
      }
  }
}
//Used for banter or returning result set to supervisor
function emitMsg(data) {
 console.log('emitting message')
 ioClient.emit('new message', data)
}

//This function is used for new messages/channels
function emitBoth(data) {
  console.log('emitting new channel')
  var rand = Math.random().toString(36).slice(2)
  ioClient.emit('new channel', {
    name: data.source.channel,
    id: data.source.channel,
    resolved: false
  })
  var action = data.action ? data.action : ''
  var flags = data.flags ? data.flags : {};
  //Resolved = false only if this is a supervisor flagged message
  var resolved = (data.bucket === 'supervisor') ? false : true
  ioClient.emit('new message', {
    id: null,
    incoming: true,
    msg: data.msg,
    tokens: [data.msg.split(' ')],
    bucket: 'supervisor',
    action: action,
    amazon: [],
    // dataModify: {
    //     type: '',
    //     val: [],
    //     param: ''
    // },
    source: {
      origin: 'socket.io',
      channel: data.source.channel,
      org: 'kip',
      id: data.source.channel
    },
    client_res: {
      msg: ''
    },
    ts: Date.now,
    resolved: resolved,
    parent: rand,
    flags: flags
  })
}

module.exports.emit = emit
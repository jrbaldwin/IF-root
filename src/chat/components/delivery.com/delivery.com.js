var queue = require('../queue-mongo');
var kip = require('kip');
var co = require('co');
var db = require('db');
var _ = require('lodash');
var api = require('./api-wrapper');

var search = require('./search');
var winston = require('winston');

var fs = require('fs');
var yaml = require('js-yaml');
var dsxsvc = require('./dsx_services');
var dsxutils = require('./dsx_utils')
var ui = require('../ui_controls');
var argv = require('minimist')(process.argv.slice(2));

var initFilename = argv['config'];
if(initFilename === null || initFilename === undefined){
    console.log('--config parameter not found. Please invoke this script using --config=<config_filename>.');
    process.exit(-1);
}

var yamlDoc;
try {
    yamlDoc = yaml.safeLoad(fs.readFileSync(initFilename, 'utf8'));
}
catch(err){
    console.log(err);
    process.exit(-1);
}

const loggingTransports = yamlDoc['globals']['log_transports'];
var logger = new(winston.Logger)({
    transports: loggingTransports.map(
  function(currentVal){
      return new (eval(currentVal['type']))(currentVal);
  }
    )
});


var loadedParams = dsxutils.ServiceObjectLoader(yamlDoc).loadServiceObjectParams('DSXClient');

logger.info(loadedParams);
logger.info(typeof(loadedParams))
console.log("### looking at loadedParams again");
console.log(loadedParams)


var dsxClient = new dsxsvc.DSXClient(loadedParams);

console.log(dsxClient.getURI());


class UserChannel {

    constructor(queue) {
        this.queue = queue;
        this.send = function(session, nextHandlerID, data) {
            var newSession = new db.Message({
              incoming: false,
              thread_id: session.thread_id,
              resolved: true,
              user_id: 'kip',
              origin: session.origin,
              source: session.source,
              mode: session.mode,
              action: session.action,
              state: session.state,
              user: session.source.user
            })
            newSession['reply'] = data;
            newSession.mode = nextHandlerID.split('.')[0];
            newSession.action = nextHandlerID.split('.')[1];
            kip.debug('inside channel.send(). Session mode is ' + newSession.mode);
            kip.debug('inside channel.send(). Session action is ' + newSession.action);
            var self = this;
            newSession.save(function(err, saved){
              if (err) {
                kip.debug('mongo save err: ',err);
                throw Error(err);
              }
              self.queue.publish('outgoing.' + newSession.origin, newSession, newSession._id + '.reply.results');
            });
        }
        return this;
    }
}

var replyChannel = new UserChannel(queue);


function default_reply(message) {
  return new db.Message({
    incoming: false,
    thread_id: message.thread_id,
    resolved: true,
    user_id: 'kip',
    origin: message.origin,
    text: "I'm sorry I couldn't quite understand that",
    source: message.source,
    mode: message.mode,
    action: message.action,
    state: message.state
  })
}

function text_reply(message, text) {
  var msg = default_reply(message);
  msg.text = text;
  return msg
}

function send_text_reply(message, text) {
  var msg = text_reply(message, text);
  msg.save();
  console.log('<<<'.yellow, text.yellow);
  queue.publish('outgoing.' + message.origin, msg, message._id + '.reply.' + (+(Math.random() * 100).toString().slice(3)).toString(36))
}

//
// Listen for incoming messages from all platforms because I'm 🌽 ALL 🌽 EARS
//
queue.topic('incoming').subscribe(incoming => {
  co(function*() {
    console.log('>>>'.yellow, incoming.data.text.yellow);

    // find the last 20 messages in this conversation, including this one
    var history = yield db.Messages.find({
      thread_id: incoming.data.thread_id,
      ts: {
        $lte: incoming.data.ts
      }
    }).sort('-ts').limit(20);

    var session = history[0];
    if (!session.state && history[1]) {
      session.state = history[1].state;
    }
    session.state = session.state || {};
    session.history = history.slice(1);
    if (session._id.toString() !== incoming.data._id.toString()) {
      throw new Error('correct message not retrieved from db');
    }
    if (history[1]) {
       session.mode = history[1].mode;
       session.action = history[1].action;
       session.route = session.mode + '.' + session.action;
       session.prevMode = history[1].mode;
       session.prevAction = history[1].action;
       session.prevRoute = session.prevMode + '.' + session.prevAction;
    }
    var route = yield getRoute(session);
    kip.debug('route', route);
    // session.mode = 'food';
    // session.action = route.replace(/^food./, '');
    if (handlers[route]) {
      yield handlers[route](session);
    } else {
      kip.error('No route handler for ' + route)
      incoming.ack();
    }
    session.save();
    incoming.ack();
  }).catch(kip.err);
});
 
//
// this is the worst part of building bots: intent recognition
//
function getRoute(session) {
  kip.debug(`prevRoute ${session.prevRoute}`)
  return co(function*() {
     if (session.text === 'food') {
        kip.debug('### User typed in :' + session.text);
        return 'food.begin'
      } 
      // else if (handlers[session.text]) {
      //   return session.text
      // }
    else{
        return (session.mode + '.' + session.action);
    }
    // if (message.text === 'food') return 'food.begin';
    // if (message.prevRoute === 'food.begin') return 'food.address';
    // if ('123'.match(message.text)) {
    //   if (!message.state.merchant_id)
    //     return 'food.restaurant.select';
    //   else
    //     return 'food.menu.select';
    // }
    // if (message.prevRoute === 'food.restaurant.list') {
    //   return 'food.restaurant.search';
    // }
    // if (message.state.merchant_id && message.text === 'full menu') {
    //   return 'food.menu.list';
    // }
    // if (message.state.merchant_id && message.prevRoute !== 'food.menu.search') {
    //   return 'food.menu.search';
    // }

    throw new Error("couldn't figure out the right mode/action to route to")
  }).catch(kip.err);
}

var handlers = {};


handlers['food.sys_error'] = function* (session){
  kip.debug('chat session halted.');
}

//
// the user's intent is to initiate a food order
//
handlers['food.begin'] = function* (session) {
  kip.debug('🍕 food order 🌮');
  session.state = {};
  var team = yield db.Slackbots.findOne({team_id: session.source.team}).exec()
  var address_buttons = _.get(team, 'meta.locations', []).map(a => {
    return {
      name: 'passthrough',
      text: a.address_1,
      type: 'button',
      value: JSON.stringify(a),

    }
  })
  address_buttons.push({
    name: "passthrough",
    text: "New +",
    type: 'button',
    value: "address.new"
  })
  var msg_json = {
    "attachments": [
  		{
  			"title": "",
  			"image_url":"http://kipthis.com/kip_modes/mode_cafe.png"
  		},
      {
          "text": "Great! Which address is this for?",
          "fallback": "You are unable to choose an address",
          "callback_id": "address",
          "color": "#3AA3E3",
          "attachment_type": "default",
          "actions": address_buttons
      }
    ]
  }
  replyChannel.send(session, 'food.choose_address', {type: session.origin, data: msg_json});
}

//
// User decides what address they are ordering for. could be that they need to make a new address
//
handlers['food.choose_address'] = function* (session) {
  if (session.text === 'address.validate' || session.text === 'validate' ) {
    kip.debug('delivery.com.js line 260, hitting address.validate catcher: ', session)
    yield handlers['address.validate'](session)
    return 
  } 
  else if (session.text === 'address.confirm' || session.text === 'confirm' ) {
    kip.debug('delivery.com.js line 265, hitting address.confirm catcher: ', session)
    yield handlers['address.confirm'](session)
    return 
  } 
  else if (session.text === 'address.new' || session.text === 'new' ) {
    kip.debug('delivery.com.js line 270, hitting address.new catcher: ', session)
    yield handlers['address.new'](session)
    return 
  } 
 


  try {
    var location = JSON.parse(session.text);
  } catch (e) {
    var location = {address_1: session.text};
    kip.debug('Could not understand the address the user wanted to use, session.text: ', session.text)
    // TODO handle the case where they type a new address without clicking the "new" button
  }

  var team = yield db.Slackbots.findOne({team_id: session.source.team}).exec()
  team.meta.chosen_location = location
  kip.debug('saving location', location)
  yield team.save()
  yield dsxClient.createDeliveryContext(location.address_1, 'none', session.source.team, session.source.user)

  //
  // START OF S2
  //
  var text = `Cool! You selected \`${location.address_1}\`. Delivery or Pickup?`
  var msg_json = {
        "attachments": [ 
            {
                "mrkdwn_in": [
                   "text"
                ],
                "text": text,
                "fallback": "You did not choose a fulfillment method :/",
                "callback_id": "wopr_game",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "delivery",
                        "text": "Delivery",
                        "type": "button",
                        "value": "food.delivery_or_pickup"
                    },
                    {
                        "name": "pickup",
                        "text": "Pickup",
                        "type": "button",
                        "value": "food.delivery_or_pickup"
                    },
                    {
                        "name": "passthrough",
                        "text": "< Change Address",
                        "type": "button",
                        "value": "address.change"
                    }
                ]
            }
        ]
    };
  replyChannel.send(session, 'food.delivery_or_pickup', msg_json);
}


handlers['address.new'] = function* (session) {
  kip.debug(' 🌆🏙 enter a new address');
  // session.state = {};
  var msg_json = {
    "text": "What's the delivery address?",
    "attachments": [
      {
        "text": "Type your address below"      }
    ]
  }
  replyChannel.send(session, 'address.confirm', {type: session.origin, data: msg_json});
  // yield handlers['address.confirm'](session)
  // session.mode = 'address';
  // session.action = 'confirm';
  // session.text = 'confirm';
  // yield session.save();
}

handlers['address.confirm'] = function* (session) {
  kip.debug('🌆🏙 validate an address', session);
 try {
    var location = JSON.parse(session.text);
  } catch (e) {
    var location = {address_1: session.text};
    kip.debug('Could not understand the address the user wanted to use, session.text: ', session.text)
    // TODO handle the case where they type a new address without clicking the "new" button
  }
  session.state = {};
  var team = yield db.Slackbots.findOne({team_id: session.source.team}).exec();
  var prompt = "Is " + location.address_1 + ' your address?'
  var msg_json = {
    "text": prompt,
    "attachments": [
      {
        "mrkdwn_in": [
                 "text"
        ],
        "fallback": "You are unable to confirm.",
        "callback_id": "address_confirm",
        "color": "#3AA3E3",
        "attachment_type": "default",
        "actions": [
           {
              name: "address_confirm_btn",
              text: "Confirm",
              type: 'button',
              value: JSON.stringify(location)
            },
           {
              name: "passthrough",
              text: "Edit",
              type: 'button',
              value: "address.new"
           }
        ]
      },
    ]
  };
      //storing location in source since there is no other way to persist it thru handler exchanges,
    //feel free to implement a better way. would not make sense to save it in slackbots before it is even validate nah meen
  session.source.location = location;
  yield session.save();
  replyChannel.send(session, 'address.validate', {type: session.origin, data: msg_json});
}

handlers['address.validate'] = function* (session) {
    var location = session.source.location;
    kip.debug('\n\n🌃🌉getting to address.validate', location, '\n\n');
    var team = yield db.Slackbots.findOne({team_id: session.source.team}).exec()
    //validateAddress with either return false or return a json with the proper filled fields, we can change this later however u want to implement it
    if (validateAddress(location)) {
      team.meta.locations.push(validateAddress(location))
      team.meta.chosen_location = location;
    } 
    else {
      team.meta.chosen_location = location;
      team.meta.locations.push(validateAddress({
        label: "NYC Office",
        coordinates: [-123.34, 34.32432423],
        address_1: location.address_1,
        address_2: 'Apt. 6',
        phone_number: "212-867-5309",
        region: "US",
        timezone: "ET",
        special_instructions: "Please send a raven to herald your arrival"
      }))
    }

    kip.debug('I AM THE ILL INTENT: ', team.meta)
    yield team.save();
    kip.debug('###  saved new address in mongo...');
    var text = `Cool! You selected \`${location.address_1}\`. Delivery or Pickup?`
    var msg_json = {
        "attachments": [ 
            {
                "mrkdwn_in": [
                   "text"
                ],
                "text": text,
                "fallback": "You did not choose a fulfillment method :/",
                "callback_id": "wopr_game",
                "color": "#3AA3E3",
                "attachment_type": "default",
                "actions": [
                    {
                        "name": "passthrough",
                        "text": "Delivery",
                        "type": "button",
                        "value": "food.delivery_or_pickup"
                    },
                    {
                        "name": "passthrough",
                        "text": "Pickup",
                        "type": "button",
                        "value": "food.delivery_or_pickup"
                    },
                    {
                        "name": "passthrough",
                        "text": "< Change Address",
                        "type": "button",
                        "value": "address.change"
                    }
                ]
            }
        ]
    };
    replyChannel.send(session, 'food.ready_to_poll', msg_json);
}



handlers['food.delivery_or_pickup'] = function* (session) {
  kip.debug('\n\n🍏 🍎 🍐 getting to food.delivery_or_pickup\n\n');
  var fulfillmentMethod = session.text;
  kip.debug('set fulfillmentMethod', fulfillmentMethod)
  yield db.Slackbots.update({team_id: session.source.team}, {'meta.fulfillment_method': fulfillmentMethod}).exec()
  //var updatedDeliveryContext = yield dsxClient.setFulfillmentMethodForContext(fulfillmentMethod, session.source.team, session.source.user)

  //
  // START OF S2B
  //
  var mock_s2b = {
    "attachments": [
        {
      "title": "",
      "image_url":"http://i.imgur.com/BVHZTaS.png"
        },
          {
      "mrkdwn_in": [
               "text"
      ],
            "text": "You ordered `Delivery` from `Lantern Thai Kitchen` last time, order again? ",
            "fallback": "You are unable to choose a game",
            "callback_id": "wopr_game",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "actions": [
                {
                    "name": "chess",
                    "text": "Confirm",
                    "type": "button",
                    "value": "chess"
                }
            ]
        },
    {
      "mrkdwn_in": [
               "text"
      ],
            "text": "",
            "fallback": "You are unable to choose a game",
            "callback_id": "wopr_game",
            "color": "#3AA3E3",
            "attachment_type": "default",
            "actions": [
                {
                    "name": "chess",
                    "text": "Poll",
                    "type": "button",
                    "value": "chess"
                },
                {
                    "name": "maze",
                    "text": "Suggestions",
                    "type": "button",
                    "value": "maze"
                },
        {
                    "name": "maze",
                    "text": "< Change Address",
                    "type": "button",
                    "value": "maze"
                }
            ]
        }
    ]
}
  replyChannel.send(session, 'food.ready_to_poll', {type: session.origin, data: mock_s2b});
}


//
// the user's intent is to specify an address for delivery/pickup
//
handlers['food.address'] = function* (message) {
  var addr = message.text;
  // check if it's a good address
  // TODO

  message.state.addr = addr;
  message.save();

  // search for food near that address
  send_text_reply(message, 'thanks, searching your area for good stuff!');

  var results = yield search.search({
    addr: addr
  });
  var results_message = default_reply(message);
  results_message.action = 'restaurant.list';
  results_message.text = 'Here are some restaurants you might like nearby';
  results_message.data = {
    results: results.results,
    params: {addr: results.address}
  };
  results_message.save();
  queue.publish('outgoing.' + message.origin, results_message, message._id + '.reply.results');
}

//
// the user's intent is to search for a specific type of food or a specific restaurant
//
handlers['food.restaurant.search'] = function*(message) {
  var results = yield search.search({
    addr: message.state.addr,
    q: message.text
  })
  var results_message = default_reply(message);
  results_message.action = 'restaurant.list';
  results_message.text = `Here are some restaurants matching ${message.text} that you might like nearby`;
  results_message.data = {
    results: results.results,
    params: {addr: results.address}
  };
  results_message.save();
  queue.publish('outgoing.' + message.origin, results_message, message._id + '.reply.results');
}

//
// the user's intent is to choose a restaurant to order from
//
handlers['food.restaurant.select'] = function*(message) {
  return yield handlers['food.restaurant.info'](message);
}

//
// the user's intent is to obtian more information about a restaurant
//
handlers['food.restaurant.info'] = function*(message) {
  var results_message = message.history.filter(m => {
    return _.get(m, 'data.results.0');
  })[0];

  var selection = parseInt(message.text) - 1;
  var merchant = results_message.data.results[selection];
  message.state.merchant_id = merchant.id;
  var info_message = default_reply(message);
  info_message.action = 'restaurant.info';
  info_message.text = `Okay, here's the menu for ${merchant.summary.name}`
  var menu = yield api.getMenu(merchant.id);
  info_message.data = {
    merchant: merchant,
    menu: menu
  };
  info_message.save();
  queue.publish('outgoing.' + message.origin, info_message, message._id + '.reply.menu');
}

//
// the user wants to see the full menu
//
handlers['food.menu.list'] = function*(message) {
  var info_message = default_reply(message);
  info_message.action = 'menu.list';
  info_message.data = message.history.filter(m => {
    return m.action === 'restaurant.info' && _.get(m, 'data.merchant') && _.get(m, 'data.menu');
  })[0].data;
  info_message.text = `Okay, here's the full menu for ${info_message.data.merchant.summary.name}`
  info_message.save();
  queue.publish('outgoing.' + message.origin, info_message, message._id + '.reply.menu');

}

//
// the user is looking at a menu and is searching for an item to add
//
handlers['food.menu.search'] = function*(message) {
  var results_message = default_reply(message);
  results_message.action = 'menu.search.results';
  var results = yield search.menuSearch({
    q: message.text,
    menu: message.history.filter(m => {
      return m.action === 'restaurant.info' && _.get(m, 'data.merchant') && _.get(m, 'data.menu');
    })[0].data.menu
  });
  results_message.data = {
    results: results
  };
  results_message.text = `Okay, here are the items matching "${message.text}"`;
  results_message.save();
  queue.publish('outgoing.' + message.origin, results_message, message._id + '.reply.results');
}

//
// the user's intent is to obtain more information about a menu item
//
handlers['food.item.info'] = function*(message) {

}

// the user's intent is to add a menu item to cart
handlers['food.item.add'] = function*(message) {

}

// the user's intent is to select an option for a menu item, like size or type of sauce
// the item could already be in their cart or not. message.item should be what you modify
handlers['food.item.option'] = function*(message) {

}


//mock function for now until dexter implements 
function validateAddress(addr) {
  //validate addr via google places api and Parse out the fields from the addr string 
  return {
    label: "NYC Office",
    coordinates: [-123.34, 34.32432423],
    address_1: addr.address_1,
    address_2: 'Apt. 6',
    phone_number: "212-867-5309",
    region: "US",
    timezone: "ET",
    special_instructions: "Please send a raven to herald your arrival"
  };
}


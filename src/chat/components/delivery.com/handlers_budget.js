var _ = require('lodash')

// injected dependencies
var $replyChannel
var $allHandlers

/**@namespace handlers*/
var handlers = {}

/**
* Displays the budgets this team has used in the past
* @param message
*/
handlers['food.admin.team_budget'] = function * (message) {
  logging.debug('food.admin.team_budget, team_id: %s', message.source.team)
  var foodSession = yield db.delivery.findOne({team_id: message.source.team, active: true}).exec()
  //waypoint logging
  db.waypoints.log(1020, foodSession._id, message.user_id, {original_text: message.original_text})

  //the budgets are stored by location
  var budget_options;
  var locations = (yield db.slackbots.findOne({team_id: message.source.team})).meta.locations
  for (var i = 0; i < locations.length; i++) {
    if (locations[i].address_1 == foodSession.chosen_location.address_1 && locations[i].zip_code == foodSession.chosen_location.zip_code) {
      budget_options = locations[i].budgets;
    }
  }

  var msg_text = 'How much would you like each person on your team to spend on food?';
  if (foodSession.onboarding) msg_text = '*Step 3:* ' + msg_text

  // extract numerals from user input
  var parseNumber = function (str) {
    var num = str.match(/([\d]+(?:\.\d\d)?)/);
    if (num) return num[1];
    else return null;
  }

  if (message.text && message.text[0] != '{') { //ie if the user has just typed something in
    var num = parseNumber(message.text)

    if (num) {
      message.data = {};
      message.data.value = {};
      message.data.value.budget = num;
      message.data.value.new = true;
      return yield handlers['food.admin.confirm_budget'](message);
    }
    else {
      yield $replyChannel.send(message, 'food.admin.team_budget', {type: message.origin, data: {
        attachments: [{
          'mrkdwn_in': [
            'text'
          ],
          'text': "I didn\'t understand that - please type a number or click one of buttons",
          'color': '#fc9600',
          'attachment_type': 'default',
          'actions': [],
          'callback_id': 'food.admin.team_budget',
          'fallback': "I didn\'t understand that - please type a number or click one of buttons",
        }]
      }})
    }
  }

  var msg_json = {
    'attachments': [{
      'text': msg_text,
      'mrkdwn_in': ['text'],
      'fallback': 'Please choose a budget',
      'color': (foodSession.onboarding ? '#A368F0' : '#3AA3E3')
    }]
  }

  var noneButton = {
      'name': 'food.admin.confirm_budget',
      'text': 'No Limit',
      'style': 'default',
      'type': 'button',
      'value': {
        budget: 0,
        new: false
      }
    }

  // display the available budgets
  for (var i = 0; i < budget_options.length; i++) {
    if (i == 0 || i % 5 == 0) {
      msg_json.attachments.push({
        'mrkdwn_in': [
          'text'
        ],
        'text': '',
        // 'text': (i == 0 ? msg_text : ''),
        'fallback': 'I am fallback hear me fall back!',
        'callback_id': 'food.admin.team_budget',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': []
      })
      if (i == 0) {
        msg_json.attachments[msg_json.attachments.length-1].actions.push(noneButton)
      }
    }

    msg_json.attachments[1 + Math.floor(i / 5)].actions.push({
      'name': 'food.admin.confirm_budget',
      'text': `$${budget_options[i]}`,
      'style': 'default',
      'type': 'button',
      'value': {
        budget: budget_options[i],
        new: true
      }
    })
  }

  if (budget_options.length % 5 == 0) {
    msg_json.attachments.push({
      'mrkdwn_in': [
        'text'
      ],
      'text': "",
      'fallback': 'I am fallback hear me fall back!',
      'callback_id': 'food.admin.team_budget',
      'color': '#3AA3E3',
      'attachment_type': 'default',
      'actions': [noneButton]
    })
  }

  if (!message.text || message.text[0] == "{") {
    msg_json.attachments.push({
      'fallback': 'Search the menu',
      'text': '✎ Or type a budget below',
      'mrkdwn_in': ['text']
    })
  }

  //prepend cafe banner
  var msg_jsonArr = []
  msg_jsonArr.push({
    'text':'',
    'fallback':'Kip Cafe',
    'attachments':[{
      'fallback': 'Kip Cafe',
      'text': '',
      'color':'#F03745',
      'image_url': 'https://storage.googleapis.com/kip-random/cafe.png'
    }]
  })
  msg_jsonArr.push(msg_json)

  $replyChannel.sendReplace(message, 'food.admin.team_budget', {type: message.origin, data: msg_json})
}

/**
* updates available budgets and the budget history with the most recently used budget
* @param n {number} the new budget
* @param location {object} data stored on the slackbot relating to the order location, which contains both the available budgets and budget history
* @returns {array} array containing the new budgets array at index 0 and the new budget-history array at index 1
*/
function updateBudget (n, location) {
  var n = Number(n);
  var history = location.budget_history;
  var budgets = location.budgets;
  if (history.indexOf(n) > -1) {
    history.splice(history.indexOf(n), 1)
    history.unshift(n);
  }
  else {
    history.unshift(n)
    if (history.length > 3) history = history.slice(0, 4);
    budgets = history.slice().sort(function (a, b) {return b < a})
  }
  return [budgets, history];
}

/**
* Save the newly chosen budget to the database
* @param message
*/
handlers['food.admin.confirm_budget'] = function * (message) {
  logging.debug('food.admin.confirm_budget, team_id: %s', message.source.team)
  budget = message.data.value.budget;
  var foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()

  if (message.data.value.new) {
    var locations = (yield db.slackbots.findOne({team_id: message.source.team})).meta.locations
    for (var i = 0; i < locations.length; i++) {
      if (locations[i].address_1 == foodSession.chosen_location.address_1 && locations[i].zip_code == foodSession.chosen_location.zip_code) {
        var updated = updateBudget(budget, locations[i]);
        locations[i].budgets = updated[0];
        locations[i].budget_history = updated[1];
      }
    }

    yield db.slackbots.update({team_id: message.source.team}, {$set: {'meta.locations': locations}})
  }

  var user_budgets = {};
  for (var i = 0; i < foodSession.team_members.length; i++) {
    user_budgets[foodSession.team_members[i].id] = budget;
  }

  yield db.Delivery.update({team_id: message.source.team, active: true}, {
    $set: {
      budget: budget,
      user_budgets: user_budgets
    }
  });

  if (foodSession.onboarding) {
    // console.log('we are onboarding -- ', foodSession.onboarding)
    yield $allHandlers['food.poll.confirm_send_initial'](message)
  }
  else {
    // console.log('we are not onboarding -- ', foodSession.onboarding)
    yield $allHandlers['food.admin_polling_options'](message)
  }
}

module.exports = function (replyChannel, allHandlers) {
  $replyChannel = replyChannel
  $allHandlers = allHandlers

  // merge in our own handlers
  _.merge($allHandlers, handlers)
}

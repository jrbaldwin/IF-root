require('kip')
var sleep = require('co-sleep')
var _ = require('lodash')

var utils = require('./utils')
var api = require('./api-wrapper')
var slackUtils = require('../slack/utils.js')
var mailer_transport = require('../../../mail/IF_mail.js')

// turn feedback buttons on/off
var feedbackOn = false
var feedbackTracker = {}

// injected dependencies
var $replyChannel
var $allHandlers

// exports
var handlers = {}

handlers['food.admin.select_address'] = function * (message, banner) {
  // loading chat users here for now, can remove once init_team is fully implemented tocreate chat user objects
  var team = yield db.Slackbots.findOne({team_id: message.source.team}).exec()
  yield [sleep(1000), slackUtils.getTeamMembers(team)]

  message.state = {}
  var foodSession = yield utils.initiateDeliverySession(message)
  yield foodSession.save()
  var addressButtons = _.get(team, 'meta.locations', []).map(a => {
    return {
      name: 'passthrough',
      text: a.address_1,
      type: 'button',
      value: JSON.stringify(a)

    }
  })

  addressButtons = _.chunk(addressButtons, 5)
  var msg_json = {
    'attachments':
    [{
      'text': 'Great! Which address is this for?',
      'fallback': 'Great! Which address is this for?',
      'callback_id': 'address',
      'color': '#3AA3E3',
      'attachment_type': 'default',
      'actions': addressButtons[0]
    }]
  }

  if (banner) {
    msg_json.attachments.splice(0, 0,
      {
        'fallback': 'Kip Cafe',
        'title': '',
        'image_url': 'http://kipthis.com/kip_modes/mode_cafe.png',
        'color': '#3AA3E3',
      })
  }

  if (addressButtons.length > 1) {
    addressButtons.slice(1).map(group => {
      msg_json.attachments.push({
        'text': '',
        'fallback': 'Select address',
        'callback_id': 'address',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': group
      })
    })
  }

  // allow removal if more than one meta.locations thing
  // if (_.get(team, 'meta.locations').length > 1) {
  msg_json.attachments.push({
    'text': '',
    'fallback': 'Remove an address',
    'callback_id': 'remove_address',
    'attachment_type': 'default',
    'actions': [{
      'name': 'passthrough',
      'text': 'New +',
      'type': 'button',
      'value': 'food.settings.address.new'
    }]
  })

  if (_.get(team, 'meta.locations').length > 1) {
    msg_json.attachments[msg_json.attachments.length - 1].actions.push({
      'name': 'passthrough',
      'text': 'Edit',
      'type': 'button',
      'value': 'food.settings.address.remove_select'
    })
  }
  if (!banner) {
    $replyChannel.sendReplace(message, 'food.choose_address', {type: message.origin, data: msg_json})
  } else {
    return $replyChannel.send(message, 'food.choose_address', {type: message.origin, data: msg_json})
  }
}

handlers['food.settings.address.remove_select'] = function * (message) {
  var team = yield db.Slackbots.findOne({team_id: message.source.team}).exec()
  _.get(team, 'meta.locations')
  var addressButtons = _.get(team, 'meta.locations', []).map(a => {
    return {
      name: 'passthrough',
      text: `× ${a.address_1}`,
      type: 'button',
      value: JSON.stringify(a)

    }
  })

  var msg_json = {
    title: '',
    text: 'Which address should I remove?',
    attachments: _.chunk(addressButtons, 5).map(group => {
      return {
        'text': '',
        'fallback': 'Which address should I remove?',
        'callback_id': 'remove_address',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': group
      }
    })
  }

  msg_json.attachments.push({
    'text': '',
    'fallback': 'None, go back',
    'callback_id': 'back_remove_address',
    'attachment_type': 'default',
    'actions': [{
      'name': 'passthrough',
      'text': 'None, go back',
      'type': 'button',
      'value': 'food.admin.select_address'
    }]
  })
  $replyChannel.sendReplace(message, 'food.settings.address.remove', {type: message.origin, data: msg_json})
}

handlers['food.settings.address.remove'] = function * (message) {
  var addressToRemove = JSON.parse(message.text)
  logging.debug('removing this address', addressToRemove)
  yield db.Slackbots.update(
    {team_id: message.source.team},
    {$pull: {
      'meta.locations': {
        _id: addressToRemove._id
      }
    }
  }).exec()
  yield handlers['food.admin.select_address'](message)
}

//
// User decides what address they are ordering for. could be that they need to make a new address
//
handlers['food.choose_address'] = function * (message) {
  if (_.get(message, 'source.response_url')) {
    // slack action button tap
    try {
      var location = JSON.parse(message.text)
    } catch (e) {
      location = {address_1: message.text}
      kip.debug('Could not understand the address the user wanted to use, message.text: ', message.text)
    // TODO handle the case where they type a new address without clicking the "new" button
    }

    var foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()
    foodSession.chosen_location = location

    // keep the banner
    var msg_json = {
      fallback: 'Kip Cafe',
      text: 'Searching your area for good food...',
      attachments: [
        {
          'fallback': 'Kip Cafe',
          'title': '',
          'image_url': 'http://kipthis.com/kip_modes/mode_cafe.png',
          'color': '#3AA3E3'
        }
      ]
    }
    $replyChannel.sendReplace(message, 'food.choose_address', {type: message.origin, data: msg_json})

    foodSession.fulfillment_method = 'delivery'
    //
    // Commented out until pickup is reimplemented ----------------------------
    //
    // var text = `Cool! You selected \`${location.address_1}\`. We are only doing delivery (no pickup) right now, is that okay?`
    // var msg_json = {
    //   'attachments': [
    //     {
    //       'mrkdwn_in': [
    //         'text'
    //       ],
    //       'text': text,
    //       'fallback': text,
    //       'callback_id': 'wopr_game',
    //       'color': '#3AA3E3',
    //       'attachment_type': 'default',
    //       'actions': [
    //         {
    //           'name': 'food.delivery_or_pickup',
    //           'text': 'Yep!',
    //           'type': 'button',
    //           'value': 'delivery'
    //         },
    //         // REMOVING THIS UNTIL WE RE ADD PICKUP
    //         // {
    //         //   'name': 'food.delivery_or_pickup',
    //         //   'text': 'Pickup',
    //         //   'type': 'button',
    //         //   'value': 'pickup'
    //         // },
    //         {
    //           'name': 'food.settings.address.change',
    //           'text': '< Change Address',
    //           'type': 'button',
    //           'value': 'food.settings.address.change'
    //         }
    //       ]
    //     }
    //   ]
    // }
    // $replyChannel.send(message, 'food.delivery_or_pickup', {type: message.origin, data: msg_json})
    // ------------------------------------------------------------------------

    // get the merchants now assuming "delivery" for UI responsiveness. that means that if they choose "pickup" we'll have to do more work in the next step
    var addr = [foodSession.chosen_location.address_1, foodSession.chosen_location.zip_code].join(' ')
    var res = yield api.searchNearby({addr: addr, pickup: false})
    foodSession.merchants = _.get(res, 'merchants')
    foodSession.cuisines = _.get(res, 'cuisines')
    foodSession.markModified('merchants')
    foodSession.markModified('cuisines')
    yield foodSession.save()
    yield handlers['food.admin_polling_options'](message)
  } else {
    throw new Error('this route does not handle text input')
  }
}

//
// the user's intent is to create a new address
//
handlers['food.settings.address.new'] = function * (message) {
  kip.debug(' 🌆🏙 enter a new address')
  // message.state = {}
  var msg_json = {
    'text': "What's the address for the order?",
    'attachments': [{
      'fallback': "What's the address for the order?",
      'text': '✎ Type your address below (Example: _902 Broadway 10010_)',
      'mrkdwn_in': ['text']
    }]
  }
  $replyChannel.send(message, 'food.settings.address.confirm', {type: message.origin, data: msg_json})
}

//
// the user seeks to confirm their possibly updated/validated address
//
handlers['food.settings.address.confirm'] = function * (message) {
  // ✐✐✐
  // send response since this is slow
  $replyChannel.sendReplace(message, 'food.settings.address.save', {type: message.origin, data: {text: 'Thanks! Let me process that address real quick'}})
  try {
    var res = yield api.searchNearby({addr: message.text})
    var location = {
      address_1: res.search_address.street,
      address_2: res.search_address.unit,
      zip: res.search_address.zip,
      zip_code: res.search_address.zip_code,
      postal_code: res.search_address.postal_code,
      state: res.search_address.state,
      city: res.search_address.city,
      sublocality: res.search_address.sublocality,
      latitude: res.search_address.latitude,
      longitude: res.search_address.longitude,
      neighborhood: res.search_address.neighborhood
    }
  } catch (err) {
    logging.error('error searching that address', err)
    $replyChannel.sendReplace(message, 'food.settings.address.new', {
      type: message.origin,
      data: {text: `Sorry, I can't find that address! Try typing something like: "902 Broadway New York, NY 10010"`}
    })
    yield sleep(250)
    yield handlers['food.settings.address.new'](message)
    return
  }

  console.log(location)

  var addr = [
    [location.address_1, location.address_2].filter(Boolean).join(' '),
    location.neighborhood,
    `${location.city}, ${location.state} ${location.zip_code}`].filter(Boolean).join('\n')

  var msg_json = {
    text: `Is this your address?`,
    'attachments': [
      {
        text: addr,
        'mrkdwn_in': [
          'text'
        ],
        'fallback': addr,
        'callback_id': 'settings_address_new',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': [
          {
            name: 'food.settings.address.save',
            text: '✓ Confirm Address',
            type: 'button',
            style: 'primary',
            value: JSON.stringify(location)
          },
          {
            name: 'passthrough',
            text: 'Edit Address',
            type: 'button',
            value: 'food.settings.address.new'
          }
        ]
      }
    ]
  }

  // collect feedback on this feature
  // if (feedbackOn && msg_json) {
  //   msg_json.attachments[0].actions.push({
  //     name: 'food.feedback.new',
  //     text: '⇲ Send feedback',
  //     type: 'button',
  //     value: 'food.feedback.new'
  //   })
  // }

  $replyChannel.send(message, 'food.settings.address.save', {type: message.origin, data: msg_json})
}

// Save the address to the db after the user confirms it
handlers['food.settings.address.save'] = function * (message) {
  var foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()
  var location = message.data.value

  var slackbot = yield db.Slackbots.findOne({team_id: message.source.team}).exec()

  if (location) {
    foodSession.chosen_location = location
    slackbot.meta.locations.push(location)
  } else {
    // todo error
    throw new Error('womp bad address')
  }
  yield foodSession.save()
  yield slackbot.save()

  message.text = JSON.stringify(location)
  return yield handlers['food.choose_address'](message)
}

handlers['food.settings.address.change'] = function * (message) {
  return yield handlers['food.admin.select_address'](message)
}


//send feedback to Kip 😀😐🙁
handlers['food.feedback.new'] = function * (message) {

   feedbackTracker[message.source.team + message.source.user + message.source.channel] = {
    source: message.source
   }

  var msg_json = {
    'text': 'Can you share a bit of info about this? I\'ll pass it on so that we can do better next time',
    'attachments': [
      {
        'text': '✎ Type your feedback',
        'mrkdwn_in': [
          'text'
        ],
        'fallback': 'Can you share a bit of info about this? I\'ll pass it on so that we can do better next time',
        'callback_id': JSON.stringify(message),
        'attachment_type': 'default'
      }
    ]
  }
  $replyChannel.send(message, 'food.feedback.save', {type: message.origin, data: msg_json})
}

handlers['food.feedback.save'] = function * (message) {

  //check for entry in feedback tracker
  if (feedbackTracker[message.source.team + message.source.user + message.source.channel]){
    var source = feedbackTracker[message.source.team + message.source.user + message.source.channel].source
  } else {
    var source = 'undefined'
  }

  var mailOptions = {
    //to: 'Tim Wong <timothy@interfacefoundry.com>',
    //from: 'Tim Wong <timothy@interfacefoundry.com>',
    to: 'Kip Server <hello@kipthis.com>',
    from: 'Kip Café <server@kipthis.com>',
    subject: '['+source.callback_id+'] Kip Café Feedback',
    text: '- Feedback: '+message.text + ' \r\n - Context:'+JSON.stringify(source)
  }
  logging.info(mailOptions)
  mailer_transport.sendMail(mailOptions, function (err) {
    if (err) logging.error(err)
  })

  var msg_json = {
    'text': 'Thanks for explaining the issue'
  }

  // switch back to original context
  if (_.get(source, 'callback_id')) {
    $replyChannel.send(message, 'food.' + source.callback_id.replace(/_/g, '.'), {type: message.origin, data: msg_json})
    return yield handlers['food.' + source.callback_id.replace(/_/g, '.')](message)
  }
}

handlers['food.delivery_or_pickup'] = function * (message) {
  var foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()

  // Sometimes we have to wait a ilttle bit for the merchants to finish populating from an earlier step
  // i ended up just sending the reply back in that earlier step w/o waiting for delivery.com, because
  // delivery.com is so slow
  var time = +new Date()
  while (_.get(foodSession, 'merchants.length', 0) <= 0 && (+new Date() - time < 3000)) {
    if (!alreadyWaiting) {
      var alreadyWaiting = true
      $replyChannel.sendReplace(message, 'food.delivery_or_pickup', {type: message.origin, data: {text: 'Searching your area for good food...'}})
    }
    yield sleep(500)
    foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()
  }
  var fulfillmentMethod = message.data.value
  foodSession.fulfillment_method = fulfillmentMethod
  kip.debug('set fulfillmentMethod', fulfillmentMethod)

  if (fulfillmentMethod === 'pickup') {
    var addr = (foodSession.chosen_location && foodSession.chosen_location.address_1) ? foodSession.chosen_location.address_1 : _.get(foodSession, 'data.input')
    var res = yield api.searchNearby({addr: addr, pickup: true})
    foodSession.merchants = _.get(res, 'merchants')
    foodSession.cuisines = _.get(res, 'cuisines')
    foodSession.markModified('merchants')
    foodSession.markModified('cuisines')
  }
  yield foodSession.save()
  yield handlers['food.admin_polling_options'](message)
}
//
// The user jsut clicked pickup or delivery and is now ready to start ordering
//
handlers['food.admin_polling_options'] = function * (message) {
  var foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()

  // check to make sure restaurants are even open
  if (foodSession.merchants.length === 0) {
    var msg_json = {
      text: `Looks like there are no open restaurants taking orders for ${foodSession.fulfillment_method} near ${foodSession.chosen_location.address_1} right now. Please try again later.`
    }

    $replyChannel.sendReplace(message, 'food.begin', {type: message.origin, data: msg_json})
    return
  }


  // find the most recent merchant that is open now (aka is in the foodSession.merchants array)
  var merchantIds = foodSession.merchants.map(m => m.id)
  var lastOrdered = yield db.Delivery.find({team_id: message.source.team, chosen_restaurant: {$exists: true}})
    .sort({_id: -1})
    .select('chosen_restaurant')
    .limit(15)
    .exec()

  lastOrdered = yield lastOrdered.filter(message => merchantIds.includes(message.chosen_restaurant.id))
  var mostRecentSession = lastOrdered[0]
  lastOrdered = _.uniq(lastOrdered.map(message => message.chosen_restaurant.id)) // list of unique restaurants

  // create attachments, only including most recent merchant if one exists
  var attachments = []

  if (mostRecentSession) {
    // build the regular listing as if it were a choice presented to the admin in the later steps,
    // but them modify it with some text to indicate you've ordered here before
    var mostRecentMerchant = foodSession.merchants.filter(m => m.id === mostRecentSession.chosen_restaurant.id)[0] // get the full merchant
    var listing = yield utils.buildRestaurantAttachment(mostRecentMerchant)
    listing.text = `You ordered \`Delivery\` from ${listing.text} recently, order again?`

    // allow confirmation
    listing.actions = [{
      'name': 'food.admin.restaurant.reordering_confirmation',
      'text': '✓ Reorder From Here',
      'type': 'button',
      'style': 'primary',
      'value': mostRecentMerchant.id
    }]

    listing.mrkdwn_in = ['text']
    if (lastOrdered.length > 1) {
      listing.actions.push({
        'name': 'food.restaurants.list.recent',
        'text': 'See More',
        'type': 'button',
        'value': 0
      })
    }
    attachments.push(listing)
  }

  attachments.push({
    'mrkdwn_in': [
      'text'
    ],
    'text': '*Tip:* `✓ Start New Poll` polls your team on what type of food they want.',
    'fallback': '*Tip:* `✓ Start New Poll` polls your team on what type of food they want.',
    'callback_id': 'wopr_game',
    'color': '#3AA3E3',
    'attachment_type': 'default',
    'actions': [
      {
        'name': 'passthrough',
        'text': '✓ Start New Poll',
        'style': 'primary',
        'type': 'button',
        'value': 'food.poll.confirm_send_initial'
      },
      {
        'name': 'passthrough',
        'text': '× Cancel',
        'type': 'button',
        'value': 'food.exit.confirm',
        confirm: {
          title: 'Leave Order',
          text: 'Are you sure you want to stop ordering food?',
          ok_text: "Don't order food",
          dismiss_text: 'Keep ordering food'
        }
      }
    ]
  })

  var res = {
    attachments: attachments
  }

  $replyChannel.sendReplace(message, 'food.ready_to_poll', {type: message.origin, data: res})
  foodSession.save()
}

handlers['food.admin.restaurant.reordering_confirmation'] = function * (message) {
  var foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()
  var mostRecentMerchant = message.data.value
  // find the most recent merchant that is open now (aka is in the foodSession.merchants array)
  var lastOrdered = yield db.Delivery.find({team_id: message.source.team, 'chosen_restaurant.id': mostRecentMerchant, active: false})
    .sort({_id: -1})
    .limit(1)
    .exec()

  // copy all the last ordered stuff to this order
  lastOrdered = lastOrdered[0]
  foodSession.chosen_channel = lastOrdered.chosen_channel
  foodSession.chosen_restaurant = lastOrdered.chosen_restaurant
  foodSession.team_members = lastOrdered.team_members
  foodSession.markModified('team_members')
  yield foodSession.save()

  // create attachments, only including most recent merchant if one exists

  if (foodSession.chosen_channel.name === 'just_me') {
    var textWording = 'just you'
  } else if (foodSession.chosen_channel.name === 'everyone') {
    textWording = 'everyone'
  } else {
    textWording = `<#${foodSession.chosen_channel.id}|${foodSession.chosen_channel.name}>`
  }
  var msg_json = {
    'text': '',
    'attachments': [{
      'text': `Should I collect orders for <${foodSession.chosen_restaurant.url}|${foodSession.chosen_restaurant.name}> from ${textWording}?`,
      'fallback': `Should I collect orders for <${foodSession.chosen_restaurant.url}|${foodSession.chosen_restaurant.name}> from ${textWording}?`,
      'callback_id': 'reordering_confirmation',
      'color': '#3AA3E3',
      'attachment_type': 'default',
      'actions': [{
        'name': 'passthrough',
        'text': 'Confirm',
        'style': 'primary',
        'type': 'button',
        'value': 'food.admin.restaurant.confirm_reordering_of_previous_restaurant'
      }, {
        'name': 'passthrough',
        'text': '< Back',
        'type': 'button',
        'value': 'food.admin_polling_options'
      }, {
        'name': 'passthrough',
        'text': '× Cancel',
        'type': 'button',
        'value': 'food.exit.confirm',
        'confirm': {
          'title': 'Are you sure?',
          'text': "Are you sure you don't want to order food?",
          'ok_text': 'Yes',
          'dismiss_text': 'No'
        }
      }]
    }]
  }
  $replyChannel.sendReplace(message, 'food.ready_to_poll', {type: message.origin, data: msg_json})
}

handlers['food.restaurants.list'] = function * (message) {
  // here's some mock stuff for now
  var msg_json = {
    'text': 'Here are 3 restaurant suggestions based on your recent history. \n Which do you want today?',
    'attachments': [
      {
        'mrkdwn_in': [
          'text'
        ],
        'text': '',
        'image_url': 'http://i.imgur.com/iqjT5iJ.png',
        'fallback': 'Restaurant 1',
        'callback_id': 'wopr_game',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': [
          {
            'name': 'passthrough',
            'text': '✓ Choose',
            'style': 'primary',
            'type': 'button',
            'value': 'food.poll.confirm_send'
          },
          {
            'name': 'chess',
            'text': 'More Info',
            'type': 'button',
            'value': 'chess'
          }
        ]
      },
      {
        'title': '',
        'image_url': 'http://i.imgur.com/8Huwjao.png',
        'mrkdwn_in': [
          'text'
        ],
        'text': '',
        'fallback': 'Restaurant 2',
        'callback_id': 'wopr_game',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': [
          {
            'name': 'passthrough',
            'text': '✓ Choose',
            'style': 'primary',
            'type': 'button',
            'value': 'food.poll.confirm_send'
          },
          {
            'name': 'chess',
            'text': 'More Info',
            'type': 'button',
            'value': 'chess'
          }
        ]
      },
      {
        'title': '',
        'image_url': 'http://i.imgur.com/fP6EcEm.png',
        'mrkdwn_in': [
          'text'
        ],
        'text': '',
        'fallback': 'Restaurant 3',
        'callback_id': 'wopr_game',
        'color': '#3AA3E3',
        'attachment_type': 'default',
        'actions': [
          {
            'name': 'passthrough',
            'text': '✓  Choose',
            'style': 'primary',
            'type': 'button',
            'value': 'food.poll.confirm_send'
          },
          {
            'name': 'chess',
            'text': 'More Info',
            'type': 'button',
            'value': 'chess'
          }
        ]
      },
      {
        'mrkdwn_in': [
          'text'
        ],
        'text': '',
        'fallback': 'Other options',
        'callback_id': 'wopr_game',
        'attachment_type': 'default',
        'actions': [
          {
            'name': 'chess',
            'text': '<',
            'type': 'button',
            'value': 'chess'
          },
          {
            'name': 'chess',
            'text': 'More Choices >',
            'type': 'button',
            'value': 'chess'
          },
          {
            'name': 'maze',
            'text': 'Sort Price',
            'type': 'button',
            'value': 'maze'
          },
          {
            'name': 'maze',
            'text': 'Sort Rating',
            'type': 'button',
            'value': 'maze'
          },
          {
            'name': 'maze',
            'text': 'Sort Distance',
            'type': 'button',
            'value': 'maze'
          }
        ]
      }
    ]
  }
  $replyChannel.send(message, 'food.ready_to_poll', {type: message.origin, data: msg_json})
}

//
// Return some restaurants, button value is the index offset
//
handlers['food.restaurants.list.recent'] = function * (message) {
  var index = parseInt(_.get(message, 'data.value')) || 0
  var msg_json = { text: 'Looking up your order history for this location...' }
  $replyChannel.sendReplace(message, 'food.waiting', {type: message.origin, data: msg_json})
  var foodSession = yield db.Delivery.findOne({team_id: message.source.team, active: true}).exec()
  var availableMerchantIds = foodSession.merchants.map(m => m.id)
  var recentDeliveries = yield db.Delivery.aggregate([
    {
      $match: {
        team_id: message.source.team,
        'chosen_restaurant.id': {$exists: true}
      }
    },
    {
      $group: {
        _id: '$chosen_restaurant.id',
        count: {$sum: 1}
      }
    }
  ])

  // show 3 restaurants that are in the foodSession available list
  var attachments = yield recentDeliveries
    .filter(g => availableMerchantIds.includes(g._id)) // remember that ._id here is from the $group mongo aggregate operator
    .sort(g => g.count)
    .slice(index, index + 3)
    .map(g => {
      var merchant = foodSession.merchants.filter(m => m.id === g._id)[0]
      return utils.buildRestaurantAttachment(merchant)
    })

  attachments.push({
    'mrkdwn_in': [
      'text'
    ],
    'text': '*Tip:* `✓ Start New Poll` polls your team on what type of food they want.',
    'fallback': '*Tip:* `✓ Start New Poll` polls your team on what type of food they want.',
    'callback_id': 'wopr_game',
    'color': '#3AA3E3',
    'attachment_type': 'default',
    'actions': [
      {
        'name': 'passthrough',
        'text': '✓ Start New Poll',
        'style': 'primary',
        'type': 'button',
        'value': 'food.poll.confirm_send'
      },
      {
        'name': 'food.restaurants.list.recent',
        'text': 'See More',
        'type': 'button',
        'value': index + 3
      },

      {
        'name': 'passthrough',
        'text': '× Cancel',
        'type': 'button',
        'value': 'food.exit.confirm',
        confirm: {
          title: 'Leave Order',
          text: 'Are you sure you want to stop ordering food?',
          ok_text: "Don't order food",
          dismiss_text: 'Keep ordering food'
        }
      }
    ]
  })
  var msg = {
    'text': 'Here are 3 restaurant suggestions based on your recent history. \n Which do you want today?',
    attachments: attachments
  }

  $replyChannel.sendReplace(message, 'food.ready_to_poll', {type: message.origin, data: msg})
}

module.exports = function (replyChannel, allHandlers) {
  $replyChannel = replyChannel
  $allHandlers = allHandlers

  // merge in our own handlers
  _.merge($allHandlers, handlers)
}

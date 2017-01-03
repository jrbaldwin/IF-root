/*
SLACKSLACKSLACKSLACKSLACKSLACKSLACKSLAh/-.    .-+ySLACKSLACKSLACKSLACKSLACKSLACK
SLACKSLACKSLACKSLACKSLACKSLACKSLACKNs.     ``     .sSLACKSLACKSLACKSLACKSLACKSLA
SLACKSLACKSLACKSLACKSLACKSLACKSLACd/   `-:////:-`   :hSLACKSLACKSLACKSLACKSLACKM
SLACKSLACKSLACKSLANSLACKSLACKSLACK/   .//////////-   /dSLACKSLSLACKSLACKSLACKSLA
SLACKSLACKSLAdo/:-:--+ymNSLACKSLAh`  `////////////.   odhs/--.-:+sdSLACKSLACKSLA
SLACKSLACKNs-          `:oSLACKSLh`  `/////////////`  ``          `-hNSLACKSLACK
SLACKSLACh:   `-//+//-`   :hSLACKd/   -////////////-    `..-:::-.`   :dSLACKSLAC
SLACKSLAy-   :oooooooo+:   -hSLACKy.   :///////////+:-:://///////:.   :dSLACKSLA
SLACKSLA+   :ooooooooooo:   +mNmhy+-   `/////+oosssss//////////////.   +SLACKSLA
SLACKSLd:   /oooooooooooo.  `:-`      `./ossssssssssso/////////////-   +SLACKSLA
SLACKSLA+   -oooooooooooo+      `..-::///sssssssssssss+///////////:   .ySLACKSLA
SLACKSLAd:   /oooooooooooo/..-:://///////+sssssssssssss////////::.   .sSLACKSLAC
SLACKSLmd+`  `+oooooooossss+//////////////osssssssssssso/::-..`    .+dSLACKSLACK
SLAms/-.      -oosssssssssss///////////////ssssssssssoo+-      `./odSLACKSLACKSL
Mmo.    ``.-::/osssssssssssso//////////////+sssso++//////`   /ydNSLACKSLACKSLACK
h:   `-:////////sssssssssssss+//////////::-.:////////////:   :dSLACKSLACKSLACKSL
/   -///////////+sssssssssssss////::-.``     :////////////.   /SLACKSLACKSLACKSL
   `/////////////ossssssssssss+..`           `/////////////`  `++:.`    `.:sdSLA
   `//////////////ssssssssooooo.              -////////////:        `..`    .+mM
/   -////////////:/sooooooooooo+`              :////////////. `.:/ossssss+-   -y
d-   `-::::::-.`   /oooooooooooo:              `/////////+ossssssssssssssss+   /
SLo.               `+oooooooooooo.              -//+ossyhhhhhyssssssssssssss-
MSLAh+--.`..-:oys   -oooooooooooo+`          .-/+yhhhhhhhhhhhhysssssssssssss.  `
SLACKSLmdmmmNSLAd/   /oooooooooooo:    .-/+osssssyhhhhhhhhhhhhhysssssssssss:   /
SLACKSLACKSLACKSLy.  `+oooooooooooy++ossssssssssssyhhhhhhhhhhhhyssssssso+-`   /d
SLACKSLACKSLACdhs+-   -ooooosyhdmmmmyssssssssssssssyhhhhhhhhhhhhyo+/-.     `:yNM
SLACKSLACKMms-.      `-shdmmmmmmmmmmdssssssssssssssyhhhhhhhysso+/`    `.-/sdSLAC
SLACKSLACKs`   `.:/osssymmmmmmmmmmmmmhssssssssssssssyyyso+///////:   :sSLACKSLAC
SLACKSLAd+   .+ssssssssshmmmmmmmmmmmmmyssssssssso/:-`:////////////.   oNSLACKSLA
SLACKSLAo   -ssssssssssssdmmmmmmmmmmmmdssso+:-`      `/////////////`  .ySLACKSLA
SLACKSLd/   +ssssssssssssymmmmmmmmmmdhy/.      `.::   -////////////-   +SLACKSLA
SLACKSLA+   /ssssssssssssshmmmddhysoooo+`  `/shmNMh-   :///////////.  `sSLACKSLA
SLACKSLAy-   /sssssssssss+/osoooooooooo+/   :dSLACKo`  `://///////.   +SLACKSLAC
SLACKSLACy-   `:/+o+/:.`   `+oooooooooooo.   sSLACKMs.   `-::::-.    +SLACKSLACK
SLACKSLACKms-           `   .oooooooooooo+   /hSLACKMdo-          `:hSLACKSLACKM
SLACKSLACKSLAds+:---:+ydy/   /ooooooooooo+   /hSLACKMSLAho:--:--/ySLACKSLACKSLAC
SLACKSLACKSLACKSLACKSLACKy.  `/ooooooooo+.   oNSLACKSLACKMSLANSLACKSLACKSLACKSLA
SLACKSLACKSLACKSLACKSLACKMo.   -/+oooo+:`  `+NSLACKSLACKSLACKSLACKSLACKSLACKSLAC
SLACKSLACKSLACKSLACKSLACKSLdo.    ```    `-hNSLACKSLACKSLACKSLACKSLACKSLACKSLACK
SLACKSLACKSLACKSLACKSLACKSLACdo/..   `--+hNSLACKSLACKSLACKSLACKSLACKSLACKSLACKSL
*/

var slack = process.env.NODE_ENV === 'test' ? require('./mock_slack') : require('@slack/client')
var co = require('co')
var _ = require('lodash')
var kip = require('../../../kip.js')
var queue = require('../queue-mongo')
var image_search = require('../image_search')
var search_results = require('./search_results')
var variation_view = require('./variation_view')
var focus = require('./focus')
var cart = require('./cart')
var kipCart = require('../cart')
var cardTemplate = require('./card_templates');
var slackConnections = {}
var webserver = require('./webserver')
var bundles = require('../bundles');
var replyLogic = require('../reply_logic')
bundles.updater(); //caches bundle items to mongo everyday at midnight

var slackUtils = require('./utils.js')
var coupon = require('../../../coupon/coupon.js')



function * loadTeam(slackbot) {
  if (slackConnections[slackbot.team_id]) {
    logging.info('already loaded team', slackbot.team_name)
    return
  }

  try {
    var web = new slack.WebClient(slackbot.bot.bot_access_token || '')
    var rtm = new slack.RtmClient(slackbot.bot.bot_access_token || '')
    rtm.start()
  } catch (err) {
    logging.error('error when loading slackbot.bot', slackbot.bot)
    return
  }
  slackConnections[slackbot.team_id] = {
    rtm: rtm,
    web: web,
    slackbot: slackbot
  }

  co(function * () {
    logging.info('refreshing all teams and various stuff does not work in k8s on startup')
    // yield slackUtils.refreshAllChannels(slackConnections[slackbot.team_id])
    // yield slackUtils.refreshAllUserIMs(slackConnections[slackbot.team_id])
    // yield coupon.refreshTeamCoupons(slackbot.team_id)
  })
  // TODO figure out how to tell when auth is invalid
  // right now the library just console.log's a message and I can't figure out
  // how to intercept that event.
  // rtm.on(slack.CLIENT_EVENTS.RTM.INVALID_AUTH, (err) => {
  //   kip.log('invalid auth', slackbot.team_id, slackbot.team_name)
  // })

  rtm.on(slack.CLIENT_EVENTS.RTM.AUTHENTICATED, (startData) => {
    // kip.log('loaded slack team', slackbot.team_id, slackbot.team_name)
  })

  rtm.on(slack.CLIENT_EVENTS.DISCONNECT, (reason) => {
    logging.info('slack client disconnected', slackbot.team_id)
    logging.info(reason); // is this even a thing?
  })

  //
  // Handle incoming slack messages.  Slack-specific pre-processing
  //
  rtm.on(slack.RTM_EVENTS.MESSAGE, (data) => {

    logging.debug('got slack message sent from user', data.user, 'on channel', data.channel)
    if ((data.user === undefined) || (data.channel === undefined)) {
      logging.warn('user or channel undefined in slack data')
    }
    // For channels that are not DM's, only respond if kip is called out by name
    if ('CG'.includes(data.channel[0])) {
      if (data.text && data.text.includes(slackbot.bot.bot_user_id)) {
        // strip out the bot user id, like "<@U13456> find me socks" -> "find me socks"
        var regex = new RegExp('<@' + slackbot.bot.bot_user_id + '>[:]*', 'g')
        data.text = data.text.replace(regex, '').trim()
      } else {
        // if not mentioned by name, do nothing
        return;
      }
    }

    var message = new db.Message({
      incoming: true,
      thread_id: data.channel,
      original_text: data.text,
      user_id: data.user,
      origin: 'slack',
      source: data
    })

    // don't talk to yourself
    if (data.user === slackbot.bot.bot_user_id || data.subtype === 'bot_message' || _.get(data, 'username', '').toLowerCase().indexOf('kip') === 0) {
      logging.debug("don't talk to yourself: data: ",data);
      return; // drop the message before sa ving.
    }

    // other random things
    if ((data.type !== 'message') || (data.subtype === 'channel_join') || (data.subtype === 'channel_leave')) { // settings.name = kip's slack username
      logging.debug('\n\n\n will not handle this message, message: ', message, ' \n\n\n')
      logging.debug('data.type', data.type)
      logging.debug('data.subtype', data.subtype)
      return
    }

    if ((data.hidden === true) && (data.subtype === 'message_changed')) {
      logging.debug('\n\n\n will not handle this message, message: ', message, ' \n\n\n')
      logging.debug('data.hidden', data.hidden)
      logging.debug('data.subtype', data.subtype)
      return
    }

    //
    // 🖼 image search
    //
    if (data.subtype === 'file_share' && ['png', 'jpg', 'gif', 'jpeg', 'svg'].indexOf(data.file.filetype.toLowerCase()) >= 0) {
      return image_search(data.file.url_private, slackbot.bot.bot_access_token, function (res) {
        message.text = res
        message.save().then(() => {
          replyLogic({data: message})
        })
      })
    }
    // clean up the text
    message.text = data.text // .replace(/(<([^>]+)>)/ig, ''); // remove <user.id> tag
    // if (message.text.charAt(0) == ':') {
    //   message.text = message.text.substr(1); // remove : from beginning of string
    // }
    try {
      message.text = message.text.trim() // remove extra spaces on edges of string
    } catch (err) {
      logging.info('error trying to trim message.text')
    }

    // queue it up for processing
    message.save().then(() => {
      replyLogic({data: message})
    })
  })
}

//
// slackbots
//
function * start () {
  if (process.env.NODE_ENV === 'test') {
    console.log('starting mock slack server')
    yield slack.run_chat_server()
  }

  var slackbots = yield db.Slackbots.find({
    'meta.deleted': {
      $ne: true
    },
    'meta.mock': process.env.NODE_ENV === 'test' ? true : {$ne: true}
  }).exec()

  kip.log('found', slackbots.length, 'slackbots')

  // Just need the RTM client to listen for messages
  yield slackbots.map(slackbot => {
    return loadTeam(slackbot)
  })
}

//
// Mechanism for responding to messages
//
function send (outgoing) {
  logging.info('outgoing slack message', _.get(outgoing, 'data.text', '[no text]'))
  try {
    var message = outgoing.data;
    var team = _.get(message, 'source.team');
    var thread_id = _.get(message, 'thread_id');
    var bot = slackConnections[team] ? slackConnections[team] : slackConnections[thread_id];
    if (typeof bot === 'undefined') {
      logging.error('error with the bot thing, message:', message)
      // throw new Error('rtm client not registered for slack team ', message.source.team, slackConnections)
    }
    var msgData = {
      // icon_url: 'http://kipthis.com/img/kip-icon.png',
      // username: 'Kip',
      as_user: true
    }
    co(function * () {
      if (message.action === 'typing') {
        return bot.rtm.sendMessage('typing...', message.source.channel, () => {
        })
      }
      logging.debug('message.mode: ', message.mode, ' message.action: ', message.action);
      if (message.mode === 'food') {
        var reply = message.reply && message.reply.data ? message.reply.data : message.reply ? message.reply : { reply: message.text }
        if (message.replace_ts) {
          // replace a specific message
          return bot.web.chat.update(message.replace_ts, message.source.channel, reply.label || message.text, reply, (e, r) => {
            // set the slack_ts from their server so we can update/delete specific messages
            db.Messages.update({_id: message._id}, {$set: {slack_ts: r.ts}}).exec()
          })
        } else {
          return bot.web.chat.postMessage(message.source.channel, (reply.label ? reply.label : message.text), reply, (e, r) => {
            // set the slack_ts from their server so we can update/delete specific messages
            logging.debug('saving slack timestamp', r.ts, 'to messages.slack_ts')
            db.Messages.update({_id: message._id}, {$set: {slack_ts: r.ts}}).exec()
          })
        }
      }
      if (message.mode === 'address') {
        var reply = message.reply && message.reply.data ? message.reply.data : message.reply ? message.reply : message.text
        return bot.web.chat.postMessage(message.source.channel, (reply.label ? reply.label : message.text), reply)
      }

      if(message.mode === 'variations' && message.action === 'reply'){
        msgData.attachments = yield variation_view(message);
        msgData.text = '';
        return bot.web.chat.postMessage(message.source.channel, '', msgData);
      }

      if (message.mode === 'shopping' && message.action === 'results' && message.amazon.length > 0) {
        var results = yield search_results(message);
        msgData.attachments = [...message.reply || [], ...results || []];
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

      if (message.mode === 'shopping' && message.action === 'switch') {
        msgData.attachments = [...message.reply || [], ...cardTemplate.slack_shopping_mode()];
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

      if (message.mode === 'shopping' && message.action === 'switch.silent') {
        msgData.attachments = message.reply;
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

      if (message.mode === 'shopping' && message.action === 'focus' && message.focus) {
        msgData.attachments = yield focus(message)
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData)
      }

      if (message.mode === 'cart' && message.action === 'view') {
        msgData.attachments = yield cart(message, bot.slackbot, false)
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData)
      }

      if (message.mode === 'settings' && message.action === 'home') {
        msgData.attachments = message.reply;
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData)
      }

      if (message.mode === 'onboard' && message.action === 'home') {
        msgData.attachments = message.reply;
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

      if (message.mode === 'collect' && message.action === 'home') {
        msgData.attachments = message.reply;
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

      if (message.mode === 'bundles' && message.action === 'home') {
        msgData.attachments = message.reply;
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

       if (message.mode === 'onboarding') {
        msgData.attachments = message.reply;
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData)
      }

      if (message.mode === 'member_onboard' && message.action === 'home') {
        msgData.attachments = message.reply;
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData)
      }

      if (message.mode === 'shopping' && message.action === 'onboard_cart') {
        let results = yield cart(message, bot.slackbot, false);
        results = results.reduce((cart, item) => { // hide items that the user hasn't added for onboarding
          if (item.text.includes(message.source.user)) cart.push(item);
          return cart;
        }, []);
        msgData.attachments = [...results || [], ...message.reply || []]; // need a celebration message here
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

      if ((message.mode === 'member_onboard' || message.mode === 'onboard') && message.action === 'results' && message.amazon.length > 0) {
        let results = yield search_results(message, true, message.mode);
        msgData.attachments = [...results || [], ...message.reply || []];
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
      }

      if (message.mode === 'team' && message.action === 'home') {
        msgData.attachments = message.reply
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData)
      }

      if (message.mode === 'exit' && message.action === 'exit') {
        msgData.attachments = message.reply
        return bot.web.chat.postMessage(message.source.channel, message.text, msgData)
      }

      if (message.mode === 'loading') {
        if (message.action === 'hide') {
          msgData.attachments = message.reply;
          return bot.web.chat.update( message.data.hide_ts, message.source.channel,'', null);
        } else {
          msgData.attachments = message.reply;
          return bot.web.chat.postMessage(message.source.channel, message.text, msgData);
        }
      }

      try {
          bot.web.chat.postMessage(message.source.channel, message.text, null);
       } catch (err) {
        logging.debug('\n\n\n\n slack.js bot.web.chat.postMessage error: ', message.reply,'\n\n\n\n');
      }

      outgoing.ack()
    }).then(() => {
    }).catch(e => {
      console.log(e.stack)
      bot.rtm.sendMessage("I'm sorry I couldn't quite understand that", message.source.channel, () => {
      })
    })
  } catch (e) {
    kip.err(e)
  }
}

module.exports.slackConnections = slackConnections;
module.exports.loadTeam = loadTeam
module.exports.startMockSlack = start
module.exports.send = send

if (!module.parent) {
  co(start).catch((e) => {
    kip.error(e, 'error loading slackbots')
  })
}

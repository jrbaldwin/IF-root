/*eslint-env es6*/
var async = require('async');
var request = require('request');
var co = require('co')
var _ = require('lodash')

//slack stuff
var RtmClient = require('@slack/client').RtmClient;
var WebClient = require('@slack/client').WebClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var RTM_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.RTM;
var WEB_CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS.WEB;
//* * * * * //

var banter = require("./banter.js");
var history = require("./history.js");
var search = require("./search.js");
var picstitch = require("./picstitch.js");
var processData = require("./process.js");
var purchase = require("./purchase.js");
var init_team = require("./init_team.js");
var conversation_botkit = require('./conversation_botkit');
var kipcart = require('./cart');

var nlp = require('../../nlp/api');

//set env vars
var config = require('config');
var mailerTransport = require('../../../IF_mail/IF_mail.js');

//load mongoose models
var db = require('db');
var Message = db.Message;
var Chatuser = db.Chatuser;
var Slackbots = db.Slackbots;

var slackUsers = {};
var slackUsers_web = {};
var messageHistory = {}; //fake database, stores all users and their chat histories
var io; //global socket.io var...probably a bad idea, idk lol
var supervisor = require('./supervisor');
var cinnaEnv;
// var BufferList = require('bufferlist').BufferList
var upload = require('../../../../IF_services/upload.js');
/////////// LOAD INCOMING ////////////////


var telegram = require('telegram-bot-api');
var telegramToken = (process.env.NODE_ENV == 'development_alyx')  ?  '144478430:AAG1k609USwh5iUORHLdNK-2YV6YWHQV4TQ' : '187934179:AAG7_UuhOETnyWEce3k24QCd2OhTBBQcYnk';

var tg = new telegram({
        token: telegramToken,
        updates: {
            enabled: true
    }
});

tg.on('message', function(msg){
    console.log(msg);

    var newTg = {
        source: {
            'origin':'telegram',
            'channel':msg.from.id.toString(),
            'org':'telegram',
            'id':'telegram' + "_" + msg.from.id, //for retrieving chat history in node memory,
        },
        'msg':msg.text
    }

    //console.log('asdf ',newTg);
    preProcess(newTg);
});



//get stored slack users from mongo
var initSlackUsers = function(env){
    console.log('loading with env: ',env);
    cinnaEnv = env;
    //load kip-pepper for testing
    if (env === 'development_alyx') {

        //KIP on Slack
        // var testUser = [{
        //     team_id:'T02PN3B25',
        //     dm:'D0H6X6TA8',
        //     bot: {
        //         bot_user_id: 'U0GRJ9BJS',
        //         bot_access_token:'xoxb-16868317638-4pB4v3sor5LNIu6jtIKsVLkB'
        //     },
        //     meta: {
        //         initialized: true
        //     }
        // }];

        //CINNA-PEPPER 
        // var testUser = [{
        //     team_id:'T0H72FMNK',
        //     dm:'D0H6X6TA8',
        //     bot: {
        //         bot_user_id: 'U0H6YHBNZ',
        //         bot_access_token:'xoxb-17236589781-HWvs9k85wv3lbu7nGv0WqraG'
        //     },
        //     meta: {
        //         initialized: false
        //     }
        // }];

        //KIP-PAPRIKA
        var testUser = [{
            team_id:'T02PN3B25',
            dm:'D0H6X6TA8',
            bot: {
                bot_user_id: 'U0H6YHBNZ',
                bot_access_token:'xoxb-29684927943-TWPCjfJzcObYRrf5MpX5YJxv'
            },
            meta: {
                initialized: true
            }
        }];


        loadSlackUsers(testUser);
    }else if (env === 'development_mitsu'){
        var testUser = [{
            team_id:'T0HLZP09L',
            dm:'D0HLZLBDM',
            bot: {
                bot_user_id: 'cinnatest',
                bot_access_token:'xoxb-17713691239-K7W7AQNH6lheX2AktxSc6NQX'
            },
            meta: {
                initialized: false
            }
        }];
        loadSlackUsers(testUser);
    }else if (env === 'development_peter'){
        var testUser = [{
            team_id:'T0R6J00JW',
            access_token: 'xoxp-25222000642-25226799463-25867504995-3fe258a2aa',
            bot: {
                bot_user_id: 'U0R6H9BKN',
                bot_access_token:'xoxb-25221317668-Dxc6t3qZmLa73JuiuHGrb7iD'
            },
            meta: {
                initialized: false
            }
        }];
        loadSlackUsers(testUser);
    }else{
        console.log('retrieving slackbots from mongo database ' + config.mongodb.url);
        Slackbots.find().exec(function(err, users) {
            if(err && process.env.NODE_ENV === 'production'){
                console.log('saved slack bot retrieval error');
                var mailOptions = {
                    to: 'Kip Server <hello@kipthis.com>',
                    from: 'Kip Server Status <server@kipthis.com>',
                    subject: 'mongo prob, restarting!',
                    text: 'Fix this ok thx'
                };
                mailerTransport.sendMail(mailOptions, function(err) {
                    if (err) console.log(err);
                    console.log('Server status email sent. Now restarting server.');
                    process.exit(1);
                });
            }
            else {
                loadSlackUsers(users);
            }
        });
    }
}

//fired when server gets /newslack route request
var newSlack = function(){
    //find all bots not added to our system yet
    Slackbots.find({'meta.initialized': false}).exec(function(err, users) {
        if(err){
            console.log('saved slack bot retrieval error');
        }
        else {
            loadSlackUsers(users);
            console.log('DEBUG: new slack team added with this data: ',users);
            res.send('slack user added');
        }
    });
}

//load slack users into memory, adds them as slack bots
function loadSlackUsers(users){
    console.log('loading '+users.length+' Slack users');

    async.eachSeries(users, function(user, callback) {


        var token = user.bot.bot_access_token || '';

        slackUsers[user.team_id] = new RtmClient(token);
        slackUsers_web[user.team_id] = new WebClient(token);

        slackUsers[user.team_id].start();

        //on slack auth
        slackUsers[user.team_id].on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
            console.log('DEBUG: checking meta initialized: ', user.meta);
            //* * * * Welcome message * * * //
            //send welcome to new teams – dont spam all slack people on node reboot

            if (rtmStartData.self){
                slackUsers[user.team_id].botId = rtmStartData.self.id;
                slackUsers[user.team_id].botName = rtmStartData.self.name;
            }

            //this if here for dev testing
            if (cinnaEnv === 'development_alyx'){
                //
                // Onboarding conversation
                //
                var hello = {
                    msg: 'welcome',
                    source: {
                      origin: 'slack',
                      channel: 'D0H6X6TA8',
                      org: user.team_id,
                      id: user.team_id + '_' + 'D0H6X6TA8'
                    },
                    action:'sendAttachment',
                    client_res: [],
                    botId: slackUsers[user.team_id].botId, //this is the name of the bot on the channel so we can @ the bot
                    botName: slackUsers[user.team_id].botName //this is the name of the bot on the channel so we can @ the bot
                };

                banter.welcomeMessage(hello, function(res) {
                    hello.client_res.push(res);
                    //send attachment!
                    sendResponse(hello);
                })
            } else if (cinnaEnv === 'development_mitsu'){
                //
                // Onboarding conversation
                //
                var hello = {
                    msg: 'welcome',
                    source: {
                      origin: 'slack',
                      channel: 'D0HLZLBDM',
                      org: user.team_id,
                      id: user.team_id + '_' + 'D0HLZLBDM'
                    },
                    action:'sendAttachment',
                    client_res: [],
                    botId: slackUsers[user.team_id].botId, //this is the name of the bot on the channel so we can @ the bot
                    botName: slackUsers[user.team_id].botName //this is the name of the bot on the channel so we can @ the bot
                };

                banter.welcomeMessage(hello, function(res) {
                    hello.client_res.push(res);
                    //send attachment!
                    sendResponse(hello);
                })
            }
            else if (user.meta && user.meta.initialized == false){
                init_team(user, function(e, addedBy) {
                    user.meta.initialized = true;
                    if (typeof user.save === 'function') {
                      user.save();
                    }

                    //
                    // Onboarding conversation
                    //
                    var hello = {
                        msg: 'welcome',
                        source: {
                          origin: 'slack',
                          channel: addedBy.dm,
                          org: user.team_id,
                          id: user.team_id + '_' + addedBy.dm
                        },
                        action:'sendAttachment',
                        client_res: [],
                        botId: slackUsers[user.team_id].botId, //this is the name of the bot on the channel so we can @ the bot
                        botName: slackUsers[user.team_id].botName //this is the name of the bot on the channel so we can @ the bot
                    };

                    banter.welcomeMessage(hello, function(res) {
                        hello.client_res.push(res);
                        //send attachment!
                        sendResponse(hello, res);

                        user.conversations = user.conversations || {};
                        user.conversations[addedBy.dm] = 'onboard';
                        return conversation_botkit.onboard(user, addedBy.id, function() {
                          console.log('done with onboarding conversation')
                          user.conversations[addedBy.dm] = false;
                        });
                    })

                })
            }

        });

        //on socket disconnect, but it should handle reconnect properly
        slackUsers[user.team_id].on(CLIENT_EVENTS.DISCONNECT, function () {
            // var mailOptions = {
            //     to: 'Kip Server <hello@kipthis.com>',
            //     from: 'kip disconnected, but should be fine <server@kipthis.com>',
            //     subject: 'kip disconnected, but should be fine',
            //     text: 'kip disconnected, but should be fine'
            // };
            // mailerTransport.sendMail(mailOptions, function(err) {
            //     if (err) console.log(err);
            // });
        });

        //on messages sent to Slack
        slackUsers[user.team_id].on(RTM_EVENTS.MESSAGE, function (data) {
            console.log('🔥')
            console.log(data);

            // don't talk to urself
            if (data.user === user.bot.bot_user_id) {
              console.log("don't talk to urself")
              return;
            }

            
            // welp it would be nice to get the history in context here but fuck it
            // idk how and i don't care this ship gonna burn before we scale out anyway
            user.conversations = user.conversations || {};


            // don't perform searches if ur having a convo with a bot
            // let botkit handle it
            if (user.conversations[data.channel]) {
              console.log('in a conversation: ' + user.conversations[data.channel])
              return;
            }


            // TESTING PURPOSES, here is how you would trigger a conversation
            if (data.text === 'onboard') {
              user.conversations[data.channel] = 'onboard';
              // "user" is actually the slackbot here
              // "data.user" is the user having the convo
              return conversation_botkit.onboard(user, data.user, function() {
                console.log('done with onboarding conversation')
                user.conversations[data.channel] = false;
              });
            }

            if (data.type == 'message' && data.username !== 'Kip' && data.hidden !== true && data.subtype !== 'channel_join' && data.subtype !== 'channel_leave'){ //settings.name = kip's slack username

                //public channel
                if (data.channel && data.channel.charAt(0) == 'C' || data.channel.charAt(0) == 'G'){
                    //if contains bot user id, i.e. if bot is @ mentioned in channel (example user id: U0H6YHBNZ)

                    if (data.text && data.text.indexOf(slackUsers[user.team_id].botId) > -1){

                        //someone sent a file to Kip
                        if (data.subtype && data.subtype  == 'file_share'){

                            //get team id from private URL cause team id left out of API in file share (ugh wtf slack...)
                            if (data.file && data.file.url_private){
                                var teamParse = data.file.url_private.replace('https://files.slack.com/files-pri/','');
                                data.team = teamParse.substr(0, teamParse.indexOf('-')); 
                            }

                            //it's an image, let's process it
                            if (data.file.filetype == 'png'||data.file.filetype == 'jpg'||data.file.filetype == 'jpeg'||data.file.filetype == 'gif'||data.file.filetype == 'svg'){
                                //send typing event 
                                if (slackUsers[data.team]){
                                    slackUsers[data.team].sendTyping(data.channel);
                                }
                                processData.imageSearch(data,slackUsers[user.team_id]._token,function(res){
                                    data.text = res;
                                    data.imageTags = res;
                                    incomingSlack(data);
                                });
                            }

                            //not an image file, let's return canned response
                            else {
                                var newTxt = {
                                    source: {
                                        'origin':'slack',
                                        'channel':data.channel,
                                        'org':data.team,
                                        'id':data.team + "_" + data.channel, //for retrieving chat history in node memory,
                                        user: data.user
                                    }
                                }
                                newTxt.client_res = [];
                                newTxt.client_res.push('Sorry, I\'m not very smart yet, I can only understand image files 👻');
                                cannedBanter(newTxt);
                            }
                        }
                        //not a file share, process normally
                        else {
                            data.text = data.text.replace(/(<([^>]+)>)/ig, ''); //remove <user.id> tag
                            if (data.text.charAt(0) == ':'){
                                data.text = data.text.substr(1); //remove : from beginning of string
                            }
                            data.text = data.text.trim(); //remove extra spaces on edges of string
                            incomingSlack(data);                
                        }

                    }
                }
                //direct message
                else if (data.channel && data.channel.charAt(0) == 'D'){

                    //someone sent a file to Kip
                    if (data.subtype && data.subtype  == 'file_share'){

                        //get team id from private URL cause team id left out of API in file share (ugh wtf slack...)
                        if (data.file && data.file.url_private){
                            var teamParse = data.file.url_private.replace('https://files.slack.com/files-pri/','');
                            data.team = teamParse.substr(0, teamParse.indexOf('-')); 
                        }
                        
                        //it's an image, let's process it
                        if (data.file.filetype == 'png'||data.file.filetype == 'jpg'||data.file.filetype == 'jpeg'||data.file.filetype == 'gif'||data.file.filetype == 'svg'){
                            //send typing event 
                            if (slackUsers[data.team]){
                                slackUsers[data.team].sendTyping(data.channel);
                            }
                            processData.imageSearch(data,slackUsers[user.team_id]._token,function(res){
                                data.text = res;
                                data.imageTags = res;
                                incomingSlack(data);
                            });
                        }
                        //not an image file, let's return canned response
                        else {
                            var newTxt = {
                                source: {
                                    'origin':'slack',
                                    'channel':data.channel,
                                    'org':data.team,
                                    'id':data.team + "_" + data.channel, //for retrieving chat history in node memory,
                                    user: data.user
                                }
                            }
                            newTxt.client_res = [];
                            newTxt.client_res.push('Sorry, I\'m not very smart yet, I can only understand image files 👻');
                            cannedBanter(newTxt);
                        }
                    }

                    //not a file share, process normally
                    else {
                        data.text = data.text.replace(/(<([^>]+)>)/ig, ''); //remove <user.id> tag
                        incomingSlack(data);              
                    }
                }
                else {
                    console.log('error: not handling slack channel type ',data.channel);
                }
            }
            function incomingSlack(data){
                if (data.type == 'message' && data.username !== 'Kip' && data.hidden !== true ){
                    var newSl = {
                        source: {
                            'origin':'slack',
                            'channel':data.channel,
                            'org':data.team,
                            'id':data.team + "_" + data.channel, //for retrieving chat history in node memory,
                            user: data.user
                        },
                        'msg':data.text
                    }
                    //carry image tags over 
                    if (data.imageTags){
                        newSl.imageTags = data.imageTags;
                    }
                    preProcess(newSl);
                }
            }
        });

        callback();
    }, function done(){
        console.log('done loading slack users');
    });
}


//- - - - Socket.io handling - - - -//

var loadSocketIO = function(server){
    io = require('socket.io').listen(server);
    io.sockets.on('connection', function(socket) {
        console.log("socket connected");

        //* * * * send welcome message
        var hello = {
            msg: 'welcome'
        }
        hello.source = {
            'origin':'socket.io',
            'channel':socket.id,
            'org':'kip',
            'id':'kip' + "_" + socket.id //for retrieving chat history in node memory
        }
        banter.welcomeMessage(hello,function(res){
            sendTxtResponse(hello,res);
        });
       // * * * * * * * * * * //

        socket.on("msgToClient", function(data) {
            data.source = {
                'origin':'socket.io',
                'channel':socket.id,
                'org':'kip',
                'id':'kip' + "_" + socket.id //for retrieving chat history in node memory
            }
            preProcess(data);
        });

        socket.on("msgFromSever", function(data) {
            // var items = {}
            // if (data.amazon && data.amazon[0] && data.amazon[0].ItemAttributes) {
            //     items = JSON.stringify(data.amazon.slice(0,3))
            // }
            console.log('\n\n\nReceived message from supervisor: ',data.flags,'\n\n\n')
            incomingAction(data);
        })
    });
}

//- - - - - - //

/////////// PROCESSING INCOMING //////////

//pre process incoming messages for canned responses
function preProcess(data){

    //setting up all the data for this user / org
    if (!data.source.org || !data.source.channel){
        console.log('missing channel or org Id 1');
    }
    if (!messageHistory[data.source.id]){ //new user, set up chat states
        messageHistory[data.source.id] = {};
        messageHistory[data.source.id].search = []; //random chats
        messageHistory[data.source.id].banter = []; //search
        messageHistory[data.source.id].purchase = []; //finalizing search and purchase
        messageHistory[data.source.id].persona = []; //learn about our user
        messageHistory[data.source.id].cart = []; //user shopping cart
        messageHistory[data.source.id].allBuckets = []; //all buckets, chronological chat history
    }

    data.msg = data.msg.trim();

    //check for canned responses/actions before routing to NLP
    banter.checkForCanned(data.msg,function(res,flag,query){

        //found canned response
        if(flag){
            data.client_res = [];
            switch(flag){
                case 'basic': //just respond, no actions
                    //send message
                    data.client_res = [];
                    data.client_res.push(res);
                    cannedBanter(data);
                    break;
                case 'search.initial':
                    //send message
                    data.client_res = [];
                    data.client_res.push(res);
                    cannedBanter(data);

                    //now search for item
                    data.tokens = [];
                    data.tokens.push(query); //search for this item
                    data.bucket = 'search';
                    data.action = 'initial';
                    incomingAction(data);
                    break;
                case 'search.focus':
                    data.searchSelect = [];
                    data.searchSelect.push(query);
                    data.bucket = 'search';
                    data.action = 'focus';
                    incomingAction(data);
                    break;
                case 'search.more':
                    data.bucket = 'search';
                    data.action = 'more';
                    incomingAction(data);
                    break;
                case 'purchase.remove':
                    data.searchSelect = [];
                    data.searchSelect.push(query);
                    data.bucket = 'purchase';
                    data.action = 'remove';
                    incomingAction(data);
                    break;
                case 'cancel': //just respond, no actions
                    //send message
                    console.log('Kip response cancelled');
                    break;
                default:
                    console.log('error: canned action flag missing');
            }
        }
        //proceed to NLP instead
        else {
            routeNLP(data);
        }
    },data.source.origin);

  //  });

}

//pushing incoming messages to python
function routeNLP(data){

    //sanitize msg before sending to NLP
    data.msg = data.msg.replace(/[^0-9a-zA-Z.]/g, ' ');
    data.flags = data.flags ? data.flags : {};

    if (data.msg){

        //passing a context (last 10 items in DB to NLP)
        history.recallContext(data,function(res){
            data.recallContext = res;
            continueNLP();
        });

        function continueNLP(){

            nlp.parse(data, function(e, res) {
                if (e){
                  console.log('NLP error ',e);
                  // Route to supervisor

                  data.flags.toSupervisor = true;
                  incomingAction(data);
                }
                else {
                    console.log('NLP RES ',res);

                    if (res.supervisor) {
                      data.flags.toSupervisor = true;
                    }

                    if(res.execute && res.execute.length > 0){

                        if(!res.execute[0].bucket){
                            res.execute[0].bucket = 'search';
                        }
                        if(!res.execute[0].action){
                            res.execute[0].execute[0].action = 'initial';
                        }

                        //- - - temp stuff to transfer nlp results to data object - - - //
                        if (res.execute[0].bucket){
                            data.bucket = res.execute[0].bucket;
                        }
                        if (res.execute[0].action){
                            data.action = res.execute[0].action;
                        }
                        if (res.tokens){
                            data.tokens = res.tokens;
                        }
                        if (res.searchSelect){
                            data.searchSelect = res.searchSelect;
                        }
                        if (res.execute[0].dataModify){
                            data.dataModify = res.execute[0].dataModify;
                        }
                        //- - - - end temp - - - - //

                        incomingAction(data);

                    }
                    else if (!res.bucket && !res.action && res.searchSelect && res.searchSelect.length > 0){
                        //IF got NLP that looks like { tokens: [ '1 but xo' ], execute: [], searchSelect: [ 1 ] }

                        //looking for modifier search
                        if (res.tokens && res.tokens[0].indexOf('but') > -1){
                            var modDetail = res.tokens[0].replace(res.searchSelect[0],''); //remove select num from string
                            modDetail = modDetail.replace('but','').trim();
                            console.log('mod string ',modDetail);

                            data.tokens = res.tokens;
                            data.searchSelect = res.searchSelect;
                            data.bucket = 'search';
                            data.action = 'modify';
                            data.dataModify = {
                                type:'genericDetail',
                                val:[modDetail]
                            };

                            console.log('constructor ',data);

                            incomingAction(data);
                        }
                        else {
                            data.tokens = res.tokens;
                            data.searchSelect = res.searchSelect;
                            data.bucket = 'search';
                            data.action = 'initial';

                            console.log('un struct ',data);

                            incomingAction(data);
                        }

                    }
                    else {

                        if(!res.bucket){
                            res.bucket = 'search';
                        }
                        if(!res.action){
                            res.action = 'initial';
                        }

                        //- - - temp stuff to transfer nlp results to data object - - - //
                        if (res.bucket){
                            data.bucket = res.bucket;
                        }
                        if (res.action){
                            data.action = res.action;
                        }
                        if (res.tokens){
                            data.tokens = res.tokens;
                        }
                        if (res.searchSelect){
                            data.searchSelect = res.searchSelect;
                        }
                        if (res.dataModify){
                            data.dataModify = res.dataModify;
                        }
                        //- - - - end temp - - - - //

                        incomingAction(data);

                    }
                }
            })
        }
    }
    else {
        //we get this if we killed the whole user request (i.e. they sent a URL)
        sendTxtResponse(data,'Oops sorry, I didn\'t understand your request');
    }

}

//incoming action responses from Slack buttons
var incomingSlackAction = function(data){

    console.log('incoming Slack action req.body ', data);

    var fakeAction = {
      "actions": [
        {
          "name": "approve",
          "value": "yes"
        }
      ],
      "callback_id": "approval_2715",
      "team": {
        "id": "2147563693",
        "domain": "igloohat"
      },
      "channel": {
        "id": "C065W1189",
        "name": "solipsistic-slide"
      },
      "user": {
        "id": "U045VRZFT",
        "name": "episod"
      },
      "action_ts": "1458170917.164398",
      "message_ts": "1458170866.000004",
      "attachment_id": "1",
      "token": "xAB3yVzGS4BQ3O9FACTa8Ho4",
      "response_url": "https://hooks.dev.slack.com/actions/T021BE7LD/6204672533/x7ZLaiVMoECAW50GwtZYAXEM"
    }

    //incoming action -> add `callback_id` to msg queue? 
    //nahhhhh

    //treat it like incomingslack 


}

//sentence breakdown incoming from python
function incomingAction(data){
//------------------------supervisor stuff-----------------------------------//
  if (data.bucket === 'response' || (data.flags && data.flags.toClient)) {

            if (data.bucket === 'response' || data.action === 'focus') {
                return sendResponse(data)
            } else {
                if (data.action === 'checkout') {
                    return outgoingResponse(data,'txt');
                } else {
                    return outgoingResponse(data,'txt','amazon');
                }
            }
   }
data.flags = data.flags ? data.flags : {};
//---------------------------------------------------------------------------//     
    history.saveHistory(data,true,function(res){
        supervisor.emit(res, true)
    });
    delete data.flags.toSupervisor
    //sort context bucket (search vs. banter vs. purchase)
    switch (data.bucket) {
        case 'search':
            searchBucket(data);
            break;
        case 'banter':
            banterBucket(data);
            break;
        case 'purchase':
            purchaseBucket(data);
            break;
        case 'supervisor':
            //route to supervisor chat window
        default:
            searchBucket(data);
    }
}

//* * * * * ACTION CONTEXT BUCKETS * * * * * * *//

function searchBucket(data){

    //* * * * typing event
    if (data.action == 'initial' || data.action == 'similar' || data.action == 'modify' || data.action == 'more'){
        if (data.source.origin == 'slack' && slackUsers[data.source.org]){
            slackUsers[data.source.org].sendTyping(data.source.channel);
        }
    }

    //sort search action type
    switch (data.action) {
        case 'initial':
            search.searchInitial(data);
            break;
        case 'similar':
            //----supervisor: flag to skip history.recallHistory step below ---//
            if (data.flags && data.flags.recalled) {
                 // console.log('Flagged "recalled", skipping recallHistory...')
                 search.searchSimilar(data);
            }
            //-----------------------------------------------------------------//
            else {
                history.recallHistory(data, function(res){
                if (res){
                    data.recallHistory = res;
                }
                search.searchSimilar(data);
                });
            }

            break;
        case 'modify':
        case 'modified': //because the nlp json is wack

            //fix NLP bug
            if (data.dataModify && data.dataModify.val && Array.isArray(data.dataModify.val)){
                if (data.dataModify.val[0] == 'cheeper' || data.dataModify.val[0] == 'cheper' || data.dataModify.val[0] == 'chiper' || data.dataModify.val[0] == 'chaper' || data.dataModify.val[0] == 'chaeper'){
                    data.dataModify.type = 'price';
                    data.dataModify.param = 'less';
                }
            }

            //----supervisor: flag to skip history.recallHistory step below ---//
            if (data.flags && data.flags.recalled) {
                 // console.log('Flagged "recalled", skipping recallHistory...')
                 search.searchModify(data);
            }
            //-----------------------------------------------------------------//
            else {
                history.recallHistory(data, function(res){
                    if (res){
                        data.recallHistory = res;
                    }
                    search.searchModify(data);
                });
            }
            break;
        case 'focus':
          //----supervisor: flag to skip history.recallHistory step below ---//
            if (data.flags && data.flags.recalled) {
                    // console.log('Flagged "recalled", skipping recallHistory...')
                    search.searchFocus(data);
            }
            //-----------------------------------------------------------------//
            else {
            history.recallHistory(data, function(res){
                    if (res){
                        data.recallHistory = res;
                    }
                    search.searchFocus(data);
                });
            }
            break;
        case 'back':
            //search.searchBack(data);
            break;
        case 'more':
            //----supervisor: flag to skip history.recallHistory step below ---//
            if (data.flags && data.flags.recalled) {
                    // console.log('Flagged "recalled", skipping recallHistory...')
                    search.searchMore(data);
            }
            //-----------------------------------------------------------------//
            history.recallHistory(data, function(res){
                if (res){
                    data.recallHistory = res;
                }
                search.searchMore(data); //Search more from same query
            });
            break;
        default:
            search.searchInitial(data);
    }
}

function banterBucket(data){
    //sort search action type
    switch (data.action) {
        case 'question':
            break;
        case 'smalltalk':
            outgoingResponse(data,'txt');
            break;
        default:
    }
}

function purchaseBucket(data){
    //sort purchase action
    switch (data.action) {
        case 'save':
            saveToCart(data);
            break;
        case 'remove':
            removeCartItem(data);
            break;
        case 'removeAll':
            removeAllCart(data);
            break;
        case 'list':
            viewCart(data);
            break;
        case 'checkout':
            viewCart(data);
            break;
        default:
            console.log('error: no purchase bucket action selected');
    }
}


/////////// OUTGOING RESPONSES ////////////

//process canned message stuff
//data: kip data object
var cannedBanter = function(data){
    data.bucket = 'banter';
    data.action = 'smalltalk';
    incomingAction(data);
}

var sendTxtResponse = function(data,msg){
    data.action = 'smallTalk';
    if (!msg){
        console.log('error: no message sent with sendTxtResponse(), using default');
        msg = 'Sorry, I didn\'t understand';
    }
    data.client_res = [];
    data.client_res.push(msg);
    sendResponse(data);
}

//Constructing reply to user
var outgoingResponse = function(data,action,source) { //what we're replying to user with
// console.log('Mitsu: iojs668: OUTGOINGRESPONSE DATA ', data)
    //stitch images before send to user
    if (action == 'stitch'){
        picstitch.stitchResults(data,source,function(urlArr){
            //sending out stitched image response
            data.client_res = [];
            data.urlShorten = [];
            processData.urlShorten(data,function(res){
                var count = 0;
                //put all result URLs into arr
                async.eachSeries(res, function(i, callback) {
                    data.urlShorten.push(i);//save shortened URLs

                    processData.getNumEmoji(data,count+1,function(emoji){
                        res[count] = res[count].trim();
                        if (data.source.origin == 'slack'){
                            var attachObj = {};


                            // var actionObj = [
                            //     {
                            //       "name": "AddCart",
                            //       "text": ":thumbsup: Add to Cart",
                            //       "style": "primary",
                            //       "type": "button",
                            //       "value": "yes",
                            //       "confirm": {
                            //         "title": "Are you sure?",
                            //         "text": "This will approve the request.",
                            //         "ok_text": "Yes",
                            //         "dismiss_text": "No"
                            //       }
                            //     },
                            //     {
                            //       "name": "Buy",
                            //       "text": ":thumbsdown: Buy",
                            //       "style": "danger",
                            //       "type": "button",
                            //       "value": "no"
                            //     },
                            //     {
                            //       "name": "Similar",
                            //       "text": ":heart: Similar",
                            //       "style": "success",
                            //       "type": "button",
                            //       "value": "no"
                            //     },
                            //     {
                            //       "name": "Cheaper",
                            //       "text": ":money_with_wings: Cheaper",
                            //       "style": "default",
                            //       "type": "button",
                            //       "value": "no"
                            //     },
                            //     {
                            //       "name": "Moreinfo",
                            //       "text": ":thumbsdown: More Info",
                            //       "style": "success",
                            //       "type": "button",
                            //       "value": "no"
                            //     }
                            // ];

                            attachObj.image_url = urlArr[count];
                            //attachObj.actions = actionObj;
                            attachObj.title = emoji + ' ' + truncate(data.amazon[count].ItemAttributes[0].Title[0]);
                            attachObj.title_link = res[count];
                            attachObj.color = "#45a5f4";
                            attachObj.fallback = 'Here are some options you might like';
                            data.client_res.push(attachObj);
                            // '<'++' | ' + +'>';
                        }else if (data.source.origin == 'socket.io'){
                            data.client_res.push(emoji + '<a target="_blank" href="'+res[count]+'"> ' + truncate(data.amazon[count].ItemAttributes[0].Title[0])+'</a>');
                            data.client_res.push(urlArr[count]);
                        }
                        else if (data.source.origin == 'telegram'){
                            var attachObj = {};
                            attachObj.photo = urlArr[count];
                            attachObj.message =  emoji + '[' + truncate(data.amazon[count].ItemAttributes[0].Title[0]) + ']('+ res[count] +')';
                            data.client_res.push(attachObj);
                        }
                        count++;
                        callback();
                    });
                }, function done(){
                    checkOutgoingBanter(data);
                });
            });
            // function compileResults(){
            // }
            // data.client_res.push(url); //add image results to response
            // //send extra item URLs with image responses
            // if (data.action == 'initial' || data.action == 'similar' || data.action == 'modify' || data.action == 'more'){
            //     processData.urlShorten(data,function(res){
            //         var count = 0;
            //         //put all result URLs into arr
            //         async.eachSeries(res, function(i, callback) {
            //             data.urlShorten.push(i);//save shortened URLs
            //             processData.getNumEmoji(data,count+1,function(emoji){
            //                 res[count] = res[count].trim();
            //                 if (data.source.origin == 'slack'){
            //                     data.client_res.push('<'+res[count]+' | ' + emoji + ' ' + truncate(data.amazon[count].ItemAttributes[0].Title[0])+'>');
            //                 }else if (data.source.origin == 'socket.io'){
            //                     data.client_res.push(emoji + '<a target="_blank" href="'+res[count]+'"> ' + truncate(data.amazon[count].ItemAttributes[0].Title[0])+'</a>');
            //                 }

            //                 count++;
            //                 callback();
            //             });
            //         }, function done(){
            //             checkOutgoingBanter(data);
            //         });
            //     });
            // }
            // else {
            //     checkOutgoingBanter(data);
            // }
        });
    }
    else if (action == 'txt'){

        banter.getCinnaResponse(data,function(res){
            if(res && res !== 'null'){
                // data.client_res = [];
                // data.client_res.push(res);
                data.client_res.unshift(res);
            }
            sendResponse(data);
        });
    }
    //no cinna response check
    else if (action == 'final'){
        sendResponse(data);
    }
}

//check for extra banter to send with message.
var checkOutgoingBanter = function(data){
    banter.getCinnaResponse(data,function(res){
        if(res && res !== 'null'){
            data.client_res.unshift(res); // add to beginning of message
             // console.log('mitsu6')

            sendResponse(data);
        }
        else {
             // console.log('mitsu7', res)
            sendResponse(data);
        }
    });
}

//send back msg to user, based on source.origin
var sendResponse = function(data){

    //SAVE OUTGOING MESSAGES TO MONGO
    if (data.bucket && data.action && !(data.flags && data.flags.searchResults)){
        console.log('SAVING OUTGOING RESPONSE');
        history.saveHistory(data,false,function(res){
            //whatever
        }); //saving outgoing message
        //});
    }
    else {
        console.log('error: cant save outgoing response, missing bucket or action');
    }
    /// / / / / / / / / / /

    //* * * * * * * * 
    // Socket.io Outgoing
    //* * * * * * * * 
    if (data.source && data.source.channel && data.source.origin == 'socket.io'){
        //check if socket user exists
        if (io.sockets.connected[data.source.channel]){
            // console.log('io625: getting here')
            //loop through responses in order
            for (var i = 0; i < data.client_res.length; i++) {
                io.sockets.connected[data.source.channel].emit("msgFromSever", {message: data.client_res[i]});
            }
        }
        //---supervisor: relay search result previews back to supervisor---//
        else if (data.source.channel && data.source.origin == 'supervisor') {
               data.flags = {searchResults: true}
               var proxy = data
               delete proxy.amazon
               supervisor.emit(data)
        }
        //----------------------------------------------------------------//
        else {
            console.log('error: socket io channel missing', data);
        }
    }
    //* * * * * * * * 
    // Telegram Outgoing
    //* * * * * * * * 
    else if (data.source && data.source.channel && data.source.origin == 'telegram'){


        if (data.action == 'initial' || data.action == 'modify' || data.action == 'similar' || data.action == 'more'){

            var message = data.client_res[0]; //use first item in client_res array as text message
            console.log('attachthis ',message);

            tg.sendMessage({
                chat_id: data.source.channel,
                text: message
                // parse_mode: 'Markdown',
                // disable_web_page_preview: false
            })


            //remove first message from res arr
            var attachThis = data.client_res;
            attachThis.shift();

            //attachThis = JSON.stringify(attachThis);

            // console.log('attachthis ',attachThis);

          

            async.eachSeries(attachThis, function(attach, callback) {
                console.log('photo ',attach.photo);
                console.log('message ',attach.message);
                console.log('client_res', data.client_res)
                 upload.uploadPicture('telegram', attach.photo, 100, true).then(function(buffer) {
                     tg.sendMessage({
                                chat_id: data.source.channel,
                                text: attach.message,
                                parse_mode: 'Markdown',
                                disable_web_page_preview: 'true'
                   
                     }).then(function(datum){
                              tg.sendPhoto({
                        chat_id: encode_utf8(data.source.channel),
                        photo: encode_utf8(buffer)
                            }).then(function(datum){ 
                                // var field = {
                                //     "value": attach,
                                //     "short":false
                                // }
                                // attachments[1].fields.push(field);
                                callback();
                            }).catch(function(err){
                                if (err) { console.log('ios.js1285: err',err) }
                                callback();
                            })
                        }).catch(function(err){
                            if (err) {
                                // console.log('\n\n\ntg.sendPhoto error: ',err)
                            }
                            callback();
                        })
                    }).catch(function(err) {
                        if (err)  console.log('\n\n\niojs image upload error: ',err,'\n\n\n')
                        callback();
                    })
            }, function done(){


            });

            // var msgData = {
            //   // attachments: [...],
            //     icon_url:'http://kipthis.com/img/kip-icon.png',
            //     username:'Kip',
            //     attachments: attachThis
            // };
            // slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {});

        }
        else if (data.action == 'focus'){

               console.log('client_res', data.client_res)

               try {
                 var formatted = '[' + data.client_res[1].split('|')[1].split('>')[0] + '](' + data.client_res[1].split('|')[0].split('<')[1]
                 formatted = formatted.slice(0,-1)
                 formatted = formatted + ')'
               } catch(err) {
                 console.log('\n\n\n\n\n DOFLAMINGO',err)
                 return
               }
              data.client_res[1] = formatted ? formatted : data.client_res[1]
              var toSend = data.client_res[1] + '\n' + data.client_res[2] + '\n' + truncate(data.client_res[3]) + '\n' + data.client_res[4]
               console.log('formatted : ',formatted)
               upload.uploadPicture('telegram', data.client_res[0],100, true).then(function(buffer) {
                 tg.sendPhoto({
                    chat_id: encode_utf8(data.source.channel),
                    photo: encode_utf8(buffer)
                  }).then(function(datum){
                    tg.sendMessage({
                        chat_id: data.source.channel,
                        text: toSend,
                        parse_mode: 'Markdown',
                        disable_web_page_preview: 'true'
                    })
                  })
                }).catch(function(err){
                    if (err) { console.log('ios.js1285: err',err) }

                })

              // console.log('photo ',attach.photo);
              //   console.log('message ',attach.message);


            // var attachments = [
            //     {
            //         "color": "#45a5f4"
            //     },
            //     {
            //         "color": "#45a5f4",
            //         "fields":[]
            //     }
            // ];

            // //remove first message from res arr
            // var attachThis = data.client_res;

            // attachments[0].image_url = attachThis[0]; //add image search results to attachment
            // attachments[0].fallback = 'More information'; //fallback for search result

            // attachThis.shift(); //remove image from array

            // attachments[1].fallback = 'More information';
            // //put in attachment fields
            // async.eachSeries(attachThis, function(attach, callback) {
            //     //attach = attach.replace('\\n','');
            //     var field = {
            //         "value": attach,
            //         "short":false
            //     }
            //     attachments[1].fields.push(field);
            //     callback();

            // }, function done(){

            //     attachments = JSON.stringify(attachments);

            //     var msgData = {
            //       // attachments: [...],
            //         icon_url:'http://kipthis.com/img/kip-icon.png',
            //         username:'Kip',
            //         attachments: attachments
            //     };
            //     slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {});

            // });
        }else if (data.action == 'sendAttachment'){

            // //remove first message from res arr
            // var attachThis = data.client_res;
            // attachThis = JSON.stringify(attachThis);

            // var msgData = {
            //   // attachments: [...],
            //     icon_url:'http://kipthis.com/img/kip-icon.png',
            //     username:'Kip',
            //     attachments: attachThis
            // };
            // slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {});

        }
        else {
            //loop through responses in order
            async.eachSeries(data.client_res, function(message, callback) {
                tg.sendMessage({
                    chat_id: data.source.channel,
                    text: message
                    // caption: 'This is my test image',

                    // // you can also send file_id here as string (as described in telegram bot api documentation)
                    // photo: '/path/to/file/test.jpg'
                })
                callback();
            }, function done(){
            });
        }

    }
    //* * * * * * * * 
    // Slack Outgoing
    //* * * * * * * * 
    else if (data.source && data.source.channel && data.source.origin == 'slack' || (data.flags && data.flags.toClient)){

        //eventually cinna can change emotions in this pic based on response type
        var params = {
            icon_url: 'http://kipthis.com/img/kip-icon.png'
        }
        //check if slackuser exists
        if (slackUsers[data.source.org]){

            if (data.action == 'initial' || data.action == 'modify' || data.action == 'similar' || data.action == 'more'){

                var message = data.client_res[0]; //use first item in client_res array as text message

                //remove first message from res arr
                var attachThis = data.client_res;
                attachThis.shift();

                attachThis = JSON.stringify(attachThis);

                var msgData = {
                  // attachments: [...],
                    icon_url:'http://kipthis.com/img/kip-icon.png',
                    username:'Kip',
                    attachments: attachThis
                };
                slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {});

            }
            else if (data.action == 'focus'){
                var attachments = [
                    {
                        "color": "#45a5f4"
                    },
                    {
                        "color": "#45a5f4",
                        "fields":[]
                    }
                ];

                //remove first message from res arr
                var attachThis = data.client_res;

                attachments[0].image_url = attachThis[0]; //add image search results to attachment
                attachments[0].fallback = 'More information'; //fallback for search result

                // var actionObj = [
                //     {
                //       "name": "AddCart",
                //       "text": ":thumbsup: Add to Cart",
                //       "style": "primary",
                //       "type": "button",
                //       "value": "yes",
                //       "confirm": {
                //         "title": "Are you sure?",
                //         "text": "This will approve the request.",
                //         "ok_text": "Yes",
                //         "dismiss_text": "No"
                //       }
                //     }
                // ];
                // attachments[0].actions = actionObj;

                attachThis.shift(); //remove image from array

                attachments[1].fallback = 'More information';
                //put in attachment fields
                async.eachSeries(attachThis, function(attach, callback) {
                    //attach = attach.replace('\\n','');
                    var field = {
                        "value": attach,
                        "short":false
                    }
                    attachments[1].fields.push(field);
                    callback();

                }, function done(){

                    attachments = JSON.stringify(attachments);

                    var msgData = {
                      // attachments: [...],
                        icon_url:'http://kipthis.com/img/kip-icon.png',
                        username:'Kip',
                        attachments: attachments
                    };
                    slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {});

                });
            }else if (data.action == 'sendAttachment' || data.bucket == 'purchase' && (data.action == 'list' || data.action == 'checkout')){

                //remove first message from res arr
                var attachThis = data.client_res;
                attachThis = JSON.stringify(attachThis);

                var msgData = {
                  // attachments: [...],
                    icon_url:'http://kipthis.com/img/kip-icon.png',
                    username:'Kip',
                    attachments: attachThis
                };
                slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {});

            }
            else {

                // var sryObj = [
                //     {
                //       "text": "I would like six pens for my creation station please.",
                //       "fallback": "Pen request",
                //       "title": "Request approval",
                //       "callback_id": "approval_2715",
                //       "color": "#8A2BE2",
                //       "attachment_type": "default",
                //       "actions": [
                //         {
                //           "name": "approve",
                //           "text": ":thumbsup: Approve",
                //           "style": "primary",
                //           "type": "button",
                //           "value": "yes",
                //           "confirm": {
                //             "title": "Are you sure?",
                //             "text": "This will approve the request.",
                //             "ok_text": "Yes",
                //             "dismiss_text": "No"
                //           }
                //         },
                //         {
                //           "name": "decline",
                //           "text": ":thumbsdown: Decline",
                //           "style": "danger",
                //           "type": "button",
                //           "value": "no"
                //         }
                //       ]
                //     }
                //   ]
                

                // var attachThis = sryObj;
                // attachThis = JSON.stringify(attachThis);

                // var msgData = {
                //   // attachments: [...],
                //     icon_url:'http://kipthis.com/img/kip-icon.png',
                //     username:'Kip',
                //     text: 'You have a new request to approve.',
                //     attachments: attachThis
                // };

                // console.log('message ',message);
                // slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {});



                //loop through responses in order
                async.eachSeries(data.client_res, function(message, callback) {
                    var msgData = {
                      // attachments: [...],
                        icon_url:'http://kipthis.com/img/kip-icon.png',
                        username:'Kip'
                    };
                    slackUsers_web[data.source.org].chat.postMessage(data.source.channel, message, msgData, function() {
                        callback();
                    });
                }, function done(){
                });

            }


        }else {
            console.log('error: slackUsers channel missing', slackUsers);
        }
    }
     //---supervisor: relay search result previews back to supervisor---//
    else if (data.source && data.source.channel && data.source.origin == 'supervisor'){
        console.log('Sending results back to supervisor..')
       data.flags = {searchResults: true}
        // console.log('Supervisor: 728 emitting', data)
        supervisor.emit(data)
    }
    //----------------------------------------------------------------//
    else {
        console.log('error: data.source.channel or source.origin missing')
    }


}



/////////// tools /////////////


//* * * * * * ORDER ACTIONS TEMP!!!!! * * * * * * * * //

//save amazon item to cart
var saveToCart = function(data){

       //----supervisor: flag to skip history.recallHistory step below ---//
        if (data.flags && data.flags.recalled) {
            // console.log('\n\n\nDATA.FLAGS RECALLED!!!', data.flags)
            var cartHistory = { cart: [] }
              //async push items to cart
            // async.eachSeries(data.searchSelect, function(searchSelect, callback) {
                // if (item.recallHistory && item.recallHistory.amazon){
                    // proxy.cart.push(data.amazon[data.searchSelect - 1]); //add selected items to cart
                // }else {
                   cartHistory.cart.push(data.amazon[data.searchSelect[0] - 1]); //add selected items to cart
                // }
                // callback();
            // }, function done(){
            console.log('\n\n\nio930: SUPERVISOR cartHistory: ', cartHistory,'\n\n\n')
              if (cartHistory.cart.length == 0) {
                console.log('No items in proxy cart: io.js : Line 933', cartHistory)
                return
            } else {
                 // console.log('\n\n\n\n\n I mean brah it shouldnt be coming here....',data.source.id,messageHistory,'\n\n\n\n\n\n')
                  purchase.outputCart(data, cartHistory,function(res){
                    // processData.urlShorten(res, function(res2){
                        res.client_res = [res.client_res];
                        // res.client_res.push(res2);
                        // console.log('Mitsu937ios: res2 = :',res2)
                        // var proxy = res
                        // delete proxy.amazon
                        // console.log('Mitsu iojs935: ', JSON.stringify(res.client_res))

                        outgoingResponse(res,'txt');
                    });
                // });
            // });
            return
            }
        }
        //-----------------------------------------------------------------//

    data.bucket = 'search'; //modifying bucket to recall search history. a hack for now

    history.recallHistory(data, function(item){
        data.bucket = 'purchase'; //modifying bucket. a hack for now
        // console.log('\n\n\nio1288 ok for real doe whats item: ',item)
        //no saved history search object
        if (!item){
            console.log('\n\n\n\nwarning: NO ITEMS TO SAVE TO CART from data.amazon\n\n\n');
            //cannedBanter(data,'Oops sorry, I\'m not sure which item you\'re referring to');
            sendTxtResponse(data,'Oops sorry, I\'m not sure which item you\'re referring to');
        }
        else {

            // co lets us use "yield" to with promises to untangle async shit
            co(function*() {
              for (var index = 0; index < data.searchSelect.length; index++) {
                  var searchSelect = data.searchSelect[index];
                  console.log('adding searchSelect ' + searchSelect);
                  if (item.recallHistory && item.recallHistory.amazon){
                      messageHistory[data.source.id].cart.push(item.recallHistory.amazon[searchSelect - 1]); //add selected items to cart
                      yield kipcart.addToCart(data.source.org, data.source.user, item.recallHistory.amazon[searchSelect - 1])
                  } else {
                      messageHistory[data.source.id].cart.push(item.amazon[searchSelect - 1]); //add selected items to cart
                      yield kipcart.addToCart(data.source.org, data.source.user, item.amazon[searchSelect - 1])
                  }
              }

              console.log('retrieving cart')
              var cart = yield kipcart.getCart(data.source.org);
              console.log(cart);

              data.client_res = ['<' + cart.link + '|» View Cart>']
              outgoingResponse(data, 'txt');

            }).then(function(){}).catch(function(err) {
                console.log(err);
                console.log(err.stack)
                return;
                sendTxtResponse(data, err);

                //send email about this issue
                var mailOptions = {
                    to: 'Kip Server <hello@kipthis.com>',
                    from: 'Kip save tp cart broke <server@kipthis.com>',
                    subject: 'Kip save tp cart broke',
                    text: 'Fix this ok thx'
                };
                mailerTransport.sendMail(mailOptions, function(err) {
                    if (err) console.log(err);
                });
            })
        }
    });
}

function removeCartItem(data){

    if (data.searchSelect && data.searchSelect.length > 0 ){
        kipcart.removeFromCart(data.searchSelect[0]); //remove the item by number 
    }

    // co lets us use "yield" to with promises to untangle async shit
    co(function*() {
      for (var index = 0; index < data.searchSelect.length; index++) {
          var searchSelect = data.searchSelect[index];
          console.log('removing searchSelect ' + searchSelect);

          yield kipcart.removeFromCart(data.source.org,searchSelect - 1);
      }

      data.client_res = ['Item '+searchSelect.toString()+'⃣ removed from your cart. Type `view cart` to see your updated cart']
      outgoingResponse(data, 'txt');

    }).then(function(){}).catch(function(err) {
        console.log(err);
        console.log(err.stack)
        return;
        sendTxtResponse(data, err);
    })
}

function viewCart(data){

    console.log('view cart')
    db.Metrics.log('cart.view', data);

    console.log(data.source)

    kipcart.getCart(data.source.org).then(function(cart) {
      var cartObj = cart.aggregate_items.map(function(item, index) {

        var userString = item.added_by.map(function(u) {
          return '<@' + u + '>';
        }).join(', ')

        return {
          text: `${processData.emoji[index+1].slack} <${item.link}|${item.title}> \n *${item.price}* each \n Quantity: ${item.quantity} \n _Added by: ${userString}_`,
          mrkdwn_in: ['text', 'pretext'],
          thumb_url: item.image
        }
      })

      cartObj.push({
        text: `_Summary: Team Cart_ \n Total: *${cart.total}* \n <${cart.link}|» Purchase Items >`,
        mrkdwn_in: ['text', 'pretext'],
        color: '#45a5f4'
      })

      data.client_res = cartObj;
      sendResponse(data);

    }).catch(function(e) {
      console.log('error retriving cart for view cart')
      console.log(e.stack);
    })
}

//get user history
function recallHistory(data,callback,steps){

    // console.log(steps);
    if (!data.source.org || !data.source.channel){
        console.log('missing channel or org Id 3');
    }

    if(!messageHistory[data.source.id]){
        callback();
    }
    else {

        //if # of steps to recall
        if (!steps){
            var steps = 1;
        }
        //get by bucket type
        switch (data.bucket) {
            case 'search':
                //console.log(data);

                switch(data.action){
                    //if action is focus, find lastest 'initial' item
                    case 'focus':
                        var result = messageHistory[data.source.id].search.filter(function( obj ) {
                          return obj.action == 'initial';
                        });
                        var arrLength = result.length - steps;
                        callback(result[arrLength]);
                        break;

                    default:
                        var arrLength = messageHistory[data.source.id].search.length - steps; //# of steps to reverse. default is 1
                        callback(messageHistory[data.source.id].search[arrLength]); //get last item in arr
                        break;
                }

                break;
            case 'banter':
                var arrLength = messageHistory[data.source.id].banter.length - steps; //# of steps to reverse. default is 1
                callback(messageHistory[data.source.id].banter[arrLength]); //get last item in arr
                break;
            case 'purchase':
                var arrLength = messageHistory[data.source.id].purchase.length - steps; //# of steps to reverse. default is 1
                callback(messageHistory[data.source.id].purchase[arrLength]); //get last item in arr
            default:
        }

    }


}

/////TOOLS

//trim a string to char #
function truncate(string){
   if (string.length > 55)
      return string.substring(0,55)+'...';
   else
      return string;
};

function encode_utf8(s) {
  return unescape(encodeURIComponent(s));
}

/// exports
module.exports.initSlackUsers = initSlackUsers;
module.exports.newSlack = newSlack;
module.exports.incomingSlackAction = incomingSlackAction;
module.exports.loadSocketIO = loadSocketIO;

module.exports.sendTxtResponse = sendTxtResponse;
module.exports.cannedBanter = cannedBanter;
module.exports.outgoingResponse = outgoingResponse;
module.exports.checkOutgoingBanter = checkOutgoingBanter;
module.exports.saveToCart = saveToCart;

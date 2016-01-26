var async = require('async');
var request = require('request');

var Bot = require('../slackbots_modified'); //load slack api

var banter = require("./banter.js");
var history = require("./history.js");
var search = require("./search.js");
var picstitch = require("./picstitch.js");
var processData = require("./process.js");
var purchase = require("./purchase.js");

var nlp = require('../../nlp/api');

//set env vars
var config = require('config');

//load mongoose models
var db = require('db');
var Message = db.Message;
var Slackbots = db.Slackbots;

var slackUsers = {};
var messageHistory = {}; //fake database, stores all users and their chat histories
var io; //global socket.io var...probably a bad idea, idk lol
var supervisor = require('./supervisor')

/////////// LOAD INCOMING ////////////////

//get stored slack users from mongo
var initSlackUsers = function(env){
    console.log('loading with env: ',env);
    //load kip-pepper for testing
    if (env === 'development_alyx') {
        var testUser = [{
            team_id:'T0H72FMNK',
            bot: {
                bot_user_id: 'U0H6YHBNZ',
                bot_access_token:'xoxb-17236589781-HWvs9k85wv3lbu7nGv0WqraG'
            },
            meta: {
                initialized: false
            }
        }];
        loadSlackUsers(testUser);
    }else if (env === 'development_mitsu'){
        var testUser = [{
            team_id:'T0H72FMNK',
            bot: { 
                bot_user_id: 'cinnatest',
                bot_access_token:'xoxb-17713691239-K7W7AQNH6lheX2AktxSc6NQX'
            },
            meta: {
                initialized: false
            }
        }];
        loadSlackUsers(testUser);
    }
    else {
        console.log('retrieving slackbots from mongo');
        Slackbots.find().exec(function(err, users) {
            if(err){
                console.log('saved slack bot retrieval error');
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

        if (user.bot && !user.bot.bot_access_token && !user.bot.bot_user_id){
            console.log('ERROR: bot token and id missing from DB for ',user);
        }

        var settings = {
            token: user.bot.bot_access_token,
            name: 'Kip'
        };

        //create new bot from user settings
        slackUsers[user.team_id] = new Bot(settings);
        slackUsers[user.team_id].botId = user.bot.bot_user_id;

        //init new bot
        slackUsers[user.team_id].on('start', function() {

            console.log('DEBUG: checking for meta initialized false', user.meta);
            //* * * * Welcome message * * * //
            //send welcome to new teams – dont spam all slack people on node reboot
            if (user.meta && user.meta.initialized == false){

                //* * * * send welcome message
                //get list of users in team
                request('https://slack.com/api/im.list?token='+user.bot.bot_access_token+'', function(err, res, body) {
                  if(err){
                    console.log('requesting new team user list error: ',err);
                  }
                  else {
                    body = JSON.parse(body);

                    if (body.ok && body.ims.length > 0){
                        //loop through members, commence welcome!
                        async.eachSeries(body.ims, function(member, callback) {

                            if (member.is_user_deleted == false && member.is_im == true && member.user !== 'USLACKBOT'){
                                var hello = {
                                    msg: 'welcome'
                                }
                                hello.source = {
                                    'origin':'slack',
                                    'channel':member.id,
                                    'org':user.team_id,
                                    'id':user.team_id + "_" + member.id //for retrieving chat history in node memory
                                }
                                banter.welcomeMessage(hello,function(res){
                                    sendTxtResponse(hello,res);
                                });
                            }
                            callback();
                        }, function done(){
                            console.log('finished sending out welcome messages to new team');
                        });
                    }
                    else {
                        console.log('error: something happened, a ghost slack team emerged');
                    }
                  }
                });
                
                //* * * * * POST PROCESSING * * * * * * //
                //find all bots not added to our system yet
                Slackbots.find({'meta.initialized': false}).exec(function(err, users) {
                    if(err){
                        console.log('saved slack bot retrieval error');
                    }
                    else {
                        //update all to initialized
                        async.eachSeries(users, function(user, callback) {
                            user.meta.initialized = true;
                            user.save( function(err, data){
                                if(err){
                                    console.log('Mongo err ',err);
                                }
                                else{
                                    console.log('mongo res, updated meta initialized ',data);
                                }
                                callback();
                            });
                        }, function done(){
                            console.log('initialized all new bots');
                        });
                    }
                });

            }
            // * * * * * * * * * * //

            //on message from slack user
            slackUsers[user.team_id].on('message', function(data) { //on bot message
                // all incoming events https://api.slack.com/rtm
                // if (data.type == 'presence_change'){
                //     console.log('CHANGEGEE ',doneata);
                //     slackUsers[user.team_id].botId = data.user; //get bot user id for slack team
                // }
                if (data.type == 'message' && data.username !== settings.name && data.hidden !== true){ //settings.name = kip's slack username
                    //public channel
                    if (data.channel && data.channel.charAt(0) == 'C'){
                        //if contains bot user id, i.e. if bot is @ mentioned in channel (example user id: U0H6YHBNZ) 
                        if (data.text && data.text.indexOf(slackUsers[user.team_id].botId) > -1){ 
                            data.text = data.text.replace(/(<([^>]+)>)/ig, ''); //remove <user.id> tag
                            if (data.text.charAt(0) == ':'){
                                data.text = data.text.substr(1); //remove : from beginning of string
                            }
                            data.text = data.text.trim(); //remove extra spaces on edges of string
                            incomingSlack(data);
                        }
                    }
                    //direct message
                    else if (data.channel && data.channel.charAt(0) == 'D'){
                        incomingSlack(data);
                    }    
                }
                function incomingSlack(data){
                    if (data.type == 'message' && data.username !== settings.name && data.hidden !== true ){
                        var newSl = {
                            source: {
                                'origin':'slack',
                                'channel':data.channel,
                                'org':data.team,
                                'id':data.team + "_" + data.channel, //for retrieving chat history in node memory,
                            },
                            'msg':data.text
                        }
                        preProcess(newSl);
                    }                    
                }
            });
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
            console.log('Received message from supervisor', data)
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
    data.msg = data.msg.replace(/[^\w\s]/gi, ''); 

    nlp.parse(data.msg, function(e, res) {
        if (e){console.log('NLP error ',e)}
        else {
            console.log('NLP RES ',res);

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

    })
}

//sentence breakdown incoming from python
function incomingAction(data){


    //---supervisor stuff---//
    if (data.bucket === 'response') {
            return sendResponse(data)
         }
    console.log('Supervisor: 372 ',data)
    supervisor.emit(data, true)

    
    //----------------------//


    //save a new message obj
    history.saveHistory(data,true); //saving incoming message
    
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
        if (data.source.origin == 'slack'){
            console.log('Io.js: line 423: ', slackUsers)
            slackUsers[data.source.org].postTyping(data.source.channel);
        }
    }

    //sort search action type
    switch (data.action) {
        case 'initial':
            search.searchInitial(data);
            break;
        case 'similar':
            //----supervisor: flag to skip history.recallHistory step below ---//
            if (data.flag && data.flag === 'recalled') { 
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
            //----supervisor: flag to skip history.recallHistory step below ---//
            if (data.flag && data.flag === 'recalled') { 
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
            if (data.flag && data.flag === 'recalled') { 
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
            removeFromCart(data);
            break;
        case 'removeAll':
            removeAllCart(data);
            break;
        case 'list':
            listCart(data);
            break;
        case 'checkout':
            saveToCart(data);
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
var outgoingResponse = function(data,action,source){ //what we're replying to user with
    //stitch images before send to user
    if (action == 'stitch'){
        picstitch.stitchResults(data,source,function(url){

            //sending out stitched image response
            data.client_res = [];
            data.urlShorten = [];
            data.client_res.push(url); //add image results to response

            //send extra item URLs with image responses
            if (data.action == 'initial' || data.action == 'similar' || data.action == 'modify' || data.action == 'more'){
                processData.urlShorten(data,function(res){
                    var count = 0;
                    //put all result URLs into arr
                    async.eachSeries(res, function(i, callback) {
                        data.urlShorten.push(i);//save shortened URLs
                        processData.getNumEmoji(data,count+1,function(emoji){

                            res[count] = res[count].trim(); 

                            console.log('PUSH TO attach ','<'+res[count]+' | ' + emoji + ' ' + truncate(data.amazon[count].ItemAttributes[0].Title[0])+'>');

                            data.client_res.push('<'+res[count]+' | ' + emoji + ' ' + truncate(data.amazon[count].ItemAttributes[0].Title[0])+'>');
                            count++;                           
                            callback();
                        });
                    }, function done(){
                        checkOutgoingBanter(data);
                    });
                });
            }
            else {
                checkOutgoingBanter(data);
            }
        });
    }

    else if (action == 'txt'){  
        sendResponse(data);
        banter.getCinnaResponse(data,function(res){
            if(res && res !== 'null'){
                data.client_res = [];
                data.client_res.push(res);
                sendResponse(data);
            }
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
            sendResponse(data);
        }
        else {
            sendResponse(data);
        }
    });            
}

//send back msg to user, based on source.origin
var sendResponse = function(data){

    if (data.source.channel && data.source.origin == 'socket.io'){
        //check if socket user exists
        if (io.sockets.connected[data.source.channel]){
            //loop through responses in order
            for (var i = 0; i < data.client_res.length; i++) { 
                io.sockets.connected[data.source.channel].emit("msgFromSever", {message: data.client_res[i]});
            }            
        }
        //---supervisor: relay search result previews back to supervisor---//
        else if (data.source.channel && data.source.origin == 'supervisor') {
               data.bucket = 'results'
                console.log('Supervisor: 610 ',data)
               supervisor.emit(data)
        }
        //----------------------------------------------------------------//
        else {
            console.log('error: socket io channel missing');
        }
    }
    else if (data.source.channel && data.source.origin == 'slack'){


        //eventually cinna can change emotions in this pic based on response type
        var params = {
            icon_url: 'http://kipthis.com/img/kip-icon.png'
        }   
        //check if slackuser exists
        if (slackUsers[data.source.org]){

            if (data.action == 'initial' || data.action == 'modify' || data.action == 'similar' || data.action == 'more'){

                var message = data.client_res[0]; //use first item in client_res array as text message
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
                attachThis.shift(); 

                attachments[0].image_url = attachThis[0]; //add image search results to attachment 
                attachments[0].fallback = 'Here are some options you might like'; //fallback for search result

                attachThis.shift(); //remove image from array

                attachments[1].fallback = 'Here are some options you might like';

                console.log('attachThis ',attachThis); 

                //put in attachment fields
                async.eachSeries(attachThis, function(attach, callback) {
                    var field = {
                        "value": attach,
                        "short":false
                    }
                    attachments[1].fields.push(field);
                    callback();

                }, function done(){

                    attachments = JSON.stringify(attachments);

                    slackUsers[data.source.org].postAttachment(data.source.channel, message, attachments, params).then(function(res) {
                        callback();
                    });
                });
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

                    slackUsers[data.source.org].postAttachment(data.source.channel, message, attachments, params).then(function(res) {
                        callback();
                    });
                });         
            }
            else {
                //loop through responses in order
                async.eachSeries(data.client_res, function(message, callback) {
                    slackUsers[data.source.org].postMessage(data.source.channel,message, params).then(function(res) {
                        callback();
                    });
                }, function done(){
                });
            }


        }else {
            console.log('error: slackUsers channel missing');
        }
    }
     //---supervisor: relay search result previews back to supervisor---//
    else if (data.source.channel && data.source.origin == 'supervisor'){
        console.log('Sending results back to supervisor')
        data.bucket = 'results'
        console.log('Supervisor: 728', data)
        supervisor.emit(data)
    }
    //----------------------------------------------------------------//
    else {
        console.log('error: data.source.channel or source.origin missing')
    }

    //SAVE OUTGOING MESSAGES TO MONGO
    if (data.bucket && data.action){
        console.log('SAVING OUTGOING RESPONSE');
        //history.newMessage(data, function(newMsg){
        history.saveHistory(data,false); //saving outgoing message
        //});        
    }
    else {
        console.log('error: cant save outgoing response, missing bucket or action');
    }
}



/////////// tools /////////////


//* * * * * * ORDER ACTIONS TEMP!!!!! * * * * * * * * //

//save amazon item to cart
function saveToCart(data){

    data.bucket = 'search'; //modifying bucket to recall search history. a hack for now

    history.recallHistory(data, function(item){

        data.bucket = 'purchase'; //modifying bucket. a hack for now

        //no saved history search object
        if (!item){
            console.log('warning: NO ITEMS TO SAVE TO CART from data.amazon');
            //cannedBanter(data,'Oops sorry, I\'m not sure which item you\'re referring to');
            sendTxtResponse(data,'Oops sorry, I\'m not sure which item you\'re referring to');
        }
        else {
            
            //async push items to cart
            async.eachSeries(data.searchSelect, function(searchSelect, callback) {
                if (item.recallHistory && item.recallHistory.amazon){
                    messageHistory[data.source.id].cart.push(item.recallHistory.amazon[searchSelect - 1]); //add selected items to cart
                }else {
                    messageHistory[data.source.id].cart.push(item.amazon[searchSelect - 1]); //add selected items to cart
                }
                callback();
            }, function done(){
                purchase.outputCart(data,messageHistory[data.source.id],function(res){
                    processData.urlShorten(res, function(res2){
                        res.client_res = [];
                        res.client_res.push(res2);
                        outgoingResponse(res,'txt');
                    });
                });
            });            
        }

    });
}

function viewCart(data){
    db.Metrics.log('cart.view', data);
}

//get user history
function recallHistory(data,callback,steps){
    if (!data.source.org || !data.source.channel){
        console.log('missing channel or org Id 3');
    }

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

/////TOOLS

//trim a string to char #
function truncate(string){
   if (string.length > 55)
      return string.substring(0,55)+'...';
   else
      return string;
};



/// exports
module.exports.initSlackUsers = initSlackUsers;
module.exports.newSlack = newSlack;
module.exports.loadSocketIO = loadSocketIO;

module.exports.sendTxtResponse = sendTxtResponse;
module.exports.cannedBanter = cannedBanter;
module.exports.outgoingResponse = outgoingResponse;
module.exports.checkOutgoingBanter = checkOutgoingBanter;
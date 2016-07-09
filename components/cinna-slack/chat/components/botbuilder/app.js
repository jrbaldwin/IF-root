var restify = require('restify');
var builder = require('botbuilder');
var co = require('co');
var kip = require('kip');
var queue = require('../queue-mongo');
var db = require('../../../db');
var _ = require('lodash');
var http = require('http');
var request = require('request');
var async = require('async');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');
var fs = require('fs');
var emojiText = require('emoji-text'); //convert emoji to text
var parse_results = require('./parse_res');

//=========================================================
// Bot Setup
//=========================================================
  


// Setup Restify Server
var server = restify.createServer();
server.listen(3978, function (req, res, huh) {
   console.log('%s listening to %s', server.name, server.url); 
});

// Create bot and setup server
var connector = new builder.ChatConnector({
    appId: '3940dbc8-d579-4f3a-89fa-e8112b2cdae7',
    // 3940dbc8-d579-4f3a-89fa-e8112b2cdae7
    appPassword: 'Hp9jMrHmP18O6wKF2qGn0kn'
     // 'xegc1g5ZXaHiLmmhGuVHovj'
});

var bot = new builder.UniversalBot(connector);

server.post('/api/messages',connector.listen());


//   THUMBNAIL CARD!!!!

 // msg = new builder.Message(session)
 //            .textFormat(builder.TextFormat.xml)
 //            .attachments([
 //                new builder.ThumbnailCard(session)
 //                    .title("Thumbnail Card")
 //                    .subtitle("Pikes Place Market")
 //                    .text("<b>Pike Place Market</b> is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
 //                    .images([
 //                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
 //                    ])
 //                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market"))
 //            ]);

//   CAROUSEL!!!!!!!


  // Ask the user to select an item from a carousel.
// var msg = new builder.Message(session)
// .textFormat(builder.TextFormat.xml)
// .attachmentLayout(builder.AttachmentLayout.carousel)
// .attachments([
//     new builder.HeroCard(session)
//         .title("Space Needle")
//         .text("The <b>Space Needle</b> is an observation tower in Seattle, Washington, a landmark of the Pacific Northwest, and an icon of Seattle.")
//         .images([
//             builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/320px-Seattlenighttimequeenanne.jpg")
//                 .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Seattlenighttimequeenanne.jpg/800px-Seattlenighttimequeenanne.jpg")),
//         ])
//         .buttons([
//             builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Space_Needle", "Wikipedia"),
//             builder.CardAction.imBack(session, "select:100", "Select")
//         ]),
//     new builder.HeroCard(session)
//         .title("Pikes Place Market")
//         .text("<b>Pike Place Market</b> is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
//         .images([
//             builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
//                 .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/800px-PikePlaceMarket.jpg")),
//         ])
//         .buttons([
//             builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market", "Wikipedia"),
//             builder.CardAction.imBack(session, "select:101", "Select")
//         ]),
//     new builder.HeroCard(session)
//         .title("EMP Museum")
//         .text("<b>EMP Musem</b> is a leading-edge nonprofit museum, dedicated to the ideas and risk-taking that fuel contemporary popular culture.")
//         .images([
//             builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/320px-Night_Exterior_EMP.jpg")
//                 .tap(builder.CardAction.showImage(session, "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/Night_Exterior_EMP.jpg/800px-Night_Exterior_EMP.jpg"))
//         ])
//         .buttons([
//             builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/EMP_Museum", "Wikipedia"),
//             builder.CardAction.imBack(session, "select:102", "Select")
//         ])
// ]);


bot.dialog('/', function (session) {
    var text = session.message.text;
    var user = session.message.user;
    console.log('\n\n\nRaw incoming Skype object: ', session);
   // message:
   // { type: 'message',
   //   timestamp: '2016-07-08T21:18:46.707Z',
   //   text: 'wjgifwjgwiogjwgjgirgei',
   //   entities: [ [Object] ],
   //   address:
   //    { id: '3yrKrjkz3E8LnRvk',
   //      channelId: 'skype',
   //      user: [Object],
   //      conversation: [Object],
   //      bot: [Object],
   //      serviceUrl: 'https://skype.botframework.com' },
   //   attachments: [],
   //   user: { id: '29:1LJMJ1EMFNK3vkP5B1OjgL5M082J45ynqIct-OLEj0Jo' } },
    if (session.message.attachments) {
        console.log('RECEIVED AN IMAGE LEL')
         var img_array = [
                        'http://kipthis.com/kip_stickers/kip1.png',
                        'http://kipthis.com/kip_stickers/kip2.png',
                        'http://kipthis.com/kip_stickers/kip3.png',
                        'http://kipthis.com/kip_stickers/kip4.png',
                        'http://kipthis.com/kip_stickers/kip5.png',
                        'http://kipthis.com/kip_stickers/kip6.png',
                        'http://kipthis.com/kip_stickers/kip7.png',
                        'http://kipthis.com/kip_stickers/kip8.png',
                        'http://kipthis.com/kip_stickers/kip9.png'
                        ];
        // session.send(img_array[Math.floor(Math.random()*img_array.length)]);

         var msg = new builder.Message(session)
            .attachments([{
                contentType: "image/jpeg",
                contentUrl: img_array[Math.floor(Math.random()*img_array.length)]
            }]);
        session.send(msg);


        return 
    }



    text = emojiText.convert(text,{delimiter: ' '});
    console.log(text);
    console.log(user);
    // var card = new builder.HeroCard(session)
    //     .title("Microsoft Bot Framework")
    //     .text("Your bots - wherever your users are talking.")
    //     .images([
    //     builder.CardImage.create(session, "http://kipthis.com/images/header_partners.png")
    //     ]);
    // var msg = new builder.Message(session).attachments([card]);

    var message = new db.Message({
            incoming: true,
            thread_id: "skype_" + user.id,
            original_text: text,
            user_id: "skype_" + user.id,
            origin: 'skype',
            source: {
                'origin': 'skype',
                'channel': user.id,
                'org': "skype_" + user.id,
                'id': "skype_" + user.id,
                'user': "skype_" + user.id
            },
            ts: Date.now(),
            session: session
        });
        // clean up the text
        message.text = message.original_text.trim(); //remove extra spaces on edges of string
        // queue it up for processing
        message.save().then(() => {
            queue.publish('incoming', message, ['skype', user.id, message.ts].join('.'))
        });

        // session.send(msg);

//
// Mechanism for responding to messages
//
kip.debug('subscribing to outgoing.skype');
queue.topic('outgoing.skype').subscribe(outgoing => {
    // var session = outgoing.message.session;
    // console.log(outgoing);
    // var data = outgoing.data;
    var fbtoken = 'EAAT6cw81jgoBAFtp7OBG0gO100ObFqKsoZAIyrtClnNuUZCpWtzoWhNVZC1OI2jDBKXhjA0qPB58Dld1VrFiUjt9rKMemSbWeZCsbuAECZCQaom2P0BtRyTzpdKhrIh8HAw55skgYbwZCqLBSj6JVqHRB6O3nwGsx72AwpaIovTgZDZD'
    try {
        console.log('outgoing message');
        // console.log(outgoing);
        var message = outgoing.data;
        console.log('skype outgoing message', message.mode, message.action);
        var return_data = {};
        co(function*() {
            if (message.mode === 'shopping' && message.action === 'results' && message.amazon.length > 0) {
                return_data = yield parse_results(message);
                return send_results(message.source.channel, message.text, return_data, outgoing);
            }
            // else if (message.mode === 'shopping' && message.action === 'focus' && message.focus) {
            //     console.log('focus message :', message);
            //     return_data = yield focus(message);
            //     return send_focus(message.source.channel, message.text, return_data, outgoing);
            // }
            // else if (message.mode === 'cart' && message.action === 'view') {
            //     return send_cart(message.source.channel, message.text, outgoing);
            // }
            // else if (message.text && message.text.indexOf('_debug nlp_') == -1) {
            //     return send_text(message.source.channel, message.text, outgoing)
            // }
            else if (message.text){
                session.send(message.text);
            }
            else {
                console.log('\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nhmm, shouldnt be getting here..', message);
            }
            outgoing.ack();
        }).then(() => {
            outgoing.ack();
        }).catch(e => {
            console.log(e);
            outgoing.ack();
        // })
        })
    } catch ( e ) {
        kip.err(e);
    }


    function send_text(channel, text, outgoing) {
        console.log('send_text: ', fbtoken, channel, text);

        function chunkString(str, length) {
          return str.match(new RegExp('.{1,' + length + '}', 'g'));
        }

        if (text.length >= 200) {
            var text_array = chunkString(text, 250)
            console.log('text_array: ', text_array);
            var el_count = 0;
            var char_count = 0;
            var current_chunk = ''
            async.eachSeries(text_array, function iterator(chunk, cb){
                char_count = char_count + chunk.length;
                if (el_count == text_array.length-1) {
                     request({
                        url: 'https://graph.facebook.com/v2.6/me/messages',
                        qs: {
                            access_token: fbtoken
                        },
                        method: 'POST',
                        json: {
                            recipient: {
                                id: channel
                            },
                            message: {text: current_chunk},
                            notification_type: "NO_PUSH"
                        }
                    }, function(err, res, body) {
                        if (err) console.error('post err ', err);
                        console.log(body);
                        char_count = 0;
                        current_chunk = '';
                        el_count++;
                        cb();
                    });
                }
                else if (char_count > 125) {
                     request({
                        url: 'https://graph.facebook.com/v2.6/me/messages',
                        qs: {
                            access_token: fbtoken
                        },
                        method: 'POST',
                        json: {
                            recipient: {
                                id: channel
                            },
                            message: {text: current_chunk},
                            notification_type: "NO_PUSH"
                        }
                    }, function(err, res, body) {
                        if (err) console.error('post err ', err);
                        console.log(body);
                        char_count = 0;
                        current_chunk = '';
                        el_count++;
                        cb();
                    });
                }
                else {
                    current_chunk = current_chunk + ' ' + chunk;
                    el_count++;
                    cb()
                }
            }, function done() {
              outgoing.ack();

            })
          }
        else {
           request({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {
                    access_token: fbtoken
                },
                method: 'POST',
                json: {
                    recipient: {
                        id: channel
                    },
                    message: {text: text},
                    notification_type: "NO_PUSH"
                }
            }, function(err, res, body) {
                if (err) console.error('post err ', err);
                console.log(body);
                outgoing.ack();
            });
        }

    }

    function send_results(channel, text, results, outgoing) {
        // console.log(channel, text, results, outgoing)
        var giphy_gif = '';
        request('http://api.giphy.com/v1/gifs/search?q=' + outgoing.data.original_query + '&api_key=dc6zaTOxFJmzC', function(err, res, body) {
            if (err) console.log(err);

            // console.log('GIFY RETURN DATA: ', JSON.parse(body).data[0])
            giphy_gif = JSON.parse(body).data[0] ? JSON.parse(body).data[0].images.fixed_width_small.url :  'http://kipthis.com/images/header_partners.png';
             
        var image1 = ((results[0].image_url.indexOf('http') > -1) ? results[0].image_url : 'http://kipthis.com/images/header_partners.png')
        var image2 = ((results[1].image_url.indexOf('http') > -1) ? results[1].image_url : 'http://kipthis.com/images/header_partners.png')
        var image3 = ((results[2].image_url.indexOf('http') > -1) ? results[2].image_url : 'http://kipthis.com/images/header_partners.png')
        
                    console.log('SEND_RESULTS FIRED, RESULTS: ', image1, image2, image3)

        // Ask the user to select an item from a carousel.
        // var msg = new builder.Message(session)
        //     .textFormat(builder.TextFormat.xml)
        //     .attachmentLayout('carousel')
        //     .attachments([
        //         new builder.HeroCard(session)
        //             .title(results[0].title)
        //             .text(results[0].description)
        //             .images([
        //                 builder.CardImage.create(session, image1)
        //                     .tap(builder.CardAction.showImage(session, image1)),
        //             ])
        //             .buttons([
        //                 builder.CardAction.openUrl(session, results[0].title_link, "Amazon"),
        //                 builder.CardAction.imBack(session, "select:100", "Select")
        //             ]),
        //         new builder.HeroCard(session)
        //             .title(results[1].title)
        //             .text(results[1].description)
        //             .images([
        //                 builder.CardImage.create(session, image2)
        //                     .tap(builder.CardAction.showImage(session, image2)),
        //             ])
        //             .buttons([
        //                 builder.CardAction.openUrl(session, results[1].title_link, "Amazon"),
        //                 builder.CardAction.imBack(session, "select:101", "Select")
        //             ]),
        //         new builder.HeroCard(session)
        //             .title(results[2].title)
        //             .text(results[2].description)
        //             .images([
        //                 builder.CardImage.create(session, image3)
        //                     .tap(builder.CardAction.showImage(session, image3))
        //             ])
        //             .buttons([
        //                 builder.CardAction.openUrl(session, results[2].title_link,"Amazon"),
        //                 builder.CardAction.imBack(session, "select:102", "Select")
        //             ])
        //     ]);
            // builder.Prompts.choice(session, msg, "select:100|select:101|select:102");


            var msg = new builder.Message(session)
            .textFormat(builder.TextFormat.xml)
            .attachments([
                new builder.ThumbnailCard(session)
                    .title("Thumbnail Card")
                    .subtitle("Pikes Place Market")
                    .text("<b>Pike Place Market</b> is a public market overlooking the Elliott Bay waterfront in Seattle, Washington, United States.")
                    .images([
                        builder.CardImage.create(session, "https://upload.wikimedia.org/wikipedia/en/thumb/2/2a/PikePlaceMarket.jpg/320px-PikePlaceMarket.jpg")
                    ])
                    .tap(builder.CardAction.openUrl(session, "https://en.wikipedia.org/wiki/Pike_Place_Market"))
            ]);
                builder.Prompts.choice(session, msg, "select:100|select:101|select:102");



            // builder.Prompts.choice(session, msg, "select:100|select:101|select:102");
            // outgoing.ack();

         })

    }

    function send_focus(channel, text, focus_info, outgoing) {
        var img_card = {
             "recipient": {
                "id": channel
            },
             "message":{
                "attachment":{
                  "type":"template",
                  "payload":{
                    "template_type":"generic",
                    "elements":[
                      {
                        "title": focus_info.title,
                        "item_url": focus_info.title_link,
                        "image_url": focus_info.image_url,
                      }
                    ]
                  }
                }
              },
              "notification_type": "NO_PUSH"
        }

        var focus_card = {
            "recipient": {
                "id": channel
            },
            "message": {
                "attachment": {
                    "type": "template",
                    "payload": {
                        "template_type": "button",
                        "buttons": [{
                            "type": "postback",
                            "title": "Add to Cart",
                            "payload": JSON.stringify({
                                dataId: outgoing.data.thread_id,
                                action: "add",
                                selected: focus_info.selected,
                                ts: outgoing.data.ts,
                                initial: true
                            })
                        },{
                                "type": "postback",
                                "title": 'Cheaper',
                                "payload": JSON.stringify({
                                    dataId: outgoing.data.thread_id,
                                    action: "cheaper",
                                    selected: focus_info.selected,
                                    ts: outgoing.data.ts
                                })
                        },
                        {
                            "type": "postback",
                            "title": "Similar",
                            "payload": JSON.stringify({
                                dataId: outgoing.data.thread_id,
                                action: "similar",
                                selected: focus_info.selected,
                                ts: outgoing.data.ts
                            })
                        }
                        ],

                        "text": (focus_info.price + '\n' + focus_info.description + '\n' + focus_info.reviews).substring(0,300)
                    }
                }
            },
            "notification_type": "NO_PUSH"
        };

         request.post({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {
                access_token: 'EAAT6cw81jgoBAFtp7OBG0gO100ObFqKsoZAIyrtClnNuUZCpWtzoWhNVZC1OI2jDBKXhjA0qPB58Dld1VrFiUjt9rKMemSbWeZCsbuAECZCQaom2P0BtRyTzpdKhrIh8HAw55skgYbwZCqLBSj6JVqHRB6O3nwGsx72AwpaIovTgZDZD'
            },
            method: "POST",
            json: true,
            headers: {
                "content-type": "application/json",
            },
            body: img_card
        }, function(err, res, body) {
            if (err) console.error('post err ', err);
            console.log(body)
            request.post({
                url: 'https://graph.facebook.com/v2.6/me/messages',
                qs: {
                    access_token: 'EAAT6cw81jgoBAFtp7OBG0gO100ObFqKsoZAIyrtClnNuUZCpWtzoWhNVZC1OI2jDBKXhjA0qPB58Dld1VrFiUjt9rKMemSbWeZCsbuAECZCQaom2P0BtRyTzpdKhrIh8HAw55skgYbwZCqLBSj6JVqHRB6O3nwGsx72AwpaIovTgZDZD'
                },
                method: "POST",
                json: true,
                headers: {
                    "content-type": "application/json",
                },
                body: focus_card
            }, function(err, res, body) {
                if (err) console.error('post err ', err);
                console.log(body)
            })
        })
    }

    function send_cart(channel, text, outgoing) {
          var cart = outgoing.data.data;
          // console.log('getting to send_cart, outgoing: ', outgoing.data)
          var cartDisplay = {
              "attachment": {
                "type": "template",
                "payload": {
                  "template_type": "generic",
                  "elements": []
                }
              }
          };
          var unique_items = _.uniqBy( cart.aggregate_items, 'ASIN');
        for (var i = 0; i < unique_items.length; i++) {
            var item = unique_items[i];
            // console.log('\n\n\n\nUNIQUE ITEMMMMS: ', unique_items)
            // var userString = item.added_by.map(function(u) {
            //   return 'u';
            // }).join(', ');
            debugger;
            var cart_item = {
                "title":  `${item.title}`,
                "subtitle": 'Price: ' + item.price + "\nQuantity:" + item.quantity,
                "image_url": item.image,
                "buttons":[
                    { "type": "postback",
                      "title": "➕",
                      "payload": JSON.stringify({"dataId": outgoing.data.thread_id, "action": "add" ,"selected": (i + 1), initial: false })
                    },
                    { "type": "postback",
                      "title": "➖",
                      "payload": JSON.stringify({"dataId": outgoing.data.thread_id, "action": "remove" ,"selected": (i + 1), initial: false})
                    },
                    { "type": "postback",
                      "title": "Remove All",
                      "payload": JSON.stringify({"dataId": outgoing.data.thread_id, "action": "empty", "selected": (i + 1), initial: false})
                    }
                ]
              }
            cartDisplay.attachment.payload.elements.push(cart_item);
          }

        request.post({
              url: 'https://graph.facebook.com/v2.6/me/messages',
              qs: {access_token: fbtoken},
              method: "POST",
              json: {
                recipient: {id: channel},
                message: cartDisplay,
              },
              headers: {
                  "content-type": "application/json",
              }
          },
          function (err, res, body) {
             if (err) console.log('post err ',err);
             console.log(body);

                  var summary_card = {
                        "recipient": {
                            "id": channel
                        },
                        "message": {
                            "attachment": {
                                "type": "template",
                                "payload": {
                                    "template_type": "button",
                                    "buttons": [
                                    {
                                        "type": "web_url",
                                        "url": cart.link,
                                        "title": "Check Out"
                                    }
                                   ],
                                    "text": 'Total: ' + cart.total
                                }
                            }
                        },
                        "notification_type": "NO_PUSH"
                    };

                    request.post({
                        url: 'https://graph.facebook.com/v2.6/me/messages',
                        qs: {
                            access_token: 'EAAT6cw81jgoBAFtp7OBG0gO100ObFqKsoZAIyrtClnNuUZCpWtzoWhNVZC1OI2jDBKXhjA0qPB58Dld1VrFiUjt9rKMemSbWeZCsbuAECZCQaom2P0BtRyTzpdKhrIh8HAw55skgYbwZCqLBSj6JVqHRB6O3nwGsx72AwpaIovTgZDZD'
                        },
                        method: "POST",
                        json: true,
                        headers: {
                            "content-type": "application/json",
                        },
                        body: summary_card
                    }, function(err, res, body) {
                        if (err) console.error('post err ', err);
                    })
          })

    }

})
























});

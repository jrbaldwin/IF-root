var mongoose = require('mongoose');
// connect our DB
var db = require('db');
var Message = db.Message;
var config = require('config');
var async = require('async');
var _ = require('underscore');

process.on('uncaughtException', function (err) {
  console.log(err);
});


var saveHistory = function(data,incoming) { //incoming == 1 or 0

    // / / / / / / / /
    //CHECK FOR "recallhistory" property, remove
    // / / / / / / / / 

    if (!data.source.id){
        console.log('error: missing source.id');
    }
    else {  
        //check for incoming val
        if (typeof incoming !== 'undefined') {
            data.incoming = incoming;
        }else {
            console.log('warning: messaged saved without incoming val');
        }

        // if (data.amazon){
        //     //use lowest new price
        //     if (data.amazon[0]){

        //         //console.log(data.amazon[0].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0]);

        //         // console.log('USE list price ', data.amazon[0].ItemAttributes[0].ListPrice);

        //         //console.log('DETAIL  ', data.amazon[0]);

        //         //console.log('USE LowestNewPrice ', data.amazon[0].OfferSummary[0]);

        //         //console.log('USING OFFER ARRAY ', JSON.stringify(data.amazon[0]))';

        //     }
        //     else if (data.amazon[0].Offers[0].Offer > 0){
        //         console.log('USING OFFER ARRAY ', data.amazon[0].Offers[0].Offer[0].OfferListing[0].Price[0].FormattedPrice[0]);
        //     }   
        //     else {
        //         console.log('not sure which price to use D:')
        //     }
        // }

        //new message mongo obj
        newMessage(data, function(msg){
            
            if (msg.amazon){
                msg.amazon = [];
                async.eachSeries(data.amazon, function(item, callback) {
                    //fuck amazon '$' keys littering their object results. go stringify and die.
                    msg.amazon.push(JSON.stringify(item));
                    callback();

                }, function done(){
                    msg.markModified('amazon'); //lmao don't ask ;__; 
                    msg.save(function(err, data){
                        if(err){
                            console.log('Mongo err ',err);
                        }
                        else{
                            //console.log('INCOMING ',incoming);
                            //console.log('STATUS ',incoming);
                            //console.log('mongo res ',data);
                            //callback('d'); //eventually send back _id for parent id??        
                        }
                    });   
                });
            }

            else {
                msg.save(function(err, data){
                    if(err){
                        console.log('Mongo err ',err);
                    }
                    else{
                        //console.log('INCOMING ',incoming);
                        //console.log('STATUS ',incoming);
                        //console.log('mongo res ',data);
                        //callback('d'); //eventually send back _id for parent id??        
                    }
                });               
            }

        });


    

        //pre-process data for saving

        // if (msgObj.amazon){

        //     delete msgObj.amazon;

        //     console.log('fire.....   ',msgObj)


        //     // async.eachSeries(data.amazon, function(item, callback) {

        //     //     messageHistory[data.source.id].cart.push(item.amazon[searchSelect - 1]); //add selected items to cart
        //     //     callback();
        //     // }, function done(){
        //     //     //only support "add to cart" message for one item.
        //     //     //static:
        //     //     var sT = data.searchSelect[0];
        //     //     // data.client_res = item.amazon[sT - 1].ItemAttributes[0].Title + ' added to your cart. Type <i>remove item</i> to undo.';

        //     //     // outgoingResponse(data,'txt');
        //     //     purchase.outputCart(data,messageHistory[data.source.id],function(res){
        //     //         outgoingResponse(res,'txt');
        //     //     });
        //     // });

        // }

    }
};

var recallHistory = function(data,callback){

    if (!data.source.id){
        console.log('error: missing source.id');
    }
    else {
        //get by bucket type
        switch (data.bucket) {
            case 'search':
                switch(data.action){

                    default: 
                        Message.findOne({'bucket':'search','action':'initial','incoming':false}).sort({'_id': -1}).exec(function(err, msg) {  
                            if(err){
                                console.log('Error: Cannot find initial search for recallHistory');
                            }   
                            else {
                                if (msg.amazon){
                                    var tempArr = msg.amazon; //lmao amazon 
                                    msg.amazon = [];
                                    async.eachSeries(tempArr, function(item, callback2) {
                                        msg.amazon.push(JSON.parse(item)); //ughhhh
                                        callback2();
                                    }, function done(){
                                        callback(msg); 
                                    });
                                }
                                else {
                                    callback(msg);
                                }
                            }
                        });

                    // //if action is focus, find lastest 'initial' item
                    // case 'focus':
                    //     //find last initial query to do focus on
                    //     Message.findOne({'bucket':'initial','incoming':false}).sort({'_id': -1}).exec(function(err, msg) {  
                    //         if(err){
                    //             console.log('Cannot find initial bucket for action:focus recallHistory');
                    //         }
                    //         else {
                    //             console.log('stuff stuff ', msg);
                    //         }
                    //     });
                    //     break;
                    // case 'similar':
                    //     Message.findOne({'bucket':'initial','incoming':false}).sort({'_id': -1}).exec(function(err, msg) {  
                    //         if(err){
                    //             console.log('Cannot find initial bucket for action:focus recallHistory');
                    //         }
                    //         else {
                    //             console.log('stuff stuff ', msg);
                    //         }
                    //     });

                    // default:
                    //     console.log('warning: no action selected for recallhistory');
                    //     // GET DEFAULT MONGO SIMILAR QUERY HERE
                        
                    //     break;
                }

                break;
            case 'banter':

                // var arrLength = messageHistory[data.source.id].banter.length - steps; //# of steps to reverse. default is 1
                // callback(messageHistory[data.source.id].banter[arrLength]); //get last item in arr
                break;
            case 'purchase':
                // var arrLength = messageHistory[data.source.id].purchase.length - steps; //# of steps to reverse. default is 1
                // callback(messageHistory[data.source.id].purchase[arrLength]); //get last item in arr
            default:
        }        
    }

};

//create new mongo Message obj
var newMessage = function(data,callback){
    data = new Message(data);
    callback(data);
};


/////////// tools /////////////


/// exports
module.exports.saveHistory = saveHistory;
module.exports.recallHistory = recallHistory;
module.exports.newMessage = newMessage;

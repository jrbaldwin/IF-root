var async = require('async');
var amazon = require('../amazon-product-api_modified'); //npm amazon-product-api
var client = amazon.createClient(kip.config.amazon[0])

//pass in data, user chat history
//cartHistory = user cart items list
var outputCart = function(data,cartHistory,callback) {

    if (cartHistory.cart.length > 0){ //if have contents in shopping cart
        var cartItems = [];

        //async push items to cart
        async.eachSeries(cartHistory.cart, function(item, callback) {
            console.log('\n\n\npurchase.js : item: ',item)
            cartItems.push({
                ASIN: item.ASIN,
                Quantity: 1
            });

            callback();
        }, function done(){
            //only support "add to cart" message for one item.
            //static:
            
            buildAmazonCart(cartItems);
        });

        function buildAmazonCart(items){

            //construct amazon cart format
            var options = {};
            for (var i = 0; i < items.length; i++) {
                var propASIN = 'Item.'+i+'.ASIN';
                options[propASIN] = items[i].ASIN;
                var propQuan = 'Item.'+i+'.Quantity';
                options[propQuan] = items[i].Quantity;
            }
            client.createCart(options).then(function(results) {

                
                console.log('cart results ',JSON.stringify(results));

                if(results && results.PurchaseURL){
                    data.client_res = results.PurchaseURL[0];
                    // console.log('Mitsu purchase47: ', JSON.stringify(results))
                    callback(data);                    
                }else {
                    //add fix for this amazon error: ["AWS.ECommerceService.ItemNotEligibleForCart"]
                    console.log('Error: create cart failed: ',JSON.stringify(results));
                    callback(data,'Oops, I had trouble adding this item to your cart, try clicking the link name to add to cart directly on Amazon');    
                }


            }).catch(function(err) {
                console.log('amazon err ', err[0].Error[0]);
            });
        }
    } 
    else {
        callback(data,'none');
        console.log('missing items in cart!');
    }

};


/////////// tools /////////////



/// exports
module.exports.outputCart = outputCart;

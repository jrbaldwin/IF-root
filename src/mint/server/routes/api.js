var express = require('express');
var router = express.Router();
var co = require('co');

var utils = require('../utilities/utils.js');

/**
 * if they goto api/cart maybe redirect or something, possibly could use this elsewhere
 * @param {cart_id} ) cart_id to redirect to or whatever
 * redirects to cart/:cart_id
 */
router.get('/cart/:cart_id', (req, res) => co(function * () {
  var cart = yield db.Carts.findOne({cart_id: req.params.cart_id});
  return cart;
}));

router.get('/cart/:cart_id/items', (req, res) => co(function * () {
  var cart = yield db.Carts.findOne({cart_id: req.params.cart_id});
  return cart.items;
}));

/**
 * adds item to cart based on url or possibly other ways
 * @param {cart_id} cart_id to add item to
 * @param {item_url} item url from amazon
 * @returns redirects to cart with item added
 */
router.post('/cart/:cart_id/items', (req, res) => co(function * () {
  var original_url = req.body.url;
  var cartId = req.params.cart_id;

  // just get the amazon lookup results and title from that currently
  var itemTitle = yield utils.getItemByUrl(original_url);

  yield db.Items.create({
    cart: cartId,
    original_link: original_url,
    item_name: itemTitle
  });

  res.send(200);
}));

router.delete('/cart/:cart_id/items', (req, res) => co(function * () {
  var item = req.body.itemId;
  var cartId = req.params.cart_id;

  // just get the amazon lookup results and title from that currently
  yield db.Items.findOneAndUpdate({item: item, cart_id: cartId});
}));

module.exports = router;

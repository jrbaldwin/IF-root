var express = require('express');
var router = express.Router();
var co = require('co');
var _ = require('lodash');

const dealsDb = require('../deals/deals')

var utils = require('../utilities/utils.js');

/**
 * Models loaded from the waterline ORM
 */
var db;
const dbReady = require('../../db');
dbReady.then((models) => { db = models; }).catch(e => console.error(e));

/**
 * @api {get} / Home
 * @apiDescription renders the react web page :kip: :kip: :kip: :mudkip:
 * @apiGroup HTML
 */
router.get('/', (req, res) => co(function* () {
  // if no user, no carts
  if (!_.get(req, 'UserSession.user_account.id')) {
    return res.render('pages/index', { carts: [] });
  }

  // otherwise, find all the cart ids for which the user is a member
  const memberCarts = yield db.carts_members__user_accounts_id.find({
    user_accounts_id: req.UserSession.user_account.id
  })

  const memberCartsIds = memberCarts.map( c => c.carts_members )

  // find all the carts where their user id appears in the leader or member field
  const carts = yield db.Carts.find({
    or: [
      { leader: req.UserSession.user_account.id },
      { id: memberCartsIds }
    ]
  }).populate('items').populate('leader').populate('members')

  res.render('pages/index', { carts: carts });
}));

/**
 * @api {get} /auth/:auth_token MagicLink
 * @apiDescription Logs someone in via link, like forgot password style, then redirects them to a cart or something
 * @apiGroup HTML
 * @apiParam {string} :auth_token the token from the auth db
 */
router.get('/auth/:id', (req, res) => co(function * () {
  var link = yield db.AuthenticationLinks.findOne({id: req.params.id}).populate('user').populate('cart')
  if (!link || !link.user) {
    return res.status(404).end()
  }

  // check if the user is already identified, as this email
  var currentUser = req.UserSession.user_account
  if (!currentUser) {
    // no current user defined, so we can log them in
    req.UserSession.user_account = link.user.id
    yield req.UserSession.save()
  } else if (currentUser.id === link.user.id) {
    // already logged in as this user, so don't do anything
  } else {
    // logged in as another user, so log them in as this user
    req.UserSession.user_account = link.user.id
    yield req.UserSession.save()
  }

  return res.redirect('/cart/' + link.cart.id)
}))

/**
 * @api {get} /newcart New Cart
 * @apiDescription create new cart for user, redirect them to /cart/:id and send an email
 * @apiGroup HTML
 */
router.get('/newcart', (req, res) => co(function * () {
  // create a blank cart
  const cart = yield db.Carts.create({})

  // find the user for this session
  const session = req.UserSession;

  if (session.user_account) {
    // make the first user the leader
    const user = session.user_account
    cart.leader = user.id
    if (user.name) {
      cart.name = user.name + "'s Kip Group Cart"
    } else {
      cart.name = user.email_address.replace(/@.*/, '') + "'s Kip Cart"
    }
    yield cart.save()

    // grab the daily deals
    let allDeals = yield dealsDb.getDeals(4, 0),
      deals = [allDeals.slice(0, 2), allDeals.slice(2, 4)];

    // Send an email to the user with the cart link
    var email = yield db.Emails.create({
      recipients: user.email_address,
      subject: 'Your New Cart from Kip',
      cart: cart.id
    })

    // use the new_cart email template
    email.template('new_cart', {
      cart: cart,
      deals: deals
    })

    // remember to actually send it
    yield email.send();
  }

  res.redirect(`/cart/${cart.id}/`);
}))

module.exports = router;

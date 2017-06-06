var db
const dbReady = require('../../db')
dbReady.then((models) => { db = models; })

//creates a clone of a cart with the same name and items but without the users, comments, or reactions
var clone = function * (cart_id, user_id, reorder) {
  var original = yield db.Carts.findOne({id: cart_id}).populate('items')
  var originalJson = original.toJSON();

  // delete association fields that do not carry over to the clone
  // social metrics like views and checkouts will only be stored on the original
  delete originalJson.id
  delete originalJson.items
  delete originalJson.checkouts
  delete originalJson.members
  delete originalJson.leader
  delete originalJson.views
  delete originalJson.parent_clone
  delete originalJson.parent_reorder

  // create new cart
  var clone = yield db.Carts.create(originalJson)

  // change leader
  clone.leader = user_id
  clone.dirty = false;

  // clone items in the cart
  yield original.items.map(function * (item) { //this line is throwing a weird exception for some reason?
    item = yield db.Items.findOne({id: item.id}).populate('details')

    //create new item
    var itemJson = item.toJSON();
    delete itemJson.id
    delete itemJson.options
    delete itemJson.reactions
    delete itemJson.added_by
    delete itemJson.cart
    delete itemJson.details

    //create new item
    var clonedItem = yield db.Items.create(itemJson)
    clonedItem.cart = clone.id
    clonedItem.added_by = user_id
    clonedItem.details = item.details.id
    yield clonedItem.save()
    clone.items.add(clonedItem.id)
  })

  if (reorder) clone.parent_reorder = original.id
  else clone.parent_clone = original.id
  yield clone.save()

  clone = yield db.Carts.findOne({id: clone.id}).populate('items')
  return clone;
}

/**
 * Creates a copy of everything about this cart
 */
var reorder = function * (cart_id, user_id) {
  var original = yield db.Carts.findOne({id: cart_id}).populate('members')
  var copy = yield clone(cart_id, user_id, true)

  // add the members of the old cart to the new cart
  original.members.map(m => {
    copy.members.add(m.id)
  })
  if (original.leader !== copy.leader) copy.members.add(original.leader)

  // set items to be added by the same users they were added to in the original cart
  // and add any comments they might have had
  yield copy.items.map(function * (item) {
    var original_item = yield db.Items.findOne({
      cart: original.id,
      asin: item.asin,
      price: item.price,
      quantity: item.quantity
    })
    item.added_by = original_item.added_by
    item.comment = original_item.comment
    yield item.save();
  })
  yield copy.save()

  var original_test = yield db.Carts.findOne({id: cart_id}).populate('members').populate('items')
  var copy_test = yield db.Carts.findOne({id: copy.id}).populate('members').populate('items')
  logging.info('original:', original_test)
  logging.info('copy:', copy_test)
}

// type is either the string 'clone' or 'reorder'
// returns an array of cart ids
var getParents = function * (cart_id, type) {
  var parent = 'parent_' + type
  var parentsHelper = function * (cart_id, parents) {
    // logging.info('cart_id:', cart_id)
    parents.push(cart_id);
    var cart = yield db.Carts.findOne({id: cart_id}).populate(parent)
    if (cart[parent]) return yield parentsHelper(cart[parent].id, parents)
    else return parents
  }
  var ancestors = yield parentsHelper(cart_id, [])
  return ancestors.slice(1); // slice off original cart from list of parents
}

// type is either the string 'clone' or 'reorder'
// returns an array of cart ids
var getChildren = function * (cart_id, type) {
  logging.info('getting children of type ' + type + ' for cart ' + cart_id)
  // var parent = 'parent_' + type
  var all_children = []

  var childrenHelper = function * (cart_id) {
    logging.info('cart_id:', cart_id)
    if (type === 'clone') var children = yield db.Carts.find({parent_clone: cart_id})
    else var children = yield db.Carts.find({parent_reorder: cart_id})
    logging.info('and we must save the children', children)
    if (children.length) {
      children.map(c => all_children.push(c.id))
      // yield children.map(function * (c) { yield childrenHelper(c.id) })
    }
  }

  yield childrenHelper(cart_id)
  return all_children
}

module.exports = {
  clone: clone,
  reorder: reorder,
  getParents: getParents,
  getChildren: getChildren
}

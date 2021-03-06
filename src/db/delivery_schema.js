var mongoose = require('mongoose')

/**
 * Save delivery sessions
 */
var deliverySchema = mongoose.Schema({
  active: {
    type: Boolean
  },
  session_id: mongoose.Schema.ObjectId,
  team_id: String,
  onboarding: Boolean, //show onboarding walkthrough tips to user

  all_members: [], // not sure how whitelist thing works so just stashing all_members instead of looking up team_members
  team_members: [], // who is in the order
  email_users: [],
  chosen_location: {  // from slackbot.meta.locations
      label: String,
      latitude: Number,
      longitude: Number,
      address_1: String,
      address_2: String,
      street: String,
      unit_type: String,
      unit_number: String,
      city: String,
      state: String,
      zip_code: String,
      phone_number: String,
      region: String,
      timezone: String,
      neighborhood: String,
      sublocality: String,
      special_instructions: String,
      input: String
  },
  chosen_restaurant: {
    id: String,
    name: String,
    url: String,
    minimum: Number,
    cuisine: String
  },
  budget: Number,
  user_budgets: {},
  menu: {}, // the actual menu for the chosen merchant
  merchants: [], // all possible merchants (based on location)
  cuisines: [], // don't confuse this with votes below

  // contains all the items that are in the cart and all the items that a user is working on
  // each user can add multiple items to the cart
  cart: [{
    user_id: String,
    added_to_cart: {type: Boolean, default: false},
    item: {
      item_id: String, // the item.unique_id
      item_qty: Number,
      option_qty: {}, // hash of {unique_id, quantity} pairs
      item_label: {type: String, default: ''}, // leave blank? idk what this is
      instructions: {type: String, default: ''}
    }
  }],

  // admin or whomever to use for picking restaurant and various other
  convo_initiater: {
    id: String,
    name: String,
    first_name: String,
    last_name: String,
    phone_number: String,
    email: String,
    dm: String
  },

  // temp hold over until we can send to multiple
  chosen_channel: {
    name: String,
    id: String,
    is_channel: {
      type: Boolean,
      default: true
    }
  },

  fulfillment_method: String,
  instructions: String,
  time_started: {
    type: Date,
    default: Date.now
  },
  cuisine_dashboards: [{
    user: String,
    message: mongoose.Schema.ObjectId
  }],
  order_dashboards: [{
    user: String,
    message: mongoose.Schema.ObjectId
  }],
  votes: [{
    user: String,
    vote: String,
    weight: Number
  }], // members votes, like "Frozen Yogurt" (should also be stored in chatuser_schema)
  conversations: {},

  // remove this later
  mode: String,
  action: String,
  data: {}, // \shrug
  delivery_post: {},
  order: {}, // info after adding items to cart
  tip: {
    amount: {
      type: Number
    },
    percent: {
      type: String,
      default: `15%`
    }
  },
  service_fee: {
    type: Number,
    default: 0.99
  },

  coupon: {
    code: {
      type: String,
    },
    percent: {
      type: Number
    },
    used: {
      default: false,
      type: Boolean
    }
  },
  main_amount: Number,
  calculated_amount: Number,
  discount_amount: Number,
  payment_post: {}, // post body for payment (i.e. select or add new card)
  payment: {}, // object with payment details
  confirmed_orders: [], // possibly add time counter thing later
  guest_token: String, // related to creating a guest token per session
  completed_payment: {
    default: false,
    type: Boolean
  },
  // errors
  delivery_error: String
})

deliverySchema.virtual('chosen_restaurant_full').get(function () {
  var doc = this
  return doc.merchants.filter(m => m.id === doc.chosen_restaurant.id)[0]
})

var delivery = mongoose.model('delivery', deliverySchema, 'delivery')

module.exports = delivery

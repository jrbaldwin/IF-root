module.exports = {
  // length of cart id, not sure what compromise between looking fine and getting scraped
  CART_ID_LENGTH: 12,
  MAGIC_URL_LENGTH: 32,

  // available stores we are supporting atm
  STORES: ['ypo', 'amazon'],
  LOCALES: ['US', 'CA', 'UK'],
  PAYMENT_SOURCE: ['stripe']
};

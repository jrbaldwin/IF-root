const stores = [{
    "store_img": "",
    "store_type": "amazon_us",
    "store_name": "Amazon US",
    "store_domain": "amazon.com",
    "store_countries": ["US"]
  }, {
    "store_img": "",
    "store_type": "amazon_uk",
    "store_name": "Amazon UK",
    "store_domain": "amazon.co.uk",
    "store_countries": ["UK"]
  }, {
    "store_img": "",
    "store_type": "amazon_canada",
    "store_name": "Amazon Canada",
    "store_domain": "amazon.ca",
    "store_countries": ["Canada"]
  }, {
    "store_img": "",
    "store_type": "ypo",
    "store_name": "YPO",
    "store_domain": "ypo.co.uk",
    "store_countries": ["UK"]
  }
]

const countryCoordinates = {
  'US': [37.0902, 95.7129],
  'UK': [55.3781, 3.4360],
  'Canada': [56.1304, 106.3468]
}

module.exports = {
  stores: stores,
  countryCoordinates: countryCoordinates
}

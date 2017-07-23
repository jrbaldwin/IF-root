const logging = require('../../../logging.js')
const scrape = require('./scrape_convert')
const fs = require('fs-extra')

//var uri = 'http://www.lotte.com/goods/viewGoodsDetail.lotte?goods_no=303964888&infw_disp_no_sct_cd=20&infw_disp_no=5370476&allViewYn=N'
//var uri = 'http://www.lotte.com/goods/viewGoodsDetail.lotte?goods_no=396484359&infw_disp_no_sct_cd=78&infw_disp_no=5505566&allViewYn=N'

// var uri = 'https://www.muji.net/store/cmdty/detail/4549738459170'

// //var uri = 'https://www.muji.net/store/cmdty/detail/4549738522508'
// //var domain = 'lotte.com'
// var domain = 'muji.net'
// //var domain = 'store.punyus.jp'
// //var story_country = 'KR'
// var story_country = 'JP'


var user_locale = 'en'
var user_country = 'US'

function setVariables(uri) {
	if (uri.includes('muji')) {
		domain = 'muji.net'
		store_country = 'JP'
	}
	else if (uri.includes('punyus')) {
		domain = 'store.punyus.jp'
		store_country = 'JP'
	}
	else {
		domain = 'lotte.com'
		store_country = 'KR'
	}
}

function validate(itemData) {
	logging.info('itemData', itemData)
	var valid = true

	valid = valid && itemData.original_link
	valid = valid && itemData.original_name && itemData.original_name.value
	valid = valid && itemData.original_description && itemData.original_description.value
	valid = valid && itemData.original_price && itemData.original_price.value

	itemData.options.map(op => {
		valid = valid && op.name
	})

	valid = valid && itemData.product_id
	valid = valid && itemData.main_image_url
	valid = valid && itemData.price
	valid = valid && itemData.raw_html

	return valid
}

var start = async function () {
	// console.log(itemData)
	var urls = await fs.readFile('./server/scraper/urls.txt', 'utf8')
	urls = urls.split('\n')
	logging.info('FILE', urls)

	for (var i = 0; i < urls.length; i++) {
		var uri = urls[i]
		if (uri) {
			setVariables(uri)
			var itemData = await scrape(uri, user_country, user_locale, store_country, domain)
			var valid = validate(itemData);
			if (valid) console.log('successfully scraped ' + domain)
			else console.log('failed to scrape ' + domain)
		}
	}
}
start()

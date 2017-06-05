import { get, post, del} from './async'

export const fetchCart = cart_id => get(
	`/api/cart/${cart_id}`, 
	'CART', 
	(type, json) => ({
		type: `${type}_SUCCESS`,
		response: json,
		receivedAt: Date.now()
	})
)

export const fetchCarts = () => get(
	'/api/carts', 
	'CARTS', 
	(type, json) => {
      	const carts = json.map(c => ({ ...c, locked: c.locked || false }));

  		return {
	        type: `${type}_SUCCESS`,
	        response: {
	        	archivedCarts: carts.filter(cart => cart.locked).reverse(),
	        	carts: carts.filter(cart => !cart.locked).reverse()
	        },
	        receivedAt: Date.now()
  		}
	}
)

export const updateCart = cart => post(
	`/api/cart/${cart.id}`, 
	'UPDATE_CART',
	cart, 
	(type, json) => ({
  		type: `${type}_SUCCESS`,
  		response: json,
  		receivedAt: Date.now()
	})
)

export const deleteCart = cart_id => del(
	`/api/cart/${cart_id}`, 
	'DELETE_CART',
	(type) => ({
  		type: `${type}_SUCCESS`,
  		response: cart_id,
  		receivedAt: Date.now()
	})
)

export const addItem = (cart_id, item_id) => post(
	`/api/cart/${cart_id}/item`, 
	'ADD_ITEM',
	{ item_id }, 
	(type, json) => ({
  		type: `${type}_SUCCESS`,
  		response: json,
  		receivedAt: Date.now()
	})
)


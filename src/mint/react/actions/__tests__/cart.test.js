import nock from 'nock'
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'

import { fakeStore } from '../../utils';
import { fetchCart, fetchItems, removeItem, addItem } from '../cart'
import { RECEIVE_CART, REQUEST_CART, REQUEST_REMOVE_ITEM_FROM_CART, RECEIVE_REMOVE_ITEM_FROM_CART, REQUEST_ADD_ITEM_TO_CART, RECEIVE_ADD_ITEM_TO_CART, RECEIVE_ITEMS, REQUEST_ITEMS } from '../../constants/ActionTypes'

const middlewares = [ thunk ]
const mockStore = configureMockStore(middlewares)

describe('cart actions', () => {
  let body;

  afterEach(() => {
    nock.cleanAll()
  })

  body = { fakeResponse: ['do something'] }

  it('creates REQUEST_CART, RECEIVE_CART when fetchCart has been done', () => {
    nock('http://localhost:3000/api')
      .get('/cart/fakeId')
      .reply(200, { body })

    const expectedActions = [
      { type: REQUEST_CART },
      { type: RECEIVE_CART, body }
    ]

    const store = mockStore({
      session: {  
        newAccount: false,
        onborded: false,
        user_accounts: [{id: 1}]
      },
      cart: {  
        cart_id: 'testId',
        items: [{id: 1}]
      }
    });

    return store.dispatch(fetchCart('testId'))
      .then(() => { 
        expect(store.getActions()).toEqual(expectedActions)
      })
      .catch((error) => {
        // error handler
      });
  })

  it('creates REQUEST_ITEMS, RECEIVE_ITEMS when fetchItems has been done', () => {
    nock('http://localhost:3000/api')
      .get('/cart/fakeid/items')
      .reply(200, { body })

    const expectedActions = [
      { type: REQUEST_ITEMS },
      { type: RECEIVE_ITEMS, body }
    ]

    const store = mockStore({
      session: {  
        newAccount: false,
        onborded: false,
        user_accounts: [{id: 1}]
      },
      cart: {  
        cart_id: 'testId',
        items: [{id: 1}]
      }
    });

    return store.dispatch(fetchItems('testId'))
      .then(() => { 
        expect(store.getActions()).toEqual(expectedActions)
      })
      .catch((error) => {
        // error handler
      });
  })

  it('creates REQUEST_REMOVE_ITEM_FROM_CART, RECEIVE_REMOVE_ITEM_FROM_CART when removeItem has been done', () => {
    nock('http://localhost:3000/api')
      .get('/cart/fakeid/items')
      .reply(200, { body })

    const expectedActions = [
      { type: REQUEST_REMOVE_ITEM_FROM_CART },
      { type: RECEIVE_REMOVE_ITEM_FROM_CART, body }
    ]

    const store = mockStore({
      session: {  
        newAccount: false,
        onborded: false,
        user_accounts: [{id: 1}]
      },
      cart: {  
        cart_id: 'testId',
        items: [{id: 1}]
      }
    });

    return store.dispatch(removeItem('testId'))
      .then(() => { 
        expect(store.getActions()).toEqual(expectedActions)
      })
      .catch((error) => {
        // error handler
      });
  })

  it('creates REQUEST_ADD_ITEM_TO_CART, RECEIVE_ADD_ITEM_TO_CART when addItem has been done', () => {
    nock('http://localhost:3000/api')
      .get('/cart/fakeid/items')
      .reply(200, { body })

    const expectedActions = [
      { type: REQUEST_ADD_ITEM_TO_CART },
      { type: RECEIVE_ADD_ITEM_TO_CART, body }
    ]

    const store = mockStore({
      session: {  
        newAccount: false,
        onborded: false,
        user_accounts: [{id: 1}]
      },
      cart: {  
        cart_id: 'testId',
        items: [{id: 1}]
      }
    });

    return store.dispatch(addItem('testId'))
      .then(() => { 
        expect(store.getActions()).toEqual(expectedActions)
      })
      .catch((error) => {
        // error handler
      });
  })
})
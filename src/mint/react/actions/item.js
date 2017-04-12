import {
  REQUEST_ITEM,
  RECEIVE_ITEM,
  CLEAR_ITEM,
  REQUEST_ADD_ITEM,
  RECEIVE_ADD_ITEM,
  REQUEST_REMOVE_ITEM,
  RECEIVE_REMOVE_ITEM,
  RECEIVE_INCREMENT_ITEM,
  REQUEST_INCREMENT_ITEM,
  RECEIVE_DECREMENT_ITEM,
  REQUEST_DECREMENT_ITEM,
} from '../constants/ActionTypes';

const receive = (item) => ({
  type: RECEIVE_ITEM,
  item
});

const request = () => ({
  type: REQUEST_ITEM
});

const clear = () => ({
  type: CLEAR_ITEM
});

const requestAddItem = () => ({
  type: REQUEST_ADD_ITEM
});

const receiveAddItem = (item) => ({
  type: RECEIVE_ADD_ITEM,
  item
});

const requestRemoveItem = () => ({
  type: REQUEST_REMOVE_ITEM
});

const receiveRemoveItem = (itemToRemove) => ({
  type: RECEIVE_REMOVE_ITEM,
  itemToRemove
});

const receiveIncrementItem = (item) => ({
  type: RECEIVE_INCREMENT_ITEM,
  item
});

const requestIncrementItem = (item) => ({
  type: REQUEST_INCREMENT_ITEM,
  item
});

const receiveDecrementItem = (item) => ({
  type: RECEIVE_DECREMENT_ITEM,
  item
});

const requestDecrementItem = (item) => ({
  type: REQUEST_DECREMENT_ITEM,
  item
});

export function previewItem(item_id) {
  return async function (dispatch) {
    dispatch(request());

    try {
      const response = await fetch(`/api/itempreview?q=${item_id}`, {
        credentials: 'same-origin'
      });

      return dispatch(receive(await response.json()));
    } catch (e) {
      throw 'error in cart fetchItem';
    }
  };
}

export function addItem(cart_id, item_id) {
  return async dispatch => {
    dispatch(requestAddItem());
    try {
      const response = await fetch(`/api/cart/${cart_id}/item`, {
        'method': 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        'body': JSON.stringify({
          item_id
        })
      });
      return dispatch(receiveAddItem(await response.json()));
    } catch (e) {
      throw e;
    }
  };
}

export function removeItem(cart_id, item_id) {
  return async dispatch => {
    dispatch(requestRemoveItem());
    try {
      await fetch(`/api/cart/${cart_id}/item/${item_id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      return dispatch(receiveRemoveItem(item_id));
    } catch (e) {
      throw 'error in cart removeItem';
    }
  };
}

export function incrementItem(item_id, quantity) {
  return async dispatch => {
    dispatch(requestIncrementItem());
    try {
      const response = await fetch(`/api/item/${item_id}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: ++quantity
        })
      });
      return dispatch(receiveIncrementItem(await response.json()));
    } catch (e) {
      throw 'error in cart removeItem';
    }
  };
}

export function decrementItem(item_id, quantity) {
  return async dispatch => {
    dispatch(requestDecrementItem());
    try {
      const response = await fetch(`/api/item/${item_id}`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: --quantity
        })
      });
      return dispatch(receiveDecrementItem(await response.json()));
    } catch (e) {
      throw 'error in cart removeItem';
    }
  };
}

export function clearItem() {
  return async function (dispatch) {
    return dispatch(clear());
  };
}

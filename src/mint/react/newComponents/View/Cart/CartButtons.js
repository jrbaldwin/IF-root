// mint/react/components/View/Cart/Cart.js

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { Icon } from '../../../../react-common/components';

export default class CartButtons extends Component {
  
  static propTypes = {
    cart: PropTypes.object,
    user: PropTypes.object,
    item: PropTypes.object,
    editItem: PropTypes.func,
    editId: PropTypes.string,
    removeItem: PropTypes.func,
    addItem: PropTypes.func
  }

  render() {
    const { cart, user, editId, item, editItem, removeItem, copyItem, updateItem } = this.props,
      isLeader = user.id === cart.leader.id;

    return (
      <div className='action'>
        { 
          editId === item.id && !cart.locked && user.id === item.added_by ? <div className='update'>
            <button onClick={() => item.quantity === 1 ? removeItem(cart.id, item.id) : updateItem(item.id, { quantity: item.quantity - 1 })}> - </button>
            <p>{ item.quantity }</p>
            <button onClick={() => updateItem(item.id, { quantity: item.quantity + 1 })}> + </button>
          </div> : null 
        }
        { editId === item.id && !cart.locked && user.id === item.added_by ? <button onClick={() => removeItem(cart.id, item.id)}>Remove Item</button> : null }
        { editId !== item.id && !cart.locked && user.id === item.added_by ? <button onClick={() => editItem(item.id)}><span>Edit Item</span></button> : null }
        { editId !== item.id && !cart.locked && user.id !== item.added_by ? <button onClick={() => copyItem(cart.id, item.id)}><span>Copy Item</span></button> : null }
        { cart.locked ? <button className="locked" disabled='true'><Icon icon='Locked'/></button> : null }
      </div> 
    );
  }
}

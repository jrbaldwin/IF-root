// mint/react/components/View/View.js

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import { calculateItemTotal, displayCost, timeFromDate } from '../../../utils';
import { ButtonsContainer } from '../../../newContainers';

//Analytics!
import ReactGA from 'react-ga';


export default class Details extends Component {

  render() {
    const { name, leader, store,  store_locale, members, items, thumbnail_url, updatedAt, views } = this.props,
          total = calculateItemTotal(items);

    return (
      <table className='details'>
        <tbody>
          <tr>
  			    <th colSpan='100%'>
              <div className={`image`} style={{
                backgroundImage: `url(${thumbnail_url || '//storage.googleapis.com/kip-random/kip_head_whitebg.png'})`,
              }}/>
              <div className='text'> 
                <h1>{name}</h1>
                <p>Created By: {leader.name} | {store} {store_locale}</p>
                <h4>Kip Cart – <span className='price'>{displayCost(total)} Total</span></h4>
              </div> 
              <ButtonsContainer/>
            </th>
          </tr>
          <tr>
            <td>
              <span>{views} Views</span>
              <span>{items.length} Items</span>
              <span>{members.length} Members</span>
              <span>Updated {timeFromDate(updatedAt)}</span>
            </td>
        	</tr>
        </tbody>
      </table>
    );
  }
}




// react/components/Invoice/Invoice.js

import PropTypes from 'prop-types';
import React, { Component } from 'react';
import PaymentSources from './PaymentSources';
import Stripe from './Stripe';

export default class Payment extends Component {

  state = {
    selectedType: null
  }
  paymentTypes = [{
    type: 'split_single',
    text: 'admin pay for all'
  }, {
    type: 'split_equal',
    text: 'split equally amongst the people of kip!'
  }, {
    type: 'split_by_item',
    text: 'split by item'
  }];
  static propTypes = {
    createPayment: PropTypes.func,
    updateInvoice: PropTypes.func,
    selectAccordion: PropTypes.func,
    fetchPaymentStatus: PropTypes.func,
    selectedAccordion: PropTypes.string
  }

  render = () => {
    const { userPaymentStatus, selectAccordion, selectedAccordion, updateInvoice, invoice } = this.props, { selectedType } = this.state;
    return (
      <div className='payment accordion'>
        <nav onClick={() => selectAccordion('payment')}>

          <h3>2. Payment method</h3>
        </nav>
        {
          selectedAccordion.includes('payment') ?
            <div>
                    <div>
          <nav>
            <h4>Payment Type</h4>
          </nav>
          <ul>
            {
              this.paymentTypes.map((paymentType, i) => (
                <li key={i} className={selectedType === i ? 'selected' : ''} onClick={() => {
                  this.setState({selectedType: i});
                  updateInvoice(invoice.id, 'split_type', paymentType.type);
                }}>
                <div className='circle'/>
                <div className='text'>
                  <h4>{paymentType.text}</h4>
                </div>
                </li>
              ))
            }

          </ul>
        </div>
            <nav>
              <h4>Your credit and debit cards</h4>
            </nav>
            <ul>
              {
                userPaymentStatus.paid ? <p> user has already paid </p> :
                  <div>
                    <PaymentSources {...this.props}/>
                    <Stripe {...this.props}/>
                  </div>
              }
            </ul>
         </div> : null
        }
      </div>
    );
  }
}
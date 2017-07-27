// react/components/Invoice/Invoice.js

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import Payment from './Payment';
import InvoiceAddress from './InvoiceAddress';
import InvoiceInfo from './InvoiceInfo';
import Shipping from './Shipping';
import Forms from './Forms';

export default class Invoice extends Component {
  static propTypes = {
    cart: PropTypes.object,
    user: PropTypes.object,
    invoice: PropTypes.object,
    selectedAccordion: PropTypes.string,
    fetchInvoiceByCart: PropTypes.func,
    tab: PropTypes.string,
    setTab: PropTypes.func,
    fetchPaymentStatus: PropTypes.func
  }

  componentDidMount() {
    const { cart, fetchInvoiceByCart, tab, setTab } = this.props;
    if (tab !== 'invoice') setTab();
    fetchInvoiceByCart(cart.id);
  }

  componentWillMount() {
    const { fetchPaymentStatus, invoice } = this.props;
    fetchPaymentStatus(invoice.id);
  }

  componentWillReceiveProps = ({ cart, fetchInvoiceByCart }) =>
    (cart.id !== this.props.cart.id) ? fetchInvoiceByCart(cart.id) : null

  render() {
    const { selectedAccordion, user, cart } = this.props;
    const isLeader = user.id === cart.leader.id || user.id === cart.leader;
    return (
      <div className='invoice'>
        { selectedAccordion.includes('form') ? <Forms {...this.props}/> : null}
        <InvoiceInfo {...this.props} />
        <InvoiceAddress {...this.props} isLeader={isLeader}/>
        <Payment {...this.props} isLeader={isLeader}/>
        <Shipping {...this.props} isLeader={isLeader}/>
      </div>
    );
  }
}

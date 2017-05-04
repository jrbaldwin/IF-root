// react/components/Toast/Toast.js

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';

export default class Toast extends Component {
  static propTypes = {
    toast: PropTypes.string,
    status: PropTypes.string,
    location: PropTypes.object,
    history: PropTypes.object
  }

  state = {
    showToast: false
  }

  componentWillMount() {
    const { status, toast } = this.props;
    console.log({ toast, status })
    if (toast && status)::this._showToast(status, toast);
  }

  componentWillReceiveProps(nextProps) {
    const { toast, status } = this.props;
    const { toast: newToast, status: newStatus } = nextProps;
    console.log({ toast, status, newToast, newStatus })
    if ((newToast && newStatus) && (toast !== newToast || status !== newStatus))::this._showToast(newStatus, newToast);
  }

  _showToast(status, toast) {
    const { history: { replace }, location } = this.props;
    console.log({ location });
    setTimeout(() => this.setState({ status, toast, showToast: true }), 1);
    setTimeout(() => {
      this.setState({ toast: null, status: null, showToast: false });
      // replace(`/cart/${cart_id}/`);
    }, 3000);
  }

  render() {
    const { props: { status, toast }, state: { showToast } } = this;
    return (
      <CSSTransitionGroup
        transitionName='toastTransition'
        transitionEnterTimeout={0}
        transitionLeaveTimeout={0}>
        {
          showToast 
            ? <div className={`${status} toast`} key={toast}>
                {toast}
            </div>
            : null
        }
      </CSSTransitionGroup>
    );
  }
}

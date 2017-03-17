import React, { PropTypes, Component } from 'react';
import { connect } from 'react-redux';
import Cart from '../components/Cart';
import { cart } from '../actions';

class CartContainer extends Component {
  constructor(props) {
    super(props);
    this.state = { cart: {items:{}} };
  }
  componentDidMount() {
    const { dispatch } = this.props;
    console.log('context', this.context);
    console.log(this.state)
    this.state.cart = dispatch(cart.fetchItems(this.props.cart_id));
    console.log(this.state)
  }

  componentWillReceiveProps(nextProps) {
    const { dispatch } = nextProps;
    this.state.cart = dispatch(cart.fetchItems(nextProps.cart_id));
  }

  render() {
    return <Cart items={this.state.cart.items} cart_id={this.props.cart_id} />;
  }
}

const mapStateToProps = (state, ownProps) => {
  console.log('state', state)
  return {
    cart_id: ownProps.cart_id
  };
};

export default connect(mapStateToProps)(CartContainer);

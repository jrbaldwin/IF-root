import { connect } from 'react-redux';
import { Header } from '../components';
import { togglePopup, toggleSidenav } from '../actions';

const mapStateToProps = (state, props) => {
  return {
    cart: state.cart.present,
    oldCart: state.cart.past[0],
    user: state.user,
    showUndoRemove: state.cart.past.length > 0
  };
};

const mapDispatchToProps = dispatch => ({
  _toggleLoginScreen: () => dispatch(togglePopup()),
  _toggleSidenav: () => dispatch(toggleSidenav())
});

export default connect(mapStateToProps, mapDispatchToProps)(Header);

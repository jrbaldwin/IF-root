const initialState = {
  cart_id: '',
  magic_link: '',
  cart_leader: '',
  cart_members: [],
  items: []
};

function cart(state = initialState, action) {
  // For now, don't handle any actions
  // and just return the state given to us.
  state.type = state.type ? state.type : 'TEST_TYPE';
  return state;
}
export default cart;
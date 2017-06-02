// react/reducers/currentCart.js

const initialState = { 
  name: '',
  leader: { 
    name: '' 
  },
  store: '',
  store_locale: '',
  members: [],
  items: [] 
} 

export default function cart(state = initialState, action) {
  switch (action.type) {
    case 'CART_SUCCESS':
    case 'UPDATE_CART_SUCCESS':
      return {
        ...state,
        ...action.response
      };
    case 'DELETE_CART_SUCCESS':
      return initialState
    default:
      return state;
  }
}

// Selectors
export const getMemberById = (state, props) => [...state.members, state.leader].find(member => member.id === props.id);

export const splitCartById = (state, props) => {
  const id = props ? props.id : null;

  return state.currentCart.items.reduce((acc, item) => {
    acc.quantity = acc.quantity + (item.quantity || 1);
    let linkedMember = getMemberById(state.currentCart, { id: item.added_by });

    if (id === item.added_by) {
      acc['my'].push(item);
    } else if (acc.others.find(member => member.id === linkedMember.id)) {
      const others = acc.others.filter(member => member.id !== linkedMember.id);
      let newMember = acc.others.find(member => member.id === linkedMember.id);
      newMember = {
        ...newMember,
        items: [...newMember.items, item]
      };
      acc = {
        ...acc,
        others: [...others, newMember]
      };
    } else {
      acc.others.push({
        id: item.added_by,
        email: linkedMember.email_address,
        name: linkedMember.name,
        items: [item]
      });
    }

    return acc;
  }, {
    my: [],
    others: [],
    quantity: 0
  });
};
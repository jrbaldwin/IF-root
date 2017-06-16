// react/reducers/cards.js

const initialState = { 
  selectedItemId: '',
  history: false,
  results: [], 
  categories: [],
  query: '' 
};

export default (state = initialState, action) => {
  let itemIndex;
  switch (action.type) {
    case 'CATEGORIES_SUCCESS':
    case 'SEARCH_SUCCESS':
    case 'SELECT_ITEM':
    case 'UPDATE_QUERY':
      return {
        ...state,
        ...action.response
      };
    case 'UPDATE_ITEM_SUCCESS':
      return {
        ...state,
        results: state.results.reduce((acc, item, i) => {
          item.asin === action.response.item.asin ? acc.push(action.response.item) : acc.push(item);
          return acc;
        }, [])
      };
    case 'SELECT_ITEM_LEFT':
      itemIndex = state.results.findIndex((item) => {
        return item.id === state.selectedItemId;
      });

      return {
        ...state,
        selectedItemId: itemIndex === 0 ? null : state.results[itemIndex - 1].id
      };
    case 'SELECT_ITEM_RIGHT':
      itemIndex = state.results.findIndex((item) => {
        return item.id === state.selectedItemId;
      });

      return {
        ...state,
        selectedItemId: itemIndex === state.results.length - 1 ? null : state.results[itemIndex + 1].id
      };
    case 'TOGGLE_HISTORY':
      return {
        ...state,
        history: !state.history
      };
    default:
      return state;
  }
};

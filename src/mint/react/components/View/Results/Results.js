// mint/react/components/View/Results/Results.js

import PropTypes from 'prop-types';
import React, { Component } from 'react';

import Default from './Default';
import Selected from './Selected';
import { numberOfItems } from '../../../utils';
import { EmptyContainer } from '../../../containers';

const size = 3;

export default class Results extends Component {
  static propTypes = {
    selectedItemId: PropTypes.string,
    results: PropTypes.array,
    cart: PropTypes.object,
    query: PropTypes.string,
    addItem: PropTypes.func,
    selectItem: PropTypes.func,
    user: PropTypes.object,
    togglePopup: PropTypes.func,
    updateItem: PropTypes.func
  }

  shouldComponentUpdate(nextProps, nextState) {
    // need this, otherwise page always rerender every scroll
    if (
      numberOfItems(nextProps.results) !== numberOfItems(this.props.results) ||
      nextProps.selectedItemId !== this.props.selectedItemId ||
      nextProps.cart.items.length !== this.props.cart.items.length ||
      nextProps.results[0] && nextProps.results[0].id !== this.props.results[0].id
    ) return true;

    return false;
  }

  render() {
    // Add
    let arrow, selected;
    const { user, cart, query, results, addItem, selectedItemId, selectItem, togglePopup, updateItem } = this.props,
      numResults = results.length,
      cartAsins = cart.items.map((item) => `${item.asin}-${item.added_by}`),
      partitionResults = results.reduce((acc, result, i) => {
        if (i % size === 0) acc.push([]);
        acc[acc.length - 1].push(result);

        if (result.id === selectedItemId) {
          selected = {
            row: acc.length,
            result,
            index: i
          };
          arrow = acc[acc.length - 1].length - 1;
        }

        return acc;
      }, []);

    if (selected)
      partitionResults.splice(selected.row, 0, [{ ...selected.result, selected: true, index: selected.index }]);

    if (numResults === 0)
      return <EmptyContainer />;

    return (
      <table className='results'>
        <tbody>
          <tr>
            <th colSpan='100%'>
              <nav>
                <p> About {numResults} results for <span className='price'>"{query}"</span> from {cart.store} {cart.store_locale} </p>
              </nav>
            </th>
          </tr>
          {
            partitionResults.map((itemrow, i) => (
              <tr key={i} >
                {
                  itemrow.map(item => {
                    return item.selected ? (
                      <Selected 
                        key={item.id}
                        item={item} 
                        cart={cart} 
                        user={user}
                        arrow={arrow}
                        cartAsins={cartAsins}
                        addItem={addItem} 
                        selectedItemId={selectedItemId}
                        selectItem={selectItem}
                        togglePopup={togglePopup}
                        updateItem={updateItem}
                        results={results}/>
                      ) : ( 
                        <Default 
                          key={item.id}
                          item={item} 
                          cart={cart} 
                          user={user}
                          cartAsins={cartAsins}
                          addItem={addItem} 
                          selectedItemId={selectedItemId} 
                          selectItem={selectItem}
                          togglePopup={togglePopup}/>
                      );
                  })
                }
              </tr>
            ))
          }
        </tbody>
      </table>
    );
  }
}
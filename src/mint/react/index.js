import React from 'react';
import ReactDOM from 'react-dom';
import { createStore, combineReducers, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import createHistory from 'history/createBrowserHistory';
import { Route, Switch } from 'react-router';
import thunkMiddleware from 'redux-thunk';
import { ConnectedRouter, routerReducer, routerMiddleware } from 'react-router-redux';

import Reducers from './reducers';
import { session } from './actions';
import Routes from './routes';

import 'isomorphic-fetch'

if (module.hot) {
  module.hot.accept();
}

const history = createHistory();
const historyMiddleware = routerMiddleware(history);

// creating redux store
const store = createStore(
  Reducers,
  applyMiddleware(thunkMiddleware),
  applyMiddleware(historyMiddleware)
);

// update login status
store.dispatch(session.update());

ReactDOM.render(
  <Provider store={store}>
   <ConnectedRouter history={history}>
       <Routes />
   </ConnectedRouter>
 </Provider>,
  document.getElementById('root')
);

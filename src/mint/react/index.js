// react/index.js

import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import { Route } from 'react-router';
import createHistory from 'history/createBrowserHistory';
import thunkMiddleware from 'redux-thunk';
import { ConnectedRouter, routerMiddleware } from 'react-router-redux';

import Reducers from './reducers';
import { session } from './actions';
import { AppContainer, ErrorPage } from './containers';

//Analytics!
import ReactGA from 'react-ga';

import 'whatwg-fetch';

if (module.hot) {
  module.hot.accept();
}

const history = createHistory();
history.listen((location, action) => {
  ReactGA.set({ path: location.pathname });
  ReactGA.pageview(location.pathname);
});
const historyMiddleware = routerMiddleware(history);

// creating redux store
import { createLogger } from 'redux-logger';
const loggerMiddleware = createLogger({
  duration: true,
  timestamp: false,
  collapsed: true,
  level: 'info'
});
const store = createStore(
  Reducers,
  applyMiddleware(thunkMiddleware, historyMiddleware, loggerMiddleware)
);

// update login status
store.dispatch(session.update());

ReactDOM.render(
  <Provider store={store}>
   <ConnectedRouter history={history}>
       <Route path="*" component={AppContainer} />
   </ConnectedRouter>
 </Provider>,
  document.getElementById('root')
);

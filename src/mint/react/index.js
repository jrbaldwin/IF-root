// react/index.js
// renders react, using react router
import React from 'react';
import ReactDOM from 'react-dom';
import {
  browserHistory
} from 'react-router';
import {
  syncHistoryWithStore
} from 'react-router-redux';
import Routes from './routes';
import './index.css';

ReactDOM.render(
  <Routes history={browserHistory} />,
  document.getElementById('root')
);

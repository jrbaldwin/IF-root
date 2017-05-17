// react/actions/session.js

import { REQUEST_SESSION, RECEIVE_SESSION, REQUEST_UPDATE_SESSION, RECEIVE_UPDATE_SESSION, TOGGLE_ADDING, UPDATE_USER } from '../constants/ActionTypes';
import { SubmissionError } from 'redux-form';

const receive = (newSession) => ({
  type: RECEIVE_SESSION,
  newSession
});

const request = () => ({
  type: REQUEST_SESSION
});

const requestUpdate = () => ({
  type: REQUEST_UPDATE_SESSION
});

const receiveUpdate = (newSession) => ({
  type: RECEIVE_UPDATE_SESSION,
  newSession
});

const updateUserInfo = userInfo => ({
  type: UPDATE_USER,
  userInfo
});

export const toggleAddingToCart = () => ({
  type: TOGGLE_ADDING
});

export function update() {
  return async dispatch => {
    dispatch(request());

    try {
      const response = await fetch('/api/session', {
        credentials: 'same-origin'
      });
      return dispatch(receive(await response.json()));
    } catch (e) {
      throw 'error in session update';
    }
  };
}

export function signIn(cart_id, email) {
  return async dispatch => {
    dispatch(requestUpdate());

    try {
      const response = await fetch(`/api/identify?cart_id=${cart_id}&email=${encodeURIComponent(email)}`, {
        credentials: 'same-origin'
      });

      return dispatch(receiveUpdate(await response.json()));
    } catch (e) {
      return new SubmissionError({ email: 'You are already signed in, check your email!' });
    }
  };
}

export function logout() {
  return async dispatch => {
    try {
      await fetch('/api/logout', {
        credentials: 'same-origin'
      });

      return dispatch(receiveUpdate({
        user_account: {},
        animal: '',
        createdAt: '',
        updatedAt: '',
        id: ''
      }));
    } catch (e) {
      return new SubmissionError({ email: 'You are already signed in, check your email!' });
    }
  };
}

export function login(cart_id, email) {
  return async dispatch => {
    try {
      await fetch(`/api/login?email=${encodeURIComponent(email)}&redirect=/cart/${cart_id}`, {
        credentials: 'same-origin'
      });

      
      return dispatch(receiveUpdate(await response.json()));
    } catch (e) {
      return new SubmissionError({ email: 'Something went wrong with login' });
    }
  };
}

export function postFeedback(feedback) {
  return async dispatch => {
    try {
      await fetch('/api/feedback', {
        'method': 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        'body': JSON.stringify(feedback)
      });
    } catch (e) {
      throw e;
    }
  };
}

export function updateUser(id, newInfo) {
  return async dispatch => {
    try {
      const res = await fetch(`/api/user/${id}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(newInfo)
      });
      return dispatch(updateUserInfo(await res.json()));
    } catch (e) {
      throw e;
    }
  };
}

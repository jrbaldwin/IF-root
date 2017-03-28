import React, { Component } from 'react';
import { Typeform, TypeformField } from '..';

export default class Onboard extends Component {
  render() {
    return (
      <Typeform onSubmit={e => console.log('submit', e)} nextBtnOnClick={e => console.log(e)}>
      	<TypeformField name='input1' type='email' placeholder='enter an email' />
      	<TypeformField name='input2' type='url' placeholder='enter a url'/>
    	</Typeform>
    );
  }
}

import React, { Component } from 'react';
import { Field } from 'redux-form';
import { DealsContainer } from '../../containers';
import { Icon } from '..';

export default class AmazonForm extends Component {
  constructor(props) {
    super(props);
    this.renderField = ::this.renderField;
  }

  renderField({ input, label, placeholder, handleSubmit, type, meta: { touched, error, warning, submitting, active } }) {
    return (
      <div>
          <label>
            {label}
          </label>
          <div className='form__input'>
            <input {...input} placeholder={placeholder} type={type} autoFocus autoComplete='off'/>
            <button
              className='form__input__submit'
              type="submit"
              onClick={handleSubmit}>
              <p>
                Ok
              </p>
            </button>
          </div>
          <DealsContainer isDropdown={active}/>
        </div>
    );
  }

  render() {
    const { props, renderField } = this;
    const { handleSubmit, cart_id, history: { replace } } = props;
    return (
      <form onSubmit={handleSubmit} className="form">
        <Field
          name="url"
          type="string"
          label="Add Item to Kip Cart"
          placeholder="Paste Amazon URL or Search"
          handleSubmit={handleSubmit}
          component={renderField}/>
    </form>
    );
  }
}
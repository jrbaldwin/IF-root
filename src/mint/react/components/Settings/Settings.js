// react/components/Settings/Settings.js

import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { PropTypes } from 'prop-types';
import { Icon } from '..';

export default class Settings extends Component {
  static propTypes = {
    cart_id: PropTypes.string,
    currentUser: PropTypes.object,
    updateUser: PropTypes.func
  }
  state = {
    editName: false,
    editMail: false
  }

  componentDidMount() {
    const { currentUser: { name, email_address } } = this.props;
    this.setState({
      name,
      mail: email_address
    });
  }

  _editName() {
    this.setState({
      editName: true
    });
  }

  _editMail() {
    this.setState({
      editMail: true
    });
  }

  _saveName() {
    const { props: { updateUser, currentUser: { id } }, state: { name } } = this;
    this.setState({
      editName: false
    });
    updateUser(id, { name });
  }

  _saveMail() {
    const { props: { updateUser, currentUser: { id } }, state: { mail } } = this;
    this.setState({
      editMail: false
    });
    updateUser(id, { email_address: mail });
  }

  render() {
    const { props: { cart_id, currentUser: { name, email_address } }, state: { editName, editMail } } = this;
    return (
      <div className='settings'>
        <ul>
          { 
            editName
              ? <li>
                  Name: 
                  <input 
                    autoFocus 
                    type='text' 
                    required 
                    placeholder='Name' 
                    defaultValue={name} 
                    onChange={(e) => this.setState({name:e.target.value})}
                  />
                  <button onClick={::this._saveName}> Save </button>
                </li>
              : <li onClick={::this._editName}><p>{name}  &nbsp;<Icon icon='Edit'/></p></li>
          }
          { 
            editMail
              ? <li>
                  Email: <input 
                    autoFocus 
                    type='text' 
                    required 
                    placeholder='Email' 
                    defaultValue={email_address} 
                    onChange={(e) => this.setState({mail:e.target.value})}
                  />
                  <button onClick={::this._saveMail}> Save </button>
                </li>
              : <li onClick={::this._editMail}><p>{email_address}  &nbsp;<Icon icon='Edit'/></p></li>
          }
          
          <li><Link to={`/cart/${cart_id}/m/Feedback`}><Icon icon='Email'/> &nbsp; Send Feedback</Link></li>
        </ul>
        <h4>Kip Version 1.3 (Mint)</h4>
      </div>
    );
  }
}

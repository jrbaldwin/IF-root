/* eslint react/prefer-stateless-function: 0, react/forbid-prop-types: 0 */
/* eslint global-require: 0 */
import React, { Component } from 'react';

import { Icon } from '../../themes';

export default class Ribbon extends Component {
  render() {
    const { fixed, _toggleSidenav, _toggleModal } = this.props;
    
    return (
      <nav className={`ribbon ${fixed ? 'background' : ''}`}>
        <div className='row-1'> 
          <div className="row row-1">
            <div className="row-1">
              <div className='image' style={
                {
                  backgroundImage: `url(https://storage.googleapis.com/kip-random/head%40x2.png)`
                }}/>
              <h1>Kip</h1>
            </div>
          </div>
          <div className="right row row-1">
            <div className="right row row-1" onClick={() => _toggleSidenav()}>
              <Icon icon='Menu' />
            </div>
          </div>
          <div className="right row row-1">
            <div className="col-12 row-1 action">
              <button onClick={() => _toggleModal()}>Login</button>
            </div>
          </div>
        </div>
      </nav>
    );
  }
}


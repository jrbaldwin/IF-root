/* eslint react/prefer-stateless-function: 0, react/forbid-prop-types: 0 */
/* eslint global-require: 0 */
import React, { Component } from 'react';

import { Ribbon, Services, About, Showcase, Reviews, Footer } from '..';
import { HeroContainer, StatementContainer } from '../../containers';


export default class Landing extends Component {
  render() {
    return (
      <div className="landing"> 
        <Ribbon/>
        <HeroContainer/>
        <StatementContainer/>
        <Services/>
        <About/>
        <Showcase/>
        <Footer/>
      </div>
    );
  }
}
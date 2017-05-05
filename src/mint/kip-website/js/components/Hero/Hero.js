/* eslint react/prefer-stateless-function: 0, react/forbid-prop-types: 0 */
/* eslint global-require: 0 */
import React, { Component } from 'react';
import CSSTransitionGroup from 'react-transition-group/CSSTransitionGroup';

import { Icon } from '../../themes';
import { Desktop, Desk, KipHead, Plant } from '../../themes/kipsvg';

export default class Hero extends Component {
  	render() {
  		const { items, animate } = this.props;
	    return (
	      	<div className={`hero image ${animate ? 'start' : ''}`}>
                <div className="hero__desktop">
                	<Desktop />
                	<h1>Hi I'm Kip! <br/> A friendly penguin that helps you collect group orders into a single shopping cart</h1>
                </div>

                <div className="hero__desk">
	                <Desk/>
				</div>

				<div className="hero__kip">
					<KipHead/>
				</div>

				<div className="hero__plant">
					<Plant/>
				</div>

				<svg className="sine" width="100%" height="50px" viewBox="0 0 100 31" preserveAspectRatio="none">
					<g>
						<path d="M0,26.5c9.7,3.8,20.3,4.2,30.3,0.9c1.9-0.6,3.8-1.4,5.7-2.2c10.6-4.5,20.7-10.2,31.1-15.1s21.4-9,32.9-10
							v31.7H0V26.5z"/>
					</g>
				</svg>

	      	</div>
	    );
  	}
}






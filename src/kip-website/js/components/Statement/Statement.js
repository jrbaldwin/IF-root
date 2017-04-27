/* eslint react/prefer-stateless-function: 0, react/forbid-prop-types: 0 */
/* eslint global-require: 0 */
import React, { Component } from 'react';
import Typist from 'react-typist';

import { Icon } from '../../themes';
import { Services } from '..';

export default class Statement extends Component {

	constructor(props) {
		super(props);
		this._animation = ::this._animation;
		this.state = {
		  typing: true
		};
	}

	componentWillUnmount() {
		const { _animation } = this;
		_animation(true);
	}

	componentDidMount() {
		const { _animation } = this;
		_animation();
	}

	componentWillReceiveProps(nextProps) {
		const { _animation, props: { items } } = this;


		if( items[0].id !== nextProps.items[0].id) {
			_animation(true);
			this.setState({
				typing: true
			});
			_animation();
		}
	}

	_animation(stop) {
		if (stop) {
			if (self) clearTimeout(self.timeout);
			clearTimeout(this.timeout);
		} else {
			let self = this;
			self.timeout = setTimeout(() => {
				self.setState({
					typing: false
				});
			}, 3500);
		}
	}

  	render() {
  		const { state: { typing }, props: { items } } = this;
  		
	    return (
	      	<div className="statement"> 
		        <div className="col-9 row-1 card">
		        	<div className="col-12 row-1 headline">
		        		<h1>Kip Gets Your Team</h1>
		        		{
				            typing ? <div className='Static'>
				            	<span className='Cursor Cursor--blinking'>|</span>
				            </div> : <Typist 
				              	cursor={{
				                	show: true
				              	}} 
				              	avgTypingDelay={100} 
				              	stdTypingDelay={0}>
				        		<h1>{`${items[0].searchTerm}`}</h1>
			            	</Typist> 
				        }
		        	</div>
		        	<div className="col-12 row-1 text">
		        		<p>Whatever you need, Kip gets you some cool stuff. Maybe even some Polar Bears, only if they are on sale and they arn't made with Carrots</p>
		        	</div>
		        	<div className="col-12 row-1 action">
		        		<button>
		        			SAVE THE ARTIC
		        			&nbsp;<Icon icon='Right'/>
		        		</button>
		        	</div>
		        </div>
		        <svg className="sine" width="100%" height="50px" viewBox="0 0 100 31" preserveAspectRatio="none">
					<g>
						<path fill="#fcfcf9" d="M0,26.5c9.7,3.8,20.3,4.2,30.3,0.9c1.9-0.6,3.8-1.4,5.7-2.2c10.6-4.5,20.7-10.2,31.1-15.1s21.4-9,32.9-10
							v31.7H0V26.5z"/>
					</g>
				</svg>
	      	</div>
	    );
  	}
}
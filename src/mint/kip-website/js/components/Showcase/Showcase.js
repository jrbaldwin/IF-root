/* eslint react/prefer-stateless-function: 0, react/forbid-prop-types: 0 */
/* eslint global-require: 0 */
import React, { Component } from 'react';
import { DefaultPlayer as Video } from 'react-html5video';

import { Icon } from '../../themes';

export default class Showcase extends Component {
  	render() {
  		const { animationState } = this.props;
	    return (
	      	<div className='showcase'> 
	      		<div className={`phone image ${animationState}`} style={{backgroundImage: 'url("https://s3.amazonaws.com/assets-chachat/phoneclip.png")'}}> 
			        <Video autoPlay loop muted
			            controls={['PlayPause', 'Seek', 'Time', 'Volume', 'Fullscreen']}>
			            <source src="https://s3.amazonaws.com/assets-chachat/1_sequence.webm" type="video/webm" />
			        </Video>
	      		</div>
				<svg className="sine" width="100%" height="50px" viewBox="0 0 100 31" preserveAspectRatio="none">
					<g>
						<path d="M0,26.5c9.7,3.8,20.3,4.2,30.3,0.9c1.9-0.6,3.8-1.4,5.7-2.2c10.6-4.5,20.7-10.2,31.1-15.1s21.4-9,32.9-10
							v31.7H0V26.5z"/>
					</g>
				</svg>
				<svg className="bottom" width="100%" height="50px" viewBox="0 0 100 31" preserveAspectRatio="none">
					<g>
						<path d="M0,26.5c9.7,3.8,20.3,4.2,30.3,0.9c1.9-0.6,3.8-1.4,5.7-2.2c10.6-4.5,20.7-10.2,31.1-15.1s21.4-9,32.9-10
							v31.7H0V26.5z"/>
					</g>
				</svg>
	      	</div>
	    );
  	}
}
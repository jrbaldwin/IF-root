/* @flow */
import React, { Component } from 'react'
import {
	IoChevronDown,
	IoSoupCanOutline,
	IoLaptop,
	IoIphone,
	IoSocialNodejs,
	IoEmail,
	IoSocialGithub,
	IoSocialLinkedin,
	IoAndroidCart,
	IoArrowRightC
} from 'react-icons/lib/io'

import {
	Support,
	Empower,
	Believe,
	Amazon,
	Google,
	Delivery,
	Slack,
	Microsoft,
	Dummy
} from './';

export default class Icon extends Component {
	render() {
    	switch (this.props.icon) {
    		case 'Right':
	          	return <IoArrowRightC/>
	        case 'Down':
	          	return <IoChevronDown/>
			case 'Cart':
	          	return <IoAndroidCart/>
	        case 'Server':
	        	return <IoSoupCanOutline/>
			case 'Client':
	        	return <IoLaptop/>
	        case 'Mobile':
	        	return <IoIphone/>
	        case 'Email':
	        	return <IoEmail/>
	        case 'Github':
	        	return <IoSocialGithub/>
	        case 'Linkedin':
	        	return <IoSocialLinkedin/>
	       	case 'Support':
	        	return <Support/>
	       	case 'Empower':
	        	return <Empower/>
	       	case 'Believe':
	        	return <Believe/>
	        case 'Amazon':
	        	return <Amazon/>
	       	case 'Google':
	        	return <Google/>
	       	case 'Slack':
	        	return <Slack/>
			case 'Microsoft':
	        	return <Microsoft/>
			case 'Delivery':
	        	return <Delivery/>
	        case 'Dummy':
	        	return <Dummy/>
      	}
    }
}

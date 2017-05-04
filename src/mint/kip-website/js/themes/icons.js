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
	IoArrowRightC,
	IoNaviconRound,
	IoClock,
	IoArrowGraphDownLeft,
	IoHappy,
	IoChevronUp,
	IoClose,
	IoPlus,
	IoLogOut,
	IoLogIn
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

import Burger from './kip_website_svg/Burger.js';

export default class Icon extends Component {
	render() {
    	switch (this.props.icon) {
    		case 'Right':
	          	return <IoArrowRightC/>
			case 'Plus':
				return <IoPlus/>
			case 'Clear':
				return <IoClose/>
			case 'Up':
				return <IoChevronUp/>
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
	       	case 'Menu':
	        	return <IoNaviconRound/>
	        case 'Clock':
	        	return <IoClock/>
	        case 'GraphDown':
	        	return <IoArrowGraphDownLeft/>
	        case 'Happy':
	        	return <IoHappy/>
		    case 'Logout':
		      	return <IoLogOut/>
		    case 'Login':
		      	return <IoLogIn/>
      	}
    }
}


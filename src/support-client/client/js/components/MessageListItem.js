import React, { Component, PropTypes } from 'react';
import findIndex from 'lodash/array/findIndex'
import uniq from 'lodash/array/uniq'


class MessageListItem extends Component {

  static propTypes = {
    message: PropTypes.object.isRequired
  };
  
   constructor (props) {
    super(props)
    this.state = { 
      isImage: null,
      displayMsg: ''
    }
  }

  componentDidMount() {
    const { message, index } = this.props 
    // console.log('MessageListItem message: ',message)
    let messageToDisplay =  (message.client_res && message.client_res[0] && !message.flags.toCinna) ?  message.client_res[0] : message.msg
    this.setState({ displayMsg: messageToDisplay })
    function checkImgURL (msg) {
        return ((typeof msg == 'string') && (msg.match(/\.(jpeg|jpg|gif|png)$/) != null));
    }
    if (messageToDisplay && checkImgURL(messageToDisplay)) {
      this.setState({ isImage : 'true'  })
    } else {
      this.setState({ isImage : 'false'  })
    }
  }

  renderMsg() {
     const {message,index} = this.props
     const msgType = (this.state.isImage === 'true') ? 'image' 
         : (message.flags && message.flags.toClient ? 'toClient' 
              : (message.flags && message.flags.toCinna) ? 'toCinna' : 'message')
                  // : (message.flags && message.flags.response) ? 'response' : 'message')
     const messageStyle = (message.flags && message.flags.toCinna) ? {clear: 'both', paddingTop: '0.1em', marginTop: '-1px', paddingBottom: '0.3em', fontStyle: 'italic'} : {clear: 'both', paddingTop: '0.1em', marginTop: '-1px', paddingBottom: '0.3em'}
     switch (msgType){
      case 'image' : 
        return (
          <div style={messageStyle}> 
            <img width='200' src={this.state.displayMsg} />
          </div>
          )
        break;
      case 'toCinna':
        return ( <div style={messageStyle}> 
                    Previewing  {message.action} search: {message.msg}
                 </div>
                )
        break;
      case 'toClient':
              switch(message.action) {
                case 'initial': 
                case 'similar':
                case 'modify':
                case 'more':
                  // console.log('case 1')
                  // message.client_res.unshift(text)
                  // let imgIndex;
                  // try {
                  //   imgIndex = findIndex(message.client_res,function(el){ if (el) {return ((el.indexOf('s3.amazonaws.com') > -1) || el.indexOf('ecx.images-amazon.com') > -1)}})
                  // } catch(err) {
                  //   console.log('MLI81: ',err, message)
                  // }

                  return (
                    <div>
                        <div style={messageStyle}> 
                            {message.client_res[0]}
                        </div>
                         <div style={messageStyle}> 
                            <a href={message.client_res[1].title_link}>{'➊' + message.client_res[1].title.split(':')[2]}</a> <br />
                            <img width='170' src={message.client_res[1].image_url} />
                        </div>
                         <div style={messageStyle}> 
                            <a href={message.client_res[2].title_link}>{'➋' + message.client_res[2].title.split(':')[2]}</a> <br />
                            <img width='170' src={message.client_res[2].image_url} />
                        </div>
                         <div style={messageStyle}> 
                            <a href={message.client_res[3].title_link}>{'➌' + message.client_res[3].title.split(':')[2]}</a> <br />
                            <img width='170' src={message.client_res[3].image_url} />
                        </div>
                    </div>
                    )
                  break;
                case 'focus':
                  // console.log('case focus')
                  // let attribs = message.amazon[message.searchSelect[0]].ItemAttributes[0];
                  // let topStr = ''
                  // let size = ''
                  // let reviews = ''
                  // if (message.amazon[message.searchSelect[0]].realPrice){ topStr = message.amazon[message.searchSelect].realPrice;}
                  // if (attribs.Size){size =  ' ○ ' + "Size: " +  attribs.Size[0];}
                  // if (attribs.Artist){ cString = cString + ' ○ ' + "Artist: " +  attribs.Artist[0];}
                  // if (attribs.Brand){cString = cString + ' ○ ' +  attribs.Brand[0];}
                  // else if (attribs.Manufacturer){cString = cString + ' ○ ' +  attribs.Manufacturer[0];}
                  // if (attribs.Feature){cString = cString + ' ○ ' + attribs.Feature.join(' ░ ');}
                  // if (cString){message.client_res.unshift(cString);}
                  // try {
                  //   let itemLink = 'http:' + message.client_res[findIndex(message.client_res,function(el){ if (el) {return ((el.indexOf('bit.ly') > -1))}})].split('|')[0].split('http:')[1]
                  //   let itemName =  message.client_res[findIndex(message.client_res,function(el){ if (el) {return ((el.indexOf('bit.ly') > -1))}})].split('|')[1].split('>')
                  // } catch(err) {
                  //   console.log('MLI112: ',err, itemLink, itemName)
                  // }
                  let imgIndex2;
                  try {
                    imgIndex2 = findIndex(message.client_res,function(el){ if (el) {return ((el.indexOf('s3.amazonaws.com') > -1) || el.indexOf('ecx.images-amazon.com') > -1)}})
                  } catch(err) {
                    console.log('MLI121: ',err, message)
                  }
                  return (
                    <div>
                        <div style={messageStyle}> 
                            <img width='170' height='260' src={message.client_res[imgIndex2]} />
                        </div>
                    </div>
                    )
                  break;
                case 'checkout':
                  // console.log('case checkout')
                  let linkIndex;
                  try {
                    linkIndex = findIndex(message.client_res,function(el){ if (el) {return (el.indexOf('www.amazon.com') > -1)}})
                  } catch(err) {
                    console.log('MLI126: ',err, message)
                  }
                  message.client_res.unshift('Great! Please click the link to confirm your items and checkout. Thank you 😊')
                  return (
                    <div>
                        <div style={messageStyle}> 
                            {message.client_res[0]}
                        </div>
                         <div style={messageStyle}> 
                            <a href={message.client_res[message.client_res.length-1]}>{message.client_res[message.client_res.length-1]}</a>
                        </div>
                    </div>
                    )
                  break;
                default:
                  // console.log('case default')
                  return (<div style={messageStyle}> 
                            {message.client_res[0]}
                          </div>
                          )
              }
              break;
      case 'response':
          return 
          // (<div style={messageStyle}> 
          //            {this.state.displayMsg}
          //         </div>
          //        )
          break;
      default:
        return (
                <div style={messageStyle}> 
                  {this.state.displayMsg}
                </div>
               )
     }
  }

  render() {
    var self = this;
    const { message, index } = this.props;
    const displayName = (index !== 0 && (message.flags && message.flags.toCinna) && (message.action === 'initial' || message.action === 'similar' || message.action  === 'modify' || message.action  === 'focus' || message.action  === 'checkout' || message.action === 'more' )) ? 'Console:' : (index !== 0 && (message.bucket === 'response' || (message.flags && message.flags.toClient)) ? 'Cinna' : message.source.id)
    const nameStyle = (index !== 0 && message.flags && message.flags.toCinna) ? {color: '#e57373'} : {color: '#66c'}
    return (
      <li>
        <span>
          <b style={nameStyle}>{displayName} </b>
          <i style={{color: '#aad', opacity: '0.8'}}>{message.ts}</i>
        </span>
        {self.renderMsg()} 
      </li>
    );
  }
}

export default MessageListItem
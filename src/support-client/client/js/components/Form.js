import React, { Component, PropTypes } from 'react';
import { reduxForm } from 'redux-form';
import { Button,DropdownButton,MenuItem } from 'react-bootstrap';
import Spinner from 'react-spinner';
// import processData from '../../../../chat/components/process'

export const labels = {
  msg: "Message",
  bucket: "Bucket",
  action: "Action"
}

const socket = io();

class DynamicForm extends Component {
  static propTypes = {
    fields: PropTypes.object.isRequired,
    actions: PropTypes.object.isRequired
  };

  constructor(props, context) {
    super(props, context)
    this.state = {
      filteredMessages: null,
      msg: '',
      bucket: '',
      action: '',
      searchParam: '',
      dirty: false,
      spinnerloading: false,
      modifier: {},
      color: false,
      size: false
      };
  }

  componentDidMount() {
    const {
      actions, messages, activeChannel, resetForm, dirty
    } = this.props;
    var self = this

    socket.on('results', function(msg) {
      // console.log('Form: Received results', msg)
      self.state.spinnerloading = false
      self.state.searchParam = ''
      self.state.rawAmazonResults = msg.amazon
      //set new recallHistory if last action was not 'focus'
      if (msg.action !== 'focus') {
        // if (msg.recallHistory) {
        //     self.state.recallHistory = msg.recallHistory
        // } else {
            self.state.recallHistory = {amazon: msg.amazon}
        // }
      }
      //store focus info
      if (msg.focusInfo && msg.client_res && msg.client_res.length > 0) {
        self.setState({focusInfo: msg.focusInfo})
      } else if (msg.action !== 'focus'){
        self.setState({focusInfo: null})
      }
    })

    socket.on('change channel bc', function(channels) {
      if (self.state.dirty) {
        self.state.id = channels.prev.id
        console.log('saving state: ', self.state)
        socket.emit('change state', self.state);
      }
      //reset local state
      // console.log('messages: ', self.props.messages, ' channel: ',channel)
      const filtered = self.props.messages.filter(message => message.source).filter(message => message.source.id === channels.next.id)
      const firstMsg = filtered[0]
        // console.log('first: ', firstMsg)
      self.state = {
        filteredMessages: filtered,
        msg: firstMsg.msg,
        received: firstMsg.ts,
        bucket: firstMsg.bucket,
        action: firstMsg.action,
        channel: channels.next.name,
        _id: firstMsg._id,
        dirty: false,
        spinnerloading: false,
        modifier: { color: null, size: null},
        color: false,
        size: false,
        searchParam: '',
        focusInfo: null
      };
      resetForm()
    })
  }

  //Update local state on form as user types
  componentWillReceiveProps(nextProps) {
    const {
      actions, messages, activeChannel
    } = this.props
    this.setState({
      filteredMessages: messages.filter(message => message.source).filter(message => message.source.channel === nextProps.activeChannel.name)
    })
    for (var key in nextProps.values) {
      if (nextProps.values[key]) {
        this.setState({
          [key]: nextProps.values[key]
        });
      }
    }
  }

  renderJSON(filtered) {
    const {
      actions, messages, activeChannel, selected
    } = this.props
    return (
      <div style={{fontSize: '0.2em', marginTop: '5em'}}>
        <pre>
          <div>
          <label>channel: </label>{ this.state.channel } 
          </div>
          <div>
          <label>received: </label>{ new Date(this.state.received).toLocaleString()} 
          </div>
          <div>
          <label>original msg: </label>{ this.state.msg } 
          </div>
          <div>
          <label>bucket: </label>{ this.state.bucket } 
          </div>
          <div>
          <label>action: </label>{ this.state.action } 
          </div>
        </pre>
        </div>
    )
  }

  onChange(e) {
    const val = e.target.value;
    this.setState({
      searchParam: val
    })
  }

  setField(choice) {
    const {
      fields, dirty
    } = this.props;
    let bucket = ''
    if (choice === 'checkout') {
      bucket = 'purchase'
    }
    this.setState({
        bucket: choice === 'checkout' ? 'purchase' : 'search',
        action: choice,
        dirty: true
      })
  }

  searchAmazon(query) {
    const {
      activeMsg, resetForm
    } = this.props
    const newQuery = activeMsg;
    const self = this;
     //TODO
     // processData.urlShorten(data,function(res){
     //    var count = 0;
     //    //put all result URLs into arr
     //    async.eachSeries(res, function(i, callback) {
     //        data.urlShorten.push(i);//save shortened URLs
     //        processData.getNumEmoji(data,count+1,function(emoji){
     //            data.client_res.push(emoji + ' ' + res[count]);
     //            count++;                           
     //            callback();
     //        });
     //    }, function done(){
             if (!this.state.searchParam) {
              if (query) {
                this.state.searchParam = query
              } else if (document.querySelector('#search-input').value !== ''){
                this.state.searchParam = document.querySelector('#search-input').value
              } else {
                console.log('search input is empty.')
                return
              }
            }
            if (newQuery._id) {
              delete newQuery._id
            }
            newQuery.msg = this.state.searchParam
            newQuery.bucket = 'search'
            newQuery.action = 'initial'
            newQuery.tokens = newQuery.msg.split()
            newQuery.source.origin = 'supervisor'
            newQuery.flags = {}
            newQuery.flags.toCinna = true
            newQuery.client_res = []
            // if(newQuery.recallHistory) {
            //   delete newQuery.recallHistory
            // } 
            socket.emit('new message', newQuery);
            this.setState({
              spinnerloading: true,
              searchParam: ''
            })

            setTimeout(function(){
              if (self.state.spinnerloading === true) {
                 self.setState({
                    spinnerloading: false
                  })
              }
             },8000)

            // console.log('\n\n\nDATA OBJECT: ',newQuery)
        // });
      // });
  document.querySelector('#search-input').value = ''
  resetForm()
  }

  searchSimilar() {
    const {
      activeMsg, resetForm, selected
    } = this.props
    const newQuery = activeMsg;
    const self = this
    if (!selected || !selected.name || !selected.id || !this.state.rawAmazonResults) {
      console.log('Please select an item or do an initial search.')
      return
    }
      if (newQuery._id) {
          delete newQuery._id
        }
    newQuery.bucket = 'search'
    newQuery.action = 'similar'
    newQuery.flags = {}
    newQuery.flags.toCinna = true
    newQuery.flags.recalled = true
    newQuery.tokens = newQuery.msg.split()
    newQuery.source.origin = 'supervisor';
    newQuery.recallHistory =  this.state.recallHistory
    newQuery.amazon =  this.state.rawAmazonResults
    newQuery.searchSelect = []
    newQuery.searchSelect.push(parseInt(selected.index) + 1)
    console.log('Form209-searchSimilar(): newQuery: ',newQuery)
    socket.emit('new message', newQuery);
    this.setState({
      spinnerloading: true
    })
    resetForm()
    setTimeout(function(){
              if (self.state.spinnerloading === true) {
                 self.setState({
                    spinnerloading: false
                  })
              }
             },8000)
  }


  searchModify() {
    const { activeMsg, resetForm, selected } = this.props
    const newQuery = activeMsg;
    const self = this
    if (!selected || !selected.name || !selected.id) {
      console.log('Please select an item.')
      return
    }
     if (newQuery._id) {
              delete newQuery._id
            }
    newQuery.bucket = 'search'
    newQuery.action = 'modify'
    newQuery.tokens = newQuery.msg.split()
    newQuery.source.origin = 'supervisor'
    newQuery.recallHistory =  this.state.recallHistory
    newQuery.searchSelect = []
    newQuery.searchSelect.push(parseInt(selected.index) + 1)
    newQuery.flags = {}
    newQuery.flags.toCinna = true
    newQuery.flags.recalled = true
    newQuery.dataModify = { type: '', val: []}
    if (this.state.color) {
      newQuery.dataModify.type = 'color'
      switch (this.state.modifier.color) {
        case 'Purple': 
          newQuery.dataModify.val.push({"hex": "#A020F0","name": "Purple","rgb": [160, 32, 240],"hsl": [196, 222, 136]})
          break
        case 'Blue Violet': 
          newQuery.dataModify.val.push({"hex": "#8A2BE2","name": "Blue Violet", "rgb": [138, 43, 226], "hsl": [192, 193, 134]})
          break
        case 'Slate Blue': 
          newQuery.dataModify.val.push({"hex": "#6A5ACD","name": "Slate Blue","rgb": [106, 90, 205],"hsl": [175, 136, 147]})
          break
        case 'Royal Blue': 
          newQuery.dataModify.val.push({"hex": "#4169E1","name": "Royal Blue","rgb": [65, 105, 225],"hsl": [159, 185, 145]})
          break
        default:
         console.log('No color selected.')
      }
    }
    socket.emit('new message', newQuery);
    this.setState({
      spinnerloading: true
    })
    resetForm()
    setTimeout(function(){
              if (self.state.spinnerloading === true) {
                 self.setState({
                    spinnerloading: false
                  })
              }
             },8000)
    //  {
    //   "tokens": ["1 but in purple"],
    //   "searchSelect": [1],
    //   "bucket": "search",
    //   "action": "modify",
    //   "dataModify": {
    //     "type": "color",
    //     "val": [{
    //       "hex": "#A020F0",
    //       "name": "Purple",
    //       "rgb": [160, 32, 240],
    //       "hsl": [196, 222, 136]
    //     }, {
    //       "hex": "#8A2BE2",
    //       "name": "Blue Violet",
    //       "rgb": [138, 43, 226],
    //       "hsl": [192, 193, 134]
    //     }, {
    //       "hex": "#6A5ACD",
    //       "name": "Slate Blue",
    //       "rgb": [106, 90, 205],
    //       "hsl": [175, 136, 147]
    //     }, {
    //       "hex": "#4169E1",
    //       "name": "Royal Blue",
    //       "rgb": [65, 105, 225],
    //       "hsl": [159, 185, 145]
    //     }]
    //   }
    // }
  }

  searchFocus() {
     const {
      activeMsg, resetForm, selected
    } = this.props
    const newQuery = activeMsg;
    const self = this
    if (!selected || !selected.name || !selected.id) {
      console.log('Please select an item.')
      return
    }
      if (newQuery._id) {
              delete newQuery._id
            }
    newQuery.bucket = 'search'
    newQuery.action = 'focus'
    newQuery.tokens = newQuery.msg.split()
    newQuery.source.origin = 'supervisor';
    newQuery.recallHistory =  this.state.recallHistory
    newQuery.searchSelect = []
    newQuery.searchSelect.push(parseInt(selected.index) + 1)
    newQuery.flags = {}
    newQuery.flags.toCinna = true
    newQuery.flags.recalled = true
    socket.emit('new message', newQuery);
    this.setState({
      spinnerloading: true
    })
    resetForm()
    setTimeout(function(){
              if (self.state.spinnerloading === true) {
                 self.setState({
                    spinnerloading: false
                  })
              }
             },8000)
  }

  searchMore() {
   const {
    activeMsg, resetForm, selected
  } = this.props
  const newQuery = activeMsg;
  const self = this
    if (newQuery._id) {
            delete newQuery._id
          }
  newQuery.bucket = 'search'
  newQuery.action = 'more'
  newQuery.tokens = newQuery.msg.split()
  newQuery.source.origin = 'supervisor';
  newQuery.recallHistory =  this.state.recallHistory
  newQuery.flags = {}
  newQuery.flags.toCinna = true
  newQuery.flags.recalled = true
  socket.emit('new message', newQuery);
  this.setState({
    spinnerloading: true
  })
  resetForm()
  setTimeout(function(){
            if (self.state.spinnerloading === true) {
               self.setState({
                  spinnerloading: false
                })
            }
           },8000)
  }

  checkOut() {
    const {
        activeMsg, resetForm, selected
      } = this.props
    const newQuery = activeMsg;
    const self = this
        if (newQuery._id) {
            delete newQuery._id
          }
    newQuery.bucket = 'purchase'
    newQuery.action = 'checkout'
    newQuery.tokens = newQuery.msg.split()
    newQuery.source.origin = 'supervisor';
    newQuery.recallHistory =  this.state.recallHistory
    newQuery.searchSelect = []
    newQuery.searchSelect.push(parseInt(selected.index) + 1)
    newQuery.msg = 'buy ' + newQuery.searchSelect.toString(); 
    newQuery.flags = {}
    newQuery.flags.toCinna = true
    newQuery.flags.recalled = true
    socket.emit('new message', newQuery);
    this.setState({
      spinnerloading: true
    })
    resetForm()
    setTimeout(function(){
              if (self.state.spinnerloading === true) {
                 self.setState({
                    spinnerloading: false
                  })
              }
             },8000)
  }


  handleChange(field, e) {
    var nextState = {}
    nextState[field] = e.target.checked
    this.setState(nextState)
  }

  handleSelect(evt, val) {
    const self = this
    console.log('val: ',val)
    const field = ( 'Purple Blue Violet Slate Blue Royal Blue'.indexOf(val.trim()) > -1 ) ? 'color' : ''
    switch (field) {
      case 'color' : 
        self.setState( {modifier: { color : val } })
        break
      case 'size' : 
        self.setState( {modifier: { size : val }})
        break
    } 
  }

  handleSubmit(e) {
    e.preventDefault()
    // console.log('handle submit event: ',e)
    //increase the numerical value of below property when adding new buttons to form.  yeah it's weird sorry
    let query = e.target[6].value
    this.searchAmazon(query)
  }

  render() {
    const {
      fields, messages, activeChannel, selected
    } = this.props;
    const filtered = messages.filter(message => message.source).filter(message => message.source.channel === activeChannel.name)
    const showSearchBox = this.state.action === 'initial' ? {
      textAlign: 'center',
      marginTop: '5em'
    } : {display: 'none'};
    const showSimilarBox = this.state.action === 'similar' ? {
      textAlign: 'center',
      marginTop: '5em'
    } : {display: 'none'};
    const showModifyBox = this.state.action === 'modify' ? {
      textAlign: 'center',
      marginTop: '5em'
    } : {display: 'none'};
    const showFocusBox = this.state.action === 'focus' ? {
      textAlign: 'center', marginTop:'0.4em'} : { display: 'none'};
    const showMoreBox = this.state.action === 'more' ? {
      textAlign: 'center', marginTop:'0.4em'} : { display: 'none'};
    const showPrompt = (!selected || !selected.name) ? {
      color: 'black'
    } : {
      color: 'white'
    }
    const showCheckoutBox = this.state.action === 'checkout' ? {
      textAlign: 'center', marginTop:'0.4em'} : { display: 'none'};
    var self = this
    const spinnerStyle = (this.state.spinnerloading === true) ? {
      backgroundColor: 'orange',
      color: 'black'
    } : {
      backgroundColor: 'orange',
      color: 'orange',
      display: 'none'
    }
    const focusInfoStyle = this.state.focusInfo ? { fontSize: '0.6em', textAlign: 'left', margin: 0, padding: 0, border: '1px solid black'} : { display: 'none'}
    return (
      <div className='flexbox-container' style={{ height: '40em', width: '100%'}}>
          <form ref='form1' onSubmit={::this.handleSubmit}>
           <div className="jsonBox" style={{width: '50em'}}>
            {self.renderJSON(filtered)}
           </div>
            
            <div style={{ display: 'flexbox', textAlign:'center',marginTop: '3em' }}>
                <Button className="form-button" bsSize = "large" style={{ margin: '0.2em', backgroundColor: '#45a5f4' }} bsStyle = "primary" onClick = { () => this.setField('initial')} >
                  Initial
                </Button>
                <Button className="form-button" bsSize = "large" style={{ margin: '0.2em', backgroundColor: '#45a5f4' }} bsStyle = "primary" onClick = { () => this.setField('similar')} >
                  Similar
                </Button>
                <Button className="form-button" bsSize = "large" style={{ margin: '0.2em', backgroundColor: '#45a5f4' }} bsStyle = "primary" onClick = { () => this.setField('modify')} >
                  Modify
                </Button>
                 <Button className="form-button" bsSize = "large" style={{ margin: '0.2em', backgroundColor: '#45a5f4' }} bsStyle = "primary" onClick = { () => this.setField('focus')} >
                  Focus
                </Button>
                <Button className="form-button" bsSize = "large" style={{ margin: '0.2em', backgroundColor: '#45a5f4' }} bsStyle = "primary" onClick = { () => this.setField('more')} >
                  More
                </Button>
                <Button className="form-button" bsSize = "large" style={{ margin: '0.2em', backgroundColor: '#45a5f4' }} bsStyle = "primary" onClick = { () => this.setField('checkout')} >
                  Checkout
                </Button>
           
                <div id="search-box" style={showSearchBox}>
                  <input type="text" id="search-input" {...fields['searchParam']} onChange={this.OnChange} />
                    <Button bsSize = "large" disabled={this.state.spinnerloading}  style={{ marginTop: '1em', backgroundColor: 'orange'}} bsStyle = "primary" onClick = { () => this.searchAmazon()} >
                      Search Amazon
                       <div style={spinnerStyle}>
                        <Spinner />
                       </div>
                    </Button>      
                </div>

                <div id="similar-box" style={showSimilarBox}>
                    <h3 style={showPrompt}> Please select an item. </h3>
                    <Button bsSize = "large" disabled={(!this.props.selected || !this.props.selected.name) || this.state.spinnerloading} style={{ marginTop: '1em', backgroundColor: 'orange'}} bsStyle = "primary" onClick = { () => this.searchSimilar()} >
                      Search Similar 
                        <div style={spinnerStyle}>
                        <Spinner />
                       </div>
                    </Button>
                </div>

                 <div id="modify-box" style={showModifyBox}>
                      <h3 style={showPrompt}> Please select a modifier. </h3>
                      <br />
                      <div>
                          <input type="checkbox"
                            checked={this.state.modifier.color}
                            onChange={this.handleChange.bind(this, 'color')} style={{margin: '1em'}}/> 
                           <DropdownButton disabled={!this.state.color} bsStyle='info' title='Color' key='1' id='dropdown-basic-1' onSelect={::this.handleSelect}>
                            <MenuItem eventKey="Purple">Purple</MenuItem>
                            <MenuItem eventKey="Blue Violet">Blue Violet</MenuItem>
                            <MenuItem eventKey="Slate Blue">Slate Blue</MenuItem>
                            <MenuItem eventKey="Royal Blue" active>Royal Blue</MenuItem>
                            <MenuItem divider />
                            <MenuItem eventKey="4">Separated link</MenuItem>
                          </DropdownButton>
                          <input type="checkbox"
                            checked={this.state.modifier.size}
                            onChange={this.handleChange.bind(this, 'size')} style={{margin: '1em'}}/> 
                           <DropdownButton disabled={!this.state.size} bsStyle='info' title='Size' key='2' id='dropdown-basic-2'>
                            <MenuItem eventKey="X-Small">X-Small</MenuItem>
                            <MenuItem eventKey="Small">Small</MenuItem>
                            <MenuItem eventKey="Medium" active>Medium</MenuItem>
                            <MenuItem eventKey="Large">Large</MenuItem>
                            <MenuItem eventKey="X-Large">X-Large</MenuItem>
                            <MenuItem divider />
                            <MenuItem eventKey="4">Separated link</MenuItem>
                          </DropdownButton>
                      </div>
                      <Button bsSize = "large" disabled={(!this.props.selected || !this.props.selected.name) || this.state.spinnerloading || (!this.state.color && !this.state.size) || (!this.state.modifier.color && !this.state.modifier.size )} style={{ marginTop: '1em', backgroundColor: 'orange'}} bsStyle = "primary" onClick = { () => this.searchModify()} >
                        Search Modify
                        <div style={spinnerStyle}>
                          <Spinner />
                        </div>
                      </Button>
                </div>

                <div id="focus-box" style={showFocusBox}>
                              <div style={focusInfoStyle}> 
                                 Price: {this.state.focusInfo && this.state.focusInfo.topStr ? this.state.focusInfo.topStr : null}
                                 <br />
                                 Reviews: {this.state.focusInfo && this.state.focusInfo.reviews ? this.state.focusInfo.reviews : null}
                                 <br />
                                 Feature: {this.state.focusInfo && this.state.focusInfo.feature ? this.state.focusInfo.feature : null}
                                 <br />
                              </div>
                                
                    <h3 style={showPrompt}> Please select an item. </h3>
                    <Button bsSize = "large" disabled={(!this.props.selected || !this.props.selected.name) || this.state.spinnerloading} style={{ marginTop: '1em', backgroundColor: 'orange'}} bsStyle = "primary" onClick = { () => this.searchFocus()} >
                      Search Focus
                        <div style={spinnerStyle}>
                        <Spinner />
                       </div>
                    </Button>
                </div>

                 <div id="more-box" style={showMoreBox}>
                    <Button bsSize = "large" disabled={this.state.spinnerloading} style={{ marginTop: '1em', backgroundColor: 'orange'}} bsStyle = "primary" onClick = { () => this.searchMore()} >
                      Search More
                        <div style={spinnerStyle}>
                        <Spinner />
                       </div>
                    </Button>
                 </div>

                  <div id="checkout-box" style={showCheckoutBox}>
                              <div style={focusInfoStyle}> 
                                 
                              </div>
                                
                    <h3 style={showPrompt}> Please select an item. </h3>
                    <Button bsSize = "large" disabled={(!this.props.selected || !this.props.selected.name) || this.state.spinnerloading} style={{ marginTop: '1em', backgroundColor: 'orange'}} bsStyle = "primary" onClick = { () => this.checkOut()} >
                      Checkout Item
                        <div style={spinnerStyle}>
                        <Spinner />
                       </div>
                    </Button>
                </div>

            </div>

          </form>
       </div>
    );
  }
}

// {Object.keys(fields).map(name => {
//               const field = fields[name];
//               if (name === 'bucket' || name === 'action' || name === '') return
//               return (<div key={name}>
//                 <label>{labels[name]}</label>
//                 <div>
//                   <input type="text" placeholder={labels[name]} {...field}/>
//                 </div>
//               </div>);
//             })}


export default reduxForm({
  form: 'dynamic'
})(DynamicForm);
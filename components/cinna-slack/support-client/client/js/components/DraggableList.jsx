import React from 'react';
import {Motion, spring} from 'react-motion';
import util from 'lodash'
import isNaN from 'lodash/lang/isNaN'
import findIndex from 'lodash/array/findIndex'
const socket = io();
function reinsert(arr, from, to) {
  const _arr = arr.slice(0);
  const val = _arr[from];
  _arr.splice(from, 1);
  _arr.splice(to, 0, val);
  return _arr;
}

function clamp(n, min, max) {
  return Math.max(Math.min(n, max), min);
}

const springConfig = [300, 50];
const itemsCount = 10;

const defaultItems = [{
        id: 'product-0',
        name: 'Product 0',
        index: 0,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-1',
        name: 'Product 1',
        index: 1,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-2',
        name: 'Product 2',
        index: 2,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-3',
        name: 'Product 3',
        index: 3,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-4',
        name: 'Product 4',
        index: 4,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },
      {
        id: 'product-5',
        name: 'Product 5',
        index: 5,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-6',
        name: 'Product 6',
        index: 6,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-7',
        name: 'Product 7',
        index: 7,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-8',
        name: 'Product 8',
        index: 8,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
      },{
        id: 'product-9',
        name: 'Product 9',
        index: 9,
        img: 'http://kipthis.com/img/kip-cart.png',
        changed: false
        }]

const DraggableList = React.createClass({
  getInitialState() {
    return {
      delta: 0,
      mouse: 0,
      isPressed: false,
      lastPressed: 0,
      order: this.props.items,
      pageY: 0,
      switching: false,
      previewing: false,
      mounted: false,
      flag: 0,
      selectedIndex : null
    };
  },

  componentDidMount() {
    const {delta} = this.state;
    window.addEventListener('touchmove', this.handleTouchMove);
    window.addEventListener('touchend', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
    const self = this
    this.setState({ mounted: true });
    socket.on('change channel bc', function(channels) {      
      const firstMsgOld = self.props.messages.filter(message => message.source).filter(message => message.source.id === channels.prev.id)[0]
      if (typeof firstMsgOld !== 'undefined') {
            self.setState({switching: true})    
      }
      setTimeout(function(){
         self.setState({switching: false})
      }, 1000)
    })
  },

  handleTouchStart(key, pressLocation, e) {
    this.handleMouseDown(key, pressLocation, e.touches[0]);
  },

  handleTouchMove(e) {
    e.preventDefault();
    this.handleMouseMove(e.touches[0]);
  },

  handleMouseDown(pos, pressY, {pageY}) {
    this.setState({
      delta: pageY - pressY,
      mouse: pressY,
      isPressed: true,
      lastPressed: pos,
      flag: 0
    });
  },

  handleMouseMove({pageY}) {
    const {isPressed, delta, order, lastPressed, selectedIndex, flag} = this.state;
    if (isPressed) {
      const mouse = pageY - delta;
      const row = clamp(Math.round(mouse / 100), 0, itemsCount - 1);
      this.props.mouseMove(lastPressed, row)
      this.setState({mouse: mouse, flag:1});
      // if (this.props.selected && this.props.selected.name && delta !== 0) {
      //   this.setState({selectedIndex: row})
      //   console.log('drag: ',mouse,row, selectedIndex, flag)
      // }
    }
  },

  handleMouseUp({pageY}) {
    const {isPressed, delta, order, lastPressed, flag} = this.state;
    //TEST THIS OUT: supposed to keep item floated if the item order hasn't changed - 
    const mouse = pageY - delta;
    const row = clamp(Math.round(mouse / 100), 0, itemsCount - 1);
    this.setState({isPressed: false, delta: 0}); 
    // console.log('pre click: start - ',lastPressed, ' end - ',row,' flag -' ,flag)
    if (flag === 0 && delta !== 0 ){
      // this.state.order[lastPressed].selected = this.state.order[lastPressed].selected  ? !this.state.order[lastPressed].selected : true
      // console.log('click: start - ',lastPressed, ' end - ',row,' flag -' ,flag)
      this.setState({selectedIndex: lastPressed})
      this.props.mouseUp(lastPressed)
    }
  },

  render() {
    const {mouse, isPressed, lastPressed, order, switching, previewing,mounted, selectedIndex} = this.state;
    const { items } = this.props

    return (
      <div className="demo8">
     
        { mounted ? items.slice(0,10).map( (item, index) => {
          const styleState = (lastPressed === item.index && isPressed) ? 'beingDragged' : ((index === selectedIndex) ? 'beingSelected' : 'beingDefault')
          let style = {}
          switch (styleState) {
            case 'beingDragged':
              style = {
                scale: spring(1.1, springConfig),
                shadow: spring(16, springConfig),
                y: mouse,
                // y: (index === selectedIndex ? (spring(findIndex(items, function(o) { return o.index == item.index }) * 100, springConfig)) : mouse),
                textAlign: 'center',
                backgroundColor: (index === selectedIndex) ?  'blue' : 'none'
              }
              break;
            case 'beingSelected':
            default:
              style = {
                scale: spring(1, springConfig),
                shadow: spring(1, springConfig),
                y: (this.state.switching || this.state.previewing) ? (spring(-600, springConfig)) : (spring(findIndex(items, function(o) { return o.index == item.index }) * 100, springConfig)), 
                textAlign: 'center',
                backgroundColor: (index === selectedIndex) ?  'blue' : 'none'
              }
          }
          return (
          
            <Motion style={style} key={item.index}>
              {({scale, shadow, y, x}) =>
                <div
                  onMouseDown={this.handleMouseDown.bind(null, item.index, y)}
                  onTouchStart={this.handleTouchStart.bind(null, item.index, y)}
                  className="demo8-item"
                  style={{
                    boxShadow: `rgba(0, 0, 0, 0.2) 0px ${shadow}px ${2 * shadow}px 0px`,
                    transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
                    WebkitTransform: `translate3d(0, ${y}px, 0) scale(${scale})`,
                    zIndex: item.index === lastPressed ? 99 : item.index
                  }}>
                  <div className="flexbox-container">
                  <span style={{fontSize:'0.4em', color:'#000', margin: '0 auto', display:'inlineBlock', textAlign:'left','MozUserSelect': 'none',
                      'WebkitUserSelect': 'none',
                      'userSelect': 'none'}}>{item.name.substring(0,20)} </span>   
                  <img height='90px' width='90px' style={{'MozUserSelect': 'none',
                      'WebkitUserSelect': 'none',
                      'WebkitUserDrag': 'none',
                      'userSelect': 'none',
                      'userDrag' : 'none',
                      // 'marginRight':'90%',
                      'display' : 'inlineBlock'
                      }} src={item.img} />
                      
                    
                  </div>
                </div>  
              }
            </Motion>
            
          );
        
        }) : null}
      </div>
    );
  },
});

  // <div className="flexbox-container">
  //             <div className="roundedOne">
  //               <input type="checkbox" value="None" id="roundedOne" name="check" checked />
  //               <label for="roundedOne"></label>
  //            </div>
 // </div>
export default DraggableList;

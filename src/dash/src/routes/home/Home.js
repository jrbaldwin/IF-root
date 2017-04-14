import React, { PropTypes, Component } from 'react';
import withStyles from 'isomorphic-style-loader/lib/withStyles';
import {
  MenuItem,
  DropdownButton,
  Panel, PageHeader, ListGroup, ListGroupItem, Button, ButtonToolbar, Alert
} from 'react-bootstrap';

import Donut from '../../components/Donut';
// import RenderTable from '../../components/Table/RenderTable';
import DeliveryTable from '../../components/Table/DeliveryTable';
import DatePicker from 'react-datepicker';
import moment from 'moment';

import {
  Tooltip,
  XAxis, YAxis, Area,
  CartesianGrid, AreaChart, Bar, BarChart,
  ResponsiveContainer, LineChart, Line } from '../../vendor/recharts';


class Home extends Component {
  constructor(props) {
    super(props);
    this.state = {
      view: 'Store',
      startDate: moment().subtract(1, 'month'),
      endDate: moment(),
    };
    this.changeStart = this.changeStart.bind(this);
    this.changeEnd = this.changeEnd.bind(this);
    this.changeCart = this.changeCart.bind(this);
  }


  changeStart(date){
    this.setState({
      startDate: date
    });
  }

  changeEnd(date){
    this.setState({
      endDate: date
    });
  }

  changeCart(cart){
    this.setState({
      view: cart
    })
  }


  renderCartsLineGraph(data){
    var dataPlot = [];   //name:time_range #carts, #teams, and #items
    var weekRanges=[];
    //console.log(data.data.deliveries);

    for(var i = 0; i<10; i++){
      weekRanges.push({index: i, startDate: new Date(moment().subtract(10-i, 'week')),endDate: new Date(moment().subtract(9-i, 'week')), numCarts:0,teams:[],numItems:0});
    }
    data.data.deliveries.map(function(delivery){
      var week = weekRanges.find(function(w){
        return new Date(delivery.time_started) > new Date(w.startDate) && new Date(delivery.time_started) <= new Date(w.endDate);
      });
      if(week){
        week.numCarts++;
        week.numItems += delivery.item_count;
        if(week.teams.length<1 || !week.teams.includes(delivery.team_id)) {
          week.teams.push(delivery.team_id);
        }
      }
<<<<<<< HEAD
      
      
=======

>>>>>>> moving table components
    })

    for(var i=0;i<10;i++){
      var currentWeek = weekRanges.find((x) => x.index==i);
      dataPlot.push({name: currentWeek.endDate.toLocaleDateString(), numCarts: currentWeek.numCarts, numItems: currentWeek.numItems, numTeams: currentWeek.teams.length})
    }

    return(
      <Panel
        header={<span><i className="fa fa-line-chart " />Purchased Carts</span>}>
          <div className="resizable">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dataPlot} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} >
                <XAxis dataKey="name" />
                <YAxis />
                <CartesianGrid stroke="#ccc" />
                <Tooltip />
                    <Line type="monotone" dataKey="numCarts" stroke="#8884d8" fill="#8884d8" />
                    <Line type="monotone" dataKey="numItems" stroke="#82ca9d" fill="#82ca9d" />
                    <Line type="monotone" dataKey="numTeams" stroke="#ffc658" fill="#ffc658" />
              </LineChart>
            </ResponsiveContainer>
          </div>
      </Panel>
    )
  }

  render(){
    var self = this;
    console.log(this.props)
    return (
      <div>
        <div>
          {self.renderCartsLineGraph(this.props.data)}
        </div>
        <div className="container-fluid data-display">
          <ButtonToolbar>
            <Button onClick={ ()=> self.changeCart('Store')}>
              Store
            </Button>
            <Button onClick={ ()=> self.changeCart('Cafe')}>
              Cafe
            </Button>
          </ButtonToolbar>
          <div>
              Start Date: <DatePicker selected={self.state.startDate} onChange={self.changeStart} />
              End Date: <DatePicker selected={self.state.endDate} onChange={self.changeEnd} />
          </div>
          <div className="panel panel-default">
            <DeliveryTable />
          </div>
        </div>
      </div>
    )
  }

}

export default Home;

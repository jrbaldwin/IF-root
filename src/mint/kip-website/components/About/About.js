/* eslint react/prefer-stateless-function: 0, react/forbid-prop-types: 0 */
/* eslint global-require: 0 */
import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { PropTypes } from 'prop-types';
import { HeaderContainer, FooterContainer } from '../../containers';
import { replaceKip } from '../../utils';
import { Icon } from '../../themes';
import { Down, Right } from '../../themes/newSvg';

export default class About extends Component {
  constructor(props) {
    super(props)
  }

  state = {
    offsetTop: 0
  }

  componentDidMount() {
    this.setState({
      offsetTop: ReactDOM.findDOMNode(this.why)
        .offsetTop - 50
    })
  }

  static propTypes = {
    aboutTemplate: PropTypes.object
  }

  render() {
    const { props: { aboutTemplate }, state: { offsetTop } } = this;
    return (
      <div className="about">
        <HeaderContainer title={aboutTemplate.titleText} subtext={aboutTemplate.subtext} color="primary" offsetTop={offsetTop}/>
        <div className="why col-12" ref={(why) => this.why = why}>
          <div className="col-12">
            <h1>{aboutTemplate.why.head}</h1>
            <h4>
              {replaceKip(aboutTemplate.why.description)}
            </h4>
            <section className='cluster'>
              <div className='image' style={{backgroundImage: 'url(https://storage.googleapis.com/kip-random/many_kips/presents_smile.svg)'}}/>
              <div className='inline'>
                <Down/>
                <Down/>
                <Down/>
              </div>
            </section>
            {
              aboutTemplate.why.reasons.map((r, i) => (
                <div key={i} className="col-4 row-1 services__details">
                  <div className='image' style={{ backgroundImage: `url(${r.image})` }} />
                  <h4>
                    {r.text}
                  </h4>
                  <div className="col-12 row-1 action">
                    <a href='/newcart' target="_blank"><button><span>{aboutTemplate.why.actionText} <Right /></span></button></a>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
        <h1>{aboutTemplate.seenIn}</h1>
        <section className="iconsRow">
          <div className="icon col-1"/>
          <div className="icon col-1"><Icon icon='Wallstreet'/></div>
          <div className="icon col-1"><Icon icon='Fastcompany'/></div>
          <div className="icon col-1"><Icon icon='Time'/></div>
          <div className="icon col-1"><Icon icon='Venturebeat'/></div>
          <div className="icon col-1"><Icon icon='Paymentsource'/></div>
          <div className="icon col-1"/>
        </section>
        <section className="col-12 row-1 video">
          <iframe width="100%" height="100%" src="https://www.youtube.com/embed/QPlBeTJqF1Y?rel=0&amp;showinfo=0" frameBorder="0" allowFullScreen></iframe>
        </section>
        <FooterContainer />
      </div>
    );
  }
}
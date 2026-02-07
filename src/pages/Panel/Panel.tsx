import React from 'react';
import './Panel.css';
import logo from '../../assets/img/ReadBetweenLogo_White.png';

const Panel: React.FC = () => {
  return (
    <div className="container">
      {/* <h1>Read Between Panel</h1> */}
      <img src={logo} alt="Read Between Logo" className="primary-logo" />
    </div>
  );
};

export default Panel;

import React from 'react';
import { Link } from 'react-router-dom';

class NavBar extends React.Component {
  render() {
    const navStyle: React.CSSProperties = {
      width: '200px',
      background: '#f0f0f0',
      padding: '1rem',
      height: '100vh',
      boxSizing: 'border-box'
    };

    const listStyle: React.CSSProperties = {
      listStyle: 'none',
      padding: 0
    };

    const itemStyle: React.CSSProperties = {
      marginBottom: '0.5rem'
    };

    return (
      <nav style={navStyle}>
        <ul style={listStyle}>
          <li style={itemStyle}>
            <Link to="/">Home</Link>
          </li>
          <li style={itemStyle}>
            <Link to="/about">About</Link>
          </li>
        </ul>
      </nav>
    );
  }
}

export default NavBar;

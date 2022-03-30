import React from "react";
import logo from "./logo.svg";
import "./App.css";

function App() {
  // const navItems = ["Home", "Posts", "Projects", "Tools", "About"];
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <a className="App-link" href="/">
          hippiezhou.dev
        </a>
      </header>
    </div>
  );
}

export default App;

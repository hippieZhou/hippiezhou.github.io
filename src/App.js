import React from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const App = () => (
  <HashRouter basename={process.env.PUBLIC_URL}>
    <Routes>
      <Route path="/" exact element={<Home></Home>} />
      <Route path="/about" exact element={<About></About>} />
      <Route element={<NotFound></NotFound>} />
    </Routes>
  </HashRouter>
);

export default App;

import React from "react";
import { HashRouter, Route, Routes, Switch } from "react-router-dom";
import App from "./pages/App";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const Router = () => (
  <HashRouter basename={process.env.PUBLIC_URL}>
    <Routes>
      <Route path="/" exact element={<App></App>} />
      <Route path="/about" exact element={<About></About>} />
      <Route element={<NotFound></NotFound>} />
    </Routes>
  </HashRouter>
);

export default Router;

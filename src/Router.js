import React from "react";
import { Route, BrowserRouter, Switch } from "react-router-dom";
import App from "./pages/App";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const Router = () => (
  <BrowserRouter basename={process.env.PUBLIC_URL}>
    <Switch>
      <Route path="/" exact component={App} />
      <Route path="/about" component={About} />
      <Route element={NotFound} />
    </Switch>
  </BrowserRouter>
);

export default Router;

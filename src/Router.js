import React from "react";
import { Routes, Route, HashRouter } from "react-router-dom";
import App from "./pages/App";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const Router = () => (
  <HashRouter>
    <Routes>
      <Route path="/" exact element={<App />} />
      <Route path="/about" element={<About />} />
      <Route element={<NotFound />} />
    </Routes>
  </HashRouter>
);

export default Router;

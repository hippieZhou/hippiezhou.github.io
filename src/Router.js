import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./pages/App";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const Router = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/" exact element={<App />} />
      <Route path="/about" element={<About />} />
      <Route element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

export default Router;

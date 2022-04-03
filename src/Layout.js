import Header from "./components/Header";
import Footer from "./components/Footer";

const Layout = (props) => {
  return (
    <div id="wrapper" className="wrapper">
      <Header author="hippie Zhou"></Header>
      <div className="main">{props.children}</div>
      <Footer></Footer>
    </div>
  );
};

export default Layout;

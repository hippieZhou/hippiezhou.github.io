import "./Footer.css";

const Footer = () => {
  return (
    <footer id="footer">
      <img
        alt="github action"
        src="https://github.com/hippiezhou/hippiezhou.github.io/actions/workflows/github-pages.yml/badge.svg?branch=main"
      ></img>
      <p>Copyright © {new Date().getFullYear()} hippieZhou </p>
    </footer>
  );
};

export default Footer;

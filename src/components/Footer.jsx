const Footer = () => {
  return (
    <footer id="footer">
      <img
        alt="github action"
        src="https://github.com/hippiezhou/hippiezhou.github.io/actions/workflows/github-pages.yml/badge.svg?branch=main"
      ></img>
      <br />
      <img
        alt="https://opensource.org/licenses/MIT"
        src="https://img.shields.io/badge/License-MIT-yellow.svg"
      ></img>
      <p>Copyright © {new Date().getFullYear()} hippieZhou </p>
    </footer>
  );
};

export default Footer;

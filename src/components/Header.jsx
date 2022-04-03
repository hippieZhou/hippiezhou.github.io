import github from "../images/github.png";
import twitter from "../images/twitter.png";
import about from "../images/about.png";
import feed from "../images/feed.png";
import { Link } from "react-router-dom";
const Header = (props) => {
  const { author } = props;
  return (
    <>
      <div className="header">
        <a href="/">{author}</a>
      </div>
      <p className="links">
        <a
          href="https://twitter.com/hippiechou"
          target="_blank"
          rel="noreferrer"
        >
          <img alt="twitter" src={twitter}></img>
        </a>
        <a
          href="https://github.com/hippiezhou"
          target="_blank"
          rel="noreferrer"
        >
          <img src={github} alt="github"></img>
        </a>
        <Link to="/about" rel="noreferrer">
          <img src={about} alt="about"></img>
        </Link>
        <a href="/atom.xml" target="_blank">
          <img src={feed} alt="feed"></img>
        </a>
      </p>
    </>
  );
};

export default Header;

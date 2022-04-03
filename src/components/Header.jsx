import github from "../images/github.png";
import twitter from "../images/twitter.png";
import Blog from "../images/blog.png";
import about from "../images/about.png";
import feed from "../images/feed.png";
import { Link } from "react-router-dom";
const Header = (props) => {
  const { author } = props;
  return (
    <>
      <div className="header">
        <a
          href="/"
          style={
            ({ color: "rgb(75 85 99 / var(--tw-text-opacity))" },
            { "font-weight": "500" },
            { fontSize: "2.25rem" })
          }
        >
          {author}
        </a>
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
        <a
          href="https://www.cnblogs.com/hippieZhou"
          target="_blank"
          rel="noreferrer"
        >
          <img src={Blog} alt="blog"></img>
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

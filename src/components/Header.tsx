import "./Header.css";

const Header = (props: any) => {
  const { author } = props;
  return (
    <div className="header">
      <a className="author" href="/">
        {author}
      </a>
    </div>
  );
};

export default Header;

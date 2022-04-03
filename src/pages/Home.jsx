import Layout from "../Layout";

const Home = () => {
  const articles = [
    {
      date: "Dec 20, 2015",
      href: "2015/12/20/vuejs-2015-in-review/",
      title: "Vue.js: 2015 in Review",
    },
    {
      date: "Dec 20, 2015",
      href: "2015/12/20/vuejs-2015-in-review/",
      title: "Vue.js: 2015 in Review",
    },
    {
      date: "Dec 20, 2015",
      href: "2015/12/20/vuejs-2015-in-review/",
      title: "Vue.js: 2015 in Review",
    },
    {
      date: "Dec 20, 2015",
      href: "2015/12/20/vuejs-2015-in-review/",
      title: "Vue.js: 2015 in Review",
    },
    {
      date: "Dec 20, 2015",
      href: "2015/12/20/vuejs-2015-in-review/",
      title: "Vue.js: 2015 in Review",
    },
    {
      date: "Dec 20, 2015",
      href: "2015/12/20/vuejs-2015-in-review/",
      title: "Vue.js: 2015 in Review",
    },
  ];
  return (
    <Layout>
      <ul>
        {articles.map((article, index) => {
          return (
            <li key={index}>
              <h3>{article.date}</h3>
              <h2>
                <a href={article.href}>{article.title}</a>
              </h2>
            </li>
          );
        })}
      </ul>
    </Layout>
  );
};

export default Home;

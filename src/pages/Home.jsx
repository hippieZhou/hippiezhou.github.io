import Layout from "../Layout";

const Home = () => {
  const articles = [
    {
      date: "Arp 03, 2022",
      href: "2022/03/02/coming-soon/",
      title: "Intro: Hello world",
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

import Layout from "../Layout";

const About = () => {
  return (
    <Layout>
      <img
        style={{ borderRadius: "50%", width: 260, height: 260 }}
        alt="hippieZhou"
        src="https://avatars.githubusercontent.com/u/13598361?v=4"
      ></img>
      <br />
      <p>
        hi, my name is <b>QiangZhou</b>, you can call me
        <code> hippie</code>. I'm a <code>.NET developer</code> and currently
        work at
        <b> @Thoughtworks</b>.
      </p>
    </Layout>
  );
};

export default About;

import Layout from "../Layout";

const About = () => {
  return (
    <Layout>
      <img
        style={{
          height: "auto",
        }}
        alt="hippieZhou"
        width="260"
        height="260"
        class="avatar avatar-user width-full border color-bg-default"
        src="https://avatars.githubusercontent.com/u/13598361?v=4"
      ></img>
      <br />
      <code>
        hi, my name is QiangZhou, you can call me @hippieZhou. I'm a .NET
        developer and currently work at @Thoughtworks.
      </code>
    </Layout>
  );
};

export default About;

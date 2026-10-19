import {useRef} from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import FlockBackground from '@site/src/components/FlockBackground';

export default function Home() {
  const {i18n: {currentLocale}} = useDocusaurusContext();
  const titleRef = useRef<HTMLDivElement>(null);
  return (
    <Layout title={currentLocale === 'zh' ? '首页' : 'Home'}>
      <main className="hero-center">
        <FlockBackground titleRef={titleRef} />
        <div ref={titleRef} className="center-text">
          <h1>Hiroshiprover</h1>
          <p>&quot;Physics is dirty Math.&quot;</p>
        </div>
      </main>
    </Layout>
  );
}

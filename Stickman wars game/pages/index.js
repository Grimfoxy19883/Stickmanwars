import Head from 'next/head';
import dynamic from 'next/dynamic';

const GameCanvas = dynamic(() => import('../components/GameCanvasImproved'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Stickman Wars: Next</title>
      </Head>
      <main style={{ padding: 16, fontFamily: 'sans-serif' }}>
        <h1>Stickman Wars (Next.js prototype)</h1>
        <GameCanvas />
      </main>
    </>
  );
}

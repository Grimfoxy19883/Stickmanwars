import Head from 'next/head';
import dynamic from 'next/dynamic';

const GameEngine = dynamic(() => import('../components/GameEngine'), { ssr: false });

export default function Home() {
  return (
    <>
      <Head>
        <title>Stickman Wars: Epic Battle</title>
        <meta name="description" content="Epic stickman strategy warfare game" />
      </Head>
      <main style={{ 
        padding: 0, 
        fontFamily: 'Arial, sans-serif',
        background: '#f5f5f5',
        minHeight: '100vh'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          textAlign: 'center',
          boxShadow: '0 2px 10px rgba(0,0,0,0.3)'
        }}>
          <h1 style={{ margin: 0, fontSize: '2.5em', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
            ⚔️ Stickman Wars: Epic Battle ⚔️
          </h1>
          <p style={{ margin: '10px 0 0 0', fontSize: '1.2em', opacity: 0.9 }}>
            Command your army and conquer the battlefield!
          </p>
        </div>
        
        <div style={{ padding: '20px', display: 'flex', justifyContent: 'center' }}>
          <GameEngine />
        </div>
      </main>
    </>
  );
}
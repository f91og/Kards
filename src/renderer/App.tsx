import React from 'react';

interface AppProps {}

const App: React.FC<AppProps> = () => {
  return (
    <div style={styles.container}>
      <h1>🎴 MemCards Desktop</h1>
      <p>Welcome to your Electron + React app!</p>
      <button onClick={() => alert('Button clicked!')}>Click Me</button>
      <div style={styles.info}>
        <p><strong>Node Version:</strong> {process.versions.node}</p>
        <p><strong>Chromium Version:</strong> {process.versions.chrome}</p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  } as React.CSSProperties,
  info: {
    background: '#f0f0f0',
    padding: '15px',
    borderRadius: '5px',
    marginTop: '20px',
    fontSize: '12px',
    color: '#666',
  } as React.CSSProperties,
};

export default App;

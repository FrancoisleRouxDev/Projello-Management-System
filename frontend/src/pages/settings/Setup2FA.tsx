import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface Setup2FAProps {
  userEmail: string;
}

export default function Setup2FA({ userEmail }: Setup2FAProps) {
  const [secretKey, setSecretKey] = useState('');
  const [authenticatorUri, setAuthenticatorUri] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate2FA = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('http://localhost:5049/api/Auth/generate-2fa-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail })
      });

      const data = await response.json();

      if (response.ok) {
        setSecretKey(data.secretKey);
        setAuthenticatorUri(data.authenticatorUri);
      } else {
        setError(data.message || 'Failed to generate 2FA secret.');
      }
    } catch (err) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px', maxWidth: '500px' }}>
      <h3>Secure Your Account</h3>
      <p>Enable Two-Factor Authentication using an app like Google Authenticator or Authy.</p>

      {!authenticatorUri ? (
        <button 
          onClick={handleGenerate2FA} 
          disabled={loading}
          style={{ padding: '10px 15px', backgroundColor: '#7C9082', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          {loading ? 'Generating...' : 'Setup 2FA Now'}
        </button>
      ) : (
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <p style={{ fontWeight: 'bold' }}>1. Scan this QR Code with your Authenticator App</p>
          
          <div style={{ padding: '20px', backgroundColor: 'white', display: 'inline-block', borderRadius: '8px' }}>
            <QRCodeSVG value={authenticatorUri} size={200} level="H" fgColor="#2c3e35" />
          </div>

          <p style={{ marginTop: '20px', fontWeight: 'bold' }}>2. Or enter this setup key manually:</p>
          <code style={{ padding: '10px', backgroundColor: '#eee', letterSpacing: '2px', display: 'block' }}>
            {secretKey}
          </code>
          
          <p style={{ marginTop: '20px', color: 'green' }}>
            ✓ 2FA is now enabled on your account! You will be prompted for a code on your next login.
          </p>
        </div>
      )}
      {error && <p style={{ color: 'red', marginTop: '10px' }}>{error}</p>}
    </div>
  );
}
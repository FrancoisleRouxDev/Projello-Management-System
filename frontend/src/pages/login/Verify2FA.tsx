import React, { useState } from 'react';

// NEW: Define the types for the props coming from LoginPage
interface Verify2FAProps {
  email: string;
  onVerificationSuccess: (token: string, user?: any) => void;
  onCancel: () => void;
}

const Verify2FA = ({ email, onVerificationSuccess, onCancel }: Verify2FAProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('http://localhost:5049/api/Auth/verify-2fa', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await response.json();

      if (response.ok) {
        onVerificationSuccess(data.token, data.user);
      } else {
        setError(data.message || 'Invalid verification code.');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.header}>Two-Step Verification</h2>
        <p style={styles.text}>
          Enter the 6-digit code from your authenticator app.
        </p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleVerify} style={styles.form as React.CSSProperties}>
          <input
            type="text"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            style={styles.input}
            required
            autoFocus
          />
          <button type="submit" style={styles.button}>Verify Code</button>
          <button type="button" onClick={onCancel} style={styles.cancelButton}>Cancel</button>
        </form>
      </div>
    </div>
  );
};

const styles = {
  container: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f4f7f5' },
  card: { backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', maxWidth: '400px', width: '100%', textAlign: 'center' as const, borderTop: '6px solid #7C9082' },
  header: { color: '#2c3e35', marginBottom: '15px', fontFamily: 'system-ui, sans-serif' },
  text: { color: '#5a6b62', fontSize: '14px', marginBottom: '25px' },
  error: { backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', marginBottom: '20px' },
  form: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { padding: '12px', fontSize: '24px', textAlign: 'center' as const, letterSpacing: '8px', borderRadius: '6px', border: '1px solid #ccc', outline: 'none' },
  button: { padding: '12px', backgroundColor: '#7C9082', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold' as const, cursor: 'pointer' },
  cancelButton: { padding: '10px', backgroundColor: 'transparent', color: '#7C9082', border: 'none', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' }
};

export default Verify2FA;
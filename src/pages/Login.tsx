import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useERPStore } from '../store/erpStore';

const shakeStyle = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}
.shake {
  animation: shake 0.4s ease-in-out;
}
`;

export default function Login() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const { login, currentUser } = useERPStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
      setError(false);
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const handleSubmit = () => {
    if (pin.length === 0) return;
    const success = login(pin);
    if (success) {
      navigate('/');
    } else {
      setError(true);
      setShaking(true);
      setPin('');
      setTimeout(() => setShaking(false), 400);
    }
  };

  const buttons: { label: string; action: () => void; variant?: 'back' | 'submit' }[] = [
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '←', action: handleBackspace, variant: 'back' },
    { label: '0', action: () => handleDigit('0') },
    { label: '✓', action: handleSubmit, variant: 'submit' },
  ];

  return (
    <>
      <style>{shakeStyle}</style>
      <div
        style={{ backgroundColor: '#0a0a0f' }}
        className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      >
        <div className="w-full max-w-xs flex flex-col items-center gap-8">
          {/* Header */}
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-6xl" role="img" aria-label="rocket">
              🚀
            </span>
            <h1 className="text-2xl font-extrabold tracking-widest" style={{ color: '#f97316' }}>
              ROCKET LAUNCH ERP
            </h1>
            <p className="text-sm text-gray-400 tracking-wide">
              Robotek Sales Command Center
            </p>
          </div>

          {/* PIN Display */}
          <div className={`flex gap-4 ${shaking ? 'shake' : ''}`}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-14 h-14 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl text-white"
              >
                {i < pin.length ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Error */}
          <div className={`h-5 text-sm font-medium text-red-500 ${error ? 'opacity-100' : 'opacity-0'}`}>
            Invalid PIN
          </div>

          {/* PIN Pad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {buttons.map(({ label, action, variant }) => {
              let bgClass = 'bg-gray-800 hover:bg-gray-700 text-white';
              if (variant === 'back') bgClass = 'bg-red-900 hover:bg-red-800 text-red-300';
              if (variant === 'submit') bgClass = 'text-white';

              return (
                <button
                  key={label}
                  onClick={action}
                  className={`h-16 rounded-xl text-xl font-semibold transition-colors active:scale-95 ${bgClass}`}
                  style={
                    variant === 'submit'
                      ? { backgroundColor: '#f97316' }
                      : undefined
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Demo credentials */}
          <div className="mt-4 text-center text-xs text-gray-600 leading-relaxed px-2">
            <p className="font-semibold text-gray-500 mb-1">Demo PINs</p>
            <p>Sales Exec: 1234–1241 | Manager: 2001–2004</p>
            <p>Admin: 9999 | CEO: 0000</p>
          </div>
        </div>
      </div>
    </>
  );
}

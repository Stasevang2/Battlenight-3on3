import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser, createUser } from '../services/userService';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.svg';
import '../styles/login.css';

function Login() {
  const navigate = useNavigate();
  const { setCurrentUser } = useAuth();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    password: '',
    club: '',
    birthYear: '',
    playerNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isCreating) {
        // Opret ny bruger
        const newUser = await createUser({
          firstName: formData.firstName,
          password: formData.password,
          club: formData.club,
          birthYear: Number(formData.birthYear),
          playerNumber: Number(formData.playerNumber),
          role: 'player',
          contact: {
            phone: '',
            snap: '',
            email: '',
          },
        });
        setCurrentUser(newUser);
        navigate('/dashboard');
      } else {
        // Log ind
        const user = await loginUser(formData.firstName, formData.password);
        if (!user) {
          setError('Forkert navn eller password - prøv igen');
          setIsLoading(false);
          return;
        }
        setCurrentUser(user);
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Noget gik galt - prøv igen');
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">

        {/* Logo */}
        <div className="logo-container">
          <img
            src={logo}
            alt="3on3 Battlenight Rungsted"
            className="logo"
          />
        </div>

        {/* Toggle Login/Opret */}
        <div className="toggle-container">
          <button
            className={`toggle-btn ${!isCreating ? 'active' : ''}`}
            onClick={() => { setIsCreating(false); setError(''); }}
          >
            Log ind
          </button>
          <button
            className={`toggle-btn ${isCreating ? 'active' : ''}`}
            onClick={() => { setIsCreating(true); setError(''); }}
          >
            Opret konto
          </button>
        </div>

        {/* Fejl besked */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label>Fornavn</label>
            <input
              type="text"
              name="firstName"
              placeholder="Dit fornavn"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              placeholder="Dit password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          {isCreating && (
            <>
              <div className="input-group">
                <label>Klub</label>
                <input
                  type="text"
                  name="club"
                  placeholder="Din ishockeyklub"
                  value={formData.club}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label>Årgang</label>
                <input
                  type="number"
                  name="birthYear"
                  placeholder="fx 2012"
                  value={formData.birthYear}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="input-group">
                <label>Spillernummer</label>
                <input
                  type="number"
                  name="playerNumber"
                  placeholder="Dit spillernummer"
                  value={formData.playerNumber}
                  onChange={handleChange}
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="submit-btn" disabled={isLoading}>
            {isLoading ? '⏳ Vent...' : isCreating ? '🏒 Opret konto' : '🏒 Log ind'}
          </button>
        </form>

        {isCreating && (
          <p className="gdpr-text">
            ⚠️ Er du under 15 år skal en forælder administrere kontoen
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;

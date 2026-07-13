import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.svg';
import '../styles/login.css';

function Login() {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    password: '',
    club: '',
    birthYear: '',
    playerNumber: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating) {
      alert('Konto oprettet! (test)');
    } else {
      navigate('/dashboard');
    }
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
            onClick={() => setIsCreating(false)}
          >
            Log ind
          </button>
          <button
            className={`toggle-btn ${isCreating ? 'active' : ''}`}
            onClick={() => setIsCreating(true)}
          >
            Opret konto
          </button>
        </div>

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

          <button type="submit" className="submit-btn">
            {isCreating ? '🏒 Opret konto' : '🏒 Log ind'}
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
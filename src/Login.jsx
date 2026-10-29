import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { TUTOR_PROFILES } from './tutorProfiles';

const PROFESSOR_EMAIL = 'profesor@tutly.com';
const PROFESSOR_PASSWORD = 'TUTLY2026';

function Brand() {
  return (
    <Link to="/" className="login-brand">
      <span className="login-brand-icon">✦</span>
      <span>JOBM <b>Tutor</b></span>
    </Link>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalErr, setGlobalErr] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!success) return undefined;
    const timeout = window.setTimeout(() => navigate('/tutor'), 650);
    return () => window.clearTimeout(timeout);
  }, [success, navigate]);

  const handleSubmit = (event) => {
    event.preventDefault();
    setGlobalErr('');
    if (email === PROFESSOR_EMAIL && password === PROFESSOR_PASSWORD) {
      setSuccess(true);
    } else {
      setGlobalErr('Credenciales incorrectas');
    }
  };

  return (
    <main className="login-page">
      <section className="login-layout">
        <div className="login-main">
          <header className="login-header"><Brand /></header>
          <div className="login-content">
            {success ? (
              <div className="login-success" role="status">
                <span className="success-check">✓</span>
                <p className="login-eyebrow">Acceso autorizado</p>
                <h1>¡Qué bueno tenerte aquí!</h1>
                <p>Estamos preparando tu espacio de tutor.</p>
              </div>
            ) : (
              <>
                <p className="login-eyebrow">Equipo de tutores</p>
                <h1>Iniciar sesión</h1>
                <p className="login-intro">Accede a tu cuenta para responder preguntas y acompañar a tus estudiantes.</p>

                <section className="suggested-profiles" aria-labelledby="suggested-profiles-title">
                  <div className="suggested-heading">
                    <h2 id="suggested-profiles-title">Perfiles sugeridos</h2>
                    <span>Demo</span>
                  </div>
                  <div className="suggested-profile-list">
                    {TUTOR_PROFILES.map((profile) => (
                      <button
                        className="suggested-profile"
                        key={profile.id}
                        type="button"
                        onClick={() => navigate(`/tutor?profile=${profile.id}`)}
                      >
                        <span className="suggested-avatar">{profile.initials}</span>
                        <span className="suggested-copy"><strong>{profile.name}</strong><small>{profile.subjects}</small></span>
                        <span className="suggested-arrow">›</span>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="login-divider"><span>o inicia sesión con tu cuenta</span></div>
                <form className="login-form" onSubmit={handleSubmit} noValidate>
                  {globalErr && <div className="login-error" role="alert">{globalErr}</div>}
                  <label htmlFor="login-email">
                    Correo electrónico
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(event) => { setEmail(event.target.value); if (globalErr) setGlobalErr(''); }}
                    />
                  </label>
                  <label htmlFor="login-password">
                    Contraseña
                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(event) => { setPassword(event.target.value); if (globalErr) setGlobalErr(''); }}
                    />
                  </label>
                  <button className="login-submit" type="submit">Iniciar sesión <span>›</span></button>
                </form>

                <Link to="/" className="login-back">Volver al inicio</Link>
                <p className="student-prompt">¿Eres estudiante? <Link to="/student">Entra a tu espacio</Link></p>
              </>
            )}
          </div>
          <footer className="login-footer">
            <span>© {new Date().getFullYear()} JOBM Tech</span>
            <Link to="/privacidad">Política de Privacidad</Link>
            <Link to="/terminos">Términos y Condiciones</Link>
          </footer>
        </div>

        <aside className="login-aside">
          <div className="login-aside-orbit" />
          <div className="login-aside-content">
            <span className="aside-icon">✦</span>
            <p className="aside-kicker">Enseñar también es aprender</p>
            <h2>Una explicación clara puede cambiar el día de un estudiante.</h2>
            <div className="aside-note">
              <span className="aside-avatar">JL</span>
              <span><strong>Joel, tutor</strong><small>“Vamos paso a paso.”</small></span>
              <span className="aside-note-check">✓</span>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}

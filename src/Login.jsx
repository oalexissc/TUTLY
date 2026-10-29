import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Login.css';
import { getSupabase } from './supabaseClient';

const TUTOR_LOGIN_ALIASES = {
  'profesor@tutly.com': 'alexis1724@hotmail.es',
};

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
  const [newPassword, setNewPassword] = useState('');
  const [globalErr, setGlobalErr] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [name, setName] = useState('');
  const [signupNotice, setSignupNotice] = useState('');
  const isRegistering = authMode === 'register';

  useEffect(() => {
    let active = true;
    let subscription;

    const initializeRecovery = async () => {
      try {
        const supabase = await getSupabase();
        if (!active) return;

        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (active && event === 'PASSWORD_RECOVERY' && session) {
            setAuthMode('reset');
            setGlobalErr('');
            setSignupNotice('');
          }
        });
        subscription = data.subscription;

        if (new URLSearchParams(window.location.search).get('mode') === 'reset') {
          const { data: sessionData, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (!active) return;
          if (sessionData.session) {
            setAuthMode('reset');
          } else {
            setGlobalErr('El enlace de recuperación no es válido o ya venció. Solicita uno nuevo.');
          }
        }
      } catch (error) {
        if (!active) return;
        console.error('No se pudo inicializar la recuperación de contraseña.', error);
        setGlobalErr(error instanceof Error ? error.message : 'No se pudo validar el enlace de recuperación.');
      }
    };

    initializeRecovery();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setGlobalErr('');
    setSignupNotice('');
    setIsSubmitting(true);

    try {
      const supabase = await getSupabase();
      const submittedEmail = email.trim().toLowerCase();
      const authEmail = TUTOR_LOGIN_ALIASES[submittedEmail] || submittedEmail;

      if (authMode === 'recovery') {
        const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
          redirectTo: `${window.location.origin}/login?mode=reset`,
        });
        if (error) throw error;
        setSignupNotice('Si el correo está registrado, recibirás un enlace para cambiar la contraseña.');
        return;
      }

      if (authMode === 'reset') {
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        const { data: profile, error: profileError } = await supabase
          .from('perfiles')
          .select('role')
          .eq('id', data.user.id)
          .maybeSingle();

        if (profileError) {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) console.error('No se pudo cerrar la sesión sin perfil de tutor.', signOutError);
          throw profileError;
        }

        if (profile?.role !== 'tutor') {
          const { error: signOutError } = await supabase.auth.signOut();
          if (signOutError) console.error('No se pudo cerrar la sesión de una cuenta sin acceso de tutor.', signOutError);
          setGlobalErr('Esta cuenta no está autorizada como tutor. Usa el correo asignado por coordinación.');
          return;
        }

        navigate('/tutor');
        return;
      }

      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password,
          options: { data: { nombre: name.trim() } },
        });
        if (error) throw error;

        if (!data.session) {
          setSignupNotice('Te enviamos un correo para confirmar la cuenta. Después de confirmarlo, inicia sesión aquí.');
          return;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password,
      });

      if (error) throw error;

      const { data: profile, error: profileError } = await supabase
        .from('perfiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profileError) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error('No se pudo cerrar la sesión sin perfil de tutor.', signOutError);
        throw profileError;
      }

      if (profile?.role !== 'tutor') {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) console.error('No se pudo cerrar la sesión de una cuenta sin acceso de tutor.', signOutError);
        setGlobalErr('Esta cuenta no está autorizada como tutor. Usa el correo asignado por coordinación.');
        return;
      }

      navigate('/tutor');
    } catch (error) {
      console.error('No se pudo iniciar sesión como tutor.', error);
      setGlobalErr(error instanceof Error ? error.message : 'No se pudo iniciar sesión. Inténtalo nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-layout">
        <div className="login-main">
          <header className="login-header"><Brand /></header>
          <div className="login-content">
            <p className="login-eyebrow">Equipo de tutores</p>
            <h1>
              {authMode === 'recovery'
                ? 'Recuperar contraseña'
                : authMode === 'reset'
                  ? 'Crear nueva contraseña'
                  : isRegistering
                    ? 'Crear cuenta de tutor'
                    : 'Iniciar sesión'}
            </h1>
            <p className="login-intro">
              {authMode === 'recovery'
                ? 'Te enviaremos un enlace al correo asociado a tu cuenta.'
                : authMode === 'reset'
                  ? 'Elige una contraseña nueva para tu cuenta de tutor.'
                  : isRegistering
                    ? 'Usa el correo autorizado y confírmalo para activar tu acceso.'
                    : 'Accede con el correo autorizado de tu cuenta de tutor.'}
            </p>

            <form className="login-form" onSubmit={handleSubmit}>
              {globalErr && <div className="login-error" role="alert">{globalErr}</div>}
              {signupNotice && <div className="login-success-notice" role="status">{signupNotice}</div>}
              {isRegistering && (
                <label htmlFor="login-name">
                  Nombre
                  <input
                    id="login-name"
                    type="text"
                    autoComplete="name"
                    maxLength={80}
                    required
                    placeholder="Profesor"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </label>
              )}
              {authMode !== 'reset' && (
                <label htmlFor="login-email">
                  Correo electrónico
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    required
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(event) => { setEmail(event.target.value); if (globalErr) setGlobalErr(''); }}
                  />
                </label>
              )}
              {authMode === 'reset' ? (
                <label htmlFor="new-password">
                  Nueva contraseña
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    placeholder="Mínimo 8 caracteres"
                    value={newPassword}
                    onChange={(event) => { setNewPassword(event.target.value); if (globalErr) setGlobalErr(''); }}
                  />
                </label>
              ) : authMode !== 'recovery' ? (
                <label htmlFor="login-password">
                  Contraseña
                  <input
                    id="login-password"
                    type="password"
                    autoComplete={isRegistering ? 'new-password' : 'current-password'}
                    minLength={isRegistering ? 8 : undefined}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => { setPassword(event.target.value); if (globalErr) setGlobalErr(''); }}
                  />
                </label>
              ) : null}
              <button className="login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting
                  ? 'Procesando…'
                  : authMode === 'recovery'
                    ? 'Enviar enlace'
                    : authMode === 'reset'
                      ? 'Guardar contraseña'
                      : isRegistering
                        ? 'Crear cuenta'
                        : 'Iniciar sesión'} <span>›</span>
              </button>
            </form>

            {authMode === 'login' && (
              <button className="tutor-auth-toggle" type="button" onClick={() => {
                setAuthMode('recovery');
                setGlobalErr('');
                setSignupNotice('');
              }}>
                ¿Olvidaste tu contraseña?
              </button>
            )}
            {authMode === 'recovery' && (
              <button className="tutor-auth-toggle" type="button" onClick={() => {
                setAuthMode('login');
                setGlobalErr('');
                setSignupNotice('');
              }}>
                Volver a iniciar sesión
              </button>
            )}
            {authMode === 'login' || isRegistering ? (
              <button className="tutor-auth-toggle" type="button" onClick={() => {
              setAuthMode((current) => current === 'register' ? 'login' : 'register');
              setGlobalErr('');
              setSignupNotice('');
            }}>
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Primera vez? Crear cuenta de tutor'}
              </button>
            ) : null}
            <Link to="/" className="login-back">Volver al inicio</Link>
            <p className="student-prompt">¿Eres estudiante? <Link to="/student">Entra a tu espacio</Link></p>
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

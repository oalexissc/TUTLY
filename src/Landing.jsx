import { Link } from 'react-router-dom';
import './Landing.css';

const roles = [
  { title: 'Soy estudiante', description: 'Quiero ayuda con un ejercicio', icon: '▱', color: 'blue', to: '/student' },
  { title: 'Soy tutor', description: 'Quiero responder preguntas', icon: '♧', color: 'amber', to: '/login' },
];

function HeroIllustration() {
  return (
    <div className="landing-art" aria-label="Ejemplo de una pregunta de Física y la respuesta de un tutor">
      <div className="art-orbit orbit-one" />
      <div className="art-orbit orbit-two" />
      <div className="success-float"><span>✓</span><strong>¡Me destrabé!</strong><small>Ahora sí entiendo</small></div>
      <article className="exercise-card">
        <p>Física · 1ro BGU</p>
        <h2>¿Cómo saco las componentes de este vector?</h2>
        <div className="vector-diagram" aria-hidden="true">
          <span className="vector-line" />
          <span className="vector-arrow">›</span>
          <strong>F = 20 N</strong>
        </div>
      </article>
      <article className="tutor-reply">
        <span className="reply-avatar">JL</span>
        <div><small>Joel, tutor</small><strong>Empecemos dibujando el triángulo...</strong></div>
        <span className="play-icon">›</span>
      </article>
    </div>
  );
}

export default function Landing() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <div className="landing-panel">
          <header className="landing-header">
            <Link to="/" className="landing-brand" aria-label="JOBM Tutor, inicio">
              <span className="landing-brand-icon">✦</span>
              <span>JOBM <b>Tutor</b></span>
            </Link>
          </header>

          <div className="landing-content">
            <p className="landing-eyebrow">Tutoría que sí te destraba</p>
            <h1>Aprender es más fácil cuando alguien te explica el porqué.</h1>
            <p className="landing-description">
              Conectamos a estudiantes de Fe y Alegría con tutores universitarios, paso a paso y sin compartir datos personales.
            </p>

            <p className="role-prompt">¿Cómo quieres entrar?</p>
            <div className="role-list">
              {roles.map((role) => (
                <Link to={role.to} className="role-card" key={role.title}>
                  <span className={`role-icon ${role.color}`}>{role.icon}</span>
                  <span className="role-copy"><strong>{role.title}</strong><small>{role.description}</small></span>
                  <span className="role-arrow">›</span>
                </Link>
              ))}
              <div className="role-card coordinator-card">
                <span className="role-icon green">↗</span>
                <span className="role-copy"><strong>Soy coordinador</strong><small>Quiero ver el avance del programa</small></span>
                <span className="role-arrow">›</span>
              </div>
            </div>

            <p className="privacy-promise"><span>✓</span><span>Tus datos están protegidos. Nunca pedimos teléfono ni redes sociales.</span></p>
          </div>
        </div>

        <div className="landing-blue-panel">
          <HeroIllustration />
        </div>
      </section>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} JOBM Tech. Todos los derechos reservados.</span>
        <nav aria-label="Información legal">
          <Link to="/privacidad">Política de Privacidad</Link>
          <Link to="/terminos">Términos y Condiciones</Link>
        </nav>
      </footer>
    </main>
  );
}

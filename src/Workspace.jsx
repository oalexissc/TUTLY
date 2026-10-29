import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Workspace.css';
import { getSupabase } from './supabaseClient';

const SUBJECTS = [
  { name: 'Matemáticas', icon: 'x²', color: 'blue' },
  { name: 'Física', icon: 'F', color: 'amber' },
  { name: 'Química', icon: 'H₂O', color: 'green' },
];
const GRADES = ['1ro BGU', '2do BGU', '3ro BGU'];
const COMMON_QUESTIONS = {
  Matemáticas: ['¿Cómo resuelvo este sistema de ecuaciones?', '¿Cuándo debo usar la regla de los signos?', '¿Cómo simplifico esta expresión?'],
  Física: ['¿Cuándo uso seno o coseno en vectores?', '¿Cómo hago un diagrama de cuerpo libre?', '¿Cómo convierto km/h a m/s?'],
  Química: ['¿Cómo balanceo una ecuación química?', '¿Cómo identifico los moles?', '¿Cómo se organizan los electrones?'],
};
const REASONS = ['No entiendo el enunciado', 'No sé qué fórmula usar', 'Me sale otro resultado', 'Otro'];
const TIME_OPTIONS = ['Menos de 15 min', '15 a 45 min', 'Más de 45 min'];
const QUESTION_COLUMNS = 'id, student_id, student_name, grade, subject, title, question, reason, detail, stuck_time, voice_note, created_at, status, answer, answered_by, answered_by_name, answered_at';
const EMPTY_DATA = { student: null, tutor: null, questions: [], serviceMinutes: 0 };

function mapQuestion(row) {
  return {
    id: row.id,
    studentId: row.student_id,
    studentName: row.student_name,
    grade: row.grade,
    subject: row.subject,
    title: row.title,
    question: row.question,
    reason: row.reason,
    detail: row.detail,
    stuckTime: row.stuck_time,
    voiceNote: row.voice_note,
    createdAt: row.created_at,
    status: row.status,
    answer: row.answer,
    answeredById: row.answered_by,
    answeredBy: row.answered_by_name,
  };
}

function mapProfile(row) {
  return {
    id: row.id,
    name: row.nombre,
    school: row.colegio,
    grade: row.curso,
    role: row.role,
    subjects: row.materias,
  };
}

function formatTime(dateString) {
  return new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(new Date(dateString));
}

function elapsedTime(dateString) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(dateString).getTime()) / 60000));
  return minutes < 60 ? `hace ${minutes} min` : `hace ${Math.floor(minutes / 60)} h`;
}

function VoiceRecorder({ onSave }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [stream, setStream] = useState(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    if (!recording) return undefined;
    const interval = window.setInterval(() => {
      setSeconds((value) => {
        if (value >= 59) {
          window.setTimeout(() => stopRecording(), 0);
          return 60;
        }
        return value + 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [recording]);

  useEffect(() => () => {
    if (stream) stream.getTracks().forEach((track) => track.stop());
  }, [stream]);

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder?.state === 'recording') recorder.stop();
  };

  const startRecording = async () => {
    setError('');
    setSaved(false);
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Tu navegador no permite grabar audio. Puedes continuar sin nota de voz.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(mediaStream);
      const recorder = new MediaRecorder(mediaStream);
      const chunks = [];
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder.onerror = () => {
        setError('No se pudo completar la grabación. Inténtalo nuevamente.');
      };
      recorder.onstop = () => {
        const audio = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (audio.size > 1_000_000) {
          setError('La nota supera el límite de 1 MB. Graba un audio más corto.');
          mediaStream.getTracks().forEach((track) => track.stop());
          setStream(null);
          setRecording(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          onSave(String(reader.result));
          setSaved(true);
        };
        reader.onerror = () => setError('No se pudo guardar la nota de voz.');
        reader.readAsDataURL(audio);
        mediaStream.getTracks().forEach((track) => track.stop());
        setStream(null);
        setRecording(false);
      };
      recorder.start();
      setSeconds(0);
      setRecording(true);
    } catch (recordingError) {
      setError(recordingError instanceof Error ? recordingError.message : 'No se pudo acceder al micrófono.');
    }
  };

  return (
    <div className="voice-recorder">
      <button className="voice-button" type="button" onClick={recording ? stopRecording : startRecording}>
        <span className="voice-icon" aria-hidden="true">{recording ? '■' : '♩'}</span>
        <span>
          <strong>{recording ? `Detener grabación · ${seconds}s` : saved ? 'Grabar otra nota' : 'Grabar nota de voz'}</strong>
          <small>{recording ? 'Máximo 60 segundos' : 'Opcional · máximo 60 s'}</small>
        </span>
      </button>
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

function PageHeader({ title, back, action }) {
  return (
    <header className="workspace-header">
      {back ? <button className="icon-button" type="button" onClick={back} aria-label="Volver">‹</button> : <span className="brand-mark">✦</span>}
      <strong>{title}</strong>
      {action || <span className="header-spacer" />}
    </header>
  );
}

function BottomNav({ items, selected, onSelect }) {
  return (
    <nav className="bottom-nav" aria-label="Navegación principal">
      {items.map((item) => (
        <button key={item.id} className={selected === item.id ? 'nav-item selected' : 'nav-item'} type="button" onClick={() => onSelect(item.id)}>
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function SubjectBadge({ subject }) {
  return <span className={`subject-badge ${subject === 'Física' ? 'physics' : subject === 'Química' ? 'chemistry' : ''}`}>{subject}</span>;
}

function PersistenceNotice({ message }) {
  return message ? <p className="persistence-error" role="alert">{message}</p> : null;
}

function StudentQuestionCard({ question, onOpen }) {
  return (
    <button className="student-question-card" type="button" onClick={onOpen}>
      <div className="question-card-top">
        <SubjectBadge subject={question.subject} />
        <span className={question.status === 'answered' ? 'status answered' : 'status pending'}>
          <i />{question.status === 'answered' ? 'Respondida' : 'Tutor respondiendo'}
        </span>
      </div>
      <strong className="question-card-title">{question.title}</strong>
      <span className="question-preview">{question.reason}</span>
      <div className="question-card-foot">
        <span>◷ &nbsp;Hoy, {formatTime(question.createdAt)}</span>
        <span>{question.status === 'answered' ? 'Ver respuesta' : 'Ver pregunta'} &nbsp;›</span>
      </div>
    </button>
  );
}

function Workspace() {
  const location = useLocation();
  const navigate = useNavigate();
  const isTutor = location.pathname === '/tutor';
  const [data, setData] = useState(EMPTY_DATA);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [screen, setScreen] = useState(isTutor ? 'home' : 'onboarding');
  const [studentTab, setStudentTab] = useState('home');
  const [tutorTab, setTutorTab] = useState('questions');
  const [selectedSubject, setSelectedSubject] = useState('Matemáticas');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({ subject: 'Matemáticas', question: '', reason: '', detail: '', stuckTime: '15 a 45 min', voiceNote: '' });
  const [filters, setFilters] = useState({ subject: 'Todas', grade: 'Todos' });
  const [answer, setAnswer] = useState('');
  const [profileForm, setProfileForm] = useState({ school: '', name: '', grade: '' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentMode, setStudentMode] = useState('signup');
  const [signupNotice, setSignupNotice] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState('');
  const activeProfile = profile?.id === user?.id ? profile : null;

  useEffect(() => {
    let active = true;
    let subscription;

    const initializeAuth = async () => {
      await Promise.resolve();
      if (!active) return;

      try {
        const supabase = await getSupabase();
        const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!active) return;
          setUser(session?.user || null);
          setPersistenceError('');
        });
        subscription = authData.subscription;

        const { data: sessionData, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (active) setUser(sessionData.session?.user || null);
      } catch (error) {
        if (!active) return;
        console.error('No se pudo inicializar la sesión de Supabase.', error);
        setPersistenceError(error instanceof Error ? error.message : 'No se pudo inicializar la sesión de Supabase.');
      } finally {
        if (active) setAuthLoading(false);
      }
    };

    initializeAuth();

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return undefined;

    let active = true;

    const loadProfile = async () => {
      try {
        const supabase = await getSupabase();
        const { data: profileRow, error } = await supabase
          .from('perfiles')
          .select('id, nombre, colegio, curso, role, materias')
          .eq('id', user.id)
          .maybeSingle();

        if (error) throw error;
        if (!profileRow) throw new Error('No se encontró tu perfil. Pide al equipo que revise la configuración de Supabase.');

        const nextProfile = mapProfile(profileRow);
        if (!active) return;
        setProfile(nextProfile);
        setPersistenceError('');
        setData({
          ...EMPTY_DATA,
          student: nextProfile.role === 'student' ? nextProfile : null,
          tutor: nextProfile.role === 'tutor' ? nextProfile : null,
        });
      } catch (error) {
        if (!active) return;
        console.error('No se pudo cargar el perfil desde Supabase.', error);
        setPersistenceError(error instanceof Error ? error.message : 'No se pudo cargar tu perfil.');
      }
    };

    loadProfile();
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const expectedRole = isTutor ? 'tutor' : 'student';
    if (!user || !activeProfile || activeProfile.role !== expectedRole) return undefined;

    let active = true;
    let supabase;
    let channel;
    const loadQuestions = async () => {
      const { data: rows, error } = await supabase
        .from('dudas')
        .select(QUESTION_COLUMNS)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!active) return;

      const questions = rows.map(mapQuestion);
      setData((current) => ({
        ...current,
        questions,
        serviceMinutes: questions.filter((question) => question.answeredById === activeProfile.id).length * 8,
      }));
      setPersistenceError('');
    };

    const connectQuestions = async () => {
      try {
        supabase = await getSupabase();
        await loadQuestions();
        if (!active) return;
        channel = supabase
          .channel(`dudas-${activeProfile.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'dudas',
            ...(isTutor ? {} : { filter: `student_id=eq.${activeProfile.id}` }),
          }, () => {
            loadQuestions().catch((error) => {
              if (!active) return;
              console.error('No se pudieron sincronizar las preguntas.', error);
              setPersistenceError(error instanceof Error ? error.message : 'No se pudieron sincronizar las preguntas.');
            });
          })
          .subscribe((status) => {
            if (!active || (status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT')) return;
            const error = new Error(`La sincronización en tiempo real no está disponible (${status}).`);
            console.error('No se pudo iniciar la sincronización de preguntas.', error);
            setPersistenceError(error.message);
          });
      } catch (error) {
        if (!active) return;
        console.error('No se pudieron cargar las preguntas desde Supabase.', error);
        setPersistenceError(error instanceof Error ? error.message : 'No se pudieron cargar las preguntas.');
      }
    };

    connectQuestions();

    return () => {
      active = false;
      if (supabase && channel) supabase.removeChannel(channel);
    };
  }, [activeProfile, isTutor, user]);

  const studentQuestions = data.questions;
  const activeTutor = activeProfile?.role === 'tutor' ? activeProfile : null;

  const beginQuestion = (subject) => {
    setSelectedSubject(subject);
    setDraft({ subject, question: '', reason: '', detail: '', stuckTime: '15 a 45 min', voiceNote: '' });
    setStep(1);
    setScreen('compose');
  };

  const submitQuestion = async (event) => {
    event.preventDefault();
    if (!draft.reason || !activeProfile || !user) return;
    setIsSaving(true);
    setPersistenceError('');

    try {
      const supabase = await getSupabase();
      const { data: row, error } = await supabase
        .from('dudas')
        .insert({
          student_id: user.id,
          student_name: activeProfile.name,
          grade: activeProfile.grade,
          subject: draft.subject,
          title: draft.question.trim().split('\n')[0].slice(0, 76),
          question: draft.question.trim(),
          reason: draft.reason,
          detail: draft.detail.trim(),
          stuck_time: draft.stuckTime,
          voice_note: draft.voiceNote || null,
        })
        .select(QUESTION_COLUMNS)
        .single();

      if (error) throw error;
      const question = mapQuestion(row);
      setData((current) => ({ ...current, questions: [question, ...current.questions] }));
      setSelectedQuestion(question);
      setScreen('detail');
      setStudentTab('questions');
    } catch (error) {
      console.error('No se pudo guardar la pregunta en Supabase.', error);
      setPersistenceError(error instanceof Error ? error.message : 'No se pudo guardar la pregunta.');
    } finally {
      setIsSaving(false);
    }
  };

  const sendAnswer = async (event) => {
    event.preventDefault();
    if (!answer.trim() || !selectedQuestion || !user) return;
    setIsSaving(true);
    setPersistenceError('');

    try {
      const supabase = await getSupabase();
      const { data: row, error } = await supabase
        .from('dudas')
        .update({ answer: answer.trim(), answered_by: user.id, status: 'answered' })
        .eq('id', selectedQuestion.id)
        .eq('status', 'pending')
        .select(QUESTION_COLUMNS)
        .maybeSingle();

      if (error) throw error;
      if (!row) {
        setPersistenceError('Esta pregunta ya fue respondida. Actualiza la lista para ver la respuesta.');
        return;
      }

      const question = mapQuestion(row);
      setData((current) => ({
        ...current,
        questions: current.questions.map((item) => item.id === question.id ? question : item),
        serviceMinutes: current.serviceMinutes + 8,
      }));
      setSelectedQuestion(question);
      setAnswer('');
      setScreen('detail');
    } catch (error) {
      console.error('No se pudo guardar la respuesta en Supabase.', error);
      setPersistenceError(error instanceof Error ? error.message : 'No se pudo guardar la respuesta.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStudentAccess = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setPersistenceError('');
    setSignupNotice('');

    try {
      const supabase = await getSupabase();
      if (studentMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else {
        const { data: result, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              nombre: profileForm.name.trim(),
              colegio: profileForm.school,
              curso: profileForm.grade,
            },
          },
        });
        if (error) throw error;
        if (!result.session) setSignupNotice('Revisa tu correo y confirma la cuenta para continuar.');
      }
    } catch (error) {
      console.error('No se pudo autenticar la cuenta de estudiante.', error);
      setPersistenceError(error instanceof Error ? error.message : 'No se pudo autenticar la cuenta.');
    } finally {
      setIsSaving(false);
    }
  };

  const logout = async () => {
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setPersistenceError('');
      if (isTutor) navigate('/login');
      else {
        setScreen('onboarding');
        setStudentTab('home');
        setTutorTab('questions');
      }
    } catch (error) {
      console.error('No se pudo cerrar la sesión de Supabase.', error);
      setPersistenceError(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.');
    }
  };

  const profileLoading = Boolean(user && !activeProfile && !persistenceError);
  if (authLoading || profileLoading) {
    return <main className="workspace-shell"><p className="intro-copy">Conectando con tu espacio…</p></main>;
  }

  if (user && !activeProfile) {
    return (
      <main className="workspace-shell">
        <PageHeader title="Tu perfil" action={<button className="header-link button-link" type="button" onClick={logout}>Salir</button>} />
        <section className="onboarding-screen">
          <h1>No pudimos cargar tu perfil</h1>
          <p className="intro-copy">La cuenta se autenticó, pero no encontramos el perfil asociado.</p>
        </section>
        <PersistenceNotice message={persistenceError} />
      </main>
    );
  }

  if (user && activeProfile && activeProfile.role !== (isTutor ? 'tutor' : 'student')) {
    return (
      <main className="workspace-shell">
        <PageHeader title="Acceso" action={<button className="header-link button-link" type="button" onClick={logout}>Salir</button>} />
        <section className="onboarding-screen">
          <h1>Este espacio no corresponde a tu cuenta</h1>
          <p className="intro-copy">Usa el espacio asignado a tu perfil.</p>
          <Link className="header-link" to={activeProfile.role === 'tutor' ? '/tutor' : '/student'}>Ir a mi espacio</Link>
        </section>
        <PersistenceNotice message={persistenceError} />
      </main>
    );
  }

  if (isTutor && !user) {
    return (
      <main className="workspace-shell">
        <PageHeader title="Espacio de tutor" action={<Link className="header-link" to="/">Salir</Link>} />
        <section className="onboarding-screen">
          <div className="welcome-icon">♧</div>
          <h1>Inicia sesión como tutor</h1>
          <p className="intro-copy">Necesitas una cuenta de tutor habilitada por el equipo de coordinación.</p>
          <Link className="header-link" to="/login">Ir a iniciar sesión</Link>
        </section>
        <PersistenceNotice message={persistenceError} />
      </main>
    );
  }

  if (!isTutor && !user && screen === 'onboarding') {
    return (
      <main className="workspace-shell">
        <PageHeader title="" back={() => window.history.back()} action={<Link className="header-link" to="/">Salir</Link>} />
        <section className="onboarding-screen">
          <div className="welcome-icon">▱</div>
          <p className="eyebrow">Hola, qué gusto verte</p>
          <h1>{studentMode === 'signup' ? 'Crea tu cuenta' : 'Entra a tu espacio'}</h1>
          <p className="intro-copy">Tus preguntas quedarán guardadas en tu cuenta y solo tú y los tutores podrán consultarlas.</p>
          <form className="onboarding-form" onSubmit={handleStudentAccess}>
            {studentMode === 'signup' && (
              <>
                <label>Tu nombre de pila
                  <input required maxLength={80} autoComplete="name" placeholder="Ej. Mateo" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
                </label>
                <label>¿En qué colegio estudias?
                  <select required value={profileForm.school} onChange={(event) => setProfileForm({ ...profileForm, school: event.target.value })}>
                    <option value="">Selecciona una opción</option>
                    <option>Unidad Educativa Manuela Cañizares</option>
                    <option>Unidad Educativa Central</option>
                    <option>Otro colegio</option>
                  </select>
                </label>
                <label>¿En qué curso estás?
                  <select required value={profileForm.grade} onChange={(event) => setProfileForm({ ...profileForm, grade: event.target.value })}>
                    <option value="">Selecciona una opción</option>
                    {GRADES.map((grade) => <option key={grade}>{grade}</option>)}
                  </select>
                </label>
              </>
            )}
            <label>Correo electrónico
              <input required type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label>Contraseña
              <input required type="password" minLength={8} autoComplete={studentMode === 'signup' ? 'new-password' : 'current-password'} placeholder="Mínimo 8 caracteres" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {persistenceError && <PersistenceNotice message={persistenceError} />}
            {signupNotice && <p className="privacy-note" role="status">{signupNotice}</p>}
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? 'Conectando…' : studentMode === 'signup' ? 'Crear cuenta' : 'Iniciar sesión'}
            </button>
          </form>
          <button className="student-auth-toggle" type="button" onClick={() => {
            setStudentMode(studentMode === 'signup' ? 'login' : 'signup');
            setPersistenceError('');
            setSignupNotice('');
          }}>
            {studentMode === 'signup' ? '¿Ya tienes cuenta? Inicia sesión' : '¿Aún no tienes cuenta? Regístrate'}
          </button>
          <p className="privacy-note"><span>✓</span> Tu tutor solo verá tu nombre, curso y pregunta.</p>
        </section>
      </main>
    );
  }

  if (screen === 'compose') {
    return (
      <main className="workspace-shell">
        <PageHeader title="Nueva pregunta" back={() => step === 2 ? setStep(1) : setScreen('home')} action={<span className="header-spacer" />} />
        <div className="wizard-progress">
          <div className="progress-caption"><span>Paso {step} de 2</span><span>{step === 1 ? '50%' : '100%'}</span></div>
          <div className="progress-track"><span style={{ width: step === 1 ? '50%' : '100%' }} /></div>
        </div>
        {step === 1 ? (
          <section className="wizard-content">
            <h1>¿Qué quieres preguntar?</h1>
            <p className="intro-copy left">Elige una materia y escribe tu duda con tus propias palabras.</p>
            <h2 className="field-heading">Materia</h2>
            <div className="subject-pills">
              {SUBJECTS.map((subject) => <button key={subject.name} type="button" className={draft.subject === subject.name ? 'choice-pill active' : 'choice-pill'} onClick={() => setDraft({ ...draft, subject: subject.name })}>{subject.name}</button>)}
            </div>
            <h2 className="field-heading">Preguntas usuales de {draft.subject}</h2>
            <p className="field-hint">Toca una para usarla como punto de partida</p>
            <div className="common-question-list">
              {COMMON_QUESTIONS[draft.subject].map((common) => (
                <button key={common} type="button" className="common-question" onClick={() => setDraft({ ...draft, question: common })}><span className="mini-icon">▱</span><strong>{common}</strong><span>›</span></button>
              ))}
            </div>
            <label className="question-label" htmlFor="question-text">Escribe tu pregunta</label>
            <textarea id="question-text" rows="4" maxLength={1200} placeholder="Ej. Entiendo la fórmula, pero no sé qué datos reemplazar..." value={draft.question} onChange={(event) => setDraft({ ...draft, question: event.target.value })} />
            <p className="field-hint">Incluye los datos del ejercicio si los tienes.</p>
            <div className="friendly-tip"><span>✦</span><span><strong>No necesitas escribir perfecto</strong><small>Tu tutor te ayudará a entender la pregunta antes de resolverla.</small></span></div>
            <button className="primary-button" type="button" disabled={!draft.question.trim()} onClick={() => setStep(2)}>Continuar &nbsp;›</button>
          </section>
        ) : (
          <form className="wizard-content" onSubmit={submitQuestion}>
            <h1>¿Dónde te trabaste?</h1>
            <p className="intro-copy left">Así tu tutor sabrá exactamente cómo ayudarte.</p>
            <h2 className="field-heading">Elige una opción</h2>
            <div className="reason-pills">
              {REASONS.map((reason) => <button key={reason} className={draft.reason === reason ? 'choice-pill active' : 'choice-pill'} type="button" onClick={() => setDraft({ ...draft, reason })}>{reason}</button>)}
            </div>
            <h2 className="field-heading voice-heading">Cuéntanos con tu voz</h2>
            <VoiceRecorder onSave={(voiceNote) => setDraft((current) => ({ ...current, voiceNote }))} />
            {draft.voiceNote && <audio className="audio-preview" controls src={draft.voiceNote}>Tu navegador no admite audio.</audio>}
            <label className="question-label" htmlFor="question-detail">Agrega un detalle <span>(opcional)</span></label>
            <textarea id="question-detail" rows="3" maxLength={600} placeholder="¿Qué intentaste hasta ahora?" value={draft.detail} onChange={(event) => setDraft({ ...draft, detail: event.target.value })} />
            <h2 className="field-heading">¿Cuánto llevas atascado?</h2>
            <div className="time-options">
              {TIME_OPTIONS.map((time) => <button key={time} type="button" className={draft.stuckTime === time ? 'time-option active' : 'time-option'} onClick={() => setDraft({ ...draft, stuckTime: time })}>{time}</button>)}
            </div>
            <button className="primary-button" type="submit" disabled={!draft.reason || isSaving}>{isSaving ? 'Enviando…' : '›  Enviar pregunta'}</button>
          </form>
        )}
        <PersistenceNotice message={persistenceError} />
      </main>
    );
  }

  if (screen === 'detail' && selectedQuestion) {
    const question = data.questions.find((item) => item.id === selectedQuestion.id) || selectedQuestion;
    return (
      <main className="workspace-shell">
        <PageHeader title={isTutor ? 'Pregunta' : 'Detalle de pregunta'} back={() => setScreen('home')} action={<button className="header-link button-link" type="button" onClick={logout}>Salir</button>} />
        <section className="detail-content">
          <div className="question-card-top"><SubjectBadge subject={question.subject} /><span className={question.status === 'answered' ? 'status answered' : 'status pending'}><i />{question.status === 'answered' ? 'Respondida' : 'Esperando tutor'}</span></div>
          <h1>{question.title}</h1>
          <p className="detail-meta">{question.studentName} · {question.grade} · {formatTime(question.createdAt)}</p>
          <div className="detail-panel"><span className="eyebrow">Pregunta</span><p>{question.question}</p></div>
          <div className="detail-panel"><span className="eyebrow">¿Dónde se trabó?</span><p>{question.reason}</p>{question.detail && <p className="detail-extra">{question.detail}</p>}</div>
          {question.voiceNote && <div className="detail-panel"><span className="eyebrow">Nota de voz</span><audio controls src={question.voiceNote}>Tu navegador no admite audio.</audio></div>}
          {question.answer ? (
            <div className="answer-panel"><span className="eyebrow">Respuesta de {question.answeredBy || 'tu tutor'}</span><p>{question.answer}</p></div>
          ) : isTutor ? (
            <form className="answer-form" onSubmit={sendAnswer}>
              <label className="question-label" htmlFor="tutor-answer">Tu explicación</label>
              <textarea id="tutor-answer" rows="5" maxLength={1800} placeholder="Explica los pasos para que el estudiante pueda continuar..." value={answer} onChange={(event) => setAnswer(event.target.value)} />
              <button className="primary-button" type="submit" disabled={!answer.trim() || isSaving}>{isSaving ? 'Enviando…' : 'Enviar respuesta'}</button>
            </form>
          ) : (
            <div className="waiting-panel"><span className="waiting-dot" /> Tu tutor está preparando una explicación.</div>
          )}
        </section>
        <PersistenceNotice message={persistenceError} />
      </main>
    );
  }

  if (isTutor) {
    const visibleQuestions = data.questions.filter((question) => {
      const matchesSubject = filters.subject === 'Todas' || question.subject === filters.subject;
      const matchesGrade = filters.grade === 'Todos' || question.grade === filters.grade;
      return question.status === 'pending' && matchesSubject && matchesGrade;
    });
    const answeredCount = data.questions.filter((question) => question.status === 'answered' && question.answeredById === activeTutor?.id).length;
    return (
      <main className="workspace-shell tutor-shell">
        <PageHeader title="Preguntas" action={<button className="header-link button-link" type="button" onClick={logout}>Salir</button>} />
        <section className="tutor-dashboard">
          <div className="tutor-greeting"><div><p>Hola, {activeTutor?.name}</p><h1>{data.questions.filter((question) => question.status === 'pending').length} estudiantes esperando</h1></div><span className="availability"><i /> Disponible</span></div>
          <div className="service-card"><span className="clock-icon">◷</span><div><strong>{(data.serviceMinutes / 60).toFixed(1).replace('.', ',')} horas de servicio</strong><small>Meta del semestre · 20 horas</small><span className="service-track"><i style={{ width: `${Math.min(100, data.serviceMinutes / 12)}%` }} /></span></div></div>
          {tutorTab === 'questions' ? (
            <>
              <div className="filter-row">
                <div className="filter-pills">
                  {['Todas', ...SUBJECTS.map((subject) => subject.name)].map((subject) => <button key={subject} type="button" className={filters.subject === subject ? 'choice-pill active' : 'choice-pill'} onClick={() => setFilters({ ...filters, subject })}>{subject}</button>)}
                </div>
                <select aria-label="Filtrar por curso" value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })}>
                  <option>Todos</option>{GRADES.map((grade) => <option key={grade}>{grade}</option>)}
                </select>
              </div>
              <div className="tutor-question-list">
                {visibleQuestions.length ? visibleQuestions.map((question) => (
                  <button className="tutor-question-card" type="button" key={question.id} onClick={() => {
                    setSelectedQuestion(question);
                    setAnswer('');
                    setScreen('detail');
                  }}>
                    <div className="tutor-card-meta"><SubjectBadge subject={question.subject} /><span>{question.grade}</span><span>{elapsedTime(question.createdAt)}</span></div>
                    <strong>“{question.reason}”</strong>
                    <div className="tutor-card-foot"><span>◷ &nbsp;{question.stuckTime} atascado</span><span>{question.status === 'answered' ? 'Ver respuesta' : 'Ver pregunta'} &nbsp;›</span></div>
                  </button>
                )) : <div className="empty-state">No hay preguntas para estos filtros.</div>}
              </div>
            </>
          ) : (
            <section className="progress-content">
              <h2>Mi progreso</h2>
              <p>Tu ayuda hace que más estudiantes puedan continuar.</p>
              <div className="progress-stats"><div><strong>{answeredCount}</strong><span>Preguntas respondidas</span></div><div><strong>{(data.serviceMinutes / 60).toFixed(1).replace('.', ',')} h</strong><span>Horas de servicio</span></div></div>
              <div className="progress-detail"><span>Meta del semestre</span><strong>{data.serviceMinutes} de 1.200 min</strong><div className="progress-track"><span style={{ width: `${Math.min(100, data.serviceMinutes / 12)}%` }} /></div></div>
            </section>
          )}
        </section>
        <BottomNav items={[{ id: 'questions', icon: '⌕', label: 'Preguntas' }, { id: 'progress', icon: '↗', label: 'Mi progreso' }]} selected={tutorTab} onSelect={setTutorTab} />
        <PersistenceNotice message={persistenceError} />
      </main>
    );
  }

  const myQuestions = studentQuestions;
  return (
    <main className="workspace-shell student-shell">
      <PageHeader title={<><span className="brand-name">JOBM <b>Tutor</b></span></>} action={<button className="header-link button-link" type="button" onClick={logout}>Salir</button>} />
      {studentTab === 'home' ? (
        <section className="student-home">
          <p className="greeting">Buenas tardes, {data.student?.name}</p>
          <h1>¿Con qué te trabaste hoy?</h1>
          <button className="ask-card" type="button" onClick={() => beginQuestion(selectedSubject)}><span className="ask-icon">＋</span><span><strong>Hacer una pregunta</strong><small>Escribe qué necesitas entender</small></span><b>›</b></button>
          <h2 className="section-heading">Elige una materia</h2>
          <div className="subject-grid">
            {SUBJECTS.map((subject) => <button type="button" key={subject.name} className="subject-tile" onClick={() => beginQuestion(subject.name)}><span className={`subject-icon ${subject.color}`}>{subject.icon}</span><strong>{subject.name}</strong></button>)}
          </div>
          <div className="section-title-row"><h2>Mis preguntas</h2><button type="button" onClick={() => setStudentTab('questions')}>Ver todas</button></div>
          {myQuestions.length ? myQuestions.slice(0, 3).map((question) => <StudentQuestionCard key={question.id} question={question} onOpen={() => { setSelectedQuestion(question); setScreen('detail'); }} />) : <div className="empty-state">Aún no tienes preguntas. Cuando te trabes, aquí podrás dar seguimiento.</div>}
        </section>
      ) : studentTab === 'questions' ? (
        <section className="student-home list-page">
          <h1>Mis preguntas</h1>
          <p className="intro-copy left">Revisa el estado y las respuestas de tus consultas.</p>
          <button className="primary-button new-question-button" type="button" onClick={() => beginQuestion('Matemáticas')}>＋ &nbsp;Hacer una pregunta</button>
          {myQuestions.map((question) => <StudentQuestionCard key={question.id} question={question} onOpen={() => { setSelectedQuestion(question); setScreen('detail'); }} />)}
        </section>
      ) : (
        <section className="student-home profile-page">
          <div className="welcome-icon">{data.student?.name?.slice(0, 1).toUpperCase()}</div>
          <p className="eyebrow">Mi perfil</p><h1>{data.student?.name}</h1>
          <p className="intro-copy">{data.student?.school} · {data.student?.grade}</p>
          <div className="detail-panel"><span className="eyebrow">Tu privacidad</span><p>Tu tutor solo verá tu nombre, curso y las preguntas que envíes.</p></div>
          <button className="secondary-button" type="button" onClick={logout}>Salir de mi espacio</button>
        </section>
      )}
      <BottomNav items={[{ id: 'home', icon: '⌂', label: 'Inicio' }, { id: 'questions', icon: '▢', label: 'Mis preguntas' }, { id: 'profile', icon: '♙', label: 'Perfil' }]} selected={studentTab} onSelect={setStudentTab} />
      <PersistenceNotice message={persistenceError} />
    </main>
  );
}

export default Workspace;

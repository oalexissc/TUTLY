import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Workspace.css';
import { TUTOR_PROFILES } from './tutorProfiles';

const STORAGE_KEY = 'tutly-workspace-v1';
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

function createInitialData() {
  return {
    student: null,
    tutor: null,
    questions: [
      {
        id: 'demo-1',
        studentName: 'Mateo',
        grade: '1ro BGU',
        subject: 'Física',
        title: 'Componentes de un vector de 20 N',
        question: '¿Cuándo uso seno o coseno en vectores?',
        reason: 'No sé qué fórmula usar',
        detail: '',
        stuckTime: '15 a 45 min',
        createdAt: new Date().toISOString(),
        status: 'answered',
        answer: 'Usa coseno para la componente adyacente al ángulo y seno para la opuesta. Dibuja primero el vector y marca el ángulo respecto al eje.',
        answeredBy: 'Joel',
      },
      {
        id: 'demo-2',
        studentName: 'Valentina',
        grade: '2do BGU',
        subject: 'Matemáticas',
        title: 'Sistema de ecuaciones',
        question: 'Entiendo el procedimiento, pero me sale otro resultado.',
        reason: 'Me sale otro resultado',
        detail: 'Estoy usando el método de sustitución.',
        stuckTime: 'Más de 45 min',
        createdAt: new Date(Date.now() - 19 * 60 * 1000).toISOString(),
        status: 'pending',
      },
      {
        id: 'demo-3',
        studentName: 'Mateo',
        grade: '1ro BGU',
        subject: 'Física',
        title: 'Movimiento rectilíneo',
        question: 'No entiendo cómo plantear el ejercicio.',
        reason: 'No entiendo el enunciado',
        detail: '',
        stuckTime: '15 a 45 min',
        createdAt: new Date(Date.now() - 27 * 60 * 1000).toISOString(),
        status: 'pending',
      },
    ],
    serviceMinutes: 750,
  };
}

function loadData() {
  let saved;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    console.error('No se pudo acceder al almacenamiento de TUTLY.', error);
    return createInitialData();
  }
  if (!saved) return createInitialData();

  try {
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.questions) && typeof parsed.serviceMinutes === 'number') {
      return { ...createInitialData(), ...parsed };
    }
    throw new Error('El formato guardado de TUTLY no es válido.');
  } catch (error) {
    console.error('No se pudo leer el espacio guardado de TUTLY.', error);
    return createInitialData();
  }
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
  const suggestedTutor = isTutor
    ? TUTOR_PROFILES.find((tutor) => tutor.id === new URLSearchParams(location.search).get('profile'))
    : null;
  const [data, setData] = useState(loadData);
  const [screen, setScreen] = useState(isTutor && (suggestedTutor || data.tutor) ? 'home' : isTutor ? 'profiles' : 'onboarding');
  const [studentTab, setStudentTab] = useState('home');
  const [tutorTab, setTutorTab] = useState('questions');
  const [selectedSubject, setSelectedSubject] = useState('Matemáticas');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({ subject: 'Matemáticas', question: '', reason: '', detail: '', stuckTime: '15 a 45 min', voiceNote: '' });
  const [filters, setFilters] = useState({ subject: 'Todas', grade: 'Todos' });
  const [answer, setAnswer] = useState('');
  const [profileForm, setProfileForm] = useState({ school: '', name: '', grade: '' });
  const [persistenceError, setPersistenceError] = useState('');

  const saveData = (nextData) => {
    setData(nextData);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      setPersistenceError('');
    } catch (error) {
      console.error('No se pudo guardar el espacio de TUTLY.', error);
      setPersistenceError('No se pudieron guardar los cambios en este navegador. Libera espacio y vuelve a intentarlo.');
    }
  };

  useEffect(() => {
    const syncData = (event) => {
      if (event.key === STORAGE_KEY && event.newValue) {
        const updated = JSON.parse(event.newValue);
        if (updated && Array.isArray(updated.questions)) setData(updated);
      }
    };
    window.addEventListener('storage', syncData);
    return () => window.removeEventListener('storage', syncData);
  }, []);

  const setProfile = (profile) => saveData({ ...data, [isTutor ? 'tutor' : 'student']: profile });
  const studentQuestions = data.questions.filter((question) => question.studentName === data.student?.name);
  const activeTutor = suggestedTutor || data.tutor;

  const beginQuestion = (subject) => {
    setSelectedSubject(subject);
    setDraft({ subject, question: '', reason: '', detail: '', stuckTime: '15 a 45 min', voiceNote: '' });
    setStep(1);
    setScreen('compose');
  };

  const submitQuestion = (event) => {
    event.preventDefault();
    if (!draft.reason) return;
    const question = {
      id: `${Date.now()}`,
      studentName: data.student.name,
      grade: data.student.grade,
      subject: draft.subject,
      title: draft.question.trim().split('\n')[0].slice(0, 76),
      question: draft.question.trim(),
      reason: draft.reason,
      detail: draft.detail.trim(),
      stuckTime: draft.stuckTime,
      voiceNote: draft.voiceNote,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };
    saveData({ ...data, questions: [question, ...data.questions] });
    setSelectedQuestion(question);
    setScreen('detail');
    setStudentTab('questions');
  };

  const sendAnswer = (event) => {
    event.preventDefault();
    if (!answer.trim() || !selectedQuestion) return;
    saveData({
      ...data,
      serviceMinutes: data.serviceMinutes + 8,
      questions: data.questions.map((question) => question.id === selectedQuestion.id
        ? { ...question, answer: answer.trim(), answeredBy: activeTutor?.name || 'Tutor', status: 'answered' }
        : question),
    });
    setSelectedQuestion((current) => ({ ...current, answer: answer.trim(), answeredBy: activeTutor?.name || 'Tutor', status: 'answered' }));
    setAnswer('');
    setScreen('detail');
  };

  const logout = () => {
    setProfile(null);
    if (isTutor) {
      navigate('/login');
      return;
    }
    setScreen('onboarding');
    setStudentTab('home');
    setTutorTab('questions');
  };

  if (!isTutor && !data.student && screen === 'onboarding') {
    return (
      <main className="workspace-shell">
        <PageHeader title="" back={() => window.history.back()} action={<Link className="header-link" to="/">Salir</Link>} />
        <section className="onboarding-screen">
          <div className="welcome-icon">▱</div>
          <p className="eyebrow">Hola, qué gusto verte</p>
          <h1>Entra a tu espacio</h1>
          <p className="intro-copy">Solo necesitamos estos datos para encontrar tu curso. No pedimos tu teléfono.</p>
          <form className="onboarding-form" onSubmit={(event) => {
            event.preventDefault();
            if (profileForm.school && profileForm.name.trim() && profileForm.grade) {
              setProfile({ ...profileForm, name: profileForm.name.trim() });
              setScreen('home');
            }
          }}>
            <label>¿En qué colegio estudias?
              <select required value={profileForm.school} onChange={(event) => setProfileForm({ ...profileForm, school: event.target.value })}>
                <option value="">Selecciona una opción</option>
                <option>Unidad Educativa Manuela Cañizares</option>
                <option>Unidad Educativa Central</option>
                <option>Otro colegio</option>
              </select>
            </label>
            <label>Tu nombre de pila
              <input required maxLength={40} placeholder="Ej. Mateo" value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} />
            </label>
            <label>¿En qué curso estás?
              <select required value={profileForm.grade} onChange={(event) => setProfileForm({ ...profileForm, grade: event.target.value })}>
                <option value="">Selecciona una opción</option>
                {GRADES.map((grade) => <option key={grade}>{grade}</option>)}
              </select>
            </label>
            <button className="primary-button" type="submit">› &nbsp;Entrar</button>
          </form>
          <p className="privacy-note"><span>✓</span> Tu tutor solo verá tu nombre, curso y pregunta.</p>
        </section>
        <PersistenceNotice message={persistenceError} />
      </main>
    );
  }

  if (isTutor && !activeTutor && screen === 'profiles') {
    return (
      <main className="workspace-shell">
        <PageHeader title="Perfiles de tutor" back={() => window.history.back()} action={<Link className="header-link" to="/">Salir</Link>} />
        <section className="profile-screen">
          <div className="welcome-icon">♧</div>
          <p className="eyebrow">Equipo de voluntarios</p>
          <h1>¿Quién va a ingresar?</h1>
          <p className="intro-copy">Elige tu perfil para ver preguntas y registrar tus horas de servicio.</p>
          <div className="tutor-profiles">
            {TUTOR_PROFILES.map((tutor) => (
              <button className="tutor-profile-card" key={tutor.id} type="button" onClick={() => {
                setProfile(tutor);
                setScreen('home');
              }}>
                <span className="avatar">{tutor.initials}</span>
                <span><strong>{tutor.name}</strong><small>{tutor.subjects}</small></span>
                <span className="profile-arrow">›</span>
              </button>
            ))}
          </div>
          <p className="privacy-note"><span>✓</span> Cada tutor registra su propio progreso.</p>
        </section>
        <PersistenceNotice message={persistenceError} />
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
            <button className="primary-button" type="submit" disabled={!draft.reason}>› &nbsp;Enviar pregunta</button>
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
              <button className="primary-button" type="submit" disabled={!answer.trim()}>Enviar respuesta</button>
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
    const answeredCount = data.questions.filter((question) => question.status === 'answered' && question.answeredBy === activeTutor?.name).length;
    return (
      <main className="workspace-shell tutor-shell">
        <PageHeader title="Preguntas" back={() => setScreen('profiles')} action={<button className="header-link button-link" type="button" onClick={logout}>Salir</button>} />
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

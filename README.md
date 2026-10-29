# TUTLY

Plataforma de tutorías asincrónicas para estudiantes de bachillerato. Incluye la página pública, el espacio del estudiante y el panel de tutores.

## Desarrollo local

```sh
npm install
npm run dev
```

Otros comandos disponibles: `npm run lint` y `npm run build`.

## Supabase

1. Copia `.env.example` a `.env` y completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` con los datos del proyecto. Usa la clave publicable/anon; nunca pongas una clave `service_role` en el frontend.
2. Revisa si ya existen las tablas `perfiles` y `dudas`. En un proyecto nuevo, ejecuta `supabase/migrations/20261029000000_perfiles_y_dudas.sql` desde el SQL Editor de Supabase.
3. Ejecuta también `supabase/migrations/20261029001000_auto_tutor_allowlist.sql`. Esta lista privada autoriza `alexis1724@hotmail.es` como tutor y muestra el nombre “Profesor”; solo las cuentas con correo verificado podrán iniciar sesión.
4. En `/login`, `profesor@tutly.com` es un alias de acceso para la cuenta verificada `alexis1724@hotmail.es`; inicia sesión con la contraseña de esa cuenta. El alias no es un buzón: los mensajes de confirmación y recuperación llegan a `alexis1724@hotmail.es`. El enlace de recuperación vuelve a `/login?mode=reset`.
5. Las cuentas nuevas de estudiantes se crean desde `/student`. El tutor autorizado puede crear su cuenta desde `/login`; Supabase asigna el rol automáticamente cuando se crea el perfil.
6. Mantén activada la confirmación de correo en **Authentication → Sign In / Providers → Confirm email**. El tutor confirma el mensaje recibido antes de iniciar sesión.
7. En **Authentication → URL Configuration → Redirect URLs**, autoriza la URL de la aplicación (para desarrollo local, `http://localhost:5173/**`). Si Supabase no entrega los mensajes, configura SMTP en **Authentication → SMTP Settings** y revisa también correo no deseado.
## Recorridos de la aplicación

- `/` — landing page y acceso a los espacios.
- `/student` — registro/inicio de sesión de estudiante, creación y seguimiento de preguntas.
- `/login` — registro e inicio de sesión de tutores autorizados.
- `/tutor` — bandeja de preguntas y progreso de servicio.

Las políticas RLS limitan perfiles a su propietario; estudiantes solo consultan sus propias dudas y tutores autorizados pueden atenderlas. Las notas de voz se guardan con la pregunta. La grabación requiere permiso de micrófono y un navegador compatible.

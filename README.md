# TUTLY

Plataforma de tutorías asincrónicas para estudiantes de bachillerato. Incluye la página pública, el espacio del estudiante y el panel de tutores.

## Desarrollo local

```sh
npm install
npm run dev
```

Otros comandos disponibles: `npm run lint` y `npm run build`.

## Recorridos de la aplicación

- `/` — landing page y acceso a los espacios.
- `/student` — registro local del estudiante, creación y seguimiento de preguntas.
- `/login` — perfiles sugeridos de demostración e inicio de sesión de tutor.
- `/tutor` — selección de perfil, bandeja de preguntas y progreso de servicio.

Credenciales demo de tutor: `profesor@tutly.com` / `TUTLY2026`.

Las preguntas, perfiles y respuestas se guardan en el almacenamiento local del navegador y se sincronizan entre pestañas del mismo navegador. Esta versión no usa un backend ni una base de datos compartida entre dispositivos. La grabación de notas de voz requiere permiso de micrófono y un navegador compatible.

# Misión Software

Experiencias breves, lúdicas y pensadas para celular para acercar conceptos de la carrera de Software a estudiantes de secundaria durante jornadas de puertas abiertas universitarias.

El plan de producto, prioridades y criterios de desarrollo están en [MANIFIESTO.md](MANIFIESTO.md).

## Estado

Fase 2 en desarrollo. Ya existe un esqueleto navegable con portada, rutas para los tres desafíos e insignias guardadas en el dispositivo. **Programá un robot** cuenta con cinco niveles jugables de dificultad creciente (la insignia se gana en el tercero); los otros dos desafíos conservan finales simulados mientras se construyen sus mecánicas. La entrega es una web estática desplegable en Vercel, sin cuentas, backend ni datos personales.

## Primeros desafíos

1. **Programá un robot** — algoritmos, secuencias y bucles.
2. **Salvá una página web** — navegador, solicitudes de recursos y rendimiento.
3. **Protegé una cuenta** — phishing, contraseñas y segundo factor.

## Desarrollo local

Al ser HTML, CSS y JavaScript sin dependencias, se podrá abrir `index.html` directamente durante el prototipado. Para el despliegue, Vercel podrá servir el repositorio como sitio estático.

## GitHub Pages

El sitio también se publica automáticamente en GitHub Pages cuando hay un push a `main`. La primera vez, en el repositorio de GitHub hay que ir a **Settings > Pages** y seleccionar **GitHub Actions** como fuente de despliegue. Después de cada publicación, la URL queda visible en el resumen del workflow **Deploy to GitHub Pages**, dentro de la pestaña **Actions**.

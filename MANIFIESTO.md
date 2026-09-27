# Manifiesto de producto — Misión Software

## Propósito

Crear una experiencia web breve y memorable que permita a estudiantes de secundaria descubrir, mediante el juego, que estudiar Software es aprender a resolver problemas, diseñar experiencias y crear tecnología útil.

No buscamos evaluar conocimientos previos ni dar una clase. Buscamos despertar curiosidad y abrir una conversación en el stand.

## Público y contexto

- Estudiantes de secundaria, con niveles muy diversos de familiaridad con programación.
- Uso desde el celular personal, mediante código QR.
- Visita al stand de duración variable, generalmente en un ambiente ruidoso y con conectividad variable: quien se aburre sigue con otro desafío, otro stand u otra actividad; a quien le gusta, se queda jugando.
- Debe poder jugarse de forma individual; acompañantes o docentes pueden mirar sin necesidad de intervenir.

## Promesa de experiencia

En menos de dos minutos, una persona entiende el objetivo, toma decisiones, ve una consecuencia y descubre qué concepto de Software acaba de usar. Ese es el primer cierre de cada desafío, y ahí gana su insignia.

Después, quien quiera puede seguir: cada nivel suma una idea nueva o un poco más de dificultad. El tiempo no es un límite; lo que importa es que irse en cualquier momento se sienta como terminar, no como abandonar.

La interfaz debe ser amable, directa y visual. El texto explica lo indispensable; las acciones enseñan el resto.

## Alcance de la primera versión

Una web estática, responsive y liviana con:

1. Una portada que permite elegir desafío.
2. Tres desafíos independientes para empezar, con lugar para sumar más.
3. Una pantalla final por desafío con explicación corta y conexión con la carrera.
4. Insignias guardadas localmente para quien complete los tres retos.
5. Una pantalla final de “Misión completada” que invite a acercarse al equipo de la carrera.

No incluye registro, ranking público, chat, analytics con datos personales, login ni backend.

## Desafíos iniciales

### 1. Programá un robot

**Idea que comunica:** un programa es una secuencia precisa de instrucciones; los bucles ayudan a resolver repeticiones.

**Mecánica:** armar un programa con avanzar, girar y un bloque **Repetir** (cantidad ajustable y una o varias instrucciones adentro) para llevar un robot hasta su meta. Un límite de espacios obliga a usar el bucle en vez de escribir cada paso.

**Niveles:** secuencia → giros → bucle simple donde la cantidad importa → bucle con un patrón de varias instrucciones → instrucciones antes, dentro y después del bucle. El tablero crece de 4×4 a 6×6.

**Duración objetivo:** primer cierre (insignia, nivel 3) en 60–120 segundos; los niveles siguientes son opcionales.

**Cierre:** “Acabas de crear un algoritmo: una serie de pasos para resolver un problema.”

### 2. Salvá una página web

**Idea que comunica:** una web no aparece de golpe: el navegador solicita y organiza recursos como HTML, CSS, JavaScript, fuentes e imágenes.

**Mecánica:** ordenar la cola de descarga de los recursos (HTML, CSS, imágenes, JavaScript, fuente, video…) para que la página sea útil antes de que se agote la paciencia de quien la visita. Un celular simulado muestra la página armándose recurso por recurso y marca el que más la demoró.

**Niveles:** el HTML va primero → lo pesado y decorativo va al final → priorizar lo que la persona necesita usar (el botón con JavaScript) → optimizar una imagen demasiado pesada → cargar al bajar lo que no se ve, cuidando los datos móviles.

**Duración objetivo:** primer cierre (insignia, nivel 3) en 60–120 segundos; los niveles siguientes son opcionales.

**Cierre:** “Diseñar software también implica decidir qué llega primero y cómo se siente una experiencia.”

### 3. Protegé una cuenta

**Idea que comunica:** la seguridad digital se construye con decisiones cotidianas y pensamiento crítico.

**Mecánica:** un celular simulado con la cuenta de Pixa, una red social ficticia, y alguien que quiere entrar. Cada nivel es una línea de defensa y cada decisión se ve: el atacante avanza o rebota. Se usan marcas y dominios inventados, y nunca se escribe una contraseña real: todo se hace tocando fichas.

**Niveles:** encontrar las pistas de un mensaje sospechoso → armar una contraseña larga sin datos que el atacante ya conoce → activar el segundo factor cuando la contraseña ya se filtró (una pregunta secreta no alcanza) → separar trampas de avisos reales, sin desconfiar de todo → no compartir un código de verificación que te pide una amiga cuya cuenta fue robada.

**Duración objetivo:** primer cierre (insignia, nivel 3) en 60–120 segundos; los niveles siguientes son opcionales.

**Cierre:** “La ciberseguridad protege a las personas, sus datos y los sistemas que usan todos los días.”

## Principios de diseño

- **Celular primero:** acciones grandes, una mano, texto breve y contraste alto.
- **Cero fricción:** sin instalación, cuenta ni permiso especial.
- **Resultado inmediato:** cada decisión debe tener una reacción visible, no sólo una respuesta correcta o incorrecta.
- **No punitivo:** el error es parte del juego; siempre debe poder reintentarse rápido.
- **Profundidad opcional:** primero un cierre rápido y satisfactorio; después, niveles que suben la dificultad de a un paso para quien quiera seguir.
- **Accesible:** tipografía legible, contraste suficiente, contenido navegable por teclado y sin depender sólo del color.
- **Liviano:** primera carga ideal menor a 2 MB; sin videos pesados ni fuentes remotas imprescindibles.
- **Compartible:** cada final debe ser claro en una captura de pantalla, pero sin exigir compartirla.

## Arquitectura propuesta

Usar HTML, CSS y JavaScript nativos. El sitio debe funcionar sin un framework y poder desplegarse como sitio estático en Vercel.

```text
/
├── index.html                 # selector de desafíos
├── desafio/
│   ├── robot/index.html
│   ├── web/index.html
│   └── seguridad/index.html
├── css/
│   ├── base.css
│   └── challenges.css
├── js/
│   ├── shared.js              # navegación, insignias, utilidades
│   └── challenges/
│       ├── robot.js
│       ├── web.js
│       └── seguridad.js
└── assets/
    ├── icons/
    └── sounds/
```

Las insignias y el progreso se guardan únicamente con `localStorage` en el dispositivo. No se debe incluir ningún dato identificable.

## Roadmap

### Fase 0 — Identidad y contenido

- Definir nombre visible, paleta y recursos de marca autorizados por cada institución anfitriona.
- Validar los textos de cierre y llamada a la acción con docentes de la carrera.
- Decidir QR general y códigos QR individuales por desafío.

**Listo cuando:** existe una guía visual mínima y textos definitivos de una pantalla por desafío.

### Fase 1 — Esqueleto navegable

- Crear portada, navegación y rutas de los tres desafíos.
- Implementar sistema local de insignias.
- Aplicar diseño responsive base y estados de carga/error/reinicio.

**Listo cuando:** desde un teléfono se puede entrar, elegir un desafío, terminarlo de forma simulada y volver al selector.

### Fase 2 — Juego del robot

- Construir grilla, comandos y animación de ejecución.
- Diseñar niveles con dificultad creciente: la insignia se gana al usar el primer bucle y los niveles siguientes profundizan.
- Implementar un bloque Repetir real: cantidad ajustable y cuerpo de una o varias instrucciones.
- Probar que se entienda sin instrucciones largas.

**Listo cuando:** al menos cinco personas llegan a la insignia sin ayuda externa en menos de dos minutos, y quienes siguen pueden avanzar por los niveles restantes sin trabarse en la interfaz.

### Fase 3 — Dispatcher de recursos web

- Representar solicitudes de recursos y una vista previa de una página.
- Crear decisiones claras de prioridad y retroalimentación visual.
- Evitar una simulación técnicamente compleja: importa la intuición, no reproducir un navegador real.

**Listo cuando:** el visitante comprende que una web se compone de recursos con distintos roles y prioridades.

### Fase 4 — Ciberseguridad

- Crear tres decisiones cortas basadas en escenarios reconocibles.
- Revisar los mensajes para que sean correctos, prácticos y no alarmistas.
- Incorporar reinicio rápido y explicación final.

**Listo cuando:** cada escenario transmite una práctica concreta de cuidado digital.

### Fase 5 — Prueba de stand y despliegue

- Probar en teléfonos Android e iPhone, con 4G y Wi-Fi.
- Observar a estudiantes reales sin darles instrucciones y registrar dónde dudan.
- Corregir texto, tamaño de controles y tiempos.
- Conectar el repositorio a Vercel y generar los QR.

**Listo cuando:** los desafíos cargan bien en celular, el primer cierre de cada uno llega en menos de dos minutos y el equipo del stand sabe cómo orientar a quien termina.

## Criterios de aceptación globales

- Compatible con navegadores móviles actuales.
- Cada desafío llega a su primer cierre (insignia) en menos de dos minutos; los niveles posteriores son opcionales y se puede salir en cualquier momento.
- No bloquea el flujo ante una respuesta incorrecta.
- El botón de reinicio y el regreso a la portada están siempre disponibles.
- No requiere conexión después de la primera carga, en la medida en que el navegador conserve los recursos en caché.
- Explica un concepto de la carrera en una frase clara al finalizar.
- No recolecta datos personales.

## Medición opcional

Antes de añadir métricas, confirmar la política institucional. Si se habilitan, medir solamente eventos anónimos y agregados: desafío iniciado, desafío completado, reinicio y tiempo aproximado. Nunca almacenar nombre, teléfono, correo, ubicación ni identificadores publicitarios.

## Preguntas pendientes

- ¿Se usarán logos oficiales y cuál es la guía de marca vigente?
- ¿Cuál será la URL final y quién administra el proyecto de Vercel?
- ¿Se busca mostrar una carrera específica o la oferta de Software en sentido amplio?
- ¿Habrá conectividad confiable en el stand o conviene prever un plan offline?
- ¿Qué mensaje o enlace debe aparecer al final para ampliar información sobre inscripción?

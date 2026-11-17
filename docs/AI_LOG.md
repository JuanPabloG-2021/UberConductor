# Bitácora de uso de inteligencia artificial

Esta bitácora registra las interacciones recientes recuperables del historial local del proyecto. Las entradas anteriores al 17 de noviembre de 2026 se reconstruyeron retrospectivamente; en adelante, registra cada uso en el momento. Completa el enlace a la conversación si está disponible y el hash después de crear el commit. El repositorio local no tenía metadatos Git al crear estas entradas.

## Entradas

### Entrada #1
- Fecha: 2026-11-16
- Integrante: Juan Pablo Garcia Angel
- Herramienta: Copilot (SDK en VS Code)
- Objetivo: Definir el flujo de integración de Mercado Pago Checkout Pro para el entorno de prueba.
- Prompt:

```text
Ahora que tenemos el flujo de el viaje con envio de solicitud en tiempo real, ruta de recogida y ruta de destino, vamos a configurar el entorno de pago, el cual integra mercado pago o pago en efectivo, ya tengo la cuenta de mercado pago y cree la aplicacion API de preferences con nombre UberClone, cuales deberian ser los pasos siguientes para integrar el proyecto con las claves y cuentas de prueba de mercadopago checkout pro?
```

- Resumen de la respuesta: Se recomendó mantener el Access Token en el backend y crear las preferencias mediante una Edge Function. También se explicó la confirmación por webhook, el retorno por deep link, la idempotencia y las pruebas con cuentas sandbox.
- Qué se usó / modificó / descartó: Se usó como guía para el diseño del flujo posterior. En esta interacción no se modificaron archivos; no se desplegó ni se conectó ninguna credencial.
- Archivos y commit: Sin archivos modificados en esta interacción — sin commit.
- Verificación: Revisión de documentación de Mercado Pago y Supabase; no se ejecutó código.
- Enlace a la conversación: No disponible en el historial exportado.
- Aprendizaje: Pendiente de completar por el integrante.

### Entrada #2
- Fecha: 2026-11-16
- Integrante: Juan Pablo Garcia Angel
- Herramienta: Copilot (SDK en VS Code)
- Objetivo: Crear la función de checkout y la migración de soporte.
- Prompt:

```text
implementa la migration para supabase para llevar a cabo el punto 3 (crear la edge function)
```

- Resumen de la respuesta: Se añadió una Edge Function que autentica al usuario, valida la propiedad y estado del viaje, y crea una preferencia de Checkout Pro. La migración guarda una preferencia por viaje con RLS habilitado y acceso limitado a `service_role`.
- Qué se usó / modificó / descartó: Se usaron la función, la migración y la configuración JWT. No se aplicó la migración ni se desplegó la función o los secretos en el proyecto remoto.
- Archivos y commit: `supabase/functions/create-checkout-preference/index.ts`, `supabase/migrations/20261117032323_mercado_pago_checkout_sessions.sql`, `supabase/config.toml`, `eslint.config.js` — commit pendiente; no había repositorio Git local.
- Verificación: Se reportaron verificaciones sintácticas y comprobaciones básicas de la migración. No se pudo ejecutar Supabase local porque Docker no estaba disponible.
- Enlace a la conversación: No disponible en el historial exportado.
- Aprendizaje: Pendiente de completar por el integrante.

### Entrada #3
- Fecha: 2026-11-16
- Integrante: Juan Pablo Garcia Angel
- Herramienta: Copilot (SDK en VS Code)
- Objetivo: Simular en la app los flujos de pasajero con pago en efectivo y Mercado Pago de prueba.
- Prompt:

```text
con esta migracion, la creacion de los secretos y la funcion y acces token, como se deberia comportar la app en este momento? sebido a que no tengo un front end de pasajero, en el cual pueda validar el pago del viaje, podriamos simunlar en una screen temporal; una pantalla que contenga el boton de crear solicitud, que hace referencia al mock que crea la solicitud de viaje con una tarifa por default de 10 000, y luego de que el conductor seleccione viaje completado que se habilite el pago de mercado pago o la opcion de pago en efectivo, en este caso serian dos mock, uno con la opcion de pago en efectivo, y otro boton de solicitar con tipo de pago mercado pago, y que al terminar el viaje se habilite el boton de pagar con mercado pago, podria ser un boton en la pantalla de conductor que diga cambiar a pasajero, y redirija a una pantalla que sea de pasajero con los dos potones; crear solicitud pago en efectivo o crear solicitud mercado pago, con la condicion de que cuando el conductor termina el viaje se habilite el boton de pagar con mercado pago y probar de esta manera el flujo completo tanto de pago como de recepcion del dinero, obviamente siendo una prueba y no con mis datos realies, unicamente con los datos de prueba de mercadopago

dime que datos e informacion requieres para proceder

tambien antes de proceder dime si hay alguna alternativa mas recomendable, teniendo en cuenta que solo es una aplicacion de prueba sin animo de desplegar en producccion
```

- Resumen de la respuesta: Se implementó un modo de pasajero temporal con solicitudes de $10.000 COP, opciones de efectivo y Mercado Pago, checkout externo y consulta del estado. Se agregó el retorno por deep link y el webhook valida el pago en servidor; el modo de prueba puede notificar a conductores, por lo que se indicó usarlo solo con datos de prueba.
- Qué se usó / modificó / descartó: Se usó la pantalla temporal y la integración de checkout/webhook; el pago no se considera aprobado al volver del navegador. `app.json` también fue asistido, pero JSON no admite comentarios válidos, así que se documenta aquí en lugar de insertar sintaxis inválida. Se descartó desplegar funciones, aplicar migraciones o configurar secretos desde el chat.
- Archivos y commit: `app.json`, `src/screens/DriverHome.js`, `src/screens/IncomingRequest.js`, `src/screens/PassengerTestMode.js`, `src/screens/TripSummary.js`, `src/services/driverRuntime.js`, `src/services/mercadoPago.js`, `supabase/functions/mercado-pago-webhook/index.ts`, `supabase/migrations/20261117035129_mercado_pago_payment_events.sql` — commit pendiente; no había repositorio Git local.
- Verificación: Se reportó bundle Android, configuración Expo y ESLint aprobados. `npx tsc --noEmit` no validó las Edge Functions por falta de tipos Deno/resolución de imports `npm:`; `npm run lint` falló al detectar la versión de Expo CLI. No se aplicaron migraciones ni se desplegaron funciones o secretos.
- Enlace a la conversación: No disponible en el historial exportado.
- Aprendizaje: Pendiente de completar por el integrante.

### Entrada #4
- Fecha: 2026-11-16
- Integrante: Juan Pablo Garcia Angel
- Herramienta: Copilot (SDK en VS Code)
- Objetivo: Aclarar por qué la función webhook no aparecía en Supabase y cómo desplegarla.
- Prompt:

```text
no veo el webohook creado en supabase mercado-pago-webhook
```

- Resumen de la respuesta: Se aclaró que la función estaba creada localmente, pero no desplegada en Supabase. Se dieron los comandos para desplegar el webhook y la función de checkout, y se indicó configurar los secretos antes de probar.
- Qué se usó / modificó / descartó: Se usó la explicación y la guía de despliegue. No se ejecutó ningún despliegue remoto ni se manipularon secretos.
- Archivos y commit: Sin archivos modificados en esta interacción — sin commit.
- Verificación: Confirmación del estado local de los archivos; no se verificó el Dashboard remoto.
- Enlace a la conversación: No disponible en el historial exportado.
- Aprendizaje: Pendiente de completar por el integrante.

### Entrada #5
- Fecha: 2026-11-16
- Integrante: Juan Pablo Garcia Angel
- Herramienta: Copilot (SDK en VS Code)
- Objetivo: Elegir los eventos de Mercado Pago que debe enviar el webhook durante las pruebas.
- Prompt:

```text
para crear el webhook con la url de la funcion de webhook de supabase, que eventos para integraciones con checkout pro, debo de marcar para que se pueda probar el dflujo sin problemas
Eventos recomendados para integraciones con Checkout Pro

Vinculación de aplicaciones

Alertas de fraude

Reclamos

Contracargos

Órdenes comerciales

Envíos (Mercado Pago)

Pagos

Otros eventos

Order (Mercado Pago)

Planes y suscripciones

Integraciones Point

Delivery (proximity marketplace)

Wallet Connect

Card Updater

Self Service

Split - Autorización

Perfil de pago
```

- Resumen de la respuesta: Se recomendó marcar únicamente “Pagos”, porque el webhook procesa eventos de pago y consulta el pago en el servidor. También se explicó la URL de la Edge Function y el secreto de firma requerido.
- Qué se usó / modificó / descartó: Se usó la recomendación de configuración. No se cambió la configuración del Dashboard ni se desplegó la función.
- Archivos y commit: Sin archivos modificados en esta interacción — sin commit.
- Verificación: Revisión del código local del webhook; configuración remota no verificada.
- Enlace a la conversación: No disponible en el historial exportado.
- Aprendizaje: Pendiente de completar por el integrante.

### Entrada #6
- Fecha: 2026-11-17
- Integrante: Juan Pablo Garcia Angel
- Herramienta: Copilot (SDK en VS Code)
- Objetivo: Diagnosticar y recuperar los archivos faltantes después de mover el proyecto.
- Prompt:

```text
haz un diagnostico de los archivos eliminados y crealos nuevamente hasta la utima version que se tuvo en el ultimo chat activo, ya que hubo un arror al mover los archivos de ruta
```

- Resumen de la respuesta: Se comparó el árbol del proyecto con una copia hermana y la configuración Expo generada por la última compilación. Se recuperaron los manifiestos, archivos raíz y recursos, y se reconstruyó `app.json` con el scheme y plugins vigentes.
- Qué se usó / modificó / descartó: Se usó la copia coincidente en `C:\Uc` para restaurar archivos faltantes y se reprodujo la configuración compilada en `app.json`. No se reemplazó el código del flujo de pago que ya estaba presente; no se creó un repositorio Git.
- Archivos y commit: `README.md` aún no existía en ese momento; archivos recuperados: `.env.local`, `.env.stagging.local`, `.gitignore`, `AGENTS.md`, `app.config.js`, `App.js`, `app.json`, `eslint.config.js`, `google-services.json`, `GoogleService-Info.plist`, `index.js`, `LICENSE`, `package-lock.json`, `package.json`, `skills-lock.json`, `tsconfig.json` y `assets/` — commit pendiente; no había repositorio Git local.
- Verificación: `npx expo config --type public --json`, ESLint sobre archivos del flujo y exportación Android pasaron. `npx expo install --check` señaló versiones de Expo, expo-status-bar y react-native-safe-area-context atrasadas; no se actualizaron.
- Enlace a la conversación: No disponible en el historial exportado.
- Aprendizaje: Pendiente de completar por el integrante.

### Entrada #7
- Fecha: 2026-11-17
- Integrante: Juan Pablo Garcia Angel
- Herramienta: Copilot (SDK en VS Code)
- Objetivo: Crear la bitácora de IA, enlazarla desde README y marcar los bloques de código asistidos.
- Prompt:

```text
implementa esto para generar una bitacora de IA
Instructivo de la bitácora de IA
Cada equipo debe documentar todo uso de herramientas de inteligencia artificial (Claude, ChatGPT, 
Copilot, Gemini u otras) en una bitácora que se entrega con el proyecto. Usar IA está permitido; no 
declararlo se considera falta de honestidad académica. Si el equipo no usó IA, la bitácora igual se 
entrega con esa declaración.
Dónde se incluye:
• Archivo docs/AI_LOG.md en el repositorio, dentro de la rama main.
• Cada integrante registra sus entradas en su propia rama y las sube a main mediante Pull 
Request, igual que el código.
• El README.md tiene una sección Uso de IA con el enlace a la bitácora.
• En la entrega de la plataforma se adjunta la bitácora exportada a PDF.
Cómo generarla:
1. Registrar la entrada en el momento de usar la herramienta, no al final del proyecto.
2. Copiar el prompt tal como se escribió, sin resumirlo.
3. Resumir la respuesta en 2 o 3 líneas y, si la herramienta lo permite, pegar el enlace a la 
conversación.
4. Indicar qué se usó tal cual, qué se modificó y qué se descartó.
5. Anotar los archivos afectados y el hash del commit donde quedó el cambio.
6. Describir cómo se verificó que funcionaba (prueba en emulador, caso de prueba, revisión de 
documentación).
7. Marcar en el código los bloques asistidos con un comentario en inglés que remita a la entrada: 
// AI-assisted: see docs/AI_LOG.md #7.
Plantilla de cada entrada:
### Entrada #7
- Fecha: 2026-10-20
- Integrante: Nombre Apellido
- Herramienta: Claude
- Objetivo: Crear la función calculateFare con comisión configurable
- Prompt: "..." (texto completo)
- Resumen de la respuesta: ...
- Qué se usó / modificó / descartó: ...
- Archivos y commit: src/utils/calculateFare.js — a1b2c3d
- Verificación: Probado con el ejemplo de 8,5 km y 22 min (sección 5)
- Aprendizaje: Qué entendí y qué haría distinto
```

- Resumen de la respuesta: Se creó esta bitácora con las interacciones recientes recuperables y se añadió el enlace desde README. Se añadieron referencias inglesas en los bloques de código asistidos en las entradas #2 y #3.
- Qué se usó / modificó / descartó: Se usó el historial local para reconstruir prompts y resultados; se anotaron explícitamente los campos que el equipo debe completar. No se inventaron nombres, enlaces de conversación ni hashes de commit.
- Archivos y commit: `README.md`, `docs/AI_LOG.md`, `eslint.config.js`, `src/screens/DriverHome.js`, `src/screens/IncomingRequest.js`, `src/screens/PassengerTestMode.js`, `src/screens/TripSummary.js`, `src/services/driverRuntime.js`, `src/services/mercadoPago.js`, `supabase/config.toml`, `supabase/functions/create-checkout-preference/index.ts`, `supabase/functions/mercado-pago-webhook/index.ts`, `supabase/migrations/20261117032323_mercado_pago_checkout_sessions.sql`, `supabase/migrations/20261117035129_mercado_pago_payment_events.sql` — commit pendiente; `C:\U` no tiene repositorio Git.
- Verificación: Revisión de las referencias entre README y bitácora, revisión de los marcadores de código y ESLint sobre los archivos JavaScript afectados.
- Enlace a la conversación: No disponible en el historial exportado.
- Aprendizaje: Pendiente de completar por el integrante.

## Plantilla para nuevas entradas

Duplica esta plantilla por cada interacción; conserva el prompt original completo.

```text
### Entrada #N
- Fecha: AAAA-MM-DD
- Integrante: Nombre Apellido
- Herramienta: Nombre y versión, si está disponible
- Objetivo: ...
- Prompt:
  [prompt íntegro]
- Resumen de la respuesta: [2 o 3 líneas]
- Qué se usó / modificó / descartó: ...
- Archivos y commit: ruta — hash, o “sin archivos” / “commit pendiente”
- Verificación: ...
- Enlace a la conversación: ...
- Aprendizaje: ...
```

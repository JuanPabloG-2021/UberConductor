# UberConductor

Aplicación móvil para conductores, desarrollada con Expo y React Native. Utiliza Supabase para autenticación y datos, y ofrece funciones de ubicación, solicitudes de viaje y pagos de prueba.

## Requisitos

- Node.js y npm.
- Un proyecto Supabase configurado para la aplicación.
- Android Studio y un emulador o dispositivo Android para probar en Android. Para iOS se requiere macOS y Xcode.

## Instalación

1. Clona el repositorio y entra a su carpeta:

   ```sh
   git clone https://github.com/JuanPabloG-2021/UberConductor.git
   cd UberConductor
   ```

2. Instala las dependencias desde el lockfile:

   ```sh
   npm ci
   ```

3. Crea el archivo local de variables de entorno a partir de la plantilla:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   En macOS o Linux, puedes usar `cp .env.example .env.local`.

4. Completa las variables de `.env.local` con los datos de tu proyecto (consulta [Variables de entorno](#variables-de-entorno)).

5. Inicia Expo:

   ```sh
   npm start
   ```

   Sigue las instrucciones de Expo para abrir la app en un dispositivo o emulador. También puedes usar `npm run android`, `npm run ios` o `npm run web` para iniciar Expo apuntando a esa plataforma. Las funciones nativas de notificaciones push y ubicación en segundo plano requieren una compilación de desarrollo compatible; no están disponibles en Expo Go. Consulta [supabase/DRIVER-APP-SETUP.md](supabase/DRIVER-APP-SETUP.md) para la configuración de servicios y backend.

## Variables de entorno

Duplica `.env.example` como `.env.local` y reemplaza los valores de ejemplo:

| Variable | Requerida | Descripción |
| --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Sí | URL del proyecto Supabase. |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Sí | Clave publishable (o `anon` heredada) del proyecto Supabase. Se incluye en la app cliente. |
| `GOOGLE_MAPS_ANDROID_API_KEY` | No | Clave de Google Maps restringida para el identificador de Android de esta app. |
| `GOOGLE_MAPS_IOS_API_KEY` | No | Clave de Google Maps restringida para el Bundle ID de iOS de esta app. |

Las variables con prefijo `EXPO_PUBLIC_` y las claves de Maps se incorporan a la aplicación cliente; usa claves publishable y restringe las claves de Maps por plataforma y API. **Nunca** incluyas `service_role`, tokens privados ni secretos de pagos en `.env.local` ni en variables `EXPO_PUBLIC_`.

La clave `GOOGLE_MAPS_DIRECTIONS_API_KEY`, las credenciales de Firebase y las variables de Mercado Pago son configuración del servidor/Edge Functions de Supabase, no variables de la app móvil. Consulta [supabase/DRIVER-APP-SETUP.md](supabase/DRIVER-APP-SETUP.md) y configura esos secretos únicamente en Supabase.

Los archivos `google-services.json` y `GoogleService-Info.plist` se usan para la configuración nativa de Firebase. Para habilitar notificaciones push, configura las aplicaciones Firebase correspondientes y sigue la guía de configuración enlazada arriba.

## Uso de IA

El equipo registra el uso de herramientas de inteligencia artificial en [docs/AI_LOG.md](docs/AI_LOG.md). Cada integrante debe añadir sus entradas desde su propia rama y subirlas a `main` mediante Pull Request. Registra cada uso en el momento, conserva el prompt completo e indica el resumen, qué se aprovechó o descartó, los archivos y commit afectados, la verificación y el aprendizaje. Cuando corresponda, marca el código asistido con un comentario que enlace a la entrada de la bitácora.

Para la entrega, exporta la bitácora a PDF y adjúntala en la plataforma.

# Configuración de las pantallas del conductor

## Base de datos

Ejecuta `migrations/20261112000000_driver_trip_runtime.sql` en el mismo proyecto Supabase donde ya están aplicadas las migraciones de registro y aprobación. La migración crea viajes, ubicación, tokens FCM, políticas y RPCs; también agrega `trips` a `supabase_realtime` cuando la publicación existe.

El productor de viajes (por ejemplo, la app del pasajero) debe llamar `request_trip` con origen/destino, distancia, duración, categoría, método de pago, tarifa estimada, comisión estimada, ganancia neta estimada y `commission_rate` entre `0` y `1`. La comisión no tiene una tasa predeterminada en esta app. Al finalizar, la tarifa final usa la tarifa estimada recibida y la comisión se calcula con esa tasa.

Estados de viaje: `requested`, `accepted`, `driver_arriving`, `in_progress`, `completed`, `paid`, `cancelled` y `rejected`. El resumen de pagos electrónicos permanece pendiente hasta que el servicio de pago invoque `driver_update_payment_status` con credenciales `service_role`; esta app no captura pagos con tarjeta ni Mercado Pago.

## Google Maps y ubicación

Agrega a `UberConductor/.env.local` claves restringidas por aplicación:

```env
GOOGLE_MAPS_ANDROID_API_KEY=...
GOOGLE_MAPS_IOS_API_KEY=...
```

Configura el identificador Android y el Bundle ID iOS de la app en Firebase/Google Cloud antes de restringir esas claves. Habilita Maps SDK for Android/iOS. Para rutas, habilita Routes API y configura `GOOGLE_MAPS_DIRECTIONS_API_KEY` como secreto de Supabase; aunque el nombre del secreto conserva `DIRECTIONS` por compatibilidad, la función `get-trip-route` usa Routes API (`computeRoutes`). Restringe esa clave a Routes API, sin restricciones de aplicación Android/iOS, porque la solicitud se realiza desde Supabase y nunca desde el bundle del teléfono.

La disponibilidad solicita permisos de ubicación en primer plano y en segundo plano. Android muestra una notificación persistente de servicio de ubicación mientras está activa; al salir de Inicio se marca el conductor como no disponible, se limpia la suscripción y se detiene la tarea en segundo plano.

## Firebase Cloud Messaging

Coloca los archivos de configuración Firebase localmente en `UberConductor/google-services.json` y `UberConductor/GoogleService-Info.plist`. Están excluidos de Git. En Firebase registra las apps con los mismos identificadores nativos; para iOS configura también APNs. FCM requiere un development build/prebuild nativo y no funciona dentro de Expo Go. Después de agregar los archivos y claves locales, usa `npm run android:dev` o `npm run ios:dev`; para iniciar luego el cliente nativo, usa `npm run start:dev`.

Despliega las funciones con Supabase CLI y configura secretos sin incluirlos en el código:

```text
supabase functions deploy get-trip-route
supabase functions deploy notify-driver-request
supabase secrets set GOOGLE_MAPS_DIRECTIONS_API_KEY=...
supabase secrets set FIREBASE_SERVICE_ACCOUNT='{"project_id":"...","client_email":"...","private_key":"..."}'
supabase secrets set PUSH_WEBHOOK_SECRET=...
```

En Supabase Database Webhooks, crea un webhook para `public.trips` en eventos `INSERT` y `UPDATE`, apuntando a `/functions/v1/notify-driver-request`, con header `Authorization: Bearer <PUSH_WEBHOOK_SECRET>`. La función entrega el aviso a los conductores disponibles, espera el vencimiento de 15 segundos y marca la solicitud como `rejected` si nadie la acepta. Mantén la clave de cuenta de servicio Firebase y `SUPABASE_SERVICE_ROLE_KEY` exclusivamente en el servidor.

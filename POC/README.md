# Off the List POC

Prototipo estatico para validar las preguntas, la captura y las recomendaciones obtenidas manualmente con IA. Interfaz en ingles y presupuestos en USD, como define `refined`.

## Ejecutar localmente

Desde la carpeta `POC`, ejecutar `npm start` y abrir `http://localhost:4173`.

Requiere Node.js 22 o posterior para el servidor local. No requiere instalar dependencias, configurar API keys ni crear cuentas. No abrir `index.html` como archivo: los modulos JavaScript requieren un servidor HTTP.

## Desplegar temporalmente

La carpeta `POC` contiene todos los assets necesarios. No hay proceso de build ni backend de producto.

1. Netlify Drop: subir la carpeta `POC` a `https://app.netlify.com/drop` para obtener una URL temporal.
2. Cloudflare Pages: crear un proyecto con carga directa y subir `POC`.
3. Cualquier alojamiento estatico: publicar el contenido de `POC`, con `index.html` en la raiz publica. Tambien funciona en un subdirectorio porque usa rutas relativas.

Utilizar HTTPS para habilitar el boton de copiar al portapapeles. Si el navegador lo bloquea, el texto se selecciona para copiar manualmente. Se puede descargar como `.txt`.

No se ha publicado automaticamente en ningun proveedor. El atributo `noindex` solicita no indexar, pero no proporciona control de acceso. Los archivos de pruebas y el README se pueden excluir de la carga; no contienen datos de participantes.

## Recorrido

- Landing inspirada en `assets/screen-example.png`, sin viajes misteriosos ni promesas de reservas o entregas ficticias.
- Entradas de inspiracion y viaje concreto.
- Diez escenas, orden aleatorio conservado por sesion, hasta tres intereses contando el personalizado, prioridad opcional.
- Autonomia, comodidad, un seguimiento gastronomico condicional y recuerdo opcional sin interpretacion automatica.
- Motivaciones, ritmo, historial y alcance de repeticion.
- Origen de texto libre, duracion en horas/dias/semanas/meses, fechas con horas o meses, trayecto, transporte, grupo y presupuesto con alcance y componentes.
- Necesidades condicionales con alcance, limite firme/preferencia flexible/verificacion y marcado explicito de necesidades esenciales.
- Revision editable de preferencias, contexto, condiciones y desconocidos; categoria secundaria solo con respaldo y rechazo opcional.
- Confirmacion versionada y prompt final completo para copiar o descargar; exportacion JSON privada de respuestas y orden mostrado.

## Alcance y privacidad

No llama a IA, no investiga ni muestra destinos simulados. El prompt pide hasta tres propuestas, investigacion acotada, fuentes reales cuando el modelo tiene herramientas, respeto a condiciones y pendientes explicitos. Sin herramientas, pide ideas inspiracionales no verificadas. La categoria narrativa no entra al prompt ni decide destinos.

Las respuestas se guardan exclusivamente en `localStorage` de este navegador. Caducan 7 dias despues de la ultima actualizacion y se eliminan al siguiente acceso tras caducar. Se pueden eliminar con el boton del pie de pagina. Borrar datos del navegador o finalizar una sesion privada puede perderlas. No hay sincronizacion entre dispositivos, telemetria, email ni cuenta. El proveedor de hosting puede conservar sus propios logs de acceso, no las respuestas del formulario.

Al elegir "Not decided yet" se eliminan los detalles del bloque correspondiente para que no lleguen al prompt como condiciones ocultas. Cualquier cambio de respuestas invalida la confirmacion y requiere revisar de nuevo. No se recogen numeros ni archivos de documentos. El texto libre debe contener efectos practicos, no nombres ni diagnosticos. El usuario debe revisar el prompt antes de compartirlo; la politica del servicio de IA elegido aplica a esa consulta.

Simplificaciones conscientes del POC: origen sin autocompletado o geocodificacion, historial como texto, recuerdo sin extraccion de preferencias, sin investigacion integrada ni feedback de destinos. No se infieren las categorias The Pioneer o The Quiet Seeker porque el recorrido minimo no captura la evidencia habitual independiente que requieren. No hay porcentajes de afinidad ni categoria por defecto.

## Verificacion

`npm test` ejecuta pruebas del modelo, categorias y prompt con el runner de Node.js.

`browser.test.js` verifica ambos recorridos en Chromium, escritorio y movil, assets, validaciones, persistencia, ediciones, copia, descargas y eliminacion. Para ejecutarlo, disponer de Playwright y establecer `PLAYWRIGHT_MODULE` a la ruta absoluta de su `index.mjs`:

```sh
PLAYWRIGHT_MODULE=/ruta/a/node_modules/playwright/index.mjs node browser.test.js
```

El script inicia y detiene su propio servidor en el puerto 4174. Si Chromium no esta instalado, intenta instalar solo ese navegador mediante `npm exec`. Las capturas de pruebas se guardan en la carpeta temporal configurada en el script, no junto a respuestas de participantes.

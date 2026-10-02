# Off the List: captura de preferencias y experiencia de usuario

Estado: especificacion acordada para un piloto. Los parametros identificados como hipotesis se deben validar antes de tratarlos como definitivos.

Este documento define la captura y la presentacion. El modelo del viajero se describe en [traveler-profiles.md](traveler-profiles.md) y el motor de decision en [profile-and-recommendation-logic.md](profile-and-recommendation-logic.md).

## 1. Objetivo y alcance

Ofrecer destinos que la persona disfrutaria y que posiblemente no habria descubierto o considerado por su cuenta, con menos esfuerzo que el cuestionario original de 30 preguntas.

- Publico global. Interfaz inicial en ingles, presupuestos y estimaciones mostrados en USD. Internacionalizacion futura, no necesaria para el piloto.
- Sin exclusiones de producto por distancia, duracion o estilo: escapadas cercanas, viajes domesticos, internacionales, largos y remotos.
- Descubrimiento como criterio editorial, no como obligacion de aventura, incomodidad o rechazo de lugares populares.
- Una persona responde sobre sus preferencias y comunica condiciones o preferencias del grupo para ese viaje. No se crean perfiles individuales de acompanantes ni se combinan perfiles en esta version.
- Los destinos son visibles. No se disena alrededor del viaje sorpresa ni se necesita reservar para evaluar la recomendacion.
- No se promete una cotizacion, disponibilidad, permiso de entrada ni satisfaccion con un viaje realizado.

## 2. Principios de captura

1. Preguntar lo que puede cambiar una recomendacion, no acumular informacion personal sin finalidad.
2. Reconocer opciones suele requerir menos esfuerzo que recordar y redactar. Las escenas ayudan, pero no sustituyen preguntas directas sobre condiciones esenciales.
3. Una seleccion no prueba todos los atributos de la escena. No inferir personalidad, capacidad fisica o tolerancia al riesgo de una fotografia.
4. No seleccionado significa desconocido o no prioritario, no rechazo.
5. Separar preferencias habituales de lo que se busca ahora.
6. Permitir omitir informacion desconocida sin convertir la omision en ausencia de restricciones.
7. Confirmar y editar la interpretacion antes de investigar destinos.
8. Mantener el recorrido predecible. No permitir entrevistas ilimitadas generadas por IA.

Hipotesis de usabilidad: alcanzar la confirmacion del perfil en aproximadamente 3-5 minutos de tiempo activo para recorridos simples. No es una promesa ni incluye investigacion, esperas o todos los casos con necesidades especificas.

## 3. Dos entradas, una base reutilizable

Texto de entrada:

> Your next discovery starts with you.
> Tell us what you enjoy. We'll explore places that fit you, including ones you may not have considered.

Acciones:

- `I want inspiration`
- `I have a trip in mind`

### Inspiracion

Construir preferencias y permitir contexto opcional. Ofrecer `Not decided yet` para duracion, fechas, presupuesto y origen. Si el usuario aporta una condicion, respetarla con el mismo rigor que en viaje concreto.

Sin contexto definido, las tres propuestas pueden representar diferentes distancias, duraciones y formas de viajar. Las duraciones sugeridas son propuestas, no disponibilidad asumida. Sin origen no se afirma que un lugar sea cercano ni se calcula su accesibilidad desde la persona.

Si faltan datos esenciales, el resultado se identifica como inspiracional y enumera las comprobaciones pendientes.

### Viaje concreto

Solicitar origen, tiempo disponible, fechas o ventana, participantes, presupuesto y necesidades relevantes. Admitir datos desconocidos: una busqueda parcialmente definida sigue siendo posible, pero no puede presentarse como completamente comprobada.

No exigir una fecha exacta si existe una ventana util. Si no existe ningun periodo, explicar que clima, precios y disponibilidad siguen pendientes.

### Continuidad

Desde una propuesta inspiracional:

> Make this a trip: add your dates, starting point and practical needs.

Reutilizar las preferencias confirmadas. No pedir repetir escenas ni recuerdos. Editar el contexto no cambia automaticamente el perfil habitual.

## 4. Secuencia de captura

Estos son momentos funcionales, no nueve pantallas obligatorias. Se pueden agrupar elementos relacionados sin mostrar bloques abrumadores.

| Momento | Contenido | Caracter |
| --- | --- | --- |
| Entrada | Inspiracion o viaje concreto | Necesario |
| Intereses | Escenas, seleccion y prioridad | Breve; admite desconocimiento |
| Forma de explorar | Autonomia y comodidad habituales | Admite omision |
| Matiz | Un seguimiento sobre intereses si cambia la decision | Condicional; maximo uno |
| Recuerdo | Una frase sobre algo disfrutado o que evitar | Opcional |
| Contexto | Motivacion, ritmo y condiciones del viaje | Segun entrada y datos disponibles |
| Necesidades | Limites y condiciones personales o del grupo | Detalles condicionales |
| Confirmacion | Resumen editable y categoria narrativa | Antes de buscar |
| Investigacion y resultado | Progreso, entrega unica, feedback | Sin resultados provisionales |

Permitir volver y corregir sin perder respuestas. Mostrar etapas comprensibles, no un porcentaje de completitud que cambie de forma impredecible al abrir ramificaciones.

## 5. Escenas de intereses habituales

Pregunta:

> What do you usually enjoy when you travel?
> Choose up to three experiences that matter most to you. You can add something we've missed.

| Titulo | Descripcion propuesta en ingles |
| --- | --- |
| Taste a Place | Discover regional ingredients, dishes and the stories behind them. |
| Understand Its Stories | Explore history, heritage and the ways people live. |
| Find Your Urban Rhythm | Discover neighbourhoods, architecture and everyday city life. |
| Be Close to Nature | Spend time with landscapes, ecosystems and wildlife in their natural setting. |
| Spend Time by the Water | Enjoy coasts, lakes or rivers in a way that suits you. |
| Take On a Challenge | Try a demanding experience or learn a skill that stretches you. |
| Make a Human Connection | Share conversations, encounters or activities with other people. |
| Create and Discover | Explore art, crafts and creative experiences. |
| Enjoy the Energy | Experience music, performances, celebrations and entertainment. |
| Enjoy Your Surroundings | Enjoy your accommodation, its spaces and small pleasures without needing a full agenda. |

Alternativas: `Add another interest`, `I'm not sure yet`, `Skip for now`. No exigir completar tres selecciones.

Si hay mas de una seleccion:

> Which of these most influences your choice of where to go?

Permitir `They matter equally` y omitir. Con una seleccion no inferir intensidad alta: registrar que es el unico interes declarado, no una prioridad comparativa confirmada.

### Imagenes

- Una imagen y descripcion por escena, con calidad y atractivo visual comparables.
- Evitar destinos reconocibles que conviertan la captura en una votacion de lugares.
- No incluir condiciones innecesarias de esfuerzo, lujo, compania o aislamiento en escenas generales.
- Texto visible y alternativas accesibles; controles utilizables con teclado y lector de pantalla. Ninguna respuesta depende solo de color o gestos.
- En movil, imagenes optimizadas y selecciones conservadas al navegar. No depender de arrastrar o deslizar.
- Registrar el orden mostrado. Variarlo entre participantes del piloto para observar efectos de posicion.

Hasta tres selecciones y diez escenas son hipotesis de diseno aprobadas para probar, no una cobertura universal demostrada.

## 6. Autonomia, comodidad y matiz

### Autonomia habitual

> How do you usually like to explore a place?

- With a clear plan and arrangements taken care of.
- With a few things arranged and room to improvise.
- Mostly freely, deciding as I go.
- It depends on the experience.

Seleccion unica, con opcion de omitir. No inferir tolerancia al riesgo. Actividades guiadas pueden coexistir con autonomia.

### Comodidad habitual

> Which statement best describes you when you travel?

- Comfort and convenience are an important part of my enjoyment.
- I enjoy simple places, provided my essential needs are met.
- I can accept some discomfort for an experience that matters to me.
- It depends; I'd rather specify what I need.

Seleccion unica, con opcion de omitir. No inferir presupuesto, lujo, accesibilidad ni consentimiento a condiciones precarias. Necesidades esenciales se registran por separado.

### Un seguimiento condicional

Ejemplo para gastronomia:

> What appeals to you most?

`Tasting` / `Cooking or learning` / `Meeting people through food` / `A mix`

Maximo uno antes de los primeros resultados, elegido porque puede distinguir destinos o experiencias. Si no cambia una decision, omitirlo. No abrir uno por cada escena.

Este maximo no incluye aclaraciones practicas necesarias para respetar restricciones. Explicar su finalidad y agruparlas cuando sea posible.

## 7. Recuerdo opcional

> Think of a trip or getaway you enjoyed. What moment would you like to experience again?
> If you prefer, tell us something you wouldn't want to repeat. One sentence is enough.

Acciones: `Add a memory` / `Skip`. El texto no bloquea el avance y no exige haber viajado anteriormente.

No pedir datos intimos ni diagnosticos. Extraer propuestas de preferencias con su fragmento de evidencia; mostrarlas como interpretaciones editables. Una experiencia negativa no autoriza diagnosticos psicologicos ni exclusiones de paises o culturas completas.

Texto en el piloto; voz opcional como evolucion, no requisito actual.

## 8. Motivacion y ritmo de este viaje

### Motivacion

> What would you like this trip to give you?
> Choose up to two, then highlight what matters most.

- Rest and a slower pace.
- Quality time with the people I'm travelling with.
- New places or experiences.
- Learning and understanding a place.
- Flavours, activities and small pleasures.
- A challenge.
- Space for myself.
- A special celebration.
- I'm not sure yet.

La ultima opcion no se combina con elecciones concretas. La prioridad es opcional si ambas importan igual. Permitir una nota para un proposito no representado; no limitar estilos o duraciones por esta lista.

### Ritmo actual

> How would you like to spend your days on this trip?

- Plenty of free time, with an occasional experience.
- One main activity a day, without filling the schedule.
- Active days with several things to discover.
- A mix of relaxed and busy days.
- I'm not sure yet.

Carga de agenda no equivale a esfuerzo fisico. Estas respuestas no asignan directamente categorias.

## 9. Condiciones practicas

### Origen

> Where would this trip start?

Ciudad y pais con seleccion asistida; aeropuertos o puntos de salida alternativos opcionales. Sin direccion particular. Si existe informacion previa, pedir confirmacion, no asumir que sigue vigente.

### Tiempo disponible

> How much time do you have for this trip, including travel?
> Count the full time from leaving your starting point until you need to be back, including travel in both directions.

`Exact duration` / `A range` / `Not decided yet`

Entrada de dias, semanas o meses sin tramos cerrados. Para viajes muy cortos, permitir horas o fechas y horas de salida/regreso. Las fechas concretas permiten calcular la ventana sin volver a pedir el mismo dato.

Un rango no autoriza asumir siempre su extremo superior. Cada resultado debe declarar cuanto tiempo necesita. Para 3-5 dias se excluyen desplazamientos de 12-18 horas por sentido.

### Periodo

> When could you travel?

Fechas, ventana de meses o `Not decided yet`. Formatos inequivocos como `Oct 12, 2026`. Flexibilidad indicada por el usuario; temporada no inferida del momento de completar el recorrido.

### Tiempo por trayecto y transporte

> Do you have a maximum travel time each way?
> Include connections and transfers, not just the main flight or ride.

`Set a limit` / `No specific limit`

Sin limite propio sigue aplicando la adecuacion al tiempo total. Recoger condiciones de transporte solo si son relevantes: medios aceptables, escalas, conduccion, tramos nocturnos u otras restricciones. No asumir vuelo ni capacidad para conducir.

### Participantes

> Who is travelling, and how many people are there in total?

Numero de adultos y menores, compania descrita sin forzar relaciones familiares. Si hay menores, edades o rangos utiles para evaluar experiencias y costes, sin nombres ni fechas de nacimiento.

> Are there any shared preferences or needs we should consider for this trip?

Distinguir condiciones de todo el grupo y de ciertos participantes anonimos. No asumir que las preferencias personales representan a todos.

### Presupuesto

> What budget should we work within for this trip?

Cantidad o rango en `USD`, referido al viaje real; seleccionar `For the whole group` o `Per person`. Especificar que incluye: transporte principal, alojamiento, comida, transporte local y actividades. `Not decided yet` mantiene costes pendientes, no un presupuesto ilimitado.

Limite firme por defecto. Si se comunica un rango de gasto, confirmar su significado como rango objetivo; el extremo superior es el tope, no una obligacion de gastarlo. Flexibilidad adicional debe ser explicita.

### Novedad e historial

> How should we use your travel history for this trip?

- Only new destinations.
- New regions in countries I already know.
- Returning is fine if the experience is different.

Recoger destinos visitados mediante busqueda y etiquetas, o texto corto. No exigir una lista mundial exhaustiva. Indicar si es completa o parcial. Aclarar ciudad o region solo cuando pueda afectar candidatos. Si el historial es parcial, no afirmar que el lugar nunca se ha visitado.

### Documentacion

Solo cuando sea necesaria para evaluar entrada o transito: nacionalidad del pasaporte y pais de residencia, con posibilidad de indicar varios pasaportes y permisos relevantes sin subir documentos. Para el grupo, confirmar las nacionalidades pertinentes o marcar la verificacion como incompleta.

No pedir numero, copia o fotografia del pasaporte. No afirmar elegibilidad de todos con los datos de quien responde.

## 10. Limites y necesidades

> Is there anything we should avoid or take into account so you can enjoy this trip?

Grupos: movilidad/esfuerzo, alturas/agua/animales, clima, multitudes/ruido, alimentacion, alojamiento/comodidad, desplazamientos y necesidades de acompanantes.

`Nothing to add for now` no equivale a aceptar cualquier actividad. Solo revelar detalles de grupos seleccionados.

Para preferencias donde tenga sentido:

> Should we rule it out, or avoid it where possible?

Distinguir limite, preferencia flexible y necesidad que requiere comprobacion. Alergias y necesidades esenciales no se rebajan automaticamente a preferencias. Capturar efectos practicos, no diagnosticos. No excluir una cultura gastronomica completa por preferir comida no picante.

Presupuesto, fechas y limites de trayecto son firmes por defecto. Un control `This has some flexibility` permite especificar el margen, no concede flexibilidad ilimitada.

## 11. Confirmacion editable

Antes de iniciar la investigacion, mostrar:

- Nombre evocador de categoria, secundario.
- `Your travel preferences`: resumen de preferencias habituales.
- `For this trip`: motivacion, ritmo y necesidades del grupo.
- `Conditions to respect`: limites y condiciones practicas.
- Interpretaciones del recuerdo que necesitan confirmacion y datos desconocidos relevantes.

Acciones: `Edit my preferences`, `Adjust this trip`, `Start exploring places`.

Texto junto al nombre:

> A starting point, not a box. Your preferences and this trip's needs shape the recommendations.

Editar una frase debe modificar el dato subyacente, no solo la redaccion. Indicar alcance `For this trip` / `In general` cuando sea ambiguo.

Si dos nombres tienen respaldo similar, ofrecer una eleccion opcional con descripciones breves. Incluir `Neither feels right` y omitir. La eleccion narrativa no modifica preferencias ni ranking. Si no existe categoria respaldada, mostrar `Your travel preferences` sin asignar una por defecto.

## 12. Investigacion, salida y recuperacion

Entrega unica, sin candidatos provisionales. Progreso vinculado a estados reales:

1. `Exploring places that fit your preferences`.
2. `Researching experiences and travel conditions`.
3. `Checking candidates and selecting your recommendations`.

No porcentajes ficticios, cuenta atras sin respaldo ni promesa de exhaustividad mundial. Informar que se puede salir y volver; diferenciar trabajo en curso, completado, interrumpido y fallido.

Cada busqueda usa una version confirmada de perfil y contexto. Una edicion posterior no altera silenciosamente el trabajo: permitir conservarlo o iniciar una nueva busqueda, identificando a que version corresponde cada resultado.

Requisitos de recuperacion:

- No exigir cuenta para empezar.
- Persistir respuestas, estado de investigacion, versiones y resultados.
- Acceso de sesion persistente en el mismo dispositivo y opcion de enlace privado para recuperar en otro.
- El enlace funciona como credencial: token no predecible, sin informacion personal en la URL, expiracion, revocacion y sin indexacion publica.
- Notificacion por email opcional y consentida; nunca condicion para recibir resultados.
- Fallos reintentables sin repetir captura ni generar entregas duplicadas. No confundir una investigacion parcial con una entrega completa.

El mecanismo tecnico se elegira al implementar. Debe cumplir estos comportamientos verificables.

> **Nota de alcance del MVP (2026-09-30):** Se acepta temporalmente ejecutar la investigacion directamente desde el backend, dentro de la peticion iniciada por el usuario, sin un proveedor de tareas en segundo plano y usando modelos con cuota gratuita mediante API key privada del servidor. El usuario debe mantener la pagina abierta durante la investigacion; ante un cierre, desconexion o limite de ejecucion, no se garantiza su finalizacion y puede ser necesario reiniciarla, conservando las respuestas guardadas y los resultados ya completados. Esta limitacion debe comunicarse antes de iniciar la busqueda. La cuota gratuita del modelo no implica disponer de busqueda web gratuita ni sustituye la investigacion con fuentes y las comprobaciones definidas. Esta decision solo simplifica la ejecucion inicial: no modifica el objetivo del producto ni elimina los requisitos de continuidad y recuperacion aqui descritos y en la seccion 14 de `profile-and-recommendation-logic.md`, que se mantienen como objetivo posterior al MVP.

> **Nota adicional de alcance del MVP (2026-09-30):** La recuperacion de respuestas y entregas se limita al mismo navegador y perfil de navegador, mientras se conserven credenciales de sesion validas. No se implementara el enlace privado para recuperar acceso desde otro dispositivo en esta etapa. Borrar los datos del sitio, perder las credenciales o finalizar una sesion privada puede dejar al usuario sin acceso a sus datos; el MVP debe comunicar esta limitacion y no prometer recuperacion alternativa. La perdida de acceso no implica que los datos almacenados se eliminen automaticamente: su eliminacion se rige por la politica de retencion. El requisito original de recuperacion entre dispositivos se mantiene como objetivo posterior al MVP.

## 13. Entrega de destinos

Hasta tres propuestas; una principal. No rellenar con candidatos incompatibles si hay menos de tres adecuados.

Cada tarjeta incluye lugar especifico y enfoque, dos razones de encaje, aporte de descubrimiento, experiencias concretas, duracion sugerida/necesaria, desplazamiento cuando puede estimarse, compromiso relevante y condiciones pendientes.

Mostrar costes como rangos orientativos o precios consultados con fecha y conceptos incluidos, nunca cotizaciones garantizadas. No mostrar porcentajes como `98% match`.

En inspiracion abierta, diversidad de escalas y experiencias sin plantilla obligatoria cerca/media/lejos. Con duracion y restricciones definidas, diversidad dentro de ellas.

Una propuesta no se presenta como ajustada a un viaje concreto si una condicion esencial esta pendiente. Si no hay suficientes candidatos comprobables, explicar el motivo y ofrecer ajustes explicitos, o mostrar opciones inspiracionales pendientes en una seccion claramente diferenciada.

## 14. Feedback breve y refinamiento

Primer paso:

> Which of these places would you consider for this trip?

Seleccion de uno, varios o `None of these`. Las tarjetas no seleccionadas no se convierten automaticamente en rechazos. Permitir omitir el feedback.

Segundo paso si se eligio algun destino:

> Was this place already on your radar?

`I didn't know it` / `I knew it, but hadn't considered it` / `I was already considering it`

Para mantener dos pasos cuando hay varias selecciones, pedir esta respuesta para un destino focal: primero la recomendacion principal si fue seleccionada, en otro caso el primero seleccionado. Identificarlo por nombre. No extender su novedad a los otros; quedan desconocidos. Esta regla es una propuesta operativa del piloto.

Segundo paso si no se eligio ninguno:

> What was the main mismatch?

`Experiences` / `Cost` / `Travel time` / `Climate` / `Group needs` / `Already visited` / `Other` / `Skip`

No pedir motivos por todas las tarjetas. Comentario libre opcional.

Guardar la primera evaluacion antes de ofrecer `Refine these suggestions`. Permitir actualizar contexto, aclarar un motivo o elegir `Stay closer to my preferences` / `Surprise me a little more`. Mantener limites firmes. Si un motivo no identifica que cambiar, solicitar una aclaracion breve, no reinterpretar todo el perfil.

Una nueva entrega tiene identificador y evaluacion propios. Se puede detener despues de cualquier entrega; no es obligatorio refinar ni hay un bucle forzado.

## 15. Privacidad y accesibilidad

- Informar que se utiliza IA y que ciertas respuestas pueden procesarse para investigar recomendaciones.
- Minimizar datos: origen aproximado, edades utiles, necesidades funcionales y nacionalidades cuando correspondan.
- No enviar nombres, email, recuerdos completos ni informacion sensible innecesaria a motores de busqueda. Usar condiciones funcionales anonimizadas.
- Datos potencialmente sensibles requieren informacion clara sobre finalidad y tratamiento; definir consentimiento y obligaciones aplicables antes de operar globalmente.
- Permitir eliminar la sesion y datos asociados. Definir retencion y terceros antes del piloto; no guardar indefinidamente por defecto.
- Usabilidad movil y escritorio, teclado, lector de pantalla, contraste adecuado y opciones que no dependan de imagen, color o animacion.

## 16. Validacion y referencias

Medir tiempo activo de captura por separado de espera de IA; abandono, dudas, omisiones, correcciones y cobertura de escenas. No equiparar terminar rapido con responder fielmente. El protocolo completo esta en el documento de logica.

Referencias consultadas:

- [NN/G, Recognition and Recall, 2024](https://www.nngroup.com/articles/recognition-and-recall/): fundamento para seleccion reconocible y controles visibles. No valida estas diez escenas.
- [NN/G, Progressive Disclosure, 2006](https://www.nngroup.com/articles/progressive-disclosure/): diferencia entre revelar detalles relevantes y distribuir todo en pasos obligatorios. Principio duradero, no tendencia reciente.
- [NN/G, Personalization, 2016](https://www.nngroup.com/articles/personalization/): control del usuario, correccion y revision de supuestos.
- [NN/G, Chatbots, 2018](https://www.nngroup.com/articles/chatbots/): evidencia historica sobre seleccion frente a escritura; no permite concluir como funcionan los LLM actuales.
- [Airbnb, Summer Release, 2025](https://news.airbnb.com/airbnb-2025-summer-release/): ejemplo de recomendaciones contextuales y exploracion visual. Anuncio de producto, no prueba comparativa de eficacia.

Patrones a explorar despues del piloto: voz opcional, controles de refinamiento sobre resultados y participacion de acompanantes. No son requisitos iniciales. No hay evidencia consultada que demuestre que deslizar tarjetas, chat obligatorio o gamificacion produzcan preferencias mas fiables en este caso.

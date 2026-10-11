# Cambios del formulario para cubrir la plantilla original

Estado: especificacion propuesta para implementar. No describe cambios ya realizados.

Fecha: 2026-10-10.

## 1. Objetivo y jerarquia de referencias

Este documento define las adiciones, cambios de obligatoriedad, validaciones y datos de salida que necesita el formulario actual para alimentar una futura plantilla final de Off the List.

`system-prompt-template.md` es una referencia inicial inmutable. No se debe editar ni sustituir. Cualquier nueva plantilla se creara en otro archivo. Este documento tampoco es esa nueva plantilla: es la especificacion de captura necesaria para construirla.

La jerarquia aplicable es:

1. Conservar los requisitos relevantes de la plantilla original, incluida su voz, especificidad y cuidado al explicar el encaje.
2. Conservar su producto: viaje sorpresa, destino elegido para el cliente, cuatro pilares y exclusiones obligatorias.
3. Usar `refined` para completar datos, aclarar ambiguedades y mejorar trazabilidad o verificacion, no para derogar requisitos originales.
4. Ante contradicciones internas de la plantilla original, documentar una interpretacion operativa o una decision pendiente. No resolverlas silenciosamente ni dejar que la IA elija la politica.

Por tanto, no se adoptan como sustituciones de la plantilla original los destinos necesariamente visibles, la terna como entrega final obligatoria, la repeticion permitida de lugares visitados, la desaparicion de los pilares o el descubrimiento moderado como sustituto de la escala off-path.

Se pueden conservar de `refined` la separacion entre preferencias y contexto, las prioridades explicitas, el tiempo total de viaje, los margenes, la procedencia de datos, las comprobaciones con fuentes y los estados de incertidumbre. Ninguno de esos mecanismos debe debilitar un limite esencial de la plantilla.

## 2. Que significa garantizar la captura

Un formulario no puede garantizar que una persona declare todos sus riesgos ni que un destino sea seguro. Si puede garantizar que pregunta explicitamente, exige una respuesta, recoge detalles cuando corresponde y no trata un dato faltante como ausencia de una necesidad.

La obligatoriedad propuesta distingue:

| Nivel | Significado | Efecto |
| --- | --- | --- |
| O: respuesta obligatoria | La pregunta debe contestarse explicitamente, sin respuesta predeterminada | No se confirma el formulario si queda vacia |
| C: detalle condicional obligatorio | Aplica cuando una respuesta activa una necesidad o circunstancia | No se confirma hasta completar los detalles necesarios |
| F: requisito de finalizacion | La informacion debe estar resuelta para habilitar el prompt de recomendacion final | Se permite guardar borrador, pero no exportar una solicitud final lista |
| A: ampliacion opcional | Aporta detalle sin ser indispensable | No bloquea el avance |

Las siguientes situaciones son diferentes y deben almacenarse por separado:

- Sin respuesta: la pregunta no esta contestada.
- No: la persona declara que no existe esa condicion conocida.
- Si: existe y hay que recoger su efecto practico.
- No lo se / pendiente de consultar: no esta resuelta.
- Prefiero tratarlo en privado: no se recoge informacion sensible en el formulario y se requiere resolver su efecto practico por un canal adecuado.
- No aplica: existe una razon comprobable para no pedir ese dato.

`No lo se`, `Prefiero tratarlo en privado` y `No aplica` no equivalen a `No`. No se debe obligar a revelar un diagnostico, identidad o dato sensible para poder guardar respuestas. Si la falta afecta un requisito esencial, se bloquea la finalizacion o se documenta una alternativa conservadora revisada por una persona responsable; nunca se oculta el pendiente.

La ruta de inspiracion puede mantenerse como borrador o exploracion preliminar. No puede omitir requisitos obligatorios y llegar al mismo estado de recomendacion final que un viaje completo. Si se exporta algo preliminar, debe llamarse solicitud de aclaraciones o inspiracion pendiente, no prompt final del viaje.

## 3. Diagnostico del formulario actual

La captura actual se implementa principalmente en `POC/canvas.js:68-198`. El resumen y la lista de campos exportados estan en `POC/model.js:72-201`; el prompt actual en `POC/model.js:204-232`.

| Tema | Situacion actual | Cambio requerido |
| --- | --- | --- |
| Mejores viajes | `memory` opcional, una nota a repetir o evitar | Bloque dedicado, obligatorio y con alternativa para quien no ha viajado |
| Palabras propias | Notas dispersas y opcionales | Una declaracion personal breve obligatoria |
| Off-path 1-5 | No existe | Escala directa obligatoria, con significado por nivel |
| Autonomia | Existe y admite omision | Exigir respuesta y concretar cuando depende de la experiencia |
| Alojamiento | Comodidad general; necesidades opcionales | Preferencia de alojamiento explicita y minimos separados |
| Primera visita / experiencia | Historial libre, no equivalente | Experiencia general y familiaridad regional condicionada al candidato |
| Exclusion general | Temas de necesidades opcionales | Pregunta obligatoria de exclusiones y lista estructurada |
| Historial | Opcional y permite repetir | Historial obligatorio y regla original de no repeticion |
| Ocasiones | Celebracion generica y nota opcional | Si/no obligatorio y tipo de ocasion condicional |
| Grupo | Puede quedar desconocido | Composicion confirmada para finalizacion y participantes anonimos |
| Menores | Edades en texto libre | Edad util por menor y comprobacion de cantidad y umbrales |
| Presupuesto | USD; importe/rango, alcance y conceptos | Confirmacion de vuelos incluidos/excluidos y equivalente EUR verificable |
| Documentos | Bloque opcional y texto grupal | Datos de entrada por participante cuando sean aplicables |
| Alergias | Tema voluntario; no se pregunta a todos | Pregunta explicita obligatoria para todos los participantes |
| Salud y fitness | Necesidades funcionales voluntarias | Cribado funcional obligatorio y detalles condicionados |
| Embarazo | No se pregunta | Pregunta de aplicabilidad con tratamiento privado y riesgos pendientes |
| Viajera sola | No hay dato para activar la regla | Aplicabilidad explicita y experiencia sola si se usa la excepcion |
| Nombre de presentacion | No existe | Nombre preferido o alias para la cabecera |
| Confirmacion | Checkbox general | Confirmacion especifica de necesidades, grupo y completitud |

Las preguntas que ya existen deben aprovecharse antes de introducir duplicados. Lo nuevo debe integrarse en el lienzo actual con detalles condicionales, no como un cuestionario extenso visible de una sola vez.

## 4. Cambios y preguntas propuestas

Los textos en ingles son propuestas para la interfaz actual. Las claves son propuestas de contrato, no campos ya implementados.

### 4.1. Nombre de presentacion y grupo

Referencia: plantilla, lineas 27, 47-48, 61, 90 y 167.

- O: `What name should we use for your trip reveal?` Nombre preferido o alias; no nombre legal, apellido ni email obligatorio.
- O + F: `Who is travelling?` Solo, pareja, familia, amigos, otro grupo o descripcion libre. La descripcion no debe exigir estado civil.
- O + F: numero de adultos y menores, elegido explicitamente. No precargar un adulto y cero menores como respuestas confirmadas.
- C + F: edad de cada menor en el momento del viaje. Para menores de seis, permitir anos y meses cuando sea necesario; no pedir fecha de nacimiento.
- O: `Have you checked the relevant needs of everyone travelling?` Confirmadas, pendientes de consultar o algunas confirmadas.
- C: si hay menores sin adulto, pedir aclaracion de supervision y viabilidad legal. No asumir que el itinerario familiar normal es aplicable.

Crear identificadores como `traveller-1` y `traveller-2`. Relacionar edades, necesidades y documentos con esos identificadores sin exigir nombres de acompanantes.

Capturar relacion y preferencias compartidas para contexto; no atribuir a todos las preferencias de quien responde.

### 4.2. Mejores viajes y palabras propias

Referencia: plantilla, lineas 39-43, 123, 178.

- O: `Have you taken a trip or getaway that you especially enjoyed?` Si / todavia no.
- C: si responde si, registrar al menos un viaje significativo: lugar, experiencia o momento favorito y por que fue excepcional. Permitir agregar otros viajes sin obligar a tres relatos largos.
- C: si no ha viajado, `What kind of experience would make your first trip feel worthwhile?` No inventar recuerdos ni bloquear por falta de experiencia.
- O: `In your own words, what should we understand about you to choose this trip well?` Una o dos frases; se pueden ofrecer ejemplos neutrales para reducir esfuerzo.
- A: conservar `memory` para un recuerdo adicional o algo que no desea repetir.

Datos propuestos: `bestTripsStatus`, `bestTrips[]` con lugar, momento y motivo, `firstTripAspiration`, `personalStatement`.

El texto literal debe llegar al prompt. Una interpretacion automatica se muestra para confirmar y conserva su fragmento de origen. El relato no debe convertirse silenciosamente en un diagnostico ni en un consentimiento para actividades exigentes.

No se exige revelar informacion intima ni escribir una autobiografia. El bloque es obligatorio por su importancia para el encaje, pero su longitud debe ser breve.

### 4.3. Off-path, desafio y autonomia

Referencia: plantilla, lineas 13, 29, 51-53, 69-70, 150 y 154.

- O + F: `How comfortable are you travelling beyond familiar tourist settings?` Escala 1-5 sin seleccion inicial.

| Nivel propuesto | Descripcion |
| --- | --- |
| 1 | Prefiero entornos faciles de navegar, servicios fiables y poca incertidumbre |
| 2 | Acepto descubrimientos poco conocidos con apoyo y logistica sencilla |
| 3 | Me siento comodo con entornos menos familiares y cierta adaptacion |
| 4 | Busco lugares poco frecuentados y acepto logistica mas exigente dentro de mis limites |
| 5 | Me atraen lugares muy poco conocidos y una adaptacion importante, siempre respetando seguridad y necesidades esenciales |

- O: mantener la pregunta de autonomia, quitar la omision y permitir `It depends` como respuesta real.
- C: cuando depende, preguntar en que situaciones quiere guia, apoyo o estructura.
- O: `What kind of challenge would you welcome, and what is off limits?` Desafio fisico, aprender una habilidad, adaptacion cultural, encuentros, otro o ninguno de los propuestos; conectar limites con el bloque de exclusiones.
- C + F: si una politica permite excepciones por aventura maxima, recoger disposicion explicita para esa situacion. Off-path 5 por si solo no demuestra consentimiento a riesgo alto.

Datos propuestos: `offPathComfort`, `autonomyDetails`, `challengePreferences`, `adventureComfort`, `riskExceptionAcknowledgements`.

La escala conserva el criterio editorial de la plantilla. No equivale a aptitud fisica, presupuesto, consentimiento medico o excepcion general de seguridad. No usar una casilla de exencion de responsabilidad como sustituto de comprobaciones.

### 4.4. Comodidad, alojamiento y ritmo

Referencia: plantilla, lineas 44-49, 79-82.

- O: mantener comodidad habitual, sin omision; `It depends` exige indicar minimos practicos.
- O: `What accommodation would you enjoy most?` Boutique, hotel comodo, guesthouse, eco-lodge, otro o sin preferencia entre opciones compatibles.
- C: minimos de alojamiento relevantes: bano privado, acceso sin escalones, climatizacion, ubicacion, proximidad sanitaria u otros. Los esenciales no deben almacenarse como gustos flexibles.
- O: ritmo actual, usando las agendas existentes; permitir mezcla como respuesta concreta.
- C: con menores de seis, confirmar rutina y margenes relevantes: descanso, trayectos, horarios u otras necesidades. No exigir datos de crianza sin utilidad para el viaje.

Un presupuesto alto no autoriza llenar la agenda, ni una preferencia por eco-lodge autoriza aislamiento sin atencion medica necesaria.

### 4.5. Experiencia viajera e historial de exclusiones

Referencia: plantilla, lineas 15, 59, 69-70, 132-141 y 180-181.

- O: experiencia general declarada: primer viaje, poca experiencia, varios viajes, experiencia amplia. No inferirla contando paises.
- O + F: `Which countries, regions or territories have you already visited?` Permitir etiquetas asistidas y declaracion explicita de no haber viajado.
- O: completitud del historial, separando completo para el alcance solicitado y pendiente de completar.
- C + F: completar el historial necesario antes de afirmar que un destino no se ha visitado. Una lista parcial permite investigar, no garantizar novedad ni cerrar la recomendacion como plenamente comprobada.
- C: antes de cerrar un candidato, confirmar familiaridad con su region o entornos comparables si cambia el tono y la logistica. No mostrar el destino al cliente si eso rompe la sorpresa; la aclaracion puede hacerse por region amplia o gestion interna.

Sustituir para el flujo final las opciones actuales `New regions, familiar countries` y `Returning differently is fine`: contradicen la exclusion original. No presentar la repeticion como una opcion que anula esa politica.

Conservar lugar declarado, pais soberano relacionado, tipo de lugar, completitud y alcance. La politica original excluye los territorios de un estado soberano visitado; aplicar esa expansion con un mapa territorial mantenido, no con asociaciones inventadas por el LLM.

Ambiguedades que requieren decision operativa documentada: si una escala aeroportuaria cuenta como visita, como tratar residencia en el pais de origen, y si visitar solo un territorio excluye tambien el estado soberano y sus demas territorios. La plantilla especifica expresamente la expansion desde el estado soberano; no define con igual claridad la regla inversa. No asumirla sin decision.

Paris y Londres se mantienen como exclusiones editoriales originales. Off-path 1 significa un entorno publicamente conocido o facil de navegar, no permiso para repetir un destino visitado ni para ignorar esas exclusiones.

### 4.6. Exclusiones explicitas

Referencia: plantilla, lineas 55, 68 y 177.

- O: `Is there anything this trip must not include?` Si / no tengo exclusiones adicionales conocidas / necesito revisarlo.
- C + F: registrar cada exclusion, su alcance y quien se ve afectado. Incluir destinos, actividades, animales, alturas, agua, multitudes, alimentos, transporte, alojamiento, contextos culturales o religiosos y otros.
- C: si el texto es ambiguo, aclarar que considera incluido en la exclusion y que alternativas aceptaria. No ampliar el veto por analogia arbitraria.

Conservar la regla original de no sugerir algo adyacente a una exclusion especifica: un veto a montar animales no se satisface sustituyendo camello por caballo. Aclarar el alcance cuando sea necesario, sin rebajar el veto.

Distinguir explicitamente `must not include` de `prefer to avoid`. Las alergias, necesidades esenciales y exclusiones firmes nunca se convierten en preferencias flexibles. Una experiencia incompatible no se salva porque el resto del destino encaje.

### 4.7. Ocasiones especiales y motivacion

Referencia: plantilla, lineas 48, 57, 67, 94 y 179-182.

- O: `Is this trip for a special occasion?` Si / no.
- C: luna de miel, aniversario, cumpleanos, otro hito o descripcion propia.
- C: momento que deba celebrarse en una fecha concreta, si aplica; no pedir la fecha personal si basta con la fecha del viaje.
- C: deseos o limites para la celebracion: privacidad, intimidad, sorpresa para alguien, tiempo juntos o actividades compartidas.
- O: conservar motivaciones actuales; si son varias, prioridad explicita o igual importancia.

No confiar solo en que alguien seleccione `A celebration` ni deducir luna de miel por viajar en pareja. La ocasion influye en redaccion y experiencias; no anula salud, exclusiones ni seguridad.

### 4.8. Origen, tiempo y transporte

Referencia: plantilla, lineas 27, 63, 90 y 167. `refined` completa aqui la semantica del tiempo total.

- O + F: ciudad y pais de salida; origen alternativo opcional.
- O + F: duracion exacta o rango, o ventana de fechas que permita establecer duracion. Incluir ida y vuelta.
- O + F: fechas o ventana util de viaje; flexibilidad explicitamente declarada si existe.
- O: limite por trayecto o declaracion explicita de no tener limite propio; no dejarlo vacio.
- O: medios de transporte aceptados. Si conducir es necesario, confirmar capacidad/disponibilidad pertinente sin inferirla.
- C: para restricciones de vuelo de menores de cinco, distinguir duracion del tramo aereo y duracion completa por sentido. La plantilla habla de vuelos de mas de diez horas; `refined` aporta adicionalmente el tiempo de acceso completo.
- C: horas y zona horaria cuando sean necesarias para comprobar escapadas cortas. No suponer medianoche si falta hora.

Fechas exactas no son obligatorias si una ventana util permite investigar. Si el periodo no se define, solo se puede guardar o explorar provisionalmente; no comprobar temporada y precios de un viaje final.

### 4.9. Presupuesto, vuelos y moneda

Referencia: plantilla, lineas 63, 74-82, 174 y 183.

- O + F: importe o rango con limite superior, sin valor inicial confirmado.
- O + F: moneda original y alcance por persona o por reserva/grupo.
- O + F: `Does this budget include flights?` Incluidos / excluidos y pagados aparte / no habra vuelos / pendiente de definir.
- C: si vuelos excluidos, el importe no los limita; seguir estimandolos aparte y no confundirlo con presupuesto completo. Se puede pedir un limite adicional si el cliente quiere fijarlo.
- O: incluidos/excluidos para alojamiento, comida, transporte local y actividades. Los inevitables que falten deben figurar aparte, no como gratuitos.
- C: un margen de gasto debe ser explicito y acotado.

Conservar EUR como referencia de las bandas originales. La UI puede seguir ofreciendo USD u otras monedas, pero el modelo debe conservar importe original y equivalente EUR con fuente y fecha de cambio. No aplicar EUR 3.500 o EUR 5.000 directamente a un numero en USD.

Derivar coste por reserva y referencia por persona sin multiplicar costes compartidos como individuales. No dividir un total por numero de viajeros y tratarlo como asignacion individual real, especialmente con menores. Si se usa un promedio para clasificar una banda, nombrarlo como promedio y documentar la regla de banda para grupos mixtos.

No usar el promedio comercial de EUR 6.500 como presupuesto predeterminado ni como objetivo de gasto.

### 4.10. Alergias y alimentacion: bloque obligatorio

Referencia: plantilla, lineas 163 y 166.

La pregunta debe mostrarse a todos, aunque no seleccionen gastronomia ni necesidades alimentarias.

- O + F: `Does anyone travelling have a food allergy or an essential dietary requirement?` Si / no se conocen tras consultar / pendiente de consultar / tratar en privado.
- C + F: participante afectado y sustancia o requisito practico.
- C + F: riesgo de contacto cruzado, necesidad de utensilios separados o garantias del proveedor, si corresponde. La persona puede indicar que requiere aclaracion; no forzar una respuesta medica improvisada.
- C: gravedad conocida o advertencia de reacciones graves, sin pedir historia clinica. La gravedad desconocida no equivale a alergia leve.
- C: acceso sanitario o capacidad de respuesta que necesita durante el viaje, si lo ha indicado su profesional sanitario.

Registrar alergias como necesidades esenciales con comprobacion, no como preferencias. Separar alergia, intolerancia, dieta esencial y gusto alimentario. No exigir informacion sobre medicacion si basta con el requisito funcional.

Si hay una alergia y no se conoce su efecto practico, permitir borrador y aclaracion privada, pero no declarar resuelta la captura esencial. Si el requisito esta definido pero falta comprobar un proveedor, el prompt puede solicitar esa investigacion; la recomendacion no queda validada hasta obtener evidencia.

Un `No` global solo es valido tras confirmar los participantes a los que se refiere. Al agregar otro viajero, su cribado vuelve a estar pendiente.

### 4.11. Salud funcional, movilidad y necesidades especiales

Referencia: plantilla, lineas 94 y 162-168.

Crear preguntas obligatorias separadas; no una casilla opcional que la persona pueda pasar por alto.

| Pregunta obligatoria propuesta | Detalles condicionales |
| --- | --- |
| `Does anyone need step-free access, limited walking or low-impact activities?` | Participante, limites de marcha, escaleras, terreno irregular, ayudas o asistencia |
| `Does anyone have a known sensitivity or restriction related to altitude?` | Efecto practico y limite indicado, si existe |
| `Is there any health-related restriction that affects exertion, remoteness or access to medical care?` | Actividad a evitar, infraestructura necesaria y distancia sanitaria aceptable, si esta definida |
| `Are there any other essential access, sensory, communication or accommodation needs?` | Participante, adaptacion necesaria y condiciones de servicio |

Cada una debe permitir si, no conocido tras consultar, pendiente y tratamiento privado. No pedir diagnosticos ni expedientes clinicos. Si se declara una condicion cardiaca, conservar el filtro de altitud original aunque el detalle clinico no se exporte.

- O: intensidad fisica deseada ahora; separada del interes habitual por desafios.
- C + F: capacidades requeridas por experiencias concretas, por ejemplo nadar o tolerar determinado esfuerzo. No preguntar todas las habilidades a todos por anticipado.
- C + F: para propuestas por encima de 3.000 m, conservar la exigencia original de conversacion explicita. Una seleccion off-path 5 o un checkbox de fitness no sustituye esa conversacion ni una valoracion sanitaria cuando corresponda.
- C: con movilidad limitada, filtrar para terreno plano segun la plantilla y advertir escalones o terreno irregular inevitables. Una ruta "facil" no prueba accesibilidad.

Permitir multiples necesidades por tema y por participante. El objeto actual `needDetails[id]` no basta para dos alergias o dos restricciones de movilidad distintas con diferente alcance.

### 4.12. Embarazo y menores: condiciones especificas

Referencia: plantilla, lineas 61, 66, 167 y 168.

- O: preguntar si deben considerarse precauciones relacionadas con embarazo para alguna persona durante el periodo del viaje, con respuestas si, no aplica declarado, pendiente o tratar en privado. No inferirlo del genero o de la edad.
- C: recoger unicamente necesidades funcionales y el periodo relevante si afecta servicios o transporte; permitir derivacion privada.
- C: presentar riesgos relevantes y obtener decision informada del cliente, como establece la plantilla. Una aceptacion no anula prohibiciones legales ni convierte un riesgo no investigado en seguro. La IA no presta autorizacion medica.
- C: menores de seis activan prioridad de ritmo y logistica.
- C: menores de cinco activan exclusion de regiones endemicas de malaria y de infraestructura medica limitada, y preferencia por evitar vuelos de mas de diez horas.

No convertir `where possible` sobre vuelos en prohibicion absoluta sin documentar el ajuste. Las exclusiones sanitarias y la regla de ritmo tienen umbrales distintos: menor de cinco no es menor de seis. Deben probarse ambos limites y usar la edad durante el viaje.

### 4.13. Viaje solo y regla de seguridad para mujeres

Referencia: plantilla, lineas 148-151.

- C: si viaja una sola persona, preguntar si se identifica como mujer y desea que se registre esa aplicabilidad para la regla de seguridad. Permitir no revelarlo y no deducirlo del nombre.
- C: si no lo revela, no registrar "no es mujer". Aplicar una evaluacion conservadora para viaje solo y no habilitar excepciones basadas en una identidad desconocida.
- C + F: si se estudia la excepcion original para ciertos destinos, recoger experiencia significativa viajando sola, condiciones comparables y disposicion explicita al contexto evaluado, ademas del nivel alto de aventura. No sustituirlo por numero de paises ni por off-path 5.

La advertencia preparatoria de un destino borderline no sustituye excluir riesgos graves. La evaluacion necesita region, periodo y fuentes actuales; no una etiqueta generica por pais o genero.

No se requiere preguntar orientacion sexual para la exclusion anti-LGBTQ+: la plantilla la aplica a todos los clientes.

### 4.14. Pasaportes y permisos

Referencia: plantilla, lineas 159-160. `refined` completa entrada, transito y alcance grupal.

- O + F: nacionalidad del pasaporte que cada participante puede usar, o varias opciones si tiene varios.
- C + F: residencia y permisos relevantes para la ruta, cuando afecten entrada o transito.
- C: si no hay pasaporte o esta pendiente, conservarlo como pendiente; no asumir el del respondente para todo el grupo.
- C: vigencia suficiente para la ruta mediante confirmacion o dato minimo necesario; no pedir numero ni fotografia del documento.
- C: necesidad de proceso de visa complejo, plazos disponibles y voluntad de tramitarlo, si el candidato lo requiere.

`I believe it is not needed` no puede eximir de comprobar requisitos. En un viaje domestico se puede marcar pasaporte no aplicable solo tras establecer la ruta y comprobar documentos alternativos pertinentes.

## 5. Politicas que no son preguntas del formulario

No todo requisito original se resuelve agregando campos. Estas politicas deben incorporarse a la futura plantilla y a sus comprobaciones, no delegarse al gusto del cliente.

| Politica original | Datos de captura que ayudan | Comprobacion externa necesaria |
| --- | --- | --- |
| No destinos visitados, incluidos territorios del estado soberano | Historial y completitud | Normalizacion geografica y relaciones territoriales |
| No paises que criminalicen relaciones entre personas del mismo sexo | Ningun dato de orientacion sexual | Legislacion vigente, alcance territorial y fecha |
| No conflicto activo ni avisos equivalentes a Do Not Travel / nivel 4 | Periodo y ruta | Avisos oficiales y alcance regional |
| Excepcion limitada para nivel 3 | Disposicion explicita de aventura maxima | Region, fuentes y revision de seguridad |
| No multiples vacunas obligatorias de entrada | Ruta, procedencia, transito y documentacion | Requisitos vigentes; separar obligatorias de recomendadas |
| No mas de 3.000 m sin conversacion explicita aplicable | Altitud, salud funcional y registro de conversacion | Altitud real de acceso, alojamiento y experiencias |
| Alergias graves compatibles con servicios concretos | Alergeno, alcance y condiciones necesarias | Proveedor, contacto cruzado y respuesta sanitaria |
| Menores de cinco: malaria e infraestructura medica | Edad durante el viaje | Region, periodo y recursos sanitarios |
| Cuatro pilares y bandas de presupuesto | Intereses, limites, ritmo, presupuesto y tiempo | Experiencias reales, acceso consentido y coste |

La prohibicion original de destinos que criminalizan relaciones entre personas del mismo sexo prevalece sobre sus ejemplos de destinos posibles: Oman no se convierte en elegible por aparecer en una lista ilustrativa. Verificar la situacion actual, no tratar los ejemplos como una base legal actualizada.

No hay un requisito de preguntar historial completo de vacunas. Pedir certificados concretos solo cuando una ruta admisible lo requiera. No confundir una vacuna recomendada con una obligatoria ni determinar requisitos solo por pais de destino.

No prometer acceso a una familia, ceremonia o espacio privado sin oferta real y consentimiento. Esto precisa la viabilidad de la inmersion original, no elimina su intencion cultural.

## 6. Cuatro pilares: implicaciones para la captura y la futura plantilla

Conservar Adventure, Explore, Transform y Culture. No sustituirlos por intereses ni pedir al cliente que elija cuales quiere eliminar.

La captura debe permitir construirlos con personalizacion:

- Adventure: desafio compatible con el nivel declarado, capacidad y exclusiones. No equivale a peligro.
- Explore: lugar no visitado, con originalidad adecuada al off-path y logistica disponible.
- Transform: conexion o perspectiva con significado para esa persona, respetando privacidad, creencias y consentimiento.
- Culture: inmersion apropiada, con alimentacion, accesibilidad y acceso verificados.

No hace falta agregar cuatro preguntas obligatorias nuevas si intereses, relato, motivacion, desafio y limites ya ofrecen esa evidencia. Si una experiencia cultural concreta requiere confirmar participacion religiosa, alcohol u otra condicion, hacerlo de forma condicional; no inferir consentimiento de un interes por cultura.

La plantilla tiene una tension entre el minimo de una experiencia por pilar, las 2-3 experiencias de una banda y las dos experiencias por pilar desde EUR 3.500. Interpretacion propuesta para la nueva plantilla: conservar al menos una por pilar, dos desde EUR 3.500 por persona y dos o mas desde EUR 5.000; aclarar la referencia a 2-3 experiencias sin reducir el minimo de cuatro. Esta interpretacion debe aprobarse y documentarse en el archivo nuevo, sin editar el original.

Si tiempo, presupuesto o necesidades no permiten satisfacer esos minimos, declarar el conflicto y solicitar ajuste o revision. No inventar experiencias, llenarlas con variantes de una misma actividad ni rebajar restricciones para completar tarjetas.

## 7. Modelo minimo adicional y exportacion

Adaptar el contrato actual, no limitarse a agregar controles visuales. Los nombres siguientes son orientativos:

| Estructura | Contenido minimo |
| --- | --- |
| `presentation` | Nombre preferido/alias y datos de cabecera |
| `travellers[]` | Identificador anonimo, adulto/menor, edad util, documentos y estado de consulta |
| `bestTrips[]` | Lugar, momento favorito, motivo y texto original |
| `personalStatement` | Palabras propias del cliente |
| `offPathComfort` | Entero 1-5 elegido explicitamente |
| `experience` | Experiencia general, solo y familiaridad contextual cuando aplique |
| `accommodation` | Preferencias y minimos |
| `occasion` | Aplicabilidad, tipo, fecha pertinente y deseos |
| `exclusions[]` | Contenido, alcance, participantes y estado de aclaracion |
| `needs[]` | Registros multiples con tipo, esencialidad, efecto practico y participantes |
| `screening` | Respuesta explicita por pregunta y participante, pendientes y fecha |
| `budget` | Importe/rango, moneda, alcance, vuelos, conceptos y conversion EUR |
| `history` | Lugares, granularidad, completitud y normalizacion territorial |
| `readiness` | Campos pendientes, contradicciones y elegibilidad para finalizar |
| `confirmation` | Version, fecha, alcance y comprobacion de necesidades del grupo |

Preservar ademas todos los datos utiles existentes: intereses y prioridades, autonomia, comodidad, motivaciones, ritmo, origen, duracion, periodo, transporte y margenes.

No duplicar detalles clinicos ni datos identificativos en resumen y JSON si bastan efectos funcionales. Informar claramente que el prompt copiado se compartira con el proveedor de IA elegido, y que borrar la sesion local no elimina copias descargadas o compartidas.

No todos los requisitos resueltos requieren exportar informacion sensible: puede exportarse un requisito funcional conservador y el estado de revision privada sin el diagnostico o identidad que lo origino.

## 8. Validacion, estados y cambios de respuestas

Separar dos puertas:

1. Captura lista: todas las respuestas obligatorias y detalles aplicables estan completos; no hay contradicciones esenciales pendientes.
2. Recomendacion comprobada: la investigacion demuestra que destino y experiencias cumplen los requisitos; el formulario por si solo no alcanza este estado.

El prompt final se puede generar en la primera puerta para solicitar investigacion y reveal, pero debe impedir que la IA presente como comprobado algo que no supere la segunda. Si faltan fuentes o condiciones esenciales, debe devolver pendientes o necesidad de revision, no una propuesta ficticiamente segura.

Reglas de validacion requeridas:

- Validar en un unico contrato antes de confirmar, copiar y descargar; no solo al visitar la pantalla visible.
- Ninguna pregunta esencial lleva un `No` inicial ni deriva su respuesta de un tema no seleccionado.
- Cada menor tiene edad util; la cantidad de edades coincide con la cantidad de menores.
- Cada participante tiene cribado aplicable y documentacion pertinente resuelta o justificacion de no aplicabilidad.
- Necesidades esenciales no admiten tipo flexible. Eliminar margenes antiguos si una preferencia cambia a limite firme o necesidad esencial.
- Cualquier mencion de posible alergia o limite esencial en texto libre exige aclaracion o registro conservador; no se ignora por un `No` contradictorio.
- Fechas y duracion no pueden coexistir en conflicto. Comparar datos temporales con precision y zona horaria pertinentes, no solo cadenas.
- Alcance de presupuesto y moneda siempre explicitos; corregir el default actual `budgetScope: 'group'` del constructor para no asumirlo.
- Una edicion invalida confirmacion. Cambiar grupo, edades, periodo o ruta invalida las comprobaciones que dependan de esos datos.
- No borrar alergias o necesidades al pasar de viaje a inspiracion ni al ocultar un bloque practico. Cambiar grupo puede dejar registros pendientes de reasignacion; no eliminarlos sin confirmacion.
- Sesiones antiguas sin campos nuevos se restauran como pendientes, no como si hubieran respondido negativamente al cribado.
- Versionar captura y politica; guardar la instantanea confirmada usada en cada exportacion.

## 9. Alcance de implementacion por archivo

| Archivo actual | Trabajo necesario |
| --- | --- |
| `POC/canvas.js` | Nuevos bloques, respuestas obligatorias visibles y detalles condicionales; quitar vias de omision esenciales |
| `POC/app.js` | Estado, participantes, validacion integral, dependencias, normalizacion, confirmacion y restauracion de sesiones existentes |
| `POC/model.js` | Contrato de datos, resumen completo, pendientes, exportacion de nuevos campos y sustitucion futura del prompt actual incompatible |
| `POC/model.test.js` | Fidelidad de campos, defaults, necesidades, bandas y requisitos de exportacion |
| `POC/canvas.test.js` | Visibilidad y condiciones de preguntas nuevas |
| `POC/browser.test.js` | Bloqueos, ramas, persistencia, edicion, copia y descargas en escritorio y movil |
| Nuevo archivo de plantilla | Voz y reveal originales, pilares, exclusiones y proceso enriquecido con verificacion |
| Nuevo registro de politicas, si hace falta | Ambiguedades resueltas, fuentes, alcance y versiones |

`system-prompt-template.md` y los documentos de `refined` no se modifican como parte de esta especificacion. Las decisiones divergentes se documentan en archivos nuevos.

El prompt actual de `model.js` permite repeticion y hasta tres destinos visibles sin cuatro pilares. Agregar campos sin sustituir esas instrucciones no satisface la plantilla original. Su ajuste debe formar parte de una implementacion posterior con una plantilla nueva.

## 10. Orden de implementacion

1. Definir contrato, respuestas obligatorias y puerta de captura lista; fijar las ambiguedades que afectan exclusiones y presupuesto.
2. Implementar participantes, alergias, salud funcional, necesidades especiales, menores y documentos.
3. Implementar off-path, mejores viajes, palabras propias, alojamiento, ocasion e historial obligatorio.
4. Completar presupuesto, vuelos, moneda, tiempo, transporte y exclusiones.
5. Actualizar resumen, confirmacion, persistencia y exportacion para no perder datos ni conservar contradicciones.
6. Crear la nueva plantilla con reveal, cuatro pilares y politicas originales, enriquecida con fuentes y comprobaciones.
7. Probar el recorrido y evaluar recomendaciones reales con revision humana.

Las prioridades ordenan el trabajo; no autorizan publicar como final un flujo que omita los requisitos pendientes de la plantilla.

## 11. Criterios de aceptacion

1. La plantilla original conserva exactamente su contenido.
2. Un usuario que omite alergias o necesidades especiales no puede generar el prompt final.
3. Un `No` en alergias es una respuesta explicita, sin default, y tiene alcance sobre participantes consultados.
4. Si alguien declara alergia, los detalles practicos y participantes afectados son obligatorios; tipo flexible y margen no pueden debilitarla.
5. Dos personas con alergias diferentes conservan registros diferentes en resumen y exportacion.
6. Agregar un viajero invalida el cribado completo del grupo y exige resolver al nuevo participante.
7. Menores de cuatro, cinco y seis anos activan correctamente los umbrales distintos, usando edad durante el viaje.
8. Una limitacion de movilidad permanece activa aunque se elija desafio, eco-lodge u off-path 5.
9. Una propuesta sobre 3.000 m sin conversacion explicita no puede presentarse como adecuada.
10. La falta de informacion de embarazo, salud o identidad no se transforma en ausencia de riesgos; se permite borrador o revision privada sin fingir finalizacion.
11. Viajera sola y experiencia solo quedan diferenciadas; no se habilita una excepcion solo con off-path 5.
12. El caso sin viajes previos permite completar el formulario mediante aspiracion propia, sin recuerdos inventados.
13. Una luna de miel se registra explicitamente y modifica tono y momentos sin anular restricciones esenciales.
14. Haber visitado un estado soberano excluye sus territorios segun la politica original, incluso si el usuario eligio repetir en una sesion antigua.
15. Un historial parcial no sustenta una afirmacion definitiva de destino nunca visitado.
16. Presupuesto por persona y por grupo, EUR y USD, vuelos incluidos y excluidos producen datos distintos y verificables.
17. Off-path 1 y 5 producen orientaciones editoriales distintas sin cambiar los limites de seguridad.
18. Inspiracion abierta puede guardar respuestas, pero no saltarse los requisitos para exportar el prompt final.
19. El prompt exportado contiene todos los datos relevantes nuevos y existentes; el resumen no se cuenta como evidencia independiente.
20. El reveal conserva cuatro pilares y cantidades aprobadas por banda; si no son viables, comunica conflicto en vez de inventar actividades.
21. La ausencia de herramientas o fuentes impide afirmar comprobaciones, aunque el formulario este completo.
22. La validacion tambien se aplica al copiar, descargar y restaurar sesiones antiguas, no solo al avanzar por pantallas.
23. Las preguntas y errores son accesibles con teclado y lector de pantalla, y los detalles se conservan al navegar en movil y escritorio.

## 12. Decisiones pendientes antes de implementar

Estas decisiones no se deben entregar al LLM para que improvise:

- Interpretacion aprobada del numero de experiencias en bandas presupuestarias y tratamiento del limite exacto de EUR 3.500 y EUR 5.000.
- Regla de banda por persona para grupos con menores y presupuestos totales, sin falsear asignaciones individuales.
- Significado de visita frente a escala, residencia y visita a un territorio; alcance inverso de la exclusion territorial.
- Fuentes, actualidad, alcance regional y revision humana de las politicas legales, sanitarias y de seguridad.
- Canal privado para resolver datos sensibles y condiciones de finalizacion cuando el cliente no desea revelarlos en el formulario.
- Tratamiento y retencion de datos sensibles y de menores; informacion y consentimiento aplicables antes de operar.
- Si se mantiene una salida de inspiracion preliminar y como se diferencia de un reveal final sin convertirla en una via de omision.

La voz original debe conservarse en la futura plantilla: calida, conocedora, concreta y atenta a las palabras del cliente. La captura obligatoria aporta la evidencia que permite escribir asi sin inventar personas, capacidades, acceso, recuerdos o condiciones de seguridad.

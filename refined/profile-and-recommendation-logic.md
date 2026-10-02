# Off the List: determinacion del perfil y recomendacion

Estado: especificacion del piloto acordada. Reglas operativas propuestas para implementar y evaluar, no algoritmo entrenado ni modelo de personalidad validado.

La captura se describe en [user-experience.md](user-experience.md) y los conceptos en [traveler-profiles.md](traveler-profiles.md).

## 1. Objetivo de decision

Descubrir destinos relevantes e inesperados mediante busqueda abierta y profunda con IA. Respetar condiciones, investigar experiencias concretas y entregar hasta tres propuestas diferenciadas con una principal.

No existe un catalogo previo que determine candidatos. No se promete exhaustividad literal mundial: la cobertura depende de fuentes, acceso a informacion y condiciones del viaje.

Separar tres resultados:

- Perfil: evidencia estructurada sobre preferencias.
- Categoria: sintesis narrativa opcional, sin efecto en busqueda o ranking.
- Recomendacion: perfil mas contexto, restricciones e informacion contrastada de candidatos.

## 2. Modelo minimo de datos

| Entidad | Campos minimos |
| --- | --- |
| Preferencia | Dimension/valor, prioridad, matiz, origen de evidencia, alcance, estado de confirmacion y fecha |
| Perfil | Preferencias vigentes y version |
| Categoria | Nombre o ausencia, motivos, automatica/elegida/provisional y version de reglas |
| Contexto | Entrada, motivacion, ritmo, origen, duracion, periodo, grupo, presupuesto, transporte y documentacion relevante |
| Restriccion | Condicion, a quien aplica, firme/flexible/necesita verificacion, margen explicito y fuente |
| Historial | Lugares y granularidad, completo/parcial/desconocido, alcance de repeticion |
| Busqueda | Identificador, instantanea de perfil/contexto, versiones de reglas y prompts, estado y registro de investigacion |
| Candidato | Lugar/region/ruta, experiencias, evidencia de encaje, costes, desplazamientos, temporada, restricciones, fuentes e incertidumbres |
| Entrega | Candidatos seleccionados, principal, motivos, orden y estado de comprobacion |
| Feedback | Entrega, seleccion, destino focal, novedad, motivo, alcance y cambios confirmados |

Ausencia de dato se representa explicitamente; no como cero, falso o valor neutral. Separar fecha de consulta de fecha del hecho/precio consultado.

Conservar trazabilidad suficiente sin duplicar datos sensibles innecesarios. Logs de evaluacion anonimizados y politica de retencion previa al piloto.

## 3. Construccion del perfil

1. Asociar cada escena seleccionada con su interes principal; evitar inferencias laterales.
2. Registrar prioridad explicitamente destacada. Seleccion unica no prueba intensidad extraordinaria.
3. Registrar autonomia y comodidad como orientaciones, no limites ni capacidad de gasto.
4. Incorporar matiz condicional cuando exista.
5. Interpretar recuerdo en afirmaciones pequenas, vinculadas a evidencia y pendientes de confirmacion.
6. Mantener contexto y necesidades del grupo fuera del perfil individual.
7. Generar resumen exclusivamente a partir de esos datos y permitir correccion.
8. Versionar el perfil confirmado antes de buscar.

Declaracion/correccion explicita prevalece sobre inferencia. Respuestas compatibles no se fuerzan a una sola escala: comodidad y desafio pueden coexistir.

Si una contradiccion afecta condiciones esenciales, pedir aclaracion antes de afirmar compatibilidad. Si solo afecta una interpretacion narrativa, mantenerla pendiente y no bloquear el resultado.

Ejemplo: elegir un reto y declarar que no se desea esfuerzo fisico puede significar aprender una habilidad. No eliminar el limite ni asumir capacidad para rafting.

## 4. Asignacion de categoria

### Respaldo por categoria

| Categoria | Evidencia elegible |
| --- | --- |
| The Pioneer | Descubrimiento como preferencia habitual explicita/confirmada |
| The Edge Walker | Desafio habitual declarado y sus matices |
| The Quiet Seeker | Ritmo habitual pausado/profundidad sin prisas, explicitamente confirmado |
| The Connector | Conexion humana habitual declarada |
| The Deep Diver | Comprender/aprender como preferencia habitual; no cualquier creatividad por si sola |
| The Naturalist | Naturaleza/ecosistemas declarados; agua sola no basta |
| The Epicure | Gastronomia declarada |

No usar motivacion actual para completar respaldo habitual faltante. No usar un nombre elegido para inferir retrospectivamente dimensiones.

### Regla inicial auditable

Usar niveles ordinales, sin porcentajes psicometricos:

- Nivel A: interes o afinidad habitual elegible explicitamente destacado como prioritario, o confirmacion equivalente en edicion.
- Nivel B: afinidad habitual elegible declarada/confirmada sin prioridad.
- Sin respaldo: inferencia pendiente o dato ausente.

Una categoria puede tener respaldo adicional coherente de un matiz o recuerdo confirmado. No contar declaraciones derivadas del mismo dato como evidencia independiente.

Asignar automaticamente cuando hay una unica categoria de nivel A sin contradicciones, o una unica categoria de nivel B con confirmacion adicional independiente. Esta es una regla inicial del piloto, no validada.

Si dos categorias tienen el mayor nivel, ofrecer ambas con descripcion y eleccion opcional. Si mas de dos empatan, presentar dos segun el matiz explicito mas relevante; si no lo hay, utilizar un orden fijo de catalogo registrado, no un desempate oculto del LLM. La eleccion sigue siendo solo narrativa. Medir este sesgo.

Si la eleccion se omite, mostrar `Your travel preferences`; se puede indicar que existen dos descripciones posibles, sin imponer una. Si ningun nombre tiene respaldo, no asignar categoria. El resumen siempre permite recomendar.

Un unico nivel A no obliga a clasificar cuando el usuario rechaza la descripcion. Su correccion prevalece. La falta de cobertura se registra para revisar el catalogo.

## 5. Perfil efectivo de la busqueda

Construir una vista de preferencias y contexto, no una nueva identidad:

```text
search_input = confirmed_preferences
             + current_trip_motivations_and_priorities
             + trip_conditions_and_group_needs
             + explicit_constraints
             + history_and_repeat_scope
             + confirmed_search_feedback
```

La categoria no se incluye como criterio de busqueda ni como sustituto del perfil. Si se conserva para presentacion, queda fuera del prompt de generacion de candidatos.

Las inferencias pendientes pueden abrir lineas de exploracion de baja confianza, pero no justificar exclusiones ni aparecer como preferencias confirmadas en la explicacion.

## 6. Busqueda abierta y profunda

### Plan de investigacion

Generar lineas independientes desde combinaciones de intereses prioritarios, motivacion y contexto. Incluir cuando corresponda:

- Lugares con varias afinidades relevantes, no solo una etiqueta generica.
- Alternativas cercanas y lejanas compatibles con tiempo y transporte.
- Ciudades, regiones, localidades y rutas; no solo paises.
- Regiones nuevas de paises conocidos o experiencias diferentes cuando se permite repetir.
- Fuentes locales y en otros idiomas, aunque la entrega sea inglesa.
- Alternativas menos visibles, sin equiparar escasez de informacion con autenticidad.

No usar una sola pregunta `recommend destinations for this traveller type`. No imponer cuotas continentales o una plantilla cerca/media/lejos.

Buscar sin sesgos adicionales de estilo, distancia o duracion; filtrar segun lo declarado y las condiciones comprobables. No excluir lugares por haber sido recomendados a otra persona.

### Profundizacion

Para cada candidato prometedor, investigar ubicaciones concretas, experiencias disfrutables, acceso, temporada, costes pertinentes y condiciones esenciales. Evitar razones intercambiables como `great culture and food`.

Deduplicar lugares y fuentes repetidas. Dos paginas que reproducen la misma informacion no son corroboracion independiente.

### Criterio de cierre

La implementacion debe declarar un presupuesto de investigacion y registrar consultas/candidatos, no hacer un bucle ilimitado. Como propuesta inicial, investigar al menos tres lineas independientes y contrastar alternativas antes de cerrar.

Cerrar cuando las mejores propuestas tengan respaldo suficiente y nuevas lineas no aporten candidatos materialmente mejores, o cuando se alcance el limite de investigacion. Estos criterios son hipotesis operativas del piloto.

Al alcanzar el limite sin respaldo suficiente, informar resultado parcial/no concluyente, no afirmar exhaustividad ni rellenar con candidatos no investigados. Medir concentracion geografica, repeticion y calidad, no solo numero de consultas.

## 7. Fuentes y verificacion

Estados de cada condicion por candidato:

- `supported`: evidencia pertinente, actual y suficiente para la afirmacion concreta.
- `violated`: incumplimiento comprobado.
- `unknown`: falta evidencia, hay conflicto o los datos del usuario son insuficientes.
- `not_applicable`: no corresponde a esa propuesta y existe razon explicita.

`supported` no garantiza entrada, disponibilidad o coste final. La conclusion debe corresponder al alcance de la evidencia.

| Dato | Fuentes apropiadas y cautelas |
| --- | --- |
| Descubrimiento/experiencias | Fuentes locales, operadores, organismos de destino y relatos; confirmar acceso y disponibilidad |
| Entrada y transito | Autoridades oficiales/consulares y fuentes operativas adecuadas al pasaporte, residencia, ruta, duracion y proposito |
| Transporte | Operadores, horarios y rutas reales; considerar fecha, conexiones y traslados |
| Costes | Precios consultados con fecha y condiciones; todos los componentes relevantes y conversion identificada |
| Clima/temporada | Datos pertinentes a region y periodo; promedios no son pronosticos |
| Accesibilidad/alimentacion | Condiciones concretas del servicio/proveedor; declaraciones genericas del destino no bastan |
| Seguridad y acceso | Fuentes oficiales relevantes, avisos y condiciones locales; no etiquetas universales de pais seguro |

Usar IA para interpretar fuentes y descubrir, no para citar su memoria como comprobacion. No inventar URLs, precios, ceremonias o conexiones.

Para fuentes conflictivas, priorizar autoridad y actualidad pertinentes y mantener incertidumbre si no se resuelve. Definir frescura por tipo de dato: un precio debe consultarse para la busqueda/fechas relevantes, no reutilizarse como actual por aparecer en un texto antiguo.

No prometer acceso a familias, comunidades, rituales o espacios privados sin una oferta verificable, consentimiento y condiciones apropiadas. Novedad no justifica explotacion cultural, dano ambiental ni contacto perjudicial con fauna.

Las restricciones legales y exclusiones de seguridad operativas deben ser explicitas, revisadas antes del piloto y aplicadas sin discriminacion. No improvisar criterios normativos de riesgo con el LLM; tampoco recomendar como comprobada una propuesta con conflicto esencial no resuelto.

## 8. Tiempo disponible y desplazamientos

El tiempo disponible comprende desde salir del punto de partida hasta regresar. Calcular en tiempo transcurrido, no restando horas locales sin zonas horarias.

```text
outbound = access_to_departure_point
         + required_check_in_or_wait
         + main_transport_and_connections
         + transfer_to_recommended_area

return = equivalent_components_for_return
usable_time = total_available_time - outbound - return
```

No suponer ida y vuelta simetricas. Si hay itinerario real, calcular la estancia util con sus horarios y no sumar dos veces esperas ya incluidas en el tiempo total.

Los desplazamientos internos entre bases forman parte de la carga de viaje; comprobar por separado que las experiencias caben. Fatiga o recuperacion pueden aconsejar margen, pero no se presentan como hechos individuales sin contexto.

Reglas:

1. Respetar maximo explicito por trayecto, incluyendo conexiones y traslados.
2. Respetar ventana total y fechas. Si hay rango, declarar la duracion necesaria; una opcion de cinco dias no se vende como compatible con tres.
3. Para 3-5 dias, excluir candidatos con trayectos de 12 horas o mas por sentido. Esta operacionalizacion cubre el caso de 12-18 horas acordado y es un umbral de piloto, no una ley general del turismo.
4. Exigir que el tiempo restante permita disfrutar el enfoque propuesto con el ritmo declarado. Caber tecnicamente no basta.
5. No extender automaticamente el umbral de 12 horas a viajes de otra duracion. Evaluar tiempo aprovechable y condiciones; no imponer limites globales de alcance.
6. Si una estimacion es un intervalo y podria incumplir un limite, el cumplimiento queda desconocido hasta contrastar; no elegir su extremo favorable.
7. Sin origen/duracion, no afirmar proporcionalidad. Mostrar duracion sugerida y comprobacion pendiente.

No fijar una proporcion universal desplazamiento/estancia como unica regla. Antes del piloto, probar reglas con rutas de ejemplo y revision humana; documentar criterios usados para decidir adecuacion fuera del caso explicito.

## 9. Presupuesto e historial

### Coste comparable

Normalizar presupuesto total del grupo o por persona sin perder su significado. Estimar transporte principal, equipaje/cargos relevantes, alojamiento, comida, transporte local, actividades y otros costes inevitables correspondientes a lo que incluye el presupuesto.

No declarar viabilidad porque vuelos y alojamiento caben si se omiten componentes incluidos por el usuario. Costes compartidos no se multiplican como individuales. Tener en cuenta necesidades del grupo y duracion.

Convertir a USD con fuente y fecha; guardar moneda original. Si el rango estimado podria superar el tope, mantener pendiente hasta afinar o descartar su presentacion como compatible. Precios puntuales bajos no demuestran disponibilidad para el grupo o fechas.

### Novedad

Aplicar el alcance de repeticion declarado. Pedir detalle regional si una exclusion podria ser demasiado amplia. Historial parcial no permite afirmar ausencia de visita.

Antes del feedback, distinguir novedad respaldada por historial de novedad supuesta. La pregunta `already on your radar` mide descubrimiento declarado despues, no puede adivinarse con seguridad desde los lugares visitados.

## 10. Afinidad y seleccion

No hay una suma global que permita compensar un limite con intereses atractivos.

### Filtro de elegibilidad

- Descartar incumplimientos esenciales confirmados.
- Una condicion esencial desconocida impide etiquetar el candidato como ajustado a viaje concreto.
- En inspiracion, permitir candidatos con pendientes visibles, salvo incumplimientos de limites ya declarados.
- Sin suficientes candidatos adecuados, entregar menos o explicar insuficiencia y ofrecer ajustes explicitos.

### Ranking inicial explicable

Evaluar para cada candidato:

| Criterio | Evaluacion ordinal |
| --- | --- |
| Interes prioritario habitual | fuerte / parcial / desconocida / incompatible |
| Motivacion prioritaria actual | fuerte / parcial / desconocida / incompatible |
| Otros intereses seleccionados | respaldo individual, sin contar atributos irrelevantes |
| Ritmo, comodidad y autonomia | adecuado / compromiso aceptable / desconocido / incompatible |
| Necesidades comunicadas del grupo | adecuadas / pendientes / incompatibles |
| Calidad de evidencia | suficiente / limitada / conflictiva |
| Descubrimiento personal | respaldado / posible / desconocido / repeticion permitida |

Comparar primero candidatos con cumplimiento esencial y afinidad fuerte en las prioridades explicitas. No decidir entre interes personal y motivacion actual con una prioridad inventada: si compiten, conservar alternativas con enfoques distintos o aclarar durante refinamiento.

Dentro de ese conjunto, preferir mejor adecuacion y evidencia, luego descubrimiento relevante. Una preferencia flexible puede representar un compromiso visible, nunca un incumplimiento esencial oculto.

El ranking del piloto usa estas evaluaciones y justificaciones estructuradas, sin pesos numericos presentados como validados. Empates restantes se resuelven por menor incertidumbre y menor carga de desplazamiento cuando es pertinente; si persisten, registrar la equivalencia y el desempate, no afirmar superioridad objetiva.

### Terna y principal

Seleccionar el candidato mejor respaldado como principal. Elegir otros dos con diferencias utiles de experiencia, entorno o escala, dentro del conjunto adecuado. No introducir una opcion incompatible para diversificar.

Para inspiracion sin condiciones, admitir diferentes escalas; con 3-5 dias, diversidad dentro de esa ventana. No existe una cuota de destinos exoticos ni destinos distintos de los dados a otros usuarios.

Primera entrega: afinidad y descubrimiento moderado. Una ampliacion de intereses solo si hay respaldo razonable y explicacion; no imponer una opcion atrevida. `Surprise me a little more` amplia exploracion entre candidatos adecuados, no riesgo, precio o limites.

## 11. Explicacion y entrega

Redactar en ingles desde evidencia del perfil y del candidato. Dos razones concretas, aporte de descubrimiento con cautela, experiencias verificables, duracion y desplazamientos pertinentes, compromiso y pendientes.

No usar diagnosticos, promesas de transformacion, porcentajes de match ni `perfect destination`. No asegurar que el usuario nunca lo habria imaginado; el feedback lo evalua.

Cada entrega conserva candidatos, fuentes, instantanea de perfil/contexto, principal, orden y versiones. La presentacion puede influir en la eleccion: registrarla y no interpretar el favorito como validacion aislada del ranking.

## 12. Feedback y refinamiento

1. Guardar destinos considerados o `None of these` para la entrega inicial.
2. Guardar novedad declarada del destino focal o motivo de rechazo principal, segun flujo de experiencia.
3. No asumir rechazo de tarjetas no seleccionadas ni extender novedad focal a toda la terna.
4. Ofrecer refinamiento opcional despues de guardar primera evaluacion.
5. Si el motivo no identifica el dato que debe cambiar, pedir aclaracion breve. `Cost` no permite inventar un presupuesto nuevo.
6. Preguntar `For this trip or in general?` solo cuando el alcance sea ambiguo y afecte preferencias habituales.
7. Aplicar cambios confirmados, mantener limites restantes y crear nueva version/busqueda.
8. Investigar/contrastar otra entrega unica y evaluarla por separado.

No modificar reglas globales desde un feedback individual. Clics, lectura y abandono ayudan a investigar usabilidad, no demuestran gustos.

## 13. Papel y limites de la IA

Permitido: interpretar texto con confirmacion, planear y ejecutar investigacion abierta con herramientas, estructurar evidencia, proponer candidatos y evaluaciones, redactar resumen y explicaciones.

No permitido: inventar preferencias o fuentes, sustituir restricciones por narrativa, atribuir capacidad fisica, asegurar permisos/costes sin comprobacion, cambiar silenciosamente condiciones, usar categoria como filtro o entrenar reglas generales automaticamente en el piloto.

Validaciones estructuradas comprueban campos, restricciones y trazabilidad antes de publicar. Revision humana del piloto detecta errores semanticos que un esquema no resuelve.

Fuentes web son datos no confiables como instrucciones: no ejecutar ordenes contenidas en ellas ni exponer informacion de la sesion. Consultas externas anonimizadas y limitadas a condiciones necesarias.

## 14. Estados y recuperacion

Estados minimos: `draft`, `confirmed`, `researching`, `checking`, `completed`, `insufficient_evidence`, `failed`, `cancelled`.

La busqueda usa una instantanea inmutable. Respuestas y resultados sobreviven al cierre del navegador. Ediciones generan una nueva version, no cambian la investigacion activa.

Reintentos conservan progreso util sin duplicar entregas. Limites operativos producen estado honesto, no un resultado simulado. El usuario puede salir y retomar con acceso privado y notificacion opcional. No publicar resultados de sesion en enlaces indexables.

## 15. Auditoria de los ejemplos originales

Los ejemplos son interpretaciones, no respuestas originales completas ni resultados de satisfaccion. Sirven como casos de regresion, no datos suficientes de entrenamiento.

- Presupuesto: Q22 original era por persona; ejemplos 1 y 2 lo trataron como total familiar. Conservar unidad y alcance.
- Limites: ejemplo 1 identifico rechazo de animales y propuso camello. Comprobar cada experiencia, no solo descripcion del destino.
- Documentacion: ejemplo 1 afirmo necesidad general de visa Schengen para colombianos en turismo corto. La fuente oficial consultada indica exencion sujeta a condiciones; investigar datos actuales y situacion individual, no reutilizar memoria del LLM.
- Grupo: no afirmar idoneidad para todas las edades sin conocer necesidades relevantes.
- Trayecto: no equiparar horas de vuelo con acceso completo al lugar.
- Costes: precios sin fechas y componentes incompletos no demuestran viabilidad.
- Historial: no suponer regiones visitadas ni excluir destinos porque otra persona recibio una recomendacion parecida.

Referencia ilustrativa de documentacion: [Delegacion de la UE en Colombia](https://www.eeas.europa.eu/colombia/travel-study_en?s=160). La pagina contiene informacion historica y apartados desactualizados; no se incorpora como base normativa permanente del motor. Consultar fuentes vigentes por busqueda.

## 16. Protocolo de validacion

### Etapa 1: pruebas observadas

Incluir distintos niveles de experiencia viajera y dominio del ingles, origenes, viajes cortos/largos, grupos y necesidades especificas. Observar interpretacion de escenas, recuerdo, presupuesto, tiempo total, resumen y feedback.

Propuesta operativa: dos rondas pequenas de aproximadamente 5-8 participantes con contextos diversos, corrigiendo entre rondas. No permiten estimar tasas globales ni validar todo el publico mundial.

### Etapa 2: piloto autonomo

Versionar captura, reglas, prompts y presentacion. Registrar muestra y condiciones; analizar modos de entrada por separado. No extrapolar una muestra concentrada a todos los mercados.

No fijar porcentajes arbitrarios de exito antes de tener una linea base. Establecer objetivos cuantitativos despues de la primera ronda y compararlos con versiones posteriores bajo condiciones semejantes.

### Metricas

| Metrica | Definicion |
| --- | --- |
| Tiempo activo | Captura hasta confirmacion, separado de inactividad y espera de IA |
| Espera de investigacion | Inicio a entrega; distribucion, fallos y recuperaciones |
| Finalizacion | Confirmaciones sobre inicios; desglosada por entrada y contexto |
| Correccion de perfil | Que afirmaciones se modifican y por que; corregir no siempre implica mala experiencia |
| Encaje inicial | Entregas con al menos un destino considerado entre quienes respondieron feedback |
| Descubrimiento util | Destino focal considerado que no se conocia o no se contemplaba; no representa toda la terna |
| Respeto de condiciones | Incumplimientos detectados y esenciales pendientes; revision de una muestra, no solo reportes |
| Refinamiento | Mejora/mantenimiento/empeoramiento entre evaluaciones comparables; reportar sesgo de autoseleccion |
| Cobertura narrativa | Sin categoria, rechazos de nombres, empates y distribucion |
| Amplitud de busqueda | Repeticion de lugares, diversidad contextual y cobertura de fuentes |

Feedback omitido no equivale a insatisfaccion ni satisfaccion. Reportar tasa de respuesta. La eleccion depende de presentacion, fotos y orden, no solo del algoritmo.

### Casos de prueba obligatorios

1. Mismo perfil y categoria, dos viajes distintos: resultados adaptados sin reescribir preferencias.
2. Solo cambian nombres narrativos: candidatos y ranking no cambian.
3. Viaje de 3-5 dias con trayectos de 12-18 horas: candidato excluido.
4. Rango 3-5 dias y propuesta de cinco: duracion necesaria explicita, no compatible con todo el rango.
5. Vuelo corto con conexion/traslado largo: tiempo puerta a zona calculado.
6. Presupuesto por persona frente a total del grupo: estimacion y filtro correctos.
7. Alergia, accesibilidad o limite de animales: ninguna experiencia incompatible presentada como adecuada.
8. Documentacion incompleta de grupo: no declarar entrada de todos comprobada.
9. Inspiracion sin origen/duracion: propuestas diversas, accesibilidad pendiente.
10. Historial parcial o repeticion permitida: no exclusiones ni novedad afirmada sin respaldo.
11. Intereses urbanos/entretenimiento sin categoria elegible: resumen util sin fallback.
12. Feedback de coste sin cantidad: aclaracion, no presupuesto inventado.
13. Edicion durante investigacion: instantanea conservada y nueva busqueda identificada.
14. Salida, recuperacion y reintento: sin perdida de datos ni entregas duplicadas.
15. Fuentes contradictorias/no disponibles: estado pendiente o insuficiente, no datos fabricados.

## 17. Versionado y ajustes

Cada cambio general documenta motivo, evidencia, version y efecto esperado. Comparar resultados antes/despues; conservar capacidad de revertir reglas del producto sin borrar datos originales del usuario.

Hipotesis a evaluar: diez escenas, hasta tres intereses, prioridad, un matiz, tiempos de captura, asignacion ordinal de categorias, tres lineas minimas de investigacion, seleccion de destino focal, criterios de afinidad y adecuacion temporal fuera del caso 3-5 dias.

Antes de abrir el piloto se deben fijar limites operativos de investigacion, politica de retencion/consentimiento, proveedores y frescura por dato, y criterios revisables de seguridad. Son decisiones de implementacion y operacion; no preferencias que la IA pueda inventar.

## 18. Fundamento y limitaciones

- [Context-Aware Recommender Systems](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_7): justifica considerar tiempo, ubicacion y compania. Se consulto el resumen publico, no se reproduce ni valida un algoritmo especifico.
- [NN/G, Personalization](https://www.nngroup.com/articles/personalization/): corregibilidad y limites de inferir futuro desde acciones previas.
- [Hilton 2026](https://stories.hilton.com/2026-trends) y [Hilton 2027](https://stories.hilton.com/2027-trends): senales comerciales de motivaciones y combinaciones. No evidencia suficiente de categorias universales.

La investigacion inicial no es una revision sistematica exhaustiva ni demuestra que este diseno supere al cuestionario anterior. Los documentos definen una propuesta coherente que debe validarse con personas reales y recomendaciones auditadas.

# Off the List: perfiles, categorias y condicionantes

Estado: modelo acordado para un piloto; categorias narrativas y reglas pendientes de validacion empirica.

La captura se define en [user-experience.md](user-experience.md). La asignacion y recomendacion se especifican en [profile-and-recommendation-logic.md](profile-and-recommendation-logic.md).

## 1. Distincion fundamental

La categoria es un nombre evocador. El perfil es el conjunto de preferencias, prioridades, matices y evidencia de la persona. El contexto describe este viaje. Las restricciones indican que debe respetarse o comprobarse.

La recomendacion usa el perfil completo y el contexto, no una lista de destinos asociada a la categoria. Dos personas con la misma categoria pueden recibir recomendaciones totalmente diferentes.

El perfil pertenece a quien responde. Las preferencias o condiciones comunicadas para acompanantes se guardan en el contexto del viaje, con procedencia indirecta. No se conoce automaticamente el perfil del grupo.

## 2. Capas del modelo

| Capa | Ejemplos | Persistencia y efecto |
| --- | --- | --- |
| Preferencias habituales | Gastronomia, naturaleza, autonomia, comodidad | Reutilizables y editables; no inmutables |
| Prioridades habituales | Aprender influye mas que otros intereses | Orientan afinidad; no anulan limites |
| Categoria narrativa | The Deep Diver | Sintesis secundaria; no filtra ni ordena destinos |
| Contexto de viaje | Descansar, viajar con ninos, celebrar, ritmo | Se revisa por viaje; modifica resultados |
| Condiciones practicas | Origen, tiempo, presupuesto, transporte, documentacion | Determinan alcance y viabilidad |
| Limites y necesidades | Sin barcos, accesibilidad, alergia | Excluir incumplimientos o exigir comprobacion |
| Historial y alcance de novedad | Regiones visitadas, disposicion a repetir | Evitar repeticiones solo segun eleccion explicita |
| Feedback | Consideraria, rechazo por trayecto, novedad | Ajusta la busqueda; cambios habituales requieren evidencia o confirmacion |

Una condicion esencial puede ser habitual, pero debe poder confirmarse para el viaje. No asumir que siguen vigentes origen, salud funcional, presupuesto o grupo de una sesion anterior.

## 3. Dimensiones personales

### Intereses combinables

Las escenas representan gastronomia, historia/patrimonio/formas de vida, vida urbana/arquitectura, naturaleza/ecosistemas, agua/costas, desafio, conexion humana, creatividad/artes/oficios, entretenimiento y disfrute del entorno/alojamiento.

No son extremos de una sola escala ni categorias mutuamente excluyentes. Elegir naturaleza no implica rechazar ciudades; elegir agua no implica nadar; disfrutar del alojamiento no implica lujo.

Cada interes tiene estado `declarado`, `interpretado pendiente`, `confirmado`, `corregido` o `desconocido`, prioridad opcional y matices. El estado de evidencia no equivale a intensidad.

### Autonomia y estructura

Plan organizado, estructura parcial, exploracion libre o dependiente de la experiencia. No inferir riesgo, irresponsabilidad ni rechazo de guias. Se puede preferir autonomia general y acompanamiento en actividades concretas.

### Comodidad

Importancia de comodidad/conveniencia, aceptacion de sencillez o incomodidad contextual. No determina gasto ni capacidad economica. Las condiciones minimas explicitas prevalecen.

### Ritmo habitual

Profundizar y disfrutar sin prisas frente a variedad de actividades. En el recorrido minimo no se pregunta como escala independiente: queda desconocido salvo declaracion, recuerdo confirmado o edicion del resumen.

El ritmo del proximo viaje no se utiliza para completar este dato automaticamente. Si hace falta para una categoria narrativa, se puede confirmar en la revision opcional; no anadir otra pregunta obligatoria.

### Conexion social

Interes por encuentros humanos, actividades compartidas y tiempo privado. Seleccionar conexion indica afinidad por esa experiencia, no extroversion ni necesidad constante de compania. La cuota de tiempo social queda desconocida salvo declaracion.

### Apertura al descubrimiento

Afinidad habitual por novedades, si existe evidencia explicita o confirmada. Distinguirla del alcance de repeticion elegido para este viaje y del control de sorpresa en refinamiento.

No es tolerancia a peligro, incomodidad ni distancia. Si no se captura, el motor utiliza el descubrimiento moderado acordado como criterio editorial, no como rasgo supuesto.

### Capacidad e intensidad fisica

Separar interes por desafios, intensidad deseada ahora y limites funcionales actuales. Una persona puede disfrutar senderismo y necesitar actividades de bajo impacto en este viaje.

No inferir capacidad de edad, categoria, imagen o motivacion. Si una propuesta requiere una capacidad concreta, confirmarla o no presentarla como adecuada.

## 4. Evidencia y correccion

Cada afirmacion conserva su respuesta de origen, alcance personal/grupo/viaje, fecha y estado de confirmacion. Las versiones permiten explicar que cambio y por que.

Orden de precedencia:

1. Correccion explicita vigente para el alcance correspondiente.
2. Declaracion o confirmacion explicita.
3. Interpretacion pendiente, util para explorar pero no para afirmar ni excluir.
4. Desconocido: ausencia de evidencia, no punto medio ni permiso.

Las selecciones visuales son declaraciones sobre el contenido descrito, no pruebas de rasgos secundarios. Un recuerdo interpretado no tiene mas autoridad por estar redactado con detalle.

Ejemplo: `I enjoyed finding restaurants without a schedule` respalda gastronomia y posiblemente flexibilidad. No demuestra comida callejera, multitudes, viajes sin reservas o rechazo de restaurantes conocidos.

Las restricciones mencionadas en texto no se ignoran mientras se confirman. Una posible alergia o barrera de accesibilidad se registra como necesidad pendiente y exige aclaracion o precaucion, nunca como ausencia de limite.

## 5. Catalogo de siete categorias

Los nombres mantienen el patron evocador de las categorias originales. No son diagnosticos, segmentos cientificamente validados ni identificadores unicos. Pueden ser compartidos, editados u omitidos.

### The Pioneer

Idea: descubrir y ampliar horizontes.

Descripcion propuesta:

> You are drawn to discoveries that broaden your view: a place, an experience or a different way to see somewhere familiar.

Evidencia: novedad como preferencia habitual explicita, no solo deseo de un pais nuevo esta vez.

Impacto indirecto: valorar descubrimientos relevantes cuando el perfil los respalda. No supone destinos remotos, infraestructura limitada o rechazo de sitios populares. Sin evidencia habitual no se asigna por defecto.

### The Edge Walker

Idea: disfrutar de un desafio con sentido.

> A meaningful challenge can be part of what makes a trip memorable for you, whether it asks you to move, learn or try something unfamiliar.

Evidencia: desafio entre intereses y especialmente como prioridad; confirmar su naturaleza cuando sea relevante.

Impacto indirecto: experiencias exigentes compatibles con intensidad y capacidad actuales. No promete peligro, ausencia de infraestructura ni prohibe descanso, piscina o transporte comodo.

### The Quiet Seeker

Idea: saborear lugares y experiencias sin prisas.

> You value time to settle into a place, notice its details and enjoy experiences without rushing through them.

Evidencia: preferencia habitual por profundidad pausada, declarada o confirmada. Descansar ahora, disfrutar un alojamiento o seleccionar playa no bastan.

Impacto indirecto: bases estables y tiempo para disfrutar cuando el contexto lo permita. No implica introversion, poca actividad fisica ni rechazo de ciudades. Ritmo actual puede ser distinto.

### The Connector

Idea: descubrir mediante encuentros humanos.

> Encounters and shared experiences help you connect with a place, while leaving room for the balance of company and privacy you enjoy.

Evidencia: conexion humana declarada y especialmente prioritaria.

Impacto indirecto: experiencias compartidas con consentimiento y contexto local. No impone socializacion constante, cenas acompanadas ni acceso a espacios privados o ceremonias.

### The Deep Diver

Idea: comprender y aprender.

> You enjoy going beyond the highlights to understand a place through its stories, ideas, people and practices.

Evidencia: comprender o aprender como interes habitual confirmado; historia, arte, ciencia, oficios o cultura contemporanea pueden respaldarlo.

Impacto indirecto: experiencias con contenido y oportunidad de profundizar. No limita al patrimonio antiguo, espiritualidad ni itinerarios intelectualmente intensivos.

### The Naturalist

Idea: explorar paisajes y vida natural.

> Landscapes, ecosystems and the natural world give you compelling reasons to explore, at the pace and level of comfort that suit you.

Evidencia: naturaleza/ecosistemas como interes y especialmente prioridad. Agua por si sola no prueba interes por ecosistemas.

Impacto indirecto: contacto apropiado con entornos naturales. No implica senderismo, camping, contacto cercano con animales ni renuncia a alojamiento comodo. Evaluar bienestar animal y acceso responsable.

### The Epicure

Idea: descubrir mediante sabores.

> Food and flavours help you discover a place, from everyday specialities to the experiences you most enjoy around them.

Evidencia: gastronomia como interes y especialmente prioridad, con matices de probar, aprender, cocinar o compartir.

Impacto indirecto: riqueza gastronomica y experiencias compatibles con necesidades alimentarias. No implica lujo, picante, alcohol, comer cualquier cosa ni clases de cocina obligatorias.

## 6. Cobertura y limites del catalogo

El catalogo mezcla intereses y formas de disfrutar; no se compara como una escala psicometrica unica. La categoria se elige despues del perfil y no alimenta la busqueda.

Vida urbana, agua, creatividad, entretenimiento y disfrute del alojamiento pueden dominar una recomendacion sin tener nombre propio. Si los siete nombres no representan el patron, mantener el resumen sin categoria en lugar de forzar una etiqueta. Registrar estos casos para revisar cobertura con usuarios.

Asignacion automatica solo con respaldo claro. Si dos categorias tienen apoyo similar, eleccion narrativa opcional entre ambas; `Neither feels right` y omision disponibles. Elegir un nombre no crea evidencia de preferencias.

Sin coincidencia no se usa `The Seeker`, ni otra categoria, como fallback universal.

## 7. Auditoria del modelo anterior

| Elemento anterior | Problema | Tratamiento nuevo |
| --- | --- | --- |
| The Pioneer | Novedad equiparada con poca popularidad | Descubrimiento personal, compatible con comodidad |
| The Edge Walker | Desafio confundido con peligro y rechazo del ocio | Desafio separado de riesgo y capacidad |
| The Quiet Seeker | Ritmo mezclado con esfuerzo e identidad social | Preferencia pausada solo con evidencia habitual |
| The Connector | Encuentros convertidos en socializacion obligatoria | Afinidad social sin prohibir privacidad |
| The Wanderer | Estilo de planificacion tratado como tipo exclusivo | Autonomia transversal |
| The Still Point | Necesidad de recuperacion tratada como identidad | Motivacion actual y preferencias de entorno |
| The Deep Diver | Profundidad centrada en historia/espiritualidad | Comprender y aprender en distintas disciplinas |
| The Seeker | Transformacion y fallback sin evidencia | Motivacion actual; sin categoria por defecto |
| Reglas Q7/Q26/Q28 y similares | Coincidencias exactas, solapamientos y poca cobertura | Evidencia multidimensional y revision explicita |
| Destinos ejemplares por categoria | Riesgo de listas repetitivas y obsolescencia | Busqueda abierta por preferencias/contexto |

No se trasladan los absolutos `Your trip will never include` salvo limites expresados por el usuario o exclusiones legales/operativas justificadas.

## 8. Contexto y condicionantes

| Parametro | Efecto sobre destinos y experiencias | Lo que no cambia automaticamente |
| --- | --- | --- |
| Motivacion | Prioridad de descanso, aprendizaje, compania, reto o celebracion | Categoria y gustos habituales |
| Ritmo actual | Carga de agenda, bases y traslados locales | Capacidad fisica o ritmo habitual |
| Compania y necesidades | Accesibilidad, variedad, edades, tiempos compartidos | Perfil individual de cada acompanante |
| Presupuesto | Coste total comparable y destinos factibles | Afinidad por comodidad o gastronomia |
| Tiempo disponible | Viaje completo, desplazamiento y tiempo aprovechable | Intereses personales |
| Maximo por trayecto | Exclusion de conexiones y traslados excesivos | Deseo habitual de novedad |
| Origen y transporte | Acceso real, rutas, conexiones y esfuerzo | Preferencias de destinos por categoria |
| Fechas/temporada | Clima, afluencia, experiencias disponibles, costes | Gustos de largo plazo |
| Documentacion | Entrada y transito segun datos del grupo | Preferencias culturales |
| Necesidades funcionales | Actividades y servicios comprobables | Interes por desafio o naturaleza |
| Historial y repeticion | Novedad local/regional o de experiencia | Exclusiones de paises no solicitadas |
| Sorpresa en refinamiento | Exploracion mas o menos cercana a preferencias | Limites, seguridad y presupuesto |

No pedir estado civil, ingresos, diagnostico o situacion emocional general cuando basta con sus efectos sobre el viaje. Celebrar un hito no demuestra necesitar transformacion.

## 9. Restricciones y preferencias flexibles

- Limite explicito: excluir experiencias incompatibles y destinos donde sean inevitables.
- Preferencia flexible: favorecer opciones adecuadas sin tratarla como prohibicion universal.
- Necesidad verificable: comprobar condiciones especificas antes de afirmar compatibilidad.
- Condicion practica firme: presupuesto, fechas, duracion o maximo de trayecto; margen solo si se especifica.
- Requisito legal o exclusion de seguridad aplicable: no se compensa con afinidad ni se elude con el control de sorpresa.

Una exclusion de actividad no suele equivaler a excluir un destino. Sin barcos puede ser compatible con una costa, pero no con una propuesta cuyo acceso exige una travesia no aceptada.

Algunas necesidades corresponden a un participante: no eliminarlas al promediar intereses del grupo. Sin datos necesarios, mantener estado pendiente.

## 10. Escenarios de cambio

### Perfil gastronomico y cultural, familia

Preferencias: gastronomia, patrimonio, autonomia parcial y comodidad. Este viaje: ninos pequenos, descanso y pocos traslados.

Efecto: una base adecuada, experiencias cercanas y tiempos compatibles. No asignar destinos exclusivamente por `The Epicure` ni asumir que todos quieren cocinar.

### Afinidad por desafio con limitacion actual

Preferencias: naturaleza y desafio. Este viaje: movilidad limitada, sin esfuerzo significativo.

Efecto: naturaleza accesible y desafios no fisicos cuando interesen. No recomendar actividad exigente por categoria ni eliminar toda naturaleza.

### Mismo perfil, duracion distinta

Tres a cinco dias desde un origen concreto: excluir trayectos de 12-18 horas por sentido y priorizar tiempo aprovechable. Varias semanas: ampliar acceso cuando encaje con las condiciones.

Efecto: destinos distintos con las mismas preferencias; categoria no necesita cambiar.

### Inspiracion abierta

Sin duracion, origen ni presupuesto: propuestas de diferentes escalas, con datos pendientes. No afirmar precio total desde origen desconocido ni novedad personal sin historial.

## 11. Feedback y evolucion

- `No for this trip` no equivale a rechazo habitual.
- Rechazo por trayecto modifica alcance de busqueda, no interes por experiencias.
- Correccion `I prefer tasting food, not cooking` modifica un matiz habitual si el usuario confirma ese alcance.
- Aceptacion de un destino no prueba afinidad por cada uno de sus atributos.
- Novedad declarada para una tarjeta no se extrapola a las otras ni a un pais entero.
- La categoria puede permanecer estable al cambiar el viaje y cambiar si se corrigen preferencias. No es permanente ni se recalcula arbitrariamente por presupuesto.

El piloto no actualiza reglas generales automaticamente. Cambios revisados, versionados y evaluados.

## 12. Realidad del turismo y evidencia

Las tendencias consultadas respaldan explorar motivaciones y combinaciones, no demuestran una taxonomia universal de viajeros.

- [Hilton 2026 Trends](https://stories.hilton.com/2026-trends): motivaciones, descanso, comodidad y composiciones familiares. Encuesta Ipsos de junio de 2025 a 14.009 adultos de 14 paises que planeaban viajar; muestra online no probabilistica e informe comercial. No representa por igual todos los viajeros o paises.
- [Hilton 2027 Trends](https://stories.hilton.com/2027-trends): combinacion de autonomia y compania, aventura y recuperacion, estructura y flexibilidad; pronostico comercial, no resultado garantizado del futuro.
- [Context-Aware Recommender Systems](https://link.springer.com/chapter/10.1007/978-0-387-85820-3_7): fundamento para considerar tiempo, lugar y compania. Se consulto el resumen publico, no el capitulo completo; no valida estos nombres ni pesos.

No incorporar una tendencia por popularidad si no corresponde a la persona. El catalogo sigue siendo una hipotesis narrativa: necesita contrastarse con usuarios de distintos contextos, incluyendo gustos sin categoria equivalente y diferentes niveles de dominio del ingles.

# Politicas de Implementacion

Estado: POC de captura e investigacion; no servicio de recomendaciones verificadas. Fecha: 2026-10-10.

## Referencias y Alcance

La plantilla original, refined y la plantilla enriquecida existente permanecen intactas. La sucesora es `system-prompt-form-capture-template.md`; `POC/reveal-template.js` exporta literalmente su contenido. La plantilla enriquecida aporta voz, trazabilidad y verificacion, pero sus cantidades por banda no constituyen aprobacion del usuario.

`POC/capture.js` es el contrato compartido: `captureDefaults`, `validateCapture(state)`, `captureSnapshot(state)`, `budgetReference(state)`, `CAPTURE_VERSION` y `POLICY_VERSION`. Las versiones son `trip-capture-2` y `trip-policy-2`. La validacion devuelve `{ready, issues: [{decision, message}], uncertainties, reviewRequired, recommendationVerified: false}`. El modelo no duplica esa validacion ni inventa integraciones. Una version no aprueba decisiones pendientes.

Nota de version: la ultima decision del usuario sustituye la antigua puerta de exportacion que exigia resolver todos los hechos esenciales. Se puede exportar una solicitud util con respuestas explicitas unknown/private y recibir una propuesta preliminar con puntos abiertos. No se conserva la antigua puerta F ni el requisito de salida exclusivamente aclaratoria. Esto no elimina los controles de un reveal comprobado.

## Puertas Separadas

- Borrador: admite faltantes, privados y contradicciones, conservando respuestas y necesidades.
- Captura lista: respuestas obligatorias explicitas, incluyendo unknown/private donde se ofrecen, y texto practico de necesidades conocidas. No significa hechos esenciales resueltos. `issues` contiene faltantes, respuestas invalidas o contradicciones; `uncertainties` supuestos abiertos; `reviewRequired` comprobaciones posteriores. Autoriza una propuesta util, no afirmar seguridad.
- Recomendacion comprobada: fuentes actuales de destino y experiencias, proveedor concreto, necesidades esenciales revisadas por una persona responsable, viabilidad y decisiones de politica aprobadas. La captura siempre devuelve `recommendationVerified: false`.
- `buildPrompt` valida siempre. Si faltan respuestas obligatorias devuelve un borrador que identifica esos problemas, sin convertir unknown respondido en pregunta faltante. Si esta lista, etiqueta `Travel proposal request / open points disclosed` y solicita una respuesta util ahora, con un candidato sorpresa claramente preliminar, esquema de cuatro pilares, hipotesis acotadas y siguientes comprobaciones. Incluso con todas las respuestas sustantivas desconocidas ofrece una forma ilustrativa conservadora, no una pared de preguntas ni garantias inventadas.
- `buildFinalPrompt` lanza un error cuando la captura no esta lista. Su nombre designa una solicitud para investigar, no una recomendacion ya verificada.

## Decisiones Pendientes

| Decision | Propuesta o tratamiento provisional | Puerta para cerrar reveal |
| --- | --- | --- |
| Numero de experiencias | PROPOSED: minimo una por pilar, dos desde EUR 3.500 por persona, dos o mas desde EUR 5.000. No reducir los cuatro pilares por la referencia original a 2-3 experiencias. | Aprobacion humana explicita del usuario; no existe aun. |
| Limites exactos de bandas | PROPOSED: 3.500 y 5.000 incluidos en la banda superior. | Aprobacion humana; no aplicar silenciosamente. |
| Grupos mixtos y menores | No confundir promedio matematico con asignacion real ni multiplicar costes compartidos. | Regla de banda y alcance aprobados para el grupo. |
| Expansion territorial | Estado soberano visitado excluye territorios segun mapa mantenido, verificado y fechado. La POC no incluye mapa ni normalizador. | Evidencia geografica real para la ruta. |
| Regla inversa, escalas y residencia | No definida; no inferir que visitar un territorio equivale a visitar todo el estado, ni decidir que una escala o residencia cuenta o no. | Resolucion humana especifica para la ruta, sin romper innecesariamente la sorpresa. |
| Canal privado | No integrado. Privado es respuesta valida y efecto funcional pendiente, no ausencia de necesidades ni revision realizada. | Resolver el efecto funcional por una persona responsable antes de un reveal comprobado; no bloquea captura lista ni propuesta preliminar. |
| Consentimiento excepcional | No recoger exenciones genericas anticipadas. Off-path 5 no es aventura maxima consentida para cualquier contexto. | Evidencia actual, conversacion y consentimiento posteriores para ruta concreta, con revision humana. |
| Datos y retencion | Exportar solo datos funcionales necesarios; alias e IDs anonimos, no numeros de documento ni expedientes. | Definir informacion, consentimiento, retencion y canal operativo antes de produccion. |

Estas propuestas permiten investigar conflictos; no habilitan un reveal completado hasta su aprobacion real. No se agrega un checkbox ficticio de aprobacion ni se encomienda al LLM fijar politica.

## Cuestionario por Viaje

`tripScreening` registra una sola vez food, mobility, altitude, health, access y pregnancy con yes/no/unknown/private. No hay screenings por viajero ni roster obligatorio. `essentialNeeds` requiere type y text practico; affected es descripcion anonima opcional. En alimento, el detalle manual practico basta para capturar; severidad, contacto cruzado, tipo de requisito y acceso medico son opcionales y permanecen desconocidos o requieren proveedor si no se suministran. No se exige repetirlos en otros campos. Las necesidades legacy siguen siendo restricciones funcionales sin reconciliacion ni registros duplicados obligatorios. No hay puerta de regex de diagnosticos ni checkbox freeTextReview.

Se usan cantidades genericas de adultos/menores y childAges, no identidades individuales. originMode admite known/unknown, youngChildrenStatus yes/no/unknown y personalStatementStatus written/unknown. Unknown no activa valores stale como confirmados. Se preservan intereses, prioridades, memorias literales, mejores viajes, aspiraciones, autonomia, comodidad, retos, alojamiento, ocasion, historia, ritmo, tiempos, transporte y presupuesto utiles. Se eliminan resumen y captura de documentos y soloSafety; no se pregunta nacionalidad, residencia, permisos ni genero.

## Presupuesto y Conversion

Moneda y alcance se eligen explicitamente, sin `budgetScope: group` ni moneda confirmada por defecto. Se conservan cap, rango, conceptos incluidos/excluidos, vuelos separados y margen acotado. Un rango inferior no es gasto obligatorio. Los margenes antiguos de necesidades firmes o esenciales se ignoran como permisos en resumen e instrucciones; captureSnapshot puede eliminarlos de la exportacion conforme a su contrato, sin alterar el estado original.

EUR es referencia de bandas, no reemplaza la moneda capturada. Una conversion externa necesita tasa, fuente y fecha verificables; la existencia de esos campos no demuestra autenticidad. Si falta, la solicitud pide investigacion de cambio y mantiene banda pendiente. No hay proveedor de divisas integrado, tasa inventada ni conversion USD/EUR implicita. EUR no necesita una fuente ficticia para identidad monetaria. EUR 6.500 es contexto comercial original, nunca default ni objetivo.

## Exclusiones y Fuentes

Se conserva un destino sorpresa elegido, sin terna final, y Adventure, Explore, Transform y Culture. No Paris, Londres ni repeticion conocida; las preferencias legacy de regresar no anulan la politica. Historia desconocida no permite verificar novedad, pero admite candidato preliminar claramente etiquetado. No paises que criminalicen relaciones entre personas del mismo sexo, sin preguntar orientacion sexual; los ejemplos originales no son una lista legal vigente. No conflicto ni avisos aplicables Do Not Travel/nivel 4. Nivel 3 requiere aventura maxima explicita, contexto regional comprobado, consentimiento posterior y revision humana. Seguridad solo se evalua conservadoramente sin solicitar identidad ni inferir excepciones.

Fuentes: MAEC, FCDO, US State Department; legislacion y autoridades sanitarias/de entrada actuales; operadores y proveedores para cada afirmacion concreta. Registrar URL, fecha de consulta, fecha del hecho/precio, alcance y estado `supported`, `violated`, `unknown` o `not_applicable` con razon. No inventar investigacion, ofertas, anfitriones ni acceso privado. Sin herramientas o con esenciales desconocidos no hay reveal comprobado.

Mas de 3.000 m requiere conversacion explicita aplicable; a 3.000 exactos no se activa ese umbral, pero siguen vigentes limites personales. Menores de cinco: excluir malaria e infraestructura medica limitada, preferir evitar tramos de vuelo mayores de diez horas donde sea posible. Menores de seis: prioridad de ritmo y rutina; edades desconocidas se manejan condicionalmente sin inventarlas. No convertir la preferencia de vuelos en prohibicion absoluta. Verificar alimento y contacto cruzado por necesidad/proveedor, acceso real y efectos funcionales; embarazo admite privacidad y decision informada sin autorizacion medica de IA. Alergia o seguridad desconocidas impiden afirmar ajuste verificado, no ofrecer ideas conservadoras condicionales y su siguiente control. No multiples vacunas obligatorias; separar recomendadas. Investigar reglas de entrada y transito de la ruta, dejando elegibilidad individual pendiente hasta conocer documentos reales despues. No pedir documentos ni informacion personal excesiva en la primera salida.

## Instantanea y Fidelidad

`captureSnapshot` define la whitelist de captura y excluye categoryChoice, sceneOrder y navegacion/UI, travellers, unassignedTravellers, documentos, passports, residence, permits, groupDocuments y controles retirados. El modelo preserva ademas `confirmationVersion` y `confirmedAt` de sesiones legacy como procedencia. `structuredInput` conserva valores funcionales y procedencia conforme a ese contrato; `profile` no es evidencia adicional y resume cantidades, childAges y screening una vez por viaje, sin diagnosticos ni resumen de documentos stale. Desconocidos respondidos se describen como supuestos abiertos, no lista de preguntas faltantes; solo issues genuinos de validacion bloquean buildFinalPrompt. Readiness y referencia presupuestaria se exportan separadamente. Cambios de grupo, fechas, necesidades o ruta requieren revalidacion por captura/UI.

Copiar o descargar comparte la instantanea con el proveedor de IA elegido. Borrar la sesion local no elimina copias externas. La POC no afirma borrado remoto, canal privado, proveedor de datos ni revision humana automatica.

# VÜO — Gestión de Solicitudes Internas

MVP de una aplicación web para registrar, consultar y dar seguimiento a solicitudes internas (facturas, préstamos, permisos, requerimientos de TI, etc.), construida sobre **n8n** como backend y un frontend de un solo archivo servido por el propio n8n.

> **Prueba técnica** — VÜO Partners, LTD. Entrega: 21 de septiembre de 2026.

---

## Índice

1. [Acceso a la demo](#1-acceso-a-la-demo)
2. [Arquitectura](#2-arquitectura)
3. [Cumplimiento del enunciado](#3-cumplimiento-del-enunciado)
4. [Decisiones técnicas](#4-decisiones-técnicas)
5. [Limitaciones conocidas](#5-limitaciones-conocidas)
6. [Cómo ejecutarlo desde cero](#6-cómo-ejecutarlo-desde-cero)
7. [Estructura del repositorio](#7-estructura-del-repositorio)

Para aprender a **usar** la aplicación, ver [`MANUAL.md`](MANUAL.md). Este README cubre el porqué de las decisiones y cómo poner el proyecto en marcha.

---

## 1. Acceso a la demo

**URL:** `https://n8n.mmont.com/webhook/app`

**No hay contraseña.** El acceso es por código de un solo uso enviado al correo.

**El acceso se da de alta bajo demanda.** Solo pueden entrar los correos registrados en la hoja `Usuarios`, así que durante la presentación basta con que me indiquen el correo con el que quieren entrar y lo habilito en el momento: agrego la fila, escriben su correo en la pantalla de acceso, y el código les llega a su propio buzón.

Es la misma vía que tendría un alta real en la empresa —el usuario no se registra solo, lo habilita quien administra el sistema— así que la demo muestra el flujo tal como funcionaría en producción, no un atajo.

El código vence a los **10 minutos** y admite hasta **5 intentos**.

---

## 2. Arquitectura

```
┌──────────────────────────────────────────────────┐
│  Navegador                                       │
│  vuo-frontend.html  (HTML + CSS + JS, 1 archivo) │
└───────────────────┬──────────────────────────────┘
                    │  fetch() + cookie httpOnly
                    ▼
┌──────────────────────────────────────────────────┐
│  n8n  (self-hosted, Docker sobre VPS Linux)      │
│                                                  │
│  00  GET   /webhook/app          → sirve el HTML │
│  01  POST  /webhook/auth/solicitar-codigo        │
│  02  POST  /webhook/auth/verificar-codigo        │
│  04  POST  /webhook/auth/logout                  │
│  05  GET   /webhook/solicitudes                  │
│  06  POST  /webhook/solicitudes                  │
│  07  GET   /webhook/solicitud?id=...             │
│  08  PATCH /webhook/solicitud                    │
│                                                  │
│  03  Sub-workflow: Validar sesion                │
│      (no expone webhook; lo invocan 05-08)       │
└──────────┬────────────────────────┬──────────────┘
           │                        │
           ▼                        ▼
   ┌───────────────┐        ┌───────────────┐
   │ Google Sheets │        │ Google Drive  │
   │ · Usuarios    │        │ documentos    │
   │ · Solicitudes │        │ adjuntos      │
   └───────────────┘        └───────────────┘
                    │
                    ▼
              ┌──────────┐
              │  Gmail   │  envío del código OTP
              └──────────┘
```

**Persistencia:** Google Sheets, con dos hojas.

- **`Solicitudes`** — la hoja suministrada en el enunciado: `ID Solicitud`, `Fecha Solicitud`, `ID Empleado`, `Solicitante`, `Correo`, `Area`, `Tipo Solicitud`, `Descripcion`, `Prioridad`, `Estado`, `Nombre Archivo`.
- **`Usuarios`** — agregada por mí para la autenticación: `Correo`, `Nombre`, `Rol`, `otp_hash`, `otp_expira`, `otp_intentos`, `token_hash`, `token_expira`, `ultimo_acceso`.

---

## 3. Cumplimiento del enunciado

| Requisito | Dónde se implementa | Estado |
|---|---|---|
| Login con control de acceso funcional | Flujos 01, 02, 04 + sub-workflow 03 | Completo |
| Listado de solicitudes desde el Sheet | Flujo 05 + `panel-lista` | Completo |
| Formulario para crear solicitud | Flujo 06 + `panel-crear` | Completo |
| Vista de detalle con documento de Drive | Flujo 07 + `panel-detalle` | Completo |
| Actualización de estado | Flujo 08 + selector en el detalle | Completo |
| README con ejecución y decisiones | Este archivo | Completo |
| Manual de uso | `MANUAL.md` | Completo |
| Presentación / demo | Sesión del 21/09 a las 2:00 p.m. | Pendiente |

**Funcionalidad agregada por encima de lo pedido:** ordenamiento por columna, filtros combinables (estado, área, tipo, prioridad, búsqueda de texto), paginación, anulación reversible de solicitudes, modo claro/oscuro persistente, diseño responsive y campos de identidad derivados de la sesión.

---

## 4. Decisiones técnicas

Esta es la sección que más me interesa defender, porque casi todas las decisiones fueron un intercambio entre algo y otra cosa.

### 4.1 Por qué n8n y no un backend tradicional

El enunciado daba libertad total de stack. Elegí n8n por tres razones:

1. **Es el terreno donde se me puede evaluar mejor.** La posición es de automatización de procesos; mostrar cómo modelo un proceso completo en n8n dice más de mí que un Express genérico.
2. **La integración con Google (Sheets, Drive, Gmail) es nativa**, con OAuth ya resuelto. Hacerlo a mano habría consumido buena parte de las 36 horas en plomería en vez de en el proceso.
3. **Cada endpoint es un flujo visual**, lo cual hace el sistema explicable a alguien que no lee código — que es exactamente la situación de una demo ante un área de negocio.

**El costo:** n8n no es un framework web. No hay middleware, ni router, ni ORM, ni tests automatizados del backend. En un sistema grande esto se vuelve limitante; para un MVP de 36 horas fue la decisión correcta.

**Cómo compensé la falta de middleware.** El problema evidente de no tener middleware es que cada endpoint tendría que repetir la validación de sesión, y cinco copias de la misma lógica de seguridad es exactamente donde aparecen los huecos: se corrige una y se olvidan las otras.

Por eso la validación de sesión vive en un **sub-workflow propio** (`03 - Sub: Validar sesion`), que no expone webhook y es invocado por todos los flujos que requieren autenticación (05 a 08). Es el equivalente funcional a un middleware: una sola implementación, un solo lugar donde corregir, y el mismo comportamiento garantizado en todos los endpoints.

### 4.2 Autenticación: OTP por correo, no JWT

Descarté JWT deliberadamente. El enunciado dice explícitamente que **no** se requiere JWT/OAuth/MFA, y un JWT bien hecho (firma, rotación, revocación) es bastante trabajo para un MVP; uno mal hecho es peor que no tenerlo.

Opté por **código de un solo uso enviado al correo corporativo**, que en este contexto tiene una ventaja real: el correo *es* el identificador del empleado en la hoja `Solicitudes`. No hace falta inventar un registro de contraseñas ni gestionar recuperación de cuenta.

El flujo completo:

```
Usuario escribe su correo
   → Flow 01 normaliza y busca en Usuarios
   → genera código de 6 dígitos
   → guarda SHA-256(correo:código:PEPPER) en la hoja, nunca el código en claro
   → envía el código por Gmail
   → responde SIEMPRE lo mismo, exista o no el usuario

Usuario escribe el código
   → Flow 02 recalcula el hash y compara
   → verifica vigencia (10 min) e intentos (máx. 5)
   → emite token de sesión de 32 bytes
   → guarda SHA-256(token:PEPPER_SESION), nunca el token
   → devuelve el token en cookie httpOnly; Secure; SameSite=Lax (8 h)
```

**Decisiones concretas dentro de ese flujo:**

- **Anti-enumeración de usuarios.** Un correo inválido o inexistente no produce error: el nodo de normalización lo convierte en un valor imposible (`__correo_invalido__`) para que la búsqueda no encuentre nada y la respuesta al cliente sea idéntica en todos los casos. Sin esto, un atacante puede mapear quién trabaja en la empresa probando correos.
- **La cookie es `httpOnly`, no `localStorage`.** Un token en `localStorage` es legible por cualquier script inyectado en la página; uno en cookie `httpOnly` no lo es. Es la diferencia entre que un XSS sea un problema y que sea un robo de sesión.
- **Nunca se almacena el código ni el token en claro**, solo su hash con pepper. Si alguien obtiene acceso de lectura a la hoja, no obtiene sesiones válidas.
- **Límite de 5 intentos** por código, con contador en la hoja, para cerrar la fuerza bruta sobre 6 dígitos.

### 4.3 SHA-256 implementado a mano

El nodo Code de esta instancia de n8n corre en un sandbox que bloquea `require('crypto')` y no expone Web Crypto. La alternativa era instalar un módulo externo en el contenedor, lo cual habría hecho el proyecto no reproducible para quien lo evalúe.

Implementé SHA-256 en JavaScript puro dentro del nodo y **verifiqué su salida contra `crypto.createHash('sha256')` de Node** antes de confiar en él.

**Limitación honesta:** los códigos se generan con `Math.random()`, que **no es criptográficamente seguro**. Un atacante que conozca el estado del generador podría predecir códigos. Lo acepté porque el mismo sandbox bloquea `crypto.randomBytes`, y porque las mitigaciones que sí están (vigencia de 10 min, máximo 5 intentos, hash con pepper) reducen bastante el riesgo real. En producción esto se resuelve moviendo la generación a un runtime sin sandbox o a un servicio externo.

Los peppers están **hardcodeados en los nodos**, no en variables de entorno. Es una deuda consciente: los flujos exportados se comparten como parte de la entrega y quería que fueran autocontenidos. En producción irían en credenciales de n8n o en variables de entorno del contenedor.

### 4.4 La identidad del solicitante viene de la sesión

En el formulario de creación, **Solicitante y Correo no son editables**: se llenan con los datos de la sesión y se muestran atenuados, con una nota que explica por qué.

Esto surgió de un error real durante las pruebas: como los campos eran texto libre, una solicitud quedó registrada con el texto `Préstamo` en la columna Solicitante. Pero el problema de fondo no era la calidad del dato, sino conceptual: si el sistema ya sabe quién inició sesión, permitir escribir otro nombre significa que cualquiera puede crear solicitudes a nombre de un tercero.

El blindaje va en dos capas: el input es `readonly`, y **el payload se arma desde la sesión, no leyendo el DOM** — si alguien edita el campo desde la consola del navegador, el servidor sigue recibiendo al usuario autenticado.

**Lo que falta:** la validación definitiva debería estar en n8n, ignorando por completo lo que venga en el body y derivando la identidad del token de sesión. Quien llame el webhook directamente con `curl` todavía puede mentir. Está identificado y es lo primero que cerraría.

### 4.5 Modelo de estados

Los cinco estados funcionan como una **secuencia lineal**, no como dos dimensiones independientes:

```
Pendiente → Aprobada → En Proceso → Completada
     └──────────┴──────→ Rechazada
```

- **Pendiente** — entró al sistema, nadie la ha revisado.
- **Aprobada** — pasó la validación, aún no se ejecuta.
- **En Proceso** — alguien la está trabajando.
- **Completada** — se resolvió.
- **Rechazada** — no pasó la validación.

Conceptualmente son dos ejes distintos (*validación* y *ejecución*), y se podrían modelar con dos columnas separadas. Con un solo campo `Estado` eso genera ambigüedad — una solicitud no puede estar "Aprobada" y "En Proceso" a la vez en una sola celda — así que los aplané en una sola secuencia donde cada estado significa exactamente una cosa. Para el alcance de este MVP, dos columnas habría sido sobreingeniería.

### 4.6 El borrado es lógico, no físico

La aplicación permite anular una solicitud, pero **la fila nunca se elimina de la hoja**: pasa al estado terminal `Anulada` y deja de aparecer en el listado operativo.

La razón es que en un sistema de solicitudes internas el historial *es* el valor. Saber que algo se pidió y se anuló importa tanto como saber que se aprobó, y un borrado físico destruye esa trazabilidad de forma irreversible. Con el borrado lógico el registro sigue auditable en la hoja y la acción se puede deshacer.

Cómo se comporta:

- El detalle tiene una acción **Anular solicitud**, separada visualmente del resto para que no se pulse por inercia, y con un diálogo de confirmación que explica exactamente qué va a pasar.
- Una vez anulada, la solicitud **desaparece del listado**. Para verla hay que pedirla explícitamente con el filtro de estado `Anulada`.
- Una solicitud anulada **no se puede editar**: en lugar del selector de estado aparece un botón **Restaurar solicitud**, que la devuelve a `Pendiente`. No tiene sentido cambiarle el estado a algo que está fuera de circulación.

**Detalle de implementación:** anular y restaurar no necesitaron un endpoint nuevo. Ambas operaciones son un cambio de estado sobre la fila, así que reutilizan el flujo de actualización que ya existía (`PATCH /solicitud`). Esto mantiene el backend más pequeño y evita duplicar la lógica de validación de sesión en un flujo más.

**Sobre si esto es "un CRUD completo":** lo es. El usuario ejecuta un borrado y el registro desaparece de la aplicación. Lo que cambia es la implementación por debajo, que es una decisión de diseño deliberada, no una funcionalidad a medias.

### 4.7 Google Sheets como base de datos

No es una base de datos y no pretendo que lo sea. La elegí porque **es el insumo que entrega el enunciado** y porque tiene una ventaja concreta en este contexto: el área de negocio puede abrir la hoja y ver los datos sin pedirle nada a nadie.

**Lo que se rompe cuando el volumen crece:**

- **No hay transacciones.** Dos personas creando una solicitud en el mismo segundo pueden generar IDs duplicados. No implementé bloqueo optimista.
- **No hay índices.** Cada consulta lee el rango completo. Con 20 filas es instantáneo; con 20.000 no.
- **Hay límites de cuota** en la API de Sheets que un uso intensivo alcanzaría.

La migración natural sería a Postgres manteniendo los mismos flujos de n8n, cambiando solo los nodos de Sheets. El diseño no cambiaría.

### 4.8 Documentos en Drive

El enunciado pedía vista de detalle con documento asociado. La hoja trae una columna `Nombre Archivo`; subí documentos de ejemplo a Drive y el detalle enlaza al archivo correspondiente.

**Estado actual:** los archivos se comparten con permiso de lectura por enlace, y el detalle abre ese enlace. Funciona, pero tiene un problema conceptual: **el control de acceso lo hace Google, no la aplicación**. Alguien con el enlace ve el documento sin haber iniciado sesión nunca.

**Lo correcto** sería que n8n sirva el archivo: un endpoint `/webhook/solicitudes/:id/documento` que valide la sesión, descargue el archivo con las credenciales del sistema y lo devuelva como respuesta. Los archivos quedarían privados en Drive y la aplicación sería la única puerta. Está diseñado pero no implementado por tiempo; es la mejora que priorizaría.

### 4.9 Frontend en un solo archivo

Todo el frontend —HTML, CSS, JavaScript, el logo en base64— vive en `vuo-frontend.html` y lo sirve un nodo *Respond to Webhook*. Sin build, sin framework, sin dependencias externas en tiempo de ejecución.

La razón es el despliegue: un solo archivo que se pega en un nodo significa cero infraestructura adicional y cero posibilidad de que el evaluador se encuentre con un `npm install` roto. El costo es que el archivo es grande (~90 KB) y que no hay separación de módulos ni tests de frontend automatizados en el repositorio.

**Sobre normalización de datos:** el desplegable de áreas mostraba "Tecnologia" y "Tecnología" como dos áreas distintas, porque en la hoja el valor venía escrito de ambas formas. La causa raíz está en los datos y se corrige ahí; un frontend defensivo que normalice acentos y mayúsculas al poblar los filtros sería la protección adecuada contra datos sucios.

### 4.10 La etiqueta y el valor son cosas distintas

La aplicación es para una empresa hispanohablante, así que toda la interfaz está acentuada: "Gestión de Solicitudes", "Enviar código", "Correo electrónico", "Cerrar sesión", "Información de la solicitud".

Donde esto se vuelve una decisión de diseño y no una corrección ortográfica es en los valores que vienen de la hoja. `Tecnologia`, `Gestion Financiera`, `Cotizacion` y `Certificacion` llegaron así en los datos originales, y son al mismo tiempo lo que se muestra en pantalla, lo que se guarda al crear una solicitud y lo que se compara al filtrar.

Tuve dos opciones:

| | Qué implica |
|---|---|
| **Reescribir el dato** (acentuar la hoja) | Hay que tocar las 20 filas, los desplegables del formulario y los 20 PDF generados, los tres a la vez. Cualquier desajuste reproduce exactamente el bug de "Tecnologia" vs "Tecnología": dos áreas donde hay una. |
| **Separar etiqueta de valor** | El `<option>` lleva `value="Tecnologia"` y muestra `Tecnología`. El dato que viaja al backend y el que se compara al filtrar no cambian. |

Elegí la segunda. Un pequeño mapa (`ETIQUETAS_DATO`) traduce valor → etiqueta en los tres puntos donde el dato se muestra: la tabla, el detalle y los desplegables. El registro sigue siendo el de la hoja; lo que cambia es cómo se lee.

La lección de fondo: **acentuar un dato no es formatearlo, es cambiarlo.** Lo que se corrige en la pantalla se corrige en la pantalla; el registro se toca solo cuando se decide migrar los datos de verdad, y eso es un cambio con su propia ventana y su propia verificación.

---

## 5. Limitaciones conocidas

Ordenadas por lo que cerraría primero si tuviera más tiempo:

1. **La validación de identidad en el backend.** El frontend blinda el payload, pero un llamado directo al webhook aún puede suplantar al solicitante. (§4.4)
2. **Los documentos de Drive no pasan por la aplicación.** El control de acceso lo hace Google. (§4.8)
3. **`Math.random()` para los códigos OTP.** Limitación del sandbox, mitigada pero no resuelta. (§4.3)
4. **Peppers hardcodeados** en lugar de variables de entorno. (§4.3)
5. **Sin control de concurrencia** al crear solicitudes: IDs potencialmente duplicados bajo carga. (§4.7)
6. **La paginación es del lado del cliente.** El listado trae todas las solicitudes y las pagina en el navegador. Con 20 filas es lo correcto —evita una petición por página—, pero con miles habría que paginar en el servidor.
7. **Sin roles funcionales.** El rol se muestra en la interfaz pero no restringe nada; cualquier usuario autenticado puede cambiar cualquier estado o anular cualquier solicitud.
8. **En móvil la tabla hace scroll horizontal** en vez de reorganizarse en tarjetas. Funciona, pero no es la mejor experiencia.
9. **Sin tests automatizados del backend.** El frontend sí se validó con una suite de Playwright durante el desarrollo (129 comprobaciones sobre login, listado, orden, filtros, paginación, anulación, tema y separación etiqueta/valor).
10. **Los usuarios se dan de alta a mano** en la hoja `Usuarios`. No hay auto-registro, y es deliberado: en un sistema interno el alta la hace RR.HH. o TI, no el propio empleado. Un flujo de alta sería trabajo adicional.

---

## 6. Cómo ejecutarlo desde cero

### Requisitos

- Una instancia de n8n (self-hosted o cloud) accesible por HTTPS.
- Una cuenta de Google con acceso a Sheets, Drive y Gmail.

### Pasos

**1. Preparar el Google Sheet**

Crear un documento con dos hojas:

- **`Solicitudes`** — importar el Excel suministrado en el enunciado.
- **`Usuarios`** — con estas columnas exactas:

  ```
  Correo | Nombre | Rol | otp_hash | otp_expira | otp_intentos | token_hash | token_expira | ultimo_acceso
  ```

  Agregar una fila por cada usuario autorizado. `Correo`, `Nombre` y `Rol` se llenan a mano; el resto los gestiona el sistema.

  > Si `Nombre` queda vacío, la aplicación deriva un nombre a partir del correo y no muestra el chip de rol.

**2. Subir los documentos a Drive**

Subir los archivos cuyos nombres aparecen en la columna `Nombre Archivo` y darles permiso de lectura.

**3. Configurar credenciales en n8n**

Crear credenciales OAuth2 de Google para **Sheets**, **Drive** y **Gmail**.

**4. Importar los flujos**

Importar cada `.json` de `workflows/`. En cada uno:

- Reasignar las credenciales de Google.
- Apuntar los nodos de Sheets al documento creado en el paso 1.
- **Publicar el flujo.**

> **Importante:** n8n mantiene el borrador del editor separado de la versión publicada. Un flujo guardado pero no publicado sigue sirviendo la versión anterior por el webhook. Si un cambio no aparece en la aplicación, casi siempre es esto.

**5. Cargar el frontend**

Abrir el **Flow 00**, pegar el contenido de `vuo-frontend.html` en el campo *Response Body* del nodo *Respond to Webhook*, y publicar.

**6. Permitir que el HTML se renderice**

n8n sirve las respuestas de webhook dentro de un iframe con sandbox restrictivo, lo que impide que la aplicación funcione. Añadir al contenedor:

```
N8N_INSECURE_DISABLE_WEBHOOK_IFRAME_SANDBOX=true
```

**7. Probar**

Entrar a `https://<tu-n8n>/webhook/app`, escribir un correo dado de alta en `Usuarios`, y verificar que llega el código.

---

## 7. Estructura del repositorio

```
.
├── README.md                       # este archivo: decisiones y puesta en marcha
├── MANUAL.md                       # manual de uso para el usuario final
├── generar_documentos.js           # genera los PDF de respaldo desde el CSV
├── frontend/
│   ├── vuo-frontend.html           # aplicación completa (versión entregada)
│   └── vuo-frontend-sin-fondo.html # variante sin fondo fotográfico en el login
├── documentos-solicitudes/         # los 20 PDF generados, tal como van a Drive
└── workflows/                      # los 9 workflows de n8n exportados en JSON
```

Los workflows de n8n:

| # | Workflow | Qué hace |
|---|---|---|
| 00 | Frontend | Sirve la aplicación HTML |
| 01 | Auth: Solicitar código OTP | Genera y envía el código al correo |
| 02 | Auth: Verificar código y emitir sesión | Valida el código y entrega la cookie de sesión |
| 03 | Sub: Validar sesion | Sub-workflow de autenticación, invocado por 05–08 |
| 04 | Logout | Cierra la sesión |
| 05 | Solicitudes: Listar | Devuelve el listado desde la hoja |
| 06 | Crear solicitud | Registra una solicitud nueva |
| 07 | Solicitudes: Detalle | Devuelve una solicitud y busca su documento en Drive |
| 08 | Solicitudes: Actualizar estado | Cambia el estado (incluye anular y restaurar) |

Las dos versiones del frontend son funcionalmente idénticas; se diferencian solo en el tratamiento visual de la pantalla de acceso.

**Sobre `generar_documentos.js`:** el enunciado no incluía documentos, así que los generé. Cada PDF se arma desde la misma fila del CSV que alimenta la aplicación, con una plantilla distinta según el tipo de solicitud (una factura pide proveedor y monto; una incidencia pide sistema afectado y severidad). Los campos que no existen en los datos originales quedan como *"Pendiente de completar"* en vez de inventar cifras.

Está en el repositorio a propósito: los documentos no son archivos sueltos que aparecieron de la nada, son la salida reproducible de un script. Si mañana entran 50 solicitudes más, generar sus documentos es un comando:

```bash
node generar_documentos.js solicitudes.csv documentos-solicitudes/
```

---

**Marcos José Montero Henríquez** — septiembre 2026

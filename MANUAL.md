# Manual de uso

**VÜO — Gestión de Solicitudes Internas**

Esta guía explica cómo usar la aplicación. No hace falta saber nada técnico.

Para entender cómo está construida o cómo ponerla en marcha, ver [`README.md`](README.md).

---

## Índice

1. [Entrar a la aplicación](#1-entrar-a-la-aplicación)
2. [La pantalla principal](#2-la-pantalla-principal)
3. [Buscar y filtrar solicitudes](#3-buscar-y-filtrar-solicitudes)
4. [Crear una solicitud](#4-crear-una-solicitud)
5. [Ver el detalle y su documento](#5-ver-el-detalle-y-su-documento)
6. [Cambiar el estado de una solicitud](#6-cambiar-el-estado-de-una-solicitud)
7. [Anular y restaurar](#7-anular-y-restaurar)
8. [Modo claro y modo oscuro](#8-modo-claro-y-modo-oscuro)
9. [Cerrar sesión](#9-cerrar-sesión)
10. [Preguntas frecuentes](#10-preguntas-frecuentes)

---

## 1. Entrar a la aplicación

No hay contraseña. Entras con un código que llega a tu correo.

1. Abre `https://n8n.mmont.com/webhook/app`.
2. Escribe tu **correo corporativo** y pulsa **Enviar código**.
3. Revisa tu buzón: recibirás un correo con un código de **6 dígitos**.
4. Escribe el código en la pantalla y pulsa **Verificar**.

Ya estás dentro. La sesión dura **8 horas**; después hay que volver a pedir un código.

> **El código vence a los 10 minutos.** Si se te pasó el tiempo, vuelve atrás y pide uno nuevo.
>
> **Tienes 5 intentos.** Si te equivocas cinco veces, el código queda bloqueado y hay que solicitar otro.

**¿Quién puede entrar?** Solo las personas dadas de alta en el sistema. Si tu correo no está registrado, la pantalla se verá igual (dirá que revises tu buzón) pero no llegará ningún código. Es a propósito: así nadie puede averiguar quién tiene cuenta probando correos.

---

## 2. La pantalla principal

Al entrar ves el **listado de solicitudes**, con una fila por solicitud:

| Columna | Qué muestra |
|---|---|
| **ID** | El identificador de la solicitud (SOL-001, SOL-002...) |
| **Fecha** | Cuándo se creó |
| **Solicitante** | Quién la pidió |
| **Área** | El área responsable |
| **Tipo** | Factura, Cotización, Acceso, Vacaciones... |
| **Prioridad** | Alta, Media o Baja |
| **Estado** | En qué punto del proceso está |

Arriba a la derecha aparece tu nombre y tu rol.

**Ordenar:** haz clic en el título de cualquier columna para ordenar por ella. Un segundo clic invierte el orden (de mayor a menor y viceversa). La flechita junto al título indica por cuál estás ordenando.

**Paginar:** el listado muestra **10 solicitudes por página**. Abajo aparecen los números de página y las flechas para avanzar y retroceder.

**Actualizar:** el botón **Actualizar** vuelve a traer los datos, por si alguien más hizo cambios mientras estabas dentro.

---

## 3. Buscar y filtrar solicitudes

Sobre el listado tienes varios filtros, y **se combinan entre sí**. Puedes pedir, por ejemplo, todas las solicitudes de Compras, de prioridad Alta, que estén Pendientes.

- **Estado** — Pendiente, En Proceso, Aprobada, Rechazada, Completada o Anulada.
- **Área** — las áreas que existen realmente en los datos.
- **Tipo** — los tipos de solicitud que existen realmente en los datos.
- **Prioridad** — los botones Todas / Alta / Media / Baja.
- **Buscar** — escribe cualquier cosa y filtra por ID, solicitante, correo, tipo o descripción.

Cuando hay algún filtro activo aparece el botón **Limpiar filtros**, que los quita todos de una vez.

> Al cambiar un filtro vuelves automáticamente a la página 1, para que no te quedes mirando una página vacía.

---

## 4. Crear una solicitud

1. Pulsa **+ Nueva solicitud** (arriba a la derecha).
2. Completa el formulario:
   - **Solicitante** y **Correo** ya vienen llenos con tus datos y **no se pueden editar**. Es intencional: una solicitud siempre queda a nombre de quien la crea.
   - **Área** — el área que debe atenderla.
   - **Tipo de solicitud** — qué estás pidiendo.
   - **Prioridad** — Alta, Media o Baja.
   - **Descripción** — explica brevemente el motivo.
3. Pulsa **Registrar solicitud**.

La solicitud se crea en estado **Pendiente** y aparece de inmediato en el listado, en la página donde quedó.

> Las solicitudes creadas desde la aplicación no traen documento adjunto: el formulario no pide archivos. Verás "Sin documento" en su detalle, y es lo normal.

Para salir sin guardar, pulsa **Cancelar** o la flecha de la esquina superior izquierda.

---

## 5. Ver el detalle y su documento

Haz clic en cualquier fila del listado para abrir su detalle. Ahí ves todos los datos de la solicitud, incluida la descripción completa.

Si la solicitud tiene un documento asociado en Google Drive, aparece un recuadro con su nombre y el enlace **Abrir documento**, que lo abre en una pestaña nueva.

Si no lo tiene, el recuadro dirá **Sin documento**.

Para volver al listado: el botón **Volver al listado**, o la flecha de la esquina superior izquierda. Regresas a la misma página en la que estabas.

---

## 6. Cambiar el estado de una solicitud

En el detalle, abajo, hay un selector **Actualizar estado**. Elige el nuevo estado y pulsa **Guardar cambio**.

Los estados siguen este recorrido:

```
Pendiente → Aprobada → En Proceso → Completada
     └──────────┴──────→ Rechazada
```

| Estado | Significa |
|---|---|
| **Pendiente** | Entró al sistema, nadie la ha revisado todavía. |
| **Aprobada** | Pasó la revisión, pero aún no se trabaja. |
| **En Proceso** | Alguien la está atendiendo. |
| **Completada** | Se resolvió. |
| **Rechazada** | No pasó la revisión. |

---

## 7. Anular y restaurar

Si una solicitud se creó por error o ya no aplica, puedes anularla.

**Para anular:**

1. Abre su detalle.
2. Pulsa **Anular solicitud** (abajo a la derecha, con borde rojo).
3. Confirma en el mensaje que aparece.

La solicitud desaparece del listado y vuelves a la pantalla principal.

> **La solicitud no se borra.** Queda guardada y marcada como anulada. No se pierde el historial, y puedes deshacerlo.

**Para ver las anuladas:** en el filtro de **Estado**, elige **Anulada**.

**Para restaurar una:** ábrela desde ese filtro y pulsa **Restaurar solicitud**. Vuelve a estado Pendiente y reaparece en el listado.

> Una solicitud anulada no se puede editar ni cambiarle el estado. Primero hay que restaurarla.

---

## 8. Modo claro y modo oscuro

El botón con la luna (o el sol) cambia entre los dos modos. Está arriba a la derecha dentro de la aplicación, y en una esquina en las pantallas de acceso.

Tu elección se recuerda: la próxima vez que entres, la aplicación abre en el modo que dejaste.

La primera vez, la aplicación usa el modo que tenga configurado tu sistema operativo.

---

## 9. Cerrar sesión

Pulsa **Cerrar sesión**, arriba a la derecha. Vuelves a la pantalla de acceso y para entrar de nuevo necesitarás un código nuevo.

La sesión también caduca sola a las **8 horas**. Si eso pasa mientras usas la aplicación, te avisa y te devuelve a la pantalla de acceso.

---

## 10. Preguntas frecuentes

**No me llegó el código.**
Revisa la carpeta de spam o correo no deseado. Si aun así no aparece, puede que tu correo no esté dado de alta en el sistema — la pantalla se ve igual en ambos casos a propósito. Consulta con quien administra la aplicación.

**Escribí mal el código varias veces y ya no me deja.**
Después de 5 intentos fallidos el código queda bloqueado. Vuelve atrás y pide uno nuevo.

**Creé una solicitud pero no la veo.**
Revisa si tienes filtros activos: si están puestos y tu solicitud no encaja, no aparecerá. Pulsa **Limpiar filtros**.

**Anulé una solicitud por error.**
No se perdió. Filtra por estado **Anulada**, ábrela y pulsa **Restaurar solicitud**.

**No puedo cambiar mi nombre ni mi correo al crear una solicitud.**
Es intencional. Esos datos salen de tu sesión para que toda solicitud quede a nombre de quien realmente la creó.

**¿Puedo editar una solicitud ya creada?**
No. Solo se puede cambiar su estado. Si los datos están mal, anúlala y crea una nueva — así queda registro de ambas cosas.

**La aplicación dice que mi sesión expiró.**
Las sesiones duran 8 horas. Pide un código nuevo y vuelve a entrar.

**¿Funciona en el teléfono?**
Sí. En pantallas pequeñas la tabla se desplaza horizontalmente para poder ver todas las columnas.

---

**Marcos José Montero Henríquez** — septiembre 2026

/* Genera los documentos de respaldo (PDF) de cada solicitud.
 *
 * Uso:  node generar_documentos.js solicitudes.csv [carpeta_salida]
 *
 * Acepta el CSV exportado de la hoja "Solicitudes" (o un .json con el mismo
 * juego de claves). El nombre de cada PDF sale de la columna "Nombre Archivo",
 * de modo que coincida exactamente con lo que la aplicacion espera encontrar
 * en Drive.
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const LOGO = fs.readFileSync(path.join(__dirname, 'logo_b64.txt'), 'utf-8').trim();

/* Cada tipo de solicitud genera un documento distinto: no tendria sentido que
 * una factura y una solicitud de vacaciones se vieran igual. */
const PLANTILLAS = {
  'Factura':         { titulo: 'Factura de proveedor',          campos: ['Proveedor', 'RNC', 'Numero de factura', 'Monto', 'Condicion de pago'] },
  'Expediente':      { titulo: 'Expediente de colaborador',     campos: ['Documento a actualizar', 'Version anterior', 'Motivo del cambio', 'Vigencia'] },
  'Evidencia':       { titulo: 'Evidencia de proceso',          campos: ['Proceso', 'Actividad', 'Responsable de ejecucion', 'Fecha de ejecucion'] },
  'Cotizacion':      { titulo: 'Cotizacion de proveedor',       campos: ['Proveedor', 'Numero de cotizacion', 'Monto', 'Validez de la oferta'] },
  'Pago':            { titulo: 'Solicitud de pago',             campos: ['Beneficiario', 'Cuenta destino', 'Monto', 'Fecha requerida', 'Concepto'] },
  'Acceso':          { titulo: 'Solicitud de acceso',           campos: ['Sistema o herramienta', 'Perfil solicitado', 'Justificacion', 'Vigencia del acceso'] },
  'Contrato':        { titulo: 'Contrato para revision',        campos: ['Contraparte', 'Objeto del contrato', 'Vigencia', 'Monto', 'Clausulas en revision'] },
  'Reporte':         { titulo: 'Reporte operativo',             campos: ['Periodo cubierto', 'Indicadores incluidos', 'Fuente de datos', 'Elaborado por'] },
  'Certificacion':   { titulo: 'Certificacion laboral',         campos: ['Tipo de certificacion', 'Dirigida a', 'Datos a certificar', 'Fecha de entrega'] },
  'Orden de Compra': { titulo: 'Orden de compra',               campos: ['Proveedor', 'Numero de orden', 'Articulos', 'Monto total', 'Fecha de entrega'] },
  'Reembolso':       { titulo: 'Solicitud de reembolso',        campos: ['Concepto del gasto', 'Fecha del gasto', 'Monto', 'Comprobantes adjuntos'] },
  'Incidencia':      { titulo: 'Reporte de incidencia',         campos: ['Sistema afectado', 'Severidad', 'Fecha y hora', 'Impacto', 'Acciones tomadas'] },
  'Documento':       { titulo: 'Documento para validacion',     campos: ['Tipo de documento', 'Area responsable', 'Vigencia', 'Observaciones legales'] },
  'Vacaciones':      { titulo: 'Solicitud de vacaciones',       campos: ['Fecha de inicio', 'Fecha de retorno', 'Dias habiles', 'Balance disponible'] },
};

const POR_DEFECTO = { titulo: 'Documento de respaldo', campos: ['Referencia', 'Monto', 'Vigencia', 'Observaciones'] };

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* CSV minimo con soporte para campos entrecomillados */
function leerCsv(texto) {
  const filas = [];
  let campo = '', fila = [], enComillas = false;
  texto = texto.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') enComillas = false;
      else campo += c;
    } else if (c === '"') enComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }

  const cab = filas.shift().map(h => h.trim());
  return filas
    .filter(f => f.some(v => v.trim()))
    .map(f => Object.fromEntries(cab.map((h, i) => [h, (f[i] || '').trim()])));
}

function pagina(s) {
  const tipo = s['Tipo Solicitud'] || '';
  const p = PLANTILLAS[tipo] || POR_DEFECTO;
  const id = s['ID Solicitud'] || '';
  const fecha = s['Fecha Solicitud'] || '';
  const prioridad = (s['Prioridad'] || '').toLowerCase();

  const filas = p.campos.map(c => `
    <tr><th>${esc(c)}</th><td class="vacio">Pendiente de completar</td></tr>`).join('');

  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Jost:wght@500;600&display=swap" rel="stylesheet">
<style>
  @page { size: Letter; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 54px 58px 0;
    font-family: 'IBM Plex Sans', Arial, sans-serif;
    font-size: 11.5px; color: #17161A; -webkit-print-color-adjust: exact;
  }
  .cab { display: flex; align-items: flex-start; justify-content: space-between;
         border-bottom: 3px solid #ED2228; padding-bottom: 18px; }
  .cab img { width: 88px; }
  .cab .meta { text-align: right; font-size: 10.5px; color: #5E585A; line-height: 1.7; }
  .cab .meta b { color: #17161A; font-size: 13px; font-family: 'Jost', sans-serif; letter-spacing: .4px; }

  h1 { font-family: 'Jost', sans-serif; font-size: 21px; font-weight: 600;
       margin: 30px 0 4px; letter-spacing: -.2px; }
  .sub { color: #5E585A; margin: 0 0 26px; font-size: 11.5px; }

  table { width: 100%; border-collapse: collapse; margin-bottom: 26px; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid #E6E1E1;
           vertical-align: top; }
  th { width: 34%; font-weight: 600; color: #5E585A; font-size: 10px;
       text-transform: uppercase; letter-spacing: .5px; }
  td { font-size: 12px; }
  td.vacio { color: #B3ACAE; font-style: italic; }
  caption { caption-side: top; text-align: left; font-family: 'Jost', sans-serif;
            font-size: 11px; font-weight: 600; text-transform: uppercase;
            letter-spacing: .8px; color: #ED2228; padding-bottom: 8px; }

  .chip { display: inline-block; padding: 2px 9px; border-radius: 99px;
          font-size: 10px; font-weight: 600; letter-spacing: .3px; }
  .alta  { background: #FDE7E8; color: #C4141A; }
  .media { background: #FFF3DF; color: #9A6206; }
  .baja  { background: #EAF4EC; color: #2C6B3F; }

  .desc { background: #FAF8F8; border: 1px solid #E6E1E1; border-radius: 6px;
          padding: 14px 16px; font-size: 12px; line-height: 1.65; min-height: 74px; }

  .firmas { display: flex; gap: 40px; margin-top: 44px; }
  .firma { flex: 1; border-top: 1px solid #17161A; padding-top: 7px;
           font-size: 10px; color: #5E585A; letter-spacing: .3px; }

  .pie { position: fixed; bottom: 30px; left: 58px; right: 58px;
         border-top: 1px solid #E6E1E1; padding-top: 9px;
         font-size: 9px; color: #918A8C; display: flex; justify-content: space-between; }
</style></head><body>

  <div class="cab">
    <img src="data:image/png;base64,${LOGO}" alt="VÜO">
    <div class="meta">
      <b>${esc(id)}</b><br>
      Fecha de solicitud: ${esc(fecha)}<br>
      Area: ${esc(s['Area'])}
    </div>
  </div>

  <h1>${esc(p.titulo)}</h1>
  <p class="sub">Documento de respaldo asociado a la solicitud ${esc(id)}.</p>

  <table>
    <caption>Datos del solicitante</caption>
    <tr><th>Solicitante</th><td>${esc(s['Solicitante'])}</td></tr>
    <tr><th>Correo</th><td>${esc(s['Correo'])}</td></tr>
    <tr><th>ID de empleado</th><td>${esc(s['ID Empleado'])}</td></tr>
    <tr><th>Area</th><td>${esc(s['Area'])}</td></tr>
  </table>

  <table>
    <caption>Detalle de la solicitud</caption>
    <tr><th>Tipo</th><td>${esc(tipo)}</td></tr>
    <tr><th>Prioridad</th><td><span class="chip ${esc(prioridad)}">${esc(s['Prioridad'])}</span></td></tr>
    ${filas}
  </table>

  <table><caption>Descripcion</caption></table>
  <div class="desc">${esc(s['Descripcion'])}</div>

  <div class="firmas">
    <div class="firma">Solicitante</div>
    <div class="firma">Aprobacion de area</div>
    <div class="firma">Registro</div>
  </div>

  <div class="pie">
    <span>VÜO Partners — Gestion de Solicitudes Internas</span>
    <span>${esc(id)} · documento de demostracion</span>
  </div>
</body></html>`;
}

(async () => {
  const entrada = process.argv[2];
  const salida = process.argv[3] || path.join(__dirname, 'documentos');
  if (!entrada) { console.error('Uso: node generar_documentos.js solicitudes.csv [carpeta]'); process.exit(1); }

  const crudo = fs.readFileSync(entrada, 'utf-8');
  const solicitudes = entrada.toLowerCase().endsWith('.json')
    ? JSON.parse(crudo) : leerCsv(crudo);

  const sinNombre = solicitudes.filter(s => !s['Nombre Archivo']);
  if (sinNombre.length) {
    console.warn(`  ! ${sinNombre.length} solicitud(es) sin "Nombre Archivo"; se nombraran por ID`);
  }
  const tiposRaros = [...new Set(solicitudes.map(s => s['Tipo Solicitud'])
    .filter(t => t && !PLANTILLAS[t]))];
  if (tiposRaros.length) {
    console.warn('  ! tipos sin plantilla propia (usan la generica): ' + tiposRaros.join(', '));
  }

  fs.mkdirSync(salida, { recursive: true });

  const navegador = await chromium.launch();
  const pag = await navegador.newPage();

  for (const s of solicitudes) {
    const nombre = s['Nombre Archivo'] || `${s['ID Solicitud']}.pdf`;
    await pag.setContent(pagina(s), { waitUntil: 'networkidle' });
    await pag.pdf({ path: path.join(salida, nombre), format: 'Letter', printBackground: true });
    console.log('  ✓ ' + nombre);
  }

  await navegador.close();
  console.log(`\n${solicitudes.length} documento(s) en ${salida}`);
})();

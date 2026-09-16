/* ===========================================================
   MAF · Datos simulados
   Puerto directo de legacy-static/js/data.js: misma lógica y
   mismo PRNG con semilla fija, para que los datos simulados
   salgan idénticos a los de la maqueta original.
   =========================================================== */

function construirDatos() {
  /* ---------- Fecha de referencia de la maqueta ---------- */
  var HOY = new Date(2026, 8, 15, 11, 42); // 15 sep 2026

  /* ---------- PRNG determinista ---------- */
  var _s = 20260915;
  function rnd() {
    _s = (_s * 1664525 + 1013904223) % 4294967296;
    return _s / 4294967296;
  }
  function ri(min: any, max: any) { return Math.floor(rnd() * (max - min + 1)) + min; }
  function pick(arr: any) { return arr[Math.floor(rnd() * arr.length)]; }
  function pickW(pairs: any) { // [[valor, peso], ...]
    var total = pairs.reduce(function (a: any, p: any) { return a + p[1]; }, 0);
    var r = rnd() * total;
    for (var i = 0; i < pairs.length; i++) { r -= pairs[i][1]; if (r <= 0) return pairs[i][0]; }
    return pairs[pairs.length - 1][0];
  }

  /* ---------- Catálogos ---------- */
  var NOMBRES = ['Camila','Matías','Javiera','Benjamín','Constanza','Sebastián','Fernanda','Cristóbal','Antonia','Ignacio',
    'Valentina','Felipe','Catalina','Diego','Josefa','Nicolás','Isidora','Vicente','Trinidad','Martín',
    'Paulina','Rodrigo','Daniela','Álvaro','Macarena','Gonzalo','Francisca','Esteban','Carolina','Mauricio',
    'Bárbara','Joaquín','Marcela','Cristián','Pía','Andrés','Soledad','Patricio','Rocío','Tomás'];
  var APELLIDOS = ['González','Muñoz','Rojas','Díaz','Pérez','Soto','Contreras','Silva','Martínez','Sepúlveda',
    'Morales','Rodríguez','López','Fuentes','Hernández','Torres','Araya','Flores','Espinoza','Valenzuela',
    'Castillo','Tapia','Reyes','Gutiérrez','Vásquez','Fernández','Vergara','Alarcón','Cortés','Bustos',
    'Sandoval','Henríquez','Zúñiga','Riquelme','Navarro','Carrasco','Ortiz','Salazar','Vega','Aguilera'];

  var SUCURSALES = [
    'Sucursal Las Condes', 'Sucursal Maipú', 'Sucursal La Florida', 'Sucursal Viña del Mar',
    'Sucursal Concepción', 'Sucursal Antofagasta', 'Sucursal Temuco', 'Sucursal Rancagua'
  ];

  var MODELOS = [
    { nombre: 'Yaris',              min: 13990000, max: 17490000 },
    { nombre: 'Yaris Cross',        min: 18490000, max: 21990000 },
    { nombre: 'Corolla',            min: 19990000, max: 25490000 },
    { nombre: 'Corolla Cross',      min: 22990000, max: 28990000 },
    { nombre: 'C-HR',               min: 26990000, max: 31490000 },
    { nombre: 'RAV4',               min: 32990000, max: 41990000 },
    { nombre: 'Hilux',              min: 28990000, max: 45990000 },
    { nombre: 'Rush',               min: 17490000, max: 20990000 },
    { nombre: 'Land Cruiser Prado', min: 54990000, max: 68990000 }
  ];

  var ESTADOS_COT = [
    ['cotizado', 40], ['en_evaluacion', 18], ['preaprobado', 22], ['rechazado', 10], ['desistido', 10]
  ];
  var MOTIVOS = [
    ['tasa_alta', 24], ['pie_insuficiente', 20], ['eligio_otra_marca', 14],
    ['sin_respuesta', 22], ['documentacion_incompleta', 10], ['comparando_opciones', 10]
  ];

  /* ---------- RUT con dígito verificador real ---------- */
  function dv(num: any) {
    var m = 0, s = 1, n = num;
    while (n > 0) { s = (s + (n % 10) * (9 - (m++ % 6))) % 11; n = Math.floor(n / 10); }
    return s > 0 ? String(s - 1) : 'K';
  }
  function formatearRut(num: any) {
    var s = String(num), out = '', c = 0;
    for (var i = s.length - 1; i >= 0; i--) { out = s[i] + out; if (++c % 3 === 0 && i > 0) out = '.' + out; }
    return out + '-' + dv(num);
  }

  function restarDias(d: any, n: any) { var x = new Date(d.getTime()); x.setDate(x.getDate() - n); return x; }
  function sumarDias(d: any, n: any) { return restarDias(d, -n); }

  /* ---------- Generación de contactos ---------- */
  var contactos: any[] = [];
  var TOTAL_CONTACTOS = 24000;

  for (var i = 0; i < TOTAL_CONTACTOS; i++) {
    var nombre = pick(NOMBRES);
    var ap1 = pick(APELLIDOS);
    var ap2 = pick(APELLIDOS);
    var rutNum = ri(6500000, 25800000);
    var esCliente = rnd() < 0.62;
    var modelo = pick(MODELOS);
    var sucursal = pick(SUCURSALES);
    var consent = pickW([['vigente', 82], ['sin_registro', 12], ['revocado', 6]]);

    var c: any = {
      id: 'c' + (1000 + i),
      nombre: nombre + ' ' + ap1 + ' ' + ap2,
      iniciales: (nombre[0] + ap1[0]).toUpperCase(),
      rut: formatearRut(rutNum),
      telefono: '+56 9 ' + ri(4000, 9999) + ' ' + ri(1000, 9999),
      email: (nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '.' +
              ap1.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() + '@correo.cl'),
      tipo: esCliente ? 'cliente' : 'prospecto',
      sucursal: sucursal,
      modelo: modelo.nombre,
      consentimiento: consent,
      consentimientoFecha: restarDias(HOY, ri(15, 900)),
      consentimientoCanal: pickW([['formulario_web', 40], ['firma_contrato', 34], ['whatsapp_optin', 18], ['cotizador_sucursal', 8]])
    };

    if (esCliente) {
      var cuotasTot = pick([24, 36, 36, 48, 48, 60]);
      var cuotasRest = ri(1, cuotasTot);
      var valorAuto = ri(modelo.min, modelo.max);
      var mora = pickW([[0, 72], [ri(1, 7), 10], [ri(8, 15), 7], [ri(16, 30), 6], [ri(31, 75), 5]]);
      c.contrato = 'MAF-' + ri(2021, 2026) + '-' + ri(10000, 99999);
      c.patente = String.fromCharCode(74 + ri(0, 9)) + String.fromCharCode(74 + ri(0, 9)) +
                  String.fromCharCode(74 + ri(0, 9)) + String.fromCharCode(74 + ri(0, 9)) + '-' + ri(10, 99);
      c.anioVehiculo = ri(2021, 2026);
      c.montoCredito = Math.round(valorAuto * 0.78 / 10000) * 10000;
      c.cuotaMensual = Math.round(c.montoCredito / cuotasTot * 1.21 / 1000) * 1000;
      c.cuotasTotales = cuotasTot;
      c.cuotasRestantes = cuotasRest;
      c.saldoInsoluto = c.cuotaMensual * cuotasRest;
      c.diasMora = mora;
      c.proximoVencimiento = mora > 0 ? restarDias(HOY, mora) : sumarDias(HOY, ri(1, 28));
      c.montoCotizado = valorAuto;
      c.estadoCotizacion = null;
      c.motivoNoCierre = null;
      c.diasDesdeCotizacion = null;
    } else {
      c.estadoCotizacion = pickW(ESTADOS_COT);
      c.motivoNoCierre = pickW(MOTIVOS);
      c.montoCotizado = ri(modelo.min, modelo.max);
      c.diasDesdeCotizacion = ri(3, 210);
      c.fechaCotizacion = restarDias(HOY, c.diasDesdeCotizacion);
      c.pieOfrecido = Math.round(c.montoCotizado * (ri(10, 40) / 100) / 10000) * 10000;
      c.cuotasRestantes = null;
      c.diasMora = null;
    }
    contactos.push(c);
  }

  /* ---------- Campos disponibles para segmentar y mapear ---------- */
  var CAMPOS = [
    { id: 'tipo', label: 'Tipo de contacto', tipo: 'enum', aplica: 'ambos',
      opciones: [['prospecto', 'Prospecto'], ['cliente', 'Cliente vigente']] },
    { id: 'estadoCotizacion', label: 'Estado de cotización', tipo: 'enum', aplica: 'prospecto',
      opciones: [['cotizado', 'Cotizado'], ['en_evaluacion', 'En evaluación'], ['preaprobado', 'Preaprobado'], ['rechazado', 'Rechazado'], ['desistido', 'Desistido']] },
    { id: 'motivoNoCierre', label: 'Motivo de no cierre', tipo: 'enum', aplica: 'prospecto',
      opciones: [['tasa_alta', 'Tasa muy alta'], ['pie_insuficiente', 'Pie insuficiente'], ['eligio_otra_marca', 'Eligió otra marca'], ['sin_respuesta', 'Sin respuesta'], ['documentacion_incompleta', 'Documentación incompleta'], ['comparando_opciones', 'Comparando opciones']] },
    { id: 'modelo', label: 'Modelo cotizado / financiado', tipo: 'enum', aplica: 'ambos',
      opciones: MODELOS.map(function (m) { return [m.nombre, m.nombre]; }) },
    { id: 'montoCotizado', label: 'Monto (CLP)', tipo: 'numero', aplica: 'ambos' },
    { id: 'diasDesdeCotizacion', label: 'Días desde la cotización', tipo: 'numero', aplica: 'prospecto' },
    { id: 'cuotasRestantes', label: 'Cuotas restantes', tipo: 'numero', aplica: 'cliente' },
    { id: 'diasMora', label: 'Días de mora', tipo: 'numero', aplica: 'cliente' },
    { id: 'sucursal', label: 'Sucursal de origen', tipo: 'enum', aplica: 'ambos',
      opciones: SUCURSALES.map(function (s) { return [s, s]; }) },
    { id: 'consentimiento', label: 'Consentimiento', tipo: 'enum', aplica: 'ambos',
      opciones: [['vigente', 'Vigente'], ['revocado', 'Revocado'], ['sin_registro', 'Sin registro']] }
  ];

  var OPERADORES = {
    enum:   [['es', 'es'], ['no_es', 'no es'], ['en', 'está en']],
    numero: [['igual', 'es igual a'], ['mayor', 'es mayor que'], ['menor', 'es menor que'], ['entre', 'está entre']]
  };

  /* ---------- Motor de evaluación de segmentos ---------- */
  function cumpleRegla(c: any, r: any) {
    var v = c[r.campo];
    if (v === null || v === undefined) return false;
    switch (r.op) {
      case 'es':     return String(v) === String(r.valor);
      case 'no_es':  return String(v) !== String(r.valor);
      case 'en':     return (r.valor || []).map(String).indexOf(String(v)) !== -1;
      case 'igual':  return Number(v) === Number(r.valor);
      case 'mayor':  return Number(v) > Number(r.valor);
      case 'menor':  return Number(v) < Number(r.valor);
      case 'entre':  return Number(v) >= Number(r.valor) && Number(v) <= Number(r.valor2);
      default:       return false;
    }
  }

  function evaluarSegmento(reglas: any, logica: any) {
    if (!reglas || !reglas.length) return [];
    return contactos.filter(function (c) {
      if (logica === 'or') return reglas.some(function (r: any) { return cumpleRegla(c, r); });
      return reglas.every(function (r: any) { return cumpleRegla(c, r); });
    });
  }

  /* ---------- Segmentos guardados ---------- */
  var segmentos: any[] = [
    { id: 's1', nombre: 'Cotizaciones frías 30-90 días', descripcion: 'Prospectos que cotizaron hace más de 30 días y no cerraron por tasa o pie.',
      logica: 'and', actualizado: restarDias(HOY, 2), autor: 'Camila Mardones',
      reglas: [
        { campo: 'tipo', op: 'es', valor: 'prospecto' },
        { campo: 'diasDesdeCotizacion', op: 'entre', valor: 30, valor2: 90 },
        { campo: 'consentimiento', op: 'es', valor: 'vigente' }
      ] },
    { id: 's2', nombre: 'Preaprobados sin cierre', descripcion: 'Crédito preaprobado que no llegó a firma. Alta intención.',
      logica: 'and', actualizado: restarDias(HOY, 5), autor: 'Camila Mardones',
      reglas: [
        { campo: 'estadoCotizacion', op: 'es', valor: 'preaprobado' },
        { campo: 'consentimiento', op: 'es', valor: 'vigente' }
      ] },
    { id: 's3', nombre: 'Contratos por vencer (≤6 cuotas)', descripcion: 'Clientes al día con 6 o menos cuotas restantes. Candidatos a renovación.',
      logica: 'and', actualizado: restarDias(HOY, 1), autor: 'Ignacio Bustos',
      reglas: [
        { campo: 'cuotasRestantes', op: 'menor', valor: 7 },
        { campo: 'diasMora', op: 'igual', valor: 0 },
        { campo: 'consentimiento', op: 'es', valor: 'vigente' }
      ] },
    { id: 's4', nombre: 'Mora temprana 1-30 días', descripcion: 'Cartera en mora inicial. Uso exclusivo de plantillas utility.',
      logica: 'and', actualizado: HOY, autor: 'Ignacio Bustos',
      reglas: [
        { campo: 'diasMora', op: 'entre', valor: 1, valor2: 30 },
        { campo: 'consentimiento', op: 'es', valor: 'vigente' }
      ] },
    { id: 's5', nombre: 'Vencimiento próximo · cartera al día', descripcion: 'Clientes sin mora, para recordatorio preventivo de cuota.',
      logica: 'and', actualizado: restarDias(HOY, 3), autor: 'Ignacio Bustos',
      reglas: [
        { campo: 'diasMora', op: 'igual', valor: 0 },
        { campo: 'cuotasRestantes', op: 'mayor', valor: 3 },
        { campo: 'consentimiento', op: 'es', valor: 'vigente' }
      ] },
    { id: 's6', nombre: 'SUV alto ticket · RM', descripcion: 'Cotizaciones sobre $30M de SUV en sucursales de la Región Metropolitana.',
      logica: 'and', actualizado: restarDias(HOY, 9), autor: 'Paulina Vergara',
      reglas: [
        { campo: 'modelo', op: 'en', valor: ['RAV4', 'Land Cruiser Prado', 'Corolla Cross'] },
        { campo: 'montoCotizado', op: 'mayor', valor: 30000000 },
        { campo: 'sucursal', op: 'en', valor: ['Sucursal Las Condes', 'Sucursal Maipú', 'Sucursal La Florida'] }
      ] }
  ];

  segmentos.forEach(function (s: any) {
    var res = evaluarSegmento(s.reglas, s.logica);
    s.tamano = res.length;
    s.conOptIn = res.filter(function (c: any) { return c.consentimiento === 'vigente'; }).length;
  });

  /* ---------- Precios Meta (USD por conversación, Chile) ---------- */
  var precios: any = { marketing: 0.0592, utility: 0.0119, authentication: 0.0357, service: 0 };

  /* ---------- Plantillas ---------- */
  var plantillas = [
    { id: 'p1', nombre: 'reactivacion_cotizacion_v3', categoria: 'marketing', idioma: 'es_CL',
      estado: 'aprobada', quality: 'alta', usos: 8420, actualizada: restarDias(HOY, 12),
      header: { tipo: 'texto', valor: 'Tu cotización sigue disponible' },
      body: 'Hola {{1}}, en MAF revisamos tu cotización del {{2}} y tenemos una alternativa de financiamiento para tu {{3}}.\n\nPodemos ajustar el pie y el plazo a tu presupuesto. ¿Te gustaría que un ejecutivo te contacte?',
      footer: 'Responde SALIR para no recibir más mensajes',
      botones: [{ tipo: 'quick_reply', texto: 'Quiero que me contacten' }, { tipo: 'quick_reply', texto: 'Ahora no' }],
      variables: [
        { n: 1, descripcion: 'Nombre del prospecto', campo: 'nombre', ejemplo: 'Camila' },
        { n: 2, descripcion: 'Fecha de la cotización', campo: 'fechaCotizacion', ejemplo: '14 de julio' },
        { n: 3, descripcion: 'Modelo cotizado', campo: 'modelo', ejemplo: 'Corolla Cross' }
      ] },
    { id: 'p2', nombre: 'renovacion_contrato_v2', categoria: 'marketing', idioma: 'es_CL',
      estado: 'aprobada', quality: 'media', usos: 3110, actualizada: restarDias(HOY, 28),
      header: { tipo: 'texto', valor: 'Tu crédito está por terminar' },
      body: 'Hola {{1}}, te quedan {{2}} cuotas para terminar tu crédito del {{3}}.\n\nComo cliente MAF puedes renovar con condiciones preferentes y sin pie inicial. ¿Quieres conocer las alternativas?',
      footer: 'Responde SALIR para no recibir más mensajes',
      botones: [{ tipo: 'quick_reply', texto: 'Ver alternativas' }, { tipo: 'url', texto: 'Simular renovación' }],
      variables: [
        { n: 1, descripcion: 'Nombre del cliente', campo: 'nombre', ejemplo: 'Sebastián' },
        { n: 2, descripcion: 'Cuotas restantes', campo: 'cuotasRestantes', ejemplo: '4' },
        { n: 3, descripcion: 'Modelo financiado', campo: 'modelo', ejemplo: 'Hilux' }
      ] },
    { id: 'p3', nombre: 'recordatorio_cuota_v4', categoria: 'utility', idioma: 'es_CL',
      estado: 'aprobada', quality: 'alta', usos: 24680, actualizada: restarDias(HOY, 6),
      header: { tipo: 'texto', valor: 'Recordatorio de tu cuota MAF' },
      body: 'Hola {{1}}, tu cuota N° {{2}} por {{3}} vence el {{4}}.\n\nPuedes pagarla en el portal MAF, en sucursal o con transferencia. Si ya pagaste, ignora este mensaje.',
      footer: 'Mensaje informativo de tu contrato',
      botones: [{ tipo: 'url', texto: 'Pagar en línea' }, { tipo: 'quick_reply', texto: 'Ya pagué' }],
      variables: [
        { n: 1, descripcion: 'Nombre del cliente', campo: 'nombre', ejemplo: 'Javiera' },
        { n: 2, descripcion: 'Número de cuota', campo: 'numeroCuota', ejemplo: '18' },
        { n: 3, descripcion: 'Monto de la cuota', campo: 'cuotaMensual', ejemplo: '$389.000' },
        { n: 4, descripcion: 'Fecha de vencimiento', campo: 'proximoVencimiento', ejemplo: '22 de septiembre' }
      ] },
    { id: 'p4', nombre: 'mora_temprana_d3_v2', categoria: 'utility', idioma: 'es_CL',
      estado: 'aprobada', quality: 'alta', usos: 11240, actualizada: restarDias(HOY, 18),
      header: { tipo: 'texto', valor: 'Tu cuota está pendiente' },
      body: 'Hola {{1}}, registramos que tu cuota de {{2}} venció el {{3}} y aún figura pendiente.\n\nRegularizarla ahora evita cargos adicionales. Si tienes una dificultad de pago, responde este mensaje y un ejecutivo te contacta.',
      footer: 'Mensaje informativo de tu contrato',
      botones: [{ tipo: 'url', texto: 'Pagar ahora' }, { tipo: 'quick_reply', texto: 'Hablar con ejecutivo' }],
      variables: [
        { n: 1, descripcion: 'Nombre del cliente', campo: 'nombre', ejemplo: 'Rodrigo' },
        { n: 2, descripcion: 'Monto de la cuota', campo: 'cuotaMensual', ejemplo: '$412.000' },
        { n: 3, descripcion: 'Fecha de vencimiento', campo: 'proximoVencimiento', ejemplo: '5 de septiembre' }
      ] },
    { id: 'p5', nombre: 'mora_d15_convenio_v1', categoria: 'utility', idioma: 'es_CL',
      estado: 'en_revision', quality: null, usos: 0, actualizada: restarDias(HOY, 2),
      header: { tipo: 'texto', valor: 'Opciones para ponerte al día' },
      body: 'Hola {{1}}, tu cuota lleva {{2}} días pendiente. Tenemos alternativas para que te pongas al día sin afectar tu historial.\n\nUn ejecutivo puede revisar tu caso hoy mismo.',
      footer: 'Mensaje informativo de tu contrato',
      botones: [{ tipo: 'quick_reply', texto: 'Quiero que me llamen' }],
      variables: [
        { n: 1, descripcion: 'Nombre del cliente', campo: 'nombre', ejemplo: 'Marcela' },
        { n: 2, descripcion: 'Días de mora', campo: 'diasMora', ejemplo: '15' }
      ] },
    { id: 'p6', nombre: 'promo_tasa_especial_sept', categoria: 'marketing', idioma: 'es_CL',
      estado: 'rechazada', quality: null, usos: 0, actualizada: restarDias(HOY, 8),
      motivoRechazo: 'Contenido promocional con condiciones financieras específicas sin el descargo obligatorio. Meta marcó la plantilla como potencialmente engañosa (política de servicios financieros).',
      header: { tipo: 'texto', valor: 'Tasa desde 0,79% solo por septiembre' },
      body: 'Hola {{1}}, solo por septiembre financiamos tu {{2}} con tasa desde 0,79% y hasta 60 cuotas. Cupos limitados, no dejes pasar esta oportunidad única.',
      footer: '',
      botones: [{ tipo: 'url', texto: 'Aprovechar ahora' }],
      variables: [
        { n: 1, descripcion: 'Nombre del prospecto', campo: 'nombre', ejemplo: 'Antonia' },
        { n: 2, descripcion: 'Modelo cotizado', campo: 'modelo', ejemplo: 'RAV4' }
      ] },
    { id: 'p7', nombre: 'verificacion_identidad_otp', categoria: 'authentication', idioma: 'es_CL',
      estado: 'aprobada', quality: 'alta', usos: 3260, actualizada: restarDias(HOY, 64),
      header: { tipo: 'ninguno', valor: '' },
      body: '{{1}} es tu código de verificación MAF. No lo compartas con nadie.',
      footer: 'El código vence en 10 minutos',
      botones: [{ tipo: 'copy_code', texto: 'Copiar código' }],
      variables: [{ n: 1, descripcion: 'Código de un solo uso', campo: 'otp', ejemplo: '482913' }] },
    { id: 'p8', nombre: 'encuesta_postventa_v1', categoria: 'marketing', idioma: 'es_CL',
      estado: 'pausada', quality: 'baja', usos: 1890, actualizada: restarDias(HOY, 40),
      motivoRechazo: 'Pausada por MAF: la tasa de bloqueo superó el 3,5% en dos envíos consecutivos.',
      header: { tipo: 'texto', valor: '¿Cómo fue tu experiencia?' },
      body: 'Hola {{1}}, ¿cómo evalúas la atención que recibiste en {{2}}? Tu respuesta nos ayuda a mejorar.',
      footer: 'Responde SALIR para no recibir más mensajes',
      botones: [{ tipo: 'quick_reply', texto: 'Buena' }, { tipo: 'quick_reply', texto: 'Regular' }, { tipo: 'quick_reply', texto: 'Mala' }],
      variables: [
        { n: 1, descripcion: 'Nombre del cliente', campo: 'nombre', ejemplo: 'Felipe' },
        { n: 2, descripcion: 'Sucursal', campo: 'sucursal', ejemplo: 'Sucursal Maipú' }
      ] }
  ];

  /* ---------- Campañas ---------- */
  /* Las audiencias salen del tamaño real de cada segmento, para que la
     maqueta no muestre números que se contradicen entre pantallas. */
  function segTam(id: any) {
    var s = segmentos.filter(function (x) { return x.id === id; })[0];
    return s ? s.conOptIn : 0;
  }

  function camp(o: any) {
    if (o.segmentoId) o.audiencia = Math.round(segTam(o.segmentoId) * (o.factorAudiencia || 1));
    o.enviados = Math.round(o.audiencia * (o.pctEnviado || 0));
    o.entregados = Math.round(o.enviados * o.tasaEntrega);
    o.leidos = Math.round(o.entregados * o.tasaLectura);
    o.respondidos = Math.round(o.leidos * o.tasaRespuesta);
    o.leads = o.tasaLead ? Math.round(o.respondidos * o.tasaLead) : 0;
    o.costo = +(o.enviados * precios[o.categoria]).toFixed(2);
    return o;
  }

  var campanas = [
    camp({ id: 'k1', nombre: 'Reactivación cotizaciones · agosto', segmentoId: 's1', segmento: 'Cotizaciones frías 30-90 días',
      plantillaId: 'p1', plantilla: 'reactivacion_cotizacion_v3', categoria: 'marketing', estado: 'finalizada',
      factorAudiencia: 2.4, pctEnviado: .981, tasaEntrega: .972, tasaLectura: .781, tasaRespuesta: .214, tasaLead: .41,
      inicio: restarDias(HOY, 24), fin: restarDias(HOY, 23), autor: 'Camila Mardones' }),
    camp({ id: 'k2', nombre: 'Recordatorio cuota · ciclo 5 septiembre', segmentoId: 's5', segmento: 'Vencimiento próximo · cartera al día',
      plantillaId: 'p3', plantilla: 'recordatorio_cuota_v4', categoria: 'utility', estado: 'finalizada',
      pctEnviado: .994, tasaEntrega: .986, tasaLectura: .842, tasaRespuesta: .068,
      inicio: restarDias(HOY, 12), fin: restarDias(HOY, 12), autor: 'Sistema · Journey' }),
    camp({ id: 'k3', nombre: 'Mora temprana · corte 10 septiembre', segmentoId: 's4', segmento: 'Mora temprana 1-30 días',
      plantillaId: 'p4', plantilla: 'mora_temprana_d3_v2', categoria: 'utility', estado: 'en_curso',
      pctEnviado: .662, tasaEntrega: .979, tasaLectura: .804, tasaRespuesta: .187,
      inicio: restarDias(HOY, 1), fin: null, autor: 'Ignacio Bustos', recuperado: 48920000 }),
    camp({ id: 'k4', nombre: 'Renovación contratos Q4', segmentoId: 's3', segmento: 'Contratos por vencer (≤6 cuotas)',
      plantillaId: 'p2', plantilla: 'renovacion_contrato_v2', categoria: 'marketing', estado: 'programada',
      pctEnviado: 0, tasaEntrega: 0, tasaLectura: 0, tasaRespuesta: 0,
      inicio: sumarDias(HOY, 3), fin: null, autor: 'Paulina Vergara' }),
    camp({ id: 'k5', nombre: 'Preaprobados sin cierre · septiembre', segmentoId: 's2', segmento: 'Preaprobados sin cierre',
      plantillaId: 'p1', plantilla: 'reactivacion_cotizacion_v3', categoria: 'marketing', estado: 'en_curso',
      pctEnviado: .628, tasaEntrega: .968, tasaLectura: .823, tasaRespuesta: .291, tasaLead: .44,
      inicio: HOY, fin: null, autor: 'Camila Mardones' }),
    camp({ id: 'k6', nombre: 'SUV alto ticket · piloto RM', segmentoId: 's6', segmento: 'SUV alto ticket · RM',
      plantillaId: 'p1', plantilla: 'reactivacion_cotizacion_v3', categoria: 'marketing', estado: 'borrador',
      pctEnviado: 0, tasaEntrega: 0, tasaLectura: 0, tasaRespuesta: 0,
      inicio: null, fin: null, autor: 'Paulina Vergara' }),
    camp({ id: 'k7', nombre: 'Encuesta postventa · agosto', segmentoId: null, segmento: 'Clientes con entrega reciente',
      plantillaId: 'p8', plantilla: 'encuesta_postventa_v1', categoria: 'marketing', estado: 'finalizada',
      audiencia: 1890, pctEnviado: 1, tasaEntrega: .944, tasaLectura: .612, tasaRespuesta: .108,
      inicio: restarDias(HOY, 40), fin: restarDias(HOY, 39), autor: 'Camila Mardones',
      alerta: 'Plantilla pausada tras esta campaña por exceso de bloqueos.' }),
    camp({ id: 'k8', nombre: 'Recordatorio cuota · ciclo 20 septiembre', segmentoId: 's5', segmento: 'Vencimiento próximo · cartera al día',
      plantillaId: 'p3', plantilla: 'recordatorio_cuota_v4', categoria: 'utility', estado: 'programada',
      factorAudiencia: .96, pctEnviado: 0, tasaEntrega: 0, tasaLectura: 0, tasaRespuesta: 0,
      inicio: sumarDias(HOY, 2), fin: null, autor: 'Sistema · Journey' }),
    camp({ id: 'k9', nombre: 'Verificación identidad · portal', segmentoId: null, segmento: 'Disparo por evento',
      plantillaId: 'p7', plantilla: 'verificacion_identidad_otp', categoria: 'authentication', estado: 'en_curso',
      audiencia: 3260, pctEnviado: 1, tasaEntrega: .993, tasaLectura: .961, tasaRespuesta: 0,
      inicio: restarDias(HOY, 90), fin: null, autor: 'Sistema · API' })
  ];

  /* ---------- Journeys ---------- */
  var journeys = [
    {
      id: 'j1', nombre: 'Reactivación de cotizaciones', objetivo: 'comercial', estado: 'activo',
      descripcion: 'Recupera prospectos que cotizaron y no cerraron, con derivación a ejecutivo cuando hay intención.',
      activos: 1284, completados: 3961, leads: 412, conversion: .104,
      nodos: [
        { id: 'n1', tipo: 'trigger', titulo: 'Cotización sin cierre', desc: 'Han pasado 30 días desde la cotización y el estado sigue abierto.',
          detalle: { 'Evento': 'cotizacion.sin_cierre', 'Fuente': 'CRM comercial (sincronización cada 6 h)', 'Filtro de entrada': 'Consentimiento vigente y sin campaña marketing en los últimos 30 días', 'Reentrada': 'Permitida una vez cada 120 días' } },
        { id: 'n2', tipo: 'condition', titulo: '¿Tiene opt-in vigente?', desc: 'Solo continúa quien tiene consentimiento registrado y no está en la lista de opt-out.',
          detalle: { 'Condición': 'consentimiento = vigente Y contacto ∉ lista opt-out', 'Sí': 'Continúa al envío de plantilla', 'No': 'Sale del journey y se registra el motivo', 'Volumen últimos 30 días': '3.418 sí · 402 no' } },
        { id: 'n3', tipo: 'send', titulo: 'Enviar reactivacion_cotizacion_v3', desc: 'Plantilla marketing · variables: nombre, fecha de cotización, modelo.',
          detalle: { 'Plantilla': 'reactivacion_cotizacion_v3', 'Categoría': 'marketing', 'Costo unitario': 'US$ 0,0592', 'Ventana horaria': 'Lunes a viernes, 09:00 a 19:00', 'Velocidad': '600 mensajes por hora' } },
        { id: 'n4', tipo: 'wait', titulo: 'Esperar 48 horas', desc: 'Da tiempo a que el prospecto responda antes de evaluar.',
          detalle: { 'Duración': '48 horas corridas', 'Corte anticipado': 'Sí, si el contacto responde antes', 'Respeta ventana horaria': 'Sí' } },
        { id: 'n5', tipo: 'condition', titulo: '¿Respondió?', desc: 'Bifurca según si hubo respuesta dentro de la ventana de 24 horas.',
          detalle: { 'Condición': 'Existe mensaje entrante posterior al envío', 'Sí': 'Deriva a ejecutivo comercial', 'No': 'Cierra el journey sin segundo intento (política de frecuencia)', 'Tasa de respuesta actual': '21,4%' } },
        { id: 'n6', tipo: 'human', titulo: 'Derivar a ejecutivo comercial', desc: 'Asigna la conversación a la cola Comercial y notifica al ejecutivo de la sucursal de origen.',
          detalle: { 'Cola': 'Comercial · por sucursal', 'SLA de primera respuesta': '15 minutos en horario hábil', 'Contexto adjunto': 'Cotización, modelo, monto y motivo de no cierre', 'Fallback': 'Si nadie toma el caso en 30 min, escala al supervisor' } },
        { id: 'n7', tipo: 'end', titulo: 'Cierre del journey', desc: 'Se marca el resultado: lead calificado, no interesado o sin respuesta.',
          detalle: { 'Resultados posibles': 'lead_calificado · no_interesado · sin_respuesta · opt_out', 'Registro': 'Se escribe en el CRM y en el log de auditoría' } }
      ],
      // índices de nodos donde hay bifurcación: {despues: idNodo, si:[ids], no:[ids]}
      ramas: { n5: { si: ['n6', 'n7'], no: ['n7b'] } },
      nodosExtra: [
        { id: 'n7b', tipo: 'end', titulo: 'Cierre sin respuesta', desc: 'Sale del journey y queda bloqueado para marketing por 90 días.',
          detalle: { 'Motivo': 'sin_respuesta', 'Bloqueo de frecuencia': '90 días para plantillas marketing' } }
      ]
    },
    {
      id: 'j2', nombre: 'Recordatorio preventivo de cuota', objetivo: 'cobranza', estado: 'activo',
      descripcion: 'Avisa la cuota 3 días antes del vencimiento y abre una vía de contacto si el cliente tiene dificultades.',
      activos: 11920, completados: 48310, leads: 0, conversion: .742,
      nodos: [
        { id: 'm1', tipo: 'trigger', titulo: 'Cuota vence en 3 días', desc: 'Se dispara desde el calendario de vencimientos de la cartera vigente.',
          detalle: { 'Evento': 'cuota.por_vencer', 'Fuente': 'Core de cartera (carga diaria 06:00)', 'Filtro de entrada': 'Contrato vigente, sin mora previa', 'Volumen diario promedio': '412 contactos' } },
        { id: 'm2', tipo: 'condition', titulo: '¿Cuota ya pagada?', desc: 'Verifica el estado del pago justo antes de enviar, para no molestar a quien ya pagó.',
          detalle: { 'Condición': 'estado_cuota = pendiente', 'Sí (ya pagó)': 'Sale del journey sin enviar nada', 'No': 'Continúa al envío', 'Ahorro estimado mensual': 'US$ 41 en mensajes no enviados' } },
        { id: 'm3', tipo: 'send', titulo: 'Enviar recordatorio_cuota_v4', desc: 'Plantilla utility · variables: nombre, número de cuota, monto, fecha.',
          detalle: { 'Plantilla': 'recordatorio_cuota_v4', 'Categoría': 'utility', 'Costo unitario': 'US$ 0,0119', 'Ventana horaria': 'Todos los días, 10:00 a 20:00', 'Velocidad': '1.200 mensajes por hora' } },
        { id: 'm4', tipo: 'wait', titulo: 'Esperar hasta el vencimiento', desc: 'Espera 3 días o hasta que el pago se registre.',
          detalle: { 'Duración': 'Hasta la fecha de vencimiento', 'Corte anticipado': 'Sí, si se registra el pago', 'Respeta ventana horaria': 'No aplica' } },
        { id: 'm5', tipo: 'condition', titulo: '¿Pagó dentro del plazo?', desc: 'Define si el caso se cierra o pasa al journey de mora temprana.',
          detalle: { 'Condición': 'pago_registrado = verdadero', 'Sí': 'Cierre con resultado pagado_a_tiempo', 'No': 'Entrega al journey Mora temprana día 1', 'Tasa de pago en plazo': '74,2%' } },
        { id: 'm6', tipo: 'human', titulo: 'Atención si el cliente responde', desc: 'Cualquier respuesta entrante abre conversación y se asigna a la cola Cobranza.',
          detalle: { 'Cola': 'Cobranza · mora temprana', 'SLA de primera respuesta': '10 minutos en horario hábil', 'Agente IA': 'Responde consultas de monto, fecha y medios de pago; escala repactaciones' } },
        { id: 'm7', tipo: 'end', titulo: 'Cierre del ciclo', desc: 'Registra el resultado del ciclo de la cuota.',
          detalle: { 'Resultados posibles': 'pagado_a_tiempo · derivado_a_mora · sin_contacto', 'Registro': 'Se escribe en el core de cartera y en auditoría' } }
      ],
      ramas: { m5: { si: ['m7'], no: ['m6b'] } },
      nodosExtra: [
        { id: 'm6b', tipo: 'send', titulo: 'Entregar a Mora temprana día 1', desc: 'Traspasa el caso al journey de mora con la plantilla utility correspondiente.',
          detalle: { 'Journey destino': 'Mora temprana 1-30', 'Plantilla inicial': 'mora_temprana_d3_v2', 'Retención de contexto': 'Sí, conserva la conversación y el historial' } }
      ]
    },
    {
      id: 'j3', nombre: 'Renovación de contrato', objetivo: 'comercial', estado: 'borrador',
      descripcion: 'Contacta a clientes con 6 o menos cuotas restantes para ofrecer renovación. Pendiente de aprobación de riesgo.',
      activos: 0, completados: 0, leads: 0, conversion: 0,
      nodos: [
        { id: 'r1', tipo: 'trigger', titulo: 'Quedan 6 cuotas', desc: 'Se dispara al bajar de 6 cuotas restantes.', detalle: { 'Evento': 'contrato.por_vencer', 'Estado': 'Sin publicar' } },
        { id: 'r2', tipo: 'send', titulo: 'Enviar renovacion_contrato_v2', desc: 'Plantilla marketing pendiente de validación legal.', detalle: { 'Plantilla': 'renovacion_contrato_v2', 'Bloqueo': 'Requiere visto bueno de Riesgo y Legal' } },
        { id: 'r3', tipo: 'end', titulo: 'Cierre', desc: 'Sin métricas aún.', detalle: { 'Estado': 'Borrador' } }
      ],
      ramas: {}, nodosExtra: []
    }
  ];

  /* ---------- Conversaciones ---------- */
  function h(hora: any, min: any) { var d = new Date(HOY.getTime()); d.setHours(hora, min, 0, 0); return d; }
  function hAyer(hora: any, min: any) { var d = restarDias(HOY, 1); d.setHours(hora, min, 0, 0); return d; }
  function hDias(dias: any, hora: any, min: any) { var d = restarDias(HOY, dias); d.setHours(hora, min, 0, 0); return d; }

  var conversaciones: any[] = [
    {
      id: 'v1', contactoRef: { nombre: 'Javiera Soto Muñoz', iniciales: 'JS', rut: '16.482.913-7', telefono: '+56 9 7741 2298' },
      tipo: 'cliente', estado: 'sin_asignar', canal: 'bot', noLeidos: 2, ventana: { abierta: true, restanteMin: 512 },
      ultimo: h(11, 18), etiquetas: ['Cobranza', 'Mora 6 días'], cola: 'Cobranza',
      contexto: {
        titulo: 'Crédito vigente',
        datos: { 'Contrato': 'MAF-2023-48219', 'Vehículo': 'Corolla 2023 · LPRS-41', 'Cuota mensual': 389000, 'Cuota N°': '18 de 48',
                 'Saldo insoluto': 11670000, 'Días de mora': 6, 'Vencimiento': '9 sep 2026', 'Sucursal': 'Sucursal La Florida' },
        alerta: 'Mora temprana. No ofrecer repactación sin validación de Cobranza.'
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'mora_temprana_d3_v2', t: hAyer(10, 2), estado: 'leido',
          texto: 'Hola Javiera, registramos que tu cuota de $389.000 venció el 9 de septiembre y aún figura pendiente.\n\nRegularizarla ahora evita cargos adicionales. Si tienes una dificultad de pago, responde este mensaje y un ejecutivo te contacta.' },
        { dir: 'in', t: hAyer(10, 34), texto: 'Hola, sí me atrasé este mes. ¿Puedo pagar la mitad ahora y el resto el 25?' },
        { dir: 'out', autor: 'bot', t: hAyer(10, 34), estado: 'leido',
          texto: 'Hola Javiera, gracias por responder. Puedo confirmarte el monto y los medios de pago disponibles. Los acuerdos de pago parcial los revisa un ejecutivo de Cobranza; te estoy derivando ahora.' },
        { tipo: 'handoff', t: hAyer(10, 35), texto: 'El agente IA derivó la conversación a Cobranza · motivo: solicitud de acuerdo de pago' },
        { dir: 'in', t: h(11, 16), texto: '¿Alguien me puede confirmar? Necesito saber hoy para organizarme' },
        { dir: 'in', t: h(11, 18), texto: 'Quedo atenta, gracias' }
      ]
    },
    {
      id: 'v2', contactoRef: { nombre: 'Benjamín Araya Cortés', iniciales: 'BA', rut: '19.204.556-K', telefono: '+56 9 6123 8890' },
      tipo: 'prospecto', estado: 'mia', canal: 'humano', asignadoA: 'Camila Mardones', noLeidos: 0, ventana: { abierta: true, restanteMin: 168 },
      ultimo: h(10, 41), etiquetas: ['Comercial', 'Lead calificado'], cola: 'Comercial',
      contexto: {
        titulo: 'Cotización abierta',
        datos: { 'Modelo cotizado': 'RAV4 2026', 'Monto': 36490000, 'Pie ofrecido': 7300000, 'Estado': 'Preaprobado',
                 'Motivo no cierre': 'Comparando opciones', 'Días desde cotización': '43', 'Sucursal': 'Sucursal Las Condes' },
        alerta: null
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'reactivacion_cotizacion_v3', t: hAyer(16, 0), estado: 'leido',
          texto: 'Hola Benjamín, en MAF revisamos tu cotización del 3 de agosto y tenemos una alternativa de financiamiento para tu RAV4.\n\nPodemos ajustar el pie y el plazo a tu presupuesto. ¿Te gustaría que un ejecutivo te contacte?' },
        { dir: 'in', t: hAyer(16, 22), texto: 'Sí, me interesa. Estaba viendo otra marca pero prefiero el RAV4 si me calza la cuota' },
        { tipo: 'handoff', t: hAyer(16, 23), texto: 'Asignada a Camila Mardones · cola Comercial · SLA cumplido (1 min)' },
        { dir: 'out', autor: 'Camila Mardones', t: hAyer(16, 28), estado: 'leido',
          texto: 'Hola Benjamín, soy Camila de MAF. Con el pie de $7.300.000 que quedó en tu cotización, la cuota a 48 meses queda dentro del rango que conversaste en sucursal. ¿Te sirve que te llame hoy a las 18:00 para revisar los números?' },
        { dir: 'in', t: hAyer(16, 45), texto: 'Perfecto, a esa hora estoy disponible' },
        { dir: 'out', autor: 'Camila Mardones', t: h(10, 41), estado: 'entregado',
          texto: 'Benjamín, te dejo agendada la llamada. Cualquier cosa me escribes por acá.' }
      ]
    },
    {
      id: 'v3', contactoRef: { nombre: 'Marcela Riquelme Vega', iniciales: 'MR', rut: '13.998.201-4', telefono: '+56 9 8812 3345' },
      tipo: 'cliente', estado: 'bot', canal: 'bot', noLeidos: 1, ventana: { abierta: true, restanteMin: 1380 },
      ultimo: h(11, 2), etiquetas: ['Cobranza', 'Consulta de pago'], cola: 'Bot',
      contexto: {
        titulo: 'Crédito vigente',
        datos: { 'Contrato': 'MAF-2024-71033', 'Vehículo': 'Yaris 2024 · KTVM-88', 'Cuota mensual': 246000, 'Cuota N°': '9 de 36',
                 'Saldo insoluto': 6642000, 'Días de mora': 0, 'Vencimiento': '22 sep 2026', 'Sucursal': 'Sucursal Maipú' },
        alerta: null
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'recordatorio_cuota_v4', t: h(10, 0), estado: 'leido',
          texto: 'Hola Marcela, tu cuota N° 9 por $246.000 vence el 22 de septiembre.\n\nPuedes pagarla en el portal MAF, en sucursal o con transferencia. Si ya pagaste, ignora este mensaje.' },
        { dir: 'in', t: h(10, 58), texto: '¿A qué cuenta transfiero?' },
        { dir: 'out', autor: 'bot', t: h(10, 58), estado: 'leido',
          texto: 'Hola Marcela. Los datos para transferencia son:\n\nMAF Chile S.A.\nRUT 96.123.456-7\nCuenta corriente Banco de Chile N° 000-12345-67\npagos@maf.cl\n\nIndica tu RUT en el mensaje de la transferencia para que se acredite al tiro.' },
        { dir: 'in', t: h(11, 2), texto: 'Gracias!' }
      ]
    },
    {
      id: 'v4', contactoRef: { nombre: 'Cristóbal Fuentes Silva', iniciales: 'CF', rut: '17.332.804-2', telefono: '+56 9 5590 1177' },
      tipo: 'cliente', estado: 'sin_asignar', canal: 'humano', noLeidos: 3, ventana: { abierta: false, restanteMin: 0 },
      ultimo: restarDias(HOY, 2), etiquetas: ['Reclamo', 'Prioridad alta'], cola: 'Cobranza',
      contexto: {
        titulo: 'Crédito vigente',
        datos: { 'Contrato': 'MAF-2022-30877', 'Vehículo': 'Hilux 2022 · MRPQ-27', 'Cuota mensual': 612000, 'Cuota N°': '41 de 60',
                 'Saldo insoluto': 11628000, 'Días de mora': 14, 'Vencimiento': '1 sep 2026', 'Sucursal': 'Sucursal Concepción' },
        alerta: 'Reclamo formal abierto. Escalado a supervisor. Ventana de 24 h cerrada: solo se puede reabrir con plantilla utility.'
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'mora_temprana_d3_v2', t: hDias(3, 10, 0), estado: 'leido',
          texto: 'Hola Cristóbal, registramos que tu cuota de $612.000 venció el 1 de septiembre y aún figura pendiente.' },
        { dir: 'in', t: hDias(2, 9, 12), texto: 'Ya pagué el 3 de septiembre y me siguen cobrando. Es la tercera vez que pasa' },
        { dir: 'in', t: hDias(2, 9, 14), texto: 'Voy a reclamar al Sernac si no lo arreglan' },
        { tipo: 'handoff', t: hDias(2, 9, 15), texto: 'El agente IA escaló a supervisor · motivo detectado: reclamo formal' },
        { dir: 'in', t: hDias(2, 17, 48), texto: 'Sigo esperando respuesta' }
      ]
    },
    {
      id: 'v5', contactoRef: { nombre: 'Antonia Vergara Tapia', iniciales: 'AV', rut: '20.115.677-9', telefono: '+56 9 9034 6621' },
      tipo: 'prospecto', estado: 'resuelta', canal: 'humano', asignadoA: 'Camila Mardones', noLeidos: 0, ventana: { abierta: false, restanteMin: 0 },
      ultimo: restarDias(HOY, 4), etiquetas: ['Comercial', 'Cerrado ganado'], cola: 'Comercial',
      contexto: {
        titulo: 'Cotización cerrada',
        datos: { 'Modelo cotizado': 'Corolla Cross 2026', 'Monto': 26990000, 'Pie ofrecido': 5400000, 'Estado': 'Cerrado ganado',
                 'Días desde cotización': '58', 'Sucursal': 'Sucursal Viña del Mar' },
        alerta: null
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'reactivacion_cotizacion_v3', t: hDias(6, 11, 0), estado: 'leido',
          texto: 'Hola Antonia, en MAF revisamos tu cotización del 19 de julio y tenemos una alternativa de financiamiento para tu Corolla Cross.' },
        { dir: 'in', t: hDias(6, 11, 34), texto: 'Hola! Sí, quiero retomarlo' },
        { tipo: 'handoff', t: hDias(6, 11, 35), texto: 'Asignada a Camila Mardones · cola Comercial' },
        { dir: 'out', autor: 'Camila Mardones', t: hDias(5, 16, 20), estado: 'leido',
          texto: 'Antonia, te dejo agendada la firma para el jueves en Viña. Llevas cédula y última liquidación.' },
        { dir: 'in', t: hDias(4, 9, 5), texto: 'Listo, muchas gracias Camila' },
        { tipo: 'sistema', t: hDias(4, 9, 8), texto: 'Conversación marcada como resuelta · resultado: lead_calificado → cerrado ganado' }
      ]
    },
    {
      id: 'v6', contactoRef: { nombre: 'Gonzalo Espinoza Díaz', iniciales: 'GE', rut: '15.720.339-1', telefono: '+56 9 4408 2201' },
      tipo: 'cliente', estado: 'mia', canal: 'humano', asignadoA: 'Camila Mardones', noLeidos: 0, ventana: { abierta: true, restanteMin: 47 },
      ultimo: h(9, 12), etiquetas: ['Renovación'], cola: 'Comercial',
      contexto: {
        titulo: 'Crédito vigente',
        datos: { 'Contrato': 'MAF-2021-19044', 'Vehículo': 'Hilux 2021 · JQRT-55', 'Cuota mensual': 548000, 'Cuota N°': '56 de 60',
                 'Saldo insoluto': 2192000, 'Días de mora': 0, 'Vencimiento': '28 sep 2026', 'Sucursal': 'Sucursal Rancagua' },
        alerta: 'Ventana de 24 h por cerrar en menos de 1 hora.'
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'renovacion_contrato_v2', t: hAyer(12, 0), estado: 'leido',
          texto: 'Hola Gonzalo, te quedan 4 cuotas para terminar tu crédito del Hilux.\n\nComo cliente MAF puedes renovar con condiciones preferentes y sin pie inicial. ¿Quieres conocer las alternativas?' },
        { dir: 'in', t: hAyer(12, 25), texto: 'Me interesa. ¿Qué pasa con el auto actual?' },
        { dir: 'out', autor: 'Camila Mardones', t: h(9, 12), estado: 'leido',
          texto: 'Gonzalo, se puede tomar como parte de pago. Un tasador lo revisa en sucursal y el monto se descuenta del pie de la renovación. ¿Te acomoda pasar el sábado?' }
      ]
    },
    {
      id: 'v7', contactoRef: { nombre: 'Daniela Ortiz Navarro', iniciales: 'DO', rut: '18.664.129-5', telefono: '+56 9 7302 4418' },
      tipo: 'prospecto', estado: 'bot', canal: 'bot', noLeidos: 1, ventana: { abierta: true, restanteMin: 1102 },
      ultimo: h(10, 7), etiquetas: ['Comercial'], cola: 'Bot',
      contexto: {
        titulo: 'Cotización abierta',
        datos: { 'Modelo cotizado': 'Yaris Cross 2026', 'Monto': 19490000, 'Pie ofrecido': 3900000, 'Estado': 'Cotizado',
                 'Motivo no cierre': 'Tasa muy alta', 'Días desde cotización': '67', 'Sucursal': 'Sucursal Temuco' },
        alerta: 'El contacto preguntó por tasa. El agente no entrega condiciones: derivar si insiste.'
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'reactivacion_cotizacion_v3', t: h(9, 30), estado: 'leido',
          texto: 'Hola Daniela, en MAF revisamos tu cotización del 10 de julio y tenemos una alternativa de financiamiento para tu Yaris Cross.' },
        { dir: 'in', t: h(10, 5), texto: '¿Con qué tasa me lo dejan? La otra vez me ofrecieron 1,2% y era mucho' },
        { dir: 'out', autor: 'bot', t: h(10, 6), estado: 'leido',
          texto: 'Hola Daniela. La tasa depende de la evaluación de cada cliente, así que no puedo confirmártela por este medio. Lo que sí puedo hacer es dejar tu caso con un ejecutivo comercial para que te entregue una propuesta formal. ¿Te parece?' },
        { dir: 'in', t: h(10, 7), texto: 'Ya, dale' }
      ]
    },
    {
      id: 'v8', contactoRef: { nombre: 'Patricio Sandoval Reyes', iniciales: 'PS', rut: '12.447.910-3', telefono: '+56 9 6677 0912' },
      tipo: 'cliente', estado: 'resuelta', canal: 'bot', noLeidos: 0, ventana: { abierta: false, restanteMin: 0 },
      ultimo: restarDias(HOY, 5), etiquetas: ['Cobranza', 'Pagado'], cola: 'Bot',
      contexto: {
        titulo: 'Crédito vigente',
        datos: { 'Contrato': 'MAF-2023-55120', 'Vehículo': 'Rush 2023 · LNQP-19', 'Cuota mensual': 298000, 'Cuota N°': '27 de 36',
                 'Saldo insoluto': 2682000, 'Días de mora': 0, 'Vencimiento': '10 oct 2026', 'Sucursal': 'Sucursal Antofagasta' },
        alerta: null
      },
      mensajes: [
        { dir: 'out', tipo: 'plantilla', autor: 'Sistema', nombrePlantilla: 'mora_temprana_d3_v2', t: hDias(6, 10, 0), estado: 'leido',
          texto: 'Hola Patricio, registramos que tu cuota de $298.000 venció el 8 de septiembre y aún figura pendiente.' },
        { dir: 'in', t: hDias(5, 9, 40), texto: 'Ya la pagué ayer por transferencia' },
        { dir: 'out', autor: 'bot', t: hDias(5, 9, 41), estado: 'leido',
          texto: 'Gracias Patricio. Veo el pago acreditado hoy a las 09:14. Tu contrato queda al día y la próxima cuota vence el 10 de octubre.' },
        { tipo: 'sistema', t: hDias(5, 9, 42), texto: 'Conversación resuelta por el agente IA · resultado: pago_confirmado' }
      ]
    }
  ];

  /* ---------- KPIs del mes ----------
     Se suman las campañas del mes para que dashboard, campañas y reportes
     muestren exactamente los mismos totales. */
  function sumaCat(cat: any) {
    return campanas.filter(function (c) {
      return c.categoria === cat && c.enviados > 0 && c.estado !== 'programada';
    }).reduce(function (a, c) { return a + c.enviados; }, 0);
  }

  var enviadosPorCategoria = {
    marketing: sumaCat('marketing'),
    utility: sumaCat('utility'),
    authentication: sumaCat('authentication')
  };
  var costos: any = {
    marketing: +(enviadosPorCategoria.marketing * precios.marketing).toFixed(2),
    utility: +(enviadosPorCategoria.utility * precios.utility).toFixed(2),
    authentication: +(enviadosPorCategoria.authentication * precios.authentication).toFixed(2)
  };
  costos.total = +(costos.marketing + costos.utility + costos.authentication).toFixed(2);

  var totalLeads = campanas.reduce(function (a, c) { return a + (c.leads || 0); }, 0);
  var totalEntregados = campanas.reduce(function (a, c) { return a + c.entregados; }, 0);
  var totalRespondidos = campanas.reduce(function (a, c) { return a + c.respondidos; }, 0);
  var totalEnviados = enviadosPorCategoria.marketing + enviadosPorCategoria.utility + enviadosPorCategoria.authentication;

  var kpis: any = {
    enviadosPorCategoria: enviadosPorCategoria,
    totalEnviados: totalEnviados,
    costos: costos,
    tasaRespuesta: +(totalRespondidos / totalEntregados).toFixed(3),
    tasaRespuestaPrev: 0.086,
    leads: totalLeads,
    leadsPrev: Math.round(totalLeads * 0.86),
    moraRecuperada: 0,      // se calcula abajo, con los tramos de mora reales
    moraRecuperadaPrev: 0,
    entregabilidad: +(totalEntregados / totalEnviados).toFixed(3),
    deltaEnviados: 0.084,
    deltaCosto: 0.061,
    costoPorLead: +(costos.marketing / Math.max(totalLeads, 1)).toFixed(2),
    proyeccionMes: +(costos.total / 15 * 30).toFixed(2)
  };

  var cuenta = {
    numero: '+56 22 480 9000',
    nombreMostrado: 'MAF Chile',
    wabaId: '1029384756102938',
    verificada: true,
    quality: 'alta',
    tier: '10K',
    tierNivel: 3,
    tierMax: 4,
    usoVentana: 0.42,
    limiteDiario: 10000,
    enviadas24h: 4218,
    ultimaRevision: h(11, 30),
    advertencias: []
  };

  var actividad = [
    { t: h(11, 18), tipo: 'conversacion', icono: 'chat', color: 'warn', texto: 'Javiera Soto respondió y espera asignación', detalle: 'Cola Cobranza · 2 mensajes sin leer' },
    { t: h(10, 52), tipo: 'campana', icono: 'send', color: 'info', texto: 'Campaña «Preaprobados sin cierre» alcanzó 742 envíos', detalle: '63% de la audiencia · en curso' },
    { t: h(10, 6), tipo: 'agente', icono: 'bot', color: 'ok', texto: 'El agente IA derivó 14 conversaciones a Comercial', detalle: 'Motivo principal: consulta de tasa' },
    { t: h(9, 14), tipo: 'cobranza', icono: 'money', color: 'ok', texto: 'Se acreditaron $12.480.000 en pagos de mora temprana', detalle: '31 contratos regularizados' },
    { t: h(8, 40), tipo: 'plantilla', icono: 'alert', color: 'danger', texto: 'Meta rechazó la plantilla «promo_tasa_especial_sept»', detalle: 'Política de servicios financieros' },
    { t: hAyer(18, 22), tipo: 'gobernanza', icono: 'shield', color: 'muted', texto: '9 contactos solicitaron baja (opt-out)', detalle: 'Excluidos de toda campaña marketing' }
  ];

  /* ---------- Gobernanza ---------- */
  var optIns = contactos.slice(0, 14).map(function (c, idx) {
    return {
      contacto: c.nombre, rut: c.rut, telefono: c.telefono,
      estado: c.consentimiento,
      fecha: c.consentimientoFecha,
      canal: c.consentimiento === 'sin_registro' ? null : c.consentimientoCanal,
      // La evidencia tiene que ser coherente con el estado: quien no tiene
      // registro no puede exhibir un respaldo de consentimiento.
      evidencia: c.consentimiento === 'sin_registro'
        ? 'Sin evidencia registrada · excluido de marketing'
        : c.consentimiento === 'revocado'
          ? 'Baja solicitada el ' + (c.consentimientoFecha.getDate() + '/' + (c.consentimientoFecha.getMonth() + 1) + '/' + c.consentimientoFecha.getFullYear())
          : c.consentimientoCanal === 'firma_contrato'
            ? 'Cláusula 11 · contrato ' + (c.contrato || 'MAF-2024-00' + (idx + 10))
            : c.consentimientoCanal === 'formulario_web'
              ? 'Formulario maf.cl/cotiza · IP 190.44.12.' + (20 + idx)
              : c.consentimientoCanal === 'whatsapp_optin'
                ? 'Mensaje entrante «ACEPTO» del ' + c.telefono
                : 'Tablet sucursal · folio ' + (48210 + idx)
    };
  });

  var optOuts = [
    { contacto: 'Esteban Carrasco Vega', rut: '14.882.019-6', fecha: restarDias(HOY, 1), motivo: 'Respondió SALIR', origen: 'Campaña reactivación', alcance: 'Marketing' },
    { contacto: 'Soledad Alarcón Pérez', rut: '11.209.774-8', fecha: restarDias(HOY, 1), motivo: 'Bloqueó el número', origen: 'Recordatorio de cuota', alcance: 'Todo' },
    { contacto: 'Tomás Zúñiga Morales', rut: '18.004.551-2', fecha: restarDias(HOY, 2), motivo: 'Solicitud a ejecutivo', origen: 'Conversación', alcance: 'Marketing' },
    { contacto: 'Rocío Henríquez Soto', rut: '16.773.002-9', fecha: restarDias(HOY, 3), motivo: 'Respondió SALIR', origen: 'Campaña renovación', alcance: 'Marketing' },
    { contacto: 'Álvaro Vásquez Rojas', rut: '13.550.418-4', fecha: restarDias(HOY, 4), motivo: 'Reporte de spam a Meta', origen: 'Encuesta postventa', alcance: 'Todo' },
    { contacto: 'Pía Contreras Flores', rut: '19.882.330-1', fecha: restarDias(HOY, 6), motivo: 'Solicitud por correo', origen: 'Canal de privacidad', alcance: 'Todo' }
  ];

  var auditoria = [
    { t: h(11, 20), actor: 'Camila Mardones', accion: 'Campaña creada', objeto: 'Preaprobados sin cierre · septiembre', detalle: 'Audiencia 1.180 · plantilla reactivacion_cotizacion_v3', ip: '190.44.12.31' },
    { t: h(10, 58), actor: 'Agente IA', accion: 'Derivación a humano', objeto: 'Conversación con Daniela Ortiz', detalle: 'Motivo: consulta de tasa fuera de alcance', ip: '—' },
    { t: h(9, 44), actor: 'Ignacio Bustos', accion: 'Segmento modificado', objeto: 'Mora temprana 1-30 días', detalle: 'Se agregó la condición «consentimiento = vigente»', ip: '190.44.12.58' },
    { t: h(8, 40), actor: 'Meta Business', accion: 'Plantilla rechazada', objeto: 'promo_tasa_especial_sept', detalle: 'Política de servicios financieros', ip: '—' },
    { t: hAyer(18, 22), actor: 'Sistema', accion: 'Opt-out masivo procesado', objeto: '9 contactos', detalle: 'Exclusión aplicada a 4 campañas activas', ip: '—' },
    { t: hAyer(17, 5), actor: 'Paulina Vergara', accion: 'Plantilla pausada', objeto: 'encuesta_postventa_v1', detalle: 'Tasa de bloqueo 3,8% sobre el umbral definido', ip: '190.44.12.12' },
    { t: hAyer(15, 30), actor: 'Camila Mardones', accion: 'Exportación de datos', objeto: 'Reporte comercial agosto', detalle: '4.820 filas · CSV', ip: '190.44.12.31' },
    { t: hAyer(11, 12), actor: 'Ignacio Bustos', accion: 'Guardrail modificado', objeto: 'Agente IA · cobranza', detalle: 'Se prohibió mencionar plazos de repactación', ip: '190.44.12.58' },
    { t: restarDias(HOY, 2), actor: 'Sistema', accion: 'Campaña finalizada', objeto: 'Recordatorio cuota · ciclo 5 septiembre', detalle: '12.411 enviados · US$ 147,69', ip: '—' },
    { t: restarDias(HOY, 3), actor: 'Camila Mardones', accion: 'Acceso a datos personales', objeto: 'Ficha de Cristóbal Fuentes', detalle: 'Motivo: gestión de reclamo', ip: '190.44.12.31' }
  ];

  /* ---------- Configuración del agente IA ---------- */
  var agente = {
    nombre: 'Asistente MAF',
    estado: 'activo',
    tono: 'cercano_formal',
    tratamiento: 'tu',
    largoRespuesta: 'breve',
    horario: 'siempre',
    alcance: [
      { id: 'saldo', label: 'Informar saldo, cuota y fecha de vencimiento', on: true },
      { id: 'medios', label: 'Entregar medios y datos de pago', on: true },
      { id: 'estado_cotizacion', label: 'Informar el estado de una cotización', on: true },
      { id: 'agendar', label: 'Agendar llamada con un ejecutivo', on: true },
      { id: 'certificados', label: 'Enviar certificados y comprobantes', on: false },
      { id: 'simular', label: 'Simular cuotas de un crédito nuevo', on: false }
    ],
    conocimiento: [
      { nombre: 'Preguntas frecuentes MAF', tipo: 'FAQ', fragmentos: 84, actualizado: restarDias(HOY, 9), estado: 'indexado' },
      { nombre: 'Medios de pago y convenios', tipo: 'Documento', fragmentos: 22, actualizado: restarDias(HOY, 30), estado: 'indexado' },
      { nombre: 'Catálogo y especificaciones 2026', tipo: 'Documento', fragmentos: 156, actualizado: restarDias(HOY, 3), estado: 'indexado' },
      { nombre: 'Protocolo de cobranza temprana', tipo: 'Política interna', fragmentos: 41, actualizado: restarDias(HOY, 14), estado: 'indexado' },
      { nombre: 'Tarifario vigente septiembre', tipo: 'Planilla', fragmentos: 0, actualizado: restarDias(HOY, 1), estado: 'procesando' }
    ],
    guardrails: [
      { id: 'g1', tipo: 'prohibir', texto: 'No entrega ni confirma tasas, CAE, seguros ni condiciones de financiamiento.', motivo: 'Solo un ejecutivo con evaluación vigente puede ofrecerlas.' },
      { id: 'g2', tipo: 'prohibir', texto: 'No negocia repactaciones, condonaciones ni acuerdos de pago.', motivo: 'Requiere aprobación de Cobranza.' },
      { id: 'g3', tipo: 'escalar', texto: 'Ante un reclamo formal o mención de Sernac, escala de inmediato a supervisor.', motivo: 'Trazabilidad regulatoria.' },
      { id: 'g4', tipo: 'prohibir', texto: 'No solicita ni recibe datos de tarjetas, claves ni credenciales.', motivo: 'Política de seguridad y prevención de fraude.' },
      { id: 'g5', tipo: 'escalar', texto: 'Si el cliente manifiesta una dificultad económica grave, deriva a un ejecutivo.', motivo: 'Trato responsable con el consumidor.' },
      { id: 'g6', tipo: 'permitir', texto: 'Puede confirmar monto, número y fecha de la cuota del contrato del cliente.', motivo: 'Dato transaccional ya conocido por el titular.' },
      { id: 'g7', tipo: 'prohibir', texto: 'No inventa promociones, plazos ni disponibilidad de stock.', motivo: 'Riesgo de publicidad engañosa.' }
    ],
    metricas: { resueltasSinHumano: 0.612, derivaciones: 388, tiempoRespuesta: '4 s', satisfaccion: 4.3 }
  };

  /* ---------- Reportes (derivados de las campañas y de la cartera) ---------- */
  function porCampana(id: any) { return campanas.filter(function (c) { return c.id === id; })[0]; }

  function filaComercial(nombre: any, ids: any, tasaCierre: any) {
    var cs = ids.map(porCampana);
    var f: any = { nombre: nombre, contactados: 0, respondieron: 0, calificados: 0, cerrados: 0, costoUsd: 0 };
    cs.forEach(function (c: any) {
      f.contactados += c.entregados;
      f.respondieron += c.respondidos;
      f.calificados += c.leads;
      f.costoUsd += c.costo;
    });
    f.cerrados = Math.round(f.calificados * tasaCierre);
    f.costoUsd = +f.costoUsd.toFixed(2);
    return f;
  }

  var filasComercial = [
    filaComercial('Reactivación de cotizaciones', ['k1'], .21),
    filaComercial('Preaprobados sin cierre', ['k5'], .28),
    filaComercial('Encuesta postventa', ['k7'], 0)
  ];

  var embudo: any[] = [
    { etapa: 'Mensajes entregados', n: filasComercial.reduce(function (a, f) { return a + f.contactados; }, 0) },
    { etapa: 'Leídos', n: 0 },
    { etapa: 'Respondieron', n: filasComercial.reduce(function (a, f) { return a + f.respondieron; }, 0) },
    { etapa: 'Leads calificados', n: filasComercial.reduce(function (a, f) { return a + f.calificados; }, 0) },
    { etapa: 'Cierres', n: filasComercial.reduce(function (a, f) { return a + f.cerrados; }, 0) }
  ];
  embudo[1].n = ['k1', 'k5', 'k7'].reduce(function (a, id) { return a + porCampana(id).leidos; }, 0);

  function tramoMora(min: any, max: any) {
    var cartera = contactos.filter(function (c) { return c.diasMora >= min && c.diasMora <= max; });
    var contactados = Math.round(cartera.length * (min < 16 ? .948 : .879));
    var respondieron = Math.round(contactados * (min < 6 ? .352 : min < 16 ? .304 : min < 31 ? .246 : .18));
    var pagaron = Math.round(respondieron * (min < 6 ? .758 : min < 16 ? .671 : min < 31 ? .559 : .451));
    var cuotaProm = cartera.length
      ? cartera.reduce(function (a, c) { return a + c.cuotaMensual; }, 0) / cartera.length
      : 0;
    return {
      tramo: 'Día ' + min + ' a ' + max,
      cartera: cartera.length, contactados: contactados, respondieron: respondieron,
      pagaron: pagaron, recuperado: Math.round(pagaron * cuotaProm)
    };
  }

  var tramos = [tramoMora(1, 5), tramoMora(6, 15), tramoMora(16, 30), tramoMora(31, 60)];

  // La mora recuperada del dashboard es la de los tramos 1 a 30 días, que es
  // el alcance del producto. Se escribe de vuelta en los KPIs para que no haya
  // dos cifras distintas para lo mismo.
  kpis.moraRecuperada = tramos.slice(0, 3).reduce(function (a, t) { return a + t.recuperado; }, 0);
  kpis.moraRecuperadaPrev = Math.round(kpis.moraRecuperada * 0.847);
  kpis.contratosRegularizados = tramos.slice(0, 3).reduce(function (a, t) { return a + t.pagaron; }, 0);

  var reportes = {
    comercial: { porJourney: filasComercial, embudo: embudo },
    cobranza: {
      contactabilidad: tramos,
      costoPorContacto: precios.utility,
      comparativoCanal: [
        { canal: 'WhatsApp', costoContacto: 11, contactabilidad: .948, recuperacion: .412 },
        { canal: 'Llamada saliente', costoContacto: 680, contactabilidad: .412, recuperacion: .388 },
        { canal: 'SMS', costoContacto: 22, contactabilidad: .611, recuperacion: .186 },
        { canal: 'Correo', costoContacto: 3, contactabilidad: .224, recuperacion: .071 }
      ]
    },
    costos: {
      serie: (function () {
        var meses = ['Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep'];
        var factores = [.56, .65, .76, .87, .95, 1];
        return meses.map(function (m, i) {
          return {
            mes: m,
            marketing: +(costos.marketing * factores[i]).toFixed(2),
            utility: +(costos.utility * factores[i]).toFixed(2),
            auth: +(costos.authentication * factores[i]).toFixed(2)
          };
        });
      })()
    }
  };

  /* ---------- Etiquetas legibles ---------- */
  var LABELS = {
    estadoCampana: { borrador: 'Borrador', programada: 'Programada', en_curso: 'En curso', finalizada: 'Finalizada', pausada: 'Pausada' },
    estadoPlantilla: { aprobada: 'Aprobada', en_revision: 'En revisión', rechazada: 'Rechazada', pausada: 'Pausada' },
    categoria: { marketing: 'Marketing', utility: 'Utility', authentication: 'Authentication' },
    quality: { alta: 'Alta', media: 'Media', baja: 'Baja' },
    consentimiento: { vigente: 'Vigente', revocado: 'Revocado', sin_registro: 'Sin registro' },
    canalOptIn: { formulario_web: 'Formulario web', firma_contrato: 'Firma de contrato', whatsapp_optin: 'Opt-in WhatsApp', cotizador_sucursal: 'Cotizador en sucursal' },
    estadoCotizacion: { cotizado: 'Cotizado', en_evaluacion: 'En evaluación', preaprobado: 'Preaprobado', rechazado: 'Rechazado', desistido: 'Desistido' },
    motivoNoCierre: { tasa_alta: 'Tasa muy alta', pie_insuficiente: 'Pie insuficiente', eligio_otra_marca: 'Eligió otra marca', sin_respuesta: 'Sin respuesta', documentacion_incompleta: 'Documentación incompleta', comparando_opciones: 'Comparando opciones' }
  };

  /* ---------- Export ---------- */
  return {
    HOY: HOY,
    contactos: contactos,
    campos: CAMPOS,
    operadores: OPERADORES,
    sucursales: SUCURSALES,
    modelos: MODELOS,
    segmentos: segmentos,
    plantillas: plantillas,
    campanas: campanas,
    journeys: journeys,
    conversaciones: conversaciones,
    kpis: kpis,
    cuenta: cuenta,
    actividad: actividad,
    precios: precios,
    optIns: optIns,
    optOuts: optOuts,
    auditoria: auditoria,
    agente: agente,
    reportes: reportes,
    labels: LABELS,
    evaluarSegmento: evaluarSegmento
  };
}

export const MAF_DATA: any = construirDatos();

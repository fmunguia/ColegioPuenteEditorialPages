// Web de los libros del Colegio Puente: respuestas guardadas en el navegador y autocorrección.
// Lo que escribe el alumno se guarda solo en su navegador (localStorage), nunca se envía a ningún sitio.
(function () {
  'use strict';
  var PREFIJO = 'libros:' + location.pathname + ':';

  function leer(clave) {
    try { return localStorage.getItem(PREFIJO + clave); } catch (e) { return null; }
  }
  function guardar(clave, valor) {
    try {
      if (valor === null || valor === '') localStorage.removeItem(PREFIJO + clave);
      else localStorage.setItem(PREFIJO + clave, valor);
    } catch (e) { /* sin almacenamiento: la página sigue funcionando */ }
  }
  function todos(sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); }

  // --- Campos: textos, casillas y opciones ---------------------------------------------
  var campos = todos('[data-k]').filter(function (el) { return el.matches('input, textarea'); });
  campos.forEach(function (el) {
    var clave = el.getAttribute('data-k');
    var v = leer(clave);
    if (el.type === 'checkbox') {
      el.checked = v === '1';
      el.addEventListener('change', function () { guardar(clave, el.checked ? '1' : ''); });
    } else if (el.type === 'radio') {
      el.checked = v !== null && v === el.value;
      el.addEventListener('change', function () { if (el.checked) guardar(clave, el.value); });
    } else {
      if (v !== null) el.value = v;
      el.addEventListener('input', function () { guardar(clave, el.value); });
    }
  });
  var barra = document.querySelector('.barra-respuestas');
  if (barra && campos.length) barra.hidden = false;

  // --- Ver la solución y autocorrección -------------------------------------------------
  todos('.ver-sol').forEach(function (b) {
    var sol = b.nextElementSibling;
    b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', function () {
      sol.hidden = !sol.hidden;
      b.setAttribute('aria-expanded', String(!sol.hidden));
      b.textContent = sol.hidden ? '👀 Ver la solución' : '🙈 Ocultar la solución';
    });
  });
  todos('.autonota').forEach(function (p) {
    var clave = p.getAttribute('data-k');
    var botones = todos('button', p);
    function marcar(v) {
      botones.forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-v') === v)); });
    }
    marcar(leer(clave));
    if (leer(clave)) { p.parentElement.hidden = false; p.parentElement.previousElementSibling.textContent = '🙈 Ocultar la solución'; }
    botones.forEach(function (x) {
      x.addEventListener('click', function () { guardar(clave, x.getAttribute('data-v')); marcar(x.getAttribute('data-v')); });
    });
  });

  // --- Test de autoevaluación -------------------------------------------------------------
  todos('form.test').forEach(function (form) {
    var preguntas = todos('fieldset.pregunta', form);
    var nota = form.querySelector('.nota-test');
    function corregir() {
      var aciertos = 0, sinContestar = 0;
      preguntas.forEach(function (f) {
        var correcta = f.getAttribute('data-correcta');
        var elegida = f.querySelector('input:checked');
        var res = f.querySelector('.resultado');
        todos('label.opcion', f).forEach(function (l) { l.classList.remove('correcta', 'fallo'); });
        if (!elegida) {
          sinContestar++;
          res.textContent = 'Sin contestar.';
          res.className = 'resultado mal';
          return;
        }
        var buena = f.querySelector('input[value="' + correcta + '"]').parentElement;
        if (elegida.value === correcta) {
          aciertos++;
          buena.classList.add('correcta');
          res.textContent = '✅ ¡Bien!';
          res.className = 'resultado bien';
        } else {
          elegida.parentElement.classList.add('fallo');
          buena.classList.add('correcta');
          res.textContent = '❌ No es esa. La correcta es la ' + 'abcd'[Number(correcta)] + '.';
          res.className = 'resultado mal';
        }
      });
      var total = preguntas.length;
      var msg = 'Mis aciertos: ' + aciertos + ' de ' + total + '. ';
      if (aciertos >= total - 1) msg += '🤩 ¡Muy bien!';
      else if (aciertos > total / 2) msg += '🙂 Más de la mitad. Repasa las que has fallado.';
      else msg += '📚 Repasa los mapas mentales y vuelve a intentarlo.';
      if (sinContestar) msg += ' (Te quedan ' + sinContestar + ' sin contestar).';
      nota.textContent = msg;
      nota.hidden = false;
    }
    form.querySelector('.corregir-test').addEventListener('click', corregir);
    form.querySelector('.repetir-test').addEventListener('click', function () {
      todos('input', form).forEach(function (i) { i.checked = false; guardar(i.getAttribute('data-k'), ''); });
      todos('.resultado', form).forEach(function (r) { r.textContent = ''; });
      todos('label.opcion', form).forEach(function (l) { l.classList.remove('correcta', 'fallo'); });
      nota.hidden = true;
    });
  });

  // --- Copiar, imprimir y borrar -------------------------------------------------------
  function etiqueta(el) {
    var act = el.closest('.actividad');
    if (act) return 'Actividad ' + act.querySelector('.act-num').textContent;
    var rep = el.closest('.repaso');
    if (rep) return (rep.classList.contains('autoeval') ? 'Pregunta ' : 'Ejercicio ') + rep.querySelector('.circ').textContent;
    var preg = el.closest('fieldset.pregunta');
    if (preg) return 'Test ' + preg.querySelector('.num').textContent.replace('.', '');
    var caja = el.closest('.caja');
    if (caja) return caja.querySelector('.caja-titulo').textContent.trim();
    var mom = el.closest('.momento');
    if (mom) return mom.querySelector('h2').textContent.replace(/\d+ min/, '').trim();
    return 'Respuesta';
  }
  function texto() {
    var titulo = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : document.title;
    var sesion = document.querySelector('.banda-sesion');
    var lineas = [(sesion ? sesion.textContent.trim() + ' · ' : '') + titulo, ''];
    var vistos = {};
    campos.forEach(function (el) {
      var valor = '';
      if (el.type === 'checkbox') return;
      if (el.type === 'radio') {
        if (!el.checked || vistos[el.name]) return;
        vistos[el.name] = true;
        var l = el.closest('label');
        valor = l ? l.textContent.trim() : el.value;
        var fila = el.closest('tr');
        if (fila) valor = fila.cells[0].textContent.trim() + ': ' + el.value;
      } else {
        valor = el.value.trim();
      }
      if (valor) lineas.push(etiqueta(el) + ': ' + valor);
    });
    var nota = document.querySelector('.nota-test:not([hidden])');
    if (nota) lineas.push('', nota.textContent);
    return lineas.join('\n');
  }
  function avisar(msg) {
    var d = document.createElement('div');
    d.className = 'aviso-copiado';
    d.setAttribute('role', 'status');
    d.textContent = msg;
    document.body.appendChild(d);
    setTimeout(function () { d.remove(); }, 2500);
  }
  var copiar = document.querySelector('.copiar');
  if (copiar) copiar.addEventListener('click', function () {
    var t = texto();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { avisar('Copiado. Pégalo en la tarea de Classroom.'); },
        function () { window.prompt('Copia este texto:', t); });
    } else {
      window.prompt('Copia este texto:', t);
    }
  });
  var imprimir = document.querySelector('.imprimir');
  if (imprimir) imprimir.addEventListener('click', function () { window.print(); });
  var borrar = document.querySelector('.borrar');
  if (borrar) borrar.addEventListener('click', function () {
    if (!window.confirm('¿Borrar todas tus respuestas de esta página?')) return;
    try {
      Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PREFIJO) === 0) localStorage.removeItem(k); });
    } catch (e) { /* nada */ }
    location.reload();
  });
})();

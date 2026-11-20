  var disc = document.getElementById("disc");
  var cancion = document.getElementById("cancion");
  var paintButtons = document.querySelectorAll(".celda-paint");
  var brocha = document.getElementById("brocha");
  var borrador = document.getElementById("borrador");
  var lapiz = document.getElementById("lapiz");
  var texto = document.getElementById("texto");
  var bote = document.getElementById("bote");
  var aerosol = document.getElementById("aerosol");
  var lupa = document.getElementById("lupa");
  var gotas = document.getElementById("gotas");
  var lienzo = document.getElementById("lienzo");
  var ctx = lienzo.getContext("2d");
  var paintLayer = document.createElement("canvas");
  var paintCtx = paintLayer.getContext("2d");
  var fondo = new Image();
  var paintColor = "#000000";
  var brushSize = 16;
  var spraySize = 10;
  var zoomLevel = 1;
  var zoomTranslate = { x: 0, y: 0 };
  var zoomContainer = document.querySelector(".zoom-container");
  var zoomHintTimer = null;
  var zoomHintSeen = false;
  var zoomPointers = {};
  var pinchStart = null;
  var pinchUsed = false;
  var touchCount = 0;
  var touchPinch = null;
  var sprayTimer = null;
  var sprayPoint = null;
  try {
    zoomHintSeen = sessionStorage.getItem("sarigna-zoom-hint") === "1";
  } catch (error) {}
  var strokes = [];
  var currentStroke = null;
  var drawing = false;
  var pendingTextPoint = null;
  var textoPopup = document.getElementById("texto-popup");
  var textoForm = document.getElementById("texto-form");
  var textoInput = document.getElementById("texto-input");
  var celda2 = document.getElementById("celda2");
  var celda3 = document.getElementById("celda3");
  var nowPlaying = document.getElementById("now-playing");
  var nowPlayingSong = document.getElementById("now-playing-song");

  if(document.language == "es"){
    celda2.style.backgroundImage = "url(images/Welcome.png)";
    celda3.style.backgroundImage = "url(images/side-right.png)";
  }

  document.getElementById("boton-verde").addEventListener("click", function (event) {
    event.preventDefault();
    var celular = document.getElementById("celular-cerrado");
    if (celular.dataset.abriendo === "1") {
      return;
    }
    celular.dataset.abriendo = "1";
    celular.alt = "Celular abierto";
    var bootaudio = document.getElementById("bootaudio");
    bootaudio.currentTime = 0;
    var arranque = bootaudio.play();
    if (arranque) {
      arranque.catch(salirAlInicio);
    }

    function salirAlInicio() {
      if (celular.dataset.salida === "1") {
        return;
      }
      celular.dataset.salida = "1";
      var velo = document.createElement("div");
      var yendo = false;
      velo.className = "salida-blanca";
      document.body.appendChild(velo);
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          velo.classList.add("visible");
        });
      });
      function ir() {
        if (yendo) {
          return;
        }
        yendo = true;
        window.location.href = "homepage.html";
      }
      velo.addEventListener("transitionend", ir);
      window.setTimeout(ir, 900);
    }

    bootaudio.addEventListener("timeupdate", function () {
      if (bootaudio.currentTime >= 2) {
        salirAlInicio();
      }
    });

    celular.src = "images/Abierto.png";
  });

  function nombreCancion() {
    var archivo = decodeURIComponent(cancion.src.split("/").pop().split("?")[0]);
    var nombre = archivo.replace(/\.[^.]+$/, "");
    return nombre || "Canción";
  }

  function mostrarCancion() {
    nowPlayingSong.textContent = nombreCancion();
    nowPlaying.hidden = false;
  }

  disc.addEventListener("click", function () {
    if (cancion.paused) {
      var intento = cancion.play();
      if (intento) {
        intento.then(mostrarCancion).catch(function () {});
      } else {
        mostrarCancion();
      }
    } else {
      cancion.pause();
      nowPlaying.hidden = true;
    }
  });

  fondo.src = "images/Fondo.jpg";

  function selectTool(button) {
    paintButtons.forEach(function (other) {
      other.classList.remove("pressed");
    });
    if (button) {
      button.classList.add("pressed");
    }
    document.body.classList.remove("pintando", "borrando", "lapizando", "escribiendo", "eligiendo", "rellenando", "rociando", "ampliando");
    if (brocha.classList.contains("pressed")) {
      document.body.classList.add("pintando");
    } else if (borrador.classList.contains("pressed")) {
      document.body.classList.add("borrando");
    } else if (lapiz.classList.contains("pressed")) {
      document.body.classList.add("lapizando");
    } else if (texto.classList.contains("pressed")) {
      document.body.classList.add("escribiendo");
    } else if (gotas.classList.contains("pressed")) {
      document.body.classList.add("eligiendo");
    } else if (bote.classList.contains("pressed")) {
      document.body.classList.add("rellenando");
    } else if (aerosol.classList.contains("pressed")) {
      document.body.classList.add("rociando");
    } else if (lupa.classList.contains("pressed")) {
      document.body.classList.add("ampliando");
    }
    if (lupa.classList.contains("pressed")) {
      showZoomHint();
    } else {
      zoomContainer.hidden = true;
    }
  }

  function activeTool() {
    if (brocha.classList.contains("pressed")) {
      return "brush";
    }
    if (borrador.classList.contains("pressed")) {
      return "eraser";
    }
    if (lapiz.classList.contains("pressed")) {
      return "pencil";
    }
    if (texto.classList.contains("pressed")) {
      return "text";
    }
    if (gotas.classList.contains("pressed")) {
      return "picker";
    }
    if (bote.classList.contains("pressed")) {
      return "bucket";
    }
    if (aerosol.classList.contains("pressed")) {
      return "spray";
    }
    if (lupa.classList.contains("pressed")) {
      return "zoom";
    }
    return null;
  }

  function showZoomHint() {
    if (zoomHintSeen) {
      return;
    }
    zoomHintSeen = true;
    try {
      sessionStorage.setItem("sarigna-zoom-hint", "1");
    } catch (error) {}
    zoomContainer.hidden = false;
    window.clearTimeout(zoomHintTimer);
    zoomHintTimer = window.setTimeout(function () {
      zoomContainer.hidden = true;
    }, 5000);
  }

  function applyZoom() {
    if (zoomLevel <= 1) {
      zoomLevel = 1;
      zoomTranslate.x = 0;
      zoomTranslate.y = 0;
      lienzo.style.transform = "";
      return;
    }
    lienzo.style.transformOrigin = "0 0";
    lienzo.style.transform = "translate(" + zoomTranslate.x + "px, " + zoomTranslate.y + "px) scale(" + zoomLevel + ")";
  }

  function setZoom(next, clientX, clientY) {
    var oldZoom = zoomLevel;
    var nextZoom = Math.max(1, Math.min(4, next));
    if (clientX != null && clientY != null && nextZoom !== oldZoom) {
      var point = pointFromEvent({ clientX: clientX, clientY: clientY });
      zoomTranslate.x += point.x * (oldZoom - nextZoom);
      zoomTranslate.y += point.y * (oldZoom - nextZoom);
    }
    zoomLevel = nextZoom;
    applyZoom();
  }

  function canvasLayoutOrigin() {
    var rect = lienzo.getBoundingClientRect();
    return {
      x: rect.left - zoomTranslate.x,
      y: rect.top - zoomTranslate.y
    };
  }

  function followFingers(touches) {
    var first = touches[0];
    var second = touches[1];
    var dx = first.clientX - second.clientX;
    var dy = first.clientY - second.clientY;
    var distance = Math.sqrt(dx * dx + dy * dy) || 1;
    var midX = (first.clientX + second.clientX) / 2;
    var midY = (first.clientY + second.clientY) / 2;
    if (!touchPinch) {
      touchPinch = {
        distance: distance,
        zoom: zoomLevel || 1,
        midX: midX,
        midY: midY,
        tx: zoomTranslate.x,
        ty: zoomTranslate.y
      };
      return;
    }
    var nextZoom = Math.max(1, Math.min(4, touchPinch.zoom * (distance / touchPinch.distance)));
    var origin = canvasLayoutOrigin();
    var localX = (touchPinch.midX - origin.x - touchPinch.tx) / touchPinch.zoom;
    var localY = (touchPinch.midY - origin.y - touchPinch.ty) / touchPinch.zoom;
    zoomLevel = nextZoom;
    if (nextZoom <= 1) {
      applyZoom();
      return;
    }
    zoomTranslate.x = (midX - origin.x) - localX * nextZoom;
    zoomTranslate.y = (midY - origin.y) - localY * nextZoom;
    applyZoom();
  }

  document.addEventListener("touchstart", function (event) {
    touchCount = event.touches.length;
    if (!usesTouchPicker() || event.touches.length < 2) {
      return;
    }
    event.preventDefault();
    drawing = false;
    currentStroke = null;
    window.clearInterval(sprayTimer);
    followFingers(event.touches);
  }, { passive: false, capture: true });

  document.addEventListener("touchmove", function (event) {
    touchCount = event.touches.length;
    if (!usesTouchPicker() || event.touches.length < 2) {
      return;
    }
    event.preventDefault();
    followFingers(event.touches);
  }, { passive: false });

  document.addEventListener("touchend", function (event) {
    touchCount = event.touches.length;
    if (event.touches.length < 2) {
      touchPinch = null;
    }
  });

  document.addEventListener("touchcancel", function (event) {
    touchCount = event.touches.length;
    touchPinch = null;
  });

  function zoomPointerDistance() {
    var ids = Object.keys(zoomPointers);
    if (ids.length < 2) {
      return 0;
    }
    var first = zoomPointers[ids[0]];
    var second = zoomPointers[ids[1]];
    var dx = first.x - second.x;
    var dy = first.y - second.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function paintSprayDots(stroke, from) {
    paintCtx.globalCompositeOperation = "source-over";
    paintCtx.fillStyle = stroke.color;
    var i;
    for (i = from; i < stroke.points.length; i++) {
      paintCtx.fillRect(stroke.points[i].x, stroke.points[i].y, 1, 1);
    }
    composite();
  }

  function sprayDots(stroke, point) {
    var radius = stroke.size / 2;
    var count = Math.max(8, Math.round(stroke.size));
    var i;
    for (i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var distance = Math.sqrt(Math.random()) * radius;
      stroke.points.push({
        x: point.x + Math.cos(angle) * distance,
        y: point.y + Math.sin(angle) * distance
      });
    }
  }

  function floodFill(x, y, hex) {
    var dpr = window.devicePixelRatio || 1;
    var width = paintLayer.width;
    var height = paintLayer.height;
    var px = Math.floor(x * dpr);
    var py = Math.floor(y * dpr);
    if (px < 0 || py < 0 || px >= width || py >= height) {
      return;
    }
    var image = paintCtx.getImageData(0, 0, width, height);
    var data = image.data;
    var start = (py * width + px) * 4;
    var sourceRed = data[start];
    var sourceGreen = data[start + 1];
    var sourceBlue = data[start + 2];
    var sourceAlpha = data[start + 3];
    var rgb = parseInt(hex.slice(1), 16);
    var fillRed = (rgb >> 16) & 255;
    var fillGreen = (rgb >> 8) & 255;
    var fillBlue = rgb & 255;
    if (sourceRed === fillRed && sourceGreen === fillGreen && sourceBlue === fillBlue && sourceAlpha === 255) {
      return;
    }
    var empty = sourceAlpha < 32;
    var tolerance = 42 * 42;
    function matches(index) {
      if (data[index] === fillRed && data[index + 1] === fillGreen && data[index + 2] === fillBlue && data[index + 3] === 255) {
        return false;
      }
      if (empty) {
        return data[index + 3] < 32;
      }
      if (data[index + 3] < 32) {
        return false;
      }
      var red = data[index] - sourceRed;
      var green = data[index + 1] - sourceGreen;
      var blue = data[index + 2] - sourceBlue;
      return red * red + green * green + blue * blue <= tolerance;
    }
    var stack = new Int32Array(Math.max(1024, width));
    var top = 0;
    function push(sx, sy) {
      if (top + 2 > stack.length) {
        var bigger = new Int32Array(stack.length * 2);
        bigger.set(stack);
        stack = bigger;
      }
      stack[top++] = sx;
      stack[top++] = sy;
    }
    push(px, py);
    while (top > 0) {
      var y0 = stack[--top];
      var x0 = stack[--top];
      var row = y0 * width;
      if (!matches((row + x0) * 4)) {
        continue;
      }
      var left = x0;
      while (left > 0 && matches((row + left - 1) * 4)) {
        left--;
      }
      var right = x0;
      while (right < width - 1 && matches((row + right + 1) * 4)) {
        right++;
      }
      var spanUp = false;
      var spanDown = false;
      for (var nx = left; nx <= right; nx++) {
        var index = (row + nx) * 4;
        data[index] = fillRed;
        data[index + 1] = fillGreen;
        data[index + 2] = fillBlue;
        data[index + 3] = 255;
        if (y0 > 0 && matches(index - width * 4)) {
          if (!spanUp) {
            push(nx, y0 - 1);
            spanUp = true;
          }
        } else {
          spanUp = false;
        }
        if (y0 < height - 1 && matches(index + width * 4)) {
          if (!spanDown) {
            push(nx, y0 + 1);
            spanDown = true;
          }
        } else {
          spanDown = false;
        }
      }
    }
    paintCtx.putImageData(image, 0, 0);
  }

  function strokeWidth(stroke) {
    if (stroke.tool === "pencil") {
      return 1;
    }
    if (stroke.tool === "eraser") {
      return stroke.size + 1;
    }
    return stroke.size;
  }

  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var width = lienzo.offsetWidth;
    var height = lienzo.offsetHeight;
    lienzo.width = Math.max(1, Math.floor(width * dpr));
    lienzo.height = Math.max(1, Math.floor(height * dpr));
    paintLayer.width = lienzo.width;
    paintLayer.height = lienzo.height;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    redraw();
  }

  function paintBackground(width, height) {
    if (!fondo.naturalWidth) {
      return;
    }
    var scale = Math.max(width / fondo.naturalWidth, height / fondo.naturalHeight);
    var drawWidth = fondo.naturalWidth * scale;
    var drawHeight = fondo.naturalHeight * scale;
    ctx.drawImage(
      fondo,
      (width - drawWidth) / 2,
      (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
  }

  function traceStroke(stroke, target) {
    if (stroke.tool === "fill") {
      floodFill(stroke.x, stroke.y, stroke.color);
      return;
    }
    var width = strokeWidth(stroke);
    target.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    target.fillStyle = stroke.tool === "eraser" ? "rgba(0, 0, 0, 1)" : stroke.color;
    target.strokeStyle = target.fillStyle;
    target.lineWidth = width;
    target.lineCap = "round";
    target.lineJoin = "round";
    if (stroke.tool === "spray") {
      target.globalCompositeOperation = "source-over";
      target.fillStyle = stroke.color;
      stroke.points.forEach(function (dot) {
        target.fillRect(dot.x, dot.y, 1, 1);
      });
      return;
    }
    if (stroke.tool === "text") {
      target.font = "32px \"Comic Sans MS\", \"Comic Sans\", cursive";
      target.textBaseline = "top";
      target.fillText(stroke.text, stroke.x, stroke.y);
      target.globalCompositeOperation = "source-over";
      return;
    }
    var points = stroke.points;
    if (points.length === 1) {
      target.beginPath();
      if (stroke.tool === "pencil") {
        target.fillRect(points[0].x, points[0].y, 1, 1);
      } else {
        target.arc(points[0].x, points[0].y, width / 2, 0, Math.PI * 2);
        target.fill();
      }
      target.globalCompositeOperation = "source-over";
      return;
    }
    target.beginPath();
    target.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      target.lineTo(points[i].x, points[i].y);
    }
    target.stroke();
    target.globalCompositeOperation = "source-over";
  }

  function composite() {
    var width = lienzo.offsetWidth;
    var height = lienzo.offsetHeight;
    ctx.clearRect(0, 0, width, height);
    paintBackground(width, height);
    ctx.drawImage(paintLayer, 0, 0, width, height);
  }

  function redraw() {
    var width = lienzo.offsetWidth;
    var height = lienzo.offsetHeight;
    paintCtx.clearRect(0, 0, width, height);
    paintCtx.globalCompositeOperation = "source-over";
    strokes.forEach(function (stroke) {
      traceStroke(stroke, paintCtx);
    });
    composite();
  }

  function pointFromEvent(event) {
    var rect = lienzo.getBoundingClientRect();
    var width = lienzo.offsetWidth || 1;
    var height = lienzo.offsetHeight || 1;
    return {
      x: ((event.clientX - rect.left) / rect.width) * width,
      y: ((event.clientY - rect.top) / rect.height) * height
    };
  }

  function rgbToHex(r, g, b) {
    function channel(value) {
      var hex = value.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }
    return "#" + channel(r) + channel(g) + channel(b);
  }

  function usesTouchPicker() {
    return window.matchMedia("(pointer: coarse)").matches || !window.EyeDropper;
  }

  function parseCssColor(value) {
    var match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([0-9.]+))?\s*\)/.exec(value || "");
    if (!match) {
      return null;
    }
    return {
      r: Number(match[1]),
      g: Number(match[2]),
      b: Number(match[3]),
      a: match[4] == null ? 1 : Number(match[4])
    };
  }

  function canvasColorAt(clientX, clientY) {
    var point = pointFromEvent({ clientX: clientX, clientY: clientY });
    var dpr = window.devicePixelRatio || 1;
    var x = Math.floor(point.x * dpr);
    var y = Math.floor(point.y * dpr);
    if (x < 0 || y < 0 || x >= lienzo.width || y >= lienzo.height) {
      return null;
    }
    var pixel = ctx.getImageData(x, y, 1, 1).data;
    if (pixel[3] === 0) {
      return null;
    }
    return rgbToHex(pixel[0], pixel[1], pixel[2]);
  }

  function visibleColorAt(clientX, clientY) {
    var stack = document.elementsFromPoint(clientX, clientY);
    var i;
    for (i = 0; i < stack.length; i++) {
      if (stack[i] === lienzo) {
        return canvasColorAt(clientX, clientY);
      }
      var bg = parseCssColor(window.getComputedStyle(stack[i]).backgroundColor);
      if (bg && bg.a > 0.15) {
        return rgbToHex(bg.r, bg.g, bg.b);
      }
    }
    return canvasColorAt(clientX, clientY);
  }

  function sampleColor(point) {
    var dpr = window.devicePixelRatio || 1;
    var pixel = ctx.getImageData(
      Math.floor(point.x * dpr),
      Math.floor(point.y * dpr),
      1,
      1
    ).data;
    if (pixel[3] === 0) {
      return;
    }
    paintColor = rgbToHex(pixel[0], pixel[1], pixel[2]);
    selectTool(brocha);
  }

  function takeTouchColor(clientX, clientY) {
    var color = visibleColorAt(clientX, clientY);
    if (!color) {
      return;
    }
    paintColor = color;
    selectTool(brocha);
  }

  paintButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var wasPressed = button.classList.contains("pressed");
      selectTool(wasPressed ? null : button);
      if (!wasPressed && button === gotas && window.EyeDropper && !usesTouchPicker()) {
        new EyeDropper().open().then(function (result) {
          paintColor = result.sRGBHex;
          selectTool(brocha);
        }).catch(function () {});
      }
    });
  });

  document.addEventListener("pointerdown", function (event) {
    if (!usesTouchPicker() || !gotas.classList.contains("pressed") || event.button !== 0) {
      return;
    }
    if (event.target.closest && (event.target.closest(".paint-container") || event.target.closest("#texto-popup"))) {
      return;
    }
    event.preventDefault();
    takeTouchColor(event.clientX, event.clientY);
  }, true);

  lienzo.addEventListener("pointerdown", function (event) {
    if (usesTouchPicker() && touchCount >= 2) {
      return;
    }
    if (activeTool() === "zoom") {
      zoomPointers[event.pointerId] = { x: event.clientX, y: event.clientY };
      lienzo.setPointerCapture(event.pointerId);
      if (Object.keys(zoomPointers).length >= 2) {
        pinchUsed = true;
        pinchStart = { distance: zoomPointerDistance(), zoom: zoomLevel };
      }
      return;
    }
    if (event.button !== 0) {
      return;
    }
    var point = pointFromEvent(event);
    if (gotas.classList.contains("pressed")) {
      sampleColor(point);
      return;
    }
    var tool = activeTool();
    if (tool === "text") {
      event.preventDefault();
      pendingTextPoint = point;
      textoInput.value = "";
      textoPopup.hidden = false;
      window.setTimeout(function () {
        textoInput.focus();
      }, 0);
      return;
    }
    if (tool === "bucket") {
      strokes.push({
        tool: "fill",
        color: paintColor,
        x: point.x,
        y: point.y
      });
      floodFill(point.x, point.y, paintColor);
      composite();
      return;
    }
    if (tool === "spray") {
      drawing = true;
      sprayPoint = point;
      currentStroke = {
        tool: "spray",
        color: paintColor,
        size: spraySize,
        points: []
      };
      strokes.push(currentStroke);
      sprayDots(currentStroke, point);
      paintSprayDots(currentStroke, 0);
      window.clearInterval(sprayTimer);
      sprayTimer = window.setInterval(function () {
        if (!drawing || !currentStroke || currentStroke.tool !== "spray") {
          return;
        }
        var from = currentStroke.points.length;
        sprayDots(currentStroke, sprayPoint);
        paintSprayDots(currentStroke, from);
      }, 40);
      lienzo.setPointerCapture(event.pointerId);
      return;
    }
    if (tool !== "brush" && tool !== "eraser" && tool !== "pencil") {
      return;
    }
    drawing = true;
    currentStroke = {
      tool: tool,
      color: paintColor,
      size: brushSize,
      points: [point]
    };
    strokes.push(currentStroke);
    traceStroke(currentStroke, paintCtx);
    composite();
    lienzo.setPointerCapture(event.pointerId);
  });

  lienzo.addEventListener("pointermove", function (event) {
    if (zoomPointers[event.pointerId]) {
      zoomPointers[event.pointerId] = { x: event.clientX, y: event.clientY };
      if (pinchStart && Object.keys(zoomPointers).length >= 2) {
        var distance = zoomPointerDistance();
        if (pinchStart.distance > 0) {
          var ids = Object.keys(zoomPointers);
          var first = zoomPointers[ids[0]];
          var second = zoomPointers[ids[1]];
          setZoom(
            pinchStart.zoom * (distance / pinchStart.distance),
            (first.x + second.x) / 2,
            (first.y + second.y) / 2
          );
        }
      }
      return;
    }
    if (!drawing || !currentStroke) {
      return;
    }
    if (currentStroke.tool === "spray") {
      sprayPoint = pointFromEvent(event);
      var from = currentStroke.points.length;
      sprayDots(currentStroke, sprayPoint);
      paintSprayDots(currentStroke, from);
      return;
    }
    var point = pointFromEvent(event);
    var previous = currentStroke.points[currentStroke.points.length - 1];
    currentStroke.points.push(point);
    paintCtx.globalCompositeOperation = currentStroke.tool === "eraser" ? "destination-out" : "source-over";
    paintCtx.strokeStyle = currentStroke.tool === "eraser" ? "rgba(0, 0, 0, 1)" : currentStroke.color;
    paintCtx.lineWidth = strokeWidth(currentStroke);
    paintCtx.lineCap = "round";
    paintCtx.lineJoin = "round";
    paintCtx.beginPath();
    paintCtx.moveTo(previous.x, previous.y);
    paintCtx.lineTo(point.x, point.y);
    paintCtx.stroke();
    paintCtx.globalCompositeOperation = "source-over";
    composite();
  });

  function stopDrawing(event) {
    if (event && zoomPointers[event.pointerId]) {
      delete zoomPointers[event.pointerId];
      if (Object.keys(zoomPointers).length === 0) {
        if (!pinchUsed && event.button === 0 && activeTool() === "zoom" && !usesTouchPicker()) {
          setZoom(zoomLevel * 1.5, event.clientX, event.clientY);
        }
        pinchUsed = false;
        pinchStart = null;
      }
    }
    drawing = false;
    currentStroke = null;
    sprayPoint = null;
    window.clearInterval(sprayTimer);
  }

  lienzo.addEventListener("pointerup", stopDrawing);
  lienzo.addEventListener("pointercancel", stopDrawing);
  lienzo.addEventListener("contextmenu", function (event) {
    if (activeTool() !== "zoom") {
      return;
    }
    event.preventDefault();
    setZoom(zoomLevel / 1.5, event.clientX, event.clientY);
  });

  function closeTextPopup() {
    textoPopup.hidden = true;
    pendingTextPoint = null;
  }

  textoForm.addEventListener("submit", function (event) {
    event.preventDefault();
    var value = textoInput.value.trim();
    if (value && pendingTextPoint) {
      strokes.push({
        tool: "text",
        color: paintColor,
        text: value,
        x: pendingTextPoint.x,
        y: pendingTextPoint.y
      });
      redraw();
    }
    closeTextPopup();
  });

  document.getElementById("texto-cancelar").addEventListener("click", closeTextPopup);

  textoInput.addEventListener("pointerdown", function () {
    window.setTimeout(function () {
      textoInput.focus();
    }, 0);
  });

  window.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !textoPopup.hidden) {
      closeTextPopup();
      return;
    }
    if (event.target.closest && event.target.closest("#texto-popup")) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) {
      return;
    }
    var grow = event.key === "+" || event.key === "=" || event.code === "NumpadAdd";
    var shrink = event.key === "-" || event.key === "_" || event.code === "NumpadSubtract";
    if (!grow && !shrink) {
      return;
    }
    event.preventDefault();
    if (aerosol.classList.contains("pressed")) {
      spraySize = Math.max(2, Math.min(80, spraySize + (grow ? 2 : -2)));
      return;
    }
    brushSize = Math.max(2, Math.min(80, brushSize + (grow ? 2 : -2)));
  });

  fondo.addEventListener("load", redraw);
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
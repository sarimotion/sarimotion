  var disc = document.getElementById("disc");
  var cancion = document.getElementById("cancion");
  var paintButtons = document.querySelectorAll(".celda-paint");
  var brocha = document.getElementById("brocha");
  var borrador = document.getElementById("borrador");
  var lapiz = document.getElementById("lapiz");
  var texto = document.getElementById("texto");
  var bote = document.getElementById("bote");
  var gotas = document.getElementById("gotas");
  var lienzo = document.getElementById("lienzo");
  var ctx = lienzo.getContext("2d");
  var paintLayer = document.createElement("canvas");
  var paintCtx = paintLayer.getContext("2d");
  var fondo = new Image();
  var paintColor = "#000000";
  var brushSize = 16;
  var strokes = [];
  var currentStroke = null;
  var drawing = false;
  var pendingTextPoint = null;
  var textoPopup = document.getElementById("texto-popup");
  var textoForm = document.getElementById("texto-form");
  var textoInput = document.getElementById("texto-input");
  var celda2 = document.getElementById("celda2");
  var celda3 = document.getElementById("celda3");

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

    function salirAlInicio() {
      if (celular.dataset.salida === "1") {
        return;
      }
      celular.dataset.salida = "1";
      window.setTimeout(function () {
        var velo = document.createElement("div");
        velo.className = "salida-blanca";
        document.body.appendChild(velo);
        window.requestAnimationFrame(function () {
          window.requestAnimationFrame(function () {
            velo.classList.add("visible");
          });
        });
        window.setTimeout(function () {
          window.location.href = "homepage.html";
        }, 600);
      }, 300);
    }

    celular.addEventListener("load", salirAlInicio);
    celular.src = "images/Abierto.png";
    if (celular.complete) {
      salirAlInicio();
    }
  });

  disc.addEventListener("click", function () {
    if (cancion.paused) {
      var intento = cancion.play();
      if (intento) {
        intento.catch(function () {});
      }
    } else {
      cancion.pause();
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
    document.body.classList.remove("pintando", "borrando", "lapizando", "escribiendo", "eligiendo", "rellenando");
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
    return null;
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
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  }

  function rgbToHex(r, g, b) {
    function channel(value) {
      var hex = value.toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    }
    return "#" + channel(r) + channel(g) + channel(b);
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

  paintButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var wasPressed = button.classList.contains("pressed");
      selectTool(wasPressed ? null : button);
      if (!wasPressed && button === gotas && window.EyeDropper) {
        new EyeDropper().open().then(function (result) {
          paintColor = result.sRGBHex;
          selectTool(brocha);
        }).catch(function () {});
      }
    });
  });

  lienzo.addEventListener("pointerdown", function (event) {
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
      pendingTextPoint = point;
      textoInput.value = "";
      textoPopup.hidden = false;
      textoInput.focus();
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
    if (!drawing || !currentStroke) {
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

  function stopDrawing() {
    drawing = false;
    currentStroke = null;
  }

  lienzo.addEventListener("pointerup", stopDrawing);
  lienzo.addEventListener("pointercancel", stopDrawing);

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
    brushSize = Math.max(2, Math.min(80, brushSize + (grow ? 2 : -2)));
  });

  fondo.addEventListener("load", redraw);
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();
  var disc = document.getElementById("disc");
  var cancion = document.getElementById("cancion");
  var paintButtons = document.querySelectorAll(".celda-paint");
  var brocha = document.getElementById("brocha");
  var gotas = document.getElementById("gotas");
  var lienzo = document.getElementById("lienzo");
  var ctx = lienzo.getContext("2d");
  var fondo = new Image();
  var paintColor = "#000000";
  var strokes = [];
  var currentStroke = null;
  var drawing = false;

  document.getElementById("boton-verde").addEventListener("click", function (event) {
    event.preventDefault();
    var celular = document.getElementById("celular-cerrado");
    celular.src = "images/Abierto.png";
    celular.alt = "Celular abierto";
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
    document.body.classList.toggle("pintando", brocha.classList.contains("pressed"));
    document.body.classList.toggle("eligiendo", gotas.classList.contains("pressed"));
  }

  function resizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var width = lienzo.offsetWidth;
    var height = lienzo.offsetHeight;
    lienzo.width = Math.max(1, Math.floor(width * dpr));
    lienzo.height = Math.max(1, Math.floor(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

  function traceStroke(stroke) {
    var points = stroke.points;
    ctx.fillStyle = stroke.color;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (points.length === 1) {
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, 8, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (var i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
  }

  function redraw() {
    var width = lienzo.offsetWidth;
    var height = lienzo.offsetHeight;
    ctx.clearRect(0, 0, width, height);
    paintBackground(width, height);
    strokes.forEach(traceStroke);
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
    if (!brocha.classList.contains("pressed")) {
      return;
    }
    drawing = true;
    currentStroke = { color: paintColor, points: [point] };
    strokes.push(currentStroke);
    traceStroke(currentStroke);
    lienzo.setPointerCapture(event.pointerId);
  });

  lienzo.addEventListener("pointermove", function (event) {
    if (!drawing || !currentStroke) {
      return;
    }
    var point = pointFromEvent(event);
    var previous = currentStroke.points[currentStroke.points.length - 1];
    currentStroke.points.push(point);
    ctx.strokeStyle = currentStroke.color;
    ctx.lineWidth = 16;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  });

  function stopDrawing() {
    drawing = false;
    currentStroke = null;
  }

  lienzo.addEventListener("pointerup", stopDrawing);
  lienzo.addEventListener("pointercancel", stopDrawing);

  fondo.addEventListener("load", redraw);
  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();